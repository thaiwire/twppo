"use client";

import { MASTER } from "@/components/master/config";
import MasterList from "@/components/master/MasterList";
import { fmtNum } from "@/lib/format";
import type { ItemRecord } from "@/lib/types";

export default function ItemsPage() {
  return (
    <MasterList<ItemRecord>
      {...MASTER.items}
      searchPlaceholder="รหัส / ชื่อสินค้า"
      columns={[
        { title: "รหัสสินค้า", dataIndex: "code", width: 140, fixed: "left", render: (v: string) => v.trim() },
        { title: "ชื่อสินค้า", dataIndex: "name1", ellipsis: true },
        { title: "กลุ่ม", dataIndex: "group", width: 90 },
        { title: "หน่วย", dataIndex: "um", width: 80 },
        { title: "ราคา", dataIndex: "price", width: 120, align: "right", render: (v: number) => fmtNum(v) },
        { title: "ผู้ขายหลัก", dataIndex: "vend", width: 110 },
        { title: "Site", dataIndex: "site", width: 80 },
      ]}
    />
  );
}
