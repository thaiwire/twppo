import type { ModuleCode, ModuleLevel } from "@/lib/modules";

/**
 * กลุ่มเมนูใน sidebar — ลำดับใน GROUPS = ลำดับที่แสดง
 * กลุ่มคือ "หมวดของหน้าจอ" ไม่จำเป็นต้องตรงกับ module (เช่น กลุ่ม "รายงาน" มีรายงานของหลาย module)
 */
export type GroupKey = "purchase" | "sales" | "inventory" | "accounting" | "reports" | "base" | "admin";

/** รายการเมนู 1 รายการ — แต่ละ module ประกาศของตัวเองใน modules/<code>/menu.tsx */
export interface MenuItem {
  group: GroupKey;
  /** path ของหน้า — ใช้เป็น key และไฮไลต์เมนู (หน้าย่อยใต้ path นี้ เช่น /pr/view ก็ไฮไลต์รายการนี้) */
  path: string;
  label: string;
  icon: React.ReactNode;
  /** ต้องมีสิทธิ์ module นี้ (ระดับ level ขึ้นไป — ไม่ระบุ = user) จึงเห็นเมนู */
  module?: ModuleCode;
  level?: ModuleLevel;
  /** เห็นเฉพาะ admin (ใช้แทน module) */
  admin?: boolean;
}

/** รายการเมนูที่ตรงกับ path มากที่สุด (prefix ยาวสุด) — ใช้ไฮไลต์เมนูและหากลุ่มที่ต้องขยาย */
export function matchItem(items: MenuItem[], pathname: string): MenuItem | undefined {
  return items
    .filter((i) => pathname === i.path || pathname.startsWith(`${i.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];
}
