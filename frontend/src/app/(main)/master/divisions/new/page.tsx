"use client";

import DivisionFields from "@/components/master/DivisionFields";
import { MASTER } from "@/components/master/config";
import MasterFormPage from "@/components/master/MasterFormPage";
import type { DivisionRecord } from "@/lib/types";

export default function NewDivisionPage() {
  return (
    <MasterFormPage<DivisionRecord> {...MASTER.divisions} code={null} maxWidth={760}>
      <DivisionFields editing={false} />
    </MasterFormPage>
  );
}
