import {
  EscalationExecutionStatus,
  EscalationLevel,
  EscalationStatus,
  EscalationTriggerSource,
  EscalationType,
  Prisma,
} from "@prisma/client";

import {
  isDateWithinGovernanceWindow,
  resolveGovernanceAnalyticsWindow,
} from "@/features/escalation/analytics/time-window";
import type {
  DepartmentAccountabilityMetric,
  EscalationAgingBucket,
  EscalationLifecycleMetrics,
  EscalationOverviewMetrics,
  EscalationRecurrenceMetric,
  ExecutionHealthMetrics,
  GovernanceAccountabilityMetrics,
  GovernanceAnalyticsServiceInput,
  GovernanceDashboardMetrics,
  ManagerAccountabilityMetric,
  ResolvedGovernanceAnalyticsWindow,
  ResolutionOwnerMetric,
  ReviewCycleEscalationMetrics,
} from "@/features/escalation/analytics/types";
import type { EscalationDbClient } from "@/features/escalation/types";
import { daysBetween } from "@/features/escalation/utils/date-utils";

const ESCALATION_STATUSES = [
  EscalationStatus.OPEN,
  EscalationStatus.RESOLVED,
  EscalationStatus.DISMISSED,
] as const;
const ESCALATION_TYPES = [
  EscalationType.GOAL_NOT_SUBMITTED,
  EscalationType.APPROVAL_PENDING_TOO_LONG,
  EscalationType.CHECKIN_MISSED,
] as const;
const ESCALATION_LEVELS = [
  EscalationLevel.LEVEL_1,
  EscalationLevel.LEVEL_2,
  EscalationLevel.LEVEL_3,
] as const;
const EXECUTION_STATUSES = [
  EscalationExecutionStatus.RUNNING,
  EscalationExecutionStatus.COMPLETED,
  EscalationExecutionStatus.FAILED,
  EscalationExecutionStatus.PARTIALLY_COMPLETED,
] as const;
const TRIGGER_SOURCES = [
  EscalationTriggerSource.MANUAL,
  EscalationTriggerSource.API,
  EscalationTriggerSource.CLI,
  EscalationTriggerSource.SYSTEM,
] as const;

const escalationAnalyticsLogSelect = {
  id: true,
  escalationType: true,
  escalationLevel: true,
  status: true,
  triggeredAt: true,
  resolvedAt: true,
  resolvedByUserId: true,
  dismissedAt: true,
  dismissedByUserId: true,
  employeeId: true,
  managerId: true,
  targetGoalId: true,
  metadata: true,
  employee: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      department: true,
    },
  },
  manager: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      department: true,
    },
  },
  resolvedByUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      department: true,
    },
  },
  dismissedByUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      department: true,
    },
  },
  targetGoal: {
    select: {
      id: true,
      title: true,
      reviewCycleId: true,
      reviewCycle: {
        select: {
          id: true,
          name: true,
          year: true,
          quarter: true,
        },
      },
    },
  },
  escalationRule: {
    select: {
      id: true,
      name: true,
      reviewCycleId: true,
      reviewCycle: {
        select: {
          id: true,
          name: true,
          year: true,
          quarter: true,
        },
      },
    },
  },
} as const satisfies Prisma.EscalationLogSelect;

const escalationExecutionAnalyticsSelect = {
  id: true,
  startedAt: true,
  completedAt: true,
  status: true,
  triggeredByUserId: true,
  triggerSource: true,
  rulesEvaluated: true,
  violationsDetected: true,
  logsCreated: true,
  evaluationDuplicates: true,
  notificationsAttempted: true,
  notificationsDelivered: true,
  notificationsSkipped: true,
  notificationDuplicates: true,
  failures: true,
  errorSummary: true,
  metadata: true,
} as const satisfies Prisma.EscalationExecutionSelect;

type EscalationAnalyticsLogRecord = Prisma.EscalationLogGetPayload<{
  select: typeof escalationAnalyticsLogSelect;
}>;

type EscalationExecutionAnalyticsRecord = Prisma.EscalationExecutionGetPayload<{
  select: typeof escalationExecutionAnalyticsSelect;
}>;

