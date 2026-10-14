"use client";

import { AutoComplete, Col, Divider, Form, Input, Row, Select, Switch } from "antd";
import { useMemo } from "react";
import { toOptions, useAdminLookups } from "@/lib/adminLookups";
import { useMaster } from "@/lib/master";
import { useNewDefaults } from "./useNewDefaults";

const section = (text: string) => (
  <Divider titlePlacement="start" style={{ margin: "8px 0 16px" }}>
    {text}
  </Divider>
);

/** ช่องกรอกข้อมูลผู้ขาย (vd_mstr) */
export default function VendorFields({ editing }: { editing: boolean }) {
  const lk = useAdminLookups();
  const master = useMaster();

  const defaults = useMemo(
    () =>
      lk && master
        ? {
            active: true,
            taxable: true,
            currency: lk.defaults.currency ?? "BHT",
            vatClass: master.vatClasses.find((v) => v.primary)?.code,
            apAcct: lk.defaults.vdApAcct,
          }
        : null,
    [lk, master],
  );
  useNewDefaults(editing, defaults);

  return (
    <>
      {section("ข้อมูลทั่วไป")}
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item name="code" label="รหัสผู้ขาย" rules={[{ required: true, whitespace: true, message: "กรุณากรอกรหัส" }]}>
            <Input maxLength={24} disabled={editing} autoFocus={!editing} />
          </Form.Item>
        </Col>
        <Col xs={24} md={16}>
          <Form.Item name="name" label="ชื่อผู้ขาย" rules={[{ required: true, whitespace: true, message: "กรุณากรอกชื่อ" }]}>
            <Input maxLength={150} autoFocus={editing} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="name1" label="ชื่อ (ภาษาอังกฤษ / ชื่อที่ 2)">
            <Input maxLength={150} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="alias" label="ชื่อย่อ / ชื่อเรียก">
            <Input maxLength={150} />
          </Form.Item>
        </Col>
      </Row>

      {section("ที่อยู่ / ติดต่อ")}
      <Form.Item name="line1" label="ที่อยู่" style={{ marginBottom: 8 }}>
        <Input maxLength={150} placeholder="บรรทัด 1" />
      </Form.Item>
      <Form.Item name="line2" style={{ marginBottom: 8 }}>
        <Input maxLength={150} placeholder="บรรทัด 2" />
      </Form.Item>
      <Form.Item name="line3">
        <Input maxLength={150} placeholder="บรรทัด 3" />
      </Form.Item>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item name="tel" label="โทรศัพท์">
            <Input maxLength={100} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="fax" label="แฟกซ์">
            <Input maxLength={100} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name="taxId"
            label="เลขประจำตัวผู้เสียภาษี"
            rules={[{ pattern: /^[0-9-\s]*$/, message: "ตัวเลขเท่านั้น" }]}
          >
            <Input maxLength={30} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="contact" label="ผู้ติดต่อ (จัดซื้อ)">
            <Input maxLength={120} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="apContact" label="ผู้ติดต่อ (บัญชี/การเงิน)">
            <Input maxLength={120} />
          </Form.Item>
        </Col>
      </Row>

      {section("การซื้อ / บัญชี")}
      <Row gutter={16}>
        <Col xs={12} md={6}>
          <Form.Item name="creditTerm" label="เครดิต (วัน)">
            <AutoComplete options={toOptions(lk?.creditTerms)} maxLength={24} />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="currency" label="สกุลเงิน">
            <AutoComplete options={toOptions(lk?.currencies)} maxLength={9} />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="vatClass" label="ประเภทภาษี">
            <Select
              allowClear
              options={master?.vatClasses.map((v) => ({ value: v.code, label: v.desc || v.code }))}
            />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="taxable" label="คิดภาษี" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="apAcct" label="รหัสบัญชีเจ้าหนี้">
            <Input maxLength={24} />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="group" label="กลุ่มผู้ขาย">
            <AutoComplete options={toOptions(lk?.vendorGroups)} maxLength={12} />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item
            name="active"
            label="สถานะ"
            valuePropName="checked"
            extra="ไม่ใช้งาน = เลือกในใบ PR ไม่ได้"
          >
            <Switch checkedChildren="ใช้งาน" unCheckedChildren="ไม่ใช้งาน" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="remark" label="หมายเหตุ">
        <Input maxLength={120} />
      </Form.Item>
    </>
  );
}
