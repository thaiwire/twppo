import { FileAddOutlined, FileTextOutlined, PrinterOutlined } from "@ant-design/icons";
import type { MenuItem } from "../menu";

/** เมนูของ module pr (ใบเสนอซื้อ) */
export const prMenu: MenuItem[] = [
  { group: "purchase", path: "/pr", label: "ใบเสนอซื้อ (PR)", icon: <FileTextOutlined />, module: "pr" },
  { group: "purchase", path: "/pr/new", label: "สร้างใบเสนอซื้อ", icon: <FileAddOutlined />, module: "pr" },
  { group: "reports", path: "/reports/pr", label: "พิมพ์ใบเสนอซื้อ", icon: <PrinterOutlined />, module: "pr" },
];