type ReviewCycleDescriptor = Readonly<{
  id: string;
  name: string;
  year: number | null;
  quarter: number | null;
}>;

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}

function ratio(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : roundMetric(numerator / denominator);
}

function hoursBetween(start: Date, end: Date) {
  return Math.max(0, (end.getTime() - start.getTime()) / (60 * 60 * 1000));
}

function mean(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return roundMetric(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function userDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
} | null | undefined) {
  const name = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
  return name || user?.email || "Unassigned";
}

function jsonObject(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Prisma.JsonObject;
}

function metadataString(
  metadata: Prisma.JsonValue | null | undefined,
  key: string,
) {
  const value = jsonObject(metadata)?.[key];
  return typeof value === "string" ? value : null;
}

function metadataNumber(
  metadata: Prisma.JsonValue | null | undefined,
  key: string,
) {
  const value = jsonObject(metadata)?.[key];
  return typeof value === "number" ? value : null;
}

function nestedJsonObject(
  metadata: Prisma.JsonValue | null | undefined,
  key: string,
) {
  const value = jsonObject(metadata)?.[key];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Prisma.JsonObject;
}

function resolveReviewCycleDescriptor(
  log: EscalationAnalyticsLogRecord,
): ReviewCycleDescriptor | null {
  if (log.targetGoal?.reviewCycle) {
    return {
      id: log.targetGoal.reviewCycle.id,
      name: log.targetGoal.reviewCycle.name,
      year: log.targetGoal.reviewCycle.year,
      quarter: log.targetGoal.reviewCycle.quarter,
    };
  }

  if (log.escalationRule.reviewCycle) {
    return {
      id: log.escalationRule.reviewCycle.id,
      name: log.escalationRule.reviewCycle.name,
      year: log.escalationRule.reviewCycle.year,
      quarter: log.escalationRule.reviewCycle.quarter,
    };
  }

  const metadataReviewCycleId = metadataString(log.metadata, "reviewCycleId");

  if (metadataReviewCycleId) {
    return {
      id: metadataReviewCycleId,
      name:
        metadataString(log.metadata, "reviewCycleName") ??
        metadataReviewCycleId,
      year: metadataNumber(log.metadata, "reviewCycleYear"),
      quarter: metadataNumber(log.metadata, "reviewCycleQuarter"),
    };
  }

  return null;
}

function reviewCycleMatchesWindow(input: {
  log: EscalationAnalyticsLogRecord;
  window: ResolvedGovernanceAnalyticsWindow;
}) {
  if (!input.window.reviewCycleId) {
    return true;
  }

  return resolveReviewCycleDescriptor(input.log)?.id === input.window.reviewCycleId;
}

async function loadEscalationLogs(input: {
  db: EscalationDbClient;
  window: ResolvedGovernanceAnalyticsWindow;
}) {
  const logs = await input.db.escalationLog.findMany({
    orderBy: [{ triggeredAt: "asc" }, { id: "asc" }],
    select: escalationAnalyticsLogSelect,
  });

  return logs.filter(
    (log) =>
      isDateWithinGovernanceWindow({
        date: log.triggeredAt,
        window: input.window,
      }) &&
      reviewCycleMatchesWindow({
        log,
        window: input.window,
      }),
  );
}

async function loadExecutions(input: {
  db: EscalationDbClient;
  window: ResolvedGovernanceAnalyticsWindow;
}) {
  const executions = await input.db.escalationExecution.findMany({
    orderBy: [{ startedAt: "desc" }, { id: "asc" }],
    select: escalationExecutionAnalyticsSelect,
  });

  return executions.filter((execution) =>
    isDateWithinGovernanceWindow({
      date: execution.startedAt,
      window: input.window,
    }),
  );
}

async function withDefaultDb<T>(
  callback: (db: EscalationDbClient) => Promise<T>,
) {
  const { prisma } = await import("@/lib/prisma");
  return callback(prisma as unknown as EscalationDbClient);
}

async function resolveWindow(input: {
  db: EscalationDbClient;
  now: Date;
  timeWindow?: GovernanceAnalyticsServiceInput["timeWindow"];
}) {
  return resolveGovernanceAnalyticsWindow({
    db: input.db,
    now: input.now,
    timeWindow: input.timeWindow,
  });
}

