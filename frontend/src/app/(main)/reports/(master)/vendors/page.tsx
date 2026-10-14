"use client";

import { Alert, AutoComplete, Col, Form, Input, Row, Select } from "antd";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CodeRangeFields, LIMIT_NOTE, SortField } from "@/components/reports/MasterReportFields";
import ReportPage from "@/components/reports/ReportPage";
import { toOptions, useAdminLookups } from "@/lib/adminLookups";
import { useMaster } from "@/lib/master";

interface VendorReportForm {
  codeFrom?: string;
  codeTo?: string;
  name?: string;
  status?: "active" | "inactive";
  group?: string;
  vatClass?: string;
  creditTerm?: string;
  sort: "code" | "name";
}

function VendorReportCriteria() {
  const params = useSearchParams();
  const lk = useAdminLookups();
  const master = useMaster();

  return (
    <ReportPage<VendorReportForm>
      title="รายงานผู้ขาย"
      description="เลือกเงื่อนไขแล้วกดออกรายงาน"
      endpoint="/admin/vendors/report"
      initialValues={{
        // มาจากปุ่ม "พิมพ์รายงาน" ในหน้ารายการ → ใช้คำค้นหา/สถานะเดิม
        name: params.get("name") ?? undefined,
        status: (params.get("status") as VendorReportForm["status"]) ?? "active",
        sort: "code",
      }}
      toParams={(v) => ({ ...v })}
      note={<Alert type="info" showIcon title={LIMIT_NOTE} />}
    >
      <Row gutter={16}>
        <CodeRangeFields codeLabel="รหัสผู้ขาย" />
        <Col xs={24} md={12}>
          <Form.Item name="name" label="คำค้นหา (รหัส / ชื่อ / ชื่อย่อ มีคำว่า)">
            <Input allowClear />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="status" label="สถานะ">
            <Select
              allowClear
              placeholder="ทั้งหมด"
              options={[
                { value: "active", label: "ใช้งาน" },
                { value: "inactive", label: "ไม่ใช้งาน" },
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="creditTerm" label="เครดิต (วัน)">
            <AutoComplete allowClear options={toOptions(lk?.creditTerms)} placeholder="ทั้งหมด" />
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
        <Col xs={12} md={6}>
          <Form.Item name="group" label="กลุ่มผู้ขาย">
            <AutoComplete allowClear options={toOptions(lk?.vendorGroups)} placeholder="ทั้งหมด" />
          </Form.Item>
        </Col>
        <SortField />
      </Row>
    </ReportPage>
  );
}

export default function VendorReportPage() {
  return (
    <Suspense>
      <VendorReportCriteria />
    </Suspense>
  );
}
