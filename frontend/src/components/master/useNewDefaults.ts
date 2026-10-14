"use client";

import { Form } from "antd";
import { useEffect } from "react";

/**
 * เติมค่าเริ่มต้นให้ฟอร์ม "เพิ่มใหม่" เมื่อข้อมูลตัวเลือกโหลดเสร็จ
 * เติมเฉพาะช่องที่ยังว่าง (ไม่ทับสิ่งที่ผู้ใช้พิมพ์ไปแล้ว)
 */
export function useNewDefaults(editing: boolean, defaults: Record<string, unknown> | null) {
  const form = Form.useFormInstance();
  useEffect(() => {
    if (editing || !defaults) return;
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(defaults)) {
      if (v !== undefined && v !== null && form.getFieldValue(k) === undefined) patch[k] = v;
    }
    if (Object.keys(patch).length) form.setFieldsValue(patch);
  }, [editing, defaults, form]);
}
