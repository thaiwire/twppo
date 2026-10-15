"use client";

import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  LockOutlined,
  PrinterOutlined,
  RollbackOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Popconfirm,
  Row,
  Skeleton,
  Space,
  Table,
  Typography,
} from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useMe } from "@/components/AuthContext";
import LineDesc from "@/components/LineDesc";
import PrStatusTags from "@/components/PrStatusTags";
import { api, prPath } from "@/lib/api";
import { fmtDate, fmtNum } from "@/lib/format";
import { can } from "@/lib/modules";
import type { PrDetail, PrLine } from "@/lib/types";
import { usePr } from "@/lib/usePr";

export default function ViewPr() {
  const nbr = useSearchParams().get("nbr");
  const router = useRouter();
  const me = useMe();
  const { message } = App.useApp();
  const { pr, setPr, error } = usePr(nbr);
  const [busy, setBusy] = useState<string>();

  if (error) return <Alert type="error" title={error} showIcon />;
  if (!pr) return <Card><Skeleton active /></Card>;

  const editable = !pr.approved && pr.status === "O" && !pr.locked;
  /** อนุมัติ / ปิด-เปิด PR — ระดับ manager ของ module pr */
  const canApprove = can(me, "pr", "manager");
  const t = pr.totals;

  async function action(name: string, path: string, okMsg: string) {
    setBusy(name);
    try {
      setPr(await api<PrDetail>(prPath(pr!.nbr, path), { method: "POST" }));
      message.success(okMsg);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(undefined);
    }
  }

  async function remove() {
    setBusy("delete");
    try {
      await api(prPath(pr!.nbr), { method: "DELETE" });
      message.success(`ลบใบเสนอซื้อ ${pr!.nbr} แล้ว`);
      router.push("/pr");
    } catch (e) {
      message.error((e as Error).message);
      setBusy(undefined);
    }
  }

  return (
    <Card
      title={
        <Space wrap>
          <Link href="/pr">
            <Button type="text" icon={<ArrowLeftOutlined />} />
          </Link>
          <Typography.Title level={4} style={{ margin: 0 }}>
            ใบเสนอซื้อ {pr.nbr}
          </Typography.Title>
          <PrStatusTags status={pr.status} approved={pr.approved} />
        </Space>
      }
      extra={
        <Space wrap>
          <Link href={`/reports/pr?nbr=${encodeURIComponent(pr.nbr)}`}>
            <Button icon={<PrinterOutlined />}>พิมพ์</Button>
          </Link>
          {editable && (
            <Link href={`/pr/edit?nbr=${encodeURIComponent(pr.nbr)}`}>
              <Button icon={<EditOutlined />}>แก้ไข</Button>
            </Link>
          )}
          {editable && (
            <Popconfirm
              title={`ลบใบเสนอซื้อ ${pr.nbr}?`}
              description="ลบแล้วไม่สามารถกู้คืนได้"
              okText="ลบ"
              cancelText="ยกเลิก"
              okButtonProps={{ danger: true }}
              onConfirm={remove}
            >
              <Button danger icon={<DeleteOutlined />} loading={busy === "delete"}>
                ลบ
              </Button>
            </Popconfirm>
          )}
          {canApprove && pr.status === "O" && !pr.approved && (
            <Popconfirm
              title={`อนุมัติใบเสนอซื้อ ${pr.nbr}?`}
              okText="อนุมัติ"
              cancelText="ยกเลิก"
              onConfirm={() => action("approve", "/approve", "อนุมัติแล้ว")}
            >
              <Button type="primary" icon={<CheckCircleOutlined />} loading={busy === "approve"}>
                อนุมัติ
              </Button>
            </Popconfirm>
          )}
          {canApprove && pr.status === "O" && pr.approved && !pr.locked && (
            <Popconfirm
              title="ยกเลิกการอนุมัติ?"
              okText="ยืนยัน"
              cancelText="ไม่"
              onConfirm={() => action("unapprove", "/unapprove", "ยกเลิกอนุมัติแล้ว")}
            >
              <Button icon={<RollbackOutlined />} loading={busy === "unapprove"}>
                ยกเลิกอนุมัติ
              </Button>
            </Popconfirm>
          )}
          {canApprove && pr.status === "O" && (
            <Popconfirm
              title="ปิดใบเสนอซื้อ?"
              description="ใช้เมื่อไม่ต้องการดำเนินการต่อ"
              okText="ปิด"
              cancelText="ไม่"
              onConfirm={() => action("close", "/close", "ปิดใบเสนอซื้อแล้ว")}
            >
              <Button icon={<LockOutlined />} loading={busy === "close"}>
                ปิด PR
              </Button>
            </Popconfirm>
          )}
          {canApprove && pr.status === "C" && !pr.lines.every((l) => l.qtyOrdered >= l.qty) && (
            <Button
              icon={<FolderOpenOutlined />}
              loading={busy === "reopen"}
              onClick={() => action("reopen", "/reopen", "เปิดใบเสนอซื้ออีกครั้งแล้ว")}
            >
              เปิด PR
            </Button>
          )}
        </Space>
      }
    >
      <Descriptions
        bordered
        size="small"
        column={{ xs: 1, md: 2 }}
        styles={{ label: { width: 140 } }}
        items={[
          { label: "ใบเสนอซื้อ #", children: <b>{pr.nbr}</b> },
          { label: "บริษัท", children: `${pr.entity}  ${pr.entityName}` },
          { label: "วันที่", children: fmtDate(pr.prDate) },
          { label: "วันที่ต้องการรับ", children: fmtDate(pr.needDate) },
          {
            label: "ผู้ขาย",
            span: "filled",
            children: (
              <>
                <b>{pr.vend}</b> {pr.vendor?.name}
                {pr.vendor?.address && (
                  <div style={{ color: "#64748b", fontSize: 12 }}>{pr.vendor.address}</div>
                )}
              </>
            ),
          },
          { label: "ผู้ขอซื้อ", children: pr.request },
          { label: "หน่วยงาน", children: pr.divCode ? `${pr.divCode}  ${pr.divName}` : "-" },
          { label: "ผู้อนุมัติ", children: pr.approved ? pr.approvedBy || "-" : "-" },
          { label: "หมายเหตุ", span: "filled", children: [pr.remark, pr.remark1].filter(Boolean).join(" / ") },
          { label: "บันทึกโดย", span: "filled", children: `${pr.createdBy}  ${pr.updatedAt}` },
        ]}
      />

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        รายการสินค้า
      </Typography.Title>
      <Table<PrLine>
        rowKey="line"
        size="small"
        pagination={false}
        dataSource={pr.lines}
        scroll={{ x: 900 }}
        columns={[
          { title: "ลำดับ", dataIndex: "line", width: 60, align: "center" },
          { title: "รหัสสินค้า", dataIndex: "part", width: 140 },
          {
            title: "ชื่อสินค้า / รายละเอียด",
            dataIndex: "desc",
            render: (v: string, l) => <LineDesc desc={v} rmk={l.rmk} rmk1={l.rmk1} />,
          },
          { title: "หน่วยนับ", dataIndex: "um", width: 90 },
          { title: "จำนวน", dataIndex: "qty", width: 100, align: "right", render: (v: number) => fmtNum(v) },
          { title: "ราคา/หน่วย", dataIndex: "price", width: 120, align: "right", render: (v: number) => fmtNum(v) },
          { title: "จำนวนเงิน", dataIndex: "amount", width: 130, align: "right", render: (v: number) => fmtNum(v) },
          {
            title: "#สั่งซื้อ",
            dataIndex: "qtyOrdered",
            width: 90,
            align: "right",
            render: (v: number) => (v ? fmtNum(v) : "-"),
          },
        ]}
      />

      <Row justify="end" style={{ marginTop: 16 }}>
        <Col xs={24} md={12} lg={9}>
          <Descriptions
            column={1}
            size="small"
            bordered
            styles={{ label: { width: 200 }, content: { textAlign: "right" } }}
            items={[
              { label: "รวมราคาสินค้า", children: fmtNum(t.subtotal) },
              { label: `มูลค่าส่วนลด (${t.discPct}%)`, children: fmtNum(t.discAmt) },
              { label: "รวมราคา", children: fmtNum(t.afterDisc) },
              { label: `มูลค่าภาษี (${pr.vatDesc || `${t.vatPct}%`})`, children: fmtNum(t.vatAmt) },
              { label: <b>รวมราคาสุทธิ</b>, children: <b style={{ fontSize: 16 }}>{fmtNum(t.net)}</b> },
            ]}
          />
        </Col>
      </Row>
    </Card>
  );
}
