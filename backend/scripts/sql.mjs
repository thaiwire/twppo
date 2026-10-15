// รันไฟล์ SQL (แยก batch ด้วยบรรทัด GO) กับฐานข้อมูลใน .env — ใช้กับสคริปต์ใน prisma/sql/
//   npm run sql -- prisma/sql/<ไฟล์>.sql
// ฐานข้อมูลใช้ร่วมกับระบบเดิม: ห้ามใช้ prisma migrate / db push
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import sql from 'mssql';

const file = process.argv[2];
if (!file) {
  console.log('usage: npm run sql -- prisma/sql/<file>.sql');
  process.exit(1);
}
const batches = readFileSync(file, 'utf8')
  .replace(/^\uFEFF/, '')
  .split(/^\s*GO\s*$/im)
  .map((b) => b.trim())
  .filter((b) => b.replace(/^\s*--.*$/gm, '').trim());

const pool = await sql.connect({
  server: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 1433),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: { encrypt: true, trustServerCertificate: true },
});
try {
  for (const [i, b] of batches.entries()) {
    const r = await pool.request().batch(b);
    console.log(`batch ${i + 1}/${batches.length} ok (rows: ${r.rowsAffected.join(', ') || 0})`);
  }
} finally {
  await pool.close();
}
