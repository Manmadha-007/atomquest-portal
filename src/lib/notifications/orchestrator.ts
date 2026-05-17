import { NotificationPayload } from './types';
import { activeProviders } from './providers/registry';

/**
 * Core entry point for the notification system.
 * Validates the payload and orchestrates delivery across configured providers.
 */
export async function notify(payload: NotificationPayload): Promise<void> {
  // 1. Basic validation
  if (!payload.event) {
    throw new Error('Notification processing failed: Missing event');
  }

  if (!payload.actor?.id || !payload.recipient?.id) {
    throw new Error('Notification processing failed: Missing actor or recipient ID');
  }

  const orchestratorStartTime = Date.now();

  // 2. Provider Execution
  // Execute all active providers in parallel.
  // We use Promise.all but each provider internally catches errors.
  const results = await Promise.all(
    activeProviders.map(async (provider) => {
      try {
        return await provider.send(payload);
      } catch (err) {
        // Ultimate fallback if a provider violates its contract and throws
        return {
          providerName: provider.name,
          status: 'failed' as const,
          durationMs: Date.now() - orchestratorStartTime,
          error: err instanceof Error ? err.message : 'Uncaught provider exception',
        };
      }
    })
  );

  const totalDurationMs = Date.now() - orchestratorStartTime;

  // 3. Structured Logging Summary
  const successCount = results.filter((r) => r.status === 'success').length;
  const skippedCount = results.filter((r) => r.status === 'skipped').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;

  console.log(`[Notification Orchestrator] Execution Summary for ${payload.event}`, {
    event: payload.event,
    actorId: payload.actor.id,
    recipientId: payload.recipient.id,
    totalDurationMs,
    summary: {
      success: successCount,
      skipped: skippedCount,
      failed: failedCount,
    },
    providerDetails: results,
  });
}
