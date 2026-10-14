"use client";

import { Alert, Card, Skeleton } from "antd";
import { useSearchParams } from "next/navigation";
import PrForm from "@/components/PrForm";
import { usePr } from "@/lib/usePr";

export default function EditPr() {
  const nbr = useSearchParams().get("nbr");
  const { pr, error } = usePr(nbr);

  if (error) return <Alert type="error" title={error} showIcon />;
  if (!pr) return <Card><Skeleton active /></Card>;
  if (pr.approved || pr.status === "C" || pr.locked) {
    return (
      <Alert
        type="warning"
        showIcon
        title={`ใบเสนอซื้อ ${pr.nbr} แก้ไขไม่ได้`}
        description={
          pr.approved
            ? "อนุมัติแล้ว — ต้องยกเลิกอนุมัติก่อนจึงจะแก้ไขได้"
            : pr.status === "C"
              ? "ใบเสนอซื้อปิดแล้ว"
              : "มีรายการถูกนำไปออกใบสั่งซื้อแล้ว"
        }
      />
    );
  }
  return <PrForm pr={pr} />;
}
