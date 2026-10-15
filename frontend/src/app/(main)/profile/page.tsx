"use client";

import { KeyOutlined, SaveOutlined } from "@ant-design/icons";
import { App, Button, Card, Col, Descriptions, Form, Input, Row, Tag, Typography } from "antd";
import { useState } from "react";
import { useAuth } from "@/components/AuthContext";
import { api } from "@/lib/api";
import { MODULE_CODES, MODULES } from "@/lib/modules";
import type { Me } from "@/lib/types";

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const { me, setMe } = useAuth();
  const { message } = App.useApp();
  const [pwForm] = Form.useForm<PasswordForm>();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  async function saveProfile(v: { displayName: string }) {
    setSavingProfile(true);
    try {
      setMe(await api<Me>("/auth/profile", { method: "PUT", body: v }));
      message.success("บันทึกโปรไฟล์แล้ว");
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(v: PasswordForm) {
    setSavingPw(true);
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: { currentPassword: v.currentPassword, newPassword: v.newPassword },
      });
      pwForm.resetFields();
      message.success("เปลี่ยนรหัสผ่านแล้ว ครั้งถัดไปให้เข้าสู่ระบบด้วยรหัสผ่านใหม่");
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={12}>
        <Card title={<Typography.Title level={4} style={{ margin: 0 }}>โปรไฟล์</Typography.Title>}>
          <Descriptions
            column={1}
            size="small"
            bordered
            style={{ marginBottom: 24 }}
            styles={{ label: { width: 140 } }}
            items={[
              { label: "ชื่อผู้ใช้", children: <b>{me.username}</b> },
              {
                label: "สิทธิ์",
                children: (
                  <>
                    {me.isAdmin && <Tag color="red">admin (ทุก module)</Tag>}
                    {MODULE_CODES.filter((m) => me.modules[m]).map((m) => (
                      <Tag key={m} color={me.modules[m] === "manager" ? "blue" : undefined}>
                        {MODULES[m].name}: {me.modules[m]}
                      </Tag>
                    ))}
                    {!me.isAdmin && !MODULE_CODES.some((m) => me.modules[m]) && (
                      <Tag>ยังไม่ได้รับสิทธิ์ module ใด</Tag>
                    )}
                  </>
                ),
              },
            ]}
          />
          <Form layout="vertical" initialValues={{ displayName: me.displayName }} onFinish={saveProfile}>
            <Form.Item
              name="displayName"
              label="ชื่อที่แสดง"
              rules={[{ required: true, whitespace: true, message: "กรุณากรอกชื่อที่แสดง" }]}
            >
              <Input maxLength={100} showCount />
            </Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={savingProfile}>
              บันทึก
            </Button>
          </Form>
        </Card>
      </Col>

      <Col xs={24} lg={12}>
        <Card title={<Typography.Title level={4} style={{ margin: 0 }}>เปลี่ยนรหัสผ่าน</Typography.Title>}>
          <Form<PasswordForm> form={pwForm} layout="vertical" onFinish={changePassword} requiredMark={false}>
            <Form.Item
              name="currentPassword"
              label="รหัสผ่านปัจจุบัน"
              rules={[{ required: true, message: "กรุณากรอกรหัสผ่านปัจจุบัน" }]}
            >
              <Input.Password autoComplete="current-password" />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="รหัสผ่านใหม่"
              extra="อย่างน้อย 8 ตัวอักษร ต้องมีทั้งตัวอักษรและตัวเลข"
              rules={[
                { required: true, message: "กรุณากรอกรหัสผ่านใหม่" },
                { min: 8, message: "อย่างน้อย 8 ตัวอักษร" },
                { max: 72, message: "ไม่เกิน 72 ตัวอักษร" },
                { pattern: /(?=.*[A-Za-z])(?=.*\d)/, message: "ต้องมีทั้งตัวอักษรและตัวเลข" },
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="ยืนยันรหัสผ่านใหม่"
              dependencies={["newPassword"]}
              rules={[
                { required: true, message: "กรุณายืนยันรหัสผ่านใหม่" },
                ({ getFieldValue }) => ({
                  validator: (_, v) =>
                    !v || v === getFieldValue("newPassword")
                      ? Promise.resolve()
                      : Promise.reject(new Error("รหัสผ่านไม่ตรงกัน")),
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" icon={<KeyOutlined />} loading={savingPw}>
              เปลี่ยนรหัสผ่าน
            </Button>
          </Form>
        </Card>
      </Col>
    </Row>
  );
}
