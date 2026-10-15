/** รายละเอียดสินค้า + หมายเหตุรายการ (ตัวเล็กสีเทา บรรทัดละ 1 หมายเหตุ) — ใช้ในตารางรายการของฟอร์มและหน้าดู PR */
export default function LineDesc({ desc, rmk, rmk1 }: { desc?: string; rmk?: string; rmk1?: string }) {
  const remarks = [rmk, rmk1].filter(Boolean);
  return (
    <div>
      <div>{desc}</div>
      {remarks.map((r, i) => (
        <div key={i} style={{ fontSize: 12, color: "#64748b" }}>
          {r}
        </div>
      ))}
    </div>
  );
}
