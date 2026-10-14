# MTP PR Web — ระบบใบเสนอซื้อ (Purchase Requisition)

เว็บแทนหน้าจอเดิม `4.1 ใบเสนอซื้อสินค้า (prqmt.p)` ใช้ฐานข้อมูลเดิม `dbmtp` (SQL Server 192.9.200.132)

```
mtp_po_web/
├── frontend/   Next.js 16 + antd 6           http://localhost:3000
├── backend/    NestJS 12 + Prisma 7 (mssql)  http://localhost:4000/api
└── report/     .NET 8 + FastReport.OpenSource http://localhost:5100
```

```
Browser ──► Next.js (/api/* rewrite) ──► NestJS ──► SQL Server (dbmtp)
                                           │
                                           └─► FastReport service (Reports/PR.frx → PDF)
```

> 🚀 **ติดตั้งใช้งานจริง:** Windows Server 2019 → [install.md](install.md) · Ubuntu Server 24.04 → [installubuntu.md](installubuntu.md) (สคริปต์อยู่ใน `deploy/`)
>
> 📘 **คู่มือสอนเขียนระบบนี้ทีละขั้นตอน (ด้วยมือ):** [stepbystep.md](stepbystep.md)
> สร้างจาก `docs/stepbystep-src/` — แก้โค้ดแล้วอัปเดตคู่มือด้วย `python docs/stepbystep-src/build.py .`

## ตารางที่ใช้

| ตาราง | ใช้ทำอะไร |
|---|---|
| `prq_mstr` | หัวใบเสนอซื้อ (เลขที่, วันที่, ผู้ขาย, ผู้ขอซื้อ, บริษัท, อนุมัติ, ส่วนลด, ภาษี) |
| `prq_det` | รายการสินค้า (`prqd_qty_open` = จำนวนที่ออก PO แล้ว) |
| `pur_ctrl` | เลขที่ PR ถัดไป `purc_pr` + prefix `purc_pr_pre` → `PR0000013` |
| `vd_mstr`, `it_mstr`, `en_mstr`, `vt_mstr`, `um_mstr` | ผู้ขาย, สินค้า, บริษัท, ประเภทภาษี, หน่วยนับ (อ่านอย่างเดียว) |
| `app_user` | ผู้ใช้เว็บ (bcrypt) + `div_code` หน่วยงาน (คอลัมน์ใหม่) |
| `div_mstr` | หน่วยงาน — `prq_mstr.prq_divcode` (คอลัมน์ใหม่) เก็บหน่วยงานของใบ PR |

> **ห้ามรัน `prisma migrate` / `prisma db push`** กับ dbmtp — schema ดึงมาจาก DB เดิม ใช้แค่ `prisma generate`
>
> คอลัมน์ที่ระบบเว็บเพิ่มเอง อยู่ใน `backend/prisma/sql/*.sql` (รันด้วยมือบน DB ใหม่ เช่น `sqlcmd -i`) — ปัจจุบัน: `app_user.div_code`, `prq_mstr.prq_divcode` (NULL ได้ทั้งคู่)

## ติดตั้งและรัน (dev)

ต้องมี Node.js 20+ และ .NET SDK 8

```bash
cd backend && npm install && npx prisma generate && npm run start:dev
```

```bash
cd report && dotnet run
```

```bash
cd frontend && npm install && npm run dev
```

ค่าตั้งค่า: `backend/.env` (ดู `.env.example`), `frontend/.env.local` (`BACKEND_URL`)
หมายเหตุ: ใน `.env` รหัสผ่านที่มี `#` ต้องครอบด้วย quote เช่น `DB_PASSWORD='@twp1234#'`

## ผู้ใช้งานและสิทธิ์

login ด้วยตาราง `app_user` — จัดการผู้ใช้ด้วยสคริปต์:

```bash
cd backend && npm run user -- list
```

```bash
cd backend && npm run user -- add somchai P@ssw0rd user "สมชาย ใจดี"
```

