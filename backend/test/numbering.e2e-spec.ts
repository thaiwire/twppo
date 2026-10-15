// ทดสอบ NumberingService กับฐานข้อมูลจริงใน .env (ควรเป็น dbmtp_dev) — รัน: npm run test:e2e
// ใช้ doc_type 'ZZTEST' แล้วลบทิ้งท้าย
import 'dotenv/config';
import { NumberingService } from '../src/core/numbering/numbering.service.js';
import { PrismaService } from '../src/core/prisma/prisma.service.js';

const prisma = new PrismaService();
const numbering = new NumberingService();
const DOC = 'ZZTEST';
const clean = () => prisma.app_doc_seq.deleteMany({ where: { doc_type: DOC } });

beforeAll(clean);
afterAll(async () => {
  await clean();
  await prisma.$disconnect();
});

const issue = (exists?: (n: string) => Promise<boolean>) =>
  prisma.$transaction((tx) => numbering.next(tx, DOC, { prefix: 'ZZ', period: 'none', digits: 5 }, exists));

describe('NumberingService', () => {
  it('ออกเลขเรียงกันและสร้างตัวนับให้เองเมื่อยังไม่มี', async () => {
    expect(await issue()).toBe('ZZ00001');
    expect(await issue()).toBe('ZZ00002');
  });

  it('20 คำขอพร้อมกัน ได้เลขไม่ซ้ำ', async () => {
    const nbrs = await Promise.all(Array.from({ length: 20 }, () => issue()));
    expect(new Set(nbrs).size).toBe(20);
  });

  it('ข้ามเลขที่มีเอกสารอยู่แล้ว', async () => {
    const taken = new Set(['ZZ00023', 'ZZ00024']);
    expect(await issue(async (n) => taken.has(n))).toBe('ZZ00025');
  });

  it('transaction ล้มเหลว = ตัวนับย้อนกลับ (ไม่มีเลขหาย)', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await numbering.next(tx, DOC, { prefix: 'ZZ', period: 'none', digits: 5 });
        throw new Error('บันทึกเอกสารไม่สำเร็จ');
      }),
    ).rejects.toThrow();
    expect(await issue()).toBe('ZZ00026');
  });

  it('แยกงวดรายเดือน: SO + yyMM + เลขรัน', async () => {
    const n = await prisma.$transaction((tx) => numbering.next(tx, DOC, { prefix: 'SO', period: 'month', digits: 4 }));
    expect(n).toMatch(/^SO\d{4}0001$/);
  });
});
