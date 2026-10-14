"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import type { AdminLookups } from "./types";

let cache: Promise<AdminLookups> | null = null;

/** ตัวเลือกในฟอร์มข้อมูลหลัก (กลุ่ม, เครดิต, สกุลเงิน, site, หน่วย) + ค่าเริ่มต้นที่ใช้มากที่สุด */
export function useAdminLookups(): AdminLookups | null {
  const [data, setData] = useState<AdminLookups | null>(null);
  useEffect(() => {
    let alive = true;
    cache ??= api<AdminLookups>("/admin/lookups");
    cache.then((d) => alive && setData(d)).catch(() => (cache = null));
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

export const toOptions = (values: string[] | undefined) => (values ?? []).map((value) => ({ value }));
