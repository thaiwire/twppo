"use client";

import { Col, Form, Input, Row } from "antd";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CodeRangeFields, SortField } from "@/components/reports/MasterReportFields";
import ReportPage from "@/components/reports/ReportPage";

interface EntityReportForm {
  codeFrom?: string;
  codeTo?: string;
  name?: string;
  sort: "code" | "name";
}

function EntityReportCriteria() {
  const params = useSearchParams();
  return (
    <ReportPage<EntityReportForm>
      title="รายงานบริษัท"
      description="เลือกเงื่อนไขแล้วกดออกรายงาน"
      endpoint="/admin/entities/report"
      initialValues={{ name: params.get("name") ?? undefined, sort: "code" }}
      toParams={(v) => ({ ...v })}
    >
      <Row gutter={16}>
        <CodeRangeFields codeLabel="รหัสบริษัท" />
        <Col xs={24} md={12}>
          <Form.Item name="name" label="คำค้นหา (รหัส / ชื่อบริษัท มีคำว่า)">
            <Input allowClear />
          </Form.Item>
        </Col>
        <SortField />
      </Row>
    </ReportPage>
  );
}

export default function EntityReportPage() {
  return (
    <Suspense>
      <EntityReportCriteria />
    </Suspense>
  );
}
