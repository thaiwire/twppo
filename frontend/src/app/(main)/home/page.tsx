"use client";

import { Spin } from "antd";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMe } from "@/components/AuthContext";
import { homeOf } from "@/lib/modules";

/** หน้าแรกหลัง login — ส่งไปหน้าแรกของ module แรกที่ผู้ใช้มีสิทธิ์ (ไม่มีเลย = หน้าโปรไฟล์) */
export default function HomePage() {
  const me = useMe();
  const router = useRouter();
  useEffect(() => router.replace(homeOf(me)), [me, router]);
  return <Spin style={{ display: "block", marginTop: 80 }} />;
}
