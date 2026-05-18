import type {
  EscalationExecutionStatus,
  EscalationLevel,
  EscalationStatus,
  EscalationTriggerSource,
  EscalationType,
} from "@prisma/client";

export type GovernanceAnalyticsWindowPreset =
  | "ALL_TIME"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "CURRENT_REVIEW_CYCLE"
  | "CUSTOM";

export type GovernanceAnalyticsTimeWindow =
  | Readonly<{ preset: "ALL_TIME" }>
  | Readonly<{ preset: "LAST_7_DAYS" }>
  | Readonly<{ preset: "LAST_30_DAYS" }>
  | Readonly<{ preset: "CURRENT_REVIEW_CYCLE" }>
  | Readonly<{
      preset: "CUSTOM";
      from?: Date | null;
      to?: Date | null;
      label?: string;
    }>;

export type ResolvedGovernanceAnalyticsWindow = Readonly<{
  preset: GovernanceAnalyticsWindowPreset;
  label: string;
  from: Date | null;
  to: Date | null;
  reviewCycleId: string | null;
  reviewCycleName: string | null;
}>;

export type EscalationStatusCount = Readonly<{
  status: EscalationStatus;
  count: number;
}>;

export type EscalationTypeDistribution = Readonly<{
  escalationType: EscalationType;
  count: number;
  openCount: number;
  resolvedCount: number;
  dismissedCount: number;
}>;

export type EscalationLevelDistribution = Readonly<{
  escalationLevel: EscalationLevel;
  count: number;
  openCount: number;
  resolvedCount: number;
  dismissedCount: number;
}>;

export type ReviewCycleEscalationMetrics = Readonly<{
  reviewCycleId: string | null;
  reviewCycleName: string;
  year: number | null;
  quarter: number | null;
  count: number;
  openCount: number;
  resolvedCount: number;
  dismissedCount: number;
}>;

export type EscalationOverviewMetrics = Readonly<{
  generatedAt: Date;
  window: ResolvedGovernanceAnalyticsWindow;
  totalEscalations: number;
  openEscalations: number;
  resolvedEscalations: number;
  dismissedEscalations: number;
  unresolvedEscalations: number;
  byStatus: EscalationStatusCount[];
  byType: EscalationTypeDistribution[];
  byLevel: EscalationLevelDistribution[];
  byReviewCycle: ReviewCycleEscalationMetrics[];
}>;

export type EscalationAgingBucket = Readonly<{
  bucket: "0_3_DAYS" | "4_7_DAYS" | "8_14_DAYS" | "15_PLUS_DAYS";
  label: string;
  count: number;
}>;

export type OldestOpenEscalation = Readonly<{
  escalationLogId: string;
  escalationType: EscalationType;
  escalationLevel: EscalationLevel;
  employeeId: string;
  managerId: string | null;
  targetGoalId: string | null;
  triggeredAt: Date;
  ageDays: number;
}>;

export type EscalationRecurrenceMetric = Readonly<{
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

export type EscalationLifecycleMetrics = Readonly<{
  generatedAt: Date;
  window: ResolvedGovernanceAnalyticsWindow;
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
  oldestOpenEscalation: OldestOpenEscalation | null;
  openEscalationAging: EscalationAgingBucket[];
  recurrence: EscalationRecurrenceMetric[];
}>;

export type ExecutionStatusCount = Readonly<{
  status: EscalationExecutionStatus;
  count: number;
}>;

export type ExecutionTriggerSourceCount = Readonly<{
  triggerSource: EscalationTriggerSource;
  count: number;
}>;

export type RecentEscalationExecution = Readonly<{
  executionId: string;
  status: EscalationExecutionStatus;
  triggerSource: EscalationTriggerSource;
  triggeredByUserId: string | null;
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number | null;
  rulesEvaluated: number;
  logsCreated: number;
  notificationsAttempted: number;
  notificationsDelivered: number;
  notificationsSkipped: number;
  failures: number;
  errorSummary: string | null;
}>;

export type ExecutionHealthMetrics = Readonly<{
  generatedAt: Date;
  window: ResolvedGovernanceAnalyticsWindow;
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
  byStatus: ExecutionStatusCount[];
  byTriggerSource: ExecutionTriggerSourceCount[];
  recentExecutions: RecentEscalationExecution[];
}>;

export type DepartmentAccountabilityMetric = Readonly<{
  department: string;
  totalEscalations: number;
  openEscalations: number;
  resolvedEscalations: number;
  dismissedEscalations: number;
}>;

export type ManagerAccountabilityMetric = Readonly<{
  managerId: string | null;
  managerName: string;
  department: string | null;
  totalEscalations: number;
  openEscalations: number;
  resolvedEscalations: number;
  dismissedEscalations: number;
  meanResolutionHours: number | null;
}>;

export type ResolutionOwnerMetric = Readonly<{
  userId: string;
  userName: string;
  department: string | null;
  resolvedCount: number;
  dismissedCount: number;
  totalClosedCount: number;
}>;

export type GovernanceAccountabilityMetrics = Readonly<{
  generatedAt: Date;
  window: ResolvedGovernanceAnalyticsWindow;
  escalationsByDepartment: DepartmentAccountabilityMetric[];
  unresolvedEscalationsByDepartment: DepartmentAccountabilityMetric[];
  escalationsByManager: ManagerAccountabilityMetric[];
  managerResolutionResponsiveness: ManagerAccountabilityMetric[];
  resolutionOwnership: ResolutionOwnerMetric[];
  repeatEscalationHotspots: EscalationRecurrenceMetric[];
}>;

export type GovernanceAnalyticsServiceInput = Readonly<{
  now?: Date;
  timeWindow?: GovernanceAnalyticsTimeWindow;
}>;

export type GovernanceDashboardMetrics = Readonly<{
  overview: EscalationOverviewMetrics;
  lifecycle: EscalationLifecycleMetrics;
  executionHealth: ExecutionHealthMetrics;
  accountability: GovernanceAccountabilityMetrics;
}>;
