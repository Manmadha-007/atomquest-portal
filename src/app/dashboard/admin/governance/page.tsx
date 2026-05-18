import { DashboardAuthState } from "@/components/layout/dashboard-auth-state";
import { GovernanceConsole } from "@/components/governance/governance-console";
import { getDashboardUser } from "@/lib/auth/session";

export default async function AdminGovernancePage() {
  const user = await getDashboardUser();

  if (!user || user.role !== "ADMIN") {
    return <DashboardAuthState requiredRole="ADMIN" userRole={user?.role} />;
  }

  return <GovernanceConsole role="ADMIN" />;
}
