import "dotenv/config";

import {
  ApprovalDecision,
  GoalMeasurementType,
  GoalStatus,
  Prisma,
  QuarterlyStatus,
  UserRole,
} from "@prisma/client";
import { hash } from "bcryptjs";

import { prisma } from "../src/lib/prisma";

const DEMO_PASSWORD = "Password@123";
const SEED_USER_AGENT = "atomquest-prisma-seed";
const SEED_IP_ADDRESS = "127.0.0.1";

const uuid = (value: number) =>
  `00000000-0000-4000-8000-${value.toString().padStart(12, "0")}`;

const date = (value: string) => new Date(`${value}T09:00:00.000Z`);

type UserKey = "admin" | "manager" | "employee1" | "employee2" | "employee3";
type CycleKey = "active" | "historical";

const userIds = {
  admin: uuid(1),
  manager: uuid(2),
  employee1: uuid(3),
  employee2: uuid(4),
  employee3: uuid(5),
} satisfies Record<UserKey, string>;

const cycleIds = {
  active: uuid(101),
  historical: uuid(102),
} satisfies Record<CycleKey, string>;

const sharedGoalGroupId = uuid(201);
const seededUserIds: Record<UserKey, string> = { ...userIds };
const seededCycleIds: Record<CycleKey, string> = { ...cycleIds };
let seededSharedGoalGroupId = sharedGoalGroupId;

const users = [
  {
    key: "admin",
    id: userIds.admin,
    employeeNumber: "AQ-0001",
    email: "admin@atomquest.com",
    firstName: "Aditi",
    lastName: "Rao",
    title: "VP, People Operations",
    department: "People & Strategy",
    role: UserRole.ADMIN,
  },
  {
    key: "manager",
    id: userIds.manager,
    employeeNumber: "AQ-0100",
    email: "manager@atomquest.com",
    firstName: "Marcus",
    lastName: "Chen",
    title: "Director, Product Delivery",
    department: "Product Delivery",
    role: UserRole.MANAGER,
    managerKey: "admin",
  },
  {
    key: "employee1",
    id: userIds.employee1,
    employeeNumber: "AQ-1001",
    email: "employee1@atomquest.com",
    firstName: "Priya",
    lastName: "Nair",
    title: "Senior Product Analyst",
    department: "Product Delivery",
    role: UserRole.EMPLOYEE,
    managerKey: "manager",
  },
  {
    key: "employee2",
    id: userIds.employee2,
    employeeNumber: "AQ-1002",
    email: "employee2@atomquest.com",
    firstName: "Jordan",
    lastName: "Lee",
    title: "Platform Engineer",
    department: "Engineering",
    role: UserRole.EMPLOYEE,
    managerKey: "manager",
  },
  {
    key: "employee3",
    id: userIds.employee3,
    employeeNumber: "AQ-1003",
    email: "employee3@atomquest.com",
    firstName: "Sofia",
    lastName: "Martinez",
    title: "Customer Success Lead",
    department: "Customer Experience",
    role: UserRole.EMPLOYEE,
    managerKey: "manager",
  },
] satisfies Array<{
  key: UserKey;
  id: string;
  employeeNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  title: string;
  department: string;
  role: UserRole;
  managerKey?: UserKey;
}>;

const reviewCycles = [
  {
    key: "active",
    id: cycleIds.active,
    name: "Q2 2026 Enterprise Goals",
    year: 2026,
    quarter: 2,
    status: QuarterlyStatus.ON_TRACK,
    startDate: date("2026-04-01"),
    endDate: date("2026-06-30"),
    submissionDeadline: date("2026-04-15"),
    lockDate: date("2026-07-05"),
    isActive: true,
  },
  {
    key: "historical",
    id: cycleIds.historical,
    name: "Q1 2026 Performance Review",
    year: 2026,
    quarter: 1,
    status: QuarterlyStatus.COMPLETED,
    startDate: date("2026-01-01"),
    endDate: date("2026-03-31"),
    submissionDeadline: date("2026-01-15"),
    lockDate: date("2026-04-05"),
    isActive: false,
  },
] satisfies Array<{
  key: CycleKey;
  id: string;
  name: string;
  year: number;
  quarter: number;
  status: QuarterlyStatus;
  startDate: Date;
  endDate: Date;
  submissionDeadline: Date;
  lockDate: Date;
  isActive: boolean;
}>;

