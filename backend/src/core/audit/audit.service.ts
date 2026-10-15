import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../auth/auth.types.js';
import { fromDateStr } from '../common/util.js';
import { PrismaService } from '../prisma/prisma.service.js';

type Db = Prisma.TransactionClient | PrismaService;

export interface AuditEntry {
  /** module เจ้าของเอกสาร: pr, base, admin ... */
  module: string;
  /** ประเภทเอกสาร: PR, vendor, user ... */
  docType: string;
  docNo: string;
  /** create, update, delete, approve, unapprove, close, reopen ... */
  action: string;
  /** ข้อมูลประกอบ (เก็บเป็น JSON) — ห้ามใส่รหัสผ่าน/ข้อมูลลับ */
  detail?: unknown;
}

/** วันเวลาไทยสำหรับแสดงผล 'YYYY-MM-DD HH:mm:ss' */
const bkk = (d: Date) =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(d);

/**
 * บันทึกประวัติการเปลี่ยนแปลงลง app_audit
 * เรียกด้วย tx ของเอกสาร (บันทึกพร้อมกัน — เอกสารไม่สำเร็จ ประวัติก็ไม่ถูกบันทึก) หรือ prisma ปกติ
 *
 *   await this.audit.log(tx, user, { module: 'pr', docType: 'PR', docNo: nbr, action: 'create' });
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(db: Db, user: Pick<AuthUser, 'username'>, e: AuditEntry) {
    await db.app_audit.create({
      data: {
        username: user.username.slice(0, 50),
        module_code: e.module.slice(0, 20),
        doc_type: e.docType.slice(0, 30),
        doc_no: e.docNo.trim().slice(0, 60),
        action: e.action.slice(0, 30),
        detail: e.detail === undefined ? null : JSON.stringify(e.detail),
      },
    });
  }

  /** ค้นหาประวัติ (หน้า Admin → ประวัติการแก้ไข) */
  async list(q: {
    q?: string;
    module?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 50;
    const s = q.q?.trim();
    const to = fromDateStr(q.dateTo);
    const where: Prisma.app_auditWhereInput = {
      AND: [
        s ? { OR: [{ doc_no: { contains: s } }, { username: { contains: s } }] } : {},
        q.module ? { module_code: q.module } : {},
        q.action ? { action: q.action } : {},
        q.dateFrom ? { at: { gte: new Date(`${q.dateFrom}T00:00:00+07:00`) } } : {},
        // ถึงสิ้นวันที่เลือก (เวลาไทย)
        to ? { at: { lt: new Date(to.getTime() + 86_400_000 - 7 * 3_600_000) } } : {},
      ],
    };
    const [total, rows] = await Promise.all([
      this.prisma.app_audit.count({ where }),
      this.prisma.app_audit.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      total,
      page,
      pageSize,
      items: rows.map((r) => ({
        id: Number(r.id),
        at: bkk(r.at),
        username: r.username,
        module: r.module_code,
        docType: r.doc_type,
        docNo: r.doc_no,
        action: r.action,
        detail: r.detail,
      })),
    };
  }
}
