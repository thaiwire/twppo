const DIGITS = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const UNITS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

function readGroup(n: number, hasHigher: boolean): string {
  // อ่านเลขไม่เกิน 6 หลัก (hasHigher = มีหลักล้านนำหน้า → หลักหน่วย 1 อ่าน "เอ็ด")
  const s = String(n);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const d = Number(s[i]);
    const pos = s.length - i - 1;
    if (d === 0) continue;
    if (pos === 1 && d === 1) out += 'สิบ';
    else if (pos === 1 && d === 2) out += 'ยี่สิบ';
    else if (pos === 0 && d === 1 && (s.length > 1 || hasHigher)) out += 'เอ็ด';
    else out += DIGITS[d] + UNITS[pos];
  }
  return out;
}

function readInt(n: number): string {
  if (n === 0) return 'ศูนย์';
  let out = '';
  const millions = Math.floor(n / 1_000_000);
  const rest = n % 1_000_000;
  if (millions > 0) out += readInt(millions) + 'ล้าน';
  if (rest > 0) out += readGroup(rest, millions > 0);
  return out;
}

/** แปลงจำนวนเงินเป็นตัวอักษรไทย เช่น 1250.50 → หนึ่งพันสองร้อยห้าสิบบาทห้าสิบสตางค์ */
export function bahtText(amount: number): string {
  const neg = amount < 0;
  const satangTotal = Math.round(Math.abs(amount) * 100);
  const baht = Math.floor(satangTotal / 100);
  const satang = satangTotal % 100;
  let out = '';
  if (baht > 0) out += readInt(baht) + 'บาท';
  if (satang > 0) out += readInt(satang) + 'สตางค์';
  else out += (baht > 0 ? '' : 'ศูนย์บาท') + 'ถ้วน';
  return (neg ? 'ลบ' : '') + out;
}
