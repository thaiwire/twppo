import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { nowBangkok, num, toDateStr, trim } from '../common/util.js';
import {
  Prisma,
  type div_mstr,
  type en_mstr,
  type it_mstr,
  type vd_mstr,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  NEW_CODE,
  type DivisionDto,
  type EntityDto,
  type ItemDto,
  type MasterListQuery,
  type MasterReportQuery,
  type VendorDto,
} from './master-admin.dto.js';
import { RefCheckService, type RefKind } from './ref-check.service.js';

const LABEL: Record<RefKind, string> = {
  vendor: 'ผู้ขาย',
  item: 'สินค้า',
  entity: 'บริษัท',
  division: 'หน่วยงาน',
};

/** ค่าว่าง → null (คอลัมน์ในระบบเดิมเป็น nullable) */
const n = (v: string | undefined | null) => (v && v.trim() ? v.trim() : null);

function assertNewCode(code: string) {
  if (!NEW_CODE.test(code))
    throw new BadRequestException('รหัสห้ามมีช่องว่างหัวท้าย และอักขระ / \\ ? # %');
}

function paging(q: MasterListQuery) {
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 20;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** จำนวนแถวสูงสุดในรายงาน PDF (~1,000 แถว ≈ 13 MB เพราะ PDF เป็นภาพ) */
const REPORT_LIMIT: Record<RefKind, number> = { vendor: 1000, item: 1000, entity: 1000, division: 1000 };

function vendorWhere(q: MasterListQuery): Prisma.vd_mstrWhereInput {
  const and: Prisma.vd_mstrWhereInput[] = [];
  const s = q.q?.trim();
  if (s)
    and.push({
      OR: [
        { vd_addr: { contains: s } },
        { vd_name: { contains: s } },
        { vd_alias: { contains: s } },
        { vd_tax_code: { contains: s } },
      ],
    });
  if (q.status === 'active') and.push({ NOT: { vd_status: 'c' } });
  if (q.status === 'inactive') and.push({ vd_status: 'c' });
  return and.length ? { AND: and } : {};
}

function itemWhere(q: MasterListQuery): Prisma.it_mstrWhereInput {
  const s = q.q?.trim();
  return s
    ? {
        OR: [
          { it_prod_id: { contains: s } },
          { it_name1: { contains: s } },
          { it_name2: { contains: s } },
          { it_ename: { contains: s } },
        ],
      }
    : {};
}

function divisionWhere(q: MasterListQuery): Prisma.div_mstrWhereInput {
  const s = q.q?.trim();
  return s ? { OR: [{ div_code: { contains: s } }, { div_desc: { contains: s } }] } : {};
}

function entityWhere(q: MasterListQuery): Prisma.en_mstrWhereInput {
  const s = q.q?.trim();
  return s ? { OR: [{ en_entity: { contains: s } }, { en_name: { contains: s } }] } : {};
}

@Injectable()
export class MasterAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: RefCheckService,
  ) {}

  // ================================================================ ผู้ขาย

  async listVendors(q: MasterListQuery) {
    const { page, pageSize, skip, take } = paging(q);
    const where = vendorWhere(q);
    const [total, rows] = await Promise.all([
      this.prisma.vd_mstr.count({ where }),
      this.prisma.vd_mstr.findMany({ where, orderBy: { vd_addr: 'asc' }, skip, take }),
    ]);
    return { total, page, pageSize, items: rows.map(vendorView) };
  }

  async getVendor(code: string) {
    const v = await this.prisma.vd_mstr.findUnique({ where: { vd_addr: code } });
    if (!v) throw new NotFoundException(`ไม่พบผู้ขายรหัส ${code}`);
    return vendorView(v);
  }

  async createVendor(dto: VendorDto, user: AuthUser) {
    assertNewCode(dto.code);
    await this.assertVat(dto.vatClass);
    if (await this.prisma.vd_mstr.findUnique({ where: { vd_addr: dto.code } }))
      throw new ConflictException(`รหัสผู้ขาย ${dto.code} มีอยู่แล้ว`);
    const now = nowBangkok();
    const v = await this.prisma.vd_mstr.create({
      data: {
        vd_addr: dto.code,
        ...vendorFields(dto, user),
        // ค่าเริ่มต้นแบบเดียวกับระเบียนในระบบเดิม (ตัวเลข = 0, flag = false)
        vd_hold: false,
        vd_partial: true,
        vd_disc_pct1: 0,
        vd_disc_pct2: 0,
        vd_balance: 0,
        vd_balance_base: 0,
        vd_open_date: now.date,
        vd_vl_cntpo: 0,
        vd_vl_cntlate: 0,
        vd_vl_cntncp: 0,
        vd_vl_point: 0,
      },
    });
    return vendorView(v);
  }

  async updateVendor(code: string, dto: VendorDto, user: AuthUser) {
    await this.getVendor(code);
    await this.assertVat(dto.vatClass);
    const v = await this.prisma.vd_mstr.update({
      where: { vd_addr: code },
      data: vendorFields(dto, user),
    });
    return vendorView(v);
  }

  async deleteVendor(code: string) {
    await this.getVendor(code);
    await this.assertUnused('vendor', code, 'แนะนำให้ปิดใช้งาน (สถานะ = ไม่ใช้งาน) แทนการลบ');
    await this.prisma.vd_mstr.delete({ where: { vd_addr: code } });
    return { ok: true };
  }

  // ================================================================ สินค้า

  async listItems(q: MasterListQuery) {
    const { page, pageSize, skip, take } = paging(q);
    const where = itemWhere(q);
    const [total, rows] = await Promise.all([
      this.prisma.it_mstr.count({ where }),
      this.prisma.it_mstr.findMany({ where, orderBy: { it_prod_id: 'asc' }, skip, take }),
    ]);
    return { total, page, pageSize, items: rows.map(itemView) };
  }

  async getItem(code: string) {
    const it = await this.prisma.it_mstr.findUnique({ where: { it_prod_id: code } });
    if (!it) throw new NotFoundException(`ไม่พบสินค้ารหัส ${code}`);
    return itemView(it);
  }

  async createItem(dto: ItemDto, user: AuthUser) {
    assertNewCode(dto.code);
    await Promise.all([this.assertVat(dto.vatClass), this.assertVendor(dto.vend)]);
    if (await this.prisma.it_mstr.findUnique({ where: { it_prod_id: dto.code } }))
      throw new ConflictException(`รหัสสินค้า ${dto.code} มีอยู่แล้ว`);
    const now = nowBangkok();
    const it = await this.prisma.it_mstr.create({
      data: {
        it_prod_id: dto.code,
        ...itemFields(dto, user),
        // ค่าเริ่มต้นแบบเดียวกับระเบียนในระบบเดิม
        it_alt_conv: 0,
        it_re_point: 0,
        it_disc_pct: 0,
        it_disc_amt: 0,
        it_cyc_int: 0,
        it_xqty_all: 0,
        it_xqty_chg: 0,
        it_costavg: 0,
        it_mv_cost: 0,
        it_pur_lead: 0,
        it_vat: false,
        it_phantom: false,
        it_open_yn: false,
        it_mrp: false,
        it_std_date: now.date,
        it_cur_date: now.date,
      },
    });
    return itemView(it);
  }

  async updateItem(code: string, dto: ItemDto, user: AuthUser) {
    await this.getItem(code);
    await Promise.all([this.assertVat(dto.vatClass), this.assertVendor(dto.vend)]);
    const it = await this.prisma.it_mstr.update({
      where: { it_prod_id: code },
      data: itemFields(dto, user),
    });
    return itemView(it);
  }

  async deleteItem(code: string) {
    await this.getItem(code);
    await this.assertUnused('item', code);
    await this.prisma.it_mstr.delete({ where: { it_prod_id: code } });
    return { ok: true };
  }

  // ================================================================ บริษัท

  async listEntities(q: MasterListQuery) {
    const { page, pageSize, skip, take } = paging(q);
    const where = entityWhere(q);
    const [total, rows] = await Promise.all([
      this.prisma.en_mstr.count({ where }),
      this.prisma.en_mstr.findMany({ where, orderBy: { en_entity: 'asc' }, skip, take }),
    ]);
    return { total, page, pageSize, items: rows.map(entityView) };
  }

  async getEntity(code: string) {
    const e = await this.prisma.en_mstr.findUnique({ where: { en_entity: code } });
    if (!e) throw new NotFoundException(`ไม่พบบริษัทรหัส ${code}`);
    return entityView(e);
  }

  async createEntity(dto: EntityDto, user: AuthUser) {
    assertNewCode(dto.code);
    if (await this.prisma.en_mstr.findUnique({ where: { en_entity: dto.code } }))
      throw new ConflictException(`รหัสบริษัท ${dto.code} มีอยู่แล้ว`);
    const e = await this.prisma.$transaction(async (tx) => {
      if (dto.primary) await tx.en_mstr.updateMany({ data: { en_primary: false } });
      return tx.en_mstr.create({
        data: {
          en_entity: dto.code,
          ...entityFields(dto, user),
          en_adj_bs: false,
          en_last_tx: 0,
        },
      });
    });
    return entityView(e);
  }

  async updateEntity(code: string, dto: EntityDto, user: AuthUser) {
    const cur = await this.getEntity(code);
    if (cur.primary && dto.primary === false)
      throw new BadRequestException(
        'ต้องมีบริษัทหลัก 1 แห่งเสมอ — ให้ตั้งบริษัทอื่นเป็นบริษัทหลักแทน',
      );
    const e = await this.prisma.$transaction(async (tx) => {
      if (dto.primary)
        await tx.en_mstr.updateMany({
          where: { NOT: { en_entity: code } },
          data: { en_primary: false },
        });
      return tx.en_mstr.update({ where: { en_entity: code }, data: entityFields(dto, user) });
    });
    return entityView(e);
  }

  async deleteEntity(code: string) {
    const cur = await this.getEntity(code);
    if (cur.primary) throw new BadRequestException('ลบบริษัทหลักไม่ได้');
    await this.assertUnused('entity', code);
    await this.prisma.en_mstr.delete({ where: { en_entity: code } });
    return { ok: true };
  }

  // ================================================================ หน่วยงาน

  async listDivisions(q: MasterListQuery) {
    const { page, pageSize, skip, take } = paging(q);
    const where = divisionWhere(q);
    const [total, rows] = await Promise.all([
      this.prisma.div_mstr.count({ where }),
      this.prisma.div_mstr.findMany({ where, orderBy: { div_code: 'asc' }, skip, take }),
    ]);
    // จำนวนผู้ใช้ / ใบ PR ในแต่ละหน่วยงาน (ช่วยตัดสินใจก่อนลบ)
    const codes = rows.map((r) => r.div_code);
    const [users, prs] = codes.length
      ? await Promise.all([
          this.prisma.app_user.findMany({ where: { div_code: { in: codes } }, select: { div_code: true } }),
          this.prisma.prq_mstr.findMany({ where: { prq_divcode: { in: codes } }, select: { prq_divcode: true } }),
        ])
      : [[], []];
    const countBy = (values: (string | null)[]) => {
      const m = new Map<string, number>();
      for (const v of values) {
        const k = trim(v).toLowerCase();
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return m;
    };
    const userCount = countBy(users.map((u) => u.div_code));
    const prCount = countBy(prs.map((p) => p.prq_divcode));
    return {
      total,
      page,
      pageSize,
      items: rows.map((r) => ({
        ...divisionView(r),
        userCount: userCount.get(trim(r.div_code).toLowerCase()) ?? 0,
        prCount: prCount.get(trim(r.div_code).toLowerCase()) ?? 0,
      })),
    };
  }

  async getDivision(code: string) {
    const d = await this.prisma.div_mstr.findUnique({ where: { div_code: code } });
    if (!d) throw new NotFoundException(`ไม่พบหน่วยงานรหัส ${code}`);
    return divisionView(d);
  }

  async createDivision(dto: DivisionDto, user: AuthUser) {
    assertNewCode(dto.code);
    if (await this.prisma.div_mstr.findUnique({ where: { div_code: dto.code } }))
      throw new ConflictException(`รหัสหน่วยงาน ${dto.code} มีอยู่แล้ว`);
    const d = await this.prisma.div_mstr.create({
      data: { div_code: dto.code, ...divisionFields(dto, user) },
    });
    return divisionView(d);
  }

  async updateDivision(code: string, dto: DivisionDto, user: AuthUser) {
    await this.getDivision(code);
    const d = await this.prisma.div_mstr.update({
      where: { div_code: code },
      data: divisionFields(dto, user),
    });
    return divisionView(d);
  }

  async deleteDivision(code: string) {
    await this.getDivision(code);
    await this.assertUnused('division', code);
    await this.prisma.div_mstr.delete({ where: { div_code: code } });
    return { ok: true };
  }

  // ================================================================ รายงาน (FastReport)

  /**
   * ข้อมูลรายงานรายการข้อมูลหลัก ตามเงื่อนไขค้นหาเดียวกับหน้ารายการ
   * จำกัดจำนวนแถว (REPORT_LIMIT) เพราะ PDF จาก FastReport.OpenSource เป็นภาพ — ไฟล์ใหญ่และช้าถ้าหลายพันแถว
   */
  async reportData(kind: RefKind, q: MasterReportQuery, user: AuthUser) {
    // check=1 → นับอย่างเดียว ไม่ต้องโหลดแถว
    const limit = q.check ? 0 : REPORT_LIMIT[kind];
    const t = (v?: string) => v?.trim() || undefined;
    const range = (from?: string, to?: string) =>
      t(from) || t(to) ? { ...(t(from) && { gte: t(from) }), ...(t(to) && { lte: t(to) }) } : undefined;
    const byName = q.sort === 'name';
    let total: number;
    let rows: Record<string, unknown>[];
    if (kind === 'vendor') {
      const name = t(q.name);
      const where: Prisma.vd_mstrWhereInput = {
        AND: [
          range(q.codeFrom, q.codeTo) ? { vd_addr: range(q.codeFrom, q.codeTo) } : {},
          name
            ? { OR: [{ vd_addr: { contains: name } }, { vd_name: { contains: name } }, { vd_alias: { contains: name } }] }
            : {},
          q.status === 'active' ? { NOT: { vd_status: 'c' } } : q.status === 'inactive' ? { vd_status: 'c' } : {},
          t(q.group) ? { vd_group: t(q.group) } : {},
          t(q.vatClass) ? { vd_vt_class: t(q.vatClass) } : {},
          t(q.creditTerm) ? { vd_cr: t(q.creditTerm) } : {},
        ],
      };
      const [cnt, r] = await Promise.all([
        this.prisma.vd_mstr.count({ where }),
        this.prisma.vd_mstr.findMany({
          where,
          orderBy: byName ? [{ vd_name: 'asc' }, { vd_addr: 'asc' }] : { vd_addr: 'asc' },
          take: limit,
        }),
      ]);
      total = cnt;
      rows = r.map(vendorView).map((v, i) => ({
        No: i + 1,
        Code: v.code,
        Name: v.name,
        Address: [v.line1, v.line2, v.line3].filter(Boolean).join(' '),
        Tel: v.tel,
        TaxId: v.taxId,
        Credit: v.creditTerm,
        Vat: v.vatClass,
        Status: v.active ? 'ใช้งาน' : 'ไม่ใช้งาน',
      }));
    } else if (kind === 'item') {
      const name = t(q.name);
      const where: Prisma.it_mstrWhereInput = {
        AND: [
          range(q.codeFrom, q.codeTo) ? { it_prod_id: range(q.codeFrom, q.codeTo) } : {},
          name
            ? {
                OR: [
                  { it_prod_id: { contains: name } },
                  { it_name1: { contains: name } },
                  { it_name2: { contains: name } },
                  { it_ename: { contains: name } },
                ],
              }
            : {},
          t(q.group) ? { it_prod_group: t(q.group) } : {},
          t(q.vend) ? { it_vend: t(q.vend) } : {},
          t(q.site) ? { it_site: t(q.site) } : {},
          t(q.vatClass) ? { it_vat_class: t(q.vatClass) } : {},
        ],
      };
      const [cnt, r] = await Promise.all([
        this.prisma.it_mstr.count({ where }),
        this.prisma.it_mstr.findMany({
          where,
          orderBy: byName ? [{ it_name1: 'asc' }, { it_prod_id: 'asc' }] : { it_prod_id: 'asc' },
          take: limit,
        }),
      ]);
      total = cnt;
      rows = r.map(itemView).map((v, i) => ({
        No: i + 1,
        Code: v.code.trim(),
        Name: [v.name1, v.name2].filter(Boolean).join(' '),
        Group: v.group,
        Um: v.um,
        Price: v.price,
        StdCost: v.stdCost,
        CurCost: v.curCost,
        Vend: v.vend,
        Site: v.site,
      }));
    } else if (kind === 'division') {
      const name = t(q.name);
      const where: Prisma.div_mstrWhereInput = {
        AND: [
          range(q.codeFrom, q.codeTo) ? { div_code: range(q.codeFrom, q.codeTo) } : {},
          name ? { OR: [{ div_code: { contains: name } }, { div_desc: { contains: name } }] } : {},
        ],
      };
      const [cnt, r] = await Promise.all([
        this.prisma.div_mstr.count({ where }),
        this.prisma.div_mstr.findMany({
          where,
          orderBy: byName ? [{ div_desc: 'asc' }, { div_code: 'asc' }] : { div_code: 'asc' },
          take: limit,
        }),
      ]);
      total = cnt;
      const codes = r.map((x) => x.div_code);
      const users = codes.length
        ? await this.prisma.app_user.findMany({
            where: { div_code: { in: codes } },
            select: { div_code: true },
          })
        : [];
      rows = r.map(divisionView).map((v, i) => ({
        No: i + 1,
        Code: v.code,
        Name: v.name,
        Users: users.filter((u) => trim(u.div_code).toLowerCase() === v.code.toLowerCase()).length,
      }));
    } else {
      const name = t(q.name);
      const where: Prisma.en_mstrWhereInput = {
        AND: [
          range(q.codeFrom, q.codeTo) ? { en_entity: range(q.codeFrom, q.codeTo) } : {},
          name ? { OR: [{ en_entity: { contains: name } }, { en_name: { contains: name } }] } : {},
        ],
      };
      const [cnt, r] = await Promise.all([
        this.prisma.en_mstr.count({ where }),
        this.prisma.en_mstr.findMany({
          where,
          orderBy: byName ? [{ en_name: 'asc' }, { en_entity: 'asc' }] : { en_entity: 'asc' },
          take: limit,
        }),
      ]);
      total = cnt;
      rows = r.map(entityView).map((v, i) => ({
        No: i + 1,
        Code: v.code,
        Name: v.name,
        Currency: v.currency,
        Primary: v.primary ? 'บริษัทหลัก' : '',
      }));
    }
    if (!total) throw new NotFoundException(`ไม่พบ${LABEL[kind]}ตามเงื่อนไขที่เลือก`);
    if (q.check) return { count: Math.min(total, REPORT_LIMIT[kind]), total };

    const codeRange =
      t(q.codeFrom) || t(q.codeTo) ? `รหัส ${t(q.codeFrom) ?? '(แรกสุด)'} ถึง ${t(q.codeTo) ?? '(สุดท้าย)'}` : '';
    const filters = [
      codeRange,
      t(q.name) ? `รหัส/ชื่อมีคำว่า "${t(q.name)}"` : '',
      q.status === 'active' ? 'สถานะ: ใช้งาน' : q.status === 'inactive' ? 'สถานะ: ไม่ใช้งาน' : '',
      t(q.group) ? `กลุ่ม: ${t(q.group)}` : '',
      t(q.vatClass) ? `ภาษี: ${t(q.vatClass)}` : '',
      kind === 'vendor' && t(q.creditTerm) ? `เครดิต: ${t(q.creditTerm)} วัน` : '',
      kind === 'item' && t(q.vend) ? `ผู้ขายหลัก: ${t(q.vend)}` : '',
      kind === 'item' && t(q.site) ? `Site: ${t(q.site)}` : '',
      byName ? 'เรียงตามชื่อ' : 'เรียงตามรหัส',
    ].filter(Boolean);
    const now = nowBangkok();
    const d = toDateStr(now.date)!;
    return {
      Header: [
        {
          Title: `รายงาน${LABEL[kind]}`,
          Filter: filters.length ? filters.join('   ') : 'ทั้งหมด',
          Count: rows.length,
          Total: total,
          Note:
            total > rows.length
              ? `แสดง ${rows.length.toLocaleString()} จาก ${total.toLocaleString()} รายการ — กรุณาค้นหาให้แคบลงเพื่อดูส่วนที่เหลือ`
              : '',
          PrintedBy: user.displayName,
          PrintedAt: `${d.slice(8, 10)}/${d.slice(5, 7)}/${Number(d.slice(0, 4)) + 543} ${now.time.slice(0, 5)}`,
        },
      ],
      Rows: rows,
    };
  }

  // ================================================================ ตัวเลือกในฟอร์ม

  /** ค่าที่ใช้อยู่จริงในฐานข้อมูล ใช้เป็นตัวเลือก/ค่าเริ่มต้นของฟอร์ม */
  async lookups() {
    const distinct = (sql: Prisma.Sql) =>
      this.prisma.$queryRaw<{ v: string }[]>(sql).then((r) => r.map((x) => x.v));
    const mostUsed = (sql: Prisma.Sql) =>
      this.prisma.$queryRaw<{ v: string }[]>(sql).then((r) => r[0]?.v ?? null);

    const [vendorGroups, creditTerms, currencies, itemGroups, sites, units, ctrl] =
      await Promise.all([
        distinct(this.sqlDistinct('vd_mstr', 'vd_group')),
        distinct(this.sqlDistinct('vd_mstr', 'vd_cr')),
        distinct(this.sqlDistinct('vd_mstr', 'vd_curr')),
        distinct(this.sqlDistinct('it_mstr', 'it_prod_group')),
        distinct(this.sqlDistinct('it_mstr', 'it_site')),
        distinct(this.sqlDistinct('it_mstr', 'it_um')),
        this.prisma.$queryRaw<{ site: string | null }[]>`SELECT TOP 1 purc_site AS site FROM pur_ctrl ORDER BY id`,
      ]);
    const [vdApAcct, itPurAcct, itInvAcct, itApAcct] = await Promise.all([
      mostUsed(this.sqlMostUsed('vd_mstr', 'vd_ap_acct')),
      mostUsed(this.sqlMostUsed('it_mstr', 'it_pur_acct')),
      mostUsed(this.sqlMostUsed('it_mstr', 'it_inv_acct')),
      mostUsed(this.sqlMostUsed('it_mstr', 'it_ap_acct')),
    ]);
    return {
      vendorGroups,
      creditTerms,
      currencies,
      itemGroups,
      sites,
      units,
      defaults: {
        vdApAcct,
        currency: currencies.includes('BHT') ? 'BHT' : (currencies[0] ?? null),
        site: trim(ctrl[0]?.site) || null,
        itPurAcct,
        itInvAcct,
        itApAcct,
      },
    };
  }

  // ================================================================ helpers

  // ชื่อตาราง/คอลัมน์เป็นค่าคงที่ในโค้ดเท่านั้น (ไม่มาจากผู้ใช้)
  private sqlDistinct(table: string, col: string) {
    return this.raw(
      `SELECT TOP 200 v FROM (SELECT LTRIM(RTRIM(${col})) AS v, COUNT(*) AS n FROM ${table}
       WHERE ${col} IS NOT NULL AND LTRIM(RTRIM(${col})) <> '' GROUP BY LTRIM(RTRIM(${col}))) x
       WHERE n > 1 ORDER BY v`,
    );
  }

  private sqlMostUsed(table: string, col: string) {
    return this.raw(
      `SELECT TOP 1 ${col} AS v FROM ${table} WHERE ${col} IS NOT NULL AND ${col} <> ''
       GROUP BY ${col} ORDER BY COUNT(*) DESC`,
    );
  }

  private raw(sql: string): Prisma.Sql {
    return Prisma.raw(sql);
  }

  private async assertVat(vatClass?: string) {
    if (!vatClass) return;
    const vt = await this.prisma.vt_mstr.findUnique({ where: { vt_class: vatClass } });
    if (!vt) throw new BadRequestException(`ไม่พบประเภทภาษี ${vatClass}`);
  }

  private async assertVendor(vend?: string) {
    if (!vend) return;
    const v = await this.prisma.vd_mstr.findUnique({ where: { vd_addr: vend } });
    if (!v) throw new BadRequestException(`ไม่พบรหัสผู้ขาย ${vend}`);
  }

  private async assertUnused(kind: RefKind, code: string, hint?: string) {
    const used = await this.refs.findUsages(kind, code);
    if (used.length) {
      throw new ConflictException(
        `ลบ${LABEL[kind]} ${code} ไม่ได้ เพราะถูกใช้งานอยู่ใน ${used.slice(0, 5).join(', ')}${
          used.length > 5 ? ` และอีก ${used.length - 5} ตาราง` : ''
        }${hint ? ` — ${hint}` : ''}`,
      );
    }
  }
}

