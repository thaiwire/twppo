"use client";

import { Suspense } from "react";
import EntityFields from "@/components/master/EntityFields";
import { MASTER } from "@/components/master/config";
import MasterEditRoute from "@/components/master/MasterEditRoute";
import MasterFormPage from "@/components/master/MasterFormPage";
import type { EntityRecord } from "@/lib/types";

export default function EditEntityPage() {
  return (
    <Suspense>
      <MasterEditRoute
        render={(code) => (
          <MasterFormPage<EntityRecord> {...MASTER.entities} code={code ?? ""} key={code}>
            <EntityFields editing />
          </MasterFormPage>
        )}
      />
    </Suspense>
  );
}
