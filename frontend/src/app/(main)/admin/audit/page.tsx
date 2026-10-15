"use client";

import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Card, DatePicker, Flex, Input, Select, Table, Tag, Typography } from "antd";
import type { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { api, toQuery } from "@/lib/api";
import { MODULE_CODES, MODULES } from "@/lib/modules";
import type { Paged } from "@/lib/types";

interface AuditRow {
  id: number;
  at: string;
  username: string;
  module: string;
  docType: string;
  docNo: string;
  action: string;
  detail: string | null;
}

const ACTION: Record<string, { label: string; color?: string }> = {
  create: { label: "เพิ่ม", color: "green" },
  update: { label: "แก้ไข", color: "blue" },
  delete: { label: "ลบ", color: "red" },
  approve: { label: "อนุมัติ", color: "cyan" },
  unapprove: { label: "ยกเลิกอนุมัติ", color: "orange" },
  close: { label: "ปิด" },
  reopen: { label: "เปิดอีกครั้ง", color: "purple" },
};

/** ชื่อ module สำหรับแสดง (admin ไม่อยู่ใน MODULES) */
const moduleName = (m: string) => (m === "admin" ? "Admin" : (MODULES[m as keyof typeof MODULES]?.name ?? m));

/** ประวัติการแก้ไขข้อมูล (app_audit) — ใคร ทำอะไร กับเอกสารไหน เมื่อไร */
export default function AuditPage() {
  const [draft, setDraft] = useState("");
  const [filters, setFilters] = useState<{
    q?: string;
    module?: string;
    action?: string;
    range?: [Dayjs | null, Dayjs | null] | null;
  }>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [nonce, setNonce] = useState(0);
  const [data, setData] = useState<{ key: string; result: Paged<AuditRow> }>();

  const { range, ...rest } = filters;
  const query = toQuery({
    ...rest,
    dateFrom: range?.[0]?.format("YYYY-MM-DD"),
    dateTo: range?.[1]?.format("YYYY-MM-DD"),
    page,
    pageSize,
  });
  const key = `${query}#${nonce}`;
  useEffect(() => {
    let alive = true;
    api<Paged<AuditRow>>(`/admin/audit${query}`).then((result) => alive && setData({ key, result }));
    return () => {
      alive = false;
    };
  }, [query, key]);

  const set = (patch: Partial<typeof filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  return (
    <Card title={<Typography.Title level={4} style={{ margin: 0 }}>ประวัติการแก้ไข</Typography.Title>}>
      <Flex wrap gap={8} style={{ marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="เลขที่เอกสาร / รหัส / ผู้ใช้"
          allowClear
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPressEnter={() => set({ q: draft.trim() || undefined })}
          style={{ width: 260 }}
        />
        <Select
          allowClear
          placeholder="module"
          style={{ width: 180 }}
          value={filters.module}
          onChange={(v) => set({ module: v })}
          options={[...MODULE_CODES, "admin"].map((m) => ({ value: m, label: moduleName(m) }))}
        />
        <Select
          allowClear
          placeholder="การกระทำ"
          style={{ width: 150 }}
          value={filters.action}
          onChange={(v) => set({ action: v })}
          options={Object.entries(ACTION).map(([value, a]) => ({ value, label: a.label }))}
        />
        <DatePicker.RangePicker format="DD/MM/YYYY" value={filters.range} onChange={(v) => set({ range: v })} />
        <Button type="primary" icon={<SearchOutlined />} onClick={() => set({ q: draft.trim() || undefined })}>
          ค้นหา
        </Button>
        <Button icon={<ReloadOutlined />} onClick={() => setNonce((n) => n + 1)} />
      </Flex>
      <Table<AuditRow>
        rowKey="id"
        size="small"
        loading={data?.key !== key}
        dataSource={data?.result.items}
        scroll={{ x: 900 }}
        pagination={{
          current: page,
          pageSize,
          total: data?.result.total,
          showSizeChanger: true,
          showTotal: (t) => `ทั้งหมด ${t.toLocaleString()} รายการ`,
          onChange: (p, s) => (setPage(p), setPageSize(s)),
        }}
        expandable={{
          rowExpandable: (r) => !!r.detail,
          expandedRowRender: (r) => (
            <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(JSON.parse(r.detail!), null, 2)}
            </pre>
          ),
        }}
        columns={[
          { title: "วันเวลา", dataIndex: "at", width: 170 },
          { title: "ผู้ใช้", dataIndex: "username", width: 130 },
          { title: "module", dataIndex: "module", width: 160, render: (v: string) => moduleName(v) },
          { title: "ประเภท", dataIndex: "docType", width: 100 },
          { title: "เลขที่ / รหัส", dataIndex: "docNo", width: 160, render: (v: string) => <b>{v}</b> },
          {
            title: "การกระทำ",
            dataIndex: "action",
            width: 130,
            render: (v: string) => <Tag color={ACTION[v]?.color}>{ACTION[v]?.label ?? v}</Tag>,
          },
        ]}
      />
    </Card>
  );
}
