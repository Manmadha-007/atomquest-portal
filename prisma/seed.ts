import "dotenv/config";

import {
  ApprovalDecision,
  EscalationLevel,
  EscalationType,
  GoalMeasurementType,
  GoalStatus,
  Prisma,
  QuarterlyStatus,
  UserRole,
} from "@prisma/client";
import { hash } from "bcryptjs";

import { prisma } from "../src/lib/prisma";
import { users, cycles, allGoals, uuid, dt, GoalDef, CycleKey } from "./seed-data";
import { updateTemplates, blockerTemplates, notesTemplates } from "./seed-data/update-templates";

const DEMO_PASSWORD = "Password@123";
const SEED_UA = "atomquest-prisma-seed";
const SEED_IP = "127.0.0.1";

// ── Deterministic pseudo-random for reproducible variety ──
let _seed = 42;
function rng() {
  _seed = (_seed * 16807 + 0) % 2147483647;
  return (_seed & 0x7fffffff) / 0x7fffffff;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Resolve IDs ──
const userIdMap = new Map<number, string>();
const cycleIdMap = new Map<CycleKey, string>();

function userId(idx: number): string {
  return userIdMap.get(idx) ?? uuid(idx);
}
function cycleId(key: CycleKey): string {
  return cycleIdMap.get(key) ?? uuid(key === "q4_25" ? 101 : key === "q1_26" ? 102 : 103);
}

// Map user idx to department
function userDept(idx: number): string {
  const u = users.find((u) => u.idx === idx);
  return u?.dept ?? "Product Engineering";
}

// Map cycle key to quarter number
function cycleQuarter(key: CycleKey): number {
  return key === "q4_25" ? 4 : key === "q1_26" ? 1 : 2;
}

// ── Seed Users ──
async function seedUsers(pwHash: string) {
  console.log("Seeding users...");
  for (const u of users) {
    const name = `${u.first} ${u.last}`;
    const managerId = u.mgrIdx != null ? userId(u.mgrIdx) : null;
    const res = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        employeeNumber: u.empNo, name, emailVerified: dt("2026-01-01"),
        passwordHash: pwHash, firstName: u.first, lastName: u.last,
        title: u.title, department: u.dept, role: u.role,
        isActive: u.active !== false, managerId,
      },
      create: {
        id: uuid(u.idx), employeeNumber: u.empNo, name, email: u.email,
        emailVerified: dt("2026-01-01"), passwordHash: pwHash,
        firstName: u.first, lastName: u.last, title: u.title,
        department: u.dept, role: u.role, isActive: u.active !== false, managerId,
      },
    });
    userIdMap.set(u.idx, res.id);
  }
  console.log(`  ✓ ${users.length} users`);
}

// ── Seed Review Cycles ──
async function seedCycles() {
  console.log("Seeding review cycles...");
  for (const c of cycles) {
    const res = await prisma.reviewCycle.upsert({
      where: { year_quarter: { year: c.year, quarter: c.quarter } },
      update: {
        name: c.name, status: c.status, startDate: dt(c.start), endDate: dt(c.end),
        submissionDeadline: dt(c.subDeadline), lockDate: dt(c.lockDate),
        isActive: c.active, createdById: userId(1),
      },
      create: {
        id: uuid(c.idx), name: c.name, year: c.year, quarter: c.quarter,
        status: c.status, startDate: dt(c.start), endDate: dt(c.end),
        submissionDeadline: dt(c.subDeadline), lockDate: dt(c.lockDate),
        isActive: c.active, createdById: userId(1),
      },
    });
    cycleIdMap.set(c.key, res.id);
  }
  console.log(`  ✓ ${cycles.length} review cycles`);
}

