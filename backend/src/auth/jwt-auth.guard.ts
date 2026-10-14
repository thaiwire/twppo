import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AUTH_COOKIE, type AuthUser } from './auth.types.js';
import { IS_PUBLIC } from './decorators.js';
import { SessionUserService } from './session-user.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly sessions: SessionUserService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = req.headers.authorization;
    const token =
      (req.cookies as Record<string, string> | undefined)?.[AUTH_COOKIE] ??
      (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
    if (!token) throw new UnauthorizedException('กรุณาเข้าสู่ระบบ');

    let claims: AuthUser;
    try {
      claims = await this.jwt.verifyAsync<AuthUser>(token);
    } catch {
      throw new UnauthorizedException('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }
    // ใช้ข้อมูลล่าสุดจากฐานข้อมูล (role / สถานะใช้งาน) แทนค่าที่ฝังใน token
    const user = await this.sessions.get(claims.id);
    if (!user) throw new UnauthorizedException('บัญชีนี้ถูกปิดใช้งานหรือถูกลบ กรุณาติดต่อผู้ดูแลระบบ');
    req.user = user;
    return true;
  }
}
