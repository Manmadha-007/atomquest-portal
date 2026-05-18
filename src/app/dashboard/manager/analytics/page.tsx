import { Activity } from "lucide-react";

import { AnalyticsOverview } from "@/components/analytics/analytics-overview";
import { DashboardAuthState } from "@/components/layout/dashboard-auth-state";
import {
  DashboardHero,
  DashboardPage,
} from "@/components/layout/dashboard-page";
import { ExportActions } from "@/components/reports/export-actions";
import { getManagerAnalytics } from "@/lib/analytics/dashboard-analytics";
import { getDashboardUser } from "@/lib/auth/session";

const managerExportActions = [
  { id: "goals", label: "Goals", href: "/api/exports/goals" },
  {
    id: "quarterly-updates",
    label: "Quarterly updates",
    href: "/api/exports/quarterly-updates",
  },
];

function formatDate(
  value?: Date | string | null,
) {
  if (!value) {
    return "Not set";
  }

  const parsedDate =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  ).format(parsedDate);
}

export default async function ManagerAnalyticsPage() {
  const user = await getDashboardUser();

  if (!user || user.role !== "MANAGER") {
    return <DashboardAuthState requiredRole="MANAGER" userRole={user?.role} />;
  }

  const analytics = await getManagerAnalytics(user.id);

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Manager analytics"
        gradientClassName="from-emerald-500/10 via-sky-500/5 to-transparent"
        icon={Activity}
        title="Team execution analytics"
        description="Monitor direct-report goal completion, approval queue health, overdue risk, and quarterly progress trends for the active review cycle."
      >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Active cycle
              </p>
              <p className="mt-1 font-semibold">
                {analytics.reviewCycle?.label ?? "No active review cycle"}
              </p>
              {analytics.reviewCycle ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(analytics.reviewCycle.startDate)} to{" "}
                  {formatDate(analytics.reviewCycle.endDate)}
                </p>
              ) : null}
      </DashboardHero>

      <ExportActions
        actions={managerExportActions}
        description="Direct-report CSV/XLSX reporting."
      />

      <AnalyticsOverview analytics={analytics} scope="manager" />
    </DashboardPage>
  );
}
