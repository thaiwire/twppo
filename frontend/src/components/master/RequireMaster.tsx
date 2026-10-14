"use client";

import { Button, Result } from "antd";
import Link from "next/link";
import { useMe } from "@/components/AuthContext";

/** แสดงเนื้อหาเฉพาะ manager / admin (backend ตรวจสิทธิ์ซ้ำอีกชั้น) */
export default function RequireMaster({ children }: { children: React.ReactNode }) {
  const me = useMe();
  if (!me.canManageMaster) {
    return (
      <Result
        status="403"
        title="ไม่มีสิทธิ์เข้าถึง"
        subTitle="ข้อมูลหลักและรายงานข้อมูลหลักใช้ได้เฉพาะผู้ใช้ระดับ manager หรือ admin"
        extra={
          <Link href="/pr">
            <Button type="primary">กลับหน้าใบเสนอซื้อ</Button>
          </Link>
        }
      />
    );
  }
  return children;
}
