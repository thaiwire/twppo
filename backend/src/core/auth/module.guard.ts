import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthUser } from './auth.types.js';
import { IS_PUBLIC } from './decorators.js';
import { hasModule, isAdmin, MODULES, type ModuleCode, type ModuleLevel } from './modules.js';

const REQUIRE_MODULE = 'requireModule';
const REQUIRE_ADMIN = 'requireAdmin';

/**
 * ต้องมีสิทธิ์ module นี้ (ระดับ `level` ขึ้นไป) — ใส่ที่ class (ทั้ง controller) หรือ method (ทับค่าของ class)
 *   @RequireModule('pr')              ทุก endpoint ต้องมีสิทธิ์ pr
 *   @RequireModule('pr', 'manager')   endpoint นี้ต้องเป็น manager ของ pr
 */
export const RequireModule = (module: ModuleCode, level: ModuleLevel = 'user') =>
  SetMetadata(REQUIRE_MODULE, { module, level });

/** เฉพาะ role admin (เมนู Admin) */
export const RequireAdmin = () => SetMetadata(REQUIRE_ADMIN, true);

/** global guard — ทำงานต่อจาก JwtAuthGuard (ซึ่งโหลดผู้ใช้และสิทธิ์ล่าสุดจากฐานข้อมูลแล้ว) */
@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
    const user = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>().user;
    if (!user) return false;

    if (this.reflector.getAllAndOverride<boolean>(REQUIRE_ADMIN, targets) && !isAdmin(user))
      throw new ForbiddenException('เฉพาะผู้ดูแลระบบ (admin) เท่านั้น');

    const req = this.reflector.getAllAndOverride<{ module: ModuleCode; level: ModuleLevel }>(
      REQUIRE_MODULE,
      targets,
    );
    if (req && !hasModule(user, req.module, req.level)) {
      const name = MODULES[req.module].name;
      throw new ForbiddenException(
        req.level === 'manager'
          ? `ต้องมีสิทธิ์ระดับ manager ใน module ${name}`
          : `คุณไม่มีสิทธิ์ใช้งาน module ${name} — ติดต่อผู้ดูแลระบบ`,
      );
    }
    return true;
  }
}
