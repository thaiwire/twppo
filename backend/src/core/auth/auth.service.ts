import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { app_user } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthClaims, AuthUser } from './auth.types.js';
import { SessionUserService } from './session-user.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sessions: SessionUserService,
  ) {}

  async login(username: string, password: string) {
    const u = await this.prisma.app_user.findUnique({ where: { username } });
    const ok = u?.is_active && (await bcrypt.compare(password, u.password_hash));
    if (!u || !ok) {
      throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
    return this.issue(u);
  }

  /** แก้ไขชื่อที่แสดง — คืน token ใหม่เพราะ displayName อยู่ใน JWT */
  async updateProfile(user: AuthUser, displayName: string) {
    const u = await this.prisma.app_user.update({
      where: { id: user.id },
      data: { display_name: displayName.trim(), updated_at: new Date() },
    });
    this.sessions.invalidate(u.id);
    return this.issue(u);
  }

  async changePassword(user: AuthUser, current: string, next: string) {
    const u = await this.prisma.app_user.findUnique({ where: { id: user.id } });
    if (!u || !u.is_active) throw new UnauthorizedException('ไม่พบผู้ใช้');
    if (!(await bcrypt.compare(current, u.password_hash))) {
      throw new BadRequestException('รหัสผ่านปัจจุบันไม่ถูกต้อง');
    }
    if (current === next) {
      throw new BadRequestException('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม');
    }
    await this.prisma.app_user.update({
      where: { id: u.id },
      data: { password_hash: await bcrypt.hash(next, 12), updated_at: new Date() },
    });
    return { ok: true };
  }

  /** token เก็บแค่ตัวตน — สิทธิ์ module โหลดจากฐานข้อมูลทุก request (SessionUserService) */
  private async issue(u: app_user): Promise<{ user: AuthUser; token: string }> {
    const claims: AuthClaims = {
      id: u.id,
      username: u.username,
      displayName: u.display_name ?? u.username,
      role: u.role,
      divCode: u.div_code?.trim() || null,
    };
    const token = await this.jwt.signAsync({ ...claims });
    this.sessions.invalidate(u.id);
    const user = await this.sessions.get(u.id);
    if (!user) throw new UnauthorizedException('ไม่พบผู้ใช้');
    return { user, token };
  }
}
