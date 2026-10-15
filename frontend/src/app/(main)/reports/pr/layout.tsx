import RequireModule from "@/components/RequireModule";

/** พิมพ์ใบเสนอซื้อ — module pr */
export default function PrReportLayout({ children }: { children: React.ReactNode }) {
  return <RequireModule module="pr">{children}</RequireModule>;
}
