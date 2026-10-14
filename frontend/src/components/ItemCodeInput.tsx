"use client";

import { AutoComplete } from "antd";
import { useRef, useState } from "react";
import { api, toQuery } from "@/lib/api";
import type { Item } from "@/lib/types";

interface Props {
  value?: string;
  onChange?: (value: string) => void;
  onPick?: (item: Item) => void;
  disabled?: boolean;
}

/** รหัสสินค้า: พิมพ์ค้นหาจาก it_mstr หรือเว้นว่างได้ (รายการที่ไม่มีรหัส เช่น ค่าบริการ) */
export default function ItemCodeInput({ value, onChange, onPick, disabled }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = (q: string) => {
    clearTimeout(timer.current);
    if (!q.trim()) return setItems([]);
    timer.current = setTimeout(async () => {
      setItems(await api<Item[]>(`/master/items${toQuery({ q: q.trim() })}`).catch(() => []));
    }, 300);
  };

  return (
    <AutoComplete
      value={value}
      disabled={disabled}
      placeholder="ค้นหารหัส/ชื่อ"
      onSearch={search}
      onChange={(v) => onChange?.(v)}
      onSelect={(v: string) => {
        const it = items.find((i) => i.code === v);
        if (it) onPick?.(it);
      }}
      options={items.map((i) => ({
        value: i.code,
        label: (
          <div style={{ display: "flex", gap: 8 }}>
            <b style={{ minWidth: 80 }}>{i.code.trim()}</b>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{i.name}</span>
          </div>
        ),
      }))}
      popupMatchSelectWidth={420}
      maxLength={60}
    />
  );
}
