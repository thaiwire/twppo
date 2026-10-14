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

// PORT / HOST จากไฟล์ .env (เหมือน backend/frontend) — ไม่มีไฟล์/ไม่ระบุ = ใช้ "Urls" ใน appsettings.json
// หาไฟล์ที่: โฟลเดอร์ปัจจุบัน (dotnet run) → โฟลเดอร์โปรแกรม → โฟลเดอร์แม่ (report/publish → report/.env)
// ค่าใน environment จริงมีสิทธิ์เหนือไฟล์
var dotEnv = LoadDotEnv(
    Path.Combine(Directory.GetCurrentDirectory(), ".env"),
    Path.Combine(AppContext.BaseDirectory, ".env"),
    Path.Combine(AppContext.BaseDirectory, "..", ".env"));
string? Setting(string key) => Environment.GetEnvironmentVariable(key) is { Length: > 0 } v ? v : dotEnv.GetValueOrDefault(key);
if (Setting("PORT") is { } port)
    builder.Configuration["Urls"] = $"http://{Setting("HOST") ?? "localhost"}:{port}";

var app = builder.Build();
var reportDir = Path.Combine(AppContext.BaseDirectory, "Reports");

// แทนฟอนต์ใน template ตอนรัน (ไม่แก้ไฟล์ .frx) — ใช้บน Linux ที่ไม่มี Tahoma
//   appsettings.json: "FontSubstitutes": { "Tahoma": "Loma" }  หรือ env: FontSubstitutes__Tahoma=Loma
// ต้องระบุชื่อฟอนต์ที่ติดตั้งจริง: ถ้าปล่อยให้ระบบหาฟอนต์แทนเอง libgdiplus วัดความสูงข้อความไทยผิด → ข้อความที่ตัดบรรทัดหาย
var fontSubstitutes = builder.Configuration.GetSection("FontSubstitutes").Get<Dictionary<string, string>>()
    ?? new Dictionary<string, string>();
fontSubstitutes = new Dictionary<string, string>(fontSubstitutes, StringComparer.OrdinalIgnoreCase);

app.MapGet("/health", () => Results.Ok(new
{
    ok = true,
    urls = app.Urls,
    os = System.Runtime.InteropServices.RuntimeInformation.OSDescription,
    fontSubstitutes,
    reports = Directory.GetFiles(reportDir, "*.frx").Select(Path.GetFileNameWithoutExtension),
}));

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
        report.LoadFromString(SubstituteFonts(await File.ReadAllTextAsync(file), fontSubstitutes));
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

// แทนชื่อฟอนต์ในข้อความ XML ของ .frx ก่อนโหลด (ทำหลังโหลดไม่ได้ — บน Linux ฟอนต์ที่ไม่มีถูกแทนเป็น DejaVu Sans
// ตั้งแต่ตอนโหลด และชื่อเดิมหายไป) เช่น Font="Tahoma, 8pt, style=Bold" → Font="Loma, 8pt, style=Bold"
static string SubstituteFonts(string frx, Dictionary<string, string> map)
{
    foreach (var (from, to) in map)
        frx = System.Text.RegularExpressions.Regex.Replace(
            frx,
            $@"(Font=""\s*){System.Text.RegularExpressions.Regex.Escape(from)}(\s*,)",
            m => m.Groups[1].Value + to + m.Groups[2].Value,
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);
    return frx;
}

// อ่าน KEY=VALUE จากไฟล์ .env แรกที่พบ (รองรับ # comment และค่าที่ครอบด้วย ' หรือ ")
static Dictionary<string, string> LoadDotEnv(params string[] candidates)
{
    var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    var file = candidates.Select(Path.GetFullPath).FirstOrDefault(File.Exists);
    if (file == null) return result;
    foreach (var raw in File.ReadAllLines(file))
    {
        var line = raw.Trim();
        if (line.Length == 0 || line.StartsWith('#')) continue;
        var eq = line.IndexOf('=');
        if (eq <= 0) continue;
        var key = line[..eq].Trim();
        var value = line[(eq + 1)..].Trim();
        if (value.Length >= 2 && (value[0] == '\'' || value[0] == '"') && value[^1] == value[0])
            value = value[1..^1];
        else if (value.IndexOf(" #", StringComparison.Ordinal) is var hash and >= 0)
            value = value[..hash].Trim();
        result[key] = value;
    }
    return result;
}

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
