"use client";

import { AutoComplete, Col, Form, Input, Row, Switch } from "antd";
import { useMemo } from "react";
import { toOptions, useAdminLookups } from "@/lib/adminLookups";
import { useNewDefaults } from "./useNewDefaults";

/** ช่องกรอกข้อมูลบริษัท (en_mstr) */
export default function EntityFields({ editing }: { editing: boolean }) {
  const lk = useAdminLookups();
  const defaults = useMemo(
    () => (lk ? { primary: false, currency: lk.defaults.currency ?? "BHT" } : null),
    [lk],
  );
  useNewDefaults(editing, defaults);

  return (
    <Row gutter={16}>
      <Col xs={24} md={8}>
        <Form.Item name="code" label="รหัสบริษัท" rules={[{ required: true, whitespace: true, message: "กรุณากรอกรหัส" }]}>
          <Input maxLength={12} disabled={editing} autoFocus={!editing} />
        </Form.Item>
      </Col>
      <Col xs={24} md={16}>
        <Form.Item name="name" label="ชื่อบริษัท" rules={[{ required: true, whitespace: true, message: "กรุณากรอกชื่อ" }]}>
          <Input maxLength={120} autoFocus={editing} />
        </Form.Item>
      </Col>
      <Col xs={12} md={8}>
        <Form.Item name="currency" label="สกุลเงิน">
          <AutoComplete options={toOptions(lk?.currencies)} maxLength={9} />
        </Form.Item>
      </Col>
      <Col xs={12} md={16}>
        <Form.Item
          name="primary"
          label="บริษัทหลัก"
          valuePropName="checked"
          extra="ใช้เป็นค่าเริ่มต้นตอนสร้าง PR (มีได้แห่งเดียว — ตั้งที่นี่แล้วบริษัทอื่นจะถูกยกเลิกอัตโนมัติ)"
        >
          <Switch />
        </Form.Item>
      </Col>
    </Row>
  );
}
