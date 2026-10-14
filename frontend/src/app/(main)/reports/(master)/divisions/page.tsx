"use client";

import { Col, Form, Input, Row } from "antd";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CodeRangeFields, SortField } from "@/components/reports/MasterReportFields";
import ReportPage from "@/components/reports/ReportPage";

interface DivisionReportForm {
  codeFrom?: string;
  codeTo?: string;
  name?: string;
  sort: "code" | "name";
}

function DivisionReportCriteria() {
  const params = useSearchParams();
  return (
    <ReportPage<DivisionReportForm>
      title="รายงานหน่วยงาน"
      description="เลือกเงื่อนไขแล้วกดออกรายงาน"
      endpoint="/admin/divisions/report"
      initialValues={{ name: params.get("name") ?? undefined, sort: "code" }}
      toParams={(v) => ({ ...v })}
    >
      <Row gutter={16}>
        <CodeRangeFields codeLabel="รหัสหน่วยงาน" />
        <Col xs={24} md={12}>
          <Form.Item name="name" label="คำค้นหา (รหัส / ชื่อหน่วยงาน มีคำว่า)">
            <Input allowClear />
          </Form.Item>
        </Col>
        <SortField />
      </Row>
    </ReportPage>
  );
}

export default function DivisionReportPage() {
  return (
    <Suspense>
      <DivisionReportCriteria />
    </Suspense>
  );
}
