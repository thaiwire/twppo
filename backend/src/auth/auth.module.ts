import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { SessionUserService } from './session-user.service.js';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? 'change-me',
        signOptions: { expiresIn: (process.env.JWT_EXPIRES ?? '12h') as '12h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionUserService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [SessionUserService],
})
export class AuthModule {}
