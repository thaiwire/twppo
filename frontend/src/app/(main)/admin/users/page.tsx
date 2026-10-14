"use client";

import { Tag } from "antd";
import { useMe } from "@/components/AuthContext";
import { useMaster } from "@/lib/master";
import { USERS } from "@/components/master/config";
import MasterList from "@/components/master/MasterList";
import type { UserRecord, UserRole } from "@/lib/types";

const ROLE_TAG: Record<UserRole, { color: string; label: string }> = {
  admin: { color: "red", label: "admin" },
  manager: { color: "blue", label: "manager" },
  user: { color: "default", label: "user" },
};

export default function UsersPage() {
  const me = useMe();
  const master = useMaster();
  return (
    <MasterList<UserRecord>
      {...USERS}
      searchPlaceholder="ชื่อผู้ใช้ / ชื่อที่แสดง"
      statusFilter
      selectFilters={[
        {
          key: "role",
          placeholder: "ระดับผู้ใช้",
          options: [
            { value: "admin", label: "admin" },
            { value: "manager", label: "manager" },
            { value: "user", label: "user" },
          ],
        },
        {
          key: "div",
          placeholder: "หน่วยงาน",
          width: 200,
          options: [
            { value: "-", label: "(ไม่ระบุหน่วยงาน)" },
            ...(master?.divisions ?? []).map((d) => ({ value: d.code, label: `${d.code}  ${d.name}` })),
          ],
        },
      ]}
      deleteBlocked={(r) =>
        r.username.toLowerCase() === me.username.toLowerCase() ? "ลบบัญชีของตัวเองไม่ได้" : undefined
      }
      columns={[
        {
          title: "ชื่อผู้ใช้",
          dataIndex: "username",
          width: 180,
          fixed: "left",
          render: (v: string) => (
            <span>
              <b>{v}</b>
              {v.toLowerCase() === me.username.toLowerCase() && <Tag style={{ marginLeft: 8 }}>คุณ</Tag>}
            </span>
          ),
        },
        { title: "ชื่อที่แสดง", dataIndex: "displayName", ellipsis: true },
        {
          title: "ระดับ",
          dataIndex: "role",
          width: 120,
          render: (v: UserRole) => <Tag color={ROLE_TAG[v]?.color}>{ROLE_TAG[v]?.label ?? v}</Tag>,
        },
        {
          title: "หน่วยงาน",
          dataIndex: "divCode",
          width: 200,
          ellipsis: true,
          render: (v: string, r) => (v ? `${v}  ${r.divName}` : <span style={{ color: "#94a3b8" }}>ทุกหน่วยงาน</span>),
        },
        {
          title: "สถานะ",
          dataIndex: "active",
          width: 110,
          render: (v: boolean) => (v ? <Tag color="green">ใช้งาน</Tag> : <Tag>ไม่ใช้งาน</Tag>),
        },
        { title: "สร้างเมื่อ", dataIndex: "createdAt", width: 160 },
        { title: "แก้ไขล่าสุด", dataIndex: "updatedAt", width: 160 },
      ]}
    />
  );
}
