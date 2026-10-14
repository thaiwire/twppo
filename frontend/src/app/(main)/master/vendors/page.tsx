"use client";

import { Tag } from "antd";
import { MASTER } from "@/components/master/config";
import MasterList from "@/components/master/MasterList";
import type { VendorRecord } from "@/lib/types";

export default function VendorsPage() {
  return (
    <MasterList<VendorRecord>
      {...MASTER.vendors}
      searchPlaceholder="รหัส / ชื่อ / ชื่อย่อ / เลขผู้เสียภาษี"
      statusFilter
      columns={[
        { title: "รหัส", dataIndex: "code", width: 120, fixed: "left" },
        { title: "ชื่อผู้ขาย", dataIndex: "name", ellipsis: true },
        { title: "โทรศัพท์", dataIndex: "tel", width: 150, ellipsis: true },
        { title: "เลขผู้เสียภาษี", dataIndex: "taxId", width: 150 },
        { title: "เครดิต (วัน)", dataIndex: "creditTerm", width: 100, align: "center" },
        { title: "ภาษี", dataIndex: "vatClass", width: 70, align: "center" },
        {
          title: "สถานะ",
          dataIndex: "active",
          width: 100,
          render: (v: boolean) => (v ? <Tag color="green">ใช้งาน</Tag> : <Tag>ไม่ใช้งาน</Tag>),
        },
      ]}
    />
  );
}
