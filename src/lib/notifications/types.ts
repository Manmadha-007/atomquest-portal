export enum NotificationEvent {
  GOAL_SUBMITTED = 'GOAL_SUBMITTED',
  GOAL_APPROVED = 'GOAL_APPROVED',
  GOAL_REJECTED = 'GOAL_REJECTED',
  GOAL_UPDATED = 'GOAL_UPDATED',
  CHECKIN_REMINDER = 'CHECKIN_REMINDER',
}

export interface NotificationActor {
  id: string;
  name?: string;
  email?: string;
}

export interface NotificationRecipient {
  id: string;
  name?: string;
  email?: string;
}

export interface NotificationPayload {
  event: NotificationEvent;
  actor: NotificationActor;
  recipient: NotificationRecipient;
  metadata?: Record<string, unknown>;
}
