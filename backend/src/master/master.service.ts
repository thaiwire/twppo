import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { num, trim } from '../common/util.js';

const TAKE = 30;

@Injectable()
export class MasterService {
  constructor(private readonly prisma: PrismaService) {}

  async vendors(q = '', code?: string) {
    const rows = await this.prisma.vd_mstr.findMany({
      where: code
        ? { vd_addr: code }
        : q
          ? { OR: [{ vd_addr: { startsWith: q } }, { vd_name: { contains: q } }] }
          : undefined,
      select: {
        vd_addr: true,
        vd_name: true,
        vd_vt_class: true,
        vd_taxable: true,
        vd_status: true,
      },
      orderBy: { vd_addr: 'asc' },
      take: TAKE,
    });
    return rows.map((r) => ({
      code: trim(r.vd_addr),
      name: trim(r.vd_name),
      vatClass: trim(r.vd_vt_class),
      taxable: r.vd_taxable ?? true,
      status: trim(r.vd_status),
    }));
  }

  async items(q = '') {
    const rows = await this.prisma.it_mstr.findMany({
      where: q
        ? {
            OR: [
              { it_prod_id: { startsWith: q } },
              { it_prod_id: { startsWith: ` ${q}` } },
              { it_name1: { contains: q } },
              { it_name2: { contains: q } },
            ],
          }
        : undefined,
      select: {
        it_prod_id: true,
        it_name1: true,
        it_name2: true,
        it_um: true,
        it_price: true,
        it_cur: true,
      },
      orderBy: { it_prod_id: 'asc' },
      take: TAKE,
    });
    return rows.map((r) => ({
      code: r.it_prod_id,
      name: [trim(r.it_name1), trim(r.it_name2)].filter(Boolean).join(' '),
      um: trim(r.it_um),
      price: num(r.it_cur) || num(r.it_price),
    }));
  }

  async entities() {
    const rows = await this.prisma.en_mstr.findMany({
      orderBy: { en_entity: 'asc' },
    });
    return rows.map((r) => ({
      code: trim(r.en_entity),
      name: trim(r.en_name),
      primary: !!r.en_primary,
    }));
  }

  async divisions() {
    const rows = await this.prisma.div_mstr.findMany({ orderBy: { div_code: 'asc' } });
    return rows.map((r) => ({ code: trim(r.div_code), name: trim(r.div_desc) }));
  }

  async vatClasses() {
    const rows = await this.prisma.vt_mstr.findMany({
      orderBy: { vt_class: 'asc' },
    });
    return rows.map((r) => ({
      code: trim(r.vt_class),
      desc: trim(r.vt_desc),
      pct: num(r.vt_tax_pct),
      primary: !!r.vt_primary,
    }));
  }

  async units() {
    const rows = await this.prisma.$queryRaw<{ code: string }[]>`
      SELECT DISTINCT RTRIM(LTRIM(um_code)) AS code
      FROM um_mstr WHERE um_code IS NOT NULL AND LTRIM(um_code) <> ''
      ORDER BY 1`;
    return rows.map((r) => r.code);
  }
}
