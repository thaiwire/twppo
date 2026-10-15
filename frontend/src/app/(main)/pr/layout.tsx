import RequireModule from "@/components/RequireModule";

/** หน้าใบเสนอซื้อทั้งหมด — module pr (อนุมัติ/ปิด-เปิด ต้องระดับ manager: ตรวจในหน้าดู PR) */
export default function PrLayout({ children }: { children: React.ReactNode }) {
  return <RequireModule module="pr">{children}</RequireModule>;
}
