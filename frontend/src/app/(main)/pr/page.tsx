"use client";

import { PlusOutlined, PrinterOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Flex,
  Input,
  Select,
  Table,
  Tooltip,
  Typography,
} from "antd";
import type { Dayjs } from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, toQuery } from "@/lib/api";
import { fmtDate, fmtNum } from "@/lib/format";
import { useMe } from "@/components/AuthContext";
import PrStatusTags from "@/components/PrStatusTags";
import { useMaster } from "@/lib/master";
import type { Paged, PrListItem } from "@/lib/types";

interface Filters {
  q?: string;
  status?: "O" | "C";
  approve?: "Y" | "N";
  entity?: string;
  div?: string;
  range?: [Dayjs | null, Dayjs | null] | null;
}

export default function PrListPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const master = useMaster();
  const me = useMe();
  const myDiv = me.divCode ? master?.divisions.find((d) => d.code.toLowerCase() === me.divCode!.toLowerCase()) : null;
  const [filters, setFilters] = useState<Filters>({ status: "O" });
  const [draft, setDraft] = useState<Filters>({ status: "O" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: Paged<PrListItem> }>();

  const { range, ...rest } = filters;
  const query = toQuery({
    ...rest,
    dateFrom: range?.[0]?.format("YYYY-MM-DD"),
    dateTo: range?.[1]?.format("YYYY-MM-DD"),
    page,
    pageSize,
  });
  const key = `${query}#${nonce}`;
  const loading = result?.key !== key;
  const data = result?.data;

  useEffect(() => {
    let alive = true;
    api<Paged<PrListItem>>(`/pr${query}`)
      .then((d) => alive && setResult({ key, data: d }))
      .catch((e: Error) => {
        if (!alive) return;
        message.error(e.message);
        setResult((r) => ({ key, data: r?.data }));
      });
    return () => {
      alive = false;
    };
  }, [key, query, message]);

  const apply = () => {
    setPage(1);
    setFilters(draft);
  };

  return (
    <Card
      title={<Typography.Title level={4} style={{ margin: 0 }}>ใบเสนอซื้อ (Purchase Requisition)</Typography.Title>}
      extra={
        <Link href="/pr/new">
          <Button type="primary" icon={<PlusOutlined />}>
            สร้างใบเสนอซื้อ
          </Button>
        </Link>
      }
    >
      {me.divCode && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title={`แสดงเฉพาะใบเสนอซื้อของหน่วยงาน ${me.divCode}${myDiv ? ` ${myDiv.name}` : ""}`}
        />
      )}
      <Flex wrap gap={8} style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="เลขที่ / ผู้ขอซื้อ / รหัสผู้ขาย / หมายเหตุ"
          style={{ width: 300 }}
          value={draft.q}
          onChange={(e) => setDraft({ ...draft, q: e.target.value })}
          onPressEnter={apply}
        />
        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          value={draft.range ?? null}
          onChange={(v) => setDraft({ ...draft, range: v })}
          placeholder={["วันที่เริ่ม", "ถึงวันที่"]}
        />
        <Select
          allowClear
          placeholder="สถานะ"
          style={{ width: 120 }}
          value={draft.status}
          onChange={(v) => setDraft({ ...draft, status: v })}
          options={[
            { value: "O", label: "เปิด" },
            { value: "C", label: "ปิด" },
          ]}
        />
        <Select
          allowClear
          placeholder="การอนุมัติ"
          style={{ width: 140 }}
          value={draft.approve}
          onChange={(v) => setDraft({ ...draft, approve: v })}
          options={[
            { value: "N", label: "รออนุมัติ" },
            { value: "Y", label: "อนุมัติแล้ว" },
          ]}
        />
        <Select
          allowClear
          placeholder="บริษัท"
          style={{ width: 200 }}
          value={draft.entity}
          onChange={(v) => setDraft({ ...draft, entity: v })}
          options={master?.entities.map((e) => ({ value: e.code, label: `${e.code} ${e.name}` }))}
        />
        {/* ผู้ใช้ที่ไม่จำกัดหน่วยงาน กรองหน่วยงานได้ / ผู้ใช้ที่มีหน่วยงาน เห็นเฉพาะของตัวเองอยู่แล้ว */}
        {!me.divCode && (
          <Select
            allowClear
            placeholder="หน่วยงาน"
            style={{ width: 200 }}
            value={draft.div}
            onChange={(v) => setDraft({ ...draft, div: v })}
            options={[
              { value: "-", label: "(ไม่ระบุหน่วยงาน)" },
              ...(master?.divisions ?? []).map((d) => ({ value: d.code, label: `${d.code} ${d.name}` })),
            ]}
          />
        )}
        <Button type="primary" icon={<SearchOutlined />} onClick={apply}>
          ค้นหา
        </Button>
        <Tooltip title="โหลดใหม่">
          <Button icon={<ReloadOutlined />} onClick={() => setNonce((n) => n + 1)} />
        </Tooltip>
      </Flex>

      <Table<PrListItem>
        rowKey="nbr"
        size="middle"
        loading={loading}
        dataSource={data?.items}
        scroll={{ x: 1100 }}
        onRow={(r) => ({
          onDoubleClick: () => router.push(`/pr/view?nbr=${encodeURIComponent(r.nbr)}`),
          style: { cursor: "pointer" },
        })}
        pagination={{
          current: page,
          pageSize,
          total: data?.total,
          showSizeChanger: true,
          showTotal: (t) => `ทั้งหมด ${t.toLocaleString()} รายการ`,
          onChange: (p, s) => {
            setPage(p);
            setPageSize(s);
          },
        }}
        columns={[
          {
            title: "เลขที่",
            dataIndex: "nbr",
            width: 130,
            fixed: "left",
            render: (v: string) => <Link href={`/pr/view?nbr=${encodeURIComponent(v)}`}>{v}</Link>,
          },
          { title: "วันที่", dataIndex: "prDate", width: 110, render: fmtDate },
          { title: "วันที่ต้องการ", dataIndex: "needDate", width: 110, render: fmtDate },
          {
            title: "ผู้ขาย",
            dataIndex: "vend",
            ellipsis: true,
            render: (v: string, r) => (
              <span>
                <b>{v}</b> {r.vendName}
              </span>
            ),
          },
          { title: "ผู้ขอซื้อ", dataIndex: "request", width: 150, ellipsis: true },
          { title: "บริษัท", dataIndex: "entity", width: 80 },
          { title: "หน่วยงาน", dataIndex: "divCode", width: 100, render: (v: string) => v || "-" },
          { title: "รายการ", dataIndex: "lineCount", width: 70, align: "right" },
          {
            title: "ยอดสุทธิ",
            dataIndex: "net",
            width: 130,
            align: "right",
            render: (v: number) => fmtNum(v),
          },
          {
            title: "สถานะ",
            width: 170,
            render: (_, r) => <PrStatusTags status={r.status} approved={r.approved} />,
          },
          {
            title: "",
            width: 50,
            fixed: "right",
            render: (_, r) => (
              <Tooltip title="พิมพ์">
                <Link href={`/reports/pr?nbr=${encodeURIComponent(r.nbr)}`}>
                  <Button type="text" icon={<PrinterOutlined />} />
                </Link>
              </Tooltip>
            ),
          },
        ]}
      />
    </Card>
  );
}
