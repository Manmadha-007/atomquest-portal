import {
  ApprovalDecision,
  EscalationLevel,
  EscalationExecutionStatus,
  EscalationTriggerSource,
  EscalationNotificationChannel,
  EscalationNotificationStatus,
  EscalationStatus,
  EscalationType,
  GoalMeasurementType,
  GoalStatus,
  UserRole,
  type Prisma,
} from "@prisma/client";

export const BASE_NOW = new Date("2026-05-10T09:00:00.000Z");
export const ACTIVE_CYCLE_START = new Date("2026-05-01T09:00:00.000Z");
export const ACTIVE_CYCLE_END = new Date("2026-06-30T09:00:00.000Z");
export const ACTIVE_CYCLE_ID = "cycle-active-q2-2026";
export const PRIOR_CYCLE_ID = "cycle-prior-q1-2026";

export type TestUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  role: UserRole;
  isActive: boolean;
  managerId: string | null;
};

export type TestReviewCycle = {
  id: string;
  name: string;
  year: number;
  quarter: number;
  startDate: Date;
  endDate: Date;
  submissionDeadline: Date | null;
  isActive: boolean;
};

export type TestGoal = {
  id: string;
  title: string;
  reviewCycleId: string;
  ownerId: string;
  status: GoalStatus;
  isArchived: boolean;
  submittedAt: Date | null;
  parentGoalId: string | null;
  isPrimaryOwner: boolean;
  measurementType: GoalMeasurementType;
  createdAt: Date;
};

export type TestGoalApproval = {
  id: string;
  goalId: string;
  approverId: string;
  version: number;
  stepOrder: number;
  decision: ApprovalDecision;
  decidedAt: Date | null;
  createdAt: Date;
};

export type TestGoalUpdate = {
  id: string;
  goalId: string;
  quarter: number;
  createdById: string;
  createdAt: Date;
};

export type TestEscalationRule = {
  id: string;
  type: EscalationType;
  name: string;
  description: string | null;
  thresholdDays: number;
  escalationLevel: EscalationLevel;
  targetRole: UserRole | null;
  reviewCycleId: string | null;
  departmentScope: string | null;
  isActive: boolean;
  createdAt: Date;
};

export type TestEscalationLog = {
  id: string;
  escalationRuleId: string;
  escalationType: EscalationType;
  escalationLevel: EscalationLevel;
  status: EscalationStatus;
  triggeredAt: Date;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
  dismissedAt: Date | null;
  dismissedByUserId: string | null;
  resolutionReason: string | null;
  dismissalReason: string | null;
  resolutionNotes: string | null;
  employeeId: string;
  managerId: string | null;
  targetGoalId: string | null;
  message: string;
  metadata?: Prisma.JsonObject;
  createdAt: Date;
  updatedAt: Date;
};

export type TestEscalationNotificationDelivery = {
  id: string;
  escalationLogId: string;
  channel: EscalationNotificationChannel;
  status: EscalationNotificationStatus;
  recipientUserId: string;
  recipientAddress: string | null;
  providerName: string;
  attemptedAt: Date;
  deliveredAt: Date | null;
  error: string | null;
  metadata?: Prisma.JsonObject;
  createdAt: Date;
  updatedAt: Date;
};

export type TestEscalationExecution = {
  id: string;
  startedAt: Date;
  completedAt: Date | null;
  status: EscalationExecutionStatus;
  triggeredByUserId: string | null;
  triggerSource: EscalationTriggerSource;
  rulesEvaluated: number;
  violationsDetected: number;
  logsCreated: number;
  evaluationDuplicates: number;
  notificationsAttempted: number;
  notificationsDelivered: number;
  notificationsSkipped: number;
  notificationDuplicates: number;
  failures: number;
  errorSummary: string | null;
  metadata?: Prisma.JsonObject;
  createdAt: Date;
  updatedAt: Date;
};

export type EscalationTestState = {
  users: TestUser[];
  reviewCycles: TestReviewCycle[];
  goals: TestGoal[];
  goalApprovals: TestGoalApproval[];
  goalUpdates: TestGoalUpdate[];
  escalationRules: TestEscalationRule[];
  escalationLogs: TestEscalationLog[];
  escalationNotificationDeliveries: TestEscalationNotificationDelivery[];
  escalationExecutions: TestEscalationExecution[];
};

export function daysAfter(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function millisecondsBefore(date: Date, milliseconds: number) {
  return new Date(date.getTime() - milliseconds);
}

export function manager(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: "manager-product",
    firstName: "Maya",
    lastName: "Patel",
    email: "maya.patel@example.com",
    department: "Product Engineering",
    role: UserRole.MANAGER,
    isActive: true,
    managerId: null,
    ...overrides,
  };
}

export function employee(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: "employee-product",
    firstName: "Evan",
    lastName: "Stone",
    email: "evan.stone@example.com",
    department: "Product Engineering",
    role: UserRole.EMPLOYEE,
    isActive: true,
    managerId: "manager-product",
    ...overrides,
  };
}

