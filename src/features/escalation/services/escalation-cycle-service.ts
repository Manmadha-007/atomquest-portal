import {
  EscalationExecutionStatus,
  Prisma,
  type EscalationTriggerSource,
} from "@prisma/client";

import type { NotificationProvider } from "@/lib/notifications/providers/types";

import type {
  EscalationCycleRunInput,
  EscalationCycleRunResult,
  EscalationCycleSummary,
} from "@/features/escalation/invocation/types";
import type { EscalationNotificationRunResult } from "@/features/escalation/notifications/types";
import {
  orchestrateEscalationNotifications,
  orchestrateEscalationNotificationsWithClient,
} from "@/features/escalation/services/escalation-notification-orchestration-service";
import {
  evaluateEscalations,
  evaluateEscalationsWithClient,
} from "@/features/escalation/services/escalation-evaluation-service";
import type {
  EscalationDbClient,
  EscalationEvaluationRunResult,
} from "@/features/escalation/types";

const ZERO_SUMMARY: EscalationCycleSummary = {
  rulesEvaluated: 0,
  violationsDetected: 0,
  logsCreated: 0,
  evaluationDuplicates: 0,
  notificationsAttempted: 0,
  notificationsDelivered: 0,
  notificationsSkipped: 0,
  notificationDuplicates: 0,
  failures: 0,
};

function countEvaluationViolations(
  evaluation: EscalationEvaluationRunResult | null,
) {
  return (
    evaluation?.results.reduce(
      (count, result) => count + result.evaluatedContextCount,
      0,
    ) ?? 0
  );
}

function buildExecutionSummary(input: {
  evaluation: EscalationEvaluationRunResult | null;
  notifications: EscalationNotificationRunResult | null;
  errorCount?: number;
}): EscalationCycleSummary {
  return {
    rulesEvaluated: input.evaluation?.evaluatedRuleCount ?? 0,
    violationsDetected: countEvaluationViolations(input.evaluation),
    logsCreated: input.evaluation?.createdLogCount ?? 0,
    evaluationDuplicates: input.evaluation?.skippedDuplicateCount ?? 0,
    notificationsAttempted: input.notifications?.attemptedDeliveryCount ?? 0,
    notificationsDelivered: input.notifications?.deliveredCount ?? 0,
    notificationsSkipped: input.notifications?.skippedCount ?? 0,
    notificationDuplicates: input.notifications?.duplicateCount ?? 0,
    failures:
      (input.notifications?.failedCount ?? 0) + (input.errorCount ?? 0),
  };
}

function resolveExecutionStatus(
  summary: EscalationCycleSummary,
): EscalationExecutionStatus {
  if (summary.failures > 0) {
    return summary.notificationsDelivered > 0 ||
      summary.notificationsSkipped > 0 ||
      summary.logsCreated > 0 ||
      summary.evaluationDuplicates > 0 ||
      summary.notificationDuplicates > 0
      ? EscalationExecutionStatus.PARTIALLY_COMPLETED
      : EscalationExecutionStatus.FAILED;
  }

  return EscalationExecutionStatus.COMPLETED;
}

function toMetadata(input: {
  runMetadata?: Prisma.JsonObject;
  evaluation: EscalationEvaluationRunResult | null;
  notifications: EscalationNotificationRunResult | null;
  summary: EscalationCycleSummary;
}) {
  return {
    ...(input.runMetadata ?? {}),
    summary: input.summary,
    evaluation: input.evaluation
      ? {
          activeRuleCount: input.evaluation.activeRuleCount,
          evaluatedRuleCount: input.evaluation.evaluatedRuleCount,
          createdLogCount: input.evaluation.createdLogCount,
          skippedDuplicateCount: input.evaluation.skippedDuplicateCount,
          evaluatedAt: input.evaluation.evaluatedAt.toISOString(),
        }
      : null,
    notifications: input.notifications
      ? {
          openEscalationCount: input.notifications.openEscalationCount,
          eligibleEscalationCount: input.notifications.eligibleEscalationCount,
          attemptedDeliveryCount: input.notifications.attemptedDeliveryCount,
          deliveredCount: input.notifications.deliveredCount,
          skippedCount: input.notifications.skippedCount,
          failedCount: input.notifications.failedCount,
          duplicateCount: input.notifications.duplicateCount,
          attemptedAt: input.notifications.attemptedAt.toISOString(),
        }
      : null,
  } satisfies Prisma.JsonObject;
}

