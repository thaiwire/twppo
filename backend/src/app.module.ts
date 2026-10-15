import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// ---- core: ส่วนกลางที่ทุก module ใช้ (ห้าม import จาก modules/)
import { AuditModule } from './core/audit/audit.module.js';
import { AuthModule } from './core/auth/auth.module.js';
import { NumberingModule } from './core/numbering/numbering.module.js';
import { PrismaModule } from './core/prisma/prisma.module.js';
import { ReportModule } from './core/report/report.module.js';
import { UsersModule } from './core/users/users.module.js';
// ---- modules: แต่ละระบบงาน (รหัส module ดู core/auth/modules.ts)
import { MasterAdminModule } from './modules/base/master-admin/master-admin.module.js';
import { MasterModule } from './modules/base/master/master.module.js';
import { PrModule } from './modules/pr/pr.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // core
    PrismaModule,
    ReportModule,
    AuthModule,
    NumberingModule,
    AuditModule,
    UsersModule,
    // modules
    MasterModule, // base: ค้นหาข้อมูลหลัก (ใช้ในฟอร์มทุก module)
    MasterAdminModule, // base: จัดการข้อมูลหลัก + รายงาน
    PrModule, // pr: ใบเสนอซื้อ
  ],
})
export class AppModule {}
