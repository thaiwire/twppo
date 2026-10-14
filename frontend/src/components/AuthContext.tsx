"use client";

import { Spin } from "antd";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Me } from "@/lib/types";

const AuthCtx = createContext<{ me: Me; setMe: (me: Me) => void } | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const router = useRouter();

  useEffect(() => {
    api<Me>("/auth/me")
      .then(setMe)
      .catch(() => router.replace("/login"));
  }, [router]);

  if (!me) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }
  return <AuthCtx.Provider value={{ me, setMe }}>{children}</AuthCtx.Provider>;
}

export function useMe(): Me {
  return useAuth().me;
}

/** ใช้เมื่อต้องอัปเดตข้อมูลผู้ใช้ในหน้าจอ (เช่น หลังแก้ไขโปรไฟล์) */
export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
