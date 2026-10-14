import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { AuthUser } from '../auth/auth.types.js';
import { SessionUserService } from '../auth/session-user.service.js';
import type { app_user, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { USERNAME, type UserDto, type UserListQuery } from './users.dto.js';

/** วันเวลา (UTC ในฐานข้อมูล) → 'YYYY-MM-DD HH:mm' เวลาไทย */
const bkk = (d: Date | null | undefined) =>
  d
    ? new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(d)
    : '';

function view(u: app_user, divName = '') {
  return {
    /** ใช้ username เป็นรหัสของรายการ (หน้า list/form ใช้ร่วมกับข้อมูลหลัก) */
    code: u.username,
    id: u.id,
    username: u.username,
    displayName: u.display_name ?? '',
    role: u.role.trim().toLowerCase(),
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
  ) {}

  async list(q: UserListQuery) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const s = q.q?.trim();
    const where: Prisma.app_userWhereInput = {
      AND: [
        s ? { OR: [{ username: { contains: s } }, { display_name: { contains: s } }] } : {},
        q.role ? { role: q.role } : {},
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

  async create(dto: UserDto) {
    if (!USERNAME.test(dto.code))
      throw new BadRequestException('ชื่อผู้ใช้ 3–50 ตัว ใช้ได้เฉพาะ a-z, 0-9 และ . _ @ -');
    if (!dto.password) throw new BadRequestException('กรุณากำหนดรหัสผ่าน');
    await this.assertDivision(dto.divCode);
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
      },
    });
    return this.get(u.username);
  }

  async update(username: string, dto: UserDto, actor: AuthUser) {
    const cur = await this.find(username);
    const self = cur.id === actor.id;
    const active = dto.active ?? cur.is_active;
    if (self && dto.role !== cur.role.trim().toLowerCase())
      throw new BadRequestException('เปลี่ยนระดับของตัวเองไม่ได้ — ให้ admin คนอื่นเปลี่ยนให้');
    if (self && !active) throw new BadRequestException('ปิดใช้งานบัญชีของตัวเองไม่ได้');
    if (dto.role !== 'admin' || !active) await this.assertNotLastAdmin(cur);
    await this.assertDivision(dto.divCode);

    const u = await this.prisma.app_user.update({
      where: { id: cur.id },
      data: {
        display_name: dto.displayName,
        role: dto.role,
        is_active: active,
        div_code: dto.divCode ?? null,
        updated_at: new Date(),
        ...(dto.password && { password_hash: await bcrypt.hash(dto.password, 12) }),
      },
    });
    this.sessions.invalidate(u.id);
    return this.get(u.username);
  }

  async remove(username: string, actor: AuthUser) {
    const cur = await this.find(username);
    if (cur.id === actor.id) throw new BadRequestException('ลบบัญชีของตัวเองไม่ได้');
    await this.assertNotLastAdmin(cur);
    await this.prisma.app_user.delete({ where: { id: cur.id } });
    this.sessions.invalidate(cur.id);
    return { ok: true };
  }

  // ---------------------------------------------------------------- helpers

  private async find(username: string) {
    const u = await this.prisma.app_user.findUnique({ where: { username } });
    if (!u) throw new NotFoundException(`ไม่พบผู้ใช้ ${username}`);
    return u;
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
