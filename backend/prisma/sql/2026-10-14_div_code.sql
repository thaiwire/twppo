-- หน่วยงาน (div_mstr) ของผู้ใช้และใบ PR — คอลัมน์ใหม่เป็น NULL ได้ (ข้อมูลเดิมไม่กระทบ)
-- ฐานข้อมูลนี้ใช้ร่วมกับระบบเดิม: ห้ามใช้ prisma migrate — รันสคริปต์นี้ด้วยมือ แล้ว `npx prisma generate`
IF COL_LENGTH('dbo.app_user', 'div_code') IS NULL
  ALTER TABLE dbo.app_user ADD div_code NVARCHAR(24) NULL;
GO
IF COL_LENGTH('dbo.prq_mstr', 'prq_divcode') IS NULL
  ALTER TABLE dbo.prq_mstr ADD prq_divcode NVARCHAR(24) NULL;
GO
-- ย้อนกลับ (ถ้าจำเป็น):
-- ALTER TABLE dbo.app_user DROP COLUMN div_code;
-- ALTER TABLE dbo.prq_mstr DROP COLUMN prq_divcode;
