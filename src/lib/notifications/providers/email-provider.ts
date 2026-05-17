import { NotificationProvider, ProviderExecutionResult } from './types';
import { NotificationPayload, NotificationEvent } from '../types';
import { resend } from '../email/resend-client';
import { generateGoalSubmittedEmail } from '../email/templates/goal-submitted';
import { generateCheckinReminderEmail } from '../email/templates/checkin-reminder';

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
      if (
        payload.event !== NotificationEvent.GOAL_SUBMITTED &&
        payload.event !== NotificationEvent.CHECKIN_REMINDER
      ) {
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

      if (payload.event === NotificationEvent.GOAL_SUBMITTED) {
        const actorName = payload.actor.name || 'A team member';
        const generated = generateGoalSubmittedEmail({ actorName, goalTitle, goalId });
        subject = generated.subject;
        html = generated.html;
      } else {
        const actorName = payload.recipient.name || 'Team Member';
        const message = payload.metadata?.message ? String(payload.metadata.message) : undefined;
        const generated = generateCheckinReminderEmail({ actorName, goalTitle, goalId, message });
        subject = generated.subject;
        html = generated.html;
      }

      const { error } = await resend.emails.send({
        from: emailFrom,
        to: [recipientEmail],
        subject,
        html,
      });

      if (error) {
        return createResult('failed', error.message || 'Resend API error', recipientEmail);
      }

      return createResult('success', undefined, recipientEmail);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return createResult('failed', errorMessage, payload.recipient.email);
    }
  }
}

export const emailProvider = new EmailProvider();
