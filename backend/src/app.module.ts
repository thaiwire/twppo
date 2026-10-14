import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { MasterAdminModule } from './master-admin/master-admin.module.js';
import { MasterModule } from './master/master.module.js';
import { PrModule } from './pr/pr.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ReportModule } from './report/report.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ReportModule,
    AuthModule,
    MasterModule,
    MasterAdminModule,
    PrModule,
    UsersModule,
  ],
})
export class AppModule {}
