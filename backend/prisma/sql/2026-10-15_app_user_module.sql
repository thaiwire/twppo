-- สิทธิ์ใช้งาน module ของผู้ใช้ (1 ผู้ใช้มีได้หลาย module แต่ละ module มีระดับ user / manager)
-- role admin ใน app_user ใช้ได้ทุก module (ระดับ manager) โดยไม่ต้องมีแถวในตารางนี้
-- ฐานข้อมูลนี้ใช้ร่วมกับระบบเดิม: ห้ามใช้ prisma migrate — รันสคริปต์นี้ด้วยมือ
--   (cd backend && npm run sql -- prisma/sql/2026-10-15_app_user_module.sql) แล้ว `npx prisma generate`
IF OBJECT_ID('dbo.app_user_module', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.app_user_module (
    user_id     INT          NOT NULL,
    module_code NVARCHAR(20) NOT NULL,
    level       NVARCHAR(20) NOT NULL CONSTRAINT DF_app_user_module_level DEFAULT 'user',
    CONSTRAINT PK_app_user_module PRIMARY KEY (user_id, module_code),
    CONSTRAINT FK_app_user_module_user FOREIGN KEY (user_id) REFERENCES dbo.app_user (id) ON DELETE CASCADE,
    CONSTRAINT CK_app_user_module_level CHECK (level IN ('user', 'manager'))
  );

  -- ย้ายสิทธิ์จากระบบเดิม (role ใน app_user) ให้ผู้ใช้ทุกคนได้สิทธิ์เท่าเดิม
  --   user    → pr: user
  --   manager → pr: manager (อนุมัติได้) + master: manager (เพิ่ม/แก้ไข/ลบข้อมูลหลัก)
  --   admin   → ไม่ต้องเพิ่ม (ใช้ได้ทุก module)
  INSERT INTO dbo.app_user_module (user_id, module_code, level)
  SELECT id, 'pr', CASE WHEN LOWER(LTRIM(RTRIM(role))) = 'manager' THEN 'manager' ELSE 'user' END
  FROM dbo.app_user
  WHERE LOWER(LTRIM(RTRIM(role))) <> 'admin';

  INSERT INTO dbo.app_user_module (user_id, module_code, level)
  SELECT id, 'master', 'manager'
  FROM dbo.app_user
  WHERE LOWER(LTRIM(RTRIM(role))) = 'manager';
END
GO
-- ย้อนกลับ (ถ้าจำเป็น):
-- DROP TABLE dbo.app_user_module;
