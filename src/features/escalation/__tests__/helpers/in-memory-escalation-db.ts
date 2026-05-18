import type { Prisma } from "@prisma/client";

import type { EscalationDbClient } from "@/features/escalation/types";
import type {
  EscalationTestState,
  TestEscalationLog,
  TestEscalationRule,
  TestGoal,
  TestGoalApproval,
  TestReviewCycle,
  TestUser,
} from "@/features/escalation/__tests__/fixtures/escalation-fixtures";
import { escalationState } from "@/features/escalation/__tests__/fixtures/escalation-fixtures";

type FindManyArgs = {
  where?: Record<string, unknown>;
};

function equalsNullable<T>(actual: T | null, expected: T | null | undefined) {
  return expected === undefined || actual === expected;
}

function sortByDirection<T>(
  items: T[],
  getValue: (item: T) => string | number | Date | null,
  direction: "asc" | "desc" = "asc",
) {
  const multiplier = direction === "asc" ? 1 : -1;

  return [...items].sort((left, right) => {
    const leftValue = getValue(left);
    const rightValue = getValue(right);

    if (leftValue === rightValue) {
      return 0;
    }

    if (leftValue === null) {
      return 1;
    }

    if (rightValue === null) {
      return -1;
    }

    return leftValue > rightValue ? multiplier : -multiplier;
  });
}

function matchesUserWhere(
  user: TestUser,
  state: EscalationTestState,
  where: Record<string, unknown> = {},
) {
  if (where.isActive !== undefined && user.isActive !== where.isActive) {
    return false;
  }

  if (where.role !== undefined && user.role !== where.role) {
    return false;
  }

  if (where.department !== undefined && user.department !== where.department) {
    return false;
  }

  const goalsOwned = where.goalsOwned as
    | { none?: Record<string, unknown> }
    | undefined;

  if (goalsOwned?.none) {
    const matchingGoal = state.goals.some((goal) => {
      if (goal.ownerId !== user.id) {
        return false;
      }

      return matchesGoalWhere(goal, state, goalsOwned.none);
    });

    if (matchingGoal) {
      return false;
    }
  }

  return true;
}

function matchesGoalWhere(
  goal: TestGoal,
  state: EscalationTestState,
  where: Record<string, unknown> = {},
) {
  if (where.reviewCycleId !== undefined && goal.reviewCycleId !== where.reviewCycleId) {
    return false;
  }

  if (where.isArchived !== undefined && goal.isArchived !== where.isArchived) {
    return false;
  }

  if (where.status !== undefined && goal.status !== where.status) {
    return false;
  }

  if (where.parentGoalId !== undefined && goal.parentGoalId !== where.parentGoalId) {
    return false;
  }

  if (where.isPrimaryOwner !== undefined && goal.isPrimaryOwner !== where.isPrimaryOwner) {
    return false;
  }

  const submittedAt = where.submittedAt as { not?: null } | undefined;

  if (submittedAt?.not === null && goal.submittedAt === null) {
    return false;
  }

  const ownerWhere = where.owner as Record<string, unknown> | undefined;

  if (ownerWhere) {
    const owner = state.users.find((user) => user.id === goal.ownerId);

    if (!owner || !matchesUserWhere(owner, state, ownerWhere)) {
      return false;
    }
  }

  const updates = where.updates as { none?: Record<string, unknown> } | undefined;

  if (updates?.none) {
    const hasMatchingUpdate = state.goalUpdates.some((update) => {
      if (update.goalId !== goal.id) {
        return false;
      }

      if (
        updates.none?.quarter !== undefined &&
        update.quarter !== updates.none.quarter
      ) {
        return false;
      }

      return true;
    });

    if (hasMatchingUpdate) {
      return false;
    }
  }

  return true;
}

function matchesApprovalWhere(
  approval: TestGoalApproval,
  state: EscalationTestState,
  where: Record<string, unknown> = {},
) {
  if (where.decision !== undefined && approval.decision !== where.decision) {
    return false;
  }

  if (where.decidedAt === null && approval.decidedAt !== null) {
    return false;
  }

  const approverWhere = where.approver as Record<string, unknown> | undefined;

  if (approverWhere) {
    const approver = state.users.find((user) => user.id === approval.approverId);

    if (!approver || !matchesUserWhere(approver, state, approverWhere)) {
      return false;
    }
  }

  const goalWhere = where.goal as Record<string, unknown> | undefined;

  if (goalWhere) {
    const goal = state.goals.find((item) => item.id === approval.goalId);

    if (!goal || !matchesGoalWhere(goal, state, goalWhere)) {
      return false;
    }
  }

  return true;
}

