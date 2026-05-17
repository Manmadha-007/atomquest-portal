import { NotificationPayload } from '../types';

export type ProviderStatus = 'success' | 'skipped' | 'failed';

export interface ProviderExecutionResult {
  providerName: string;
  status: ProviderStatus;
  durationMs: number;
  recipientIdentifier?: string;
  error?: string;
}

export interface NotificationProvider {
  /**
   * The unique name identifier for the provider (e.g., 'Email', 'Teams').
   */
  name: string;

  /**
   * Executes the provider-specific logic to send a notification based on the payload.
   * @param payload The standardized notification payload.
   * @returns A structured result representing the execution outcome.
   */
  send(payload: NotificationPayload): Promise<ProviderExecutionResult>;
}
