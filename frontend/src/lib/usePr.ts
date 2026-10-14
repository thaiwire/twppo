"use client";

import { useEffect, useState } from "react";
import { api, prPath } from "./api";
import type { PrDetail } from "./types";

export function usePr(nbr: string | null) {
  const [state, setState] = useState<{ nbr: string; pr?: PrDetail; error?: string } | null>(null);

  useEffect(() => {
    if (!nbr) return;
    let alive = true;
    api<PrDetail>(prPath(nbr))
      .then((pr) => alive && setState({ nbr, pr }))
      .catch((e: Error) => alive && setState({ nbr, error: e.message }));
    return () => {
      alive = false;
    };
  }, [nbr]);

  const current = state?.nbr === nbr ? state : null;
  return {
    pr: current?.pr ?? null,
    error: nbr ? current?.error : "ไม่ได้ระบุเลขที่ใบเสนอซื้อ",
    setPr: (pr: PrDetail) => setState({ nbr: pr.nbr, pr }),
  };
}