function matchesReviewCycleWhere(
  reviewCycle: TestReviewCycle,
  where: Record<string, unknown> = {},
) {
  if (where.id !== undefined && reviewCycle.id !== where.id) {
    return false;
  }

  if (where.isActive !== undefined && reviewCycle.isActive !== where.isActive) {
    return false;
  }

  return true;
}

function matchesEscalationRuleWhere(
  rule: TestEscalationRule,
  where: Record<string, unknown> = {},
) {
  if (where.isActive !== undefined && rule.isActive !== where.isActive) {
    return false;
  }

  return true;
}

function matchesEscalationLogWhere(
  log: TestEscalationLog,
  where: Record<string, unknown> = {},
) {
  return (
    equalsNullable(log.id, where.id as string | undefined) &&
    equalsNullable(log.escalationRuleId, where.escalationRuleId as string | undefined) &&
    equalsNullable(log.escalationType, where.escalationType as typeof log.escalationType | undefined) &&
    equalsNullable(log.status, where.status as typeof log.status | undefined) &&
    equalsNullable(log.employeeId, where.employeeId as string | undefined) &&
    equalsNullable(log.managerId, where.managerId as string | null | undefined) &&
    equalsNullable(log.targetGoalId, where.targetGoalId as string | null | undefined)
  );
}

function matchesEscalationNotificationDeliveryWhere(
  delivery: EscalationTestState["escalationNotificationDeliveries"][number],
  where: Record<string, unknown> = {},
) {
  return (
    equalsNullable(delivery.escalationLogId, where.escalationLogId as string | undefined) &&
    equalsNullable(delivery.channel, where.channel as typeof delivery.channel | undefined) &&
    equalsNullable(delivery.recipientUserId, where.recipientUserId as string | undefined)
  );
}

function matchesEscalationExecutionWhere(
  execution: EscalationTestState["escalationExecutions"][number],
  where: Record<string, unknown> = {},
) {
  return (
    equalsNullable(execution.id, where.id as string | undefined) &&
    equalsNullable(
      execution.status,
      where.status as typeof execution.status | undefined,
    ) &&
    equalsNullable(
      execution.triggerSource,
      where.triggerSource as typeof execution.triggerSource | undefined,
    )
  );
}

function hydrateApproval(
  approval: TestGoalApproval,
  state: EscalationTestState,
) {
  const approver = state.users.find((user) => user.id === approval.approverId);
  const goal = state.goals.find((item) => item.id === approval.goalId);
  const owner = goal
    ? state.users.find((user) => user.id === goal.ownerId)
    : undefined;

  if (!approver || !goal || !owner) {
    throw new Error("Approval fixture references missing user or goal.");
  }

  return {
    ...approval,
    approver,
    goal: {
      ...goal,
      owner,
    },
  };
}

function hydrateGoal(goal: TestGoal, state: EscalationTestState) {
  const owner = state.users.find((user) => user.id === goal.ownerId);

  if (!owner) {
    throw new Error("Goal fixture references missing owner.");
  }

  return {
    ...goal,
    owner,
  };
}

function hydrateEscalationLog(
  log: TestEscalationLog,
  state: EscalationTestState,
) {
  const employee = state.users.find((user) => user.id === log.employeeId);
  const manager = log.managerId
    ? state.users.find((user) => user.id === log.managerId) ?? null
    : null;
  const targetGoal = log.targetGoalId
    ? state.goals.find((goal) => goal.id === log.targetGoalId) ?? null
    : null;
  const targetGoalReviewCycle = targetGoal
    ? state.reviewCycles.find((cycle) => cycle.id === targetGoal.reviewCycleId) ??
      null
    : null;
  const escalationRule = state.escalationRules.find(
    (rule) => rule.id === log.escalationRuleId,
  );
  const escalationRuleReviewCycle = escalationRule?.reviewCycleId
    ? state.reviewCycles.find((cycle) => cycle.id === escalationRule.reviewCycleId) ??
      null
    : null;
  const resolvedByUser = log.resolvedByUserId
    ? state.users.find((user) => user.id === log.resolvedByUserId) ?? null
    : null;
  const dismissedByUser = log.dismissedByUserId
    ? state.users.find((user) => user.id === log.dismissedByUserId) ?? null
    : null;

  if (!employee) {
    throw new Error("Escalation log fixture references missing user.");
  }

  return {
    ...log,
    employee,
    manager,
    resolvedByUser,
    dismissedByUser,
    targetGoal: targetGoal
      ? {
          id: targetGoal.id,
          title: targetGoal.title,
          reviewCycleId: targetGoal.reviewCycleId,
          reviewCycle: targetGoalReviewCycle,
        }
      : null,
    escalationRule: escalationRule
      ? {
          ...escalationRule,
          reviewCycle: escalationRuleReviewCycle,
        }
      : {
          id: log.escalationRuleId,
          name: null,
          reviewCycle: null,
        },
  };
}

