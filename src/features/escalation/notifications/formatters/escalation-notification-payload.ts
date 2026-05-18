import { NotificationEvent, type NotificationPayload } from "@/lib/notifications";
import { buildEscalationUrl } from "@/lib/notifications/routing";

import type { EscalationNotificationLogRecord } from "@/features/escalation/notifications/types";
import { buildEscalationNotificationContent } from "@/features/escalation/notifications/templates/escalation-notification-content";

function getDisplayName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function composeEscalationNotificationPayload(input: {
  escalationLog: EscalationNotificationLogRecord;
  recipient: EscalationNotificationLogRecord["employee"];
}): NotificationPayload {
  const { escalationLog, recipient } = input;
  const content = buildEscalationNotificationContent({
    escalationType: escalationLog.escalationType,
    fallbackMessage: escalationLog.message,
  });
  const deepLinkUrl = buildEscalationUrl({
    escalationType: escalationLog.escalationType,
    escalationLogId: escalationLog.id,
    goalId: escalationLog.targetGoal?.id,
  });

  return {
    event: NotificationEvent.ESCALATION_OPENED,
    actor: {
      id: "SYSTEM",
      name: "AtomQuest Governance",
    },
    recipient: {
      id: recipient.id,
      name: getDisplayName(recipient),
      email: recipient.email,
    },
    metadata: {
      escalationLogId: escalationLog.id,
      escalationRuleId: escalationLog.escalationRule.id,
      escalationType: escalationLog.escalationType,
      escalationLevel: escalationLog.escalationLevel,
      title: content.title,
      message: content.message,
      actionLabel: content.actionLabel,
      ruleName: escalationLog.escalationRule.name,
      thresholdDays: escalationLog.escalationRule.thresholdDays,
      triggeredAt: escalationLog.triggeredAt.toISOString(),
      goalId: escalationLog.targetGoal?.id,
      goalTitle: escalationLog.targetGoal?.title,
      employeeId: escalationLog.employee.id,
      employeeName: getDisplayName(escalationLog.employee),
      managerId: escalationLog.manager?.id,
      managerName: escalationLog.manager
        ? getDisplayName(escalationLog.manager)
        : undefined,
      deepLinkUrl,
    },
  };
}
