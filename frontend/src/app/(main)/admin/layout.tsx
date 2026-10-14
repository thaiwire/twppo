import RequireAdmin from "@/components/admin/RequireAdmin";

/** เมนู Admin ทั้งหมด — เฉพาะ role admin */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RequireAdmin>{children}</RequireAdmin>;
}
