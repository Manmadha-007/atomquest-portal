import { DashboardAuthState } from "@/components/layout/dashboard-auth-state";
import { getDashboardUser } from "@/lib/auth/session";

export default async function ManagerDashboardPage() {
  const user = await getDashboardUser();

  return (
    <DashboardAuthState
      description="Open the manager team-goals workspace to continue."
      requiredRole="MANAGER"
      title="Manager workspace"
      userRole={user?.role}
    />
  );
}
