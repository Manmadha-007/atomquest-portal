import type { EscalationCycleRunInput, EscalationCycleRunResult } from "@/features/escalation/invocation/types";
import type { NotificationProvider } from "@/lib/notifications/providers/types";

export type EscalationSchedulerConfig = Readonly<{
  enabled: boolean;
  intervalMs: number;
  dryRun: boolean;
  runOnStart: boolean;
}>;

export type EscalationSchedulerTimerHandle = unknown;

export type EscalationSchedulerTimer = Readonly<{
  setInterval: (
    callback: () => void | Promise<unknown>,
    intervalMs: number,
  ) => EscalationSchedulerTimerHandle;
  clearInterval: (handle: EscalationSchedulerTimerHandle) => void;
}>;

export type EscalationSchedulerLogger = Readonly<{
  info: (message: string, metadata?: Record<string, unknown>) => void;
  warn: (message: string, metadata?: Record<string, unknown>) => void;
  error: (message: string, metadata?: Record<string, unknown>) => void;
}>;

export type EscalationCycleRunner = (
  input: EscalationCycleRunInput,
) => Promise<EscalationCycleRunResult>;

export type EscalationSchedulerTickStatus =
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED_OVERLAP"
  | "DISABLED"
  | "STOPPED";

export type EscalationSchedulerTickResult = Readonly<{
  status: EscalationSchedulerTickStatus;
  startedAt: Date;
  completedAt: Date;
  execution?: EscalationCycleRunResult;
  error?: string;
}>;

export type EscalationSchedulerState = {
  enabled: boolean;
  intervalMs: number;
  dryRun: boolean;
  isStarted: boolean;
  isCycleRunning: boolean;
  startedAt: Date | null;
  stoppedAt: Date | null;
  runCount: number;
  completedCount: number;
  failedCount: number;
  skippedOverlapCount: number;
  lastRunStartedAt: Date | null;
  lastRunCompletedAt: Date | null;
  lastSkippedAt: Date | null;
  lastExecutionId: string | null;
  lastError: string | null;
};

export type EscalationSchedulerController = Readonly<{
  triggerNow: () => Promise<EscalationSchedulerTickResult>;
  stop: () => void;
  getState: () => EscalationSchedulerState;
}>;

export type StartEscalationSchedulerOptions = Readonly<{
  config?: EscalationSchedulerConfig;
  runner?: EscalationCycleRunner;
  providers?: NotificationProvider[];
  timer?: EscalationSchedulerTimer;
  logger?: EscalationSchedulerLogger;
  now?: () => Date;
}>;
