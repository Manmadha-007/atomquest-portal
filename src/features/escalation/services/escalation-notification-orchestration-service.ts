import { EscalationStatus, Prisma } from "@prisma/client";

import { activeProviders } from "@/lib/notifications/providers/registry";
import type { NotificationProvider } from "@/lib/notifications/providers/types";

import { composeEscalationNotificationPayload } from "@/features/escalation/notifications/formatters/escalation-notification-payload";
import { resolveEscalationNotificationRecipient } from "@/features/escalation/notifications/formatters/escalation-notification-recipient";
import type {
  EscalationNotificationDeliveryResult,
  EscalationNotificationLogRecord,
  EscalationNotificationRunResult,
} from "@/features/escalation/notifications/types";
import type { EscalationDbClient } from "@/features/escalation/types";
import { deliverEscalationNotification } from "@/features/escalation/services/escalation-notification-delivery-service";

const escalationNotificationLogSelect = {
  id: true,
  escalationType: true,
  escalationLevel: true,
  message: true,
  metadata: true,
  triggeredAt: true,
  employee: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  },
  manager: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  },
  targetGoal: {
    select: {
      id: true,
      title: true,
    },
  },
  escalationRule: {
    select: {
      id: true,
      name: true,
      thresholdDays: true,
    },
  },
} as const satisfies Prisma.EscalationLogSelect;

async function loadOpenEscalationLogs(
  db: EscalationDbClient,
): Promise<EscalationNotificationLogRecord[]> {
  return db.escalationLog.findMany({
    where: { status: EscalationStatus.OPEN },
    orderBy: [{ triggeredAt: "asc" }, { id: "asc" }],
    select: escalationNotificationLogSelect,
  });
}

function summarizeResults(input: {
  attemptedAt: Date;
  openEscalationCount: number;
  eligibleEscalationCount: number;
  results: EscalationNotificationDeliveryResult[];
}): EscalationNotificationRunResult {
  return {
    attemptedAt: input.attemptedAt,
    openEscalationCount: input.openEscalationCount,
    eligibleEscalationCount: input.eligibleEscalationCount,
    attemptedDeliveryCount: input.results.filter(
      (result) => result.status !== "DUPLICATE",
    ).length,
    deliveredCount: input.results.filter((result) => result.status === "DELIVERED").length,
    skippedCount: input.results.filter((result) => result.status === "SKIPPED").length,
    failedCount: input.results.filter((result) => result.status === "FAILED").length,
    duplicateCount: input.results.filter((result) => result.status === "DUPLICATE").length,
    results: input.results,
  };
}

export async function orchestrateEscalationNotificationsWithClient(input: {
  db: EscalationDbClient;
  providers?: NotificationProvider[];
  attemptedAt?: Date;
}): Promise<EscalationNotificationRunResult> {
  const attemptedAt = input.attemptedAt ?? new Date();
  const providers = input.providers ?? activeProviders;
  const openEscalationLogs = await loadOpenEscalationLogs(input.db);
  const results: EscalationNotificationDeliveryResult[] = [];
  let eligibleEscalationCount = 0;

  for (const escalationLog of openEscalationLogs) {
    const recipient = resolveEscalationNotificationRecipient(escalationLog);

    if (!recipient) {
      continue;
    }

    eligibleEscalationCount++;
    const payload = composeEscalationNotificationPayload({
      escalationLog,
      recipient,
    });

    for (const provider of providers) {
      results.push(
        await deliverEscalationNotification({
          db: input.db,
          provider,
          escalationLog,
          recipient,
          payload,
          attemptedAt,
        }),
      );
    }
  }

  return summarizeResults({
    attemptedAt,
    openEscalationCount: openEscalationLogs.length,
    eligibleEscalationCount,
    results,
  });
}

export async function orchestrateEscalationNotifications(input?: {
  db?: EscalationDbClient;
  providers?: NotificationProvider[];
  attemptedAt?: Date;
}): Promise<EscalationNotificationRunResult> {
  const attemptedAt = input?.attemptedAt ?? new Date();

  if (input?.db) {
    return orchestrateEscalationNotificationsWithClient({
      db: input.db,
      providers: input.providers,
      attemptedAt,
    });
  }

  const { prisma } = await import("@/lib/prisma");

  return orchestrateEscalationNotificationsWithClient({
    db: prisma as unknown as EscalationDbClient,
    providers: input?.providers,
    attemptedAt,
  });
}
