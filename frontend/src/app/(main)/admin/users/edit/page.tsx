"use client";

import { Suspense } from "react";
import UserFields from "@/components/admin/UserFields";
import { USERS } from "@/components/master/config";
import MasterEditRoute from "@/components/master/MasterEditRoute";
import MasterFormPage from "@/components/master/MasterFormPage";
import type { UserRecord } from "@/lib/types";

export default function EditUserPage() {
  return (
    <Suspense>
      <MasterEditRoute
        render={(code) => (
          <MasterFormPage<UserRecord> {...USERS} code={code ?? ""} key={code} maxWidth={900}>
            <UserFields editing />
          </MasterFormPage>
        )}
      />
    </Suspense>
  );
}
