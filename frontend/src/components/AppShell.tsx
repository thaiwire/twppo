"use client";

import {
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Layout, Menu, type MenuProps, Space } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { can, homeOf, MODULE_CODES, MODULES } from "@/lib/modules";
import { GROUPS, MENU_ITEMS, matchItem, type GroupKey, type MenuItem } from "@/modules";
import { useMe } from "./AuthContext";

const { Header, Sider, Content } = Layout;

/** กลุ่มเมนูใน sidebar (ย่อ-ขยายได้) — รายการเมนูมาจาก modules/<code>/menu.tsx */
const ALL_GROUPS = GROUPS.map((g) => g.key);
const OPEN_KEY = "sidebar-open-sections";
const COLLAPSED_KEY = "sidebar-collapsed";

/** กลุ่มของหน้าปัจจุบัน — ใช้ขยายกลุ่มให้อัตโนมัติ */
const groupOf = (path: string): GroupKey | undefined => matchItem(MENU_ITEMS, path)?.group;

/** กลุ่มที่เปิดอยู่ — จำไว้ใน localStorage (ค่าเริ่มต้น: เปิดทุกกลุ่ม) */
function loadOpen(): GroupKey[] {
  try {
    const v = JSON.parse(localStorage.getItem(OPEN_KEY) ?? "null");
    return Array.isArray(v) ? v.filter((k): k is GroupKey => ALL_GROUPS.includes(k)) : ALL_GROUPS;
  } catch {
    return ALL_GROUPS;
  }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const pathname = usePathname();
  const router = useRouter();

  // เมนูที่ผู้ใช้มีสิทธิ์ (backend ตรวจสิทธิ์ซ้ำอีกชั้น) — กลุ่มที่ไม่เหลือรายการจะถูกซ่อน
  const allowed = (i: MenuItem) => (i.admin ? me.isAdmin : !i.module || can(me, i.module, i.level));
  const visible = MENU_ITEMS.filter(allowed);
  const selected = matchItem(visible, pathname)?.path ?? "";

  // กลุ่มที่เปิด: ผู้ใช้ย่อ-ขยายเองได้ และถ้าเข้าหน้าที่อยู่ในกลุ่มที่ย่อไว้ (เช่น จากลิงก์) จะขยายกลุ่มนั้นให้อัตโนมัติ
  const [openKeys, setOpenKeys] = useState<GroupKey[]>(() => {
    const cur = groupOf(pathname);
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
    const cur = groupOf(pathname);
    if (cur && !openKeys.includes(cur)) setOpenKeys([...openKeys, cur]);
  }

  const onOpenChange = (keys: string[]) => {
    if (collapsed) return; // ตอนย่อ เมนูกลุ่มเป็น popup — ไม่ต้องจำสถานะ
    const next = keys.filter((k): k is GroupKey => ALL_GROUPS.includes(k as GroupKey));
    setOpenKeys(next);
    localStorage.setItem(OPEN_KEY, JSON.stringify(next));
  };

  const menuItems: MenuProps["items"] = GROUPS.map((g) => ({
    key: g.key,
    icon: g.icon,
    label: g.label,
    children: visible
      .filter((i) => i.group === g.key)
      .map((i) => ({ key: i.path, icon: i.icon, label: <Link href={i.path}>{i.label}</Link> })),
  })).filter((g) => g.children.length);
  const home = homeOf(me);
  const access = me.isAdmin
    ? "admin (ทุก module)"
    : MODULE_CODES.filter((m) => me.modules[m])
        .map((m) => `${MODULES[m].name}: ${me.modules[m]}`)
        .join(", ") || "ยังไม่ได้รับสิทธิ์ module";

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
          <Link href={home} style={{ color: "#fff", fontSize: 20, fontWeight: 700, whiteSpace: "nowrap" }}>
            MTP Purchase Requisition
          </Link>
        </Space>
        <Dropdown
          menu={{
            items: [
              { key: "role", label: `สิทธิ์: ${access}`, disabled: true },
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