// ---------------------------------------------------------------- mapping

/** ผู้แก้ไข/วันที่/เวลาล่าสุด (คอลัมน์ *_user1, *_date1, *_time1 ของระบบเดิม) */
function stamp(user: AuthUser) {
  const now = nowBangkok();
  return { user: user.username.slice(0, 24), date: now.date, time: now.time };
}

function vendorFields(d: VendorDto, user: AuthUser) {
  const st = stamp(user);
  return {
    vd_name: d.name,
    vd_name1: n(d.name1),
    vd_alias: n(d.alias),
    vd_line1: n(d.line1),
    vd_line2: n(d.line2),
    vd_line3: n(d.line3),
    vd_tel: n(d.tel),
    vd_fax: n(d.fax),
    vd_tax_code: n(d.taxId),
    vd_pur_contact: n(d.contact),
    vd_ap_contact: n(d.apContact),
    vd_group: n(d.group),
    vd_cr: n(d.creditTerm),
    vd_curr: n(d.currency),
    vd_vt_class: n(d.vatClass),
    vd_taxable: d.taxable ?? true,
    vd_ap_acct: n(d.apAcct),
    vd_status: d.active === false ? 'c' : 'O',
    vd_rmks: n(d.remark),
    vd_user1: st.user,
    vd_date1: st.date,
    vd_time1: st.time,
  } satisfies Prisma.vd_mstrUpdateInput;
}