function countEscalationsByStatus(
  logs: EscalationAnalyticsLogRecord[],
  status: EscalationStatus,
) {
  return logs.filter((log) => log.status === status).length;
}

function buildOverview(input: {
  logs: EscalationAnalyticsLogRecord[];
  generatedAt: Date;
  window: ResolvedGovernanceAnalyticsWindow;
}): EscalationOverviewMetrics {
  const byReviewCycle = new Map<string, ReviewCycleEscalationMetrics>();

  for (const log of input.logs) {
    const descriptor = resolveReviewCycleDescriptor(log);
    const reviewCycleId = descriptor?.id ?? null;
    const key = reviewCycleId ?? "UNSCOPED";
    const existing =
      byReviewCycle.get(key) ??
      ({
        reviewCycleId,
        reviewCycleName: descriptor?.name ?? "Unscoped governance context",
        year: descriptor?.year ?? null,
        quarter: descriptor?.quarter ?? null,
        count: 0,
        openCount: 0,
        resolvedCount: 0,
        dismissedCount: 0,
      } satisfies ReviewCycleEscalationMetrics);

    byReviewCycle.set(key, {
      ...existing,
      count: existing.count + 1,
      openCount:
        existing.openCount + (log.status === EscalationStatus.OPEN ? 1 : 0),
      resolvedCount:
        existing.resolvedCount +
        (log.status === EscalationStatus.RESOLVED ? 1 : 0),
      dismissedCount:
        existing.dismissedCount +
        (log.status === EscalationStatus.DISMISSED ? 1 : 0),
    });
  }

  return {
    generatedAt: input.generatedAt,
    window: input.window,
    totalEscalations: input.logs.length,
    openEscalations: countEscalationsByStatus(input.logs, EscalationStatus.OPEN),
    resolvedEscalations: countEscalationsByStatus(
      input.logs,
      EscalationStatus.RESOLVED,
    ),
    dismissedEscalations: countEscalationsByStatus(
      input.logs,
      EscalationStatus.DISMISSED,
    ),
    unresolvedEscalations: countEscalationsByStatus(
      input.logs,
      EscalationStatus.OPEN,
    ),
    byStatus: ESCALATION_STATUSES.map((status) => ({
      status,
      count: countEscalationsByStatus(input.logs, status),
    })),
    byType: ESCALATION_TYPES.map((escalationType) => {
      const typedLogs = input.logs.filter(
        (log) => log.escalationType === escalationType,
      );

      return {
        escalationType,
        count: typedLogs.length,
        openCount: countEscalationsByStatus(typedLogs, EscalationStatus.OPEN),
        resolvedCount: countEscalationsByStatus(
          typedLogs,
          EscalationStatus.RESOLVED,
        ),
        dismissedCount: countEscalationsByStatus(
          typedLogs,
          EscalationStatus.DISMISSED,
        ),
      };
    }),
    byLevel: ESCALATION_LEVELS.map((escalationLevel) => {
      const levelLogs = input.logs.filter(
        (log) => log.escalationLevel === escalationLevel,
      );

      return {
        escalationLevel,
        count: levelLogs.length,
        openCount: countEscalationsByStatus(levelLogs, EscalationStatus.OPEN),
        resolvedCount: countEscalationsByStatus(
          levelLogs,
          EscalationStatus.RESOLVED,
        ),
        dismissedCount: countEscalationsByStatus(
          levelLogs,
          EscalationStatus.DISMISSED,
        ),
      };
    }),
    byReviewCycle: [...byReviewCycle.values()].sort((left, right) =>
      left.reviewCycleName.localeCompare(right.reviewCycleName),
    ),
  };
}

function agingBucket(ageDays: number): EscalationAgingBucket["bucket"] {
  if (ageDays <= 3) {
    return "0_3_DAYS";
  }

  if (ageDays <= 7) {
    return "4_7_DAYS";
  }

  if (ageDays <= 14) {
    return "8_14_DAYS";
  }

  return "15_PLUS_DAYS";
}

