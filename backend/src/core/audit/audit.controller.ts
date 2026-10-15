import { Controller, Get, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { RequireAdmin } from '../auth/module.guard.js';
import { AuditService } from './audit.service.js';

class AuditQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() module?: string;
  @IsOptional() @IsString() action?: string;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize?: number;
}

/** ประวัติการแก้ไข (app_audit) — เฉพาะ admin */
@Controller('admin/audit')
@RequireAdmin()
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() q: AuditQuery) {
    return this.audit.list(q);
  }
}
