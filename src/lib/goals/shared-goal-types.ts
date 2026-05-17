import type {
  GoalMeasurementTypeValue,
  GoalStatusValue,
} from "@/lib/analytics/types";

export type SharedGoalScope = "admin" | "manager";

export type SharedGoalPropagationStatus =
  | "SYNCED"
  | "AWAITING_PRIMARY_UPDATE"
  | "PRIMARY_LOCKED";

export type SharedGoalPrimaryOption = {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  ownerMeta: string;
  department: string | null;
  measurementType: GoalMeasurementTypeValue;
  status: GoalStatusValue;
  progressPercentage: number;
  progressLabel: string;
  assignedEmployeeIds: string[];
};

export type SharedGoalEmployeeOption = {
  id: string;
  name: string;
  email: string;
  title: string | null;
  department: string | null;
  currentWeightage: number;
  remainingWeightage: number;
};

export type SharedGoalTableRow = {
  id: string;
  parentGoalId: string;
  title: string;
  description: string | null;
  thrustArea: string;
  measurementType: GoalMeasurementTypeValue;
  weightage: number;
  status: GoalStatusValue;
  progressPercentage: number;
  achievementValueLabel: string;
  latestUpdateLabel: string;
  propagationStatus: SharedGoalPropagationStatus;
  primaryOwnerName: string;
  primaryOwnerMeta: string;
  linkedEmployeeName: string;
  linkedEmployeeMeta: string;
  department: string | null;
  createdByName: string;
  createdDateLabel: string;
};

export type SharedGoalsDashboardData = {
  reviewCycle: {
    id: string;
    label: string;
    startDateLabel: string;
    endDateLabel: string;
  } | null;
  primaryGoalOptions: SharedGoalPrimaryOption[];
  employeeOptions: SharedGoalEmployeeOption[];
  rows: SharedGoalTableRow[];
  metrics: {
    linkedGoals: number;
    primaryGoals: number;
    linkedEmployees: number;
    syncedGoals: number;
    availableEmployees: number;
  };
};
