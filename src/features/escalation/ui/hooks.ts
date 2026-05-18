"use client";

import { useCallback, useEffect, useState } from "react";

import {
  dismissEscalationFromConsole,
  fetchExecutionHealth,
  fetchGovernanceAccountability,
  fetchGovernanceConsoleData,
  fetchGovernanceEscalations,
  fetchGovernanceLifecycle,
  fetchGovernanceOverview,
  fetchSchedulerState,
  resolveEscalationFromConsole,
  runEscalationCycleFromConsole,
  startSchedulerFromConsole,
  stopSchedulerFromConsole,
} from "@/features/escalation/ui/api-client";
import type {
  ExecutionSummaryDto,
  GovernanceAccountabilityApiDto,
  GovernanceConsoleData,
  GovernanceExecutionHealthApiDto,
  GovernanceLifecycleActionResult,
  GovernanceLifecycleApiDto,
  GovernanceOverviewApiDto,
  EscalationListResponseDto,
  SchedulerStateDto,
} from "@/features/escalation/ui/types";

type AsyncState<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
};

function useGovernanceRequest<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: true,
  });

  const reload = useCallback(async () => {
    setState((currentState) => ({
      ...currentState,
      error: null,
      isLoading: true,
    }));

    try {
      const data = await loader();
      setState({
        data,
        error: null,
        isLoading: false,
      });
    } catch (error) {
      setState({
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Governance data could not be loaded.",
        isLoading: false,
      });
    }
  }, [loader]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const data = await loader();

        if (!isMounted) {
          return;
        }

        setState({
          data,
          error: null,
          isLoading: false,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setState({
          data: null,
          error:
            error instanceof Error
              ? error.message
              : "Governance data could not be loaded.",
          isLoading: false,
        });
      }
    }

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [loader]);

  return {
    ...state,
    reload,
  };
}

export function useGovernanceOverview() {
  const loader = useCallback(() => fetchGovernanceOverview(), []);
  return useGovernanceRequest<GovernanceOverviewApiDto>(loader);
}

export function useEscalationAnalytics() {
  const loader = useCallback(async () => {
    const [lifecycle, accountability, executionHealth] = await Promise.all([
      fetchGovernanceLifecycle(),
      fetchGovernanceAccountability(),
      fetchExecutionHealth(),
    ]);

    return {
      lifecycle,
      accountability,
      executionHealth,
    };
  }, []);

  return useGovernanceRequest<{
    lifecycle: GovernanceLifecycleApiDto;
    accountability: GovernanceAccountabilityApiDto;
    executionHealth: GovernanceExecutionHealthApiDto;
  }>(loader);
}

export function useSchedulerState() {
  const loader = useCallback(() => fetchSchedulerState(), []);
  return useGovernanceRequest<SchedulerStateDto>(loader);
}

export function useExecutionHistory() {
  const loader = useCallback(() => fetchExecutionHealth(), []);
  return useGovernanceRequest<GovernanceExecutionHealthApiDto>(loader);
}

export function useEscalationList() {
  const loader = useCallback(() => fetchGovernanceEscalations(), []);
  return useGovernanceRequest<EscalationListResponseDto>(loader);
}

export function useGovernanceConsoleData() {
  const loader = useCallback(
    () => fetchGovernanceConsoleData({ includeScheduler: true }),
    [],
  );
  return useGovernanceRequest<GovernanceConsoleData>(loader);
}

export function useRoleAwareGovernanceConsoleData(input: {
  includeScheduler: boolean;
}) {
  const loader = useCallback(
    () => fetchGovernanceConsoleData({ includeScheduler: input.includeScheduler }),
    [input.includeScheduler],
  );
  return useGovernanceRequest<GovernanceConsoleData>(loader);
}

export function useGovernanceConsoleActions(input: {
  reload: () => Promise<void>;
}) {
  const reload = input.reload;
  const [isMutating, setIsMutating] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = useCallback(
    async <T,>(operation: () => Promise<T>) => {
      setIsMutating(true);
      setActionMessage(null);
      setActionError(null);

      try {
        const result = await operation();
        await reload();
        return result;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Governance action could not be completed.";
        setActionError(message);
        throw error;
      } finally {
        setIsMutating(false);
      }
    },
    [reload],
  );

  return {
    actionError,
    actionMessage,
    isMutating,
    clearActionState: () => {
      setActionError(null);
      setActionMessage(null);
    },
    runCycle: async (dryRun: boolean): Promise<ExecutionSummaryDto> => {
      const result = await runAction(() =>
        runEscalationCycleFromConsole({ dryRun }),
      );
      setActionMessage("Escalation cycle completed through the governed API.");
      return result;
    },
    resolveEscalation: async (inputValue: {
      escalationId: string;
      reason: string;
      notes?: string | null;
    }): Promise<GovernanceLifecycleActionResult> => {
      const result = await runAction(() =>
        resolveEscalationFromConsole(inputValue),
      );
      setActionMessage("Escalation resolved with ownership metadata.");
      return result;
    },
    dismissEscalation: async (inputValue: {
      escalationId: string;
      reason: string;
      notes?: string | null;
    }): Promise<GovernanceLifecycleActionResult> => {
      const result = await runAction(() =>
        dismissEscalationFromConsole(inputValue),
      );
      setActionMessage("Escalation dismissed with governance metadata.");
      return result;
    },
    startScheduler: async () => {
      const result = await runAction(() => startSchedulerFromConsole());
      setActionMessage("Scheduler start request completed.");
      return result;
    },
    stopScheduler: async () => {
      const result = await runAction(() => stopSchedulerFromConsole());
      setActionMessage("Scheduler stop request completed.");
      return result;
    },
  };
}
