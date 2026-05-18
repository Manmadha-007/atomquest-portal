import type {
  EscalationLevel,
  EscalationNotificationChannel,
  EscalationNotificationStatus,
  EscalationType,
  Prisma,
  UserRole,
} from "@prisma/client";

export type EscalationNotificationUser = Readonly<{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}>;

export type EscalationNotificationLogRecord = Readonly<{
  id: string;
  escalationType: EscalationType;
  escalationLevel: EscalationLevel;
  message: string;
  metadata: Prisma.JsonValue | null;
  triggeredAt: Date;
  employee: EscalationNotificationUser;
  manager: EscalationNotificationUser | null;
  targetGoal: {
    id: string;
    title: string;
  } | null;
  escalationRule: {
    id: string;
    name: string;
    thresholdDays: number;
  };
}>;

export type EscalationNotificationDeliveryResult = Readonly<{
  escalationLogId: string;
  recipientUserId: string;
  channel: EscalationNotificationChannel;
  providerName: string;
  status: EscalationNotificationStatus | "DUPLICATE";
  deliveryId?: string;
  skippedReason?: string;
  error?: string;
}>;

export type EscalationNotificationRunResult = Readonly<{
  attemptedAt: Date;
  openEscalationCount: number;
  eligibleEscalationCount: number;
  attemptedDeliveryCount: number;
  deliveredCount: number;
  skippedCount: number;
  failedCount: number;
  duplicateCount: number;
  results: EscalationNotificationDeliveryResult[];
}>;