function emptyAgingBuckets(): EscalationAgingBucket[] {
  return [
    { bucket: "0_3_DAYS", label: "0-3 days", count: 0 },
    { bucket: "4_7_DAYS", label: "4-7 days", count: 0 },
    { bucket: "8_14_DAYS", label: "8-14 days", count: 0 },
    { bucket: "15_PLUS_DAYS", label: "15+ days", count: 0 },
  ];
}

function buildRecurrence(
  logs: EscalationAnalyticsLogRecord[],
): EscalationRecurrenceMetric[] {
  const recurrence = new Map<string, EscalationRecurrenceMetric>();

  for (const log of logs) {
    const key = [
      log.escalationType,
      log.employeeId,
      log.managerId ?? "NO_MANAGER",
      log.targetGoalId ?? "NO_TARGET_GOAL",
    ].join(":");
    const existing =
      recurrence.get(key) ??
      ({
        escalationType: log.escalationType,
        employeeId: log.employeeId,
        employeeName: userDisplayName(log.employee),
        managerId: log.managerId,
        managerName: log.manager ? userDisplayName(log.manager) : null,
        targetGoalId: log.targetGoalId,
        targetGoalTitle: log.targetGoal?.title ?? null,
        occurrenceCount: 0,
        openCount: 0,
      } satisfies EscalationRecurrenceMetric);

    recurrence.set(key, {
      ...existing,
      occurrenceCount: existing.occurrenceCount + 1,
      openCount:
        existing.openCount + (log.status === EscalationStatus.OPEN ? 1 : 0),
    });
  }

  return [...recurrence.values()]
    .filter((item) => item.occurrenceCount > 1)
    .sort(
      (left, right) =>
        right.occurrenceCount - left.occurrenceCount ||
        left.employeeName.localeCompare(right.employeeName),
    );
}

function buildLifecycle(input: {
  logs: EscalationAnalyticsLogRecord[];
  generatedAt: Date;
  window: ResolvedGovernanceAnalyticsWindow;
  slaWindowDays: number;
}): EscalationLifecycleMetrics {
  const resolvedLogs = input.logs.filter(
    (log) => log.status === EscalationStatus.RESOLVED && log.resolvedAt,
  );
  const dismissedLogs = input.logs.filter(
    (log) => log.status === EscalationStatus.DISMISSED && log.dismissedAt,
  );
  const openLogs = input.logs.filter(
    (log) => log.status === EscalationStatus.OPEN,
  );
  const resolutionHours = resolvedLogs.map((log) =>
    hoursBetween(log.triggeredAt, log.resolvedAt as Date),
  );
  const dismissalHours = dismissedLogs.map((log) =>
    hoursBetween(log.triggeredAt, log.dismissedAt as Date),
  );
  const openAges = openLogs.map((log) =>
    daysBetween(log.triggeredAt, input.generatedAt),
  );
  const agingBuckets = emptyAgingBuckets();

  for (const age of openAges) {
    const bucket = agingBucket(age);
    const bucketIndex = agingBuckets.findIndex((item) => item.bucket === bucket);
    agingBuckets[bucketIndex] = {
      ...agingBuckets[bucketIndex],
      count: agingBuckets[bucketIndex].count + 1,
    };
  }

  const oldestOpenLog = openLogs
    .slice()
    .sort((left, right) => left.triggeredAt.getTime() - right.triggeredAt.getTime())[0];
  const closedCount = resolvedLogs.length + dismissedLogs.length;
  const resolvedWithinSlaCount = resolvedLogs.filter(
    (log) =>
      daysBetween(log.triggeredAt, log.resolvedAt as Date) <= input.slaWindowDays,
  ).length;

  return {
    generatedAt: input.generatedAt,
    window: input.window,
    slaWindowDays: input.slaWindowDays,
    resolvedCount: resolvedLogs.length,
    dismissedCount: dismissedLogs.length,
    closedCount,
    dismissalRatio: ratio(dismissedLogs.length, closedCount),
    meanResolutionHours: mean(resolutionHours),
    meanDismissalHours: mean(dismissalHours),
    meanClosureHours: mean([...resolutionHours, ...dismissalHours]),
    resolvedWithinSlaCount,
    resolvedWithinSlaRatio: ratio(resolvedWithinSlaCount, resolvedLogs.length),
    unresolvedOpenCount: openLogs.length,
    meanOpenAgeDays: mean(openAges),
    oldestOpenEscalation: oldestOpenLog
      ? {
          escalationLogId: oldestOpenLog.id,
          escalationType: oldestOpenLog.escalationType,
          escalationLevel: oldestOpenLog.escalationLevel,
          employeeId: oldestOpenLog.employeeId,
          managerId: oldestOpenLog.managerId,
          targetGoalId: oldestOpenLog.targetGoalId,
          triggeredAt: oldestOpenLog.triggeredAt,
          ageDays: daysBetween(oldestOpenLog.triggeredAt, input.generatedAt),
        }
      : null,
    openEscalationAging: agingBuckets,
    recurrence: buildRecurrence(input.logs),
  };
}

