import {
  EscalationNotificationChannel,
  EscalationNotificationStatus,
  Prisma,
} from "@prisma/client";

import type { NotificationPayload } from "@/lib/notifications";
import type {
  NotificationProvider,
  ProviderExecutionResult,
} from "@/lib/notifications/providers/types";

import type { EscalationDbClient } from "@/features/escalation/types";
import type {
  EscalationNotificationDeliveryResult,
  EscalationNotificationLogRecord,
  EscalationNotificationUser,
} from "@/features/escalation/notifications/types";

export function getEscalationNotificationChannel(
  providerName: string,
): EscalationNotificationChannel | null {
  switch (providerName) {
    case "Email":
      return EscalationNotificationChannel.EMAIL;
    case "Teams":
      return EscalationNotificationChannel.TEAMS;
    default:
      return null;
  }
}

function toDeliveryStatus(result: ProviderExecutionResult) {
  switch (result.status) {
    case "success":
      return EscalationNotificationStatus.DELIVERED;
    case "skipped":
      return EscalationNotificationStatus.SKIPPED;
    case "failed":
      return EscalationNotificationStatus.FAILED;
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function deliverEscalationNotification(input: {
  db: EscalationDbClient;
  provider: NotificationProvider;
  escalationLog: EscalationNotificationLogRecord;
  recipient: EscalationNotificationUser;
  payload: NotificationPayload;
  attemptedAt: Date;
}): Promise<EscalationNotificationDeliveryResult> {
  const channel = getEscalationNotificationChannel(input.provider.name);

  if (!channel) {
    return {
      escalationLogId: input.escalationLog.id,
      recipientUserId: input.recipient.id,
      channel: EscalationNotificationChannel.EMAIL,
      providerName: input.provider.name,
      status: "DUPLICATE",
      skippedReason: "Unsupported escalation notification provider.",
    };
  }

  const existingDelivery = await input.db.escalationNotificationDelivery.findFirst({
    where: {
      escalationLogId: input.escalationLog.id,
      channel,
      recipientUserId: input.recipient.id,
    },
    select: { id: true, status: true },
  });

  if (existingDelivery) {
    return {
      escalationLogId: input.escalationLog.id,
      recipientUserId: input.recipient.id,
      channel,
      providerName: input.provider.name,
      status: "DUPLICATE",
      deliveryId: existingDelivery.id,
      skippedReason: `Delivery already recorded with status ${existingDelivery.status}.`,
    };
  }

  let providerResult: ProviderExecutionResult;

  try {
    providerResult = await input.provider.send(input.payload);
  } catch (error) {
    providerResult = {
      providerName: input.provider.name,
      status: "failed",
      durationMs: 0,
      error: error instanceof Error ? error.message : "Uncaught provider exception",
    };
  }

  const status = toDeliveryStatus(providerResult);

  try {
    const delivery = await input.db.escalationNotificationDelivery.create({
      data: {
        escalationLogId: input.escalationLog.id,
        channel,
        status,
        recipientUserId: input.recipient.id,
        recipientAddress:
          channel === EscalationNotificationChannel.EMAIL
            ? input.recipient.email
            : providerResult.recipientIdentifier ?? "Teams Webhook",
        providerName: providerResult.providerName,
        attemptedAt: input.attemptedAt,
        deliveredAt:
          status === EscalationNotificationStatus.DELIVERED
            ? input.attemptedAt
            : null,
        error: providerResult.error,
        metadata: {
          durationMs: providerResult.durationMs,
          recipientIdentifier: providerResult.recipientIdentifier,
          providerStatus: providerResult.status,
          escalationType: input.escalationLog.escalationType,
          escalationLevel: input.escalationLog.escalationLevel,
        } satisfies Prisma.JsonObject,
      },
      select: { id: true },
    });

    return {
      escalationLogId: input.escalationLog.id,
      recipientUserId: input.recipient.id,
      channel,
      providerName: providerResult.providerName,
      status,
      deliveryId: delivery.id,
      error: providerResult.error,
    };
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const conflictingDelivery =
      await input.db.escalationNotificationDelivery.findFirst({
        where: {
          escalationLogId: input.escalationLog.id,
          channel,
          recipientUserId: input.recipient.id,
        },
        select: { id: true, status: true },
      });

    return {
      escalationLogId: input.escalationLog.id,
      recipientUserId: input.recipient.id,
      channel,
      providerName: input.provider.name,
      status: "DUPLICATE",
      deliveryId: conflictingDelivery?.id,
      skippedReason: conflictingDelivery
        ? `Delivery already recorded with status ${conflictingDelivery.status}.`
        : "Delivery already recorded by a concurrent governance notification run.",
    };
  }
}
