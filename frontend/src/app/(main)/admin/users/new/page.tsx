"use client";

import UserFields from "@/components/admin/UserFields";
import { USERS } from "@/components/master/config";
import MasterFormPage from "@/components/master/MasterFormPage";
import type { UserRecord } from "@/lib/types";

export default function NewUserPage() {
  return (
    <MasterFormPage<UserRecord> {...USERS} code={null} maxWidth={900}>
      <UserFields editing={false} />
    </MasterFormPage>
  );
}