function vendorView(v: vd_mstr) {
  return {
    code: v.vd_addr,
    name: trim(v.vd_name),
    name1: trim(v.vd_name1),
    alias: trim(v.vd_alias),
    line1: trim(v.vd_line1),
    line2: trim(v.vd_line2),
    line3: trim(v.vd_line3),
    tel: trim(v.vd_tel),
    fax: trim(v.vd_fax),
    taxId: trim(v.vd_tax_code),
    contact: trim(v.vd_pur_contact),
    apContact: trim(v.vd_ap_contact),
    group: trim(v.vd_group),
    creditTerm: trim(v.vd_cr),
    currency: trim(v.vd_curr),
    vatClass: trim(v.vd_vt_class),
    taxable: v.vd_taxable ?? true,
    apAcct: trim(v.vd_ap_acct),
    active: trim(v.vd_status).toLowerCase() !== 'c',
    remark: trim(v.vd_rmks),
    updatedBy: trim(v.vd_user1),
    updatedAt: `${toDateStr(v.vd_date1) ?? ''} ${trim(v.vd_time1)}`.trim(),
  };
}

function itemFields(d: ItemDto, user: AuthUser) {
  const st = stamp(user);
  return {
    it_name1: d.name1,
    it_name2: n(d.name2),
    it_ename: n(d.ename),
    it_prod_group: n(d.group),
    it_um: n(d.um),
    it_price: d.price ?? 0,
    it_std: d.stdCost ?? 0,
    it_cur: d.curCost ?? 0,
    it_vend: n(d.vend),
    it_vat_class: n(d.vatClass),
    it_taxable: d.taxable ?? true,
    it_min_qty: d.minQty ?? 0,
    it_max_qty: d.maxQty ?? 0,
    it_sfty_stk: d.safetyStock ?? 0,
    it_site: n(d.site),
    it_lc: n(d.location),
    it_pur_acct: n(d.purAcct),
    it_inv_acct: n(d.invAcct),
    it_ap_acct: n(d.apAcct),
    it_rmk_1: n(d.remark),
    it_user1: st.user,
    it_date1: st.date,
    it_time1: st.time,
  } satisfies Prisma.it_mstrUpdateInput;
}

