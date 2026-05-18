import { EscalationTriggerSource } from "@prisma/client";

import { runEscalationCycle } from "@/features/escalation/services/escalation-cycle-service";
import { loadEscalationSchedulerConfig } from "@/features/escalation/scheduler/config";
import type {
  EscalationCycleRunner,
  EscalationSchedulerController,
  EscalationSchedulerLogger,
  EscalationSchedulerState,
  EscalationSchedulerTickResult,
  EscalationSchedulerTimer,
  EscalationSchedulerTimerHandle,
  StartEscalationSchedulerOptions,
} from "@/features/escalation/scheduler/types";

const consoleLogger: EscalationSchedulerLogger = {
  info: (message, metadata) => console.info(message, metadata),
  warn: (message, metadata) => console.warn(message, metadata),
  error: (message, metadata) => console.error(message, metadata),
};

const runtimeTimer: EscalationSchedulerTimer = {
  setInterval: (callback, intervalMs) =>
    setInterval(() => {
      void callback();
    }, intervalMs),
  clearInterval: (handle) => clearInterval(handle as NodeJS.Timeout),
};

function toErrorSummary(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function cloneState(state: EscalationSchedulerState): EscalationSchedulerState {
  return { ...state };
}

export function startEscalationScheduler(
  options: StartEscalationSchedulerOptions = {},
): EscalationSchedulerController {
  const config = options.config ?? loadEscalationSchedulerConfig();
  const runner: EscalationCycleRunner = options.runner ?? runEscalationCycle;
  const timer = options.timer ?? runtimeTimer;
  const logger = options.logger ?? consoleLogger;
  const now = options.now ?? (() => new Date());
  let intervalHandle: EscalationSchedulerTimerHandle | null = null;
  let stopped = false;
  let invocationSequence = 0;
  const state: EscalationSchedulerState = {
    enabled: config.enabled,
    intervalMs: config.intervalMs,
    dryRun: config.dryRun,
    isStarted: false,
    isCycleRunning: false,
    startedAt: null,
    stoppedAt: null,
    runCount: 0,
    completedCount: 0,
    failedCount: 0,
    skippedOverlapCount: 0,
    lastRunStartedAt: null,
    lastRunCompletedAt: null,
    lastSkippedAt: null,
    lastExecutionId: null,
    lastError: null,
  };

  async function triggerNow(): Promise<EscalationSchedulerTickResult> {
    const startedAt = now();

    if (!config.enabled) {
      return {
        status: "DISABLED",
        startedAt,
        completedAt: startedAt,
      };
    }

    if (stopped) {
      return {
        status: "STOPPED",
        startedAt,
        completedAt: startedAt,
      };
    }

    if (state.isCycleRunning) {
      const completedAt = now();
      state.skippedOverlapCount += 1;
      state.lastSkippedAt = completedAt;
      logger.warn("[EscalationScheduler] Skipped scheduled run due to overlap.", {
        intervalMs: config.intervalMs,
        skippedOverlapCount: state.skippedOverlapCount,
      });

      return {
        status: "SKIPPED_OVERLAP",
        startedAt,
        completedAt,
      };
    }

    state.isCycleRunning = true;
    state.runCount += 1;
    state.lastRunStartedAt = startedAt;
    invocationSequence += 1;

    logger.info("[EscalationScheduler] Starting scheduled escalation cycle.", {
      intervalMs: config.intervalMs,
      dryRun: config.dryRun,
      invocationSequence,
    });

    try {
      const execution = await runner({
        triggerSource: EscalationTriggerSource.SYSTEM,
        now: startedAt,
        providers: config.dryRun ? [] : options.providers,
        metadata: {
          scheduler: {
            intervalMs: config.intervalMs,
            dryRun: config.dryRun,
            invocationSequence,
            scheduledAt: startedAt.toISOString(),
          },
        },
      });
      const completedAt = now();
      state.completedCount += 1;
      state.lastRunCompletedAt = completedAt;
      state.lastExecutionId = execution.executionId;
      state.lastError = execution.errorSummary ?? null;
      logger.info("[EscalationScheduler] Scheduled escalation cycle completed.", {
        executionId: execution.executionId,
        status: execution.status,
        summary: execution.summary,
      });

      return {
        status: "COMPLETED",
        startedAt,
        completedAt,
        execution,
      };
    } catch (error) {
      const completedAt = now();
      const errorSummary = toErrorSummary(error);
      state.failedCount += 1;
      state.lastRunCompletedAt = completedAt;
      state.lastError = errorSummary;
      logger.error("[EscalationScheduler] Scheduled escalation cycle failed.", {
        errorSummary,
      });

      return {
        status: "FAILED",
        startedAt,
        completedAt,
        error: errorSummary,
      };
    } finally {
      state.isCycleRunning = false;
    }
  }

  function stop() {
    if (stopped) {
      return;
    }

    stopped = true;
    state.stoppedAt = now();
    state.isStarted = false;

    if (intervalHandle !== null) {
      timer.clearInterval(intervalHandle);
      intervalHandle = null;
    }

    logger.info("[EscalationScheduler] Scheduler stopped.", {
      runCount: state.runCount,
      skippedOverlapCount: state.skippedOverlapCount,
    });
  }

  if (!config.enabled) {
    logger.info("[EscalationScheduler] Scheduler disabled by configuration.", {
      intervalMs: config.intervalMs,
      dryRun: config.dryRun,
    });

    return {
      triggerNow,
      stop,
      getState: () => cloneState(state),
    };
  }

  state.isStarted = true;
  state.startedAt = now();
  intervalHandle = timer.setInterval(triggerNow, config.intervalMs);
  logger.info("[EscalationScheduler] Scheduler started.", {
    intervalMs: config.intervalMs,
    dryRun: config.dryRun,
    runOnStart: config.runOnStart,
  });

  if (config.runOnStart) {
    void triggerNow();
  }

  return {
    triggerNow,
    stop,
    getState: () => cloneState(state),
  };
}
