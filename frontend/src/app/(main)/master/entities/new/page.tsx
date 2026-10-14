"use client";

import EntityFields from "@/components/master/EntityFields";
import { MASTER } from "@/components/master/config";
import MasterFormPage from "@/components/master/MasterFormPage";
import type { EntityRecord } from "@/lib/types";

export default function NewEntityPage() {
  return (
    <MasterFormPage<EntityRecord> {...MASTER.entities} code={null}>
      <EntityFields editing={false} />
    </MasterFormPage>
  );
}
