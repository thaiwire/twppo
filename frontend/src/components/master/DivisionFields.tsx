"use client";

import { Col, Form, Input, Row } from "antd";

/** ช่องกรอกข้อมูลหน่วยงาน (div_mstr) */
export default function DivisionFields({ editing }: { editing: boolean }) {
  return (
    <Row gutter={16}>
      <Col xs={24} md={8}>
        <Form.Item name="code" label="รหัสหน่วยงาน" rules={[{ required: true, whitespace: true, message: "กรุณากรอกรหัส" }]}>
          <Input maxLength={24} disabled={editing} autoFocus={!editing} />
        </Form.Item>
      </Col>
      <Col xs={24} md={16}>
        <Form.Item name="name" label="ชื่อหน่วยงาน" rules={[{ required: true, whitespace: true, message: "กรุณากรอกชื่อ" }]}>
          <Input maxLength={60} showCount autoFocus={editing} />
        </Form.Item>
      </Col>
    </Row>
  );
}