// --- Seed Escalation Governance Rules ---
const escalationRuleSeeds: {
  id: string;
  type: EscalationType;
  name: string;
  description: string;
  thresholdDays: number;
  escalationLevel: EscalationLevel;
  targetRole: UserRole;
}[] = [
  {
    id: uuid(3001),
    type: EscalationType.GOAL_NOT_SUBMITTED,
    name: "Goal submission overdue after 3 days",
    description: "Flags employees who have not submitted required quarterly goals within three days of the submission window.",
    thresholdDays: 3,
    escalationLevel: EscalationLevel.LEVEL_1,
    targetRole: UserRole.EMPLOYEE,
  },
  {
    id: uuid(3002),
    type: EscalationType.APPROVAL_PENDING_TOO_LONG,
    name: "Approval pending after 2 days",
    description: "Flags manager approval queues when submitted goals remain pending beyond two business days.",
    thresholdDays: 2,
    escalationLevel: EscalationLevel.LEVEL_1,
    targetRole: UserRole.MANAGER,
  },
  {
    id: uuid(3003),
    type: EscalationType.CHECKIN_MISSED,
    name: "Check-in overdue after 5 days",
    description: "Flags missed employee progress check-ins after five days without a recorded quarterly update.",
    thresholdDays: 5,
    escalationLevel: EscalationLevel.LEVEL_1,
    targetRole: UserRole.EMPLOYEE,
  },
];

async function seedEscalationRules() {
  console.log("Seeding escalation governance rules...");

  for (const rule of escalationRuleSeeds) {
    await prisma.escalationRule.upsert({
      where: { id: rule.id },
      update: {
        type: rule.type,
        name: rule.name,
        description: rule.description,
        thresholdDays: rule.thresholdDays,
        escalationLevel: rule.escalationLevel,
        targetRole: rule.targetRole,
        reviewCycleId: null,
        departmentScope: null,
        isActive: true,
      },
      create: {
        id: rule.id,
        type: rule.type,
        name: rule.name,
        description: rule.description,
        thresholdDays: rule.thresholdDays,
        escalationLevel: rule.escalationLevel,
        targetRole: rule.targetRole,
        reviewCycleId: null,
        departmentScope: null,
        isActive: true,
      },
    });
  }

  console.log(`  - ${escalationRuleSeeds.length} escalation governance rules`);
}

// --- Seed Shared Goal Groups ---
const sharedGroupDefs: { key: string; idx: number; desc: string; creatorIdx: number }[] = [
  { key: "Q2 Cross-Functional Reliability Initiative", idx: 201, desc: "Cross-functional goals improving customer-facing reliability, delivery rhythm, and health score visibility.", creatorIdx: 3 },
  { key: "Platform Reliability Program", idx: 202, desc: "Strategic initiative to achieve 99.99% platform availability through infrastructure hardening, API reliability, and incident elimination.", creatorIdx: 1 },
  { key: "SOC2 Readiness", idx: 203, desc: "Cross-functional compliance program to close all SOC2 evidence gaps, remediate vulnerabilities, and establish continuous monitoring before Q3 external audit.", creatorIdx: 2 },
  { key: "AI Rollout Program", idx: 204, desc: "Coordinated AI product expansion across model evaluation, knowledge graph, and serving infrastructure to reach production readiness.", creatorIdx: 1 },
  { key: "Customer Retention Initiative", idx: 205, desc: "Joint CS and RevOps program to reduce net churn through improved onboarding, proactive renewals, and NPS improvement.", creatorIdx: 2 },
  { key: "Revenue Expansion Initiative", idx: 206, desc: "Revenue acceleration program targeting pipeline optimization, forecast accuracy, and deal velocity improvements across enterprise segments.", creatorIdx: 2 },
];

const sharedGroupIdMap = new Map<string, string>();

async function seedSharedGoalGroups() {
  console.log("Seeding shared goal groups...");

  for (const sg of sharedGroupDefs) {
    // Collect unique member indices from goals tagged with this group
    const memberIdxs = new Set<number>();
    for (const g of allGoals) {
      if (g.shared && sg.key === "Q2 Cross-Functional Reliability Initiative") memberIdxs.add(g.ownerIdx);
      if (g.sharedGroup === sg.key) memberIdxs.add(g.ownerIdx);
    }
    const memberConnections = [...memberIdxs].map((idx) => ({ id: userId(idx) }));

    const res = await prisma.sharedGoalGroup.upsert({
      where: {
        reviewCycleId_name: {
          reviewCycleId: cycleId("q2_26"),
          name: sg.key,
        },
      },
      update: {
        description: sg.desc,
        createdById: userId(sg.creatorIdx),
        members: { set: memberConnections },
      },
      create: {
        id: uuid(sg.idx),
        name: sg.key,
        description: sg.desc,
        createdById: userId(sg.creatorIdx),
        reviewCycleId: cycleId("q2_26"),
        members: { connect: memberConnections },
      },
    });
    sharedGroupIdMap.set(sg.key, res.id);
  }
  console.log(`  ✓ ${sharedGroupDefs.length} shared goal groups`);
}

