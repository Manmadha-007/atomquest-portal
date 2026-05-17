import { NotificationProvider, ProviderExecutionResult } from './types';
import { NotificationPayload, NotificationEvent } from '../types';
import { sendTeamsWebhook } from '../teams/teams-client';
import { generateGoalSubmittedCard } from '../teams/cards/goal-submitted-card';
import { generateGoalApprovedCard } from '../teams/cards/goal-approved-card';
import { generateGoalRejectedCard } from '../teams/cards/goal-rejected-card';

const SUPPORTED_EVENTS = new Set([
  NotificationEvent.GOAL_SUBMITTED,
  NotificationEvent.GOAL_APPROVED,
  NotificationEvent.GOAL_REJECTED,
]);

export class TeamsProvider implements NotificationProvider {
  name = 'Teams';

  async send(payload: NotificationPayload): Promise<ProviderExecutionResult> {
    const startTime = Date.now();

    const createResult = (
      status: 'success' | 'skipped' | 'failed',
      error?: string
    ): ProviderExecutionResult => ({
      providerName: this.name,
      status,
      durationMs: Date.now() - startTime,
      recipientIdentifier: 'Teams Webhook',
      error,
    });

    try {
      if (!SUPPORTED_EVENTS.has(payload.event)) {
        return createResult('skipped', 'Unsupported event');
      }

      const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
      if (!webhookUrl) {
        return createResult('skipped', 'TEAMS_WEBHOOK_URL not configured');
      }

      // Validate the webhook URL format defensively
      try {
        const parsed = new URL(webhookUrl);
        if (parsed.protocol !== 'https:') {
          return createResult('skipped', 'TEAMS_WEBHOOK_URL must use HTTPS');
        }
      } catch {
        return createResult('failed', 'TEAMS_WEBHOOK_URL is not a valid URL');
      }

      // Extract and validate metadata
      const goalId = String(payload.metadata?.goalId || '');
      const goalTitle = String(payload.metadata?.goalTitle || 'Unknown Goal');

      if (!goalId) {
        return createResult('skipped', 'Missing goalId in metadata');
      }

      // Generate the appropriate Adaptive Card
      let card: Record<string, unknown>;

      switch (payload.event) {
        case NotificationEvent.GOAL_SUBMITTED: {
          const actorName = payload.actor.name || 'A team member';
          card = generateGoalSubmittedCard({ actorName, goalTitle, goalId });
          break;
        }
        case NotificationEvent.GOAL_APPROVED: {
          const employeeName = payload.recipient.name || 'Team Member';
          const approverName = payload.actor.name || 'A manager';
          card = generateGoalApprovedCard({ employeeName, goalTitle, goalId, approverName });
          break;
        }
        case NotificationEvent.GOAL_REJECTED: {
          const employeeName = payload.recipient.name || 'Team Member';
          const reviewerName = payload.actor.name || 'A manager';
          const comments = payload.metadata?.comments ? String(payload.metadata.comments) : 'No comments provided.';
          card = generateGoalRejectedCard({ employeeName, goalTitle, goalId, reviewerName, comments });
          break;
        }
        default:
          return createResult('skipped', 'Unsupported event');
      }

      // Send via webhook
      await sendTeamsWebhook(webhookUrl, card);

      console.log(`[Provider: ${this.name}] Successfully delivered ${payload.event} adaptive card`);
      return createResult('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[Provider: ${this.name}] Delivery failed:`, errorMessage);
      return createResult('failed', errorMessage);
    }
  }
}

export const teamsProvider = new TeamsProvider();
