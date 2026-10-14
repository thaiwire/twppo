# สร้าง template รายงานข้อมูลหลัก (Vendors.frx, Items.frx, Entities.frx) ให้หน้าตาเหมือนกัน
# รัน: python report/tools/gen_master_reports.py  (แก้ไข .frx ต่อด้วย FastReport Designer ได้)
import os
from xml.sax.saxutils import escape, quoteattr

OUT = os.path.join(os.path.dirname(__file__), "..", "Reports")
NUM = ('Format="Number" Format.UseLocale="false" Format.DecimalDigits="2" '
       'Format.DecimalSeparator="." Format.GroupSeparator="," Format.NegativePattern="1"')

# (ชื่อคอลัมน์ข้อมูล, หัวคอลัมน์, ความกว้าง px, ชนิด: s=ข้อความ n=ตัวเลข 2 ตำแหน่ง i=จำนวนเต็ม c=กึ่งกลาง)
REPORTS = {
    "Vendors": dict(landscape=True, cols=[
        ("No", "ที่", 35, "c"), ("Code", "รหัส", 85, "s"), ("Name", "ชื่อผู้ขาย", 250, "s"),
        ("Address", "ที่อยู่", 285, "s"), ("Tel", "โทรศัพท์", 130, "s"), ("TaxId", "เลขผู้เสียภาษี", 110, "s"),
        ("Credit", "เครดิต", 50, "c"), ("Vat", "ภาษี", 40, "c"), ("Status", "สถานะ", 62, "c")]),
    "Items": dict(landscape=True, cols=[
        ("No", "ที่", 35, "c"), ("Code", "รหัสสินค้า", 110, "s"), ("Name", "ชื่อสินค้า", 350, "s"),
        ("Group", "กลุ่ม", 70, "s"), ("Um", "หน่วย", 60, "c"), ("Price", "ราคา", 90, "n"),
        ("StdCost", "ต้นทุนมาตรฐาน", 90, "n"), ("CurCost", "ต้นทุนล่าสุด", 90, "n"),
        ("Vend", "ผู้ขายหลัก", 90, "s"), ("Site", "Site", 62, "c")]),
    "Divisions": dict(landscape=False, cols=[
        ("No", "ที่", 35, "c"), ("Code", "รหัสหน่วยงาน", 120, "s"), ("Name", "ชื่อหน่วยงาน", 443.2, "s"),
        ("Users", "จำนวนผู้ใช้", 120, "i")]),
    "Entities": dict(landscape=False, cols=[
        ("No", "ที่", 35, "c"), ("Code", "รหัส", 100, "s"), ("Name", "ชื่อบริษัท", 380, "s"),
        ("Currency", "สกุลเงิน", 80, "c"), ("Primary", "บริษัทหลัก", 123.2, "c")]),
}

HEADER_COLS = ["Title", "Filter", "Note", "PrintedBy", "PrintedAt"]


def text(name, left, top, width, height, value, extra=""):
    return (f'      <TextObject Name="{name}" Left="{left}" Top="{top}" Width="{width}" Height="{height}" '
            f'Text={quoteattr(value)} {extra}/>')