function resolveSharedGroupId(g: GoalDef): string | null {
  if (g.sharedGroup) return sharedGroupIdMap.get(g.sharedGroup) ?? null;
  if (g.shared) return sharedGroupIdMap.get("Q2 Cross-Functional Reliability Initiative") ?? null;
  return null;
}

// ── Seed Goals ──
async function seedGoals() {
  console.log("Seeding goals...");
  for (const g of allGoals) {
    const goalId = uuid(g.idx);
    await prisma.goal.upsert({
      where: { id: goalId },
      update: {
        reviewCycleId: cycleId(g.cycle), ownerId: userId(g.ownerIdx),
        createdById: userId(g.creatorIdx),
        parentGoalId: null, // cleared in pass 1, set in pass 2
        sharedGoalGroupId: resolveSharedGroupId(g),
        title: g.title, description: g.desc, thrustArea: g.thrust,
        measurementType: g.meas, unit: g.unit ?? null,
        startValue: g.start ?? null, targetValue: g.target ?? null,
        currentValue: g.current ?? null,
        timelineTarget: g.timeline ? dt(g.timeline) : null,
        weight: g.weight, priority: g.pri,
        isPrimaryOwner: true, isArchived: false,
        status: g.status, version: 1,
        submittedAt: g.subAt ? dt(g.subAt) : null,
        approvedAt: g.appAt ? dt(g.appAt) : null,
        rejectedAt: g.rejAt ? dt(g.rejAt) : null,
        lockedAt: g.lockAt ? dt(g.lockAt) : null,
      },
      create: {
        id: goalId, reviewCycleId: cycleId(g.cycle), ownerId: userId(g.ownerIdx),
        createdById: userId(g.creatorIdx),
        sharedGoalGroupId: resolveSharedGroupId(g),
        title: g.title, description: g.desc, thrustArea: g.thrust,
        measurementType: g.meas, unit: g.unit ?? null,
        startValue: g.start ?? null, targetValue: g.target ?? null,
        currentValue: g.current ?? null,
        timelineTarget: g.timeline ? dt(g.timeline) : null,
        weight: g.weight, priority: g.pri,
        isPrimaryOwner: true, isArchived: false,
        status: g.status, version: 1,
        submittedAt: g.subAt ? dt(g.subAt) : null,
        approvedAt: g.appAt ? dt(g.appAt) : null,
        rejectedAt: g.rejAt ? dt(g.rejAt) : null,
        lockedAt: g.lockAt ? dt(g.lockAt) : null,
      },
    });
  }

  console.log("Linking goal hierarchies...");

  for (const g of allGoals.filter((goal) => goal.parentIdx)) {
    if (g.parentIdx === g.idx) {
      throw new Error(`Goal ${g.idx} cannot parent itself`);
    }

    await prisma.goal.update({
      where: {
        id: uuid(g.idx),
      },
      data: {
        parentGoalId: uuid(g.parentIdx!),
      },
    });
  }

  console.log(`  ✓ ${allGoals.filter((g) => g.parentIdx).length} hierarchy links`);

  console.log(`  ✓ ${allGoals.length} goals`);
}

