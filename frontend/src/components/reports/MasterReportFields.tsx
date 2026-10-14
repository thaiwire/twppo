"use client";

import { Col, Form, Input, Radio } from "antd";

/** ช่องเงื่อนไขที่ทุกรายงานข้อมูลหลักมีเหมือนกัน: ช่วงรหัส + ชื่อ (ช่องเฉพาะใส่ใน children) + การเรียง */
export function CodeRangeFields({ codeLabel }: { codeLabel: string }) {
  return (
    <>
      <Col xs={12} md={6}>
        <Form.Item name="codeFrom" label={`${codeLabel} ตั้งแต่`}>
          <Input allowClear placeholder="(แรกสุด)" />
        </Form.Item>
      </Col>
      <Col xs={12} md={6}>
        <Form.Item
          name="codeTo"
          label="ถึง"
          dependencies={["codeFrom"]}
          rules={[
            ({ getFieldValue }) => ({
              validator: (_, v?: string) => {
                const from = (getFieldValue("codeFrom") as string | undefined)?.trim();
                return !v || !from || from.localeCompare(v.trim(), "en", { sensitivity: "base" }) <= 0
                  ? Promise.resolve()
                  : Promise.reject(new Error("ต้องไม่น้อยกว่ารหัสเริ่มต้น"));
              },
            }),
          ]}
        >
          <Input allowClear placeholder="(สุดท้าย)" />
        </Form.Item>
      </Col>
    </>
  );
}

export function SortField() {
  return (
    <Col xs={24} md={12}>
      <Form.Item name="sort" label="เรียงตาม">
        <Radio.Group
          optionType="button"
          options={[
            { value: "code", label: "รหัส" },
            { value: "name", label: "ชื่อ" },
          ]}
        />
      </Form.Item>
    </Col>
  );
}

export const LIMIT_NOTE = "แสดงสูงสุด 1,000 รายการต่อรายงาน — ถ้ามากกว่านี้ให้จำกัดช่วงรหัสหรือเงื่อนไขอื่น";
