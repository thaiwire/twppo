"use client";

import { Alert, Col, DatePicker, Form, Input, Row, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ReportPage from "@/components/reports/ReportPage";
import VendorSelect from "@/components/VendorSelect";
import { useMe } from "@/components/AuthContext";
import { divisionOptions, useMaster } from "@/lib/master";

interface PrPrintForm {
  nbrFrom?: string;
  nbrTo?: string;
  dates?: [Dayjs | null, Dayjs | null] | null;
  vend?: string;
  entity?: string;
  status?: "O" | "C";
  approve?: "Y" | "N";
  div?: string;
}

function PrPrintCriteria() {
  const params = useSearchParams();
  const master = useMaster();
  const me = useMe();
  // มาจากปุ่มพิมพ์ในหน้า PR → เติมเลขที่ใบนั้นให้
  const nbr = params.get("nbr") ?? undefined;
  const initial: PrPrintForm = nbr
    ? { nbrFrom: nbr, nbrTo: nbr }
    : { dates: [dayjs().startOf("month"), dayjs()] };

  return (
    <ReportPage<PrPrintForm>
      title="พิมพ์ใบเสนอซื้อ"
      description="เลือกเงื่อนไขแล้วกดออกรายงาน — พิมพ์ได้หลายใบในไฟล์เดียว (ใบละชุดหน้า)"
      endpoint="/pr/print"
      initialValues={initial}
      toParams={(v) => ({
        nbrFrom: v.nbrFrom?.trim(),
        nbrTo: v.nbrTo?.trim(),
        dateFrom: v.dates?.[0]?.format("YYYY-MM-DD"),
        dateTo: v.dates?.[1]?.format("YYYY-MM-DD"),
        vend: v.vend,
        entity: v.entity,
        status: v.status,
        approve: v.approve,
        div: v.div,
      })}
      note={
        <Alert
          type="info"
          showIcon
          title="ต้องระบุช่วงเลขที่หรือช่วงวันที่อย่างน้อย 1 อย่าง — พิมพ์ได้ครั้งละไม่เกิน 200 ใบ"
        />
      }
    >
      <Row gutter={16}>
        <Col xs={12} md={6}>
          <Form.Item name="nbrFrom" label="เลขที่ ตั้งแต่">
            <Input allowClear placeholder="เช่น PR0000001" />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item
            name="nbrTo"
            label="ถึงเลขที่"
            dependencies={["nbrFrom"]}
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, v?: string) => {
                  const from = (getFieldValue("nbrFrom") as string | undefined)?.trim();
                  return !v || !from || from.localeCompare(v.trim(), "en", { sensitivity: "base" }) <= 0
                    ? Promise.resolve()
                    : Promise.reject(new Error("ต้องไม่น้อยกว่าเลขที่เริ่มต้น"));
                },
              }),
            ]}
          >
            <Input allowClear placeholder="เช่น PR0000099" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="dates" label="วันที่เอกสาร">
            <DatePicker.RangePicker
              format="DD/MM/YYYY"
              allowEmpty={[true, true]}
              style={{ width: "100%" }}
              placeholder={["ตั้งแต่วันที่", "ถึงวันที่"]}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="vend" label="ผู้ขาย">
            <VendorSelect />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="entity" label="บริษัท">
            <Select
              allowClear
              placeholder="ทุกบริษัท"
              options={master?.entities.map((e) => ({ value: e.code, label: `${e.code}  ${e.name}` }))}
            />
          </Form.Item>
        </Col>
        {/* ผู้ใช้ที่มีหน่วยงาน พิมพ์ได้เฉพาะของหน่วยงานตัวเองอยู่แล้ว (backend บังคับ) */}
        {!me.divCode && (
          <Col xs={24} md={12}>
            <Form.Item name="div" label="หน่วยงาน">
              <Select
                allowClear
                placeholder="ทุกหน่วยงาน"
                options={[{ value: "-", label: "(ไม่ระบุหน่วยงาน)" }, ...divisionOptions(master?.divisions)]}
              />
            </Form.Item>
          </Col>
        )}
        <Col xs={12} md={6}>
          <Form.Item name="status" label="สถานะ">
            <Select
              allowClear
              placeholder="ทั้งหมด"
              options={[
                { value: "O", label: "เปิด" },
                { value: "C", label: "ปิด" },
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="approve" label="การอนุมัติ">
            <Select
              allowClear
              placeholder="ทั้งหมด"
              options={[
                { value: "Y", label: "อนุมัติแล้ว" },
                { value: "N", label: "รออนุมัติ" },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>
    </ReportPage>
  );
}

export default function PrPrintPage() {
  return (
    <Suspense>
      <PrPrintCriteria />
    </Suspense>
  );
}