function itemView(it: it_mstr) {
  return {
    code: it.it_prod_id,
    name1: trim(it.it_name1),
    name2: trim(it.it_name2),
    ename: trim(it.it_ename),
    group: trim(it.it_prod_group),
    um: trim(it.it_um),
    price: num(it.it_price),
    stdCost: num(it.it_std),
    curCost: num(it.it_cur),
    vend: trim(it.it_vend),
    vatClass: trim(it.it_vat_class),
    taxable: it.it_taxable ?? true,
    minQty: num(it.it_min_qty),
    maxQty: num(it.it_max_qty),
    safetyStock: num(it.it_sfty_stk),
    site: trim(it.it_site),
    location: trim(it.it_lc),
    purAcct: trim(it.it_pur_acct),
    invAcct: trim(it.it_inv_acct),
    apAcct: trim(it.it_ap_acct),
    remark: trim(it.it_rmk_1),
    updatedBy: trim(it.it_user1),
    updatedAt: `${toDateStr(it.it_date1) ?? ''} ${trim(it.it_time1)}`.trim(),
  };
}

function divisionFields(d: DivisionDto, user: AuthUser) {
  const st = stamp(user);
  return {
    div_desc: d.name,
    div_user1: st.user,
    div_date1: st.date,
    div_time1: st.time,
  } satisfies Prisma.div_mstrUpdateInput;
}

function divisionView(d: div_mstr) {
  return {
    code: d.div_code,
    name: trim(d.div_desc),
    updatedBy: trim(d.div_user1),
    updatedAt: `${toDateStr(d.div_date1) ?? ''} ${trim(d.div_time1)}`.trim(),
  };
}

function entityFields(d: EntityDto, user: AuthUser) {
  const st = stamp(user);
  return {
    en_name: d.name,
    en_curr: n(d.currency),
    en_primary: d.primary ?? false,
    en_user1: st.user,
    en_date1: st.date,
    en_time1: st.time,
  } satisfies Prisma.en_mstrUpdateInput;
}

function entityView(e: en_mstr) {
  return {
    code: e.en_entity,
    name: trim(e.en_name),
    currency: trim(e.en_curr),
    primary: !!e.en_primary,
    updatedBy: trim(e.en_user1),
    updatedAt: `${toDateStr(e.en_date1) ?? ''} ${trim(e.en_time1)}`.trim(),
  };
}
