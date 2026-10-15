import type { AuthUser } from './auth.types.js';

/**
 * module ของระบบ — เพิ่ม module ใหม่ที่นี่บรรทัดเดียว แล้วใช้ @RequireModule('<code>') ที่ controller
 * (ต้องเพิ่มใน frontend/src/lib/modules.ts ด้วย ให้หน้าตั้งสิทธิ์ผู้ใช้และเมนูรู้จัก)
 */
export const MODULES = {
  pr: {
    name: 'ใบเสนอซื้อ (PR)',
    user: 'ดู / สร้าง / แก้ไข / ลบ / พิมพ์ PR',
    manager: '+ อนุมัติ / ยกเลิกอนุมัติ / ปิด-เปิด PR',
  },
  base: {
    name: 'ข้อมูลหลัก',
    user: 'ดูข้อมูลหลัก และพิมพ์รายงานข้อมูลหลัก',
    manager: '+ เพิ่ม / แก้ไข / ลบ ข้อมูลหลัก',
  },
} as const;

export type ModuleCode = keyof typeof MODULES;
export const MODULE_CODES = Object.keys(MODULES) as ModuleCode[];

export const MODULE_LEVELS = ['user', 'manager'] as const;
export type ModuleLevel = (typeof MODULE_LEVELS)[number];

/** สิทธิ์ module ของผู้ใช้ เช่น { pr: 'manager', base: 'user' } — ไม่มี key = ใช้ module นั้นไม่ได้ */
export type ModuleAccess = Partial<Record<ModuleCode, ModuleLevel>>;

export const isAdmin = (u: AuthUser) => u.role.trim().toLowerCase() === 'admin';

/** ระดับที่ผู้ใช้มีใน module (admin = manager ทุก module) — undefined = ไม่มีสิทธิ์ */
export function moduleLevel(u: AuthUser, m: ModuleCode): ModuleLevel | undefined {
  return isAdmin(u) ? 'manager' : u.modules[m];
}

/** มีสิทธิ์ใน module ระดับ `level` ขึ้นไปหรือไม่ (manager ทำได้ทุกอย่างที่ user ทำได้) */
export function hasModule(u: AuthUser, m: ModuleCode, level: ModuleLevel = 'user'): boolean {
  const have = moduleLevel(u, m);
  return !!have && MODULE_LEVELS.indexOf(have) >= MODULE_LEVELS.indexOf(level);
}

/** สิทธิ์ทั้งหมดที่มีผลจริง (admin ได้ manager ทุก module) — ส่งให้ frontend ใน /auth/me */
export function effectiveModules(u: AuthUser): ModuleAccess {
  return Object.fromEntries(
    MODULE_CODES.flatMap((m) => {
      const l = moduleLevel(u, m);
      return l ? [[m, l]] : [];
    }),
  );
}

/** แปลงแถวจาก app_user_module (ข้าม module ที่ไม่รู้จัก/ระดับไม่ถูกต้อง) */
export function toModuleAccess(rows: { module_code: string; level: string }[]): ModuleAccess {
  const out: ModuleAccess = {};
  for (const r of rows) {
    const m = r.module_code.trim().toLowerCase() as ModuleCode;
    const l = r.level.trim().toLowerCase() as ModuleLevel;
    if (m in MODULES && MODULE_LEVELS.includes(l)) out[m] = l;
  }
  return out;
}
