"use client";

import { Suspense } from "react";
import VendorFields from "@/components/master/VendorFields";
import { MASTER } from "@/components/master/config";
import MasterEditRoute from "@/components/master/MasterEditRoute";
import MasterFormPage from "@/components/master/MasterFormPage";
import type { VendorRecord } from "@/lib/types";

export default function EditVendorPage() {
  return (
    <Suspense>
      <MasterEditRoute
        render={(code) => (
          <MasterFormPage<VendorRecord> {...MASTER.vendors} code={code ?? ""} key={code}>
            <VendorFields editing />
          </MasterFormPage>
        )}
      />
    </Suspense>
  );
}
