"use client";

import { useSearchParams } from "next/navigation";

/** อ่าน ?code= จาก URL สำหรับหน้าแก้ไข (ต้องอยู่ใน <Suspense>) */
export default function MasterEditRoute({ render }: { render: (code: string | null) => React.ReactNode }) {
  const code = useSearchParams().get("code");
  return render(code);
}