// ── Determine progress category ──
function progressCategory(g: GoalDef): number {
  // 0=strong, 1=moderate, 2=stalled, 3=overdue
  if (g.status === GoalStatus.DRAFT) return 2;
  if (g.status === GoalStatus.REJECTED) return 3;

  if (g.meas === GoalMeasurementType.TIMELINE) {
    if (!g.timeline) return 1;
    const target = new Date(g.timeline + "T09:00:00.000Z").getTime();
    const now = new Date("2026-05-17T09:00:00.000Z").getTime();
    if (target < now && g.status !== GoalStatus.LOCKED) return 3;
    return target - now < 30 * 86400000 ? 1 : 0;
  }

  if (!g.start || !g.target || !g.current) return 1;
  const s = parseFloat(g.start), t = parseFloat(g.target), c = parseFloat(g.current);
  const range = Math.abs(t - s);
  if (range === 0) return c === t ? 0 : 3;
  const progress = Math.abs(c - s) / range;
  if (progress >= 0.8) return 0;
  if (progress >= 0.5) return 1;
  if (progress >= 0.2) return 2;
  return 3;
}

// ── Generate Quarterly Updates ──
async function seedUpdates() {
  console.log("Seeding quarterly updates...");
  let count = 0;

  for (const g of allGoals) {
    const goalId = uuid(g.idx);
    const dept = userDept(g.ownerIdx);
    const templates = updateTemplates[dept] ?? updateTemplates["Product Engineering"];
    const cat = progressCategory(g);
    const quarter = cycleQuarter(g.cycle);

    // Historical goals get updates for their quarter
    const quarters = g.cycle === "q2_26" ? [2] : g.cycle === "q1_26" ? [1] : [4];
    // Some Q2 goals also get a Q1 historical update for trend data
    if (g.cycle === "q2_26" && rng() > 0.55) quarters.unshift(1);

    for (const q of quarters) {
      const isCurrentQ = q === quarter;
      const catIdx = isCurrentQ ? cat : Math.min(cat, 1); // historical updates are generally better
      const summary = templates[catIdx][Math.floor(rng() * templates[catIdx].length)];

      let progressValue: string | null = null;
      if (g.current && isCurrentQ) {
        progressValue = g.current;
      } else if (g.current && !isCurrentQ) {
        // Simulate earlier progress
        const c = parseFloat(g.current);
        const s = parseFloat(g.start ?? "0");
        progressValue = String(Math.round((s + (c - s) * (0.3 + rng() * 0.3)) * 100) / 100);
      }

      let qStatus: QuarterlyStatus;
      if (g.status === GoalStatus.LOCKED) qStatus = QuarterlyStatus.COMPLETED;
      else if (catIdx === 0) qStatus = rng() > 0.3 ? QuarterlyStatus.ON_TRACK : QuarterlyStatus.COMPLETED;
      else if (catIdx === 1) qStatus = QuarterlyStatus.ON_TRACK;
      else if (catIdx === 2) qStatus = rng() > 0.5 ? QuarterlyStatus.NOT_STARTED : QuarterlyStatus.DELAYED;
      else qStatus = QuarterlyStatus.DELAYED;

      const createdAt = q === 4 ? dt("2025-12-15") : q === 1 ? dt("2026-03-15") : dt(`2026-05-${String(1 + Math.floor(rng() * 16)).padStart(2, "0")}`);

      try {
        await prisma.goalUpdate.upsert({
          where: { goalId_quarter: { goalId, quarter: q } },
          update: {
            createdById: userId(g.ownerIdx),
            summary,
            progressValue,
            quarterlyStatus: qStatus,
          },
          create: {
            goalId, quarter: q,
            createdById: userId(g.ownerIdx),
            summary,
            progressValue,
            quarterlyStatus: qStatus,
            createdAt,
          },
        });
        count++;
      } catch {
        // Skip duplicates
      }
    }
  }
  console.log(`  ✓ ${count} quarterly updates`);
}

