"use client";

import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

export default function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/pr";
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function onFinish(v: { username: string; password: string }) {
    setLoading(true);
    setError(undefined);
    try {
      await api("/auth/login", { method: "POST", body: v });
      router.replace(next.startsWith("/") ? next : "/pr");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <Card style={{ width: 400, maxWidth: "100%", borderRadius: 16 }} styles={{ body: { padding: 32 } }}>
      <Typography.Title level={3} style={{ marginBottom: 4 }}>
        ระบบใบเสนอซื้อ (PR)
      </Typography.Title>
      <Typography.Text type="secondary">เข้าสู่ระบบเพื่อใช้งาน</Typography.Text>

      {error && <Alert type="error" title={error} showIcon style={{ marginTop: 16 }} />}

      <Form layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }} requiredMark={false}>
        <Form.Item name="username" label="ชื่อผู้ใช้" rules={[{ required: true, message: "กรุณากรอกชื่อผู้ใช้" }]}>
          <Input prefix={<UserOutlined />} size="large" autoFocus autoComplete="username" />
        </Form.Item>
        <Form.Item name="password" label="รหัสผ่าน" rules={[{ required: true, message: "กรุณากรอกรหัสผ่าน" }]}>
          <Input.Password prefix={<LockOutlined />} size="large" autoComplete="current-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={loading}>
          เข้าสู่ระบบ
        </Button>
      </Form>
    </Card>
  );
}