```bash
cd backend && npm run user -- passwd admin NewPassword
```

| role | สิทธิ์ |
|---|---|
| `user` (หรืออื่นๆ) | ดู / สร้าง / แก้ไข / ลบ / พิมพ์ PR ที่ยังไม่อนุมัติ |
| `admin`, `manager` | + อนุมัติ / ยกเลิกอนุมัติ / ปิด-เปิด PR (ตั้งค่าได้ที่ `APPROVER_ROLES`) |
| `admin`, `manager` | + เมนู **ข้อมูลหลัก**: เพิ่ม/แก้ไข/ลบ ผู้ขาย, รหัสสินค้า, บริษัท (ตั้งค่าได้ที่ `MASTER_ROLES`) |
| `admin` เท่านั้น | + เมนู **Admin → ผู้ใช้งาน** (`/admin/users`): เพิ่ม/แก้ไข/ลบผู้ใช้, กำหนดระดับ, ปิดใช้งาน, ตั้งรหัสผ่านใหม่ |

### เมนู Admin — จัดการผู้ใช้ (`app_user`)

- ชื่อผู้ใช้เปลี่ยนไม่ได้หลังสร้าง (3–50 ตัว a-z 0-9 . _ @ -), รหัสผ่าน ≥ 8 ตัวมีตัวอักษร+ตัวเลข (เก็บเป็น bcrypt)
- แก้ไข: เว้นช่องรหัสผ่านว่าง = ไม่เปลี่ยนรหัสผ่าน
- ป้องกัน: ลบ/ปิดใช้งาน/ลดระดับ **ตัวเอง** ไม่ได้ และต้องเหลือ admin ที่ใช้งานได้อย่างน้อย 1 คนเสมอ
- **มีผลทันที**: ทุก request ตรวจผู้ใช้จากฐานข้อมูล (cache 15 วินาที) — ปิดใช้งานแล้ว session ที่เปิดอยู่จะถูกตัด, เปลี่ยนระดับแล้วสิทธิ์เปลี่ยนโดยไม่ต้อง login ใหม่

### ข้อมูลหลัก (ผู้ขาย / รหัสสินค้า / บริษัท)

- ตาราง `vd_mstr`, `it_mstr`, `en_mstr` ใช้ร่วมกับระบบเดิม — **แก้รหัสไม่ได้** (ต้องลบแล้วเพิ่มใหม่)
- **การลบ**: ฐานข้อมูลไม่มี foreign key จึงตรวจเองก่อนลบว่ารหัสถูกใช้ในตารางอื่นหรือไม่ (PR, PO, รับสินค้า, AP, stock ฯลฯ)
  ถ้าถูกใช้อยู่จะลบไม่ได้ — ผู้ขายให้ใช้ "สถานะ = ไม่ใช้งาน" (`vd_status = 'c'`) แทน ซึ่งจะเลือกในใบ PR ไม่ได้
- เพิ่มใหม่: ตั้งค่าตัวเลข/flag เป็น 0/false แบบระเบียนเดิม และเติมรหัสบัญชี/site ที่ใช้มากที่สุดให้อัตโนมัติ
- บริษัทหลัก (`en_primary`) มีได้แห่งเดียว และลบไม่ได้
- หน้าจอ: รายการ `/master/<vendors|items|entities>` · เพิ่ม `…/new` · แก้ไข `…/edit?code=<รหัส>` (หน้าฟอร์มเต็ม ไม่ใช่ modal)
- ปุ่ม **พิมพ์รายงาน** ในหน้ารายการ → ไปหน้ารับเงื่อนไขรายงาน (เติมคำค้นหาปัจจุบันให้)

## รายงาน — ทุกรายงานต้องผ่านหน้ารับเงื่อนไขก่อน

