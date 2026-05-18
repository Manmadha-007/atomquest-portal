import type {
  EscalationLevel,
  EscalationStatus,
  EscalationTriggerSource,
  EscalationType,
} from "@prisma/client";

import type {
  EscalationListResponseDto,
  EscalationResponseDto,
  ExecutionSummaryDto,
  SchedulerStateDto,
} from "@/features/escalation/api/dto";
import type { AppRole } from "@/lib/auth";

export type GovernanceConsoleRole = Extract<AppRole, "ADMIN" | "MANAGER">;

export type SerializedGovernanceWindow = Readonly<{
  preset: string;
  label: string;
  from: string | null;
  to: string | null;
  reviewCycleId: string | null;
  reviewCycleName: string | null;
}>;

export type GovernanceOverviewApiDto = Readonly<{
  generatedAt: string;
  window: SerializedGovernanceWindow;
  totalEscalations: number;
  openEscalations: number;
  resolvedEscalations: number;
  dismissedEscalations: number;
  unresolvedEscalations: number;
  byType: Array<{
    escalationType: EscalationType;
    count: number;
    openCount: number;
    resolvedCount: number;
    dismissedCount: number;
  }>;
  byLevel: Array<{
    escalationLevel: EscalationLevel;
    count: number;
    openCount: number;
    resolvedCount: number;
    dismissedCount: number;
  }>;
  byReviewCycle: Array<{
    reviewCycleId: string | null;
    reviewCycleName: string;
    year: number | null;
    quarter: number | null;
    count: number;
    openCount: number;
    resolvedCount: number;
    dismissedCount: number;
  }>;
}>;

export type GovernanceLifecycleApiDto = Readonly<{
  generatedAt: string;
  window: SerializedGovernanceWindow;
  slaWindowDays: number;
  resolvedCount: number;
  dismissedCount: number;
  closedCount: number;
  dismissalRatio: number;
  meanResolutionHours: number | null;
  meanDismissalHours: number | null;
  meanClosureHours: number | null;
  resolvedWithinSlaCount: number;
  resolvedWithinSlaRatio: number;
  unresolvedOpenCount: number;
  meanOpenAgeDays: number | null;
  oldestOpenEscalation: {
    escalationLogId: string;
    escalationType: EscalationType;
    escalationLevel: EscalationLevel;
    employeeId: string;
    managerId: string | null;
    targetGoalId: string | null;
    triggeredAt: string;
    ageDays: number;
  } | null;
  openEscalationAging: Array<{
    bucket: string;
    label: string;
    count: number;
  }>;
  recurrence: Array<{
    escalationType: EscalationType;
    employeeId: string;
    employeeName: string;
    managerId: string | null;
    managerName: string | null;
    targetGoalId: string | null;
    targetGoalTitle: string | null;
    occurrenceCount: number;
    openCount: number;
  }>;
}>;

export type GovernanceExecutionHealthApiDto = Readonly<{
  generatedAt: string;
  window: SerializedGovernanceWindow;
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  partiallyCompletedExecutions: number;
  runningExecutions: number;
  scheduledExecutionCount: number;
  successRatio: number;
  failureRatio: number;
  meanExecutionDurationMs: number | null;
  schedulerOverlapSkippedCount: number;
  rulesEvaluated: number;
  violationsDetected: number;
  logsCreated: number;
  evaluationDuplicates: number;
  notificationsAttempted: number;
  notificationsDelivered: number;
  notificationsSkipped: number;
  notificationDuplicates: number;
  notificationDeliverySuccessRatio: number;
  failures: number;
  recentExecutions: Array<{
    executionId: string;
    status: string;
    triggerSource: EscalationTriggerSource;
    triggeredByUserId: string | null;
    startedAt: string;
    completedAt: string | null;
    durationMs: number | null;
    rulesEvaluated: number;
    logsCreated: number;
    notificationsAttempted: number;
    notificationsDelivered: number;
    notificationsSkipped: number;
    failures: number;
    errorSummary: string | null;
  }>;
}>;

export type GovernanceAccountabilityApiDto = Readonly<{
  generatedAt: string;
  window: SerializedGovernanceWindow;
  escalationsByDepartment: Array<{
    department: string;
    totalEscalations: number;
    openEscalations: number;
    resolvedEscalations: number;
    dismissedEscalations: number;
  }>;
  unresolvedEscalationsByDepartment: Array<{
    department: string;
    totalEscalations: number;
    openEscalations: number;
    resolvedEscalations: number;
    dismissedEscalations: number;
  }>;
  escalationsByManager: Array<{
    managerId: string | null;
    managerName: string;
    department: string | null;
    totalEscalations: number;
    openEscalations: number;
    resolvedEscalations: number;
    dismissedEscalations: number;
    meanResolutionHours: number | null;
  }>;
  resolutionOwnership: Array<{
    userId: string;
    userName: string;
    department: string | null;
    resolvedCount: number;
    dismissedCount: number;
    totalClosedCount: number;
  }>;
  repeatEscalationHotspots: GovernanceLifecycleApiDto["recurrence"];
}>;

export type GovernanceConsoleData = Readonly<{
  overview: GovernanceOverviewApiDto;
  lifecycle: GovernanceLifecycleApiDto;
  executionHealth: GovernanceExecutionHealthApiDto;
  accountability: GovernanceAccountabilityApiDto;
  escalations: EscalationListResponseDto;
  scheduler: SchedulerStateDto;
}>;

export type GovernanceLifecycleActionResult = Readonly<{
  escalationLogId: string;
  action: "RESOLVED" | "DISMISSED";
  previousStatus: typeof EscalationStatus.OPEN;
  status: typeof EscalationStatus.RESOLVED | typeof EscalationStatus.DISMISSED;
  resolvedAt: string | null;
  dismissedAt: string | null;
  resolvedByUserId: string | null;
  dismissedByUserId: string | null;
  reason: string;
  notes: string | null;
}>;

export type {
  EscalationListResponseDto,
  EscalationResponseDto,
  ExecutionSummaryDto,
  SchedulerStateDto,
};
