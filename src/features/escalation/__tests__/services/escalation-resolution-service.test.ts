import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  EscalationStatus,
  EscalationTriggerSource,
} from "@prisma/client";

import {
  dismissEscalationWithClient,
  EscalationResolutionError,
  resolveEscalationWithClient,
} from "@/features/escalation/services/escalation-resolution-service";
import { runEscalationCycleWithClient } from "@/features/escalation/services/escalation-cycle-service";
import {
  BASE_NOW,
  daysAfter,
  escalationLog,
} from "@/features/escalation/__tests__/fixtures/escalation-fixtures";
import { createEscalationTestDb } from "@/features/escalation/__tests__/helpers/in-memory-escalation-db";

async function assertResolutionError(
  operation: () => Promise<unknown>,
  code: EscalationResolutionError["code"],
) {
  await assert.rejects(operation, (error) => {
    assert.ok(error instanceof EscalationResolutionError);
    assert.equal(error.code, code);
    return true;
  });
}

describe("escalation resolution lifecycle", () => {
  test("resolves an OPEN escalation with actor, reason, timestamp, and notes", async () => {
    const resolvedAt = daysAfter(BASE_NOW, 1);
    const { db, state } = createEscalationTestDb({
      escalationLogs: [escalationLog()],
    });

    const result = await resolveEscalationWithClient({
      db,
      escalationLogId: "existing-escalation-log",
      resolvedByUserId: "manager-product",
      resolutionReason: "Manager approved overdue goal submission.",
      resolutionNotes: "Approval completed after governance review.",
      resolvedAt,
    });

    assert.equal(result.action, "RESOLVED");
    assert.equal(result.previousStatus, EscalationStatus.OPEN);
    assert.equal(result.status, EscalationStatus.RESOLVED);
    assert.equal(result.resolvedByUserId, "manager-product");
    assert.equal(result.resolvedAt?.toISOString(), resolvedAt.toISOString());
    assert.equal(result.reason, "Manager approved overdue goal submission.");
    assert.equal(result.notes, "Approval completed after governance review.");

    const stored = state.escalationLogs[0];
    assert.equal(stored.status, EscalationStatus.RESOLVED);
    assert.equal(stored.resolvedByUserId, "manager-product");
    assert.equal(stored.resolutionReason, "Manager approved overdue goal submission.");
    assert.equal(stored.resolutionNotes, "Approval completed after governance review.");
    assert.equal(stored.dismissedAt, null);
    assert.equal(stored.dismissedByUserId, null);
    assert.equal(stored.dismissalReason, null);
  });

  test("dismisses an OPEN escalation with governance ownership metadata", async () => {
    const dismissedAt = daysAfter(BASE_NOW, 2);
    const { db, state } = createEscalationTestDb({
      escalationLogs: [escalationLog()],
    });

    const result = await dismissEscalationWithClient({
      db,
      escalationLogId: "existing-escalation-log",
      dismissedByUserId: "manager-product",
      dismissalReason: "Approved exception window.",
      resolutionNotes: "Exception approved by governance owner.",
      dismissedAt,
    });

    assert.equal(result.action, "DISMISSED");
    assert.equal(result.status, EscalationStatus.DISMISSED);
    assert.equal(result.dismissedByUserId, "manager-product");
    assert.equal(result.dismissedAt?.toISOString(), dismissedAt.toISOString());
    assert.equal(result.reason, "Approved exception window.");
    assert.equal(result.notes, "Exception approved by governance owner.");

    const stored = state.escalationLogs[0];
    assert.equal(stored.status, EscalationStatus.DISMISSED);
    assert.equal(stored.dismissedByUserId, "manager-product");
    assert.equal(stored.dismissalReason, "Approved exception window.");
    assert.equal(stored.resolutionNotes, "Exception approved by governance owner.");
    assert.equal(stored.resolvedAt, null);
    assert.equal(stored.resolvedByUserId, null);
    assert.equal(stored.resolutionReason, null);
  });

  test("prevents resolving an escalation that is already RESOLVED", async () => {
    const { db, state } = createEscalationTestDb({
      escalationLogs: [
        escalationLog({
          status: EscalationStatus.RESOLVED,
          resolvedAt: BASE_NOW,
          resolvedByUserId: "manager-product",
          resolutionReason: "Already closed.",
        }),
      ],
    });

    await assertResolutionError(
      () =>
        resolveEscalationWithClient({
          db,
          escalationLogId: "existing-escalation-log",
          resolvedByUserId: "manager-product",
          resolutionReason: "Second resolution attempt.",
          resolvedAt: daysAfter(BASE_NOW, 1),
        }),
      "ESCALATION_NOT_OPEN",
    );

    assert.equal(state.escalationLogs[0].status, EscalationStatus.RESOLVED);
    assert.equal(state.escalationLogs[0].resolutionReason, "Already closed.");
  });

  test("prevents dismissing an escalation that is already DISMISSED", async () => {
    const { db, state } = createEscalationTestDb({
      escalationLogs: [
        escalationLog({
          status: EscalationStatus.DISMISSED,
          dismissedAt: BASE_NOW,
          dismissedByUserId: "manager-product",
          dismissalReason: "Exception already approved.",
        }),
      ],
    });

    await assertResolutionError(
      () =>
        dismissEscalationWithClient({
          db,
          escalationLogId: "existing-escalation-log",
          dismissedByUserId: "manager-product",
          dismissalReason: "Second dismissal attempt.",
          dismissedAt: daysAfter(BASE_NOW, 1),
        }),
      "ESCALATION_NOT_OPEN",
    );

    assert.equal(state.escalationLogs[0].status, EscalationStatus.DISMISSED);
    assert.equal(state.escalationLogs[0].dismissalReason, "Exception already approved.");
  });

  test("requires explicit closure actor and reason", async () => {
    const { db } = createEscalationTestDb({
      escalationLogs: [escalationLog()],
    });

    await assertResolutionError(
      () =>
        resolveEscalationWithClient({
          db,
          escalationLogId: "existing-escalation-log",
          resolvedByUserId: " ",
          resolutionReason: "Manager completed remediation.",
        }),
      "ACTOR_REQUIRED",
    );

    await assertResolutionError(
      () =>
        dismissEscalationWithClient({
          db,
          escalationLogId: "existing-escalation-log",
          dismissedByUserId: "manager-product",
          dismissalReason: " ",
        }),
      "REASON_REQUIRED",
    );
  });

  test("SYSTEM invocation used by the scheduler does not close escalations automatically", async () => {
    const { db, state } = createEscalationTestDb({
      escalationLogs: [escalationLog()],
    });

    await runEscalationCycleWithClient({
      db,
      triggerSource: EscalationTriggerSource.SYSTEM,
      now: daysAfter(BASE_NOW, 1),
      providers: [],
    });

    assert.equal(state.escalationLogs[0].status, EscalationStatus.OPEN);
    assert.equal(state.escalationLogs[0].resolvedAt, null);
    assert.equal(state.escalationLogs[0].resolvedByUserId, null);
    assert.equal(state.escalationLogs[0].dismissedAt, null);
    assert.equal(state.escalationLogs[0].dismissedByUserId, null);
  });
});