function executionDurationMs(execution: EscalationExecutionAnalyticsRecord) {
  if (!execution.completedAt) {
    return null;
  }

  return Math.max(0, execution.completedAt.getTime() - execution.startedAt.getTime());
}

function executionCountByStatus(
  executions: EscalationExecutionAnalyticsRecord[],
  status: EscalationExecutionStatus,
) {
  return executions.filter((execution) => execution.status === status).length;
}

function executionCountByTriggerSource(
  executions: EscalationExecutionAnalyticsRecord[],
  triggerSource: EscalationTriggerSource,
) {
  return executions.filter((execution) => execution.triggerSource === triggerSource)
    .length;
}

function schedulerOverlapSkippedCount(
  executions: EscalationExecutionAnalyticsRecord[],
) {
  return executions.reduce((count, execution) => {
    const schedulerMetadata = nestedJsonObject(execution.metadata, "scheduler");
    const skippedOverlapCount = schedulerMetadata?.skippedOverlapCount;

    return (
      count +
      (typeof skippedOverlapCount === "number" && Number.isFinite(skippedOverlapCount)
        ? skippedOverlapCount
        : 0)
    );
  }, 0);
}

function sumExecutionField(
  executions: EscalationExecutionAnalyticsRecord[],
  field: keyof Pick<
    EscalationExecutionAnalyticsRecord,
    | "rulesEvaluated"
    | "violationsDetected"
    | "logsCreated"
    | "evaluationDuplicates"
    | "notificationsAttempted"
    | "notificationsDelivered"
    | "notificationsSkipped"
    | "notificationDuplicates"
    | "failures"
  >,
) {
  return executions.reduce((sum, execution) => sum + execution[field], 0);
}