// ── Generate Approvals ──
async function seedApprovals() {
  console.log("Seeding approvals...");
  let count = 0;

  const approvalComments = {
    approved: [
      "Approved. Well-aligned with quarterly strategic priorities.",
      "Approved for the quarter. Good target calibration against department OKRs.",
      "Approved — clear measurement criteria and achievable stretch target.",
      "Approved. Execution plan is credible and well-resourced. Let's track weekly.",
      "Approved. Strong alignment with department OKRs. Flagging as priority for resource allocation.",
      "Approved after discussion in goal calibration session. Weight adjusted per team feedback.",
      "Approved. This directly supports the strategic initiative. Executive visibility confirmed.",
      "Approved with the understanding that cross-team dependencies are tracked in the coordination board.",
    ],
    rejected: [
      "Rejected — please consolidate with the broader initiative goal owned by the delivery office.",
      "Rejected. Scope is too narrow for a standalone quarterly goal. Consider merging with related objectives.",
      "Rejected to keep the cycle focused on higher-impact operating commitments.",
      "Rejected — measurement criteria need refinement. Please resubmit with clearer success metrics.",
      "Rejected. This objective overlaps with an existing approved goal. Please coordinate with the goal owner.",
      "Rejected. The KPI is not measurable as defined. Please define specific, quantifiable success criteria.",
      "Rejected — this goal is too vague to be actionable. Break it down into specific deliverables with clear owners.",
      "Rejected. Unrealistic target given current resource constraints. Please recalibrate and resubmit.",
      "Rejected. Scope is too broad — this reads like a mission statement, not a quarterly objective.",
    ],
    pending: [
      "Awaiting manager review.",
      "Under review — requesting additional context on measurement approach.",
      "Pending review. Will discuss in next 1:1.",
      "Review scheduled for weekly goal calibration session.",
      "In review queue. Manager has 12 pending approvals this cycle.",
      "Pending — need to validate resource availability with team lead before approving.",
      "Reviewing. Want to align this with the strategic initiative goals before signing off.",
    ],
  };

  for (const g of allGoals) {
    const goalId = uuid(g.idx);
    // Determine primary approver (manager approves employee goals, admin approves manager goals)
    const ownerUser = users.find((u) => u.idx === g.ownerIdx);
    const approverIdx = ownerUser?.role === UserRole.MANAGER ? 1 : (ownerUser?.mgrIdx ?? 3);

    if (g.status === GoalStatus.DRAFT) continue; // No approval for drafts

    if (g.status === GoalStatus.SUBMITTED) {
      await prisma.goalApproval.upsert({
        where: {
          goalId_approverId_version_stepOrder: {
            goalId, approverId: userId(approverIdx), version: 1, stepOrder: 1,
          },
        },
        update: { decision: ApprovalDecision.PENDING, comments: pick(approvalComments.pending), decidedAt: null },
        create: {
          goalId, approverId: userId(approverIdx), version: 1, stepOrder: 1,
          decision: ApprovalDecision.PENDING, comments: pick(approvalComments.pending), decidedAt: null,
        },
      });
      count++;
      continue;
    }

    if (g.status === GoalStatus.REJECTED) {
      await prisma.goalApproval.upsert({
        where: {
          goalId_approverId_version_stepOrder: {
            goalId, approverId: userId(approverIdx), version: 1, stepOrder: 1,
          },
        },
        update: { decision: ApprovalDecision.REJECTED, comments: pick(approvalComments.rejected), decidedAt: g.rejAt ? dt(g.rejAt) : null },
        create: {
          goalId, approverId: userId(approverIdx), version: 1, stepOrder: 1,
          decision: ApprovalDecision.REJECTED, comments: pick(approvalComments.rejected), decidedAt: g.rejAt ? dt(g.rejAt) : null,
        },
      });
      count++;
      continue;
    }

    // APPROVED or LOCKED
    await prisma.goalApproval.upsert({
      where: {
        goalId_approverId_version_stepOrder: {
          goalId, approverId: userId(approverIdx), version: 1, stepOrder: 1,
        },
      },
      update: { decision: ApprovalDecision.APPROVED, comments: pick(approvalComments.approved), decidedAt: g.appAt ? dt(g.appAt) : null },
      create: {
        goalId, approverId: userId(approverIdx), version: 1, stepOrder: 1,
        decision: ApprovalDecision.APPROVED, comments: pick(approvalComments.approved), decidedAt: g.appAt ? dt(g.appAt) : null,
      },
    });
    count++;

    // High-priority goals get executive (admin) second approval
    if (g.pri === 1 && approverIdx !== 1 && approverIdx !== 2) {
      const execIdx = rng() > 0.5 ? 1 : 2;
      const decidedAt = g.appAt ? new Date(dt(g.appAt).getTime() + 3600000) : null;
      try {
        await prisma.goalApproval.upsert({
          where: {
            goalId_approverId_version_stepOrder: {
              goalId, approverId: userId(execIdx), version: 1, stepOrder: 2,
            },
          },
          update: { decision: ApprovalDecision.APPROVED, comments: "Executive approval recorded for critical priority goal.", decidedAt },
          create: {
            goalId, approverId: userId(execIdx), version: 1, stepOrder: 2,
            decision: ApprovalDecision.APPROVED, comments: "Executive approval recorded for critical priority goal.", decidedAt,
          },
        });
        count++;
      } catch {
        // Skip if constraint violation
      }
    }
  }
  console.log(`  ✓ ${count} approvals`);
}

