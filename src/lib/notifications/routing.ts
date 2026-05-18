import { NotificationEvent } from "./types";
import type { EscalationType } from "@prisma/client";

/**
 * Centralized deep-link generator for all outbound notifications.
 * Ensures URLs are stable, survive authentication redirects, and point to the correct workflow context.
 */
export function buildGoalUrl(goalId: string, event: NotificationEvent): string {
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  // Gracefully validate the base URL for observability
  try {
    new URL(appBaseUrl);
  } catch {
    console.warn(
      `[Routing] Invalid APP_BASE_URL: "${appBaseUrl}". Deep links may be malformed.`,
    );
  }

  if (!goalId) {
    console.warn(
      `[Routing] Missing goalId for event ${event}, defaulting to dashboard root.`,
    );
    return `${appBaseUrl}/dashboard`;
  }

  let path = "/dashboard";

  switch (event) {
    case NotificationEvent.GOAL_SUBMITTED:
      // Manager reviews it here
      path = `/dashboard/manager/approvals#goal-${goalId}`;
      break;
    case NotificationEvent.GOAL_APPROVED:
    case NotificationEvent.GOAL_REJECTED:
      // Employee views status and revises here
      path = `/dashboard/employee#goal-${goalId}`;
      break;
    case NotificationEvent.CHECKIN_REMINDER:
      // Employee makes quarterly updates here
      path = `/dashboard/employee/quarterly-updates`;
      break;
    case NotificationEvent.ESCALATION_OPENED:
      path = `/dashboard`;
      break;
    case NotificationEvent.GOAL_UPDATED:
      path = `/dashboard`;
      break;
  }

  const url = `${appBaseUrl}${path}`;

  // Log for observability
  console.log(`[Routing] Generated deep-link URL for ${event}: ${url}`);

  return url;
}

export function buildEscalationUrl(input: {
  escalationType: EscalationType;
  escalationLogId: string;
  goalId?: string | null;
}): string {
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  try {
    new URL(appBaseUrl);
  } catch {
    console.warn(
      `[Routing] Invalid APP_BASE_URL: "${appBaseUrl}". Deep links may be malformed.`,
    );
  }

  let path = "/dashboard";

  switch (input.escalationType) {
    case "GOAL_NOT_SUBMITTED":
      path = "/dashboard/employee";
      break;
    case "APPROVAL_PENDING_TOO_LONG":
      path = input.goalId
        ? `/dashboard/manager/approvals#goal-${input.goalId}`
        : "/dashboard/manager/approvals";
      break;
    case "CHECKIN_MISSED":
      path = input.goalId
        ? `/dashboard/employee/quarterly-updates#goal-${input.goalId}`
        : "/dashboard/employee/quarterly-updates";
      break;
  }

  const separator = path.includes("#") ? "&" : "#";
  const url = `${appBaseUrl}${path}${separator}escalation-${input.escalationLogId}`;

  console.log(
    `[Routing] Generated deep-link URL for escalation ${input.escalationLogId}: ${url}`,
  );

  return url;
}
