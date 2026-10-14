import RequireMaster from "@/components/master/RequireMaster";

/** รายงานข้อมูลหลัก — เฉพาะ manager / admin */
export default function MasterReportsLayout({ children }: { children: React.ReactNode }) {
  return <RequireMaster>{children}</RequireMaster>;
}
