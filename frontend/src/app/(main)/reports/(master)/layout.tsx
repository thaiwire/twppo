import RequireModule from "@/components/RequireModule";

/** รายงานข้อมูลหลัก — module master */
export default function MasterReportsLayout({ children }: { children: React.ReactNode }) {
  return <RequireModule module="base">{children}</RequireModule>;
}
