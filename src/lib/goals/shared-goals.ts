import {
  GoalStatus,
  Prisma,
  UserRole,
  type GoalMeasurementType,
  type PrismaClient,
} from "@prisma/client";

import {
  calculateQuarterlyProgress,
  formatAchievementValue,
} from "@/lib/goals/quarterly-progress";
import { prisma } from "@/lib/prisma";
import { MAX_TOTAL_GOAL_WEIGHTAGE } from "@/lib/validations/shared-goal";

export type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

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
  measurementType: GoalMeasurementType;
  status: GoalStatus;
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
  measurementType: GoalMeasurementType;
  weightage: number;
  status: GoalStatus;
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

const personSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  title: true,
  department: true,
  managerId: true,
  role: true,
  isActive: true,
} as const satisfies Prisma.UserSelect;

const latestUpdateSelect = {
  orderBy: { createdAt: "desc" },
  take: 1,
  select: {
    progressValue: true,
    quarterlyStatus: true,
    createdAt: true,
  },
} as const;

const primaryGoalOptionSelect = {
  id: true,
  title: true,
  measurementType: true,
  unit: true,
  startValue: true,
  targetValue: true,
  currentValue: true,
  timelineTarget: true,
  status: true,
  createdAt: true,
  owner: {
    select: personSelect,
  },
  updates: latestUpdateSelect,
  sharedGoals: {
    where: {
      isArchived: false,
    },
    select: {
      ownerId: true,
    },
  },
} as const satisfies Prisma.GoalSelect;

const parentGoalProgressSelect = {
  id: true,
  title: true,
  measurementType: true,
  unit: true,
  startValue: true,
  targetValue: true,
  currentValue: true,
  timelineTarget: true,
  status: true,
  createdAt: true,
  owner: {
    select: personSelect,
  },
  updates: latestUpdateSelect,
} as const satisfies Prisma.GoalSelect;

const sharedGoalRowSelect = {
  id: true,
  parentGoalId: true,
  title: true,
  description: true,
  thrustArea: true,
  measurementType: true,
  unit: true,
  weight: true,
  status: true,
  createdAt: true,
  owner: {
    select: personSelect,
  },
  createdBy: {
    select: personSelect,
  },
  parentGoal: {
    select: parentGoalProgressSelect,
  },
} as const satisfies Prisma.GoalSelect;

type PersonRecord = Prisma.UserGetPayload<{ select: typeof personSelect }>;
type PrimaryGoalOptionRecord = Prisma.GoalGetPayload<{
  select: typeof primaryGoalOptionSelect;
}>;
type SharedGoalRowRecord = Prisma.GoalGetPayload<{
  select: typeof sharedGoalRowSelect;
}>;
type ParentGoalProgressRecord = NonNullable<SharedGoalRowRecord["parentGoal"]>;

function formatPersonName(person: Pick<PersonRecord, "firstName" | "lastName">) {
  return `${person.firstName} ${person.lastName}`.trim();
}

function formatPersonMeta(
  person: Pick<PersonRecord, "title" | "email" | "department">,
) {
  return person.title ?? person.department ?? person.email;
}

