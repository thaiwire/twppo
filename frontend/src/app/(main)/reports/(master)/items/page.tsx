"use client";

import { Alert, AutoComplete, Col, Form, Input, Row, Select } from "antd";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CodeRangeFields, LIMIT_NOTE, SortField } from "@/components/reports/MasterReportFields";
import ReportPage from "@/components/reports/ReportPage";
import VendorSelect from "@/components/VendorSelect";
import { toOptions, useAdminLookups } from "@/lib/adminLookups";
import { useMaster } from "@/lib/master";

interface ItemReportForm {
  codeFrom?: string;
  codeTo?: string;
  name?: string;
  group?: string;
  vend?: string;
  site?: string;
  vatClass?: string;
  sort: "code" | "name";
}

const containsFilter = {
  filterOption: (input: string, o?: { value?: unknown }) =>
    String(o?.value ?? "").toLowerCase().includes(input.toLowerCase()),
};

function ItemReportCriteria() {
  const params = useSearchParams();
  const lk = useAdminLookups();
  const master = useMaster();

  return (
    <ReportPage<ItemReportForm>
      title="รายงานรหัสสินค้า"
      description="เลือกเงื่อนไขแล้วกดออกรายงาน"
      endpoint="/admin/items/report"
      initialValues={{ name: params.get("name") ?? undefined, sort: "code" }}
      toParams={(v) => ({ ...v })}
      note={<Alert type="info" showIcon title={LIMIT_NOTE} />}
    >
      <Row gutter={16}>
        <CodeRangeFields codeLabel="รหัสสินค้า" />
        <Col xs={24} md={12}>
          <Form.Item name="name" label="คำค้นหา (รหัส / ชื่อสินค้า มีคำว่า)">
            <Input allowClear />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="group" label="กลุ่มสินค้า">
            <AutoComplete allowClear options={toOptions(lk?.itemGroups)} showSearch={containsFilter} placeholder="ทั้งหมด" />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="site" label="Site">
            <AutoComplete allowClear options={toOptions(lk?.sites)} placeholder="ทั้งหมด" />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="vatClass" label="ประเภทภาษี">
            <Select
              allowClear
              placeholder="ทั้งหมด"
              options={master?.vatClasses.map((v) => ({ value: v.code, label: v.desc || v.code }))}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="vend" label="ผู้ขายหลัก">
            <VendorSelect />
          </Form.Item>
        </Col>
        <SortField />
      </Row>
    </ReportPage>
  );
}

export default function ItemReportPage() {
  return (
    <Suspense>
      <ItemReportCriteria />
    </Suspense>
  );
}
