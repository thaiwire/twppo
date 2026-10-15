// จัดการผู้ใช้ในตาราง app_user (รหัสผ่านเก็บเป็น bcrypt)
//   node scripts/user.mjs add <username> <password> [role] [display name]
//   node scripts/user.mjs passwd <username> <password>
//   node scripts/user.mjs list
// role: admin   = ผู้ดูแลระบบ (ทุก module)
//       manager = ผู้ใช้ที่ได้สิทธิ์ pr: manager (อนุมัติได้) + base: manager
//       user    = ผู้ใช้ที่ได้สิทธิ์ pr: user
// สิทธิ์ module อื่น ๆ ตั้งต่อได้ที่เว็บ เมนู Admin → ผู้ใช้งาน
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
    const r = await pool.query`SELECT u.id, u.username, u.display_name, u.role, u.is_active,
      STUFF((SELECT ', ' + m.module_code + ':' + m.level FROM app_user_module m WHERE m.user_id = u.id
             ORDER BY m.module_code FOR XML PATH('')), 1, 2, '') AS modules
      FROM app_user u ORDER BY u.id`;
    console.table(r.recordset);
  } else if (cmd === 'add' && username && password) {
    const hash = await bcrypt.hash(password, 12);
    const r = await pool.query`INSERT INTO app_user (username, password_hash, display_name, role, is_active)
      OUTPUT INSERTED.id VALUES (${username}, ${hash}, ${name.join(' ') || username}, ${role === 'admin' ? 'admin' : 'user'}, 1)`;
    const id = r.recordset[0].id;
    const modules = role === 'admin' ? [] : role === 'manager' ? [['pr', 'manager'], ['base', 'manager']] : [['pr', 'user']];
    for (const [m, level] of modules)
      await pool.query`INSERT INTO app_user_module (user_id, module_code, level) VALUES (${id}, ${m}, ${level})`;
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
