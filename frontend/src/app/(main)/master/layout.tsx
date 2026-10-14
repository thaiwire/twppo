import RequireMaster from "@/components/master/RequireMaster";

/** หน้าข้อมูลหลักทั้งหมด — เฉพาะ manager / admin */
export default function MasterLayout({ children }: { children: React.ReactNode }) {
  return <RequireMaster>{children}</RequireMaster>;
}
