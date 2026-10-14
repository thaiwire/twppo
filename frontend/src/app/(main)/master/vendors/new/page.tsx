"use client";

import VendorFields from "@/components/master/VendorFields";
import { MASTER } from "@/components/master/config";
import MasterFormPage from "@/components/master/MasterFormPage";
import type { VendorRecord } from "@/lib/types";

export default function NewVendorPage() {
  return (
    <MasterFormPage<VendorRecord> {...MASTER.vendors} code={null}>
      <VendorFields editing={false} />
    </MasterFormPage>
  );
}
