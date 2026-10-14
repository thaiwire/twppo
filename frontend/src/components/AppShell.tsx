"use client";

import {
  ApartmentOutlined,
  BankOutlined,
  DatabaseOutlined,
  FileAddOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PrinterOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Layout, Menu, type MenuProps, Space } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useMe } from "./AuthContext";

const { Header, Sider, Content } = Layout;

/** กลุ่มเมนูใน sidebar (ย่อ-ขยายได้) */
type Section = "purchase" | "reports" | "master" | "admin";
const ALL_SECTIONS: Section[] = ["purchase", "reports", "master", "admin"];
const OPEN_KEY = "sidebar-open-sections";
const COLLAPSED_KEY = "sidebar-collapsed";

const sectionOf = (path: string): Section | null =>
  path.startsWith("/pr")
    ? "purchase"
    : path.startsWith("/reports")
      ? "reports"
      : path.startsWith("/master")
        ? "master"
        : path.startsWith("/admin")
          ? "admin"
          : null;

/** กลุ่มที่เปิดอยู่ — จำไว้ใน localStorage (ค่าเริ่มต้น: เปิดทุกกลุ่ม) */
function loadOpen(): Section[] {
  try {
    const v = JSON.parse(localStorage.getItem(OPEN_KEY) ?? "null");
    return Array.isArray(v) ? v.filter((k): k is Section => ALL_SECTIONS.includes(k)) : ALL_SECTIONS;
  } catch {
    return ALL_SECTIONS;
  }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const pathname = usePathname();
  const router = useRouter();
  const selected =
    pathname === "/pr/new"
      ? "/pr/new"
      : pathname.startsWith("/pr")
        ? "/pr"
        : ([
            "/master/vendors",
            "/master/items",
            "/master/entities",
            "/master/divisions",
            "/reports/pr",
            "/reports/vendors",
            "/reports/items",
            "/reports/entities",
            "/reports/divisions",
            "/admin/users",
          ].find((k) => pathname.startsWith(k)) ?? "");

  // กลุ่มที่เปิด: ผู้ใช้ย่อ-ขยายเองได้ และถ้าเข้าหน้าที่อยู่ในกลุ่มที่ย่อไว้ (เช่น จากลิงก์) จะขยายกลุ่มนั้นให้อัตโนมัติ
  const [openKeys, setOpenKeys] = useState<Section[]>(() => {
    const cur = sectionOf(pathname);
    const keys = loadOpen();
    return cur && !keys.includes(cur) ? [...keys, cur] : keys;
  });
  // ย่อ sidebar ทั้งแถบ (เหลือแต่ไอคอน) — จำไว้ใน localStorage
  // จอแคบ (< lg) ซ่อนทั้งแถบอัตโนมัติ กดปุ่มเพื่อเปิด (ไม่บันทึกค่า)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === "1");
  const [narrow, setNarrow] = useState(false);
  const toggleSider = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (!narrow) localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
  };
  const onBreakpoint = (broken: boolean) => {
    setNarrow(broken);
    setCollapsed(broken || localStorage.getItem(COLLAPSED_KEY) === "1");
  };

  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (narrow && !collapsed) setCollapsed(true); // จอแคบ: เลือกเมนูแล้วปิดแถบให้เห็นเนื้อหา
    const cur = sectionOf(pathname);
    if (cur && !openKeys.includes(cur)) setOpenKeys([...openKeys, cur]);
  }

  const onOpenChange = (keys: string[]) => {
    if (collapsed) return; // ตอนย่อ เมนูกลุ่มเป็น popup — ไม่ต้องจำสถานะ
    const next = keys.filter((k): k is Section => ALL_SECTIONS.includes(k as Section));
    setOpenKeys(next);
    localStorage.setItem(OPEN_KEY, JSON.stringify(next));
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "purchase",
      icon: <ShoppingCartOutlined />,
      label: "จัดซื้อ",
      children: [
        { key: "/pr", icon: <FileTextOutlined />, label: <Link href="/pr">ใบเสนอซื้อ (PR)</Link> },
        { key: "/pr/new", icon: <FileAddOutlined />, label: <Link href="/pr/new">สร้างใบเสนอซื้อ</Link> },
      ],
    },
    {
      key: "reports",
      icon: <FileSearchOutlined />,
      label: "รายงาน",
      children: [
        { key: "/reports/pr", icon: <PrinterOutlined />, label: <Link href="/reports/pr">พิมพ์ใบเสนอซื้อ</Link> },
        ...(me.canManageMaster
          ? [
              { key: "/reports/vendors", icon: <ShopOutlined />, label: <Link href="/reports/vendors">รายงานผู้ขาย</Link> },
              { key: "/reports/items", icon: <TagsOutlined />, label: <Link href="/reports/items">รายงานรหัสสินค้า</Link> },
              { key: "/reports/entities", icon: <BankOutlined />, label: <Link href="/reports/entities">รายงานบริษัท</Link> },
              { key: "/reports/divisions", icon: <ApartmentOutlined />, label: <Link href="/reports/divisions">รายงานหน่วยงาน</Link> },
            ]
          : []),
      ],
    },
    // ข้อมูลหลัก — เห็นเฉพาะ manager / admin (backend ตรวจสิทธิ์ซ้ำอีกชั้น)
    ...(me.canManageMaster
      ? [
          {
            key: "master",
            icon: <DatabaseOutlined />,
            label: "ข้อมูลหลัก",
            children: [
              { key: "/master/vendors", icon: <ShopOutlined />, label: <Link href="/master/vendors">ผู้ขาย</Link> },
              { key: "/master/items", icon: <TagsOutlined />, label: <Link href="/master/items">รหัสสินค้า</Link> },
              { key: "/master/entities", icon: <BankOutlined />, label: <Link href="/master/entities">บริษัท</Link> },
              { key: "/master/divisions", icon: <ApartmentOutlined />, label: <Link href="/master/divisions">หน่วยงาน</Link> },
            ],
          },
        ]
      : []),
    // Admin — เห็นเฉพาะ role admin
    ...(me.canManageUsers
      ? [
          {
            key: "admin",
            icon: <SafetyCertificateOutlined />,
            label: "Admin",
            children: [
              { key: "/admin/users", icon: <TeamOutlined />, label: <Link href="/admin/users">ผู้ใช้งาน</Link> },
            ],
          },
        ]
      : []),
  ];

  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingInline: "12px 24px" }}>
        <Space size={8}>
          <Button
            type="text"
            aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
            title={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleSider}
            style={{ color: "#fff", fontSize: 18, width: 44, height: 44 }}
          />
          <Link href="/pr" style={{ color: "#fff", fontSize: 20, fontWeight: 700, whiteSpace: "nowrap" }}>
            MTP Purchase Requisition
          </Link>
        </Space>
        <Dropdown
          menu={{
            items: [
              { key: "role", label: `สิทธิ์: ${me.role}${me.canApprove ? " (อนุมัติได้)" : ""}`, disabled: true },
              { key: "profile", icon: <SettingOutlined />, label: "แก้ไขโปรไฟล์ / เปลี่ยนรหัสผ่าน", onClick: () => router.push("/profile") },
              { type: "divider" },
              { key: "logout", icon: <LogoutOutlined />, label: "ออกจากระบบ", onClick: logout },
            ],
          }}
        >
          <Button type="text" style={{ color: "#fff" }}>
            <Space>
              <UserOutlined />
              {me.displayName}
            </Space>
          </Button>
        </Dropdown>
      </Header>
      <Layout>
        <Sider
          width={240}
          collapsible
          collapsed={collapsed}
          trigger={null}
          breakpoint="lg"
          onBreakpoint={onBreakpoint}
          collapsedWidth={narrow ? 0 : 64}
        >
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selected]}
            // ตอนย่อ ให้ antd จัดการ popup เอง / ตอนขยาย ใช้สถานะกลุ่มที่จำไว้
            {...(collapsed ? {} : { openKeys, onOpenChange })}
            items={menuItems}
            style={{ paddingTop: 12 }}
          />
        </Sider>
        <Content style={{ padding: 24, minWidth: 0 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
