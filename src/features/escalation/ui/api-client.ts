import type {
  ExecutionSummaryDto,
  GovernanceAccountabilityApiDto,
  GovernanceConsoleData,
  GovernanceExecutionHealthApiDto,
  GovernanceLifecycleActionResult,
  GovernanceLifecycleApiDto,
  GovernanceOverviewApiDto,
  SchedulerStateDto,
  EscalationListResponseDto,
} from "@/features/escalation/ui/types";

type GovernanceApiResponse<T> =
  | { data: T }
  | {
      error: {
        code: string;
        message: string;
      };
    };

export class GovernanceConsoleApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(input: { code: string; message: string; status: number }) {
    super(input.message);
    this.name = "GovernanceConsoleApiError";
    this.code = input.code;
    this.status = input.status;
  }
}

async function parseGovernanceResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as GovernanceApiResponse<T>;

  if (!response.ok || "error" in body) {
    const error =
      "error" in body
        ? body.error
        : {
            code: "REQUEST_FAILED",
            message: "Governance request failed.",
          };

    throw new GovernanceConsoleApiError({
      code: error.code,
      message: error.message,
      status: response.status,
    });
  }

  return body.data;
}

export async function requestGovernanceApi<T>(
  path: string,
  init?: RequestInit,
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const response = await fetcher(path, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  return parseGovernanceResponse<T>(response);
}

export async function fetchGovernanceOverview(fetcher?: typeof fetch) {
  return requestGovernanceApi<GovernanceOverviewApiDto>(
    "/api/governance/analytics/overview?window=LAST_30_DAYS",
    undefined,
    fetcher,
  );
}

export async function fetchGovernanceLifecycle(fetcher?: typeof fetch) {
  return requestGovernanceApi<GovernanceLifecycleApiDto>(
    "/api/governance/analytics/lifecycle?window=LAST_30_DAYS&slaWindowDays=7",
    undefined,
    fetcher,
  );
}

export async function fetchExecutionHealth(fetcher?: typeof fetch) {
  return requestGovernanceApi<GovernanceExecutionHealthApiDto>(
    "/api/governance/analytics/execution-health?window=LAST_30_DAYS&maxRecentExecutions=8",
    undefined,
    fetcher,
  );
}

export async function fetchGovernanceAccountability(fetcher?: typeof fetch) {
  return requestGovernanceApi<GovernanceAccountabilityApiDto>(
    "/api/governance/analytics/accountability?window=LAST_30_DAYS",
    undefined,
    fetcher,
  );
}

export async function fetchGovernanceEscalations(fetcher?: typeof fetch) {
  return requestGovernanceApi<EscalationListResponseDto>(
    "/api/governance/escalations",
    undefined,
    fetcher,
  );
}

export async function fetchSchedulerState(fetcher?: typeof fetch) {
  return requestGovernanceApi<SchedulerStateDto>(
    "/api/governance/scheduler/state",
    undefined,
    fetcher,
  );
}

export async function fetchGovernanceConsoleData(
  input: {
    includeScheduler: boolean;
    fetcher?: typeof fetch;
  },
): Promise<GovernanceConsoleData> {
  const [
    overview,
    lifecycle,
    executionHealth,
    accountability,
    escalations,
  ] = await Promise.all([
    fetchGovernanceOverview(input.fetcher),
    fetchGovernanceLifecycle(input.fetcher),
    fetchExecutionHealth(input.fetcher),
    fetchGovernanceAccountability(input.fetcher),
    fetchGovernanceEscalations(input.fetcher),
  ]);
  const scheduler = input.includeScheduler
    ? await fetchSchedulerState(input.fetcher)
    : {
        registered: false,
        state: null,
      };

  return {
    overview,
    lifecycle,
    executionHealth,
    accountability,
    escalations,
    scheduler,
  };
}

export async function runEscalationCycleFromConsole(input: {
  dryRun?: boolean;
  fetcher?: typeof fetch;
}) {
  return requestGovernanceApi<ExecutionSummaryDto>(
    "/api/governance/executions/run",
    {
      method: "POST",
      body: JSON.stringify({ dryRun: Boolean(input.dryRun) }),
    },
    input.fetcher,
  );
}

export async function resolveEscalationFromConsole(input: {
  escalationId: string;
  reason: string;
  notes?: string | null;
  fetcher?: typeof fetch;
}) {
  return requestGovernanceApi<GovernanceLifecycleActionResult>(
    `/api/governance/escalations/${input.escalationId}/resolve`,
    {
      method: "POST",
      body: JSON.stringify({
        reason: input.reason,
        notes: input.notes ?? null,
      }),
    },
    input.fetcher,
  );
}

export async function dismissEscalationFromConsole(input: {
  escalationId: string;
  reason: string;
  notes?: string | null;
  fetcher?: typeof fetch;
}) {
  return requestGovernanceApi<GovernanceLifecycleActionResult>(
    `/api/governance/escalations/${input.escalationId}/dismiss`,
    {
      method: "POST",
      body: JSON.stringify({
        reason: input.reason,
        notes: input.notes ?? null,
      }),
    },
    input.fetcher,
  );
}

export async function startSchedulerFromConsole(fetcher?: typeof fetch) {
  return requestGovernanceApi<{
    action: string;
    scheduler: SchedulerStateDto;
  }>(
    "/api/governance/scheduler/start",
    {
      method: "POST",
    },
    fetcher,
  );
}

export async function stopSchedulerFromConsole(fetcher?: typeof fetch) {
  return requestGovernanceApi<{
    action: string;
    scheduler: SchedulerStateDto;
  }>(
    "/api/governance/scheduler/stop",
    {
      method: "POST",
    },
    fetcher,
  );
}
