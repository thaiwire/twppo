import { Global, Module } from '@nestjs/common';
import { NumberingService } from './numbering.service.js';

/** ออกเลขที่เอกสาร — global: ทุก module inject NumberingService ได้เลย */
@Global()
@Module({
  providers: [NumberingService],
  exports: [NumberingService],
})
export class NumberingModule {}
