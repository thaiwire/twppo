"use client";

import { PlusOutlined, SaveOutlined } from "@ant-design/icons";
import { AutoComplete, Button, Col, Descriptions, Form, Input, InputNumber, Modal, Row, Space } from "antd";
import { useEffect } from "react";
import { fmtNum, round2 } from "@/lib/format";
import ItemCodeInput from "./ItemCodeInput";

export interface PrLineValues {
  part?: string;
  desc?: string;
  rmk?: string;
  rmk1?: string;
  um?: string;
  qty?: number | null;
  price?: number | null;
}

interface Props {
  /** เปิด modal อยู่หรือไม่ */
  open: boolean;
  /** null = เพิ่มรายการใหม่ / มีค่า = แก้ไขรายการที่ลำดับ lineNo */
  editing: { lineNo: number; values: PrLineValues } | null;
  /** ลำดับของรายการใหม่ (แสดงที่หัว modal) */
  nextLineNo: number;
  units: string[];
  /** keepOpen = กด "บันทึกและเพิ่มต่อ" (ล้างฟอร์มแล้วเปิดค้างไว้) */
  onSave: (values: PrLineValues, keepOpen: boolean) => void;
  onCancel: () => void;
}

const EMPTY: PrLineValues = { part: "", desc: "", rmk: "", rmk1: "", um: "", qty: 1, price: 0 };

const money = {
  min: 0,
  precision: 2,
  style: { width: "100%" },
  formatter: (v: string | number | undefined) => `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
  parser: (v: string | undefined) => Number((v ?? "").replace(/,/g, "")) as 0,
};

/** ฟอร์มรายละเอียดสินค้า 1 รายการ (แบบหน้าจอ "รายละเอียดสินค้า" ของระบบเดิม) */
export default function PrLineModal({ open, editing, nextLineNo, units, onSave, onCancel }: Props) {
  const [form] = Form.useForm<PrLineValues>();
  const qty = Form.useWatch("qty", form) ?? 0;
  const price = Form.useWatch("price", form) ?? 0;

  // เปิด modal → เติมค่าของรายการที่แก้ หรือค่าว่างสำหรับรายการใหม่
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(editing ? editing.values : EMPTY);
  }, [open, editing, form]);

  async function save(keepOpen: boolean) {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    onSave(
      {
        part: values.part?.trimEnd() ?? "",
        desc: (values.desc ?? "").trim(),
        rmk: (values.rmk ?? "").trim(),
        rmk1: (values.rmk1 ?? "").trim(),
        um: (values.um ?? "").trim(),
        qty: Number(values.qty),
        price: Number(values.price ?? 0),
      },
      keepOpen,
    );
    if (keepOpen) {
      form.resetFields();
      form.setFieldsValue(EMPTY);
    }
  }

  const lineNo = editing ? editing.lineNo : nextLineNo;

  return (
    <Modal
      open={open}
      title={editing ? `แก้ไขรายการที่ ${lineNo}` : `เพิ่มรายการที่ ${lineNo}`}
      width={720}
      onCancel={onCancel}
      forceRender
      footer={
        <Space>
          <Button onClick={onCancel}>ยกเลิก</Button>
          {!editing && (
            <Button icon={<PlusOutlined />} onClick={() => save(true)}>
              บันทึกและเพิ่มต่อ
            </Button>
          )}
          <Button type="primary" icon={<SaveOutlined />} onClick={() => save(false)}>
            บันทึก
          </Button>
        </Space>
      }
    >
      <Form<PrLineValues> form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col xs={24} md={10}>
            <Form.Item name="part" label="รหัสสินค้า" extra="พิมพ์ค้นหาแล้วเลือก — เติมชื่อ / หน่วย / ราคาให้ (เว้นว่างได้)">
              <ItemCodeInput
                onPick={(it) =>
                  form.setFieldsValue({
                    part: it.code,
                    desc: it.name.slice(0, 120),
                    um: it.um.slice(0, 9),
                    price: it.price || form.getFieldValue("price"),
                  })
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={14}>
            <Form.Item
              name="desc"
              label="ชื่อสินค้า / รายละเอียด"
              rules={[{ required: true, whitespace: true, message: "กรุณากรอกรายละเอียด" }]}
            >
              <Input maxLength={120} showCount autoFocus={!!editing} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="rmk" label="หมายเหตุรายการ" style={{ marginBottom: 8 }}>
              <Input maxLength={180} showCount placeholder="บรรทัด 1 (พิมพ์ในใบเสนอซื้อใต้รายละเอียด)" />
            </Form.Item>
            <Form.Item name="rmk1">
              <Input maxLength={180} showCount placeholder="บรรทัด 2" />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="um" label="หน่วยนับ">
              <AutoComplete
                options={units.map((u) => ({ value: u }))}
                maxLength={9}
                showSearch={{
                  filterOption: (input, o) => String(o?.value ?? "").toLowerCase().includes(input.toLowerCase()),
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item
              name="qty"
              label="จำนวน"
              rules={[{ required: true, type: "number", min: 0.0001, message: "ต้องมากกว่า 0" }]}
            >
              <InputNumber min={0} precision={2} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="price" label="ราคา/หน่วย">
              <InputNumber {...money} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item label="จำนวนเงิน">
              <Descriptions
                size="small"
                bordered
                column={1}
                styles={{ content: { textAlign: "right", fontWeight: 600 } }}
                items={[{ label: "฿", children: fmtNum(round2(Number(qty) * Number(price))) }]}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
