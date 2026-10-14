import dayjs from "dayjs";

export const fmtNum = (n: number | null | undefined, digits = 2) =>
  (n ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const fmtDate = (s: string | null | undefined) =>
  s ? dayjs(s).format("DD/MM/YYYY") : "";

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** สูตรเดียวกับ backend (calcTotals) — ใช้แสดงยอดระหว่างกรอกฟอร์ม */
export function calcTotals(
  lines: { qty?: number | null; price?: number | null }[],
  discPct: number,
  taxable: boolean,
  vatPct: number,
) {
  const subtotal = round2(
    lines.reduce((s, l) => s + round2((l?.qty ?? 0) * (l?.price ?? 0)), 0),
  );
  const discAmt = round2((subtotal * discPct) / 100);
  const afterDisc = round2(subtotal - discAmt);
  const vatAmt = taxable ? round2((afterDisc * vatPct) / 100) : 0;
  return { subtotal, discAmt, afterDisc, vatAmt, net: round2(afterDisc + vatAmt) };
}