type GoalSeed = {
  id: string;
  reviewCycleKey: CycleKey;
  ownerKey: UserKey;
  createdByKey: UserKey;
  shared: boolean;
  title: string;
  description: string;
  thrustArea: string;
  measurementType: GoalMeasurementType;
  unit: string | null;
  startValue: string | null;
  targetValue: string | null;
  currentValue: string | null;
  timelineTarget: Date | null;
  weight: number;
  priority: number;
  status: GoalStatus;
  submittedAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  lockedAt: Date | null;
  update: {
    quarter: number;
    summary: string;
    progressValue: string | null;
    quarterlyStatus: QuarterlyStatus;
  };
};

type ApprovalSeed = {
  goal: GoalSeed;
  approverKey: UserKey;
  stepOrder: number;
  decision: ApprovalDecision;
  comments: string;
  decidedAt: Date | null;
};

const goals: GoalSeed[] = [
  {
    id: uuid(301),
    reviewCycleKey: "active",
    ownerKey: "employee1",
    createdByKey: "manager",
    shared: false,
    title: "Increase enterprise dashboard adoption",
    description:
      "Grow weekly active usage of the executive KPI dashboard across strategic enterprise accounts.",
    thrustArea: "Customer Value & Adoption",
    measurementType: GoalMeasurementType.MAX,
    unit: "% weekly active enterprise users",
    startValue: "48",
    targetValue: "78",
    currentValue: "62",
    timelineTarget: null,
    weight: 35,
    priority: 1,
    status: GoalStatus.APPROVED,
    submittedAt: date("2026-04-08"),
    approvedAt: date("2026-04-10"),
    rejectedAt: null,
    lockedAt: null,
    update: {
      quarter: 2,
      summary:
        "Adoption lifted after leadership scorecards were added to the Monday operating review.",
      progressValue: "62",
      quarterlyStatus: QuarterlyStatus.ON_TRACK,
    },
  },
  {
    id: uuid(302),
    reviewCycleKey: "active",
    ownerKey: "employee1",
    createdByKey: "manager",
    shared: false,
    title: "Reduce executive reporting preparation time",
    description:
      "Automate recurring data pulls and narrative templates for quarterly business reviews.",
    thrustArea: "Operational Excellence",
    measurementType: GoalMeasurementType.MIN,
    unit: "hours per report pack",
    startValue: "14",
    targetValue: "6",
    currentValue: "8.5",
    timelineTarget: null,
    weight: 25,
    priority: 2,
    status: GoalStatus.APPROVED,
    submittedAt: date("2026-04-08"),
    approvedAt: date("2026-04-10"),
    rejectedAt: null,
    lockedAt: null,
    update: {
      quarter: 2,
      summary:
        "Reusable metric extracts are in place; commentary workflow still needs finance review.",
      progressValue: "8.5",
      quarterlyStatus: QuarterlyStatus.ON_TRACK,
    },
  },
  {
    id: uuid(303),
    reviewCycleKey: "active",
    ownerKey: "employee2",
    createdByKey: "manager",
    shared: true,
    title: "Improve API p95 latency for goal analytics",
    description:
      "Optimize analytics API queries so enterprise dashboard users receive faster trend insights.",
    thrustArea: "Platform Reliability",
    measurementType: GoalMeasurementType.MIN,
    unit: "milliseconds p95",
    startValue: "620",
    targetValue: "350",
    currentValue: "410",
    timelineTarget: null,
    weight: 40,
    priority: 1,
    status: GoalStatus.APPROVED,
    submittedAt: date("2026-04-06"),
    approvedAt: date("2026-04-09"),
    rejectedAt: null,
    lockedAt: null,
    update: {
      quarter: 2,
      summary:
        "Query consolidation and cache warming reduced p95 latency by 210 ms.",
      progressValue: "410",
      quarterlyStatus: QuarterlyStatus.ON_TRACK,
    },
  },
  {
    id: uuid(304),
    reviewCycleKey: "active",
    ownerKey: "employee2",
    createdByKey: "manager",
    shared: false,
    title: "Increase automated regression coverage",
    description:
      "Expand regression coverage for goal submission, approval, and dashboard aggregation flows.",
    thrustArea: "Quality Engineering",
    measurementType: GoalMeasurementType.MAX,
    unit: "% critical workflow coverage",
    startValue: "58",
    targetValue: "82",
    currentValue: "74",
    timelineTarget: null,
    weight: 30,
    priority: 2,
    status: GoalStatus.SUBMITTED,
    submittedAt: date("2026-04-11"),
    approvedAt: null,
    rejectedAt: null,
    lockedAt: null,
    update: {
      quarter: 2,
      summary:
        "Approval workflow tests are complete; reporting aggregation tests are queued for sprint 6.",
      progressValue: "74",
      quarterlyStatus: QuarterlyStatus.ON_TRACK,
    },
  },
  {
    id: uuid(305),
    reviewCycleKey: "active",
    ownerKey: "employee2",
    createdByKey: "manager",
    shared: false,
    title: "Standardize release change advisory turnaround",
    description:
      "Reduce the time required to prepare change advisory notes for enterprise releases.",
    thrustArea: "Operational Governance",
    measurementType: GoalMeasurementType.MIN,
    unit: "business days",
    startValue: "5",
    targetValue: "2",
    currentValue: "4",
    timelineTarget: null,
    weight: 15,
    priority: 4,
    status: GoalStatus.REJECTED,
    submittedAt: date("2026-04-07"),
    approvedAt: null,
    rejectedAt: date("2026-04-09"),
    lockedAt: null,
    update: {
      quarter: 2,
      summary:
        "Rejected in favor of a broader release readiness goal owned by the delivery office.",
      progressValue: "4",
      quarterlyStatus: QuarterlyStatus.DELAYED,
    },
  },
  {
    id: uuid(306),
    reviewCycleKey: "active",
    ownerKey: "employee3",
    createdByKey: "manager",
    shared: true,
    title: "Raise enterprise customer health score",
    description:
      "Improve strategic account health by tightening onboarding checkpoints and executive reviews.",
    thrustArea: "Customer Retention",
    measurementType: GoalMeasurementType.MAX,
    unit: "average health score",
    startValue: "71",
    targetValue: "84",
    currentValue: "80",
    timelineTarget: null,
    weight: 40,
    priority: 2,
    status: GoalStatus.APPROVED,
    submittedAt: date("2026-04-05"),
    approvedAt: date("2026-04-09"),
    rejectedAt: null,
    lockedAt: null,
    update: {
      quarter: 2,
      summary:
        "Eight of twelve strategic accounts have completed the new health review cadence.",
      progressValue: "80",
      quarterlyStatus: QuarterlyStatus.ON_TRACK,
    },
  },
  {
    id: uuid(307),
    reviewCycleKey: "active",
    ownerKey: "employee3",
    createdByKey: "manager",
    shared: false,
    title: "Resolve priority support escalations within SLA",
    description:
      "Lower average time to first resolution for P1 and P2 escalations from enterprise customers.",
    thrustArea: "Service Excellence",
    measurementType: GoalMeasurementType.MIN,
    unit: "hours average resolution",
    startValue: "18",
    targetValue: "8",
    currentValue: "9.5",
    timelineTarget: null,
    weight: 30,
    priority: 1,
    status: GoalStatus.APPROVED,
    submittedAt: date("2026-04-05"),
    approvedAt: date("2026-04-09"),
    rejectedAt: null,
    lockedAt: null,
    update: {
      quarter: 2,
      summary:
        "Response playbooks are live; the remaining gap is weekend escalation coverage.",
      progressValue: "9.5",
      quarterlyStatus: QuarterlyStatus.ON_TRACK,
    },
  },
  {
    id: uuid(308),
    reviewCycleKey: "active",
    ownerKey: "manager",
    createdByKey: "admin",
    shared: true,
    title: "Stabilize cross-functional delivery rhythm",
    description:
      "Complete Q2 operating cadence rollout for product, engineering, and customer success teams.",
    thrustArea: "Execution Discipline",
    measurementType: GoalMeasurementType.TIMELINE,
    unit: null,
    startValue: null,
    targetValue: null,
    currentValue: null,
    timelineTarget: date("2026-06-15"),
    weight: 30,
    priority: 2,
    status: GoalStatus.APPROVED,
    submittedAt: date("2026-04-04"),
    approvedAt: date("2026-04-08"),
    rejectedAt: null,
    lockedAt: null,
    update: {
      quarter: 2,
      summary:
        "Weekly delivery review is live; dependency escalation rules are drafted.",
      progressValue: null,
      quarterlyStatus: QuarterlyStatus.ON_TRACK,
    },
  },
  {
    id: uuid(309),
    reviewCycleKey: "historical",
    ownerKey: "employee1",
    createdByKey: "manager",
    shared: false,
    title: "Launch KPI baseline reporting pack",
    description:
      "Publish the baseline reporting pack used by Q2 executive and manager dashboards.",
    thrustArea: "Data Visibility",
    measurementType: GoalMeasurementType.MAX,
    unit: "published dashboards",
    startValue: "0",
    targetValue: "12",
    currentValue: "12",
    timelineTarget: null,
    weight: 40,
    priority: 2,
    status: GoalStatus.LOCKED,
    submittedAt: date("2026-01-08"),
    approvedAt: date("2026-01-10"),
    rejectedAt: null,
    lockedAt: date("2026-04-02"),
    update: {
      quarter: 1,
      summary:
        "Delivered all baseline dashboards and handed ownership to the delivery office.",
      progressValue: "12",
      quarterlyStatus: QuarterlyStatus.COMPLETED,
    },
  },
  {
    id: uuid(310),
    reviewCycleKey: "historical",
    ownerKey: "employee2",
    createdByKey: "manager",
    shared: false,
    title: "Complete RBAC foundation for portal APIs",
    description:
      "Implement role gates for admin, manager, and employee API surfaces.",
    thrustArea: "Security & Compliance",
    measurementType: GoalMeasurementType.TIMELINE,
    unit: null,
    startValue: null,
    targetValue: null,
    currentValue: null,
    timelineTarget: date("2026-03-20"),
    weight: 35,
    priority: 1,
    status: GoalStatus.LOCKED,
    submittedAt: date("2026-01-07"),
    approvedAt: date("2026-01-10"),
    rejectedAt: null,
    lockedAt: date("2026-04-02"),
    update: {
      quarter: 1,
      summary:
        "RBAC middleware, audit coverage, and manager-scoped access checks were completed.",
      progressValue: null,
      quarterlyStatus: QuarterlyStatus.COMPLETED,
    },
  },
  {
    id: uuid(311),
    reviewCycleKey: "historical",
    ownerKey: "employee3",
    createdByKey: "manager",
    shared: false,
    title: "Improve onboarding NPS for strategic accounts",
    description:
      "Raise onboarding satisfaction through a clearer launch checklist and executive check-ins.",
    thrustArea: "Customer Onboarding",
    measurementType: GoalMeasurementType.MAX,
    unit: "NPS",
    startValue: "38",
    targetValue: "50",
    currentValue: "54",
    timelineTarget: null,
    weight: 35,
    priority: 2,
    status: GoalStatus.LOCKED,
    submittedAt: date("2026-01-08"),
    approvedAt: date("2026-01-10"),
    rejectedAt: null,
    lockedAt: date("2026-04-02"),
    update: {
      quarter: 1,
      summary:
        "Exceeded target after launching the executive onboarding checklist.",
      progressValue: "54",
      quarterlyStatus: QuarterlyStatus.COMPLETED,
    },
  },
];

