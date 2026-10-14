import {
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
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators.js';
import { ReportService } from '../report/report.service.js';
import { ListPrQuery, PrPrintQuery, SavePrDto } from './pr.dto.js';
import { PrService } from './pr.service.js';

@Controller('pr')
export class PrController {
  constructor(
    private readonly pr: PrService,
    private readonly report: ReportService,
  ) {}

  @Get()
  list(@Query() q: ListPrQuery, @CurrentUser() user: AuthUser) {
    return this.pr.list(q, user);
  }

  /** พิมพ์ใบเสนอซื้อตามเงื่อนไข (หลายใบในไฟล์เดียว) — ต้องประกาศก่อน route ':nbr' */
  @Get('print')
  async printMany(
    @Query() q: PrPrintQuery,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const data = await this.pr.printData(q, user);
    if ('count' in data) {
      res.json(data);
      return;
    }
    this.sendPdf(res, await this.report.renderPdf('PR', data), 'PR');
  }

  @Get(':nbr')
  get(@Param('nbr') nbr: string, @CurrentUser() user: AuthUser) {
    return this.pr.get(nbr, user);
  }

  @Post()
  create(@Body() dto: SavePrDto, @CurrentUser() user: AuthUser) {
    return this.pr.create(dto, user);
  }

  @Put(':nbr')
  update(
    @Param('nbr') nbr: string,
    @Body() dto: SavePrDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pr.update(nbr, dto, user);
  }

  @Delete(':nbr')
  remove(@Param('nbr') nbr: string, @CurrentUser() user: AuthUser) {
    return this.pr.remove(nbr, user);
  }

  @Post(':nbr/approve')
  approve(@Param('nbr') nbr: string, @CurrentUser() user: AuthUser) {
    return this.pr.setApprove(nbr, true, user);
  }

  @Post(':nbr/unapprove')
  unapprove(@Param('nbr') nbr: string, @CurrentUser() user: AuthUser) {
    return this.pr.setApprove(nbr, false, user);
  }

  @Post(':nbr/close')
  close(@Param('nbr') nbr: string, @CurrentUser() user: AuthUser) {
    return this.pr.setStatus(nbr, 'C', user);
  }

  @Post(':nbr/reopen')
  reopen(@Param('nbr') nbr: string, @CurrentUser() user: AuthUser) {
    return this.pr.setStatus(nbr, 'O', user);
  }

  /** พิมพ์ใบเดียว (PDF จาก report/Reports/PR.frx) */
  @Get(':nbr/print')
  async print(
    @Param('nbr') nbr: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const tables = this.pr.toReportTables([await this.pr.get(nbr, user)], user);
    this.sendPdf(res, await this.report.renderPdf('PR', tables), nbr);
  }

  private sendPdf(res: Response, pdf: Buffer, name: string) {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${encodeURIComponent(name)}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }
}
