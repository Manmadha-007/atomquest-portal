/**
 * Sends an Adaptive Card to Microsoft Teams via an Incoming Webhook (Workflows).
 *
 * Payload envelope follows the Teams Workflows webhook format:
 * {
 *   "type": "message",
 *   "attachments": [{
 *     "contentType": "application/vnd.microsoft.card.adaptive",
 *     "content": { ... Adaptive Card JSON ... }
 *   }]
 * }
 */
export async function sendTeamsWebhook(
  webhookUrl: string,
  cardPayload: Record<string, unknown>,
): Promise<void> {
  const envelope = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: cardPayload,
      },
    ],
  };

  let response: Response;

  try {
    response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    });
  } catch (err) {
    // Network-level failure (DNS, timeout, connection refused)
    const message = err instanceof Error ? err.message : 'Unknown network error';
    throw new Error(`[Teams] Network error: ${message}`);
  }

  if (!response.ok) {
    let responseBody = '';
    try {
      responseBody = await response.text();
    } catch {
      responseBody = '(unable to read response body)';
    }

    // Distinguish common failure modes for operational visibility
    if (response.status === 400) {
      throw new Error(
        `[Teams] Malformed payload rejected (400): ${responseBody}`,
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `[Teams] Invalid or expired webhook URL (${response.status}): ${responseBody}`,
      );
    }
    if (response.status === 404) {
      throw new Error(
        `[Teams] Webhook URL not found (404) — verify the webhook is still active`,
      );
    }
    if (response.status === 429) {
      throw new Error(
        `[Teams] Rate limited by Teams (429): ${responseBody}`,
      );
    }

    throw new Error(
      `[Teams] Webhook failed (${response.status}): ${responseBody}`,
    );
  }

  // Log successful delivery with response details
  console.log(`[Teams Client] Webhook delivered successfully (${response.status})`);
}