async function seedUsers(passwordHash: string) {
  console.log("Seeding demo users...");

  for (const user of users) {
    const name = `${user.firstName} ${user.lastName}`;

    const seededUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        employeeNumber: user.employeeNumber,
        name,
        emailVerified: date("2026-01-01"),
        passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        title: user.title,
        department: user.department,
        role: user.role,
        isActive: true,
        managerId: user.managerKey ? seededUserIds[user.managerKey] : null,
      },
      create: {
        id: user.id,
        employeeNumber: user.employeeNumber,
        name,
        email: user.email,
        emailVerified: date("2026-01-01"),
        passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        title: user.title,
        department: user.department,
        role: user.role,
        isActive: true,
        managerId: user.managerKey ? seededUserIds[user.managerKey] : null,
      },
    });

    seededUserIds[user.key] = seededUser.id;
  }

  console.log(`Seeded ${users.length} users.`);
}

async function seedReviewCycles() {
  console.log("Seeding review cycles...");

  for (const cycle of reviewCycles) {
    const seededCycle = await prisma.reviewCycle.upsert({
      where: {
        year_quarter: {
          year: cycle.year,
          quarter: cycle.quarter,
        },
      },
      update: {
        name: cycle.name,
        status: cycle.status,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        submissionDeadline: cycle.submissionDeadline,
        lockDate: cycle.lockDate,
        isActive: cycle.isActive,
        createdById: seededUserIds.admin,
      },
      create: {
        id: cycle.id,
        name: cycle.name,
        year: cycle.year,
        quarter: cycle.quarter,
        status: cycle.status,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        submissionDeadline: cycle.submissionDeadline,
        lockDate: cycle.lockDate,
        isActive: cycle.isActive,
        createdById: seededUserIds.admin,
      },
    });

    seededCycleIds[cycle.key] = seededCycle.id;
  }

  console.log(`Seeded ${reviewCycles.length} review cycles.`);
}

