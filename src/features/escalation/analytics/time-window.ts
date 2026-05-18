import type { GovernanceAnalyticsTimeWindow, ResolvedGovernanceAnalyticsWindow } from "@/features/escalation/analytics/types";
import type { EscalationDbClient } from "@/features/escalation/types";
import { addDays } from "@/features/escalation/utils/date-utils";

function subtractDays(date: Date, days: number) {
  return addDays(date, -days);
}

function cloneDate(value: Date | null) {
  return value ? new Date(value.getTime()) : null;
}

export async function resolveGovernanceAnalyticsWindow(input: {
  db: EscalationDbClient;
  now: Date;
  timeWindow?: GovernanceAnalyticsTimeWindow;
}): Promise<ResolvedGovernanceAnalyticsWindow> {
  const timeWindow = input.timeWindow ?? { preset: "ALL_TIME" };

  switch (timeWindow.preset) {
    case "LAST_7_DAYS":
      return {
        preset: "LAST_7_DAYS",
        label: "Last 7 days",
        from: subtractDays(input.now, 7),
        to: cloneDate(input.now),
        reviewCycleId: null,
        reviewCycleName: null,
      };

    case "LAST_30_DAYS":
      return {
        preset: "LAST_30_DAYS",
        label: "Last 30 days",
        from: subtractDays(input.now, 30),
        to: cloneDate(input.now),
        reviewCycleId: null,
        reviewCycleName: null,
      };

    case "CURRENT_REVIEW_CYCLE": {
      const [activeReviewCycle] = await input.db.reviewCycle.findMany({
        where: { isActive: true },
        orderBy: [{ startDate: "desc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
        },
      });

      return {
        preset: "CURRENT_REVIEW_CYCLE",
        label: activeReviewCycle?.name ?? "Current review cycle",
        from: activeReviewCycle?.startDate ?? null,
        to: activeReviewCycle?.endDate ?? null,
        reviewCycleId: activeReviewCycle?.id ?? null,
        reviewCycleName: activeReviewCycle?.name ?? null,
      };
    }

    case "CUSTOM":
      return {
        preset: "CUSTOM",
        label: timeWindow.label ?? "Custom range",
        from: cloneDate(timeWindow.from ?? null),
        to: cloneDate(timeWindow.to ?? null),
        reviewCycleId: null,
        reviewCycleName: null,
      };

    case "ALL_TIME":
      return {
        preset: "ALL_TIME",
        label: "All time",
        from: null,
        to: null,
        reviewCycleId: null,
        reviewCycleName: null,
      };
  }
}

export function isDateWithinGovernanceWindow(input: {
  date: Date;
  window: ResolvedGovernanceAnalyticsWindow;
}) {
  const timestamp = input.date.getTime();

  if (input.window.from && timestamp < input.window.from.getTime()) {
    return false;
  }

  if (input.window.to && timestamp > input.window.to.getTime()) {
    return false;
  }

  return true;
}