export function reviewCycle(
  overrides: Partial<TestReviewCycle> = {},
): TestReviewCycle {
  return {
    id: ACTIVE_CYCLE_ID,
    name: "Q2 2026 Operating Cycle",
    year: 2026,
    quarter: 2,
    startDate: ACTIVE_CYCLE_START,
    endDate: ACTIVE_CYCLE_END,
    submissionDeadline: null,
    isActive: true,
    ...overrides,
  };
}

export function goal(overrides: Partial<TestGoal> = {}): TestGoal {
  return {
    id: "goal-product-reliability",
    title: "Improve platform reliability",
    reviewCycleId: ACTIVE_CYCLE_ID,
    ownerId: "employee-product",
    status: GoalStatus.DRAFT,
    isArchived: false,
    submittedAt: null,
    parentGoalId: null,
    isPrimaryOwner: true,
    measurementType: GoalMeasurementType.MAX,
    createdAt: ACTIVE_CYCLE_START,
    ...overrides,
  };
}

export function approval(
  overrides: Partial<TestGoalApproval> = {},
): TestGoalApproval {
  return {
    id: "approval-product-reliability",
    goalId: "goal-product-reliability",
    approverId: "manager-product",
    version: 1,
    stepOrder: 1,
    decision: ApprovalDecision.PENDING,
    decidedAt: null,
    createdAt: daysAfter(ACTIVE_CYCLE_START, 1),
    ...overrides,
  };
}

export function goalUpdate(
  overrides: Partial<TestGoalUpdate> = {},
): TestGoalUpdate {
  return {
    id: "goal-update-product-reliability-q2",
    goalId: "goal-product-reliability",
    quarter: 2,
    createdById: "employee-product",
    createdAt: daysAfter(ACTIVE_CYCLE_START, 6),
    ...overrides,
  };
}

export function escalationRule(
  overrides: Partial<TestEscalationRule> = {},
): TestEscalationRule {
  return {
    id: "rule-goal-not-submitted",
    type: EscalationType.GOAL_NOT_SUBMITTED,
    name: "Goal submission overdue after 3 days",
    description: "Escalates missing quarterly goal submissions.",
    thresholdDays: 3,
    escalationLevel: EscalationLevel.LEVEL_1,
    targetRole: UserRole.EMPLOYEE,
    reviewCycleId: null,
    departmentScope: null,
    isActive: true,
    createdAt: ACTIVE_CYCLE_START,
    ...overrides,
  };
}

export function escalationLog(
  overrides: Partial<TestEscalationLog> = {},
): TestEscalationLog {
  return {
    id: "existing-escalation-log",
    escalationRuleId: "rule-goal-not-submitted",
    escalationType: EscalationType.GOAL_NOT_SUBMITTED,
    escalationLevel: EscalationLevel.LEVEL_1,
    status: EscalationStatus.OPEN,
    triggeredAt: BASE_NOW,
    resolvedAt: null,
    resolvedByUserId: null,
    dismissedAt: null,
    dismissedByUserId: null,
    resolutionReason: null,
    dismissalReason: null,
    resolutionNotes: null,
    employeeId: "employee-product",
    managerId: "manager-product",
    targetGoalId: null,
    message: "Existing open escalation.",
    metadata: undefined,
    createdAt: BASE_NOW,
    updatedAt: BASE_NOW,
    ...overrides,
  };
}

export function escalationNotificationDelivery(
  overrides: Partial<TestEscalationNotificationDelivery> = {},
): TestEscalationNotificationDelivery {
  return {
    id: "existing-escalation-notification-delivery",
    escalationLogId: "existing-escalation-log",
    channel: EscalationNotificationChannel.EMAIL,
    status: EscalationNotificationStatus.DELIVERED,
    recipientUserId: "employee-product",
    recipientAddress: "evan.stone@example.com",
    providerName: "Email",
    attemptedAt: BASE_NOW,
    deliveredAt: BASE_NOW,
    error: null,
    metadata: undefined,
    createdAt: BASE_NOW,
    updatedAt: BASE_NOW,
    ...overrides,
  };
}

export function escalationExecution(
  overrides: Partial<TestEscalationExecution> = {},
): TestEscalationExecution {
  return {
    id: "existing-escalation-execution",
    startedAt: BASE_NOW,
    completedAt: null,
    status: EscalationExecutionStatus.RUNNING,
    triggeredByUserId: null,
    triggerSource: EscalationTriggerSource.MANUAL,
    rulesEvaluated: 0,
    violationsDetected: 0,
    logsCreated: 0,
    evaluationDuplicates: 0,
    notificationsAttempted: 0,
    notificationsDelivered: 0,
    notificationsSkipped: 0,
    notificationDuplicates: 0,
    failures: 0,
    errorSummary: null,
    metadata: undefined,
    createdAt: BASE_NOW,
    updatedAt: BASE_NOW,
    ...overrides,
  };
}

export function escalationState(
  overrides: Partial<EscalationTestState> = {},
): EscalationTestState {
  return {
    users: [manager(), employee()],
    reviewCycles: [reviewCycle()],
    goals: [],
    goalApprovals: [],
    goalUpdates: [],
    escalationRules: [],
    escalationLogs: [],
    escalationNotificationDeliveries: [],
    escalationExecutions: [],
    ...overrides,
  };
}
