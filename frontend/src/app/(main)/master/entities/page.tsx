"use client";

import { Tag } from "antd";
import { MASTER } from "@/components/master/config";
import MasterList from "@/components/master/MasterList";
import type { EntityRecord } from "@/lib/types";

export default function EntitiesPage() {
  return (
    <MasterList<EntityRecord>
      {...MASTER.entities}
      searchPlaceholder="รหัส / ชื่อบริษัท"
      deleteBlocked={(r) => (r.primary ? "ลบบริษัทหลักไม่ได้" : undefined)}
      columns={[
        { title: "รหัส", dataIndex: "code", width: 120 },
        { title: "ชื่อบริษัท", dataIndex: "name" },
        { title: "สกุลเงิน", dataIndex: "currency", width: 100 },
        {
          title: "บริษัทหลัก",
          dataIndex: "primary",
          width: 120,
          render: (v: boolean) => (v ? <Tag color="blue">บริษัทหลัก</Tag> : null),
        },
        { title: "แก้ไขล่าสุด", dataIndex: "updatedAt", width: 170 },
      ]}
    />
  );
}
