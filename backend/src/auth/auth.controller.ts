import { Body, Controller, Get, HttpCode, Post, Put, Res } from '@nestjs/common';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import {
  AUTH_COOKIE,
  canApprove,
  canManageMaster,
  canManageUsers,
  type AuthUser,
} from './auth.types.js';
import { CurrentUser, Public } from './decorators.js';

class LoginDto {
  @IsString() @IsNotEmpty() username: string;
  @IsString() @IsNotEmpty() password: string;
}

class UpdateProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกชื่อที่แสดง' })
  @MaxLength(100)
  displayName: string;
}

class ChangePasswordDto {
  @IsString() @IsNotEmpty({ message: 'กรุณากรอกรหัสผ่านปัจจุบัน' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' })
  @MaxLength(72, { message: 'รหัสผ่านใหม่ยาวได้ไม่เกิน 72 ตัวอักษร' })
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'รหัสผ่านใหม่ต้องมีทั้งตัวอักษรและตัวเลข',
  })
  newPassword: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.auth.login(dto.username, dto.password);
    this.setCookie(res, token);
    return this.view(user);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.view(user);
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser() current: AuthUser,
    @Body() dto: UpdateProfileDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.auth.updateProfile(current, dto.displayName);
    this.setCookie(res, token);
    return this.view(user);
  }

  @Post('change-password')
  @HttpCode(200)
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user, dto.currentPassword, dto.newPassword);
  }

  private setCookie(res: Response, token: string) {
    res.cookie(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      path: '/',
    });
  }

  private view(user: AuthUser) {
    const { id, username, displayName, role } = user;
    return {
      id,
      username,
      displayName,
      role,
      divCode: user.divCode ?? null,
      canApprove: canApprove(user),
      canManageMaster: canManageMaster(user),
      canManageUsers: canManageUsers(user),
    };
  }
}
