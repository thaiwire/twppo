import type { Me } from "./types";

/**
 * module ของระบบ — ต้องตรงกับ backend/src/auth/modules.ts
 * เพิ่ม module ใหม่: เพิ่มที่นี่ + backend แล้วใช้ <RequireModule module="..."> ที่ layout และใส่ module ให้เมนูใน AppShell
 */
export const MODULES = {
  pr: {
    name: "ใบเสนอซื้อ (PR)",
    /** หน้าแรกของ module */
    home: "/pr",
    user: "ดู / สร้าง / แก้ไข / ลบ / พิมพ์ PR",
    manager: "+ อนุมัติ / ยกเลิกอนุมัติ / ปิด-เปิด PR",
  },
  base: {
    name: "ข้อมูลหลัก",
    home: "/master/vendors",
    user: "ดูข้อมูลหลัก และพิมพ์รายงานข้อมูลหลัก",
    manager: "+ เพิ่ม / แก้ไข / ลบ ข้อมูลหลัก",
  },
} as const;

export type ModuleCode = keyof typeof MODULES;
export const MODULE_CODES = Object.keys(MODULES) as ModuleCode[];
export type ModuleLevel = "user" | "manager";
export type ModuleAccess = Partial<Record<ModuleCode, ModuleLevel>>;

/** มีสิทธิ์ module ระดับ `level` ขึ้นไปหรือไม่ (me.modules จาก backend รวมสิทธิ์ admin ให้แล้ว) */
export function can(me: Me, module: ModuleCode, level: ModuleLevel = "user"): boolean {
  const have = me.modules[module];
  return !!have && (level === "user" || have === "manager");
}

/** หน้าแรกของ module แรกที่ผู้ใช้มีสิทธิ์ (ไม่มีเลย = หน้าโปรไฟล์) */
export function homeOf(me: Me): string {
  const m = MODULE_CODES.find((c) => can(me, c));
  return m ? MODULES[m].home : "/profile";
}
