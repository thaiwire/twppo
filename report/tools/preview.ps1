<#
.SYNOPSIS
  ดูผลแม่แบบรายงานทันทีหลังแก้ใน FastReport Designer (ใช้ข้อมูลตัวอย่าง Reports\<ชื่อ>.sample.json)
  Designer กด Preview กับข้อมูลจริงไม่ได้ (ข้อมูลมาจาก backend) — สคริปต์นี้ส่งข้อมูลตัวอย่างให้ report service วาดให้ดูแทน

.EXAMPLE
  # ที่โฟลเดอร์ report\ (ต้องเปิด report service ไว้: dotnet run)
  .\tools\preview.ps1                      # PR หน้า 1-3 เป็นรูป PNG แล้วเปิดดู
  .\tools\preview.ps1 -Report Vendors      # รายงานผู้ขาย
  .\tools\preview.ps1 -Pages 2             # เฉพาะหน้า 2
  .\tools\preview.ps1 -Pdf                 # ทั้งไฟล์เป็น PDF

  ไฟล์ผลลัพธ์อยู่ที่ report\preview\ (ไม่อยู่ใน git)
  ไฟล์นี้บันทึกเป็น UTF-8 with BOM เพื่อให้ Windows PowerShell 5.1 อ่านภาษาไทยถูก
#>
param(
  [string]$Report = 'PR',
  [int[]]$Pages = @(1, 2, 3),
  [switch]$Pdf,
  [string]$Url = 'http://localhost:5100'
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$frx = Join-Path $root "Reports\$Report.frx"
$sample = Join-Path $root "Reports\$Report.sample.json"
$outDir = Join-Path $root 'preview'

if (-not (Test-Path $frx)) { throw "ไม่พบแม่แบบ $frx" }
if (-not (Test-Path $sample)) { throw "ไม่พบข้อมูลตัวอย่าง $sample" }
try { Invoke-RestMethod "$Url/health" -TimeoutSec 5 | Out-Null }
catch { throw "เรียก report service ที่ $Url ไม่ได้ — เปิดด้วย: cd report; dotnet run" }

# report service (dotnet run) อ่านแม่แบบจากโฟลเดอร์ build — คัดลอกไฟล์ที่เพิ่งแก้ไปทับ ไม่ต้อง restart
$runtimeReports = Join-Path $root 'bin\Debug\net8.0\Reports'
if (Test-Path $runtimeReports) { Copy-Item $frx, $sample $runtimeReports -Force }

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$body = [System.IO.File]::ReadAllBytes($sample)

function Render([string]$Query, [string]$OutFile) {
  try {
    Invoke-WebRequest -Uri "$Url/render/$Report$Query" -Method Post -ContentType 'application/json' `
      -Body $body -OutFile $OutFile -UseBasicParsing | Out-Null
    return $true
  } catch {
    # แม่แบบผิด (เช่น อ้างคอลัมน์ที่ไม่มี) → report service ตอบ JSON บอกบรรทัดที่ผิด
    $detail = $_.ErrorDetails.Message
    if (-not $detail -and $_.Exception.Response) {
      $detail = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    }
    Write-Host "สร้างรายงานไม่สำเร็จ: $detail" -ForegroundColor Red
    return $false
  }
}

if ($Pdf) {
  $file = Join-Path $outDir "$Report.pdf"
  if (Render '' $file) { Write-Host "สร้าง $file แล้ว" -ForegroundColor Green; Invoke-Item $file }
  return
}

$made = @()
foreach ($p in $Pages) {
  $file = Join-Path $outDir ("{0}-page{1}.png" -f $Report, $p)
  if (Render "?format=png&page=$p" $file) {
    # หน้าที่ไม่มีจริงได้ไฟล์ว่าง — ข้าม
    if ((Get-Item $file).Length -gt 0) { $made += $file } else { Remove-Item $file }
  } else { break }
}
if ($made.Count) {
  Write-Host ("สร้าง {0} หน้า: {1}" -f $made.Count, ($made -join ', ')) -ForegroundColor Green
  Invoke-Item $made[0]
}
