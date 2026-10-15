import {
  DatabaseOutlined,
  DollarOutlined,
  FileSearchOutlined,
  InboxOutlined,
  SafetyCertificateOutlined,
  ShoppingCartOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import type { GroupKey } from "./menu";

/** กลุ่มเมนูทั้งหมด (ลำดับ = ลำดับใน sidebar) — กลุ่มที่ผู้ใช้ไม่เห็นรายการไหนเลยจะถูกซ่อนเอง */
export const GROUPS: { key: GroupKey; label: string; icon: React.ReactNode }[] = [
  { key: "purchase", label: "จัดซื้อ", icon: <ShoppingCartOutlined /> },
  { key: "sales", label: "ขาย", icon: <DollarOutlined /> },
  { key: "inventory", label: "คลังสินค้า", icon: <InboxOutlined /> },
  { key: "accounting", label: "บัญชี", icon: <WalletOutlined /> },
  { key: "reports", label: "รายงาน", icon: <FileSearchOutlined /> },
  { key: "base", label: "ข้อมูลหลัก", icon: <DatabaseOutlined /> },
  { key: "admin", label: "Admin", icon: <SafetyCertificateOutlined /> },
];
