export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  role: string;
  /** หน่วยงานของผู้ใช้ (null = ไม่จำกัด เห็น PR ทุกหน่วยงาน) — โหลดจากฐานข้อมูลทุก request */
  divCode?: string | null;
}

export const AUTH_COOKIE = 'pr_token';

/** role ที่อนุมัติ PR ได้ (ตั้งค่าใน .env: APPROVER_ROLES=admin,manager) */
export function canApprove(user: AuthUser): boolean {
  const roles = (process.env.APPROVER_ROLES ?? 'admin,manager')
    .split(',')
    .map((r) => r.trim().toLowerCase());
  return roles.includes(user.role.toLowerCase());
}

/** role ที่จัดการข้อมูลหลัก (ผู้ขาย/สินค้า/บริษัท) ได้ — ตั้งค่าใน .env: MASTER_ROLES=admin,manager */
export function canManageMaster(user: AuthUser): boolean {
  const roles = (process.env.MASTER_ROLES ?? 'admin,manager')
    .split(',')
    .map((r) => r.trim().toLowerCase());
  return roles.includes(user.role.toLowerCase());
}

/** จัดการผู้ใช้ (เมนู Admin) — เฉพาะ role admin เท่านั้น */
export function canManageUsers(user: AuthUser): boolean {
  return user.role.trim().toLowerCase() === 'admin';
}
