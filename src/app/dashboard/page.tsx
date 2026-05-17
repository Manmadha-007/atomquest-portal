import "server-only";

import { DashboardAuthState } from "@/components/layout/dashboard-auth-state";
import { getDashboardUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  const user = await getDashboardUser();

  return (
    <DashboardAuthState
      title="Workspace routing unavailable"
      description={
        user
          ? "Your workspace could not be resolved for this request. Open your assigned dashboard to continue."
          : "Your dashboard session could not be resolved."
      }
      userRole={user?.role}
    />
  );
}