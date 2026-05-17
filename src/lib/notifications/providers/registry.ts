import { NotificationProvider } from './types';
import { emailProvider } from './email-provider';
import { teamsProvider } from './teams-provider';

/**
 * The central registry of all active notification providers.
 * The orchestrator will iterate over this list to dispatch notifications.
 */
export const activeProviders: NotificationProvider[] = [
  emailProvider,
  teamsProvider,
];
