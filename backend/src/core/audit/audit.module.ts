import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller.js';
import { AuditService } from './audit.service.js';

/** ประวัติการเปลี่ยนแปลง — global: ทุก module inject AuditService ได้เลย */
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
