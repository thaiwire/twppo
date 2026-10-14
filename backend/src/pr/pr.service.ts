import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { canApprove, type AuthUser } from '../auth/auth.types.js';
import {
  fromDateStr,
  nowBangkok,
  num,
  round2,
  toDateStr,
  trim,
} from '../common/util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { bahtText } from '../common/bahttext.js';
import type { ListPrQuery, PrPrintQuery, SavePrDto } from './pr.dto.js';

type Tx = Prisma.TransactionClient;

/** จำนวนใบ PR สูงสุดต่อการพิมพ์ 1 ครั้ง */
export const PRINT_LIMIT = 200;

/**
 * ขอบเขตการมองเห็น PR ตามหน่วยงานของผู้ใช้
 * - ผู้ใช้ที่มีหน่วยงาน → เห็น/ทำงานได้เฉพาะ PR ของหน่วยงานตัวเอง
 * - ผู้ใช้ที่ไม่ระบุหน่วยงาน → เห็นทุกหน่วยงาน (กรองเองได้ด้วย div; "-" = PR ที่ยังไม่ระบุหน่วยงาน)
 */
function divScope(user: AuthUser, div?: string): Prisma.prq_mstrWhereInput {
  if (user.divCode) return { prq_divcode: user.divCode };
  if (div === '-') return { OR: [{ prq_divcode: null }, { prq_divcode: '' }] };
  if (div?.trim()) return { prq_divcode: div.trim() };
  return {};
}