// ── Generate Audit Logs ──
async function seedAuditLogs() {
  console.log("Seeding audit logs...");
  let seq = 1;
  const nextId = () => uuid(2000 + seq++);

  async function log(input: {
    actorIdx: number; goalIdx?: number; entityType: string;
    entityId: string; action: string; metadata: Prisma.InputJsonValue; createdAt: Date;
  }) {
    const id = nextId();
    await prisma.auditLog.upsert({
      where: { id },
      update: {
        actorId: userId(input.actorIdx), goalId: input.goalIdx ? uuid(input.goalIdx) : null,
        entityType: input.entityType, entityId: input.entityId,
        action: input.action, metadata: input.metadata,
        ipAddress: SEED_IP, userAgent: SEED_UA,
      },
      create: {
        id, actorId: userId(input.actorIdx), goalId: input.goalIdx ? uuid(input.goalIdx) : null,
        entityType: input.entityType, entityId: input.entityId,
        action: input.action, metadata: input.metadata,
        ipAddress: SEED_IP, userAgent: SEED_UA, createdAt: input.createdAt,
      },
    });
  }

  // Review cycle events
  for (const c of cycles) {
    await log({
      actorIdx: 1, entityType: "ReviewCycle", entityId: uuid(c.idx),
      action: "REVIEW_CYCLE_CREATED",
      metadata: { name: c.name, year: c.year, quarter: c.quarter },
      createdAt: dt(c.start),
    });
    if (c.active) {
      await log({
        actorIdx: 1, entityType: "ReviewCycle", entityId: uuid(c.idx),
        action: "REVIEW_CYCLE_ACTIVATED",
        metadata: { name: c.name },
        createdAt: new Date(dt(c.start).getTime() + 86400000),
      });
    } else {
      await log({
        actorIdx: 1, entityType: "ReviewCycle", entityId: uuid(c.idx),
        action: "REVIEW_CYCLE_CLOSED",
        metadata: { name: c.name, status: "COMPLETED" },
        createdAt: dt(c.lockDate),
      });
    }
  }

  // Goal lifecycle events
  for (const g of allGoals) {
    const goalId = uuid(g.idx);
    const baseDate = g.subAt ? dt(g.subAt) : dt(g.cycle === "q4_25" ? "2025-10-05" : g.cycle === "q1_26" ? "2026-01-05" : "2026-04-05");

    // Goal created
    await log({
      actorIdx: g.creatorIdx, goalIdx: g.idx, entityType: "Goal", entityId: goalId,
      action: "GOAL_CREATED",
      metadata: { title: g.title, status: "DRAFT", thrust: g.thrust, priority: g.pri },
      createdAt: new Date(baseDate.getTime() - 86400000 * 2),
    });

    if (g.status === GoalStatus.DRAFT) continue;

    // Goal submitted
    await log({
      actorIdx: g.ownerIdx, goalIdx: g.idx, entityType: "Goal", entityId: goalId,
      action: "GOAL_SUBMITTED",
      metadata: { title: g.title, status: "SUBMITTED" },
      createdAt: baseDate,
    });

    // Goal approved / rejected
    if (g.status === GoalStatus.APPROVED || g.status === GoalStatus.LOCKED) {
      const ownerUser = users.find((u) => u.idx === g.ownerIdx);
      const approverIdx = ownerUser?.role === UserRole.MANAGER ? 1 : (ownerUser?.mgrIdx ?? 3);
      await log({
        actorIdx: approverIdx, goalIdx: g.idx, entityType: "Goal", entityId: goalId,
        action: "GOAL_APPROVED",
        metadata: { title: g.title, approver: users.find((u) => u.idx === approverIdx)?.email },
        createdAt: g.appAt ? dt(g.appAt) : new Date(baseDate.getTime() + 86400000 * 3),
      });
    }

    if (g.status === GoalStatus.REJECTED) {
      const ownerUser = users.find((u) => u.idx === g.ownerIdx);
      const approverIdx = ownerUser?.role === UserRole.MANAGER ? 1 : (ownerUser?.mgrIdx ?? 3);
      await log({
        actorIdx: approverIdx, goalIdx: g.idx, entityType: "Goal", entityId: goalId,
        action: "GOAL_REJECTED",
        metadata: { title: g.title, reason: "Scope overlap or insufficient priority" },
        createdAt: g.rejAt ? dt(g.rejAt) : new Date(baseDate.getTime() + 86400000 * 3),
      });
    }

    if (g.status === GoalStatus.LOCKED) {
      await log({
        actorIdx: 1, goalIdx: g.idx, entityType: "Goal", entityId: goalId,
        action: "GOAL_LOCKED",
        metadata: { title: g.title, lockedBy: "system" },
        createdAt: g.lockAt ? dt(g.lockAt) : dt("2026-04-05"),
      });
    }

    // Quarterly update submitted audit events
    const quarter = cycleQuarter(g.cycle);
    await log({
      actorIdx: g.ownerIdx, goalIdx: g.idx, entityType: "GoalUpdate", entityId: `${goalId}:Q${quarter}`,
      action: "QUARTERLY_UPDATE_SUBMITTED",
      metadata: { quarter, goalTitle: g.title },
      createdAt: quarter === 4 ? dt("2025-12-15") : quarter === 1 ? dt("2026-03-15") : dt("2026-05-10"),
    });

    // Shared goal propagation events
    if (g.shared || g.sharedGroup) {
      const groupId = g.sharedGroup
        ? (sharedGroupIdMap.get(g.sharedGroup) ?? uuid(201))
        : (sharedGroupIdMap.get("Q2 Cross-Functional Reliability Initiative") ?? uuid(201));
      await log({
        actorIdx: g.creatorIdx, goalIdx: g.idx, entityType: "SharedGoalGroup", entityId: groupId,
        action: "SHARED_GOAL_PROPAGATED",
        metadata: { goalTitle: g.title, owner: users.find((u) => u.idx === g.ownerIdx)?.email, group: g.sharedGroup ?? "Q2 Cross-Functional Reliability Initiative" },
        createdAt: new Date(baseDate.getTime() - 86400000),
      });
    }
  }

  // Additional governance audit events (review completions, user logins, etc.)
  const govEvents = [
    { actorIdx: 1, action: "ADMIN_DASHBOARD_ACCESSED", entityType: "System", ts: "2026-05-16" },
    { actorIdx: 2, action: "GOVERNANCE_REVIEW_COMPLETED", entityType: "ReviewCycle", ts: "2026-05-15" },
    { actorIdx: 1, action: "BULK_GOAL_EXPORT", entityType: "System", ts: "2026-05-14" },
    { actorIdx: 2, action: "COMPLIANCE_REPORT_GENERATED", entityType: "System", ts: "2026-05-13" },
    { actorIdx: 1, action: "USER_ROLE_UPDATED", entityType: "User", ts: "2026-04-20" },
    { actorIdx: 2, action: "REVIEW_CYCLE_CONFIGURATION_UPDATED", entityType: "ReviewCycle", ts: "2026-04-15" },
    { actorIdx: 1, action: "DEPARTMENT_ANALYTICS_EXPORTED", entityType: "System", ts: "2026-05-12" },
    { actorIdx: 2, action: "AUDIT_LOG_EXPORTED", entityType: "System", ts: "2026-05-11" },
  ];

  for (const e of govEvents) {
    await log({
      actorIdx: e.actorIdx, entityType: e.entityType,
      entityId: e.entityType === "ReviewCycle" ? uuid(103) : uuid(e.actorIdx),
      action: e.action,
      metadata: { source: "admin_console", automated: false },
      createdAt: dt(e.ts),
    });
  }

  // Manager review events — temporal spikes around sprint boundaries
  for (const mgrIdx of [3, 4, 5, 6, 7, 8]) {
    for (const d of ["2026-04-14", "2026-04-20", "2026-04-28", "2026-05-05", "2026-05-12", "2026-05-16"]) {
      await log({
        actorIdx: mgrIdx, entityType: "ReviewSession", entityId: uuid(mgrIdx),
        action: "MANAGER_REVIEW_COMPLETED",
        metadata: { reviewDate: d, department: userDept(mgrIdx) },
        createdAt: dt(d),
      });
    }
  }

  // Temporal realism: quarter-end approval spike
  const approvalSpikeEvents = [
    { actorIdx: 3, action: "BULK_APPROVAL_REVIEW", ts: "2026-04-28" },
    { actorIdx: 4, action: "BULK_APPROVAL_REVIEW", ts: "2026-04-29" },
    { actorIdx: 6, action: "BULK_APPROVAL_REVIEW", ts: "2026-04-30" },
    { actorIdx: 7, action: "BULK_APPROVAL_REVIEW", ts: "2026-04-28" },
    { actorIdx: 1, action: "EXECUTIVE_GOAL_REVIEW", ts: "2026-04-30" },
    { actorIdx: 2, action: "EXECUTIVE_GOAL_REVIEW", ts: "2026-04-30" },
  ];
  for (const e of approvalSpikeEvents) {
    await log({
      actorIdx: e.actorIdx, entityType: "ReviewSession", entityId: uuid(e.actorIdx),
      action: e.action,
      metadata: { source: "quarter_end_review", department: userDept(e.actorIdx) },
      createdAt: dt(e.ts),
    });
  }

  // Employee dashboard access bursts (last 7 days)
  for (const empIdx of [9, 14, 19, 24, 29, 34, 10, 20, 30]) {
    for (const d of ["2026-05-13", "2026-05-14", "2026-05-15", "2026-05-16"]) {
      await log({
        actorIdx: empIdx, entityType: "System", entityId: uuid(empIdx),
        action: "DASHBOARD_ACCESSED",
        metadata: { source: "employee_workspace" },
        createdAt: dt(d),
      });
    }
  }

  // Last-minute quarterly update submissions (temporal spike)
  for (const empIdx of [11, 16, 21, 28, 31, 38]) {
    await log({
      actorIdx: empIdx, entityType: "GoalUpdate", entityId: uuid(empIdx),
      action: "LAST_MINUTE_UPDATE_SUBMITTED",
      metadata: { context: "Submitted just before quarterly deadline", department: userDept(empIdx) },
      createdAt: dt("2026-05-16"),
    });
  }

  console.log(`  ✓ ${seq - 1} audit logs`);
}

// ── Main ──
async function main() {
  console.log("═══ AtomQuest Enterprise Demo Seed ═══\n");
  const pwHash = await hash(DEMO_PASSWORD, 12);
  console.log("Connected to database.\n");

  await seedUsers(pwHash);
  await seedCycles();
  await seedEscalationRules();
  await seedSharedGoalGroups();
  await seedGoals();
  await seedUpdates();
  await seedApprovals();
  await seedAuditLogs();

  console.log("\n═══ Seed complete ═══");
  console.log("Demo password: Password@123");
  console.log("Admin: atomquest.admin.demo@gmail.com");
  console.log("Manager: atomquest.manager.demo@gmail.com");
  console.log("Employee: atomquest.employee.demo@gmail.com");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