async function seedSharedGoalGroup() {
  console.log("Seeding shared goal group...");

  const memberConnections = [
    seededUserIds.employee1,
    seededUserIds.employee2,
    seededUserIds.employee3,
  ].map((id) => ({ id }));

  const seededSharedGoalGroup = await prisma.sharedGoalGroup.upsert({
    where: {
      reviewCycleId_name: {
        reviewCycleId: seededCycleIds.active,
        name: "Q2 Customer Reliability Initiative",
      },
    },
    update: {
      description:
        "Cross-functional goals that improve customer-facing reliability, delivery rhythm, and health score visibility.",
      createdById: seededUserIds.manager,
      members: {
        set: memberConnections,
      },
    },
    create: {
      id: sharedGoalGroupId,
      name: "Q2 Customer Reliability Initiative",
      description:
        "Cross-functional goals that improve customer-facing reliability, delivery rhythm, and health score visibility.",
      createdById: seededUserIds.manager,
      reviewCycleId: seededCycleIds.active,
      members: {
        connect: memberConnections,
      },
    },
  });

  seededSharedGoalGroupId = seededSharedGoalGroup.id;

  console.log("Seeded shared goal group with 3 employee members.");
}

async function seedGoals() {
  console.log("Seeding goals...");

  for (const goal of goals) {
    await prisma.goal.upsert({
      where: { id: goal.id },
      update: {
        reviewCycleId: seededCycleIds[goal.reviewCycleKey],
        ownerId: seededUserIds[goal.ownerKey],
        createdById: seededUserIds[goal.createdByKey],
        sharedGoalGroupId: goal.shared ? seededSharedGoalGroupId : null,
        title: goal.title,
        description: goal.description,
        thrustArea: goal.thrustArea,
        measurementType: goal.measurementType,
        unit: goal.unit,
        startValue: goal.startValue,
        targetValue: goal.targetValue,
        currentValue: goal.currentValue,
        timelineTarget: goal.timelineTarget,
        weight: goal.weight,
        priority: goal.priority,
        isPrimaryOwner: true,
        isArchived: false,
        status: goal.status,
        version: 1,
        submittedAt: goal.submittedAt,
        approvedAt: goal.approvedAt,
        rejectedAt: goal.rejectedAt,
        lockedAt: goal.lockedAt,
      },
      create: {
        id: goal.id,
        reviewCycleId: seededCycleIds[goal.reviewCycleKey],
        ownerId: seededUserIds[goal.ownerKey],
        createdById: seededUserIds[goal.createdByKey],
        sharedGoalGroupId: goal.shared ? seededSharedGoalGroupId : null,
        title: goal.title,
        description: goal.description,
        thrustArea: goal.thrustArea,
        measurementType: goal.measurementType,
        unit: goal.unit,
        startValue: goal.startValue,
        targetValue: goal.targetValue,
        currentValue: goal.currentValue,
        timelineTarget: goal.timelineTarget,
        weight: goal.weight,
        priority: goal.priority,
        isPrimaryOwner: true,
        isArchived: false,
        status: goal.status,
        version: 1,
        submittedAt: goal.submittedAt,
        approvedAt: goal.approvedAt,
        rejectedAt: goal.rejectedAt,
        lockedAt: goal.lockedAt,
      },
    });
  }

  console.log(`Seeded ${goals.length} goals.`);
}

