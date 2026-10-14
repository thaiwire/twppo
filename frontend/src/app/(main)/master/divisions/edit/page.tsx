"use client";

import { Suspense } from "react";
import DivisionFields from "@/components/master/DivisionFields";
import { MASTER } from "@/components/master/config";
import MasterEditRoute from "@/components/master/MasterEditRoute";
import MasterFormPage from "@/components/master/MasterFormPage";
import type { DivisionRecord } from "@/lib/types";

export default function EditDivisionPage() {
  return (
    <Suspense>
      <MasterEditRoute
        render={(code) => (
          <MasterFormPage<DivisionRecord> {...MASTER.divisions} code={code ?? ""} key={code} maxWidth={760}>
            <DivisionFields editing />
          </MasterFormPage>
        )}
      />
    </Suspense>
  );
}
