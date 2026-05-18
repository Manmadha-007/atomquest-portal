import type {
  EscalationLevel,
  EscalationRule,
  EscalationType,
  Prisma,
  UserRole,
} from "@prisma/client";

export type EscalationDbClient = Prisma.TransactionClient;

export type ActiveEscalationRule = Pick<
  EscalationRule,
  | "id"
  | "type"
  | "name"
  | "description"
  | "thresholdDays"
  | "escalationLevel"
  | "targetRole"
  | "reviewCycleId"
  | "departmentScope"
>;

export type ReviewCycleScope = Readonly<{
  id: string;
  name: string;
  year: number;
  quarter: number;
  startDate: Date;
  endDate: Date;
  submissionDeadline: Date | null;
  isActive: boolean;
}>;

export type EscalationViolation = Readonly<{
  rule: ActiveEscalationRule;
  employeeId: string;
  managerId?: string | null;
  targetGoalId?: string | null;
  message: string;
  metadata?: Prisma.JsonObject;
}>;

export type EscalationLogEnsureResult = Readonly<{
  ruleId: string;
  escalationType: EscalationType;
  escalationLevel: EscalationLevel;
  employeeId: string;
  managerId: string | null;
  targetGoalId: string | null;
  created: boolean;
  logId?: string;
  duplicateLogId?: string;
}>;

export type EscalationRuleEvaluationResult = Readonly<{
  ruleId: string;
  ruleName: string;
  escalationType: EscalationType;
  escalationLevel: EscalationLevel;
  targetRole: UserRole | null;
  evaluatedAt: Date;
  evaluatedContextCount: number;
  createdLogCount: number;
  skippedDuplicateCount: number;
  skippedReason?: "THRESHOLD_NOT_REACHED" | "NO_REVIEW_CYCLE_SCOPE";
  logResults: EscalationLogEnsureResult[];
}>;

export type EscalationEvaluationRunResult = Readonly<{
  evaluatedAt: Date;
  activeRuleCount: number;
  evaluatedRuleCount: number;
  createdLogCount: number;
  skippedDuplicateCount: number;
  results: EscalationRuleEvaluationResult[];
}>;
