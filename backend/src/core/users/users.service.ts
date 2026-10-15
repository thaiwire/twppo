import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import {
  MODULE_CODES,
  MODULE_LEVELS,
  MODULES,
  toModuleAccess,
  type ModuleAccess,
  type ModuleCode,
  type ModuleLevel,
} from '../auth/modules.js';
import { SessionUserService } from '../auth/session-user.service.js';
import type { app_user, app_user_module, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { USERNAME, type Role, type UserDto, type UserListQuery } from './users.dto.js';

type UserRow = app_user & { modules: app_user_module[] };

/** admin หรือ user (ค่าเดิม 'manager' ถือเป็น user) */
const roleOf = (u: app_user): Role => (u.role.trim().toLowerCase() === 'admin' ? 'admin' : 'user');

/** วันเวลา (UTC ในฐานข้อมูล) → 'YYYY-MM-DD HH:mm' เวลาไทย */
const bkk = (d: Date | null | undefined) =>
  d
    ? new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(d)
    : '';

function view(u: UserRow, divName = '') {
  return {
    /** ใช้ username เป็นรหัสของรายการ (หน้า list/form ใช้ร่วมกับข้อมูลหลัก) */
    code: u.username,
    id: u.id,
    username: u.username,
    displayName: u.display_name ?? '',
    role: roleOf(u),
    modules: toModuleAccess(u.modules),
    active: u.is_active,
    divCode: u.div_code?.trim() || null,
    divName,
    createdAt: bkk(u.created_at),
    updatedAt: bkk(u.updated_at),
    updatedBy: '',
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionUserService,
    private readonly audit: AuditService,
  ) {}

  async list(q: UserListQuery) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const s = q.q?.trim();
    const where: Prisma.app_userWhereInput = {
      AND: [
        s ? { OR: [{ username: { contains: s } }, { display_name: { contains: s } }] } : {},
        q.role === 'admin' ? { role: 'admin' } : q.role ? { NOT: { role: 'admin' } } : {},
        q.module ? { modules: { some: { module_code: q.module } } } : {},
        q.status ? { is_active: q.status === 'active' } : {},
        q.div === '-' ? { OR: [{ div_code: null }, { div_code: '' }] } : q.div ? { div_code: q.div } : {},
      ],
    };
    const [total, rows] = await Promise.all([
      this.prisma.app_user.count({ where }),
      this.prisma.app_user.findMany({
        where,
        orderBy: { username: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { modules: true },
      }),
    ]);
    const names = await this.divNames();
    return {
      total,
      page,
      pageSize,
      items: rows.map((u) => view(u, names.get(u.div_code?.trim().toLowerCase() ?? '') ?? '')),
    };
  }

  async get(username: string) {
    const u = await this.find(username);
    return view(u, (await this.divNames()).get(u.div_code?.trim().toLowerCase() ?? '') ?? '');
  }

  async create(dto: UserDto, actor: AuthUser) {
    if (!USERNAME.test(dto.code))
      throw new BadRequestException('ชื่อผู้ใช้ 3–50 ตัว ใช้ได้เฉพาะ a-z, 0-9 และ . _ @ -');
    if (!dto.password) throw new BadRequestException('กรุณากำหนดรหัสผ่าน');
    await this.assertDivision(dto.divCode);
    const modules = this.parseModules(dto.modules);
    // collation ของฐานข้อมูลไม่สนตัวพิมพ์ — "Admin" ถือว่าซ้ำกับ "admin"
    if (await this.prisma.app_user.findUnique({ where: { username: dto.code } }))
      throw new ConflictException(`ชื่อผู้ใช้ ${dto.code} มีอยู่แล้ว`);
    const u = await this.prisma.app_user.create({
      data: {
        username: dto.code,
        display_name: dto.displayName,
        role: dto.role,
        is_active: dto.active ?? true,
        div_code: dto.divCode ?? null,
        password_hash: await bcrypt.hash(dto.password, 12),
        modules: { create: modules },
      },
    });
    await this.log(actor, u.username, 'create', { role: dto.role, active: u.is_active, divCode: u.div_code, modules: dto.modules });
    return this.get(u.username);
  }

  async update(username: string, dto: UserDto, actor: AuthUser) {
    const cur = await this.find(username);
    const self = cur.id === actor.id;
    const active = dto.active ?? cur.is_active;
    if (self && dto.role !== roleOf(cur))
      throw new BadRequestException('เปลี่ยนประเภทผู้ใช้ของตัวเองไม่ได้ — ให้ admin คนอื่นเปลี่ยนให้');
    if (self && !active) throw new BadRequestException('ปิดใช้งานบัญชีของตัวเองไม่ได้');
    if (dto.role !== 'admin' || !active) await this.assertNotLastAdmin(cur);
    await this.assertDivision(dto.divCode);
    const modules = this.parseModules(dto.modules);

    const u = await this.prisma.app_user.update({
      where: { id: cur.id },
      data: {
        // แทนที่สิทธิ์ module ด้วยค่าจากฟอร์ม — ลบเฉพาะ module ที่ระบบนี้รู้จัก
        // (app_user_module ใช้ร่วมกับระบบอื่นบนฐานข้อมูลเดียวกันได้ เช่น ระบบขาย — สิทธิ์ของระบบอื่นต้องไม่หาย)
        modules: { deleteMany: { module_code: { in: MODULE_CODES } }, create: modules },
        display_name: dto.displayName,
        // ไม่เปลี่ยนประเภท = คงค่าเดิมในฐานข้อมูลไว้ (เช่น 'manager' ของข้อมูลเก่า)
        role: dto.role === roleOf(cur) ? cur.role : dto.role,
        is_active: active,
        div_code: dto.divCode ?? null,
        updated_at: new Date(),
        ...(dto.password && { password_hash: await bcrypt.hash(dto.password, 12) }),
      },
    });
    this.sessions.invalidate(u.id);
    // ไม่เก็บรหัสผ่าน — บันทึกแค่ว่ามีการตั้งรหัสใหม่
    await this.log(actor, u.username, 'update', {
      role: dto.role,
      active,
      divCode: u.div_code,
      modules: dto.modules,
      passwordChanged: !!dto.password,
    });
    return this.get(u.username);
  }

  async remove(username: string, actor: AuthUser) {
    const cur = await this.find(username);
    if (cur.id === actor.id) throw new BadRequestException('ลบบัญชีของตัวเองไม่ได้');
    await this.assertNotLastAdmin(cur);
    await this.prisma.app_user.delete({ where: { id: cur.id } });
    this.sessions.invalidate(cur.id);
    await this.log(actor, cur.username, 'delete');
    return { ok: true };
  }

  // ---------------------------------------------------------------- helpers

  /** บันทึกประวัติการจัดการผู้ใช้ (app_audit — module admin) */
  private log(actor: AuthUser, username: string, action: string, detail?: unknown) {
    return this.audit.log(this.prisma, actor, { module: 'admin', docType: 'user', docNo: username, action, detail });
  }

  private async find(username: string) {
    const u = await this.prisma.app_user.findUnique({
      where: { username },
      include: { modules: true },
    });
    if (!u) throw new NotFoundException(`ไม่พบผู้ใช้ ${username}`);
    return u;
  }

  /** { pr: 'manager', base: '' } → แถวของ app_user_module (ค่าว่าง = ไม่มีสิทธิ์ module นั้น) */
  private parseModules(input: UserDto['modules']) {
    const out: ModuleAccess = {};
    for (const [m, l] of Object.entries(input ?? {})) {
      if (!l) continue;
      if (!(m in MODULES)) throw new BadRequestException(`ไม่รู้จัก module ${m}`);
      if (!MODULE_LEVELS.includes(l as ModuleLevel))
        throw new BadRequestException(`ระดับสิทธิ์ของ module ${m} ต้องเป็น user หรือ manager`);
      out[m as ModuleCode] = l as ModuleLevel;
    }
    return Object.entries(out).map(([module_code, level]) => ({ module_code, level }));
  }

  private async divNames() {
    const rows = await this.prisma.div_mstr.findMany();
    return new Map(rows.map((d) => [d.div_code.trim().toLowerCase(), d.div_desc?.trim() ?? '']));
  }

  private async assertDivision(code?: string) {
    if (!code) return;
    if (!(await this.prisma.div_mstr.findUnique({ where: { div_code: code } })))
      throw new BadRequestException(`ไม่พบหน่วยงานรหัส ${code}`);
  }

  /** ต้องเหลือ admin ที่ใช้งานได้อย่างน้อย 1 คนเสมอ */
  private async assertNotLastAdmin(target: app_user) {
    if (target.role.trim().toLowerCase() !== 'admin' || !target.is_active) return;
    const others = await this.prisma.app_user.count({
      where: { role: 'admin', is_active: true, NOT: { id: target.id } },
    });
    if (!others)
      throw new BadRequestException('ต้องมีผู้ดูแลระบบ (admin) ที่ใช้งานได้อย่างน้อย 1 คน');
  }
}