async function seedGoalUpdates() {
  console.log("Seeding quarterly updates...");

  for (const goal of goals) {
    await prisma.goalUpdate.upsert({
      where: {
        goalId_quarter: {
          goalId: goal.id,
          quarter: goal.update.quarter,
        },
      },
      update: {
        createdById: seededUserIds[goal.ownerKey],
        summary: goal.update.summary,
        progressValue: goal.update.progressValue,
        quarterlyStatus: goal.update.quarterlyStatus,
      },
      create: {
        goalId: goal.id,
        quarter: goal.update.quarter,
        createdById: seededUserIds[goal.ownerKey],
        summary: goal.update.summary,
        progressValue: goal.update.progressValue,
        quarterlyStatus: goal.update.quarterlyStatus,
      },
    });
  }

  console.log(`Seeded ${goals.length} quarterly updates.`);
}

function getApprovalSeeds(): ApprovalSeed[] {
  return goals.flatMap((goal) => {
    const primaryApproverKey: UserKey =
      goal.ownerKey === "manager" ? "admin" : "manager";

    if (goal.status === GoalStatus.SUBMITTED) {
      return [
        {
          goal,
          approverKey: primaryApproverKey,
          stepOrder: 1,
          decision: ApprovalDecision.PENDING,
          comments: "Awaiting manager review.",
          decidedAt: null,
        },
      ];
    }

    if (goal.status === GoalStatus.REJECTED) {
      return [
        {
          goal,
          approverKey: primaryApproverKey,
          stepOrder: 1,
          decision: ApprovalDecision.REJECTED,
          comments:
            "Rejected to keep the cycle focused on higher-impact operating commitments.",
          decidedAt: goal.rejectedAt,
        },
      ];
    }

    if (goal.status !== GoalStatus.APPROVED && goal.status !== GoalStatus.LOCKED) {
      return [];
    }

    const approvals: ApprovalSeed[] = [
      {
        goal,
        approverKey: primaryApproverKey,
        stepOrder: 1,
        decision: ApprovalDecision.APPROVED,
        comments: "Approved for the quarter.",
        decidedAt: goal.approvedAt,
      },
    ];

    if (goal.priority === 1 && primaryApproverKey !== "admin") {
      approvals.push({
        goal,
        approverKey: "admin",
        stepOrder: 2,
        decision: ApprovalDecision.APPROVED,
        comments: "Executive approval recorded for critical priority goal.",
        decidedAt: goal.approvedAt ? new Date(goal.approvedAt.getTime() + 3600000) : null,
      });
    }

    return approvals;
  });
}

