"use client";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** เรียก backend ผ่าน /api (Next rewrite → NestJS) พร้อม cookie login */
export async function api<T>(
  path: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  if (res.status === 401 && !path.startsWith("/auth/")) {
    // session หมดอายุ → กลับหน้า login (นอก component จึงใช้ router ไม่ได้)
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    throw new ApiError("กรุณาเข้าสู่ระบบ", 401);
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    throw new ApiError(msg || `เกิดข้อผิดพลาด (${res.status})`, res.status);
  }
  return data as T;
}

/** path ของ PR — เลขที่เดิมบางใบมี '/' เช่น 002/0086 จึงต้อง encode */
export const prPath = (nbr: string, suffix = "") =>
  `/pr/${encodeURIComponent(nbr)}${suffix}`;

export function toQuery(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
