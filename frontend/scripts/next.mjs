// เปิด Next.js ด้วย PORT / HOST จากไฟล์ .env.local (หรือ .env)
//   node scripts/next.mjs dev     (npm run dev)
//   node scripts/next.mjs start   (npm start — ใช้กับ service บน server)
//
// ทำไมต้องมีไฟล์นี้: Next.js เปิด HTTP server ก่อนอ่านไฟล์ .env* จึงไม่รู้จัก PORT ที่เขียนใน .env.local
// ไฟล์นี้อ่านค่าให้ก่อน แล้วส่งเป็น -p / -H ให้ next — ค่าใน environment จริงมีสิทธิ์เหนือไฟล์เสมอ
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** อ่าน KEY=VALUE จาก .env (รองรับ # comment และค่าที่ครอบด้วย ' หรือ ") */
function readEnvFile(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2];
    const quoted = value.match(/^(['"])(.*)\1$/);
    value = quoted ? quoted[2] : value.replace(/\s+#.*$/, '').trim();
    out[m[1]] = value;
  }
  return out;
}

// .env.local มีสิทธิ์เหนือ .env (แบบเดียวกับ Next.js)
const fileEnv = { ...readEnvFile(join(root, '.env')), ...readEnvFile(join(root, '.env.local')) };
const port = process.env.PORT || fileEnv.PORT || '3000';
const host = process.env.HOST || fileEnv.HOST || '';

const command = process.argv[2] ?? 'dev';
const args = [command, '-p', port, ...(host ? ['-H', host] : []), ...process.argv.slice(3)];
const nextBin = createRequire(import.meta.url).resolve('next/dist/bin/next');

console.log(`> next ${args.join(' ')}`);
const child = spawn(process.execPath, [nextBin, ...args], { cwd: root, stdio: 'inherit' });

// ส่งสัญญาณหยุดต่อให้ next (systemd / NSSM สั่งหยุด service)
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
child.on('exit', (code, signal) => process.exit(signal ? 0 : (code ?? 0)));
