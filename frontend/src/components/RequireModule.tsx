"use client";

import { Button, Result, Space } from "antd";
import Link from "next/link";
import { useMe } from "@/components/AuthContext";
import { can, MODULE_CODES, MODULES, type ModuleCode, type ModuleLevel } from "@/lib/modules";

/**
 * แสดงเนื้อหาเฉพาะผู้มีสิทธิ์ module (ระดับ `level` ขึ้นไป) — ใช้ใน layout ของแต่ละ module
 * (ซ่อนหน้าจอเพื่อความสะดวกเท่านั้น backend ตรวจสิทธิ์ซ้ำทุก request ด้วย @RequireModule)
 */
export default function RequireModule({
  module,
  level = "user",
  children,
}: {
  module: ModuleCode;
  level?: ModuleLevel;
  children: React.ReactNode;
}) {
  const me = useMe();
  if (can(me, module, level)) return children;

  const others = MODULE_CODES.filter((m) => m !== module && can(me, m));
  return (
    <Result
      status="403"
      title="ไม่มีสิทธิ์เข้าถึง"
      subTitle={
        level === "manager" && can(me, module)
          ? `ต้องมีสิทธิ์ระดับ manager ใน module ${MODULES[module].name}`
          : `คุณยังไม่ได้รับสิทธิ์ใช้งาน module ${MODULES[module].name} — ติดต่อผู้ดูแลระบบ`
      }
      extra={
        <Space wrap>
          {can(me, module) && (
            <Link href={MODULES[module].home}>
              <Button type="primary">กลับหน้า{MODULES[module].name}</Button>
            </Link>
          )}
          {others.map((m) => (
            <Link key={m} href={MODULES[m].home}>
              <Button>{MODULES[m].name}</Button>
            </Link>
          ))}
          {!others.length && !can(me, module) && (
            <Link href="/profile">
              <Button>ไปหน้าโปรไฟล์</Button>
            </Link>
          )}
        </Space>
      }
    />
  );
}