/** วันที่แบบไทย dd/MM/พ.ศ. สำหรับใบพิมพ์ */
const thaiDate = (s: string | null) =>
  s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${Number(s.slice(0, 4)) + 543}` : '';

export interface PrTotals {
  subtotal: number;
  discPct: number;
  discAmt: number;
  afterDisc: number;
  vatPct: number;
  vatAmt: number;
  net: number;
}

/** คำนวณยอดรวมแบบเดียวกับหน้าจอเดิม (prqmt.p): รวม → หักส่วนลด % → ภาษี → สุทธิ */
export function calcTotals(
  lines: { qty: number; price: number }[],
  discPct: number,
  taxable: boolean,
  vatPct: number,
): PrTotals {
  const subtotal = round2(
    lines.reduce((s, l) => s + round2(l.qty * l.price), 0),
  );
  const discAmt = round2((subtotal * discPct) / 100);
  const afterDisc = round2(subtotal - discAmt);
  const vatAmt = taxable ? round2((afterDisc * vatPct) / 100) : 0;
  return {
    subtotal,
    discPct,
    discAmt,
    afterDisc,
    vatPct: taxable ? vatPct : 0,
    vatAmt,
    net: round2(afterDisc + vatAmt),
  };
}

@Injectable()
export class PrService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- list

  async list(q: ListPrQuery, user: AuthUser) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const and: Prisma.prq_mstrWhereInput[] = [];
    if (q.q?.trim()) {
      const s = q.q.trim();
      and.push({
        OR: [
          { prq_nbr: { contains: s } },
          { prq_request: { contains: s } },
          { prq_vend: { contains: s } },
          { prq_remark: { contains: s } },
        ],
      });
    }
    if (q.status) and.push({ prq_status: q.status });
    if (q.approve === 'Y') and.push({ prq_approve: true });
    if (q.approve === 'N')
      and.push({ OR: [{ prq_approve: false }, { prq_approve: null }] });
    if (q.entity) and.push({ prq_entity: q.entity });
    if (q.dateFrom) and.push({ prq_pr_date: { gte: fromDateStr(q.dateFrom)! } });
    if (q.dateTo) and.push({ prq_pr_date: { lte: fromDateStr(q.dateTo)! } });
    and.push(divScope(user, q.div));
    const where: Prisma.prq_mstrWhereInput = { AND: and };

    const [total, rows] = await Promise.all([
      this.prisma.prq_mstr.count({ where }),
      this.prisma.prq_mstr.findMany({
        where,
        orderBy: [{ prq_pr_date: 'desc' }, { ID: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const nbrs = rows.map((r) => r.prq_nbr);
    const vends = [...new Set(rows.map((r) => r.prq_vend).filter(Boolean))];
    const [sums, vendors] = await Promise.all([
      nbrs.length
        ? this.prisma.$queryRaw<{ nbr: string; amt: number; cnt: number }[]>`
            SELECT prqd_nbr AS nbr,
                   SUM(ISNULL(prqd_qty_ord,0) * ISNULL(prqd_est_price,0)) AS amt,
                   COUNT(*) AS cnt
            FROM prq_det WHERE prqd_nbr IN (${Prisma.join(nbrs)})
            GROUP BY prqd_nbr`
        : [],
      vends.length
        ? this.prisma.vd_mstr.findMany({
            where: { vd_addr: { in: vends as string[] } },
            select: { vd_addr: true, vd_name: true },
          })
        : [],
    ]);
    const sumMap = new Map(sums.map((s) => [s.nbr, s]));
    const vendMap = new Map(
      vendors.map((v) => [v.vd_addr.toLowerCase(), trim(v.vd_name)]),
    );

    return {
      total,
      page,
      pageSize,
      items: rows.map((r) => {
        const s = sumMap.get(r.prq_nbr);
        const amount = round2(Number(s?.amt ?? 0));
        const disc = num(r.prq_disc_amt1);
        return {
          nbr: r.prq_nbr,
          prDate: toDateStr(r.prq_pr_date),
          needDate: toDateStr(r.prq_need_date),
          vend: trim(r.prq_vend),
          vendName: vendMap.get(trim(r.prq_vend).toLowerCase()) ?? '',
          request: trim(r.prq_request),
          entity: trim(r.prq_entity),
          divCode: trim(r.prq_divcode),
          remark: trim(r.prq_remark),
          status: trim(r.prq_status) || 'O',
          approved: !!r.prq_approve,
          lineCount: Number(s?.cnt ?? 0),
          amount,
          net: round2(amount - disc + num(r.prq_vat_amt)),
          createdBy: trim(r.prq_user1),
        };
      }),
    };
  }

  // ---------------------------------------------------------------- detail

  /** ดูใบ PR — นอกหน่วยงานของผู้ใช้จะถือว่า "ไม่พบ" */
  async get(nbr: string, user: AuthUser) {
    const [d] = await this.getMany({ AND: [{ prq_nbr: nbr }, divScope(user)] });
    if (!d) throw new NotFoundException(`ไม่พบใบเสนอซื้อเลขที่ ${nbr}`);
    return d;
  }

  /** โหลดใบ PR หลายใบพร้อมรายการ/ผู้ขาย/บริษัท/ภาษี แบบรวม query (ใช้ทั้งหน้าดูเอกสารและพิมพ์หลายใบ) */
  async getMany(where: Prisma.prq_mstrWhereInput, take?: number) {
    const headers = await this.prisma.prq_mstr.findMany({
      where,
      orderBy: { prq_nbr: 'asc' },
      take,
    });
    if (!headers.length) return [];
    const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))];
    const [lines, vendors, entities, vats, divs] = await Promise.all([
      this.prisma.prq_det.findMany({
        where: { prqd_nbr: { in: headers.map((h) => h.prq_nbr) } },
        orderBy: [{ prqd_nbr: 'asc' }, { prqd_line: 'asc' }],
      }),
      this.prisma.vd_mstr.findMany({ where: { vd_addr: { in: uniq(headers.map((h) => h.prq_vend)) } } }),
      this.prisma.en_mstr.findMany({ where: { en_entity: { in: uniq(headers.map((h) => h.prq_entity)) } } }),
      this.prisma.vt_mstr.findMany({ where: { vt_class: { in: uniq(headers.map((h) => h.prq_vt_class)) } } }),
      this.prisma.div_mstr.findMany({ where: { div_code: { in: uniq(headers.map((h) => h.prq_divcode)) } } }),
    ]);
    // รหัสในระบบเดิมเทียบแบบไม่สนตัวพิมพ์ (collation CI) — map ด้วยตัวพิมพ์เล็ก
    const key = (v: string | null | undefined) => trim(v).toLowerCase();
    const linesBy = new Map<string, typeof lines>();
    for (const l of lines) {
      const k = l.prqd_nbr.toLowerCase();
      linesBy.set(k, [...(linesBy.get(k) ?? []), l]);
    }
    const vendorBy = new Map(vendors.map((v) => [key(v.vd_addr), v]));
    const entityBy = new Map(entities.map((e) => [key(e.en_entity), e]));
    const vatBy = new Map(vats.map((v) => [key(v.vt_class), v]));
    const divBy = new Map(divs.map((d) => [key(d.div_code), trim(d.div_desc)]));

    return headers.map((h) => {
      const vendor = vendorBy.get(key(h.prq_vend));
      const entity = entityBy.get(key(h.prq_entity));
      const vat = vatBy.get(key(h.prq_vt_class));
      const outLines = (linesBy.get(h.prq_nbr.toLowerCase()) ?? []).map((l) => ({
        line: l.prqd_line,
        part: (l.prqd_part ?? '').trimEnd(),
        desc: trim(l.prqd_desc),
        um: trim(l.prqd_um),
        qty: num(l.prqd_qty_ord),
        price: num(l.prqd_est_price),
        amount: round2(num(l.prqd_qty_ord) * num(l.prqd_est_price)),
        qtyOrdered: num(l.prqd_qty_open),
        status: trim(l.prqd_status) || 'O',
      }));

      const taxable = h.prq_taxable ?? true;
      const totals = calcTotals(
        outLines,
        num(h.prq_disc_pct1),
        taxable && !!vat,
        num(vat?.vt_tax_pct),
      );
      // ใช้ยอดที่บันทึกไว้ในเอกสารเดิมถ้ามี (กันผลต่างจากการปัดเศษของระบบเก่า)
      if (h.prq_vat_amt != null) {
        totals.vatAmt = num(h.prq_vat_amt);
        totals.net = round2(totals.afterDisc + totals.vatAmt);
      }

      return {
        nbr: h.prq_nbr,
        prDate: toDateStr(h.prq_pr_date),
        needDate: toDateStr(h.prq_need_date),
        vend: trim(h.prq_vend),
        vendor: vendor
          ? {
              code: trim(vendor.vd_addr),
              name: trim(vendor.vd_name),
              address: [vendor.vd_line1, vendor.vd_line2, vendor.vd_line3]
                .map(trim)
                .filter(Boolean)
                .join(' '),
              tel: trim(vendor.vd_tel),
              fax: trim(vendor.vd_fax),
              contact: trim(vendor.vd_pur_contact),
            }
          : null,
        request: trim(h.prq_request),
        entity: trim(h.prq_entity),
        entityName: trim(entity?.en_name),
        divCode: trim(h.prq_divcode),
        divName: divBy.get(key(h.prq_divcode)) ?? '',
        remark: trim(h.prq_remark),
        remark1: trim(h.prq_remark1),
        status: trim(h.prq_status) || 'O',
        approved: !!h.prq_approve,
        approvedBy: trim(h.prq_user2),
        taxable,
        vatClass: trim(h.prq_vt_class),
        vatDesc: trim(vat?.vt_desc),
        createdBy: trim(h.prq_user1),
        updatedAt: `${toDateStr(h.prq_date1) ?? ''} ${trim(h.prq_time1)}`.trim(),
        lines: outLines,
        totals,
        /** มีรายการที่ถูกนำไปออก PO แล้ว — ห้ามแก้ไข/ลบ */
        locked: outLines.some((l) => l.qtyOrdered > 0),
      };
    });
  }

  // ---------------------------------------------------------------- พิมพ์ (FastReport PR.frx)

  /** ข้อมูลพิมพ์ใบเสนอซื้อตามเงื่อนไข — ต้องระบุช่วงเลขที่หรือช่วงวันที่อย่างน้อย 1 อย่าง */
  async printData(q: PrPrintQuery, user: AuthUser) {
    const nbrFrom = q.nbrFrom?.trim();
    const nbrTo = q.nbrTo?.trim();
    if (!nbrFrom && !nbrTo && !q.dateFrom && !q.dateTo)
      throw new BadRequestException('กรุณาระบุช่วงเลขที่หรือช่วงวันที่ที่ต้องการพิมพ์');
    if (nbrFrom && nbrTo && nbrFrom.localeCompare(nbrTo, 'en', { sensitivity: 'base' }) > 0)
      throw new BadRequestException('เลขที่เริ่มต้นต้องไม่มากกว่าเลขที่สิ้นสุด');
    if (q.dateFrom && q.dateTo && q.dateFrom > q.dateTo)
      throw new BadRequestException('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');

    const and: Prisma.prq_mstrWhereInput[] = [];
    if (nbrFrom) and.push({ prq_nbr: { gte: nbrFrom } });
    if (nbrTo) and.push({ prq_nbr: { lte: nbrTo } });
    if (q.dateFrom) and.push({ prq_pr_date: { gte: fromDateStr(q.dateFrom)! } });
    if (q.dateTo) and.push({ prq_pr_date: { lte: fromDateStr(q.dateTo)! } });
    if (q.vend?.trim()) and.push({ prq_vend: q.vend.trim() });
    if (q.entity?.trim()) and.push({ prq_entity: q.entity.trim() });
    if (q.status) and.push({ prq_status: q.status });
    if (q.approve === 'Y') and.push({ prq_approve: true });
    if (q.approve === 'N') and.push({ OR: [{ prq_approve: false }, { prq_approve: null }] });
    and.push(divScope(user, q.div));

    const where = { AND: and };
    const total = await this.prisma.prq_mstr.count({ where });
    if (!total) throw new NotFoundException('ไม่พบใบเสนอซื้อตามเงื่อนไขที่เลือก');
    if (total > PRINT_LIMIT)
      throw new BadRequestException(
        `พบ ${total.toLocaleString()} ใบ — พิมพ์ได้ครั้งละไม่เกิน ${PRINT_LIMIT} ใบ กรุณาจำกัดเงื่อนไขให้แคบลง`,
      );
    if (q.check) return { count: total };
    return this.toReportTables(await this.getMany(where), user);
  }

  /** แปลงใบ PR เป็นตาราง Header / Lines ตามที่ PR.frx ใช้ (Lines เชื่อมกับ Header ด้วย Nbr) */
  toReportTables(docs: Awaited<ReturnType<PrService['getMany']>>, user: AuthUser) {
    return {
      Header: docs.map((d) => ({
        Nbr: d.nbr,
        PrDate: thaiDate(d.prDate),
        NeedDate: thaiDate(d.needDate),
        VendCode: d.vend,
        VendName: d.vendor?.name ?? '',
        VendAddress: d.vendor?.address ?? '',
        VendTel: d.vendor?.tel ?? '',
        Request: d.request,
        Entity: d.entity,
        EntityName: d.entityName,
        DivName: d.divCode ? `${d.divCode} ${d.divName}`.trim() : '',
        Remark: d.remark,
        Remark1: d.remark1,
        Status: d.status === 'C' ? 'ปิด' : 'เปิด',
        Approved: d.approved ? 'อนุมัติแล้ว' : 'รออนุมัติ',
        ApprovedBy: d.approvedBy,
        CreatedBy: d.createdBy,
        VatDesc: d.vatDesc,
        Subtotal: d.totals.subtotal,
        DiscPct: d.totals.discPct,
        DiscAmt: d.totals.discAmt,
        AfterDisc: d.totals.afterDisc,
        VatPct: d.totals.vatPct,
        VatAmt: d.totals.vatAmt,
        Net: d.totals.net,
        NetText: bahtText(d.totals.net),
        PrintedBy: user.displayName,
      })),
      Lines: docs.flatMap((d) =>
        d.lines.map((l) => ({
          Nbr: d.nbr,
          Line: l.line,
          Part: l.part.trim(),
          Desc: l.desc,
          Um: l.um,
          Qty: l.qty,
          Price: l.price,
          Amount: l.amount,
        })),
      ),
    };
  }

  // ---------------------------------------------------------------- create / update

  async create(dto: SavePrDto, user: AuthUser) {
    const data = await this.prepare(dto, user);
    const nbr = await this.prisma.$transaction(
      async (tx) => {
        const nbr = await this.nextNumber(tx);
        await this.writeDoc(tx, nbr, data, user, true);
        return nbr;
      },
      { isolationLevel: 'Serializable', timeout: 15000 },
    );
    return this.get(nbr, user);
  }

  async update(nbr: string, dto: SavePrDto, user: AuthUser) {
    const cur = await this.get(nbr, user);
    this.assertEditable(cur);
    const data = await this.prepare(dto, user);
    await this.prisma.$transaction(
      async (tx) => {
        await tx.prq_det.deleteMany({ where: { prqd_nbr: nbr } });
        await this.writeDoc(tx, nbr, data, user, false);
      },
      { timeout: 15000 },
    );
    return this.get(nbr, user);
  }

  async remove(nbr: string, user: AuthUser) {
    const cur = await this.get(nbr, user);
    this.assertEditable(cur);
    await this.prisma.$transaction([
      this.prisma.prq_det.deleteMany({ where: { prqd_nbr: nbr } }),
      this.prisma.prq_mstr.delete({ where: { prq_nbr: nbr } }),
    ]);
    return { ok: true };
  }

  // ---------------------------------------------------------------- workflow

  async setApprove(nbr: string, approve: boolean, user: AuthUser) {
    if (!canApprove(user))
      throw new ForbiddenException('คุณไม่มีสิทธิ์อนุมัติใบเสนอซื้อ');
    const cur = await this.get(nbr, user);
    if (cur.status === 'C')
      throw new BadRequestException('ใบเสนอซื้อนี้ปิดแล้ว');
    if (!approve && cur.locked)
      throw new BadRequestException(
        'ยกเลิกอนุมัติไม่ได้ เพราะมีรายการถูกนำไปออกใบสั่งซื้อแล้ว',
      );
    const now = nowBangkok();
    await this.prisma.prq_mstr.update({
      where: { prq_nbr: nbr },
      data: {
        prq_approve: approve,
        prq_user2: approve ? user.username.slice(0, 24) : null,
        prq_date1: now.date,
        prq_time1: now.time,
      },
    });
    return this.get(nbr, user);
  }

  async setStatus(nbr: string, status: 'O' | 'C', user: AuthUser) {
    if (!canApprove(user))
      throw new ForbiddenException('คุณไม่มีสิทธิ์ปิด/เปิดใบเสนอซื้อ');
    const cur = await this.get(nbr, user);
    if (status === 'O' && cur.lines.every((l) => l.qtyOrdered >= l.qty))
      throw new BadRequestException(
        'เปิดใบเสนอซื้อไม่ได้ เพราะทุกรายการถูกนำไปออกใบสั่งซื้อครบแล้ว',
      );
    const now = nowBangkok();
    await this.prisma.$transaction([
      this.prisma.prq_mstr.update({
        where: { prq_nbr: nbr },
        data: { prq_status: status, prq_date1: now.date, prq_time1: now.time },
      }),
      this.prisma.prq_det.updateMany({
        where: { prqd_nbr: nbr },
        data: { prqd_status: status },
      }),
    ]);
    return this.get(nbr, user);
  }

  // ---------------------------------------------------------------- helpers

  private assertEditable(cur: { approved: boolean; status: string; locked: boolean }) {
    if (cur.approved)
      throw new BadRequestException(
        'ใบเสนอซื้ออนุมัติแล้ว แก้ไข/ลบไม่ได้ (ต้องยกเลิกอนุมัติก่อน)',
      );
    if (cur.status === 'C') throw new BadRequestException('ใบเสนอซื้อนี้ปิดแล้ว');
    if (cur.locked)
      throw new BadRequestException('มีรายการถูกนำไปออกใบสั่งซื้อแล้ว แก้ไข/ลบไม่ได้');
  }

  /** ตรวจข้อมูลอ้างอิง + เตรียมค่าที่จะบันทึก */
  private async prepare(dto: SavePrDto, user: AuthUser) {
    const vend = dto.vend.trim();
    const entity = dto.entity.trim();
    const vatClass = dto.vatClass?.trim() || null;
    const [v, e, vt] = await Promise.all([
      this.prisma.vd_mstr.findUnique({ where: { vd_addr: vend } }),
      this.prisma.en_mstr.findUnique({ where: { en_entity: entity } }),
      vatClass
        ? this.prisma.vt_mstr.findUnique({ where: { vt_class: vatClass } })
        : null,
    ]);
    if (!v) throw new BadRequestException(`ไม่พบรหัสผู้ขาย ${vend}`);
    if (!e) throw new BadRequestException(`ไม่พบรหัสบริษัท ${entity}`);
    if (vatClass && !vt) throw new BadRequestException(`ไม่พบประเภทภาษี ${vatClass}`);
    // หน่วยงาน: ผู้ใช้ที่มีหน่วยงาน → บังคับเป็นของตัวเอง / ไม่มี → เลือกได้ (หรือเว้นว่าง)
    const divCode = user.divCode ?? (dto.divCode?.trim() || null);
    if (divCode && !user.divCode) {
      const d = await this.prisma.div_mstr.findUnique({ where: { div_code: divCode } });
      if (!d) throw new BadRequestException(`ไม่พบหน่วยงาน ${divCode}`);
    }
    if (dto.needDate && dto.needDate < dto.prDate)
      throw new BadRequestException('วันที่ต้องการรับต้องไม่น้อยกว่าวันที่เอกสาร');

    const taxable = dto.taxable ?? true;
    const totals = calcTotals(
      dto.lines,
      dto.discPct ?? 0,
      taxable && !!vt,
      num(vt?.vt_tax_pct),
    );
    return { dto: { ...dto, vend: v.vd_addr, entity: e.en_entity, vatClass, divCode }, taxable, totals };
  }

  private async writeDoc(
    tx: Tx,
    nbr: string,
    { dto, taxable, totals }: Awaited<ReturnType<PrService['prepare']>>,
    user: AuthUser,
    isNew: boolean,
  ) {
    const now = nowBangkok();
    const header = {
      prq_pr_date: fromDateStr(dto.prDate),
      prq_need_date: fromDateStr(dto.needDate ?? dto.prDate),
      prq_request: dto.request?.trim() || null,
      prq_vend: dto.vend,
      prq_remark: dto.remark?.trim() || null,
      prq_remark1: dto.remark1?.trim() || null,
      prq_entity: dto.entity,
      prq_user1: user.username.slice(0, 24),
      prq_date1: now.date,
      prq_time1: now.time,
      prq_disc_pct1: totals.discPct,
      prq_disc_amt1: totals.discAmt,
      prq_vat_amt: totals.vatAmt,
      prq_taxable: taxable,
      prq_vt_class: dto.vatClass,
      prq_divcode: dto.divCode,
    };
    if (isNew) {
      await tx.prq_mstr.create({
        data: { prq_nbr: nbr, prq_approve: false, prq_status: 'O', ...header },
      });
    } else {
      await tx.prq_mstr.update({ where: { prq_nbr: nbr }, data: header });
    }
    await tx.prq_det.createMany({
      data: dto.lines.map((l, i) => ({
        prqd_nbr: nbr,
        prqd_line: i + 1,
        prqd_part: l.part?.trimEnd() || null,
        prqd_desc: l.desc.trim(),
        prqd_um: l.um?.trim() || null,
        prqd_qty_ord: l.qty,
        prqd_qty_open: 0,
        prqd_est_price: l.price,
        prqd_status: 'O',
      })),
    });
  }

  /**
   * ออกเลขที่ PR จาก pur_ctrl (purc_pr_pre + เลขรัน 7 หลัก) เช่น PR0000013
   * ล็อกแถว pur_ctrl ด้วย UPDLOCK กันออกเลขซ้ำ และข้ามเลขที่มีอยู่แล้ว
   */
  private async nextNumber(tx: Tx): Promise<string> {
    const rows = await tx.$queryRaw<
      { id: bigint; purc_pr: number | null; purc_pr_pre: string | null }[]
    >`SELECT TOP 1 id, purc_pr, purc_pr_pre FROM pur_ctrl WITH (UPDLOCK, ROWLOCK) ORDER BY id`;
    const ctrl = rows[0];
    if (!ctrl) throw new ConflictException('ไม่พบข้อมูลควบคุม pur_ctrl');
    const prefix = trim(ctrl.purc_pr_pre) || 'PR';
    let n = ctrl.purc_pr && ctrl.purc_pr > 0 ? ctrl.purc_pr : 1;
    let nbr = '';
    for (let i = 0; i < 1000; i++, n++) {
      nbr = `${prefix}${String(n).padStart(7, '0')}`;
      const exists = await tx.prq_mstr.findUnique({
        where: { prq_nbr: nbr },
        select: { prq_nbr: true },
      });
      if (!exists) break;
    }
    await tx.pur_ctrl.update({
      where: { id: ctrl.id },
      data: { purc_pr: n + 1 },
    });
    return nbr;
  }
}
