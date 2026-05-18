import { EscalationType } from "@prisma/client";

export type EscalationNotificationContent = Readonly<{
  title: string;
  message: string;
  actionLabel: string;
}>;

export function buildEscalationNotificationContent(input: {
  escalationType: EscalationType;
  fallbackMessage: string;
}): EscalationNotificationContent {
  switch (input.escalationType) {
    case EscalationType.GOAL_NOT_SUBMITTED:
      return {
        title: "Goal Submission Escalation",
        message:
          input.fallbackMessage ||
          "Goal submission remained overdue beyond the configured threshold.",
        actionLabel: "Review Goal Planning",
      };

    case EscalationType.APPROVAL_PENDING_TOO_LONG:
      return {
        title: "Approval Governance Escalation",
        message:
          input.fallbackMessage ||
          "Manager approval has remained pending longer than allowed by governance policy.",
        actionLabel: "Review Approval",
      };

    case EscalationType.CHECKIN_MISSED:
      return {
        title: "Quarterly Check-in Escalation",
        message:
          input.fallbackMessage ||
          "Quarterly check-in was not completed within the active review window.",
        actionLabel: "Review Check-in",
      };
  }
}
