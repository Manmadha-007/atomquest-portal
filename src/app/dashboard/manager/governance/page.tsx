import { GovernanceConsole } from "@/components/governance/governance-console";
import { DashboardAuthState } from "@/components/layout/dashboard-auth-state";
import { getDashboardUser } from "@/lib/auth/session";

export default async function ManagerGovernancePage() {
  const user = await getDashboardUser();

  if (!user || user.role !== "MANAGER") {
    return <DashboardAuthState requiredRole="MANAGER" userRole={user?.role} />;
  }

  return <GovernanceConsole role="MANAGER" />;
}
