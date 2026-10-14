#!/usr/bin/env bash
# build ระบบ PR ทั้ง 3 ส่วนบน Ubuntu (ใช้ทั้งติดตั้งครั้งแรก และอัปเดตเวอร์ชันใหม่)
# ขั้นตอน: git pull → หยุด service → build backend / frontend / report → เปิด service
#
#   sudo /opt/mtp_po_web/deploy/linux/update.sh               # อัปเดตจาก git แล้ว build ทั้งหมด
#   sudo /opt/mtp_po_web/deploy/linux/update.sh --skip-pull   # build จากโค้ดที่มีอยู่ (ติดตั้งครั้งแรก)
#   sudo /opt/mtp_po_web/deploy/linux/update.sh --skip-report # ไม่ build report service
#
# build ด้วยผู้ใช้ $APP_USER (เจ้าของไฟล์ = ผู้ใช้ที่ service รัน) ส่วน systemctl ใช้สิทธิ์ root
# ไม่แตะฐานข้อมูล — ถ้าเวอร์ชันใหม่มีไฟล์ใน backend/prisma/sql/ ให้รันด้วยมือก่อน (ดู installubuntu.md)
set -euo pipefail

APP_ROOT="${APP_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
APP_USER="${APP_USER:-mtppr}"
SERVICES=(mtp-pr-frontend mtp-pr-backend mtp-pr-report)
SKIP_PULL=0
SKIP_REPORT=0
for arg in "$@"; do
  case "$arg" in
    --skip-pull) SKIP_PULL=1 ;;
    --skip-report) SKIP_REPORT=1 ;;
    *) echo "ไม่รู้จัก option: $arg" >&2; exit 2 ;;
  esac
done

step() { printf '\n\033[36m=== %s\033[0m\n' "$1"; }
# รันคำสั่งในโฟลเดอร์ $1 ด้วยผู้ใช้ $APP_USER (set -e จะหยุดทันทีถ้าล้ม)
# sudo ล้างตัวแปร environment — ส่ง NODE_OPTIONS ต่อให้เอง (เช่น เพิ่ม memory ให้ next build บนเครื่อง RAM น้อย)
as_app() {
  local dir="$1"; shift
  echo "> $*"
  sudo -u "$APP_USER" -H env NODE_OPTIONS="${NODE_OPTIONS:-}" bash -c "cd '$dir' && $*"
}

[[ $EUID -eq 0 ]] || { echo "ต้องรันด้วย sudo" >&2; exit 1; }
id "$APP_USER" >/dev/null 2>&1 || { echo "ไม่พบผู้ใช้ $APP_USER (ดู installubuntu.md ขั้น 4)" >&2; exit 1; }

# ไฟล์ตั้งค่า (ไม่อยู่ใน git — ต้องสร้างเองบน server)
[[ -f "$APP_ROOT/backend/.env" ]] || { echo "ไม่พบ backend/.env (คัดลอกจาก backend/.env.example แล้วแก้ค่า)" >&2; exit 1; }
[[ -f "$APP_ROOT/frontend/.env.local" ]] || { echo "ไม่พบ frontend/.env.local (คัดลอกจาก frontend/.env.example — ต้องมี PORT, HOST, BACKEND_URL)" >&2; exit 1; }

# package-lock.json สร้างด้วย npm 11 — npm 10 (ที่มากับ Node 20) อ่านไม่ตรงกัน ทำให้ npm ci ล้ม
NPM_MAJOR=$(npm -v | cut -d. -f1)
(( NPM_MAJOR >= 11 )) || { echo "ต้องใช้ npm 11 ขึ้นไป (ตอนนี้ $(npm -v)) — รัน: sudo npm install -g npm@11" >&2; exit 1; }

if (( ! SKIP_PULL )); then
  step "git pull"
  as_app "$APP_ROOT" git pull --ff-only
fi

INSTALLED=()
for s in "${SERVICES[@]}"; do
  systemctl list-unit-files "$s.service" --no-legend 2>/dev/null | grep -q "$s" && INSTALLED+=("$s")
done
if (( ${#INSTALLED[@]} )); then
  step "หยุด service"
  systemctl stop "${INSTALLED[@]}"
fi

step "Backend (NestJS)"
as_app "$APP_ROOT/backend" npm ci
as_app "$APP_ROOT/backend" npx prisma generate
as_app "$APP_ROOT/backend" npm run build

step "Frontend (Next.js) — BACKEND_URL ใน .env.local ถูกฝังตอน build"
as_app "$APP_ROOT/frontend" npm ci
as_app "$APP_ROOT/frontend" npm run build

if (( ! SKIP_REPORT )); then
  step "Report service (.NET 8 self-contained, linux-x64)"
  as_app "$APP_ROOT/report" dotnet publish -c Release -r linux-x64 --self-contained true -o "$APP_ROOT/report/publish"
fi

if (( ${#INSTALLED[@]} )); then
  step "เปิด service"
  systemctl start mtp-pr-report mtp-pr-backend mtp-pr-frontend
  sleep 8
  systemctl --no-pager --lines=0 status mtp-pr-report mtp-pr-backend mtp-pr-frontend | grep -E "●|Active:"
else
  printf '\n\033[32mbuild เสร็จ — ยังไม่มี service ให้ติดตั้งตาม installubuntu.md ขั้น 8\033[0m\n'
fi
