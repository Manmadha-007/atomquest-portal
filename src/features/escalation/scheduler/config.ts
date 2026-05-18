import type { EscalationSchedulerConfig } from "@/features/escalation/scheduler/types";

export const DEFAULT_ESCALATION_SCHEDULER_INTERVAL_MS = 60 * 60 * 1000;

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function loadEscalationSchedulerConfig(
  env: Record<string, string | undefined> = process.env,
): EscalationSchedulerConfig {
  return {
    enabled: parseBoolean(env.ESCALATION_SCHEDULER_ENABLED, false),
    intervalMs: parsePositiveInteger(
      env.ESCALATION_SCHEDULER_INTERVAL_MS,
      DEFAULT_ESCALATION_SCHEDULER_INTERVAL_MS,
    ),
    dryRun: parseBoolean(env.ESCALATION_SCHEDULER_DRY_RUN, false),
    runOnStart: parseBoolean(env.ESCALATION_SCHEDULER_RUN_ON_START, false),
  };
}
