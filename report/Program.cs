// FastReport service — รับข้อมูลเป็นตาราง JSON จาก backend (NestJS) แล้วเรนเดอร์ไฟล์ .frx เป็น PDF
//   POST /render/{name}   body: { "tables": { "Header": [ {...} ], "Lines": [ {...}, ... ] } }
//   GET  /health
// template อยู่ในโฟลเดอร์ Reports/{name}.frx (แก้ไขได้ด้วย FastReport Designer Community Edition)
// ใน .frx อ้างอิงตารางด้วย ReferenceName="Data.<ชื่อตาราง>" เช่น [Header.Nbr], [Lines.Qty]
using System.Data;
using System.Text.Json;
using FastReport;
using FastReport.Export.Image;
using FastReport.Export.PdfSimple;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
var reportDir = Path.Combine(AppContext.BaseDirectory, "Reports");

app.MapGet("/health", () => Results.Ok(new { ok = true, reports = Directory.GetFiles(reportDir, "*.frx").Select(Path.GetFileNameWithoutExtension) }));

app.MapPost("/render/{name}", async (string name, HttpRequest req, ILogger<Program> log) =>
{
    if (name.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0 || name.Contains(".."))
        return Results.BadRequest("invalid report name");
    var file = Path.Combine(reportDir, name + ".frx");
    if (!File.Exists(file)) return Results.NotFound($"report '{name}' not found");

    using var doc = await JsonDocument.ParseAsync(req.Body);
    if (!doc.RootElement.TryGetProperty("tables", out var tables) || tables.ValueKind != JsonValueKind.Object)
        return Results.BadRequest("body must be { tables: { <name>: [rows] } }");

    try
    {
        using var ds = ToDataSet(tables);
        using var report = new Report();
        report.Load(file);
        report.RegisterData(ds, "Data");
        foreach (DataTable t in ds.Tables)
        {
            var src = report.GetDataSource(t.TableName);
            if (src != null) src.Enabled = true;
        }
        report.Prepare();

        using var ms = new MemoryStream();
        if (req.Query["format"] == "png")
        {
            // ภาพตัวอย่าง 1 หน้า (ใช้ตรวจ layout) — ?format=png&page=2
            var img = new ImageExport { ImageFormat = ImageExportFormat.Png, Resolution = 110, SeparateFiles = false, PageRange = PageRange.PageNumbers, PageNumbers = req.Query["page"].FirstOrDefault() ?? "1" };
            report.Export(img, ms);
            return Results.File(ms.ToArray(), "image/png");
        }
        // PDF แบบภาพ (PdfSimple): ปรับความคมชัด/ขนาดไฟล์ได้ด้วย ?dpi=&quality= (ค่าเริ่มต้น 200 / 90)
        int Q(string key, int def, int min, int max) =>
            int.TryParse(req.Query[key], out var v) ? Math.Clamp(v, min, max) : def;
        var pdf = new PDFSimpleExport { ImageDpi = Q("dpi", 200, 72, 300), JpegQuality = Q("quality", 90, 30, 100) };
        report.Export(pdf, ms);
        return Results.File(ms.ToArray(), "application/pdf", $"{name}.pdf");
    }
    catch (Exception ex)
    {
        log.LogError(ex, "render {Name} failed", name);
        return Results.Problem(ex.Message);
    }
});

app.Run();

static DataSet ToDataSet(JsonElement tables)
{
    var ds = new DataSet("Data");
    foreach (var t in tables.EnumerateObject())
    {
        var dt = new DataTable(t.Name);
        var rows = t.Value.ValueKind == JsonValueKind.Array ? t.Value.EnumerateArray().ToList() : [];
        // สร้างคอลัมน์จาก key ของทุกแถว: ตัวเลข → decimal, boolean → bool, อื่นๆ → string
        foreach (var row in rows)
            foreach (var p in row.EnumerateObject())
                if (!dt.Columns.Contains(p.Name))
                    dt.Columns.Add(p.Name, p.Value.ValueKind switch
                    {
                        JsonValueKind.Number => typeof(decimal),
                        JsonValueKind.True or JsonValueKind.False => typeof(bool),
                        _ => typeof(string),
                    });
        foreach (var row in rows)
        {
            var dr = dt.NewRow();
            foreach (var p in row.EnumerateObject())
                dr[p.Name] = p.Value.ValueKind switch
                {
                    JsonValueKind.Number => p.Value.GetDecimal(),
                    JsonValueKind.True => true,
                    JsonValueKind.False => false,
                    JsonValueKind.Null or JsonValueKind.Undefined => DBNull.Value,
                    _ => p.Value.ToString(),
                };
            dt.Rows.Add(dr);
        }
        ds.Tables.Add(dt);
    }
    return ds;
}
