"use client";

import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { Alert, App, Button, Card, Form, Skeleton, Space, Typography } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { invalidateMaster } from "@/lib/master";

interface Props {
  /** ชื่อข้อมูล เช่น "ผู้ขาย" */
  title: string;
  /** path ของ API เช่น "/admin/vendors" */
  endpoint: string;
  /** path หน้ารายการ เช่น "/master/vendors" */
  basePath: string;
  /** null = เพิ่มใหม่ */
  code: string | null;
  /** ช่องกรอก (อยู่ภายใน <Form> ใช้ Form.useFormInstance ได้) */
  children: React.ReactNode;
  maxWidth?: number;
}

type Loaded<F> = { code: string; record?: F & { updatedBy?: string; updatedAt?: string }; error?: string };

/** หน้าฟอร์มเพิ่ม/แก้ไขข้อมูลหลัก (แทน modal) — บันทึกแล้วกลับหน้ารายการ */
export default function MasterFormPage<F extends object>({
  title,
  endpoint,
  basePath,
  code,
  children,
  maxWidth = 1000,
}: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm<F>();
  const [loaded, setLoaded] = useState<Loaded<F> | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = code !== null;

  useEffect(() => {
    if (!code) return;
    let alive = true;
    api<F>(`${endpoint}/${encodeURIComponent(code)}`)
      .then((record) => {
        if (!alive) return;
        setLoaded({ code, record });
        form.setFieldsValue(record as Parameters<typeof form.setFieldsValue>[0]);
      })
      .catch((e: Error) => alive && setLoaded({ code, error: e.message }));
    return () => {
      alive = false;
    };
  }, [code, endpoint, form]);

  const current = loaded?.code === code ? loaded : null;

  async function onFinish(values: F) {
    setSaving(true);
    try {
      if (editing) {
        await api(`${endpoint}/${encodeURIComponent(code)}`, {
          method: "PUT",
          body: { ...values, code: code.trim() },
        });
        message.success(`บันทึก${title} ${code.trim()} แล้ว`);
      } else {
        await api(endpoint, { method: "POST", body: values });
        message.success(`เพิ่ม${title} ${String((values as { code?: string }).code ?? "")} แล้ว`);
      }
      invalidateMaster();
      router.push(basePath);
    } catch (e) {
      message.error((e as Error).message, 6);
      setSaving(false);
    }
  }

  if (editing && !code) {
    return (
      <Alert
        type="warning"
        showIcon
        title="ไม่ได้ระบุรหัสที่ต้องการแก้ไข"
        action={<Link href={basePath}><Button>กลับหน้ารายการ</Button></Link>}
      />
    );
  }

  if (editing && current?.error) {
    return (
      <Alert
        type="error"
        showIcon
        title={current.error}
        action={<Link href={basePath}><Button>กลับหน้ารายการ</Button></Link>}
      />
    );
  }

  const header = editing ? `แก้ไข${title} ${code.trim()}` : `เพิ่ม${title}`;

  return (
    <Form<F>
      form={form}
      layout="vertical"
      onFinish={onFinish}
      onFinishFailed={() => message.warning("กรุณากรอกข้อมูลให้ครบถ้วน")}
      scrollToFirstError
    >
      <Card
        style={{ maxWidth }}
        title={
          <Space>
            <Link href={basePath}>
              <Button type="text" icon={<ArrowLeftOutlined />} />
            </Link>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {header}
            </Typography.Title>
          </Space>
        }
        extra={
          <Space>
            <Link href={basePath}>
              <Button>ยกเลิก</Button>
            </Link>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} disabled={editing && !current}>
              บันทึก
            </Button>
          </Space>
        }
      >
        {editing && !current ? <Skeleton active paragraph={{ rows: 8 }} /> : children}
        {current?.record?.updatedBy && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            แก้ไขล่าสุดโดย {current.record.updatedBy} {current.record.updatedAt}
          </Typography.Text>
        )}
      </Card>
    </Form>
  );
}