function toErrorSummary(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function completeExecution(input: {
  db: EscalationDbClient;
  executionId: string;
  completedAt: Date;
  status: EscalationExecutionStatus;
  summary: EscalationCycleSummary;
  metadata: Prisma.JsonObject;
  errorSummary?: string | null;
}) {
  await input.db.escalationExecution.update({
    where: { id: input.executionId },
    data: {
      completedAt: input.completedAt,
      status: input.status,
      rulesEvaluated: input.summary.rulesEvaluated,
      violationsDetected: input.summary.violationsDetected,
      logsCreated: input.summary.logsCreated,
      evaluationDuplicates: input.summary.evaluationDuplicates,
      notificationsAttempted: input.summary.notificationsAttempted,
      notificationsDelivered: input.summary.notificationsDelivered,
      notificationsSkipped: input.summary.notificationsSkipped,
      notificationDuplicates: input.summary.notificationDuplicates,
      failures: input.summary.failures,
      errorSummary: input.errorSummary ?? null,
      metadata: input.metadata,
    },
    select: { id: true },
  });
}

export async function runEscalationCycleWithClient(input: {
  db: EscalationDbClient;
  triggeredByUserId?: string | null;
  triggerSource: EscalationTriggerSource;
  now?: Date;
  providers?: NotificationProvider[];
  metadata?: Prisma.JsonObject;
}): Promise<EscalationCycleRunResult> {
  const startedAt = input.now ?? new Date();
  const execution = await input.db.escalationExecution.create({
    data: {
      startedAt,
      status: EscalationExecutionStatus.RUNNING,
      triggeredByUserId: input.triggeredByUserId ?? null,
      triggerSource: input.triggerSource,
      metadata: input.metadata ?? undefined,
    },
    select: { id: true, startedAt: true },
  });

  let evaluation: EscalationEvaluationRunResult | null = null;
  let notifications: EscalationNotificationRunResult | null = null;

  try {
    evaluation = await evaluateEscalationsWithClient({
      db: input.db,
      now: startedAt,
    });
    notifications = await orchestrateEscalationNotificationsWithClient({
      db: input.db,
      providers: input.providers,
      attemptedAt: startedAt,
    });

    const summary = buildExecutionSummary({
      evaluation,
      notifications,
    });
    const status = resolveExecutionStatus(summary);
    const completedAt = new Date(startedAt.getTime());

    await completeExecution({
      db: input.db,
      executionId: execution.id,
      completedAt,
      status,
      summary,
      metadata: toMetadata({
        runMetadata: input.metadata,
        evaluation,
        notifications,
        summary,
      }),
    });

    return {
      executionId: execution.id,
      status,
      triggerSource: input.triggerSource,
      triggeredByUserId: input.triggeredByUserId ?? null,
      startedAt: execution.startedAt,
      completedAt,
      summary,
      evaluation,
      notifications,
    };
  } catch (error) {
    const errorSummary = toErrorSummary(error);
    const summary = buildExecutionSummary({
      evaluation,
      notifications,
      errorCount: 1,
    });
    const completedAt = new Date(startedAt.getTime());

    await completeExecution({
      db: input.db,
      executionId: execution.id,
      completedAt,
      status: EscalationExecutionStatus.FAILED,
      summary,
      errorSummary,
      metadata: {
        ...toMetadata({
          runMetadata: input.metadata,
          evaluation,
          notifications,
          summary,
        }),
        errorSummary,
      } satisfies Prisma.JsonObject,
    });

    return {
      executionId: execution.id,
      status: EscalationExecutionStatus.FAILED,
      triggerSource: input.triggerSource,
      triggeredByUserId: input.triggeredByUserId ?? null,
      startedAt: execution.startedAt,
      completedAt,
      summary,
      evaluation,
      notifications,
      errorSummary,
    };
  }
}

export async function runEscalationCycle(
  input: EscalationCycleRunInput,
): Promise<EscalationCycleRunResult> {
  const { prisma } = await import("@/lib/prisma");
  const startedAt = input.now ?? new Date();
  const execution = await prisma.escalationExecution.create({
    data: {
      startedAt,
      status: EscalationExecutionStatus.RUNNING,
      triggeredByUserId: input.triggeredByUserId ?? null,
      triggerSource: input.triggerSource,
      metadata: input.metadata ?? undefined,
    },
    select: { id: true, startedAt: true },
  });

  let evaluation: EscalationEvaluationRunResult | null = null;
  let notifications: EscalationNotificationRunResult | null = null;

  try {
    evaluation = await evaluateEscalations({ now: startedAt });
    notifications = await orchestrateEscalationNotifications({
      providers: input.providers,
      attemptedAt: startedAt,
    });

    const summary = buildExecutionSummary({
      evaluation,
      notifications,
    });
    const status = resolveExecutionStatus(summary);
    const completedAt = new Date(startedAt.getTime());

    await completeExecution({
      db: prisma as unknown as EscalationDbClient,
      executionId: execution.id,
      completedAt,
      status,
      summary,
      metadata: toMetadata({
        runMetadata: input.metadata,
        evaluation,
        notifications,
        summary,
      }),
    });

    return {
      executionId: execution.id,
      status,
      triggerSource: input.triggerSource,
      triggeredByUserId: input.triggeredByUserId ?? null,
      startedAt: execution.startedAt,
      completedAt,
      summary,
      evaluation,
      notifications,
    };
  } catch (error) {
    const errorSummary = toErrorSummary(error);
    const summary = buildExecutionSummary({
      evaluation,
      notifications,
      errorCount: 1,
    });
    const completedAt = new Date(startedAt.getTime());

    await completeExecution({
      db: prisma as unknown as EscalationDbClient,
      executionId: execution.id,
      completedAt,
      status: EscalationExecutionStatus.FAILED,
      summary,
      errorSummary,
      metadata: {
        ...toMetadata({
          runMetadata: input.metadata,
          evaluation,
          notifications,
          summary,
        }),
        errorSummary,
      } satisfies Prisma.JsonObject,
    });

    return {
      executionId: execution.id,
      status: EscalationExecutionStatus.FAILED,
      triggerSource: input.triggerSource,
      triggeredByUserId: input.triggeredByUserId ?? null,
      startedAt: execution.startedAt,
      completedAt,
      summary,
      evaluation,
      notifications,
      errorSummary,
    };
  }
}

export { ZERO_SUMMARY as emptyEscalationCycleSummary };
