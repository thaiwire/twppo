import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type RefKind = 'vendor' | 'item' | 'entity' | 'division';
type Ref = { table: string; column: string };

/** คอลัมน์ที่เก็บรหัสผู้ขาย (ชื่อคอลัมน์ไม่มีรูปแบบตายตัว จึงระบุเอง) */
const VENDOR_REFS: Ref[] = [
  ['prq_mstr', 'prq_vend'],
  ['pur_mstr', 'pur_vend'],
  ['po_mstr', 'po_vend'],
  ['por_hist', 'por_vend'],
  ['rr_mstr', 'rr_vend'],
  ['rr_det', 'rrd_vend'],
  ['ap_mstr', 'ap_addr'],
  ['vo_mstr', 'vo_vend'],
  ['vp_mstr', 'vp_vend'],
  ['vdp_mstr', 'vdp_vend'],
  ['opm_mstr', 'opm_vend'],
  ['bill_det', 'bill_vend'],
  ['wr_route', 'wr_vend'],
  ['it_mstr', 'it_vend'],
  ...Array.from({ length: 10 }, (_, i) => ['apd_det', `apd_vd_vend_${i + 1}`]),
].map(([table, column]) => ({ table, column }));

/**
 * ตรวจว่ารหัสถูกใช้อยู่ในตารางอื่นหรือไม่ก่อนลบ
 * ฐานข้อมูลเดิมไม่มี foreign key — ถ้าลบโดยไม่ตรวจจะเกิดข้อมูลกำพร้าในระบบเดิม
 */
@Injectable()
export class RefCheckService {
  private cache = new Map<RefKind, Promise<Ref[]>>();

  constructor(private readonly prisma: PrismaService) {}

  /** คืนรายชื่อ "ตาราง.คอลัมน์" ที่ยังอ้างอิงรหัสนี้อยู่ (ว่าง = ลบได้) */
  async findUsages(kind: RefKind, code: string): Promise<string[]> {
    const refs = await this.refs(kind);
    if (!refs.length) return [];
    // ชื่อตาราง/คอลัมน์มาจาก INFORMATION_SCHEMA หรือรายการด้านบนเท่านั้น ค่ารหัสส่งเป็น parameter
    const sql = refs
      .map(
        (r) =>
          `SELECT TOP 1 '${r.table}.${r.column}' AS src FROM [${r.table}] WITH (NOLOCK) WHERE [${r.column}] = @P1`,
      )
      .join(' UNION ALL ');
    const rows = await this.prisma.$queryRawUnsafe<{ src: string }[]>(sql, code);
    return rows.map((r) => r.src);
  }

  private refs(kind: RefKind): Promise<Ref[]> {
    let p = this.cache.get(kind);
    if (!p) {
      p = this.load(kind);
      this.cache.set(kind, p);
      p.catch(() => this.cache.delete(kind));
    }
    return p;
  }

  private async load(kind: RefKind): Promise<Ref[]> {
    const existing = await this.prisma.$queryRaw<Ref[]>`
      SELECT c.TABLE_NAME AS [table], c.COLUMN_NAME AS [column]
      FROM INFORMATION_SCHEMA.COLUMNS c
      JOIN INFORMATION_SCHEMA.TABLES t
        ON t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_TYPE = 'BASE TABLE'
      WHERE (c.COLUMN_NAME LIKE '%[_]prod[_]id' OR c.COLUMN_NAME LIKE '%[_]part'
             OR c.COLUMN_NAME LIKE '%[_]entity' OR c.COLUMN_NAME LIKE '%divcode' OR c.COLUMN_NAME = 'div_code' OR c.TABLE_NAME + '.' + c.COLUMN_NAME IN (${Prisma.join(VENDOR_REFS.map((r) => `${r.table}.${r.column}`))}))`;
    const ident = /^[A-Za-z0-9_]+$/;
    const safe = existing.filter((r) => ident.test(r.table) && ident.test(r.column));
    const isVendor = (r: Ref) =>
      VENDOR_REFS.some((v) => v.table === r.table && v.column === r.column);

    // ไม่นับตารางของตัวเอง (เช่น it_mstr.it_prod_id) แต่ยังนับการอ้างอิงข้ามตาราง เช่น it_mstr.it_vend → ผู้ขาย
    switch (kind) {
      case 'vendor':
        return safe.filter((r) => r.table !== 'vd_mstr' && isVendor(r));
      case 'item':
        return safe.filter(
          (r) =>
            r.table !== 'it_mstr' &&
            (/_prod_id$/i.test(r.column) || /_part$/i.test(r.column)),
        );
      case 'entity':
        return safe.filter((r) => r.table !== 'en_mstr' && /_entity$/i.test(r.column));
      // รับสินค้า (rr_divcode, rrd_divcode), ใบ PR (prq_divcode), ผู้ใช้ (app_user.div_code)
      case 'division':
        return safe.filter(
          (r) => r.table !== 'div_mstr' && (/divcode$/i.test(r.column) || r.column.toLowerCase() === 'div_code'),
        );
    }
  }
}
