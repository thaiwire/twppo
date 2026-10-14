"use client";

import { DeleteOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import {
  App,
  AutoComplete,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, prPath } from "@/lib/api";
import { calcTotals, fmtNum } from "@/lib/format";
import { divisionOptions, useMaster } from "@/lib/master";
import { useMe } from "./AuthContext";
import type { PrDetail, SavePrInput } from "@/lib/types";
import ItemCodeInput from "./ItemCodeInput";
import VendorSelect from "./VendorSelect";

interface LineValues {
  part?: string;
  desc?: string;
  um?: string;
  qty?: number | null;
  price?: number | null;
}

interface FormValues {
  prDate: Dayjs;
  needDate?: Dayjs | null;
  vend: string;
  request?: string;
  entity: string;
  remark?: string;
  remark1?: string;
  discPct?: number | null;
  taxable: boolean;
  vatClass?: string;
  divCode?: string;
  lines: LineValues[];
}

const emptyLine: LineValues = { part: "", desc: "", um: "", qty: 1, price: 0 };

function toFormValues(pr: PrDetail): FormValues {
  return {
    prDate: dayjs(pr.prDate),
    needDate: pr.needDate ? dayjs(pr.needDate) : null,
    vend: pr.vend,
    request: pr.request,
    entity: pr.entity,
    remark: pr.remark,
    remark1: pr.remark1,
    discPct: pr.totals.discPct,
    taxable: pr.taxable,
    vatClass: pr.vatClass || undefined,
    divCode: pr.divCode || undefined,
    lines: pr.lines.map((l) => ({ part: l.part, desc: l.desc, um: l.um, qty: l.qty, price: l.price })),
  };
}

/** ฟอร์มบันทึก/แก้ไขใบเสนอซื้อ — โครงเดียวกับหน้าจอเดิม prqmt.p (หัวเอกสาร / รายการสินค้า / ราคา-ส่วนลด-ภาษี) */
export default function PrForm({ pr }: { pr?: PrDetail }) {
  const router = useRouter();
  const { message } = App.useApp();
  const master = useMaster();
  const me = useMe();
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);

  const lines = Form.useWatch("lines", form) ?? [];
  const discPct = Form.useWatch("discPct", form) ?? 0;
  const taxable = Form.useWatch("taxable", form) ?? true;
  const vatClass = Form.useWatch("vatClass", form);
  const vatPct = master?.vatClasses.find((v) => v.code === vatClass)?.pct ?? 0;
  const totals = calcTotals(lines, discPct, taxable && !!vatClass, vatPct);

  const initialValues: Partial<FormValues> = pr
    ? toFormValues(pr)
    : {
        prDate: dayjs(),
        needDate: dayjs(),
        taxable: true,
        discPct: 0,
        divCode: me.divCode ?? undefined,
        lines: [{ ...emptyLine }],
      };

  // ค่าเริ่มต้นที่ต้องรอ master data (บริษัทหลัก, ประเภทภาษีหลัก)
  useEffect(() => {
    if (pr || !master || form.getFieldValue("entity")) return;
    form.setFieldsValue({
      entity: master.entities.find((e) => e.primary)?.code,
      vatClass: master.vatClasses.find((v) => v.primary)?.code,
    });
  }, [pr, master, form]);

  async function onFinish(v: FormValues) {
    const body: SavePrInput = {
      prDate: v.prDate.format("YYYY-MM-DD"),
      needDate: v.needDate?.format("YYYY-MM-DD"),
      vend: v.vend,
      request: v.request,
      entity: v.entity,
      remark: v.remark,
      remark1: v.remark1,
      discPct: v.discPct ?? 0,
      taxable: v.taxable,
      vatClass: v.vatClass,
      divCode: v.divCode,
      lines: v.lines.map((l) => ({
        part: l.part || undefined,
        desc: (l.desc ?? "").trim(),
        um: l.um || undefined,
        qty: Number(l.qty),
        price: Number(l.price ?? 0),
      })),
    };
    setSaving(true);
    try {
      const saved = pr
        ? await api<PrDetail>(prPath(pr.nbr), { method: "PUT", body })
        : await api<PrDetail>("/pr", { method: "POST", body });
      message.success(pr ? `บันทึกใบเสนอซื้อ ${saved.nbr} แล้ว` : `สร้างใบเสนอซื้อเลขที่ ${saved.nbr} แล้ว`);
      router.push(`/pr/view?nbr=${encodeURIComponent(saved.nbr)}`);
    } catch (e) {
      message.error((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <Form<FormValues>
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={onFinish}
      onFinishFailed={() => message.warning("กรุณากรอกข้อมูลให้ครบถ้วน")}
      scrollToFirstError
    >
      <Card
        title={
          <Typography.Title level={4} style={{ margin: 0 }}>
            {pr ? `แก้ไขใบเสนอซื้อ ${pr.nbr}` : "สร้างใบเสนอซื้อ"}
          </Typography.Title>
        }
        extra={
          <Space>
            <Button onClick={() => router.back()}>ยกเลิก</Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
              บันทึก
            </Button>
          </Space>
        }
      >
        {/* ---------- บันทึกรายการเสนอซื้อ (หัวเอกสาร) ---------- */}
        <Divider titlePlacement="start" style={{ marginTop: 0 }}>
          บันทึกรายการเสนอซื้อ
        </Divider>
        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Form.Item label="ใบเสนอซื้อ #">
              <Input value={pr?.nbr ?? "(ออกเลขอัตโนมัติ)"} disabled />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="prDate" label="วันที่" rules={[{ required: true, message: "กรุณาเลือกวันที่" }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item
              name="needDate"
              label="วันที่ต้องการรับ"
              dependencies={["prDate"]}
              rules={[
                ({ getFieldValue }) => ({
                  validator: (_, v: Dayjs | null) =>
                    !v || !getFieldValue("prDate") || !v.isBefore(getFieldValue("prDate"), "day")
                      ? Promise.resolve()
                      : Promise.reject(new Error("ต้องไม่น้อยกว่าวันที่เอกสาร")),
                }),
              ]}
            >
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="entity" label="บริษัท" rules={[{ required: true, message: "กรุณาเลือกบริษัท" }]}>
              <Select
                loading={!master}
                options={master?.entities.map((e) => ({ value: e.code, label: `${e.code}  ${e.name}` }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="vend" label="ผู้ขาย" rules={[{ required: true, message: "กรุณาเลือกผู้ขาย" }]}>
              <VendorSelect
                onChange={(_, vendor) => {
                  if (vendor?.vatClass && master?.vatClasses.some((v) => v.code === vendor.vatClass)) {
                    form.setFieldsValue({ vatClass: vendor.vatClass });
                  }
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="request" label="ผู้ขอซื้อ" rules={[{ max: 24 }]}>
              <Input maxLength={24} showCount placeholder="ชื่อผู้ขอซื้อ" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="divCode"
              label="หน่วยงาน"
              tooltip={me.divCode ? "กำหนดตามหน่วยงานของผู้ใช้ — เปลี่ยนไม่ได้" : "ไม่ระบุได้ (PR จะไม่สังกัดหน่วยงานใด)"}
            >
              <Select
                allowClear={!me.divCode}
                disabled={!!me.divCode}
                showSearch={{ optionFilterProp: "label" }}
                placeholder="ไม่ระบุ"
                loading={!master}
                options={divisionOptions(master?.divisions)}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="remark" label="หมายเหตุ">
              <Input maxLength={120} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="remark1" label="หมายเหตุ (บรรทัด 2)">
              <Input maxLength={120} />
            </Form.Item>
          </Col>
        </Row>

        {/* ---------- รายการสินค้า ---------- */}
        <Divider titlePlacement="start">รายการสินค้า</Divider>
        <Form.List
          name="lines"
          rules={[
            {
              validator: async (_, v: LineValues[]) => {
                if (!v?.length) throw new Error("ต้องมีรายการสินค้าอย่างน้อย 1 รายการ");
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <>
              <Table
                size="small"
                pagination={false}
                dataSource={fields}
                rowKey="key"
                scroll={{ x: 1000 }}
                columns={[
                  { title: "ลำดับ", width: 60, align: "center", render: (_, __, i) => i + 1 },
                  {
                    title: "รหัสสินค้า",
                    width: 170,
                    render: (_, f) => (
                      <Form.Item name={[f.name, "part"]} noStyle>
                        <ItemCodeInput
                          onPick={(it) =>
                            form.setFieldValue(["lines", f.name], {
                              ...form.getFieldValue(["lines", f.name]),
                              part: it.code,
                              desc: it.name.slice(0, 120),
                              um: it.um.slice(0, 9),
                              price: it.price || form.getFieldValue(["lines", f.name, "price"]),
                            })
                          }
                        />
                      </Form.Item>
                    ),
                  },
                  {
                    title: "ชื่อสินค้า / รายละเอียด",
                    render: (_, f) => (
                      <Form.Item
                        name={[f.name, "desc"]}
                        rules={[{ required: true, whitespace: true, message: "กรอกรายละเอียด" }]}
                        style={{ margin: 0 }}
                      >
                        <Input maxLength={120} />
                      </Form.Item>
                    ),
                  },
                  {
                    title: "หน่วยนับ",
                    width: 110,
                    render: (_, f) => (
                      <Form.Item name={[f.name, "um"]} noStyle>
                        <AutoComplete
                          options={master?.units.map((u) => ({ value: u }))}
                          style={{ width: "100%" }}
                          maxLength={9}
                          showSearch={{
                            filterOption: (input, o) =>
                              String(o?.value ?? "").toLowerCase().includes(input.toLowerCase()),
                          }}
                        />
                      </Form.Item>
                    ),
                  },
                  {
                    title: "จำนวน",
                    width: 120,
                    render: (_, f) => (
                      <Form.Item
                        name={[f.name, "qty"]}
                        rules={[{ required: true, type: "number", min: 0.0001, message: "> 0" }]}
                        style={{ margin: 0 }}
                      >
                        <InputNumber min={0} precision={2} style={{ width: "100%" }} />
                      </Form.Item>
                    ),
                  },
                  {
                    title: "ราคา/หน่วย",
                    width: 140,
                    render: (_, f) => (
                      <Form.Item name={[f.name, "price"]} style={{ margin: 0 }}>
                        <InputNumber
                          min={0}
                          precision={2}
                          style={{ width: "100%" }}
                          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          parser={(v) => Number((v ?? "").replace(/,/g, "")) as 0}
                        />
                      </Form.Item>
                    ),
                  },
                  {
                    title: "จำนวนเงิน",
                    width: 130,
                    align: "right",
                    render: (_, f) => {
                      const l = lines[f.name];
                      return fmtNum((l?.qty ?? 0) * (l?.price ?? 0));
                    },
                  },
                  {
                    title: "",
                    width: 50,
                    render: (_, f) => (
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={fields.length <= 1}
                        onClick={() => remove(f.name)}
                      />
                    ),
                  },
                ]}
              />
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => add({ ...emptyLine })}
                style={{ marginTop: 8 }}
                block
              >
                เพิ่มรายการ
              </Button>
              <Form.ErrorList errors={errors} />
            </>
          )}
        </Form.List>

        {/* ---------- ราคา / ส่วนลด / ภาษี ---------- */}
        <Divider titlePlacement="start">ราคา / ส่วนลด / ภาษี</Divider>
        <Row gutter={24}>
          <Col xs={24} md={10}>
            <Form.Item name="discPct" label="% ส่วนลด">
              <InputNumber min={0} max={100} precision={2} suffix="%" style={{ width: 160 }} />
            </Form.Item>
            <Space size="large" align="start">
              <Form.Item name="vatClass" label="ประเภทภาษี">
                <Select
                  allowClear
                  style={{ width: 160 }}
                  options={master?.vatClasses.map((v) => ({ value: v.code, label: v.desc || v.code }))}
                />
              </Form.Item>
              <Form.Item name="taxable" label="คิดภาษี" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Space>
          </Col>
          <Col xs={24} md={14}>
            <Descriptions
              column={1}
              size="small"
              bordered
              styles={{ label: { width: 200 }, content: { textAlign: "right" } }}
              items={[
                { label: "รวมราคาสินค้า", children: fmtNum(totals.subtotal) },
                { label: `มูลค่าส่วนลด (${discPct || 0}%)`, children: fmtNum(totals.discAmt) },
                { label: "รวมราคา", children: fmtNum(totals.afterDisc) },
                {
                  label: `มูลค่าภาษี (${taxable && vatClass ? vatPct : 0}%)`,
                  children: fmtNum(totals.vatAmt),
                },
                {
                  label: <b>รวมราคาสุทธิ</b>,
                  children: <b style={{ fontSize: 16 }}>{fmtNum(totals.net)}</b>,
                },
              ]}
            />
          </Col>
        </Row>
      </Card>
    </Form>
  );
}
