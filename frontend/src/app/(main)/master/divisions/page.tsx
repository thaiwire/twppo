"use client";

import { MASTER } from "@/components/master/config";
import MasterList from "@/components/master/MasterList";
import type { DivisionRecord } from "@/lib/types";

export default function DivisionsPage() {
  return (
    <MasterList<DivisionRecord>
      {...MASTER.divisions}
      searchPlaceholder="รหัส / ชื่อหน่วยงาน"
      deleteBlocked={(r) =>
        r.userCount || r.prCount
          ? `ลบไม่ได้ — มีผู้ใช้ ${r.userCount} คน / ใบ PR ${r.prCount} ใบ อยู่ในหน่วยงานนี้`
          : undefined
      }
      columns={[
        { title: "รหัส", dataIndex: "code", width: 140 },
        { title: "ชื่อหน่วยงาน", dataIndex: "name" },
        { title: "ผู้ใช้", dataIndex: "userCount", width: 90, align: "right" },
        { title: "ใบ PR", dataIndex: "prCount", width: 90, align: "right" },
        { title: "แก้ไขล่าสุด", dataIndex: "updatedAt", width: 170 },
      ]}
    />
  );
}
