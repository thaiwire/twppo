import { adminMenu } from "./admin/menu";
import { baseMenu } from "./base/menu";
import type { MenuItem } from "./menu";
import { prMenu } from "./pr/menu";

/**
 * เมนูของทุก module — เพิ่ม module ใหม่: สร้าง modules/<code>/menu.tsx แล้วเพิ่มที่นี่ 1 บรรทัด
 * ลำดับรายการภายในกลุ่ม = ลำดับใน array นี้
 */
export const MENU_ITEMS: MenuItem[] = [...prMenu, ...baseMenu, ...adminMenu];

export { GROUPS } from "./groups";
export { matchItem, type GroupKey, type MenuItem } from "./menu";
