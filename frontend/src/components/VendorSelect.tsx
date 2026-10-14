"use client";

import { Select, Spin } from "antd";
import { useEffect, useRef, useState } from "react";
import { api, toQuery } from "@/lib/api";
import type { Vendor } from "@/lib/types";

interface Props {
  value?: string;
  onChange?: (value: string, vendor?: Vendor) => void;
  disabled?: boolean;
}

/** เลือกผู้ขายจาก vd_mstr (ค้นหาจากรหัส/ชื่อ ฝั่ง server) */
export default function VendorSelect({ value, onChange, disabled }: Props) {
  const [options, setOptions] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const seq = useRef(0);

  const search = (q: string, code?: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const my = ++seq.current;
      setLoading(true);
      try {
        const rows = await api<Vendor[]>(`/master/vendors${toQuery({ q, code })}`);
        if (my === seq.current) setOptions(rows);
      } finally {
        if (my === seq.current) setLoading(false);
      }
    }, 300);
  };

  // โหลดชื่อผู้ขายของค่าปัจจุบัน (กรณีเปิดแก้ไข)
  useEffect(() => {
    if (value && !options.some((o) => o.code.toLowerCase() === value.toLowerCase())) {
      search("", value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Select
      showSearch={{ filterOption: false, onSearch: (q) => search(q) }}
      value={value || undefined}
      disabled={disabled}
      placeholder="พิมพ์รหัสหรือชื่อผู้ขาย"
      notFoundContent={loading ? <Spin size="small" /> : "ไม่พบข้อมูล"}
      onFocus={() => options.length === 0 && search("")}
      onChange={(v: string) => onChange?.(v, options.find((o) => o.code === v))}
      options={options.map((v) => ({
        value: v.code,
        label: `${v.code}  ${v.name}`,
        disabled: v.status?.toLowerCase() === "c",
      }))}
      allowClear
    />
  );
}
