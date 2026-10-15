import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from './auth.types.js';

export const IS_PUBLIC = 'isPublic';
/** เปิดให้เรียกได้โดยไม่ต้อง login */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser =>
    (ctx.switchToHttp().getRequest<Request & { user: AuthUser }>()).user,
);
