import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  EscalationExecutionStatus,
  EscalationTriggerSource,
} from "@prisma/client";

import type { EscalationCycleRunInput, EscalationCycleRunResult } from "@/features/escalation/invocation/types";
import { loadEscalationSchedulerConfig } from "@/features/escalation/scheduler/config";
import { startEscalationScheduler } from "@/features/escalation/scheduler/escalation-scheduler-service";
import type {
  EscalationSchedulerLogger,
  EscalationSchedulerTimer,
} from "@/features/escalation/scheduler/types";
import { BASE_NOW, daysAfter } from "@/features/escalation/__tests__/fixtures/escalation-fixtures";
import { createCapturingProvider } from "@/features/escalation/__tests__/helpers/notification-providers";

function makeRunResult(input: {
  executionId: string;
  now: Date;
}): EscalationCycleRunResult {
  return {
    executionId: input.executionId,
    status: EscalationExecutionStatus.COMPLETED,
    triggerSource: EscalationTriggerSource.SYSTEM,
    triggeredByUserId: null,
    startedAt: input.now,
    completedAt: input.now,
    summary: {
      rulesEvaluated: 1,
      violationsDetected: 1,
      logsCreated: 1,
      evaluationDuplicates: 0,
      notificationsAttempted: 1,
      notificationsDelivered: 1,
      notificationsSkipped: 0,
      notificationDuplicates: 0,
      failures: 0,
    },
    evaluation: null,
    notifications: null,
  };
}

function createManualTimer() {
  const callbacks: Array<() => void | Promise<unknown>> = [];
  const clearedHandles = new Set<unknown>();
  const intervals: number[] = [];
  const timer: EscalationSchedulerTimer = {
    setInterval: (callback, intervalMs) => {
      callbacks.push(callback);
      intervals.push(intervalMs);

      return callbacks.length - 1;
    },
    clearInterval: (handle) => {
      clearedHandles.add(handle);
    },
  };

  return {
    timer,
    intervals,
    callbacks,
    clearedHandles,
    async fire(index = 0) {
      if (clearedHandles.has(index)) {
        return;
      }

      await callbacks[index]?.();
    },
  };
}

function createLogger() {
  const entries: Array<{
    level: "info" | "warn" | "error";
    message: string;
    metadata?: Record<string, unknown>;
  }> = [];
  const logger: EscalationSchedulerLogger = {
    info: (message, metadata) => entries.push({ level: "info", message, metadata }),
    warn: (message, metadata) => entries.push({ level: "warn", message, metadata }),
    error: (message, metadata) => entries.push({ level: "error", message, metadata }),
  };

  return { logger, entries };
}

function createClock() {
  let offset = 0;

  return () => {
    const value = daysAfter(BASE_NOW, offset);
    offset += 1;

    return value;
  };
}

function getSchedulerMetadata(input: EscalationCycleRunInput) {
  const scheduler = input.metadata?.scheduler;

  assert.equal(typeof scheduler, "object");
  assert.ok(scheduler);
  assert.equal(Array.isArray(scheduler), false);

  return scheduler as Record<string, unknown>;
}

describe("loadEscalationSchedulerConfig", () => {
  test("keeps scheduler disabled by default", () => {
    const config = loadEscalationSchedulerConfig({});

    assert.equal(config.enabled, false);
    assert.equal(config.dryRun, false);
    assert.equal(config.runOnStart, false);
    assert.equal(config.intervalMs, 60 * 60 * 1000);
  });

  test("parses explicit environment-driven scheduler configuration", () => {
    const config = loadEscalationSchedulerConfig({
      ESCALATION_SCHEDULER_ENABLED: "true",
      ESCALATION_SCHEDULER_INTERVAL_MS: "900000",
      ESCALATION_SCHEDULER_DRY_RUN: "true",
      ESCALATION_SCHEDULER_RUN_ON_START: "true",
    });

    assert.equal(config.enabled, true);
    assert.equal(config.intervalMs, 900000);
    assert.equal(config.dryRun, true);
    assert.equal(config.runOnStart, true);
  });
});

