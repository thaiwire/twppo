import { Module } from '@nestjs/common';
import { MasterAdminController } from './master-admin.controller.js';
import { MasterAdminService } from './master-admin.service.js';
import { RefCheckService } from './ref-check.service.js';

@Module({
  controllers: [MasterAdminController],
  providers: [MasterAdminService, RefCheckService],
})
export class MasterAdminModule {}
