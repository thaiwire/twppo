"use client";

import { ClearOutlined, ExportOutlined, FilePdfOutlined } from "@ant-design/icons";
import { Alert, App, Button, Card, Form, Space, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toQuery } from "@/lib/api";

interface Props<F extends object> {
  /** ชื่อรายงาน */
  title: string;
  description?: string;
  /** API ที่คืน PDF เช่น "/pr/print" (รองรับ ?check=1 สำหรับตรวจเงื่อนไข) */
  endpoint: string;
  /** ค่าเริ่มต้นของเงื่อนไข (เช่น จาก URL) */
  initialValues?: Partial<F>;
  /** แปลงค่าในฟอร์มเป็น query string ของ API */
  toParams: (values: F) => Record<string, unknown>;
  /** ช่องกรอกเงื่อนไข */
  children: React.ReactNode;
  note?: React.ReactNode;
}

type LastRun = { url: string; count: number; total?: number; blocked: boolean };

/** หน้าแท็บใหม่ระหว่างรอ backend สร้าง PDF */
function showWaiting(w: Window, title: string) {
  w.document.title = `กำลังสร้าง${title}...`;
  w.document.body.innerHTML = `
    <div style="font-family:Sarabun,'Leelawadee UI',Tahoma,sans-serif;display:grid;place-items:center;height:90vh;color:#334155">
      <div style="text-align:center">
        <div style="width:40px;height:40px;margin:0 auto 16px;border:4px solid #cbd5e1;border-top-color:#2563eb;border-radius:50%;animation:s 1s linear infinite"></div>
        <div style="font-size:18px">กำลังสร้าง${title}...</div>
      </div>
    </div>
    <style>@keyframes s{to{transform:rotate(360deg)}}</style>`;
}

/**
 * หน้ารับเงื่อนไขก่อนออกรายงาน (ใช้กับทุกรายงาน) — ผลลัพธ์เปิดในแท็บใหม่
 * 1) เปิดแท็บทันทีตอนกดปุ่ม (กัน popup blocker)  2) ตรวจเงื่อนไขกับ backend (?check=1 ไม่สร้าง PDF)
 * 3) ผ่าน → แท็บใหม่โหลด PDF จาก API โดยตรง / ไม่ผ่าน → ปิดแท็บแล้วแจ้งข้อความในหน้านี้
 */
export default function ReportPage<F extends object>(props: Props<F>) {
  const { message } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm<F>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [last, setLast] = useState<LastRun | null>(null);

  async function run(values: F) {
    const params = props.toParams(values);
    const url = `/api${props.endpoint}${toQuery(params)}`;
    const tab = window.open("", "_blank");
    if (tab) showWaiting(tab, props.title);

    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch(`/api${props.endpoint}${toQuery({ ...params, check: 1 })}`, {
        credentials: "same-origin",
      });
      if (res.status === 401) {
        tab?.close();
        router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
        throw new Error(msg || `ออกรายงานไม่สำเร็จ (${res.status})`);
      }
      const result: LastRun = { url, count: body?.count ?? 0, total: body?.total, blocked: !tab };
      setLast(result);
      if (tab) {
        tab.location.replace(url);
        message.success(`เปิด${props.title}ในแท็บใหม่แล้ว (${result.count.toLocaleString()} รายการ)`);
      } else {
        message.warning("เบราว์เซอร์บล็อกการเปิดแท็บใหม่ — กดปุ่มด้านล่างเพื่อเปิดรายงาน", 6);
      }
    } catch (e) {
      tab?.close();
      setLast(null);
      setError((e as Error).message);
      message.error((e as Error).message, 6);
    } finally {
      setLoading(false);
    }
  }

  /** ล้างทุกช่องให้ว่าง (ไม่ใช่กลับไปค่าที่เติมมาจาก URL) — ยกเว้น "เรียงตาม" ซึ่งกลับเป็นค่าเริ่มต้น */
  function reset() {
    const cleared = Object.fromEntries(Object.keys(form.getFieldsValue(true)).map((k) => [k, undefined]));
    const sort = (props.initialValues as { sort?: unknown } | undefined)?.sort;
    form.setFieldsValue({ ...cleared, ...(sort !== undefined && { sort }) } as Parameters<typeof form.setFieldsValue>[0]);
    setError(undefined);
    setLast(null);
  }

  return (
    <Card
      title={
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {props.title}
          </Typography.Title>
          {props.description && (
            <Typography.Text type="secondary" style={{ fontWeight: 400, fontSize: 13 }}>
              {props.description}
            </Typography.Text>
          )}
        </div>
      }
    >
      <Form<F>
        form={form}
        layout="vertical"
        initialValues={props.initialValues}
        onFinish={run}
        onFinishFailed={() => message.warning("กรุณาตรวจสอบเงื่อนไข")}
      >
        {props.children}
        {props.note && <div style={{ marginBottom: 16 }}>{props.note}</div>}

        {error && <Alert type="warning" showIcon title={error} style={{ marginBottom: 16 }} />}
        {last && (
          <Alert
            type={last.blocked ? "warning" : "success"}
            showIcon
            style={{ marginBottom: 16 }}
            title={
              last.blocked
                ? "เบราว์เซอร์บล็อกการเปิดแท็บใหม่ — กดปุ่มเพื่อเปิดรายงาน (หรืออนุญาต popup ของเว็บนี้)"
                : `เปิดรายงานในแท็บใหม่แล้ว — ${last.count.toLocaleString()} รายการ`
            }
            description={
              last.total && last.total > last.count
                ? `พบทั้งหมด ${last.total.toLocaleString()} รายการ รายงานแสดง ${last.count.toLocaleString()} รายการแรก — จำกัดเงื่อนไขให้แคบลงเพื่อดูส่วนที่เหลือ`
                : undefined
            }
            action={
              <Button size="small" icon={<ExportOutlined />} href={last.url} target="_blank">
                {last.blocked ? "เปิดรายงาน" : "เปิดอีกครั้ง"}
              </Button>
            }
          />
        )}

        <Space>
          <Button type="primary" htmlType="submit" icon={<FilePdfOutlined />} loading={loading}>
            ออกรายงาน
          </Button>
          <Button icon={<ClearOutlined />} onClick={reset} disabled={loading}>
            ล้างเงื่อนไข
          </Button>
        </Space>
      </Form>
    </Card>
  );
}
