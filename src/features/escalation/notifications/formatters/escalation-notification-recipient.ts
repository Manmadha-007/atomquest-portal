import { EscalationType } from "@prisma/client";

import type {
  EscalationNotificationLogRecord,
  EscalationNotificationUser,
} from "@/features/escalation/notifications/types";

export function resolveEscalationNotificationRecipient(
  escalationLog: EscalationNotificationLogRecord,
): EscalationNotificationUser | null {
  switch (escalationLog.escalationType) {
    case EscalationType.GOAL_NOT_SUBMITTED:
      return escalationLog.employee;

    case EscalationType.APPROVAL_PENDING_TOO_LONG:
      return escalationLog.manager ?? escalationLog.employee;

    case EscalationType.CHECKIN_MISSED:
      return escalationLog.employee;
  }
}
