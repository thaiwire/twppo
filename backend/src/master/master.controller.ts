import { Controller, Get, Query } from '@nestjs/common';
import { MasterService } from './master.service.js';

@Controller('master')
export class MasterController {
  constructor(private readonly master: MasterService) {}

  @Get('vendors')
  vendors(@Query('q') q?: string, @Query('code') code?: string) {
    return this.master.vendors(q?.trim(), code?.trim());
  }

  @Get('items')
  items(@Query('q') q?: string) {
    return this.master.items(q?.trim());
  }

  @Get('entities')
  entities() {
    return this.master.entities();
  }

  @Get('divisions')
  divisions() {
    return this.master.divisions();
  }

  @Get('vat-classes')
  vatClasses() {
    return this.master.vatClasses();
  }

  @Get('units')
  units() {
    return this.master.units();
  }
}