export function formatSharedGoalDate(value?: Date | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export function formatSharedGoalReviewCycleLabel(
  reviewCycle: { name: string; year: number; quarter: number } | null,
) {
  if (!reviewCycle) {
    return "No active review cycle";
  }

  return `${reviewCycle.name} - Q${reviewCycle.quarter} ${reviewCycle.year}`;
}

function getLatestProgressValue(
  goal: Pick<
    ParentGoalProgressRecord,
    | "measurementType"
    | "unit"
    | "startValue"
    | "targetValue"
    | "currentValue"
    | "timelineTarget"
    | "createdAt"
    | "updates"
  >,
) {
  return goal.updates[0]?.progressValue ?? goal.currentValue;
}

function getGoalProgressSnapshot(
  goal: Pick<
    ParentGoalProgressRecord,
    | "measurementType"
    | "unit"
    | "startValue"
    | "targetValue"
    | "currentValue"
    | "timelineTarget"
    | "createdAt"
    | "updates"
  >,
) {
  const latestUpdate = goal.updates[0];
  const progressValue = getLatestProgressValue(goal);
  const progressPercentage = calculateQuarterlyProgress({
    measurementType: goal.measurementType,
    startValue: goal.startValue,
    targetValue: goal.targetValue,
    currentValue: goal.currentValue,
    achievementValue: latestUpdate?.progressValue,
    dueDate: goal.timelineTarget,
    createdAt: goal.createdAt,
  });

  return {
    progressPercentage,
    achievementValueLabel: formatAchievementValue(progressValue, goal.unit),
    latestUpdateLabel: latestUpdate
      ? `Synced ${formatSharedGoalDate(latestUpdate.createdAt)}`
      : "Awaiting primary update",
  };
}

function getPropagationStatus(
  parentGoal: Pick<ParentGoalProgressRecord, "status" | "updates" | "currentValue">,
): SharedGoalPropagationStatus {
  if (parentGoal.status === GoalStatus.LOCKED) {
    return "PRIMARY_LOCKED";
  }

  if (parentGoal.updates.length > 0 || parentGoal.currentValue !== null) {
    return "SYNCED";
  }

  return "AWAITING_PRIMARY_UPDATE";
}

function mapPrimaryGoalOption(
  goal: PrimaryGoalOptionRecord,
): SharedGoalPrimaryOption {
  const snapshot = getGoalProgressSnapshot(goal);
  const ownerName = formatPersonName(goal.owner);

  return {
    id: goal.id,
    title: goal.title,
    ownerId: goal.owner.id,
    ownerName,
    ownerMeta: formatPersonMeta(goal.owner),
    department: goal.owner.department,
    measurementType: goal.measurementType,
    status: goal.status,
    progressPercentage: snapshot.progressPercentage,
    progressLabel: `${snapshot.progressPercentage}% propagated progress`,
    assignedEmployeeIds: goal.sharedGoals.map((sharedGoal) => sharedGoal.ownerId),
  };
}

function mapSharedGoalRow(goal: SharedGoalRowRecord): SharedGoalTableRow | null {
  if (!goal.parentGoal || !goal.parentGoalId) {
    return null;
  }

  const snapshot = getGoalProgressSnapshot(goal.parentGoal);
  const primaryOwnerName = formatPersonName(goal.parentGoal.owner);
  const linkedEmployeeName = formatPersonName(goal.owner);
  const createdByName = formatPersonName(goal.createdBy);

  return {
    id: goal.id,
    parentGoalId: goal.parentGoalId,
    title: goal.title,
    description: goal.description,
    thrustArea: goal.thrustArea,
    measurementType: goal.measurementType,
    weightage: goal.weight,
    status: goal.status,
    progressPercentage: snapshot.progressPercentage,
    achievementValueLabel: snapshot.achievementValueLabel,
    latestUpdateLabel: snapshot.latestUpdateLabel,
    propagationStatus: getPropagationStatus(goal.parentGoal),
    primaryOwnerName,
    primaryOwnerMeta: formatPersonMeta(goal.parentGoal.owner),
    linkedEmployeeName,
    linkedEmployeeMeta: formatPersonMeta(goal.owner),
    department: goal.owner.department,
    createdByName,
    createdDateLabel: formatSharedGoalDate(goal.createdAt),
  };
}

export function canManageSharedGoals(role?: UserRole | null) {
  return role === UserRole.ADMIN || role === UserRole.MANAGER;
}

export function buildSharedGoalRecipientWhere(input: {
  actorId: string;
  actorRole: UserRole;
  employeeIds?: string[];
}): Prisma.UserWhereInput {
  const baseWhere: Prisma.UserWhereInput = {
    isActive: true,
    role: UserRole.EMPLOYEE,
    ...(input.employeeIds ? { id: { in: input.employeeIds } } : {}),
  };

  if (input.actorRole === UserRole.ADMIN) {
    return baseWhere;
  }

  return {
    ...baseWhere,
    managerId: input.actorId,
  };
}

export function buildPrimaryGoalWhere(input: {
  actorId: string;
  actorRole: UserRole;
  reviewCycleId: string;
}): Prisma.GoalWhereInput {
  const baseWhere: Prisma.GoalWhereInput = {
    reviewCycleId: input.reviewCycleId,
    isArchived: false,
    isPrimaryOwner: true,
    parentGoalId: null,
    status: GoalStatus.APPROVED,
    owner: {
      isActive: true,
    },
  };

  if (input.actorRole === UserRole.ADMIN) {
    return baseWhere;
  }

  return {
    ...baseWhere,
    OR: [
      { ownerId: input.actorId },
      {
        owner: {
          managerId: input.actorId,
          isActive: true,
        },
      },
    ],
  };
}

export async function getActiveReviewCycle(client: TransactionClient = prisma) {
  return client.reviewCycle.findFirst({
    where: { isActive: true },
    orderBy: [{ year: "desc" }, { quarter: "desc" }, { startDate: "desc" }],
    select: {
      id: true,
      name: true,
      year: true,
      quarter: true,
      startDate: true,
      endDate: true,
    },
  });
}

export async function getGoalWeightageByOwner(input: {
  client: TransactionClient;
  reviewCycleId: string;
  ownerIds: string[];
  excludingGoalId?: string;
}) {
  if (input.ownerIds.length === 0) {
    return new Map<string, number>();
  }

  const aggregates = await input.client.goal.groupBy({
    by: ["ownerId"],
    where: {
      ownerId: { in: input.ownerIds },
      reviewCycleId: input.reviewCycleId,
      isArchived: false,
      ...(input.excludingGoalId
        ? { id: { not: input.excludingGoalId } }
        : {}),
    },
    _sum: {
      weight: true,
    },
  });

  return new Map(
    aggregates.map((aggregate) => [
      aggregate.ownerId,
      Number(aggregate._sum.weight ?? 0),
    ]),
  );
}

export function buildSharedGoalGroupName(parentGoal: {
  id: string;
  title: string;
}) {
  const prefix = "Shared KPI: ";
  const suffix = ` (${parentGoal.id.slice(0, 8)})`;
  const normalizedTitle = parentGoal.title.trim().replace(/\s+/g, " ");
  const titleBudget = Math.max(24, 120 - prefix.length - suffix.length);

  return `${prefix}${normalizedTitle.slice(0, titleBudget)}${suffix}`;
}

export function getSharedGoalRevalidationPaths() {
  return [
    "/dashboard/manager/team-goals",
    "/dashboard/admin/shared-goals",
    "/dashboard/manager/shared-goals",
    "/dashboard/employee",
    "/dashboard/employee/quarterly-updates",
    "/dashboard/manager/analytics",
    "/dashboard/admin/analytics",
  ];
}

async function getSharedGoalRows(input: {
  actorId: string;
  actorRole: UserRole;
  reviewCycleId: string;
}) {
  const where: Prisma.GoalWhereInput = {
    reviewCycleId: input.reviewCycleId,
    isArchived: false,
    parentGoalId: { not: null },
    owner:
      input.actorRole === UserRole.MANAGER
        ? {
            managerId: input.actorId,
            isActive: true,
          }
        : {
            isActive: true,
          },
  };

  const goals = await prisma.goal.findMany({
    where,
    orderBy: [
      { createdAt: "desc" },
      { owner: { lastName: "asc" } },
      { owner: { firstName: "asc" } },
    ],
    select: sharedGoalRowSelect,
  });

  return goals.flatMap((goal) => {
    const row = mapSharedGoalRow(goal);
    return row ? [row] : [];
  });
}

async function getEmployeeOptions(input: {
  actorId: string;
  actorRole: UserRole;
  reviewCycleId: string;
}) {
  const employees = await prisma.user.findMany({
    where: buildSharedGoalRecipientWhere(input),
    orderBy: [{ department: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: personSelect,
  });
  const weightageByOwner = await getGoalWeightageByOwner({
    client: prisma,
    reviewCycleId: input.reviewCycleId,
    ownerIds: employees.map((employee) => employee.id),
  });

  return employees.map((employee) => {
    const currentWeightage = weightageByOwner.get(employee.id) ?? 0;

    return {
      id: employee.id,
      name: formatPersonName(employee),
      email: employee.email,
      title: employee.title,
      department: employee.department,
      currentWeightage,
      remainingWeightage: Math.max(
        0,
        MAX_TOTAL_GOAL_WEIGHTAGE - currentWeightage,
      ),
    };
  });
}

async function getPrimaryGoalOptions(input: {
  actorId: string;
  actorRole: UserRole;
  reviewCycleId: string;
}) {
  const goals = await prisma.goal.findMany({
    where: buildPrimaryGoalWhere(input),
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    select: primaryGoalOptionSelect,
  });

  return goals.map(mapPrimaryGoalOption);
}

export async function getSharedGoalsDashboard(input: {
  actorId: string;
  actorRole: UserRole;
}): Promise<SharedGoalsDashboardData> {
  if (!canManageSharedGoals(input.actorRole)) {
    return {
      reviewCycle: null,
      primaryGoalOptions: [],
      employeeOptions: [],
      rows: [],
      metrics: {
        linkedGoals: 0,
        primaryGoals: 0,
        linkedEmployees: 0,
        syncedGoals: 0,
        availableEmployees: 0,
      },
    };
  }

  const activeReviewCycle = await getActiveReviewCycle();

  if (!activeReviewCycle) {
    return {
      reviewCycle: null,
      primaryGoalOptions: [],
      employeeOptions: [],
      rows: [],
      metrics: {
        linkedGoals: 0,
        primaryGoals: 0,
        linkedEmployees: 0,
        syncedGoals: 0,
        availableEmployees: 0,
      },
    };
  }

  const [primaryGoalOptions, employeeOptions, rows] = await Promise.all([
    getPrimaryGoalOptions({
      ...input,
      reviewCycleId: activeReviewCycle.id,
    }),
    getEmployeeOptions({
      ...input,
      reviewCycleId: activeReviewCycle.id,
    }),
    getSharedGoalRows({
      ...input,
      reviewCycleId: activeReviewCycle.id,
    }),
  ]);
  const primaryGoalIds = new Set(rows.map((row) => row.parentGoalId));
  const linkedEmployeeNames = new Set(rows.map((row) => row.linkedEmployeeName));

  return {
    reviewCycle: {
      id: activeReviewCycle.id,
      label: formatSharedGoalReviewCycleLabel(activeReviewCycle),
      startDateLabel: formatSharedGoalDate(activeReviewCycle.startDate),
      endDateLabel: formatSharedGoalDate(activeReviewCycle.endDate),
    },
    primaryGoalOptions,
    employeeOptions,
    rows,
    metrics: {
      linkedGoals: rows.length,
      primaryGoals: primaryGoalIds.size,
      linkedEmployees: linkedEmployeeNames.size,
      syncedGoals: rows.filter((row) => row.propagationStatus === "SYNCED")
        .length,
      availableEmployees: employeeOptions.length,
    },
  };
}
