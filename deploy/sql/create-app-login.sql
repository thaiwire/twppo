-- สร้าง login สำหรับระบบเว็บ PR แทนการใช้ sa (สิทธิ์เท่าที่จำเป็น)
-- รันด้วย sqlcmd (ผู้ใช้ที่มีสิทธิ์สร้าง login เช่น sa):
--   sqlcmd -S <server> -U sa -P "<sa-password>" -i deploy\sql\create-app-login.sql -v AppLogin="pr_web" AppPassword="<รหัสผ่านใหม่>"
-- แล้วแก้ backend\.env: DB_USER / DB_PASSWORD / DATABASE_URL ให้เป็น login นี้

USE [master];
GO
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'$(AppLogin)')
  CREATE LOGIN [$(AppLogin)] WITH PASSWORD = N'$(AppPassword)', DEFAULT_DATABASE = [dbmtp], CHECK_POLICY = ON;
GO

USE [dbmtp];
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'$(AppLogin)')
  CREATE USER [$(AppLogin)] FOR LOGIN [$(AppLogin)];
GO

-- อ่านได้ทุกตาราง: ฟอร์ม/รายงานอ่านข้อมูลหลัก และการตรวจก่อนลบ (ref-check) ต้องค้นทุกตารางที่อ้างถึงรหัส
ALTER ROLE [db_datareader] ADD MEMBER [$(AppLogin)];
GO

-- เขียนได้เฉพาะตารางที่ระบบเว็บแก้ไข
GRANT INSERT, UPDATE, DELETE ON dbo.prq_mstr TO [$(AppLogin)];   -- ใบเสนอซื้อ
GRANT INSERT, UPDATE, DELETE ON dbo.prq_det  TO [$(AppLogin)];
GRANT UPDATE                 ON dbo.pur_ctrl TO [$(AppLogin)];   -- เลขรันใบ PR (purc_pr)
GRANT INSERT, UPDATE, DELETE ON dbo.vd_mstr  TO [$(AppLogin)];   -- ข้อมูลหลัก (admin/manager)
GRANT INSERT, UPDATE, DELETE ON dbo.it_mstr  TO [$(AppLogin)];
GRANT INSERT, UPDATE, DELETE ON dbo.en_mstr  TO [$(AppLogin)];
GRANT INSERT, UPDATE, DELETE ON dbo.div_mstr TO [$(AppLogin)];
GRANT INSERT, UPDATE, DELETE ON dbo.app_user TO [$(AppLogin)];   -- ผู้ใช้เว็บ
GO

PRINT N'สร้าง/ปรับสิทธิ์ login $(AppLogin) เรียบร้อย';
GO
