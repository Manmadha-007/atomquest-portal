export type AnalyticsScope =
  | "admin"
  | "manager";

export type GoalStatusValue =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "LOCKED";

export type GoalMeasurementTypeValue =
  | "MIN"
  | "MAX"
  | "TIMELINE"
  | "ZERO";

export type QuarterlyStatusValue =
  | "NOT_STARTED"
  | "ON_TRACK"
  | "COMPLETED"
  | "DELAYED";

export type NumericLike =
  | number
  | string
  | {
      toString(): string;
    }
  | null
  | undefined;

export type AnalyticsReviewCycle =
  Readonly<{
    id: string;
    name: string;
    year: number;
    quarter: number;
    startDate: string;
    endDate: string;
    submissionDeadline: string | null;
    label: string;
  }>;

export type StatusDistributionDatum =
  Readonly<{
    status: GoalStatusValue;
    label: string;
    count: number;
    percentage: number;
    fill: string;
  }>;

export type ProgressTrendDatum =
  Readonly<{
    period: string;
    sortKey: string;
    averageProgress: number;
    completedCount: number;
    updateCount: number;
  }>;

export type ProgressTrendSource =
  Readonly<{
    quarter: number;
    progressValue?: NumericLike;
    quarterlyStatus: QuarterlyStatusValue;

    goal: Readonly<{
      measurementType: GoalMeasurementTypeValue;
      startValue?: NumericLike;
      targetValue?: NumericLike;
      currentValue?: NumericLike;
      timelineTarget?: Date | string | null;
      createdAt: Date | string;

      reviewCycle: Readonly<{
        name: string;
        year: number;
        quarter: number;
      }>;
    }>;
  }>;

export type TeamPerformanceDatum =
  Readonly<{
    name: string;
    goalCount: number;
    averageProgress: number;
    completionRate: number;
    overdueCount: number;
  }>;

export type CompletionStatus =
  | "completed"
  | "pending"
  | "overdue"
  | "reviewed"
  | "awaiting_review";

export type CompletionMonitoringSummary =
  Readonly<{
    completedQuarterlyUpdates: number;
    pendingQuarterlyUpdates: number;
    overdueQuarterlyUpdates: number;
    noSubmissionEmployees: number;
    reviewedSubmissions: number;
    pendingReviews: number;
    overdueReviews: number;
    quarterlyCompletionPercentage: number;
    managerReviewPercentage: number;
  }>;

export type CompletionMonitoringRow =
  Readonly<{
    id: string;
    employeeName: string;
    employeeEmail: string;
    managerName: string;
    reviewCycleLabel: string;

    quarterlySubmissionStatus: CompletionStatus;
    quarterlySubmissionLabel: string;

    managerReviewStatus: CompletionStatus;
    managerReviewLabel: string;

    lastUpdateTimestamp: string;
    completionPercentage: number;

    isOverdue: boolean;
    overdueLabel: string;

    completedQuarterlyUpdates: number;
    pendingQuarterlyUpdates: number;
    overdueQuarterlyUpdates: number;

    reviewedSubmissions: number;
    pendingReviews: number;
    overdueReviews: number;
  }>;

export type CompletionMonitoring =
  Readonly<{
    summary: CompletionMonitoringSummary;
    rows: readonly CompletionMonitoringRow[];
  }>;

export type DashboardAnalytics =
  Readonly<{
    scope: AnalyticsScope;
    reviewCycle: AnalyticsReviewCycle | null;

    totalGoals: number;
    approvedGoals: number;
    submittedGoals: number;
    reviewedGoals: number;

    approvalRate: number;
    completionPercentage: number;
    overduePercentage: number;
    overdueGoals: number;

    activeEmployeeCount: number;
    averageProgress: number;

    statusDistribution:
      readonly StatusDistributionDatum[];

    progressTrend:
      readonly ProgressTrendDatum[];

    teamPerformance:
      readonly TeamPerformanceDatum[];

    completionMonitoring: CompletionMonitoring;
  }>;