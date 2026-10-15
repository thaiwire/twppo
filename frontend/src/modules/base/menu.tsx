import { ApartmentOutlined, BankOutlined, ShopOutlined, TagsOutlined } from "@ant-design/icons";
import type { MenuItem } from "../menu";

/** เมนูของ module base (ข้อมูลหลัก) — URL ยังเป็น /master/* เหมือนเดิม */
export const baseMenu: MenuItem[] = [
  { group: "base", path: "/master/vendors", label: "ผู้ขาย", icon: <ShopOutlined />, module: "base" },
  { group: "base", path: "/master/items", label: "รหัสสินค้า", icon: <TagsOutlined />, module: "base" },
  { group: "base", path: "/master/entities", label: "บริษัท", icon: <BankOutlined />, module: "base" },
  { group: "base", path: "/master/divisions", label: "หน่วยงาน", icon: <ApartmentOutlined />, module: "base" },
  { group: "reports", path: "/reports/vendors", label: "รายงานผู้ขาย", icon: <ShopOutlined />, module: "base" },
  { group: "reports", path: "/reports/items", label: "รายงานรหัสสินค้า", icon: <TagsOutlined />, module: "base" },
  { group: "reports", path: "/reports/entities", label: "รายงานบริษัท", icon: <BankOutlined />, module: "base" },
  { group: "reports", path: "/reports/divisions", label: "รายงานหน่วยงาน", icon: <ApartmentOutlined />, module: "base" },
];
