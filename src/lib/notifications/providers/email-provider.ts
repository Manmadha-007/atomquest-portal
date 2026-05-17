import { NotificationProvider, ProviderExecutionResult } from './types';
import { NotificationPayload, NotificationEvent } from '../types';
import { resend } from '../email/resend-client';
import { generateGoalSubmittedEmail } from '../email/templates/goal-submitted';
import { generateCheckinReminderEmail } from '../email/templates/checkin-reminder';
import { generateGoalApprovedEmail } from '../email/templates/goal-approved';
import { generateGoalRejectedEmail } from '../email/templates/goal-rejected';

const SUPPORTED_EVENTS = new Set([
  NotificationEvent.GOAL_SUBMITTED,
  NotificationEvent.GOAL_APPROVED,
  NotificationEvent.GOAL_REJECTED,
  NotificationEvent.CHECKIN_REMINDER,
]);

export class EmailProvider implements NotificationProvider {
  name = 'Email';

  async send(payload: NotificationPayload): Promise<ProviderExecutionResult> {
    const startTime = Date.now();

    const createResult = (
      status: 'success' | 'skipped' | 'failed',
      error?: string,
      recipientIdentifier?: string
    ): ProviderExecutionResult => ({
      providerName: this.name,
      status,
      durationMs: Date.now() - startTime,
      recipientIdentifier,
      error,
    });

    try {
      if (!SUPPORTED_EVENTS.has(payload.event)) {
        return createResult('skipped', 'Unsupported event');
      }

      if (!resend) {
        return createResult('skipped', 'Resend client not configured');
      }

      const recipientEmail = payload.recipient.email;
      if (!recipientEmail) {
        return createResult('skipped', 'No recipient email provided');
      }

      const emailFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev';
      const goalId = String(payload.metadata?.goalId || '');
      const goalTitle = String(payload.metadata?.goalTitle || 'Unknown Goal');

      if (!goalId) {
        return createResult('skipped', 'Missing goalId in metadata', recipientEmail);
      }

      let subject: string;
      let html: string;

      switch (payload.event) {
        case NotificationEvent.GOAL_SUBMITTED: {
          const actorName = payload.actor.name || 'A team member';
          const generated = generateGoalSubmittedEmail({ actorName, goalTitle, goalId });
          subject = generated.subject;
          html = generated.html;
          break;
        }
        case NotificationEvent.GOAL_APPROVED: {
          const employeeName = payload.recipient.name || 'Team Member';
          const approverName = payload.actor.name || 'Your manager';
          const generated = generateGoalApprovedEmail({ employeeName, goalTitle, goalId, approverName });
          subject = generated.subject;
          html = generated.html;
          break;
        }
        case NotificationEvent.GOAL_REJECTED: {
          const employeeName = payload.recipient.name || 'Team Member';
          const reviewerName = payload.actor.name || 'Your manager';
          const comments = payload.metadata?.comments ? String(payload.metadata.comments) : 'No comments provided.';
          const generated = generateGoalRejectedEmail({ employeeName, goalTitle, goalId, reviewerName, comments });
          subject = generated.subject;
          html = generated.html;
          break;
        }
        case NotificationEvent.CHECKIN_REMINDER: {
          const actorName = payload.recipient.name || 'Team Member';
          const message = payload.metadata?.message ? String(payload.metadata.message) : undefined;
          const generated = generateCheckinReminderEmail({ actorName, goalTitle, goalId, message });
          subject = generated.subject;
          html = generated.html;
          break;
        }
        default:
          return createResult('skipped', 'Unsupported event');
      }

      // Demo/sandbox override: route all outbound emails to a single verified inbox
      // while preserving the logical recipient identity in templates and logs.
      const emailOverride = process.env.NOTIFICATION_EMAIL_OVERRIDE;
      const transportDestination = emailOverride || recipientEmail;

      if (emailOverride) {
        console.log(`[Provider: Email] Override active — logical recipient: ${recipientEmail}, transport destination: ${emailOverride}`);
      }

      const { error } = await resend.emails.send({
        from: emailFrom,
        to: [transportDestination],
        subject,
        html,
      });

      if (error) {
        return createResult('failed', error.message || 'Resend API error', recipientEmail);
      }

      return createResult('success', undefined, `${recipientEmail}${emailOverride ? ` → ${emailOverride}` : ''}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return createResult('failed', errorMessage, payload.recipient.email);
    }
  }
}

export const emailProvider = new EmailProvider();
