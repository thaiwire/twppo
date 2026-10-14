"use client";

import { App, ConfigProvider } from "antd";
import thTH from "antd/locale/th_TH";
import dayjs from "dayjs";
import "dayjs/locale/th";

dayjs.locale("th");

/** ธีมโทนเดียวกับ theme/ (sidebar น้ำเงินเข้ม, ปุ่มหลักสีน้ำเงิน) */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      locale={thTH}
      theme={{
        token: {
          colorPrimary: "#2563eb",
          borderRadius: 8,
          fontFamily: '"Sarabun", "Leelawadee UI", Tahoma, "Segoe UI", sans-serif',
        },
        components: {
          Layout: { siderBg: "#1e293b", headerBg: "#111827", bodyBg: "#f3f4f6" },
          Menu: {
            darkItemBg: "#1e293b",
            darkSubMenuItemBg: "#1e293b",
            darkItemSelectedBg: "#2563eb",
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