def build(name, landscape, cols):
    width = sum(c[2] for c in cols)
    paper = 'PaperWidth="297" PaperHeight="210" Landscape="true"' if landscape else 'PaperWidth="210" PaperHeight="297"'
    lines = []
    a = lines.append
    a('<?xml version="1.0" encoding="utf-8"?>')
    a(f'<Report ScriptLanguage="CSharp" DoublePass="true" ReportInfo.Name="{name}" ReportInfo.Author="mtp_po_web">')
    a('  <Dictionary>')
    a('    <TableDataSource Name="Header" ReferenceName="Data.Header" DataType="System.Int32" Enabled="true">')
    for c in HEADER_COLS:
        a(f'      <Column Name="{c}" DataType="System.String"/>')
    a('      <Column Name="Count" DataType="System.Decimal"/>')
    a('      <Column Name="Total" DataType="System.Decimal"/>')
    a('    </TableDataSource>')
    a('    <TableDataSource Name="Rows" ReferenceName="Data.Rows" DataType="System.Int32" Enabled="true">')
    for key, _, _, kind in cols:
        dt = "System.Decimal" if kind in ("n", "i") or key == "No" else "System.String"
        a(f'      <Column Name="{key}" DataType="{dt}"/>')
    a('    </TableDataSource>')
    a('  </Dictionary>')
    a(f'  <ReportPage Name="Page1" {paper} LeftMargin="10" TopMargin="10" RightMargin="10" BottomMargin="10">')

    # ---------------- หัวกระดาษ + หัวตาราง (ซ้ำทุกหน้า)
    a(f'    <PageHeaderBand Name="PageHeader1" Width="{width}" Height="92">')
    a(text("txtTitle", 0, 0, width, 26, "[Header.Title]", 'HorzAlign="Center" Font="Tahoma, 13pt, style=Bold"'))
    a(text("txtFilter", 0, 28, width * 0.6, 18, "เงื่อนไข: [Header.Filter]", 'Font="Tahoma, 8pt"'))
    a(text("txtPrinted", width * 0.6, 28, width * 0.4, 18, "พิมพ์โดย [Header.PrintedBy]  [Header.PrintedAt]",
           'HorzAlign="Right" Font="Tahoma, 8pt"'))
    a(text("txtNote", 0, 46, width, 18, "[Header.Note]", 'Font="Tahoma, 8pt, style=Bold" TextFill.Color="Firebrick"'))
    left = 0
    for i, (key, title, w, _) in enumerate(cols):
        a(text(f"h{key}", left, 66, w, 26, title,
               'Border.Lines="All" Fill.Color="Gainsboro" HorzAlign="Center" VertAlign="Center" '
               'Font="Tahoma, 8pt, style=Bold" WordWrap="true"'))
        left += w
    a('    </PageHeaderBand>')

    # ---------------- แถวข้อมูล
    a(f'    <DataBand Name="Data1" Top="96" Width="{width}" Height="18" CanGrow="true" DataSource="Rows">')
    left = 0
    for key, _, w, kind in cols:
        align = {"n": 'HorzAlign="Right"', "i": 'HorzAlign="Right"', "c": 'HorzAlign="Center"', "s": ""}[kind]
        fmt = NUM if kind == "n" else ('Format="Number" Format.UseLocale="false" Format.DecimalDigits="0" '
                                      'Format.DecimalSeparator="." Format.GroupSeparator="," Format.NegativePattern="1"'
                                      if key == "No" or kind == "i" else "")
        a(text(f"d{key}", left, 0, w, 18, f"[Rows.{key}]",
               f'Border.Lines="All" Border.Color="Silver" CanGrow="true" GrowToBottom="true" '
               f'Padding="3, 2, 3, 0" Font="Tahoma, 8pt" WordWrap="true" {align} {fmt}'))
        left += w
    a('    </DataBand>')

    # ---------------- สรุปท้ายรายงาน
    a(f'    <ReportSummaryBand Name="Summary1" Top="118" Width="{width}" Height="24">')
    a(text("txtCount", 0, 4, width, 18, "รวม [Header.Count] รายการ",
           'HorzAlign="Right" Font="Tahoma, 9pt, style=Bold" ' + NUM.replace('DecimalDigits="2"', 'DecimalDigits="0"')))
    a('    </ReportSummaryBand>')

    # ---------------- ท้ายกระดาษ
    a(f'    <PageFooterBand Name="PageFooter1" Top="146" Width="{width}" Height="20">')
    a(f'      <LineObject Name="footLine" Width="{width}" Border.Width="0.5"/>')
    a(text("txtPage", width - 200, 2, 200, 18, "หน้า [Page#] / [TotalPages#]", 'HorzAlign="Right" Font="Tahoma, 7pt"'))
    a('    </PageFooterBand>')
    a('  </ReportPage>')
    a('</Report>')
    return "\n".join(lines) + "\n"


for name, cfg in REPORTS.items():
    with open(os.path.join(OUT, f"{name}.frx"), "w", encoding="utf-8") as f:
        f.write(build(name, cfg["landscape"], cfg["cols"]))
    print("wrote", name, "width", sum(c[2] for c in cfg["cols"]))
