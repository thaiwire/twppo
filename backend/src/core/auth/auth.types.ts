import type { ModuleAccess } from './modules.js';

/** ข้อมูลที่ฝังใน JWT (ไม่มีสิทธิ์ module — โหลดจากฐานข้อมูลทุก request) */
export interface AuthClaims {
  id: number;
  username: string;
  displayName: string;
  role: string;
  divCode?: string | null;
}

export interface AuthUser extends AuthClaims {
  /** หน่วยงานของผู้ใช้ (null = ไม่จำกัด เห็น PR ทุกหน่วยงาน) — โหลดจากฐานข้อมูลทุก request */
  divCode?: string | null;
  /** สิทธิ์ใช้งาน module (app_user_module) — ใช้ผ่าน hasModule() ใน modules.ts */
  modules: ModuleAccess;
}

export const AUTH_COOKIE = 'pr_token';