function buildExecutionHealth(input: {
  executions: EscalationExecutionAnalyticsRecord[];
  generatedAt: Date;
  window: ResolvedGovernanceAnalyticsWindow;
  maxRecentExecutions: number;
}): ExecutionHealthMetrics {
  const durations = input.executions
    .map(executionDurationMs)
    .filter((duration): duration is number => duration !== null);
  const completedExecutions = executionCountByStatus(
    input.executions,
    EscalationExecutionStatus.COMPLETED,
  );
  const failedExecutions = executionCountByStatus(
    input.executions,
    EscalationExecutionStatus.FAILED,
  );
  const partiallyCompletedExecutions = executionCountByStatus(
    input.executions,
    EscalationExecutionStatus.PARTIALLY_COMPLETED,
  );
  const notificationsAttempted = sumExecutionField(
    input.executions,
    "notificationsAttempted",
  );
  const notificationsDelivered = sumExecutionField(
    input.executions,
    "notificationsDelivered",
  );

  return {
    generatedAt: input.generatedAt,
    window: input.window,
    totalExecutions: input.executions.length,
    completedExecutions,
    failedExecutions,
    partiallyCompletedExecutions,
    runningExecutions: executionCountByStatus(
      input.executions,
      EscalationExecutionStatus.RUNNING,
    ),
    scheduledExecutionCount: executionCountByTriggerSource(
      input.executions,
      EscalationTriggerSource.SYSTEM,
    ),
    successRatio: ratio(completedExecutions, input.executions.length),
    failureRatio: ratio(
      failedExecutions + partiallyCompletedExecutions,
      input.executions.length,
    ),
    meanExecutionDurationMs: mean(durations),
    schedulerOverlapSkippedCount: schedulerOverlapSkippedCount(input.executions),
    rulesEvaluated: sumExecutionField(input.executions, "rulesEvaluated"),
    violationsDetected: sumExecutionField(input.executions, "violationsDetected"),
    logsCreated: sumExecutionField(input.executions, "logsCreated"),
    evaluationDuplicates: sumExecutionField(
      input.executions,
      "evaluationDuplicates",
    ),
    notificationsAttempted,
    notificationsDelivered,
    notificationsSkipped: sumExecutionField(
      input.executions,
      "notificationsSkipped",
    ),
    notificationDuplicates: sumExecutionField(
      input.executions,
      "notificationDuplicates",
    ),
    notificationDeliverySuccessRatio: ratio(
      notificationsDelivered,
      notificationsAttempted,
    ),
    failures: sumExecutionField(input.executions, "failures"),
    byStatus: EXECUTION_STATUSES.map((status) => ({
      status,
      count: executionCountByStatus(input.executions, status),
    })),
    byTriggerSource: TRIGGER_SOURCES.map((triggerSource) => ({
      triggerSource,
      count: executionCountByTriggerSource(input.executions, triggerSource),
    })),
    recentExecutions: input.executions
      .slice()
      .sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime())
      .slice(0, input.maxRecentExecutions)
      .map((execution) => ({
        executionId: execution.id,
        status: execution.status,
        triggerSource: execution.triggerSource,
        triggeredByUserId: execution.triggeredByUserId,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        durationMs: executionDurationMs(execution),
        rulesEvaluated: execution.rulesEvaluated,
        logsCreated: execution.logsCreated,
        notificationsAttempted: execution.notificationsAttempted,
        notificationsDelivered: execution.notificationsDelivered,
        notificationsSkipped: execution.notificationsSkipped,
        failures: execution.failures,
        errorSummary: execution.errorSummary,
      })),
  };
}

function buildDepartmentMetrics(
  logs: EscalationAnalyticsLogRecord[],
): DepartmentAccountabilityMetric[] {
  const departments = new Map<string, DepartmentAccountabilityMetric>();

  for (const log of logs) {
    const department =
      log.employee.department ??
      metadataString(log.metadata, "employeeDepartment") ??
      "Unassigned department";
    const existing =
      departments.get(department) ??
      ({
        department,
        totalEscalations: 0,
        openEscalations: 0,
        resolvedEscalations: 0,
        dismissedEscalations: 0,
      } satisfies DepartmentAccountabilityMetric);

    departments.set(department, {
      ...existing,
      totalEscalations: existing.totalEscalations + 1,
      openEscalations:
        existing.openEscalations +
        (log.status === EscalationStatus.OPEN ? 1 : 0),
      resolvedEscalations:
        existing.resolvedEscalations +
        (log.status === EscalationStatus.RESOLVED ? 1 : 0),
      dismissedEscalations:
        existing.dismissedEscalations +
        (log.status === EscalationStatus.DISMISSED ? 1 : 0),
    });
  }

  return [...departments.values()].sort((left, right) =>
    left.department.localeCompare(right.department),
  );
}

