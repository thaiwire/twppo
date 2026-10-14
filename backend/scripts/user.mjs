// จัดการผู้ใช้ในตาราง app_user (รหัสผ่านเก็บเป็น bcrypt)
//   node scripts/user.mjs add <username> <password> [role] [display name]
//   node scripts/user.mjs passwd <username> <password>
//   node scripts/user.mjs list
// role: admin | manager (อนุมัติได้)  |  user (สร้าง/แก้ไข PR)
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import sql from 'mssql';

const [cmd, username, password, role = 'user', ...name] = process.argv.slice(2);
const pool = await sql.connect({
  server: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 1433),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: { encrypt: true, trustServerCertificate: true },
});

try {
  if (cmd === 'list') {
    const r = await pool.query`SELECT id, username, display_name, role, is_active FROM app_user ORDER BY id`;
    console.table(r.recordset);
  } else if (cmd === 'add' && username && password) {
    const hash = await bcrypt.hash(password, 12);
    await pool.query`INSERT INTO app_user (username, password_hash, display_name, role, is_active)
      VALUES (${username}, ${hash}, ${name.join(' ') || username}, ${role}, 1)`;
    console.log(`เพิ่มผู้ใช้ ${username} (${role}) แล้ว`);
  } else if (cmd === 'passwd' && username && password) {
    const hash = await bcrypt.hash(password, 12);
    const r = await pool.query`UPDATE app_user SET password_hash=${hash}, updated_at=SYSUTCDATETIME() WHERE username=${username}`;
    console.log(r.rowsAffected[0] ? `เปลี่ยนรหัสผ่าน ${username} แล้ว` : `ไม่พบผู้ใช้ ${username}`);
  } else {
    console.log('usage: node scripts/user.mjs add <username> <password> [role] [display name]');
    console.log('       node scripts/user.mjs passwd <username> <password>');
    console.log('       node scripts/user.mjs list');
  }
} finally {
  await pool.close();
}
