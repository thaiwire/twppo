import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from './auth.types.js';
import { toModuleAccess } from './modules.js';

const TTL_MS = 15_000;

/**
 * ข้อมูลผู้ใช้ปัจจุบันและสิทธิ์ module จากฐานข้อมูล (ไม่เชื่อ role ใน JWT อย่างเดียว)
 * — ถ้า admin ปิดใช้งาน/เปลี่ยน role ผลจะมีทันที (ภายใน TTL) ไม่ต้องรอ token หมดอายุ
 */
@Injectable()
export class SessionUserService {
  private cache = new Map<number, { at: number; user: AuthUser | null }>();

  constructor(private readonly prisma: PrismaService) {}

  /** null = ไม่พบผู้ใช้ หรือถูกปิดใช้งาน */
  async get(id: number): Promise<AuthUser | null> {
    const hit = this.cache.get(id);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.user;
    const u = await this.prisma.app_user.findUnique({
      where: { id },
      include: { modules: true },
    });
    const user: AuthUser | null =
      u && u.is_active
        ? {
            id: u.id,
            username: u.username,
            displayName: u.display_name ?? u.username,
            role: u.role,
            divCode: u.div_code?.trim() || null,
            modules: toModuleAccess(u.modules),
          }
        : null;
    this.cache.set(id, { at: Date.now(), user });
    return user;
  }

  /** เรียกหลังแก้ไขผู้ใช้ ให้ request ถัดไปอ่านค่าใหม่ทันที */
  invalidate(id: number) {
    this.cache.delete(id);
  }
}