function buildManagerMetrics(
  logs: EscalationAnalyticsLogRecord[],
): ManagerAccountabilityMetric[] {
  const managers = new Map<string, {
    metric: ManagerAccountabilityMetric;
    resolutionHours: number[];
  }>();

  for (const log of logs) {
    const managerId = log.managerId ?? null;
    const key = managerId ?? "UNASSIGNED_MANAGER";
    const existing =
      managers.get(key) ??
      ({
        metric: {
          managerId,
          managerName: log.manager
            ? userDisplayName(log.manager)
            : "Unassigned manager",
          department: log.manager?.department ?? null,
          totalEscalations: 0,
          openEscalations: 0,
          resolvedEscalations: 0,
          dismissedEscalations: 0,
          meanResolutionHours: null,
        },
        resolutionHours: [],
      } satisfies {
        metric: ManagerAccountabilityMetric;
        resolutionHours: number[];
      });

    managers.set(key, {
      metric: {
        ...existing.metric,
        totalEscalations: existing.metric.totalEscalations + 1,
        openEscalations:
          existing.metric.openEscalations +
          (log.status === EscalationStatus.OPEN ? 1 : 0),
        resolvedEscalations:
          existing.metric.resolvedEscalations +
          (log.status === EscalationStatus.RESOLVED ? 1 : 0),
        dismissedEscalations:
          existing.metric.dismissedEscalations +
          (log.status === EscalationStatus.DISMISSED ? 1 : 0),
      },
      resolutionHours:
        log.resolvedAt && log.status === EscalationStatus.RESOLVED
          ? [...existing.resolutionHours, hoursBetween(log.triggeredAt, log.resolvedAt)]
          : existing.resolutionHours,
    });
  }

  return [...managers.values()]
    .map((entry) => ({
      ...entry.metric,
      meanResolutionHours: mean(entry.resolutionHours),
    }))
    .sort(
      (left, right) =>
        right.totalEscalations - left.totalEscalations ||
        left.managerName.localeCompare(right.managerName),
    );
}

function buildResolutionOwnership(
  logs: EscalationAnalyticsLogRecord[],
): ResolutionOwnerMetric[] {
  const owners = new Map<string, ResolutionOwnerMetric>();

  for (const log of logs) {
    const closureOwner =
      log.status === EscalationStatus.RESOLVED
        ? log.resolvedByUser
        : log.status === EscalationStatus.DISMISSED
          ? log.dismissedByUser
          : null;
    const closureOwnerId =
      log.status === EscalationStatus.RESOLVED
        ? log.resolvedByUserId
        : log.status === EscalationStatus.DISMISSED
          ? log.dismissedByUserId
          : null;

    if (!closureOwnerId) {
      continue;
    }

    const existing =
      owners.get(closureOwnerId) ??
      ({
        userId: closureOwnerId,
        userName: userDisplayName(closureOwner),
        department: closureOwner?.department ?? null,
        resolvedCount: 0,
        dismissedCount: 0,
        totalClosedCount: 0,
      } satisfies ResolutionOwnerMetric);

    owners.set(closureOwnerId, {
      ...existing,
      resolvedCount:
        existing.resolvedCount +
        (log.status === EscalationStatus.RESOLVED ? 1 : 0),
      dismissedCount:
        existing.dismissedCount +
        (log.status === EscalationStatus.DISMISSED ? 1 : 0),
      totalClosedCount: existing.totalClosedCount + 1,
    });
  }

  return [...owners.values()].sort(
    (left, right) =>
      right.totalClosedCount - left.totalClosedCount ||
      left.userName.localeCompare(right.userName),
  );
}

function buildAccountability(input: {
  logs: EscalationAnalyticsLogRecord[];
  generatedAt: Date;
  window: ResolvedGovernanceAnalyticsWindow;
}): GovernanceAccountabilityMetrics {
  const departmentMetrics = buildDepartmentMetrics(input.logs);
  const managerMetrics = buildManagerMetrics(input.logs);

  return {
    generatedAt: input.generatedAt,
    window: input.window,
    escalationsByDepartment: departmentMetrics,
    unresolvedEscalationsByDepartment: departmentMetrics.filter(
      (metric) => metric.openEscalations > 0,
    ),
    escalationsByManager: managerMetrics,
    managerResolutionResponsiveness: managerMetrics
      .filter((metric) => metric.resolvedEscalations > 0)
      .sort(
        (left, right) =>
          (left.meanResolutionHours ?? Number.MAX_SAFE_INTEGER) -
          (right.meanResolutionHours ?? Number.MAX_SAFE_INTEGER),
      ),
    resolutionOwnership: buildResolutionOwnership(input.logs),
    repeatEscalationHotspots: buildRecurrence(input.logs),
  };
}

export async function getEscalationOverviewMetricsWithClient(input: {
  db: EscalationDbClient;
} & GovernanceAnalyticsServiceInput): Promise<EscalationOverviewMetrics> {
  const generatedAt = input.now ?? new Date();
  const window = await resolveWindow({
    db: input.db,
    now: generatedAt,
    timeWindow: input.timeWindow,
  });
  const logs = await loadEscalationLogs({ db: input.db, window });

  return buildOverview({ logs, generatedAt, window });
}

