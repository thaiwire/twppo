"use client";

import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Flex,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  type TableColumnsType,
  Tooltip,
  Typography,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMe } from "@/components/AuthContext";
import { api, toQuery } from "@/lib/api";
import { invalidateMaster } from "@/lib/master";
import { can, type ModuleCode } from "@/lib/modules";
import type { Paged } from "@/lib/types";

export interface MasterRow {
  code: string;
}

interface Props<T extends MasterRow> {
  /** ชื่อข้อมูล เช่น "ผู้ขาย" */
  title: string;
  /** path ของ API เช่น "/admin/vendors" */
  endpoint: string;
  /** path ของหน้าเว็บ เช่น "/master/vendors" (มี /new และ /edit?code=) */
  basePath: string;
  /** หน้ารับเงื่อนไขรายงาน เช่น "/reports/vendors" (ไม่ระบุ = ไม่มีปุ่มพิมพ์รายงาน) */
  reportPath?: string;
  /** ตัวกรองแบบเลือกเพิ่มเติม เช่น ระดับผู้ใช้ (ส่งไป API เป็น query ตาม key) */
  selectFilters?: { key: string; placeholder: string; width?: number; options: { value: string; label: string }[] }[];
  searchPlaceholder: string;
  columns: TableColumnsType<T>;
  /** มีตัวกรองสถานะใช้งาน/ไม่ใช้งาน (ผู้ขาย) */
  statusFilter?: boolean;
  /** ห้ามลบรายการนี้ (เช่น บริษัทหลัก) — คืนข้อความเหตุผล */
  deleteBlocked?: (row: T) => string | undefined;
  /** เพิ่ม/แก้ไข/ลบ ได้เฉพาะระดับ manager ของ module นี้ (ไม่ระบุ = ได้เสมอ เช่น เมนู Admin) */
  module?: ModuleCode;
}

interface ListState {
  q: string;
  status?: "active" | "inactive";
  extra?: Record<string, string | undefined>;
  page: number;
  pageSize: number;
}

const DEFAULT_STATE: ListState = { q: "", page: 1, pageSize: 20 };

/** จำเงื่อนไขค้นหา/หน้าไว้ เมื่อกลับมาจากหน้าแก้ไขจะอยู่ที่เดิม */
function loadState(key: string): ListState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(sessionStorage.getItem(key) ?? "{}") };
  } catch {
    return DEFAULT_STATE;
  }
}

export const editPath = (basePath: string, code: string) =>
  `${basePath}/edit?code=${encodeURIComponent(code)}`;

