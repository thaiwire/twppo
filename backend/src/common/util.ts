/** ตัดช่องว่างท้ายข้อความ (คอลัมน์ nchar ในระบบเดิมเติม space ไว้) */
export const trim = (v: string | null | undefined): string => (v ?? '').trim();

export const num = (v: { toString(): string } | number | null | undefined): number =>
  v == null ? 0 : Number(v);

/** แปลง Date (คอลัมน์ @db.Date ซึ่ง Prisma คืนค่าเป็น UTC เที่ยงคืน) เป็น 'YYYY-MM-DD' */
export const toDateStr = (d: Date | null | undefined): string | null =>
  d ? d.toISOString().slice(0, 10) : null;

/** แปลง 'YYYY-MM-DD' เป็น Date สำหรับคอลัมน์ @db.Date */
export const fromDateStr = (s: string | null | undefined): Date | null =>
  s ? new Date(`${s.slice(0, 10)}T00:00:00.000Z`) : null;

/** วันที่/เวลาปัจจุบันตามเวลาไทย สำหรับคอลัมน์ *_date1 / *_time1 */
export function nowBangkok(): { date: Date; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? '00';
  return {
    date: fromDateStr(`${p('year')}-${p('month')}-${p('day')}`)!,
    time: `${p('hour')}:${p('minute')}:${p('second')}`,
  };
}

export const round2 = (n: number): number => Math.round(n * 100) / 100;