export async function getEscalationLifecycleMetricsWithClient(input: {
  db: EscalationDbClient;
  slaWindowDays?: number;
} & GovernanceAnalyticsServiceInput): Promise<EscalationLifecycleMetrics> {
  const generatedAt = input.now ?? new Date();
  const window = await resolveWindow({
    db: input.db,
    now: generatedAt,
    timeWindow: input.timeWindow,
  });
  const logs = await loadEscalationLogs({ db: input.db, window });

  return buildLifecycle({
    logs,
    generatedAt,
    window,
    slaWindowDays: input.slaWindowDays ?? 7,
  });
}

export async function getExecutionHealthMetricsWithClient(input: {
  db: EscalationDbClient;
  maxRecentExecutions?: number;
} & GovernanceAnalyticsServiceInput): Promise<ExecutionHealthMetrics> {
  const generatedAt = input.now ?? new Date();
  const window = await resolveWindow({
    db: input.db,
    now: generatedAt,
    timeWindow: input.timeWindow,
  });
  const executions = await loadExecutions({ db: input.db, window });

  return buildExecutionHealth({
    executions,
    generatedAt,
    window,
    maxRecentExecutions: input.maxRecentExecutions ?? 10,
  });
}

export async function getGovernanceAccountabilityMetricsWithClient(input: {
  db: EscalationDbClient;
} & GovernanceAnalyticsServiceInput): Promise<GovernanceAccountabilityMetrics> {
  const generatedAt = input.now ?? new Date();
  const window = await resolveWindow({
    db: input.db,
    now: generatedAt,
    timeWindow: input.timeWindow,
  });
  const logs = await loadEscalationLogs({ db: input.db, window });

  return buildAccountability({ logs, generatedAt, window });
}

export async function getGovernanceDashboardMetricsWithClient(input: {
  db: EscalationDbClient;
  slaWindowDays?: number;
  maxRecentExecutions?: number;
} & GovernanceAnalyticsServiceInput): Promise<GovernanceDashboardMetrics> {
  const [overview, lifecycle, executionHealth, accountability] =
    await Promise.all([
      getEscalationOverviewMetricsWithClient(input),
      getEscalationLifecycleMetricsWithClient(input),
      getExecutionHealthMetricsWithClient(input),
      getGovernanceAccountabilityMetricsWithClient(input),
    ]);

  return {
    overview,
    lifecycle,
    executionHealth,
    accountability,
  };
}

export async function getEscalationOverviewMetrics(
  input: GovernanceAnalyticsServiceInput = {},
): Promise<EscalationOverviewMetrics> {
  return withDefaultDb((db) =>
    getEscalationOverviewMetricsWithClient({ db, ...input }),
  );
}

export async function getEscalationLifecycleMetrics(
  input: GovernanceAnalyticsServiceInput & { slaWindowDays?: number } = {},
): Promise<EscalationLifecycleMetrics> {
  return withDefaultDb((db) =>
    getEscalationLifecycleMetricsWithClient({ db, ...input }),
  );
}

export async function getExecutionHealthMetrics(
  input: GovernanceAnalyticsServiceInput & {
    maxRecentExecutions?: number;
  } = {},
): Promise<ExecutionHealthMetrics> {
  return withDefaultDb((db) =>
    getExecutionHealthMetricsWithClient({ db, ...input }),
  );
}

export async function getGovernanceAccountabilityMetrics(
  input: GovernanceAnalyticsServiceInput = {},
): Promise<GovernanceAccountabilityMetrics> {
  return withDefaultDb((db) =>
    getGovernanceAccountabilityMetricsWithClient({ db, ...input }),
  );
}

export async function getGovernanceDashboardMetrics(
  input: GovernanceAnalyticsServiceInput & {
    slaWindowDays?: number;
    maxRecentExecutions?: number;
  } = {},
): Promise<GovernanceDashboardMetrics> {
  return withDefaultDb((db) =>
    getGovernanceDashboardMetricsWithClient({ db, ...input }),
  );
}
