-- ERP Phase 0: ตารางส่วนกลางของระบบเว็บ (ตารางใหม่ทั้งหมด — ไม่แตะตารางระบบเดิม)
--   app_doc_seq  ตัวนับเลขที่เอกสารของเว็บ (เอกสารที่มีแต่ในเว็บ — เอกสารที่ระบบเดิมยังออกอยู่ให้ใช้ตัวนับของระบบเดิม)
--   app_audit    ประวัติการเปลี่ยนแปลง (ใคร ทำอะไร กับเอกสารไหน เมื่อไร)
--   และเปลี่ยนรหัส module ข้อมูลหลัก 'master' → 'base' (ให้ตรงกับ app_module ของบริษัท)
-- ฐานข้อมูลใช้ร่วมกับระบบเดิม: ห้าม prisma migrate — รัน: npm run sql -- prisma/sql/2026-10-15_core_numbering_audit.sql
IF OBJECT_ID('dbo.app_doc_seq', 'U') IS NULL
  CREATE TABLE dbo.app_doc_seq (
    doc_type   NVARCHAR(20) NOT NULL,              -- เช่น 'SO', 'GR'
    period     NVARCHAR(8)  NOT NULL,              -- เช่น '2610' (yyMM), '26' (yy) หรือ '' (ไม่แยกงวด)
    last_no    INT          NOT NULL,
    updated_at DATETIME2    NOT NULL CONSTRAINT DF_app_doc_seq_updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_app_doc_seq PRIMARY KEY (doc_type, period)
  );
GO
IF OBJECT_ID('dbo.app_audit', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.app_audit (
    id          BIGINT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_app_audit PRIMARY KEY,
    at          DATETIME2     NOT NULL CONSTRAINT DF_app_audit_at DEFAULT SYSUTCDATETIME(),
    username    NVARCHAR(50)  NOT NULL,
    module_code NVARCHAR(20)  NOT NULL,            -- pr, base, admin ...
    doc_type    NVARCHAR(30)  NOT NULL,            -- PR, vendor, user ...
    doc_no      NVARCHAR(60)  NOT NULL,
    action      NVARCHAR(30)  NOT NULL,            -- create, update, delete, approve ...
    detail      NVARCHAR(MAX) NULL                 -- JSON (ค่าที่เปลี่ยน/ข้อมูลประกอบ)
  );
  CREATE INDEX IX_app_audit_doc ON dbo.app_audit (doc_type, doc_no);
  CREATE INDEX IX_app_audit_at ON dbo.app_audit (at DESC);
END
GO
-- รหัส module ข้อมูลหลัก: master → base (รันซ้ำได้)
UPDATE m SET module_code = 'base'
FROM dbo.app_user_module m
WHERE m.module_code = 'master'
  AND NOT EXISTS (SELECT 1 FROM dbo.app_user_module x WHERE x.user_id = m.user_id AND x.module_code = 'base');
DELETE FROM dbo.app_user_module WHERE module_code = 'master';
GO
-- ย้อนกลับ (ถ้าจำเป็น):
-- DROP TABLE dbo.app_doc_seq; DROP TABLE dbo.app_audit;
-- UPDATE dbo.app_user_module SET module_code = 'master' WHERE module_code = 'base';
