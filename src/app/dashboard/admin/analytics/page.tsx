import { BarChart3 } from "lucide-react";

import { AnalyticsOverview } from "@/components/analytics/analytics-overview";
import { DashboardAuthState } from "@/components/layout/dashboard-auth-state";
import {
  DashboardHero,
  DashboardPage,
} from "@/components/layout/dashboard-page";
import { ExportActions } from "@/components/reports/export-actions";
import { getAdminAnalytics } from "@/lib/analytics/dashboard-analytics";
import { getDashboardUser } from "@/lib/auth/session";

const adminExportActions = [
  { id: "goals", label: "Goals", href: "/api/exports/goals" },
  {
    id: "quarterly-updates",
    label: "Quarterly updates",
    href: "/api/exports/quarterly-updates",
  },
  { id: "audit-logs", label: "Audit logs", href: "/api/exports/audit-logs" },
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

export default async function AdminAnalyticsPage() {
  const user = await getDashboardUser();

  if (!user || user.role !== "ADMIN") {
    return <DashboardAuthState requiredRole="ADMIN" userRole={user?.role} />;
  }

  const analytics = await getAdminAnalytics();

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Executive analytics"
        gradientClassName="from-sky-500/10 via-emerald-500/5 to-transparent"
        icon={BarChart3}
        title="Enterprise goal analytics"
        description="Track active-cycle goal health, approval throughput, completion, overdue exposure, and department performance from one executive dashboard."
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
        actions={adminExportActions}
        description="Organization-wide CSV/XLSX reporting."
      />

      <AnalyticsOverview analytics={analytics} scope="admin" />
    </DashboardPage>
  );
}