| เมนู | หน้า | เงื่อนไข | สิทธิ์ |
|---|---|---|---|
| พิมพ์ใบเสนอซื้อ | `/reports/pr` | ช่วงเลขที่, ช่วงวันที่ (ต้องมีอย่างน้อย 1), ผู้ขาย, บริษัท, สถานะ, การอนุมัติ — พิมพ์หลายใบในไฟล์เดียว ≤ 200 ใบ | ทุกคน |
| รายงานผู้ขาย | `/reports/vendors` | ช่วงรหัส, คำค้นหา, สถานะ, เครดิต, ภาษี, กลุ่ม, เรียงตาม | admin/manager |
| รายงานรหัสสินค้า | `/reports/items` | ช่วงรหัส, คำค้นหา, กลุ่ม, site, ภาษี, ผู้ขายหลัก, เรียงตาม | admin/manager |
| รายงานบริษัท | `/reports/entities` | ช่วงรหัส, คำค้นหา, เรียงตาม | admin/manager |
| รายงานหน่วยงาน | `/reports/divisions` | ช่วงรหัส, คำค้นหา, เรียงตาม | admin/manager |

- กด **ออกรายงาน** → เปิด PDF ใน**แท็บใหม่**ทันที (แท็บแสดง "กำลังสร้าง..." ระหว่างรอ)
  - ก่อนสร้าง PDF จะเรียก API เดิมพร้อม `?check=1` เพื่อตรวจเงื่อนไข/นับจำนวน (คืน JSON ไม่ render) — ถ้าไม่พบข้อมูลหรือเงื่อนไขผิด จะปิดแท็บแล้วแจ้งข้อความในหน้าเงื่อนไข
  - ถ้าเบราว์เซอร์บล็อก popup จะมีปุ่ม "เปิดรายงาน" ให้กดเอง
- ปุ่มพิมพ์ในหน้า PR จะพาไปหน้านี้พร้อมเติมเลขที่ใบนั้นให้
- รายงานข้อมูลหลักแสดงสูงสุด 1,000 รายการ (PDF เป็นภาพ ~10 MB ต่อ 1,000 แถว)
- `PR.frx` เป็นแบบ master-detail (Header → Lines ผ่าน `Nbr`) ขึ้นหน้าใหม่ทุกใบ และนับเลขหน้าแยกต่อใบด้วย script ใน template

## กฎของเอกสาร

- **หน่วยงาน**: ผู้ใช้ที่ระบุหน่วยงาน → เห็น/แก้ไข/อนุมัติ/พิมพ์ได้เฉพาะ PR ของหน่วยงานตัวเอง และ PR ใหม่จะเป็นหน่วยงานของผู้ใช้อัตโนมัติ
  ผู้ใช้ที่ไม่ระบุหน่วยงาน → เห็นทุกหน่วยงาน เลือกหน่วยงานตอนสร้าง PR ได้ และกรองรายการด้วยหน่วยงานได้ (PR เดิมที่ยังไม่มีหน่วยงาน เห็นเฉพาะกลุ่มนี้)

- เลขที่ออกอัตโนมัติจาก `pur_ctrl` (ล็อกแถวด้วย `UPDLOCK` กันเลขซ้ำ และข้ามเลขที่มีอยู่แล้ว)
- ยอดรวม = Σ(จำนวน × ราคา) → หักส่วนลด % → + VAT ตามประเภทภาษี (บันทึก `prq_disc_amt1`, `prq_vat_amt`)
- แก้ไข/ลบได้เฉพาะ PR ที่ **ยังไม่อนุมัติ**, **สถานะเปิด** และ **ยังไม่มีรายการถูกออก PO** (`prqd_qty_open = 0`)
- อนุมัติแล้วบันทึกผู้อนุมัติไว้ที่ `prq_user2`
- ผู้บันทึก/เวลาแก้ไขล่าสุดเก็บที่ `prq_user1`, `prq_date1`, `prq_time1` (เวลาไทย)

## รายงาน (FastReport)

