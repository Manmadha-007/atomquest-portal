import { GitBranch, RadioTower, ShieldCheck, UsersRound } from "lucide-react";

import { SharedGoalDialog } from "@/components/goals/shared-goal-dialog";
import { SharedGoalsTable } from "@/components/goals/shared-goals-table";
import { DashboardAuthState } from "@/components/layout/dashboard-auth-state";
import {
  DashboardHero,
  DashboardMetricGrid,
  DashboardPage,
} from "@/components/layout/dashboard-page";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardUser } from "@/lib/auth/session";
import { getSharedGoalsDashboard } from "@/lib/goals/shared-goals";

export default async function AdminSharedGoalsPage() {
  const user = await getDashboardUser();

  if (!user || user.role !== "ADMIN") {
    return <DashboardAuthState requiredRole="ADMIN" userRole={user?.role} />;
  }

  const dashboard = await getSharedGoalsDashboard({
    actorId: user.id,
    actorRole: user.role,
  });
  const reviewCycleLabel =
    dashboard.reviewCycle?.label ?? "No active review cycle";

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Enterprise KPI propagation"
        gradientClassName="from-sky-500/10 via-emerald-500/5 to-transparent"
        icon={ShieldCheck}
        title="Shared goals"
        description="Push approved primary KPIs across the organization, preserve parent-owned achievement state, and keep every linked assignment auditable."
      >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Active cycle
              </p>
              <p className="mt-1 font-semibold">{reviewCycleLabel}</p>
              {dashboard.reviewCycle ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {dashboard.reviewCycle.startDateLabel} to{" "}
                  {dashboard.reviewCycle.endDateLabel}
                </p>
              ) : null}
      </DashboardHero>

      <DashboardMetricGrid
        ariaLabel="Shared goal propagation summary"
        className="md:grid-cols-4"
      >
        <Card className="h-full rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Linked goals</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <GitBranch className="size-5 text-muted-foreground" />
              {dashboard.metrics.linkedGoals}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="h-full rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Primary KPIs</CardDescription>
            <CardTitle className="text-2xl">
              {dashboard.metrics.primaryGoals}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="h-full rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Linked employees</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <UsersRound className="size-5 text-muted-foreground" />
              {dashboard.metrics.linkedEmployees}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="h-full rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Synced from primary</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <RadioTower className="size-5 text-muted-foreground" />
              {dashboard.metrics.syncedGoals}
            </CardTitle>
          </CardHeader>
        </Card>
      </DashboardMetricGrid>

      {!dashboard.reviewCycle ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>No active review cycle</CardTitle>
            <CardDescription>
              Shared goal propagation opens once a quarterly cycle is active.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Existing linked goals remain visible to historical reporting after
              the cycle is closed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-base font-semibold">
                Propagation workspace
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {dashboard.primaryGoalOptions.length} approved KPI
                {dashboard.primaryGoalOptions.length === 1 ? "" : "s"} and{" "}
                {dashboard.employeeOptions.length} active employee
                {dashboard.employeeOptions.length === 1 ? "" : "s"} available.
              </p>
            </div>
            <SharedGoalDialog
              primaryGoals={dashboard.primaryGoalOptions}
              employees={dashboard.employeeOptions}
              scope="admin"
            />
          </div>
          <SharedGoalsTable
            goals={dashboard.rows}
            reviewCycleLabel={reviewCycleLabel}
            scope="admin"
          />
        </>
      )}
    </DashboardPage>
  );
}
