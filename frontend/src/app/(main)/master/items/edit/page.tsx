"use client";

import { Suspense } from "react";
import ItemFields from "@/components/master/ItemFields";
import { MASTER } from "@/components/master/config";
import MasterEditRoute from "@/components/master/MasterEditRoute";
import MasterFormPage from "@/components/master/MasterFormPage";
import type { ItemRecord } from "@/lib/types";

export default function EditItemPage() {
  return (
    <Suspense>
      <MasterEditRoute
        render={(code) => (
          <MasterFormPage<ItemRecord> {...MASTER.items} code={code ?? ""} key={code}>
            <ItemFields editing />
          </MasterFormPage>
        )}
      />
    </Suspense>
  );
}
