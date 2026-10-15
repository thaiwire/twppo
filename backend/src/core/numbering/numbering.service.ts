import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { nowBangkok } from '../common/util.js';

type Tx = Prisma.TransactionClient;

export interface NumberFormat {
  /** ตัวอักษรนำหน้า เช่น 'SO' */
  prefix: string;
  /** แยกเลขรันตามงวด: month = SO2610xxxx, year = SO26xxxxxx, none = SOxxxxxxx */
  period: 'month' | 'year' | 'none';
  /** จำนวนหลักของเลขรัน */
  digits: number;
}

/**
 * ออกเลขที่เอกสารจาก app_doc_seq — ใช้กับ **เอกสารที่มีแต่ในเว็บ**
 * (เอกสารที่โปรแกรมเดิมยังออกอยู่ ต้องใช้ตัวนับของโปรแกรมเดิม เช่น PR ใช้ pur_ctrl — ไม่อย่างนั้นเลขชนกัน)
 *
 *   const nbr = await this.numbering.next(tx, 'SO', { prefix: 'SO', period: 'month', digits: 4 },
 *     (n) => tx.so_mstr.findUnique({ where: { so_doc_nbr: n } }).then(Boolean));
 *
 * ต้องเรียก **ภายใน transaction ของเอกสาร** — ถ้าบันทึกเอกสารไม่สำเร็จ ตัวนับจะถูกย้อนกลับด้วย (ไม่มีเลขหาย)
 */
@Injectable()
export class NumberingService {
  async next(
    tx: Tx,
    docType: string,
    fmt: NumberFormat,
    /** เลขนี้มีเอกสารอยู่แล้วหรือไม่ (เช่น เคยออกด้วยมือ/ระบบอื่น) — ถ้ามี จะข้ามไปเลขถัดไป */
    exists?: (nbr: string) => Promise<boolean>,
  ): Promise<string> {
    const ym = nowBangkok().date.toISOString().slice(2, 7).replace('-', ''); // yyMM เวลาไทย
    const period = fmt.period === 'month' ? ym : fmt.period === 'year' ? ym.slice(0, 2) : '';
    const max = 10 ** fmt.digits - 1;
    for (let i = 0; i < 1000; i++) {
      // MERGE + HOLDLOCK = เพิ่ม/สร้างตัวนับแบบ atomic — ผู้ใช้หลายคนพร้อมกันได้เลขไม่ซ้ำ
      const rows = await tx.$queryRaw<{ last_no: number }[]>`
        MERGE dbo.app_doc_seq WITH (HOLDLOCK) AS t
        USING (SELECT ${docType} AS doc_type, ${period} AS period) AS s
          ON t.doc_type = s.doc_type AND t.period = s.period
        WHEN MATCHED THEN UPDATE SET last_no = t.last_no + 1, updated_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN INSERT (doc_type, period, last_no) VALUES (s.doc_type, s.period, 1)
        OUTPUT inserted.last_no;`;
      const n = Number(rows[0].last_no);
      if (n > max)
        throw new BadRequestException(`เลขที่เอกสาร ${docType} ของงวดนี้เต็มแล้ว (${max})`);
      const nbr = `${fmt.prefix}${period}${String(n).padStart(fmt.digits, '0')}`;
      if (!exists || !(await exists(nbr))) return nbr;
    }
    throw new BadRequestException(`ออกเลขที่เอกสาร ${docType} ไม่สำเร็จ`);
  }
}
