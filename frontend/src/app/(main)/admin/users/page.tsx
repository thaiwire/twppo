"use client";

import { Tag } from "antd";
import { useMe } from "@/components/AuthContext";
import { useMaster } from "@/lib/master";
import { USERS } from "@/components/master/config";
import MasterList from "@/components/master/MasterList";
import { MODULE_CODES, MODULES } from "@/lib/modules";
import type { UserRecord } from "@/lib/types";

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
          placeholder: "ประเภทผู้ใช้",
          options: [
            { value: "admin", label: "admin" },
            { value: "user", label: "user" },
          ],
        },
        {
          key: "module",
          placeholder: "มีสิทธิ์ module",
          width: 180,
          options: MODULE_CODES.map((m) => ({ value: m, label: MODULES[m].name })),
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
          title: "สิทธิ์ module",
          dataIndex: "modules",
          width: 280,
          render: (_, r) =>
            r.role === "admin" ? (
              <Tag color="red">admin — ทุก module</Tag>
            ) : MODULE_CODES.some((m) => r.modules[m]) ? (
              MODULE_CODES.filter((m) => r.modules[m]).map((m) => (
                <Tag key={m} color={r.modules[m] === "manager" ? "blue" : undefined}>
                  {MODULES[m].name}: {r.modules[m]}
                </Tag>
              ))
            ) : (
              <span style={{ color: "#94a3b8" }}>ไม่มีสิทธิ์</span>
            ),
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