async function seedApprovals() {
  console.log("Seeding approval workflow records...");

  const approvals = getApprovalSeeds();

  for (const approval of approvals) {
    await prisma.goalApproval.upsert({
      where: {
        goalId_approverId_version_stepOrder: {
          goalId: approval.goal.id,
          approverId: seededUserIds[approval.approverKey],
          version: 1,
          stepOrder: approval.stepOrder,
        },
      },
      update: {
        decision: approval.decision,
        comments: approval.comments,
        decidedAt: approval.decidedAt,
      },
      create: {
        goalId: approval.goal.id,
        approverId: seededUserIds[approval.approverKey],
        version: 1,
        stepOrder: approval.stepOrder,
        decision: approval.decision,
        comments: approval.comments,
        decidedAt: approval.decidedAt,
      },
    });
  }

  console.log(`Seeded ${approvals.length} approval records.`);
}

async function upsertAuditLog(input: {
  id: string;
  actorId: string;
  goalId?: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata: Prisma.InputJsonValue;
  createdAt: Date;
}) {
  await prisma.auditLog.upsert({
    where: { id: input.id },
    update: {
      actorId: input.actorId,
      goalId: input.goalId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      metadata: input.metadata,
      ipAddress: SEED_IP_ADDRESS,
      userAgent: SEED_USER_AGENT,
    },
    create: {
      id: input.id,
      actorId: input.actorId,
      goalId: input.goalId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      metadata: input.metadata,
      ipAddress: SEED_IP_ADDRESS,
      userAgent: SEED_USER_AGENT,
      createdAt: input.createdAt,
    },
  });
}

