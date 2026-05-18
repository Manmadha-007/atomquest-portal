import type { NotificationProvider } from "@/lib/notifications/providers/types";

import { startEscalationScheduler } from "@/features/escalation/scheduler/escalation-scheduler-service";
import type {
  EscalationSchedulerConfig,
  EscalationSchedulerController,
  EscalationSchedulerState,
  StartEscalationSchedulerOptions,
} from "@/features/escalation/scheduler/types";

let schedulerController: EscalationSchedulerController | null = null;

export type GovernanceSchedulerControlResult = Readonly<{
  action: "STARTED" | "ALREADY_STARTED" | "STOPPED" | "NOT_RUNNING" | "DISABLED";
  registered: boolean;
  state: EscalationSchedulerState | null;
}>;

export type GovernanceSchedulerControls = Readonly<{
  getState: () => GovernanceSchedulerControlResult;
  start: (input?: {
    config?: EscalationSchedulerConfig;
    providers?: NotificationProvider[];
  }) => GovernanceSchedulerControlResult;
  stop: () => GovernanceSchedulerControlResult;
}>;

function currentState(): GovernanceSchedulerControlResult {
  const state = schedulerController?.getState() ?? null;

  return {
    action: state?.isStarted ? "ALREADY_STARTED" : "NOT_RUNNING",
    registered: schedulerController !== null,
    state,
  };
}

export const governanceSchedulerControls: GovernanceSchedulerControls = {
  getState: currentState,

  start(input = {}) {
    const existingState = schedulerController?.getState() ?? null;

    if (existingState?.isStarted) {
      return {
        action: "ALREADY_STARTED",
        registered: true,
        state: existingState,
      };
    }

    const options: StartEscalationSchedulerOptions = {
      ...(input.config ? { config: input.config } : {}),
      ...(input.providers ? { providers: input.providers } : {}),
    };
    schedulerController = startEscalationScheduler(options);
    const state = schedulerController.getState();

    return {
      action: state.isStarted ? "STARTED" : "DISABLED",
      registered: true,
      state,
    };
  },

  stop() {
    if (!schedulerController) {
      return {
        action: "NOT_RUNNING",
        registered: false,
        state: null,
      };
    }

    schedulerController.stop();
    const state = schedulerController.getState();

    return {
      action: "STOPPED",
      registered: true,
      state,
    };
  },
};
