"use client";

import { Alert, Col, Divider, Form, Input, Radio, Row, Select, Switch } from "antd";
import { useMe } from "@/components/AuthContext";
import { useNewDefaults } from "@/components/master/useNewDefaults";
import { divisionOptions, useMaster } from "@/lib/master";
import { MODULE_CODES, MODULES } from "@/lib/modules";

const ROLE_OPTIONS = [
  { value: "user", label: "user — ใช้งานตามสิทธิ์ module ด้านล่าง" },
  { value: "admin", label: "admin — ผู้ดูแลระบบ: ทุก module (ระดับ manager) + จัดการผู้ใช้" },
];

/** ผู้ใช้ใหม่: ใช้ PR ได้ระดับ user */
const DEFAULTS = { role: "user", active: true, modules: { pr: "user" } };

const section = (text: string) => (
  <Divider titlePlacement="start" style={{ margin: "8px 0 16px" }}>
    {text}
  </Divider>
);

/** ช่องกรอกข้อมูลผู้ใช้ (app_user) */
export default function UserFields({ editing }: { editing: boolean }) {
  const me = useMe();
  const master = useMaster();
  const username = Form.useWatch<string | undefined>("code");
  const role = Form.useWatch<string | undefined>("role");
  // แก้บัญชีตัวเอง: เปลี่ยนระดับ/ปิดใช้งานไม่ได้ (backend ตรวจซ้ำ)
  const self = editing && !!username && username.toLowerCase() === me.username.toLowerCase();
  useNewDefaults(editing, DEFAULTS);

  return (
    <>
      {section("บัญชีผู้ใช้")}
      <Row gutter={16}>
        <Col xs={24} md={10}>
          <Form.Item
            name="code"
            label="ชื่อผู้ใช้ (username)"
            extra={editing ? undefined : "3–50 ตัว: a-z, 0-9 และ . _ @ - (เปลี่ยนภายหลังไม่ได้)"}
            rules={[
              { required: true, whitespace: true, message: "กรุณากรอกชื่อผู้ใช้" },
              ...(editing
                ? []
                : [{ pattern: /^[A-Za-z0-9._@-]{3,50}$/, message: "ใช้ได้เฉพาะ a-z, 0-9 และ . _ @ - (3–50 ตัว)" }]),
            ]}
          >
            <Input maxLength={50} disabled={editing} autoFocus={!editing} autoComplete="off" />
          </Form.Item>
        </Col>
        <Col xs={24} md={14}>
          <Form.Item
            name="displayName"
            label="ชื่อที่แสดง"
            rules={[{ required: true, whitespace: true, message: "กรุณากรอกชื่อที่แสดง" }]}
          >
            <Input maxLength={100} autoFocus={editing} />
          </Form.Item>
        </Col>
      </Row>

      {section("สิทธิ์การใช้งาน")}
      {self && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="นี่คือบัญชีของคุณ — เปลี่ยนประเภทผู้ใช้หรือปิดใช้งานตัวเองไม่ได้"
        />
      )}
      <Row gutter={16}>
        <Col xs={24} md={16}>
          <Form.Item name="role" label="ประเภทผู้ใช้" rules={[{ required: true, message: "กรุณาเลือกประเภทผู้ใช้" }]}>
            <Radio.Group options={ROLE_OPTIONS} disabled={self} style={{ display: "flex", flexDirection: "column", gap: 8 }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name="active"
            label="สถานะ"
            valuePropName="checked"
            extra="ไม่ใช้งาน = login ไม่ได้ และ session ที่เปิดอยู่จะถูกตัดทันที"
          >
            <Switch checkedChildren="ใช้งาน" unCheckedChildren="ไม่ใช้งาน" disabled={self} />
          </Form.Item>
        </Col>
      </Row>

      {section("สิทธิ์ใช้งาน module")}
      {role === "admin" && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="admin ใช้ได้ทุก module ในระดับ manager — สิทธิ์ด้านล่างจะมีผลเมื่อเปลี่ยนเป็น user"
        />
      )}
      {MODULE_CODES.map((m) => (
        <Row key={m} gutter={16} align="middle">
          <Col xs={24} md={8}>
            <Form.Item
              name={["modules", m]}
              label={MODULES[m].name}
              // ไม่มีค่า (ไม่มีสิทธิ์) แสดงเป็นตัวเลือก "ไม่มีสิทธิ์"
              getValueProps={(v?: string) => ({ value: v ?? "" })}
            >
              <Radio.Group
                optionType="button"
                buttonStyle="solid"
                disabled={role === "admin"}
                options={[
                  { value: "", label: "ไม่มีสิทธิ์" },
                  { value: "user", label: "user" },
                  { value: "manager", label: "manager" },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={16} style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>
            <div>user: {MODULES[m].user}</div>
            <div>manager: {MODULES[m].manager}</div>
          </Col>
        </Row>
      ))}

      {section("หน่วยงาน")}
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name="divCode"
            label="หน่วยงาน (ไม่บังคับ)"
            extra="ระบุ = เห็นและทำงานได้เฉพาะใบ PR ของหน่วยงานนี้ / ไม่ระบุ = เห็นทุกหน่วยงาน"
          >
            <Select
              allowClear
              showSearch={{ optionFilterProp: "label" }}
              placeholder="ไม่ระบุ (เห็นทุกหน่วยงาน)"
              loading={!master}
              options={divisionOptions(master?.divisions)}
            />
          </Form.Item>
        </Col>
      </Row>

      {section(editing ? "ตั้งรหัสผ่านใหม่ (ไม่บังคับ)" : "รหัสผ่าน")}
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name="password"
            label={editing ? "รหัสผ่านใหม่" : "รหัสผ่าน"}
            extra={editing ? "เว้นว่าง = ไม่เปลี่ยนรหัสผ่าน" : "อย่างน้อย 8 ตัวอักษร ต้องมีทั้งตัวอักษรและตัวเลข"}
            rules={[
              ...(editing ? [] : [{ required: true, message: "กรุณากำหนดรหัสผ่าน" }]),
              { min: 8, message: "อย่างน้อย 8 ตัวอักษร" },
              { max: 72, message: "ไม่เกิน 72 ตัวอักษร" },
              { pattern: /(?=.*[A-Za-z])(?=.*\d)/, message: "ต้องมีทั้งตัวอักษรและตัวเลข" },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="confirmPassword"
            label="ยืนยันรหัสผ่าน"
            dependencies={["password"]}
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, v?: string) => {
                  const pw = getFieldValue("password") as string | undefined;
                  if (!pw && !v) return Promise.resolve();
                  return v === pw ? Promise.resolve() : Promise.reject(new Error("รหัสผ่านไม่ตรงกัน"));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
