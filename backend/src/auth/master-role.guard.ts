import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { canManageMaster, type AuthUser } from './auth.types.js';

/** อนุญาตเฉพาะ role ใน MASTER_ROLES (ค่าเริ่มต้น admin, manager) — ใช้หลัง JwtAuthGuard */
@Injectable()
export class MasterRoleGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>().user;
    if (!user || !canManageMaster(user)) {
      throw new ForbiddenException('เฉพาะผู้ใช้ระดับ manager หรือ admin เท่านั้น');
    }
    return true;
  }
}
