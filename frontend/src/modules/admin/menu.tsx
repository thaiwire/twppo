import { HistoryOutlined, TeamOutlined } from "@ant-design/icons";
import type { MenuItem } from "../menu";

/** เมนู Admin — เฉพาะ role admin */
export const adminMenu: MenuItem[] = [
  { group: "admin", path: "/admin/users", label: "ผู้ใช้งาน", icon: <TeamOutlined />, admin: true },
  { group: "admin", path: "/admin/audit", label: "ประวัติการแก้ไข", icon: <HistoryOutlined />, admin: true },
];
