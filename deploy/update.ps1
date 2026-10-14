<#
.SYNOPSIS
  build ระบบ PR ทั้ง 3 ส่วน (ใช้ทั้งติดตั้งครั้งแรก และอัปเดตเวอร์ชันใหม่)
  ขั้นตอน: git pull → หยุด service → build backend / frontend / report → เปิด service

.EXAMPLE
  # PowerShell (Run as Administrator) ที่โฟลเดอร์ C:\apps\mtp_po_web
  Set-ExecutionPolicy -Scope Process Bypass
  .\deploy\update.ps1                 # อัปเดตจาก git แล้ว build ทั้งหมด
  .\deploy\update.ps1 -SkipPull       # build จากโค้ดที่มีอยู่ (ติดตั้งครั้งแรก / ไม่มี internet)
  .\deploy\update.ps1 -SkipReport     # ไม่ build report service (ไม่ได้แก้ไฟล์ใน report\)

  ไม่แตะฐานข้อมูล — ถ้าเวอร์ชันใหม่มีไฟล์ใน backend\prisma\sql\ ให้รันด้วยมือก่อน (ดู install.md)
  ไฟล์นี้บันทึกเป็น UTF-8 with BOM เพื่อให้ Windows PowerShell 5.1 อ่านภาษาไทยถูก
#>
param(
  [string]$AppRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$Nssm = 'C:\tools\nssm\nssm.exe',
  [switch]$SkipPull,
  [switch]$SkipReport
)

$ErrorActionPreference = 'Stop'
$services = 'mtp-pr-frontend', 'mtp-pr-backend', 'mtp-pr-report'

function Step([string]$Text) { Write-Host "`n=== $Text" -ForegroundColor Cyan }

# รันคำสั่งภายนอก (npm, dotnet, git) แล้วหยุดทันทีถ้าไม่สำเร็จ
function Run([string]$WorkDir, [string]$Exe, [string[]]$Arguments) {
  Push-Location $WorkDir
  try {
    Write-Host "> $Exe $($Arguments -join ' ')" -ForegroundColor DarkGray
    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) { throw "คำสั่งล้มเหลว (exit $LASTEXITCODE): $Exe $($Arguments -join ' ')" }
  } finally {
    Pop-Location
  }
}

$backend = Join-Path $AppRoot 'backend'
$frontend = Join-Path $AppRoot 'frontend'
$report = Join-Path $AppRoot 'report'

# ---- ตรวจไฟล์ตั้งค่า (ไม่อยู่ใน git — ต้องสร้างเองบน server)
if (-not (Test-Path (Join-Path $backend '.env'))) { throw 'ไม่พบ backend\.env (คัดลอกจาก backend\.env.example แล้วแก้ค่า)' }
if (-not (Test-Path (Join-Path $frontend '.env.local'))) { throw 'ไม่พบ frontend\.env.local (คัดลอกจาก frontend\.env.example — ต้องมี PORT, HOST, BACKEND_URL)' }

# package-lock.json สร้างด้วย npm 11 — npm 10 (ที่มากับ Node 20) อ่านไม่ตรงกัน ทำให้ npm ci ล้ม
$npmMajor = [int]((& npm -v) -split '\.')[0]
if ($npmMajor -lt 11) { throw "ต้องใช้ npm 11 ขึ้นไป (ตอนนี้ $(& npm -v)) — รัน: npm install -g npm@11" }

if (-not $SkipPull) {
  Step 'git pull'
  Run $AppRoot 'git' @('pull', '--ff-only')
}

$installed = @($services | Where-Object { Get-Service -Name $_ -ErrorAction SilentlyContinue })
if ($installed.Count -gt 0) {
  Step 'หยุด service'
  foreach ($svc in $installed) {
    if (Test-Path $Nssm) { & $Nssm stop $svc | Out-Null } else { Stop-Service $svc }
  }
}

Step 'Backend (NestJS)'
Run $backend 'npm' @('ci')
Run $backend 'npx' @('prisma', 'generate')
Run $backend 'npm' @('run', 'build')

Step 'Frontend (Next.js) — BACKEND_URL ใน .env.local ถูกฝังตอน build'
Run $frontend 'npm' @('ci')
Run $frontend 'npm' @('run', 'build')

if (-not $SkipReport) {
  Step 'Report service (.NET 8 self-contained)'
  Run $report 'dotnet' @('publish', '-c', 'Release', '-r', 'win-x64', '--self-contained', 'true', '-o', (Join-Path $report 'publish'))
}

if ($installed.Count -gt 0) {
  Step 'เปิด service'
  foreach ($svc in ($services[($services.Count - 1)..0])) {
    if (Get-Service -Name $svc -ErrorAction SilentlyContinue) {
      if (Test-Path $Nssm) { & $Nssm start $svc | Out-Null } else { Start-Service $svc }
    }
  }
  Start-Sleep -Seconds 8
  Get-Service mtp-pr-* | Format-Table Name, Status -AutoSize
} else {
  Write-Host "`nbuild เสร็จ — ยังไม่มี service ให้รัน .\deploy\install-services.ps1 ต่อ" -ForegroundColor Green
}
