import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { canManageUsers, type AuthUser } from './auth.types.js';

/** อนุญาตเฉพาะ role admin — ใช้หลัง JwtAuthGuard (ซึ่งโหลด role ล่าสุดจากฐานข้อมูลแล้ว) */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>().user;
    if (!user || !canManageUsers(user)) {
      throw new ForbiddenException('เฉพาะผู้ดูแลระบบ (admin) เท่านั้น');
    }
    return true;
  }
}
