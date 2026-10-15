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
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthUser } from '../../../core/auth/auth.types.js';
import { CurrentUser } from '../../../core/auth/decorators.js';
import { RequireModule } from '../../../core/auth/module.guard.js';
import {
  DivisionDto,
  EntityDto,
  ItemDto,
  MasterListQuery,
  MasterReportQuery,
  VendorDto,
} from './master-admin.dto.js';
import { MasterAdminService } from './master-admin.service.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { PrismaService } from '../../../core/prisma/prisma.service.js';
import { ReportService } from '../../../core/report/report.service.js';
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

/**
 * ข้อมูลหลัก: ผู้ขาย / สินค้า / บริษัท / หน่วยงาน — module master
 * ระดับ user: ดูรายการและพิมพ์รายงาน / ระดับ manager: เพิ่ม แก้ไข ลบ (@RequireModule('base', 'manager') ที่ method)
 */
@Controller('admin')
@RequireModule('base')
export class MasterAdminController {
  constructor(
    private readonly svc: MasterAdminService,
    private readonly report: ReportService,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  /** รอให้บันทึกสำเร็จ แล้วเก็บประวัติ (app_audit) — module base */
  private async logged<T>(u: AuthUser, docType: string, code: string, action: string, work: Promise<T>) {
    const result = await work;
    await this.audit.log(this.prisma, u, { module: 'base', docType, docNo: code, action });
    return result;
  }

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
  @RequireModule('base', 'manager')
  @Post('vendors')
  createVendor(@Body() dto: VendorDto, @CurrentUser() u: AuthUser) {
    return this.logged(u, 'vendor', dto.code, 'create', this.svc.createVendor(dto, u));
  }
  @RequireModule('base', 'manager')
  @Put('vendors/:code')
  updateVendor(@Param('code') code: string, @Body() dto: VendorDto, @CurrentUser() u: AuthUser) {
    sameCode(code, dto.code);
    return this.logged(u, 'vendor', code, 'update', this.svc.updateVendor(code, dto, u));
  }
  @RequireModule('base', 'manager')
  @Delete('vendors/:code')
  deleteVendor(@Param('code') code: string, @CurrentUser() u: AuthUser) {
    return this.logged(u, 'vendor', code, 'delete', this.svc.deleteVendor(code));
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
  @RequireModule('base', 'manager')
  @Post('items')
  createItem(@Body() dto: ItemDto, @CurrentUser() u: AuthUser) {
    return this.logged(u, 'item', dto.code, 'create', this.svc.createItem(dto, u));
  }
  @RequireModule('base', 'manager')
  @Put('items/:code')
  updateItem(@Param('code') code: string, @Body() dto: ItemDto, @CurrentUser() u: AuthUser) {
    // รหัสสินค้าเดิมบางตัวมีช่องว่างนำหน้า (เช่น " 2A0158") — เทียบหลัง trim
    sameCode(code.trim(), dto.code);
    return this.logged(u, 'item', code, 'update', this.svc.updateItem(code, dto, u));
  }
  @RequireModule('base', 'manager')
  @Delete('items/:code')
  deleteItem(@Param('code') code: string, @CurrentUser() u: AuthUser) {
    return this.logged(u, 'item', code, 'delete', this.svc.deleteItem(code));
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
  @RequireModule('base', 'manager')
  @Post('entities')
  createEntity(@Body() dto: EntityDto, @CurrentUser() u: AuthUser) {
    return this.logged(u, 'entity', dto.code, 'create', this.svc.createEntity(dto, u));
  }
  @RequireModule('base', 'manager')
  @Put('entities/:code')
  updateEntity(@Param('code') code: string, @Body() dto: EntityDto, @CurrentUser() u: AuthUser) {
    sameCode(code, dto.code);
    return this.logged(u, 'entity', code, 'update', this.svc.updateEntity(code, dto, u));
  }
  @RequireModule('base', 'manager')
  @Delete('entities/:code')
  deleteEntity(@Param('code') code: string, @CurrentUser() u: AuthUser) {
    return this.logged(u, 'entity', code, 'delete', this.svc.deleteEntity(code));
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
  @RequireModule('base', 'manager')
  @Post('divisions')
  createDivision(@Body() dto: DivisionDto, @CurrentUser() u: AuthUser) {
    return this.logged(u, 'division', dto.code, 'create', this.svc.createDivision(dto, u));
  }
  @RequireModule('base', 'manager')
  @Put('divisions/:code')
  updateDivision(@Param('code') code: string, @Body() dto: DivisionDto, @CurrentUser() u: AuthUser) {
    sameCode(code, dto.code);
    return this.logged(u, 'division', code, 'update', this.svc.updateDivision(code, dto, u));
  }
  @RequireModule('base', 'manager')
  @Delete('divisions/:code')
  deleteDivision(@Param('code') code: string, @CurrentUser() u: AuthUser) {
    return this.logged(u, 'division', code, 'delete', this.svc.deleteDivision(code));
  }
}