- Template: `report/Reports/PR.frx` — เปิดแก้ด้วย FastReport Designer Community Edition ได้
- ข้อมูลส่งเป็น 2 ตาราง: `Header` (1 แถว) และ `Lines` — ตัวอย่างอยู่ที่ `report/Reports/PR.sample.json`
- ทดสอบ template โดยไม่ต้องผ่าน backend:

```bash
curl -X POST "http://localhost:5100/render/PR?format=png" -H "content-type: application/json" --data-binary @report/Reports/PR.sample.json -o pr.png
```

- เพิ่มรายงานใหม่: วาง `<ชื่อ>.frx` ใน `report/Reports/` แล้วเรียก `ReportService.renderPdf('<ชื่อ>', tables, { dpi, quality })` จาก backend
- รายงานข้อมูลหลัก `Vendors.frx`, `Items.frx`, `Entities.frx` สร้างจาก `report/tools/gen_master_reports.py` (แก้คอลัมน์ที่สคริปต์แล้วรันใหม่ หรือแก้ .frx ด้วย Designer)
- `POST /render/<ชื่อ>?dpi=130&quality=75` — ปรับความคมชัด/ขนาดไฟล์ PDF (ค่าเริ่มต้น 200/90)

## API (NestJS, prefix `/api`)

| Method | Path | |
|---|---|---|
| POST | `/auth/login`, `/auth/logout` · GET `/auth/me` | JWT ใน httpOnly cookie `pr_token` |
| PUT | `/auth/profile` `{ displayName }` | แก้ชื่อที่แสดง (ออก cookie ใหม่) |
| POST | `/auth/change-password` `{ currentPassword, newPassword }` | เปลี่ยนรหัสผ่านตัวเอง (≥ 8 ตัว มีตัวอักษร+ตัวเลข) |
| GET | `/pr?q=&status=O\|C&approve=Y\|N&entity=&dateFrom=&dateTo=&page=&pageSize=` | รายการ PR |
| GET/PUT/DELETE | `/pr/:nbr` | ดู / แก้ไข / ลบ (เลขที่มี `/` ต้อง encode เป็น `%2F`) |
| POST | `/pr` | สร้าง |
| POST | `/pr/:nbr/approve` · `unapprove` · `close` · `reopen` | workflow |
| GET | `/pr/print?nbrFrom=&nbrTo=&dateFrom=&dateTo=&vend=&entity=&status=&approve=` | PDF หลายใบตามเงื่อนไข |
| GET | `/pr/:nbr/print` | PDF ใบเดียว |
| GET | `/master/vendors?q=` · `items?q=` · `entities` · `vat-classes` · `units` | ข้อมูลหลัก (ตัวเลือกในฟอร์ม PR) |
| GET/POST | `/admin/vendors` · `/admin/items` · `/admin/entities` (`?q=&status=&page=&pageSize=`) | จัดการข้อมูลหลัก — admin/manager |
| GET/PUT/DELETE | `/admin/vendors/:code` · `/admin/items/:code` · `/admin/entities/:code` | 〃 |
| GET | `/admin/lookups` | ตัวเลือก/ค่าเริ่มต้นในฟอร์มข้อมูลหลัก |
| GET/POST · GET/PUT/DELETE `:code` | `/admin/divisions` · รายงาน `/admin/divisions/report` | หน่วยงาน — admin/manager |
| GET | `/master/divisions` | รายชื่อหน่วยงาน (ทุกคน — ใช้ในฟอร์ม) |
| GET/POST | `/admin/users` (`?q=&role=&status=&page=&pageSize=`) | จัดการผู้ใช้ — admin เท่านั้น |
| GET/PUT/DELETE | `/admin/users/:username` | 〃 |
| GET | `/admin/vendors/report` · `/admin/items/report` · `/admin/entities/report` (`?codeFrom=&codeTo=&name=&status=&group=&vatClass=&creditTerm=&vend=&site=&sort=code\|name`) | รายงาน PDF |
