import { Module } from '@nestjs/common';
import { PrController } from './pr.controller.js';
import { PrService } from './pr.service.js';

@Module({
  controllers: [PrController],
  providers: [PrService],
})
export class PrModule {}
