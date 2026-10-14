<#
.SYNOPSIS
  ลงทะเบียนระบบ PR เป็น Windows Service 3 ตัวด้วย NSSM (เปิดอัตโนมัติเมื่อเปิดเครื่อง / restart เมื่อ crash)

    mtp-pr-report    report\publish\ReportService.exe      PORT/HOST จาก report\.env          (ค่าเริ่มต้น 5100)
    mtp-pr-backend   node backend\dist\main.js              PORT/HOST จาก backend\.env         (ค่าเริ่มต้น 4000)
    mtp-pr-frontend  node frontend\scripts\next.mjs start   PORT/HOST จาก frontend\.env.local  (ค่าเริ่มต้น 3000)

.EXAMPLE
  # PowerShell (Run as Administrator) ที่โฟลเดอร์ C:\apps\mtp_po_web
  Set-ExecutionPolicy -Scope Process Bypass
  .\deploy\install-services.ps1 -Nssm C:\tools\nssm\nssm.exe

  รันซ้ำได้ — ถ้ามี service อยู่แล้วจะอัปเดตค่าให้
  service ไม่ผูกกัน (report ล่มแล้ว backend ยังทำงาน — แค่พิมพ์ไม่ได้)
  ไฟล์นี้บันทึกเป็น UTF-8 with BOM เพื่อให้ Windows PowerShell 5.1 อ่านภาษาไทยถูก
#>
param(
  [string]$AppRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$Nssm = 'C:\tools\nssm\nssm.exe',
  [string]$Node = ''
)

$ErrorActionPreference = 'Stop'

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'ต้องเปิด PowerShell แบบ Run as Administrator'
}
if (-not (Test-Path $Nssm)) { throw "ไม่พบ nssm.exe ที่ $Nssm (ดาวน์โหลดจาก https://nssm.cc แล้วระบุ -Nssm)" }
if (-not $Node) { $Node = (Get-Command node.exe -ErrorAction Stop).Source }

$logs = Join-Path $AppRoot 'logs'

# อ่านค่า KEY=VALUE จากไฟล์ .env (ใช้หา PORT สำหรับตรวจสถานะ)
function Get-EnvValue([string]$File, [string]$Key, [string]$Default) {
  if (Test-Path $File) {
    foreach ($line in Get-Content $File) {
      if ($line -match "^\s*$Key\s*=\s*['""]?([^'""#\s]+)") { return $Matches[1] }
    }
  }
  return $Default
}
New-Item -ItemType Directory -Force -Path $logs | Out-Null

function Install-AppService {
  param(
    [string]$Name,
    [string]$Display,
    [string]$Exe,
    [string]$Arguments,
    [string]$WorkDir,
    [string[]]$Env = @()
  )
  $exists = $null -ne (Get-Service -Name $Name -ErrorAction SilentlyContinue)
  if ($exists) {
    Write-Host "อัปเดต service $Name" -ForegroundColor Yellow
    & $Nssm stop $Name | Out-Null
    & $Nssm set $Name Application $Exe | Out-Null
  } else {
    Write-Host "สร้าง service $Name" -ForegroundColor Green
    & $Nssm install $Name $Exe | Out-Null
  }
  & $Nssm set $Name AppParameters $Arguments | Out-Null
  & $Nssm set $Name AppDirectory $WorkDir | Out-Null
  & $Nssm set $Name DisplayName $Display | Out-Null
  & $Nssm set $Name Description 'MTP Purchase Requisition web' | Out-Null
  & $Nssm set $Name Start SERVICE_AUTO_START | Out-Null
  # crash แล้วรอ 5 วินาทีค่อยเปิดใหม่
  & $Nssm set $Name AppExit Default Restart | Out-Null
  & $Nssm set $Name AppRestartDelay 5000 | Out-Null
  # log แยกไฟล์ต่อ service หมุนไฟล์ทุก 10 MB
  & $Nssm set $Name AppStdout (Join-Path $logs "$Name.log") | Out-Null
  & $Nssm set $Name AppStderr (Join-Path $logs "$Name.err.log") | Out-Null
  & $Nssm set $Name AppRotateFiles 1 | Out-Null
  & $Nssm set $Name AppRotateOnline 1 | Out-Null
  & $Nssm set $Name AppRotateBytes 10485760 | Out-Null
  if ($Env.Count -gt 0) {
    & $Nssm set $Name AppEnvironmentExtra $Env | Out-Null
  }
}

# 1) Report service (.NET self-contained publish) — PORT/HOST จาก report\.env (ไม่มี = appsettings.json)
$reportDir = Join-Path $AppRoot 'report\publish'
Install-AppService -Name 'mtp-pr-report' -Display 'MTP PR - Report (FastReport)' `
  -Exe (Join-Path $reportDir 'ReportService.exe') -Arguments '' -WorkDir $reportDir `
  -Env @('ASPNETCORE_ENVIRONMENT=Production')

# 2) Backend (NestJS) — main.ts โหลด .env จาก AppDirectory
$backendDir = Join-Path $AppRoot 'backend'
Install-AppService -Name 'mtp-pr-backend' -Display 'MTP PR - Backend API (NestJS)' `
  -Exe $Node -Arguments 'dist\main.js' -WorkDir $backendDir `
  -Env @('NODE_ENV=production')

# 3) Frontend (Next.js) — PORT/HOST จาก frontend\.env.local (ตั้ง HOST=127.0.0.1 ให้ IIS เป็นทางเข้าเดียว)
$frontendDir = Join-Path $AppRoot 'frontend'
Install-AppService -Name 'mtp-pr-frontend' -Display 'MTP PR - Frontend (Next.js)' `
  -Exe $Node -Arguments 'scripts\next.mjs start' -WorkDir $frontendDir `
  -Env @('NODE_ENV=production')

foreach ($svc in 'mtp-pr-report', 'mtp-pr-backend', 'mtp-pr-frontend') {
  & $Nssm start $svc | Out-Null
}
Start-Sleep -Seconds 8
Get-Service mtp-pr-* | Format-Table Name, Status, StartType -AutoSize

$reportPort = Get-EnvValue (Join-Path $AppRoot 'report\.env') 'PORT' '5100'
$backendPort = Get-EnvValue (Join-Path $backendDir '.env') 'PORT' '4000'
$frontendPort = Get-EnvValue (Join-Path $frontendDir '.env.local') 'PORT' '3000'
Write-Host 'ตรวจสถานะ:' -ForegroundColor Cyan
foreach ($url in "http://127.0.0.1:$reportPort/health", "http://127.0.0.1:$backendPort/api/auth/me", "http://127.0.0.1:$frontendPort/login") {
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15
    Write-Host ("  {0}  {1}" -f $r.StatusCode, $url)
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    # /api/auth/me ตอบ 401 เมื่อยังไม่ login = backend ทำงานปกติ
    Write-Host ("  {0}  {1}" -f ($(if ($code) { $code } else { 'ERR' })), $url)
  }
}
Write-Host "log อยู่ที่ $logs"
