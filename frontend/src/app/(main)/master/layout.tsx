import RequireModule from "@/components/RequireModule";

/** หน้าข้อมูลหลักทั้งหมด — module master (เพิ่ม/แก้ไข/ลบ ต้องระดับ manager: ตรวจใน MasterList / MasterFormPage) */
export default function MasterLayout({ children }: { children: React.ReactNode }) {
  return <RequireModule module="base">{children}</RequireModule>;
}
