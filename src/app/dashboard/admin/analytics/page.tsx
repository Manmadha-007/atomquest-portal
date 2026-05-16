import { BarChart3 } from "lucide-react";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";

import { AnalyticsOverview } from "@/components/analytics/analytics-overview";
import { getAdminAnalytics } from "@/lib/analytics/dashboard-analytics";
import { getDashboardPathForRole, SIGN_IN_PATH } from "@/lib/auth";
import { auth } from "@/auth";

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

export default async function AdminAnalyticsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`${SIGN_IN_PATH}?callbackUrl=/dashboard/admin/analytics`);
  }

  if (session.user.role !== UserRole.ADMIN) {
    redirect(getDashboardPathForRole(session.user.role));
  }

  const analytics = await getAdminAnalytics();

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="relative isolate p-6 sm:p-8">
          <div className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 bg-gradient-to-l from-sky-500/10 via-emerald-500/5 to-transparent lg:block" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <BarChart3 className="size-3.5" aria-hidden="true" />
                Executive analytics
              </div>
              <div className="space-y-2">
                <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                  Enterprise goal analytics
                </h1>
                <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                  Track active-cycle goal health, approval throughput,
                  completion, overdue exposure, and department performance from
                  one executive dashboard.
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

      <AnalyticsOverview analytics={analytics} scope="admin" />
    </div>
  );
}
