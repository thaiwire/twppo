"use client";

import { Button, Result } from "antd";
import Link from "next/link";
import { useMe } from "@/components/AuthContext";

/** แสดงเนื้อหาเฉพาะ role admin (backend ตรวจสิทธิ์ซ้ำอีกชั้น) */
export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const me = useMe();
  if (!me.isAdmin) {
    return (
      <Result
        status="403"
        title="ไม่มีสิทธิ์เข้าถึง"
        subTitle="เมนู Admin ใช้ได้เฉพาะผู้ดูแลระบบ (admin) เท่านั้น"
        extra={
          <Link href="/home">
            <Button type="primary">กลับหน้าแรก</Button>
          </Link>
        }
      />
    );
  }
  return children;
}
