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
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators.js';
import { MasterRoleGuard } from '../auth/master-role.guard.js';
import {
  DivisionDto,
  EntityDto,
  ItemDto,
  MasterListQuery,
  MasterReportQuery,
  VendorDto,
} from './master-admin.dto.js';
import { MasterAdminService } from './master-admin.service.js';
import { ReportService } from '../report/report.service.js';
import type { RefKind } from './ref-check.service.js';

/** template ใน report/Reports/ */
const TEMPLATE: Record<RefKind, string> = {
  vendor: 'Vendors',
  item: 'Items',
  entity: 'Entities',
  division: 'Divisions',
};

/** แก้ไขรหัสหลักไม่ได้ — รหัสใน body ต้องตรงกับใน URL */
function sameCode(param: string, body: string) {
  if (param !== body) throw new BadRequestException('ไม่สามารถเปลี่ยนรหัสได้');
}

/** จัดการข้อมูลหลัก: ผู้ขาย / สินค้า / บริษัท — เฉพาะ admin, manager (MASTER_ROLES) */
@Controller('admin')
@UseGuards(MasterRoleGuard)
export class MasterAdminController {
  constructor(
    private readonly svc: MasterAdminService,
    private readonly report: ReportService,
  ) {}

  private async sendReport(kind: RefKind, q: MasterReportQuery, u: AuthUser, res: Response) {
    const tables = await this.svc.reportData(kind, q, u);
    if ('count' in tables) {
      res.json(tables);
      return;
    }
    const pdf = await this.report.renderPdf(
      TEMPLATE[kind],
      { Header: tables.Header, Rows: tables.Rows },
      { dpi: 130, quality: 75 },
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${TEMPLATE[kind]}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  // ---------------- รายงาน (ต้องประกาศก่อน route ':code')
  @Get('vendors/report')
  vendorReport(@Query() q: MasterReportQuery, @CurrentUser() u: AuthUser, @Res() res: Response) {
    return this.sendReport('vendor', q, u, res);
  }
  @Get('items/report')
  itemReport(@Query() q: MasterReportQuery, @CurrentUser() u: AuthUser, @Res() res: Response) {
    return this.sendReport('item', q, u, res);
  }
  @Get('entities/report')
  entityReport(@Query() q: MasterReportQuery, @CurrentUser() u: AuthUser, @Res() res: Response) {
    return this.sendReport('entity', q, u, res);
  }

  @Get('divisions/report')
  divisionReport(@Query() q: MasterReportQuery, @CurrentUser() u: AuthUser, @Res() res: Response) {
    return this.sendReport('division', q, u, res);
  }

  @Get('lookups')
  lookups() {
    return this.svc.lookups();
  }

  // ---------------- ผู้ขาย
  @Get('vendors')
  listVendors(@Query() q: MasterListQuery) {
    return this.svc.listVendors(q);
  }
  @Get('vendors/:code')
  getVendor(@Param('code') code: string) {
    return this.svc.getVendor(code);
  }
  @Post('vendors')
  createVendor(@Body() dto: VendorDto, @CurrentUser() u: AuthUser) {
    return this.svc.createVendor(dto, u);
  }
  @Put('vendors/:code')
  updateVendor(@Param('code') code: string, @Body() dto: VendorDto, @CurrentUser() u: AuthUser) {
    sameCode(code, dto.code);
    return this.svc.updateVendor(code, dto, u);
  }
  @Delete('vendors/:code')
  deleteVendor(@Param('code') code: string) {
    return this.svc.deleteVendor(code);
  }

  // ---------------- สินค้า
  @Get('items')
  listItems(@Query() q: MasterListQuery) {
    return this.svc.listItems(q);
  }
  @Get('items/:code')
  getItem(@Param('code') code: string) {
    return this.svc.getItem(code);
  }
  @Post('items')
  createItem(@Body() dto: ItemDto, @CurrentUser() u: AuthUser) {
    return this.svc.createItem(dto, u);
  }
  @Put('items/:code')
  updateItem(@Param('code') code: string, @Body() dto: ItemDto, @CurrentUser() u: AuthUser) {
    // รหัสสินค้าเดิมบางตัวมีช่องว่างนำหน้า (เช่น " 2A0158") — เทียบหลัง trim
    sameCode(code.trim(), dto.code);
    return this.svc.updateItem(code, dto, u);
  }
  @Delete('items/:code')
  deleteItem(@Param('code') code: string) {
    return this.svc.deleteItem(code);
  }

  // ---------------- บริษัท
  @Get('entities')
  listEntities(@Query() q: MasterListQuery) {
    return this.svc.listEntities(q);
  }
  @Get('entities/:code')
  getEntity(@Param('code') code: string) {
    return this.svc.getEntity(code);
  }
  @Post('entities')
  createEntity(@Body() dto: EntityDto, @CurrentUser() u: AuthUser) {
    return this.svc.createEntity(dto, u);
  }
  @Put('entities/:code')
  updateEntity(@Param('code') code: string, @Body() dto: EntityDto, @CurrentUser() u: AuthUser) {
    sameCode(code, dto.code);
    return this.svc.updateEntity(code, dto, u);
  }
  @Delete('entities/:code')
  deleteEntity(@Param('code') code: string) {
    return this.svc.deleteEntity(code);
  }

  // ---------------- หน่วยงาน
  @Get('divisions')
  listDivisions(@Query() q: MasterListQuery) {
    return this.svc.listDivisions(q);
  }
  @Get('divisions/:code')
  getDivision(@Param('code') code: string) {
    return this.svc.getDivision(code);
  }
  @Post('divisions')
  createDivision(@Body() dto: DivisionDto, @CurrentUser() u: AuthUser) {
    return this.svc.createDivision(dto, u);
  }
  @Put('divisions/:code')
  updateDivision(@Param('code') code: string, @Body() dto: DivisionDto, @CurrentUser() u: AuthUser) {
    sameCode(code, dto.code);
    return this.svc.updateDivision(code, dto, u);
  }
  @Delete('divisions/:code')
  deleteDivision(@Param('code') code: string) {
    return this.svc.deleteDivision(code);
  }
}
