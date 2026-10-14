import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminRoleGuard } from '../auth/admin-role.guard.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators.js';
import { UserDto, UserListQuery } from './users.dto.js';
import { UsersService } from './users.service.js';

/** จัดการผู้ใช้ (app_user) — เฉพาะ role admin */
@Controller('admin/users')
@UseGuards(AdminRoleGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query() q: UserListQuery) {
    return this.users.list(q);
  }

  @Get(':username')
  get(@Param('username') username: string) {
    return this.users.get(username);
  }

  @Post()
  create(@Body() dto: UserDto) {
    return this.users.create(dto);
  }

  @Put(':username')
  update(
    @Param('username') username: string,
    @Body() dto: UserDto,
    @CurrentUser() actor: AuthUser,
  ) {
    if (username.toLowerCase() !== dto.code.toLowerCase())
      throw new BadRequestException('เปลี่ยนชื่อผู้ใช้ไม่ได้');
    return this.users.update(username, dto, actor);
  }

  @Delete(':username')
  remove(@Param('username') username: string, @CurrentUser() actor: AuthUser) {
    return this.users.remove(username, actor);
  }
}