/** หน้ารายการข้อมูลหลัก: ค้นหา / แบ่งหน้า / ลบ / พิมพ์รายงาน — เพิ่ม/แก้ไขไปที่หน้าฟอร์มแยก */
export default function MasterList<T extends MasterRow>(props: Props<T>) {
  const { title, endpoint, basePath, columns, statusFilter } = props;
  const me = useMe();
  /** ระดับ user ของ module = ดูอย่างเดียว (กดแถวเพื่อดูรายละเอียดได้) */
  const canEdit = !props.module || can(me, props.module, "manager");
  const { message } = App.useApp();
  const router = useRouter();
  const storageKey = `master-list:${endpoint}`;

  const [state, setState] = useState<ListState>(() => loadState(storageKey));
  const [q, setQ] = useState(state.q);
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: Paged<T> }>();

  const query = toQuery({
    q: state.q,
    status: state.status,
    ...state.extra,
    page: state.page,
    pageSize: state.pageSize,
  });
  const key = `${query}#${nonce}`;
  const loading = result?.key !== key;

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(state));
  }, [storageKey, state]);

  useEffect(() => {
    let alive = true;
    api<Paged<T>>(`${endpoint}${query}`)
      .then((d) => alive && setResult({ key, data: d }))
      .catch((e: Error) => {
        if (!alive) return;
        message.error(e.message);
        setResult((r) => ({ key, data: r?.data }));
      });
    return () => {
      alive = false;
    };
  }, [endpoint, key, query, message]);

  const update = (patch: Partial<ListState>) => setState((s) => ({ ...s, ...patch }));
  const applySearch = () => update({ q: q.trim(), page: 1 });

  async function remove(row: T) {
    try {
      await api(`${endpoint}/${encodeURIComponent(row.code)}`, { method: "DELETE" });
      message.success(`ลบ${title} ${row.code.trim()} แล้ว`);
      invalidateMaster();
      setNonce((n) => n + 1);
    } catch (e) {
      message.error((e as Error).message, 8);
    }
  }

  return (
    <Card
      title={<Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>}
      extra={
        <Space>
          {props.reportPath && (
            <Tooltip title="ไปหน้ากำหนดเงื่อนไขรายงาน (เติมคำค้นหาปัจจุบันให้)">
              <Link href={`${props.reportPath}${toQuery({ name: state.q, status: state.status })}`}>
                <Button icon={<PrinterOutlined />}>พิมพ์รายงาน</Button>
              </Link>
            </Tooltip>
          )}
          {canEdit && (
            <Link href={`${basePath}/new`}>
              <Button type="primary" icon={<PlusOutlined />}>
                เพิ่ม{title}
              </Button>
            </Link>
          )}
        </Space>
      }
    >
      <Flex wrap gap={8} style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={props.searchPlaceholder}
          style={{ width: 320 }}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (!e.target.value) update({ q: "", page: 1 });
          }}
          onPressEnter={applySearch}
        />
        {statusFilter && (
          <Select
            allowClear
            placeholder="สถานะ"
            style={{ width: 140 }}
            value={state.status}
            onChange={(v) => update({ status: v, page: 1 })}
            options={[
              { value: "active", label: "ใช้งาน" },
              { value: "inactive", label: "ไม่ใช้งาน" },
            ]}
          />
        )}
        {props.selectFilters?.map((f) => (
          <Select
            key={f.key}
            allowClear
            placeholder={f.placeholder}
            style={{ width: f.width ?? 140 }}
            value={state.extra?.[f.key]}
            onChange={(v?: string) => update({ extra: { ...state.extra, [f.key]: v }, page: 1 })}
            options={f.options}
          />
        ))}
        <Button type="primary" icon={<SearchOutlined />} onClick={applySearch}>
          ค้นหา
        </Button>
        <Tooltip title="โหลดใหม่">
          <Button icon={<ReloadOutlined />} onClick={() => setNonce((n) => n + 1)} />
        </Tooltip>
      </Flex>

      <Table<T>
        rowKey="code"
        size="middle"
        loading={loading}
        dataSource={result?.data?.items}
        scroll={{ x: 900 }}
        onRow={(r) => ({
          onDoubleClick: () => router.push(editPath(basePath, r.code)),
          style: { cursor: "pointer" },
        })}
        pagination={{
          current: state.page,
          pageSize: state.pageSize,
          total: result?.data?.total,
          showSizeChanger: true,
          showTotal: (t) => `ทั้งหมด ${t.toLocaleString()} รายการ`,
          onChange: (page, pageSize) => update({ page, pageSize }),
        }}
        columns={[
          ...columns,
          {
            title: "",
            width: 100,
            fixed: "right",
            render: (_, r) => {
              if (!canEdit)
                return (
                  <Tooltip title="ดูรายละเอียด">
                    <Link href={editPath(basePath, r.code)}>
                      <Button type="text" icon={<EyeOutlined />} />
                    </Link>
                  </Tooltip>
                );
              const blocked = props.deleteBlocked?.(r);
              return (
                <Space size={0}>
                  <Tooltip title="แก้ไข">
                    <Link href={editPath(basePath, r.code)}>
                      <Button type="text" icon={<EditOutlined />} />
                    </Link>
                  </Tooltip>
                  {blocked ? (
                    <Tooltip title={blocked}>
                      <Button type="text" danger icon={<DeleteOutlined />} disabled />
                    </Tooltip>
                  ) : (
                    <Popconfirm
                      title={`ลบ${title} ${r.code.trim()}?`}
                      description="ระบบจะตรวจก่อนว่ารหัสนี้ถูกใช้งานอยู่หรือไม่"
                      okText="ลบ"
                      cancelText="ยกเลิก"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => remove(r)}
                    >
                      <Tooltip title="ลบ">
                        <Button type="text" danger icon={<DeleteOutlined />} />
                      </Tooltip>
                    </Popconfirm>
                  )}
                </Space>
              );
            },
          },
        ]}
      />
    </Card>
  );
}