async function seedAuditLogs() {
  console.log("Seeding audit logs...");

  let auditSequence = 1;
  const nextAuditId = () => uuid(900 + auditSequence++);

  for (const cycle of reviewCycles) {
    await upsertAuditLog({
      id: nextAuditId(),
      actorId: seededUserIds.admin,
      entityType: "ReviewCycle",
      entityId: cycle.id,
      action: "REVIEW_CYCLE_SEEDED",
      metadata: {
        name: cycle.name,
        year: cycle.year,
        quarter: cycle.quarter,
        status: cycle.status,
      },
      createdAt: cycle.startDate,
    });
  }

  for (const goal of goals) {
    await upsertAuditLog({
      id: nextAuditId(),
      actorId: seededUserIds[goal.createdByKey],
      goalId: goal.id,
      entityType: "Goal",
      entityId: goal.id,
      action: "GOAL_SEEDED",
      metadata: {
        title: goal.title,
        owner: goal.ownerKey,
        status: goal.status,
        thrustArea: goal.thrustArea,
        weight: goal.weight,
        priority: goal.priority,
      },
      createdAt: goal.submittedAt ?? date("2026-01-01"),
    });

    await upsertAuditLog({
      id: nextAuditId(),
      actorId: seededUserIds[goal.ownerKey],
      goalId: goal.id,
      entityType: "GoalUpdate",
      entityId: `${goal.id}:Q${goal.update.quarter}`,
      action: "GOAL_UPDATE_SEEDED",
      metadata: {
        quarter: goal.update.quarter,
        status: goal.update.quarterlyStatus,
        progressValue: goal.update.progressValue,
      },
      createdAt: goal.update.quarter === 2 ? date("2026-05-16") : date("2026-03-31"),
    });
  }

  for (const approval of getApprovalSeeds()) {
    await upsertAuditLog({
      id: nextAuditId(),
      actorId: seededUserIds[approval.approverKey],
      goalId: approval.goal.id,
      entityType: "GoalApproval",
      entityId: `${approval.goal.id}:${approval.stepOrder}`,
      action: `GOAL_${approval.decision}`,
      metadata: {
        version: 1,
        stepOrder: approval.stepOrder,
        approver: approval.approverKey,
        decision: approval.decision,
      },
      createdAt: approval.decidedAt ?? approval.goal.submittedAt ?? date("2026-01-01"),
    });
  }

  console.log(`Seeded ${auditSequence - 1} audit logs.`);
}

async function main() {
  console.log("Starting AtomQuest demo seed...");

  const passwordHash = await hash(DEMO_PASSWORD, 12);

  console.log("Connected to database successfully.");
  
  await seedUsers(passwordHash);
  await seedReviewCycles();
  await seedSharedGoalGroup();
  await seedGoals();
  await seedGoalUpdates();
  await seedApprovals();
  await seedAuditLogs();

  console.log("Demo seed completed successfully.");
  console.log("Demo password for all seeded users: Password@123");
}

main()
  .catch((error) => {
    console.error("Demo seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
