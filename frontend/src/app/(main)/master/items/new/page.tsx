"use client";

import ItemFields from "@/components/master/ItemFields";
import { MASTER } from "@/components/master/config";
import MasterFormPage from "@/components/master/MasterFormPage";
import type { ItemRecord } from "@/lib/types";

export default function NewItemPage() {
  return (
    <MasterFormPage<ItemRecord> {...MASTER.items} code={null}>
      <ItemFields editing={false} />
    </MasterFormPage>
  );
}
