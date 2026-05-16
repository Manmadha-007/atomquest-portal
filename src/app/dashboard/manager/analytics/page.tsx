import { Activity } from "lucide-react";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";

import { auth } from "@/auth";
import { AnalyticsOverview } from "@/components/analytics/analytics-overview";
import { ExportActions } from "@/components/reports/export-actions";
import { getManagerAnalytics } from "@/lib/analytics/dashboard-analytics";
import { getDashboardPathForRole, SIGN_IN_PATH } from "@/lib/auth";

const managerExportActions = [
  { id: "goals", label: "Goals", href: "/api/exports/goals" },
  {
    id: "quarterly-updates",
    label: "Quarterly updates",
    href: "/api/exports/quarterly-updates",
  },
];

function formatDate(value?: Date | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export default async function ManagerAnalyticsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`${SIGN_IN_PATH}?callbackUrl=/dashboard/manager/analytics`);
  }

  if (session.user.role !== UserRole.MANAGER) {
    redirect(getDashboardPathForRole(session.user.role));
  }

  const analytics = await getManagerAnalytics(session.user.id);

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="relative isolate p-6 sm:p-8">
          <div className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 bg-gradient-to-l from-emerald-500/10 via-sky-500/5 to-transparent lg:block" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <Activity className="size-3.5" aria-hidden="true" />
                Manager analytics
              </div>
              <div className="space-y-2">
                <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                  Team execution analytics
                </h1>
                <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                  Monitor direct-report goal completion, approval queue health,
                  overdue risk, and quarterly progress trends for the active
                  review cycle.
                </p>
              </div>
            </div>
            <div className="rounded-xl border bg-background/80 p-4 shadow-sm">
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
            </div>
          </div>
        </div>
      </section>

      <ExportActions
        actions={managerExportActions}
        description="Direct-report CSV/XLSX reporting."
      />

      <AnalyticsOverview analytics={analytics} scope="manager" />
    </div>
  );
}
