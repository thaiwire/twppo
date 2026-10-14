"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import type { Division, Entity, VatClass } from "./types";

export interface MasterData {
  entities: Entity[];
  vatClasses: VatClass[];
  units: string[];
  divisions: Division[];
}

let cache: Promise<MasterData> | null = null;

function load(): Promise<MasterData> {
  cache ??= Promise.all([
    api<Entity[]>("/master/entities"),
    api<VatClass[]>("/master/vat-classes"),
    api<string[]>("/master/units"),
    api<Division[]>("/master/divisions"),
  ]).then(([entities, vatClasses, units, divisions]) => ({ entities, vatClasses, units, divisions }));
  cache.catch(() => (cache = null));
  return cache;
}

/** ข้อมูลหลักที่ไม่ค่อยเปลี่ยน (บริษัท, ประเภทภาษี, หน่วยนับ, หน่วยงาน) — โหลดครั้งเดียวต่อ session */
export function useMaster(): MasterData | null {
  const [data, setData] = useState<MasterData | null>(null);
  useEffect(() => {
    let alive = true;
    load().then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

/** ล้าง cache หลังแก้ไขข้อมูลหลัก (เช่น เพิ่ม/ลบหน่วยงาน) ให้ตัวเลือกในฟอร์มอัปเดต */
export function invalidateMaster() {
  cache = null;
}

/** ตัวเลือกหน่วยงานสำหรับ Select */
export const divisionOptions = (divisions: Division[] | undefined) =>
  (divisions ?? []).map((d) => ({ value: d.code, label: `${d.code}  ${d.name}` }));
