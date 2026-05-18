import type { NotificationPayload } from "@/lib/notifications";
import type {
  NotificationProvider,
  ProviderExecutionResult,
  ProviderStatus,
} from "@/lib/notifications/providers/types";

export type CapturingNotificationProvider = NotificationProvider & {
  sentPayloads: NotificationPayload[];
};

export function createCapturingProvider(input: {
  name: "Email" | "Teams";
  status?: ProviderStatus;
  error?: string;
}): CapturingNotificationProvider {
  const sentPayloads: NotificationPayload[] = [];

  return {
    name: input.name,
    sentPayloads,
    async send(payload: NotificationPayload): Promise<ProviderExecutionResult> {
      sentPayloads.push(payload);

      return {
        providerName: input.name,
        status: input.status ?? "success",
        durationMs: 12,
        recipientIdentifier:
          input.name === "Email"
            ? payload.recipient.email
            : "Teams Webhook",
        error: input.error,
      };
    },
  };
}