export function createEscalationTestDb(
  stateOverrides: Partial<EscalationTestState> = {},
) {
  const state = escalationState(stateOverrides);

  const db = {
    reviewCycle: {
      findMany: async (args: FindManyArgs = {}) =>
        sortByDirection(
          state.reviewCycles.filter((cycle) =>
            matchesReviewCycleWhere(cycle, args.where),
          ),
          (cycle) => cycle.startDate,
          "desc",
        ),
    },
    user: {
      findMany: async (args: FindManyArgs = {}) =>
        sortByDirection(
          state.users.filter((user) => matchesUserWhere(user, state, args.where)),
          (user) => user.lastName,
          "asc",
        ),
    },
    goal: {
      findMany: async (args: FindManyArgs = {}) =>
        sortByDirection(
          state.goals
            .filter((goal) => matchesGoalWhere(goal, state, args.where))
            .map((item) => hydrateGoal(item, state)),
          (item) => item.title,
          "asc",
        ),
    },
    goalApproval: {
      findMany: async (args: FindManyArgs = {}) =>
        sortByDirection(
          state.goalApprovals
            .filter((approval) =>
              matchesApprovalWhere(approval, state, args.where),
            )
            .map((item) => hydrateApproval(item, state)),
          (item) => item.createdAt,
          "asc",
        ),
    },
    escalationRule: {
      findMany: async (args: FindManyArgs = {}) =>
        sortByDirection(
          state.escalationRules.filter((rule) =>
            matchesEscalationRuleWhere(rule, args.where),
          ),
          (rule) => rule.createdAt,
          "asc",
        ),
    },
    escalationLog: {
      findMany: async (args: FindManyArgs = {}) =>
        sortByDirection(
          state.escalationLogs
            .filter((logItem) => matchesEscalationLogWhere(logItem, args.where))
            .map((item) => hydrateEscalationLog(item, state)),
          (item) => item.triggeredAt,
          "asc",
        ),
      findFirst: async (args: FindManyArgs = {}) =>
        state.escalationLogs.find((logItem) =>
          matchesEscalationLogWhere(logItem, args.where),
        ) ?? null,
      findUnique: async (args: { where: { id: string }; select?: Prisma.EscalationLogSelect }) =>
        state.escalationLogs
          .filter((logItem) => logItem.id === args.where.id)
          .map((item) => hydrateEscalationLog(item, state))[0] ?? null,
      create: async (args: {
        data: Omit<
          TestEscalationLog,
          | "id"
          | "createdAt"
          | "updatedAt"
          | "resolvedAt"
          | "resolvedByUserId"
          | "dismissedAt"
          | "dismissedByUserId"
          | "resolutionReason"
          | "dismissalReason"
          | "resolutionNotes"
        > &
          Partial<
            Pick<
              TestEscalationLog,
              | "resolvedAt"
              | "resolvedByUserId"
              | "dismissedAt"
              | "dismissedByUserId"
              | "resolutionReason"
              | "dismissalReason"
              | "resolutionNotes"
            >
          >;
        select?: Prisma.EscalationLogSelect;
      }) => {
        const createdAt = args.data.triggeredAt;
        const log: TestEscalationLog = {
          id: `escalation-log-${state.escalationLogs.length + 1}`,
          ...args.data,
          resolvedAt: args.data.resolvedAt ?? null,
          resolvedByUserId: args.data.resolvedByUserId ?? null,
          dismissedAt: args.data.dismissedAt ?? null,
          dismissedByUserId: args.data.dismissedByUserId ?? null,
          resolutionReason: args.data.resolutionReason ?? null,
          dismissalReason: args.data.dismissalReason ?? null,
          resolutionNotes: args.data.resolutionNotes ?? null,
          createdAt,
          updatedAt: createdAt,
        };

        state.escalationLogs.push(log);

        return { id: log.id };
      },
      update: async (args: {
        where: { id: string };
        data: Partial<TestEscalationLog>;
        select?: Prisma.EscalationLogSelect;
      }) => {
        const escalationLog = state.escalationLogs.find(
          (item) => item.id === args.where.id,
        );

        if (!escalationLog) {
          throw new Error(`Escalation log not found: ${args.where.id}`);
        }

        Object.assign(escalationLog, args.data, {
          updatedAt:
            args.data.resolvedAt ??
            args.data.dismissedAt ??
            escalationLog.updatedAt,
        });

        return escalationLog;
      },
    },
    escalationNotificationDelivery: {
      findFirst: async (args: FindManyArgs = {}) =>
        state.escalationNotificationDeliveries.find((delivery) =>
          matchesEscalationNotificationDeliveryWhere(delivery, args.where),
        ) ?? null,
      create: async (args: {
        data: Omit<
          EscalationTestState["escalationNotificationDeliveries"][number],
          "id" | "createdAt" | "updatedAt"
        >;
        select?: Prisma.EscalationNotificationDeliverySelect;
      }) => {
        const delivery = {
          id: `escalation-notification-delivery-${state.escalationNotificationDeliveries.length + 1}`,
          ...args.data,
          createdAt: args.data.attemptedAt,
          updatedAt: args.data.attemptedAt,
        };

        state.escalationNotificationDeliveries.push(delivery);

        return { id: delivery.id };
      },
    },
    escalationExecution: {
      findMany: async (args: FindManyArgs = {}) =>
        sortByDirection(
          state.escalationExecutions.filter((execution) =>
            matchesEscalationExecutionWhere(execution, args.where),
          ),
          (execution) => execution.startedAt,
          "desc",
        ),
      create: async (args: {
        data: Partial<EscalationTestState["escalationExecutions"][number]>;
        select?: Prisma.EscalationExecutionSelect;
      }) => {
        const startedAt = args.data.startedAt ?? new Date();
        const execution: EscalationTestState["escalationExecutions"][number] = {
          id: `escalation-execution-${state.escalationExecutions.length + 1}`,
          startedAt,
          completedAt: args.data.completedAt ?? null,
          status: args.data.status ?? "RUNNING",
          triggeredByUserId: args.data.triggeredByUserId ?? null,
          triggerSource: args.data.triggerSource ?? "MANUAL",
          rulesEvaluated: args.data.rulesEvaluated ?? 0,
          violationsDetected: args.data.violationsDetected ?? 0,
          logsCreated: args.data.logsCreated ?? 0,
          evaluationDuplicates: args.data.evaluationDuplicates ?? 0,
          notificationsAttempted: args.data.notificationsAttempted ?? 0,
          notificationsDelivered: args.data.notificationsDelivered ?? 0,
          notificationsSkipped: args.data.notificationsSkipped ?? 0,
          notificationDuplicates: args.data.notificationDuplicates ?? 0,
          failures: args.data.failures ?? 0,
          errorSummary: args.data.errorSummary ?? null,
          metadata: args.data.metadata,
          createdAt: startedAt,
          updatedAt: startedAt,
        };

        state.escalationExecutions.push(execution);

        return {
          id: execution.id,
          startedAt: execution.startedAt,
        };
      },
      update: async (args: {
        where: { id: string };
        data: Partial<EscalationTestState["escalationExecutions"][number]>;
        select?: Prisma.EscalationExecutionSelect;
      }) => {
        const execution = state.escalationExecutions.find(
          (item) => item.id === args.where.id,
        );

        if (!execution) {
          throw new Error(`Escalation execution not found: ${args.where.id}`);
        }

        Object.assign(execution, args.data, {
          updatedAt: args.data.completedAt ?? execution.updatedAt,
        });

        return { id: execution.id };
      },
    },
  } satisfies Record<string, unknown>;

  return {
    db: db as unknown as EscalationDbClient,
    state,
  };
}