describe("startEscalationScheduler", () => {
  test("does not register interval or run when scheduler is disabled", async () => {
    const manualTimer = createManualTimer();
    const { logger, entries } = createLogger();
    const inputs: EscalationCycleRunInput[] = [];
    const controller = startEscalationScheduler({
      config: {
        enabled: false,
        intervalMs: 1000,
        dryRun: false,
        runOnStart: false,
      },
      timer: manualTimer.timer,
      logger,
      runner: async (input) => {
        inputs.push(input);
        return makeRunResult({ executionId: "execution-1", now: input.now ?? BASE_NOW });
      },
    });

    const result = await controller.triggerNow();

    assert.equal(result.status, "DISABLED");
    assert.equal(manualTimer.callbacks.length, 0);
    assert.equal(inputs.length, 0);
    assert.equal(controller.getState().isStarted, false);
    assert.ok(entries.some((entry) => entry.message.includes("disabled")));
  });

  test("invokes run boundary on interval with SYSTEM trigger source", async () => {
    const manualTimer = createManualTimer();
    const { logger, entries } = createLogger();
    const inputs: EscalationCycleRunInput[] = [];
    const controller = startEscalationScheduler({
      config: {
        enabled: true,
        intervalMs: 1000,
        dryRun: false,
        runOnStart: false,
      },
      timer: manualTimer.timer,
      logger,
      now: createClock(),
      runner: async (input) => {
        inputs.push(input);
        return makeRunResult({
          executionId: `execution-${inputs.length}`,
          now: input.now ?? BASE_NOW,
        });
      },
    });

    await manualTimer.fire();

    assert.equal(manualTimer.intervals[0], 1000);
    assert.equal(inputs.length, 1);
    assert.equal(inputs[0].triggerSource, EscalationTriggerSource.SYSTEM);
    assert.equal(getSchedulerMetadata(inputs[0]).intervalMs, 1000);
    assert.equal(getSchedulerMetadata(inputs[0]).dryRun, false);
    assert.equal(controller.getState().completedCount, 1);
    assert.equal(controller.getState().lastExecutionId, "execution-1");
    assert.ok(entries.some((entry) => entry.message.includes("completed")));
  });

  test("prevents overlapping scheduler invocations", async () => {
    const manualTimer = createManualTimer();
    const deferred: { resolveRun?: () => void } = {};
    let runCount = 0;
    const controller = startEscalationScheduler({
      config: {
        enabled: true,
        intervalMs: 1000,
        dryRun: false,
        runOnStart: false,
      },
      timer: manualTimer.timer,
      logger: createLogger().logger,
      runner: async (input) => {
        runCount += 1;

        return new Promise<EscalationCycleRunResult>((resolve) => {
          deferred.resolveRun = () =>
            resolve(
              makeRunResult({
                executionId: "execution-overlap",
                now: input.now ?? BASE_NOW,
              }),
            );
        });
      },
    });

    const firstRun = controller.triggerNow();
    const skippedRun = await controller.triggerNow();

    assert.equal(skippedRun.status, "SKIPPED_OVERLAP");
    assert.equal(runCount, 1);
    assert.equal(controller.getState().skippedOverlapCount, 1);

    const completeRun = deferred.resolveRun;
    if (!completeRun) {
      throw new Error("Expected pending scheduler run to expose a resolver.");
    }

    completeRun();
    const firstResult = await firstRun;

    assert.equal(firstResult.status, "COMPLETED");
    assert.equal(controller.getState().isCycleRunning, false);
  });

  test("runs repeatedly on deterministic interval ticks", async () => {
    const manualTimer = createManualTimer();
    const inputs: EscalationCycleRunInput[] = [];
    const controller = startEscalationScheduler({
      config: {
        enabled: true,
        intervalMs: 2000,
        dryRun: false,
        runOnStart: false,
      },
      timer: manualTimer.timer,
      logger: createLogger().logger,
      runner: async (input) => {
        inputs.push(input);
        return makeRunResult({
          executionId: `execution-${inputs.length}`,
          now: input.now ?? BASE_NOW,
        });
      },
    });

    await manualTimer.fire();
    await manualTimer.fire();

    assert.equal(inputs.length, 2);
    assert.equal(controller.getState().runCount, 2);
    assert.equal(controller.getState().completedCount, 2);
    assert.equal(getSchedulerMetadata(inputs[1]).invocationSequence, 2);
  });

  test("dry-run scheduler invokes run boundary with notification providers suppressed", async () => {
    const manualTimer = createManualTimer();
    const emailProvider = createCapturingProvider({ name: "Email" });
    const inputs: EscalationCycleRunInput[] = [];
    const controller = startEscalationScheduler({
      config: {
        enabled: true,
        intervalMs: 1000,
        dryRun: true,
        runOnStart: false,
      },
      providers: [emailProvider],
      timer: manualTimer.timer,
      logger: createLogger().logger,
      runner: async (input) => {
        inputs.push(input);
        return makeRunResult({
          executionId: "execution-dry-run",
          now: input.now ?? BASE_NOW,
        });
      },
    });

    await controller.triggerNow();

    assert.deepEqual(inputs[0].providers, []);
    assert.equal(getSchedulerMetadata(inputs[0]).dryRun, true);
  });

  test("stop clears future intervals and blocks later scheduler triggers", async () => {
    const manualTimer = createManualTimer();
    const inputs: EscalationCycleRunInput[] = [];
    const controller = startEscalationScheduler({
      config: {
        enabled: true,
        intervalMs: 1000,
        dryRun: false,
        runOnStart: false,
      },
      timer: manualTimer.timer,
      logger: createLogger().logger,
      runner: async (input) => {
        inputs.push(input);
        return makeRunResult({
          executionId: "execution-stopped",
          now: input.now ?? BASE_NOW,
        });
      },
    });

    controller.stop();
    await manualTimer.fire();
    const triggerResult = await controller.triggerNow();

    assert.equal(triggerResult.status, "STOPPED");
    assert.equal(inputs.length, 0);
    assert.equal(manualTimer.clearedHandles.has(0), true);
    assert.equal(controller.getState().isStarted, false);
    assert.ok(controller.getState().stoppedAt);
  });

  test("records scheduler failure state when run boundary throws", async () => {
    const manualTimer = createManualTimer();
    const { logger, entries } = createLogger();
    const controller = startEscalationScheduler({
      config: {
        enabled: true,
        intervalMs: 1000,
        dryRun: false,
        runOnStart: false,
      },
      timer: manualTimer.timer,
      logger,
      runner: async () => {
        throw new Error("Controlled invocation failed");
      },
    });

    const result = await controller.triggerNow();

    assert.equal(result.status, "FAILED");
    assert.equal(result.error, "Controlled invocation failed");
    assert.equal(controller.getState().failedCount, 1);
    assert.equal(controller.getState().lastError, "Controlled invocation failed");
    assert.ok(entries.some((entry) => entry.level === "error"));
  });
});
