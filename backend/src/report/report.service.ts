import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

export type ReportTables = Record<string, Record<string, unknown>[]>;

/**
 * เรียก FastReport service (โปรเจกต์ report/ — .NET + FastReport.OpenSource)
 * ส่งข้อมูลเป็นตาราง JSON ไป แล้วรับไฟล์ PDF กลับมา
 */
@Injectable()
export class ReportService {
  private readonly log = new Logger(ReportService.name);
  private readonly baseUrl = process.env.REPORT_URL ?? 'http://localhost:5100';

  /**
   * @param opts dpi/quality ของภาพในหน้า PDF — ค่าต่ำ = ไฟล์เล็ก (รายงานรายการยาวๆ ใช้ ~130/75, เอกสารใช้ค่าเริ่มต้น 200/90)
   */
  async renderPdf(
    template: string,
    tables: ReportTables,
    opts: { dpi?: number; quality?: number } = {},
  ): Promise<Buffer> {
    const qs = new URLSearchParams();
    if (opts.dpi) qs.set('dpi', String(opts.dpi));
    if (opts.quality) qs.set('quality', String(opts.quality));
    let res: Response;
    try {
      res = await fetch(
        `${this.baseUrl}/render/${encodeURIComponent(template)}${qs.size ? `?${qs}` : ''}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tables }),
          signal: AbortSignal.timeout(60_000),
        },
      );
    } catch (err) {
      this.log.error(`Report service unreachable: ${String(err)}`);
      throw new ServiceUnavailableException(
        'ไม่สามารถเชื่อมต่อ Report service (FastReport) ได้',
      );
    }
    if (!res.ok) {
      const msg = await res.text();
      this.log.error(`Report ${template} failed: ${res.status} ${msg}`);
      throw new ServiceUnavailableException(`สร้างรายงานไม่สำเร็จ: ${msg}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
}
