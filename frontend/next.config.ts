import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // ปิด cacheComponents: ทุกหน้าอยู่หลัง login และ render ฝั่ง client
  // อีกทั้ง CSS-in-JS ของ antd ใช้ค่า random ซึ่งขัดกับการ prerender ของ cacheComponents
  cacheComponents: false,
  // ส่งต่อ /api/* ไปที่ NestJS backend (same-origin → cookie login ใช้ได้ทันที)
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
