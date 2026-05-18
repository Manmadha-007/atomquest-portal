import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { Prisma } from "@prisma/client";

import {
  GOVERNANCE_TRANSACTION_MAX_WAIT_MS,
  GOVERNANCE_TRANSACTION_TIMEOUT_MS,
  governanceExecutionTransactionOptions,
} from "@/features/escalation/utils/transaction-options";

describe("governanceExecutionTransactionOptions", () => {
  test("uses an extended serializable interactive transaction window", () => {
    assert.equal(GOVERNANCE_TRANSACTION_TIMEOUT_MS, 20_000);
    assert.equal(GOVERNANCE_TRANSACTION_MAX_WAIT_MS, 10_000);
    assert.equal(
      governanceExecutionTransactionOptions.isolationLevel,
      Prisma.TransactionIsolationLevel.Serializable,
    );
    assert.equal(
      governanceExecutionTransactionOptions.timeout,
      GOVERNANCE_TRANSACTION_TIMEOUT_MS,
    );
    assert.equal(
      governanceExecutionTransactionOptions.maxWait,
      GOVERNANCE_TRANSACTION_MAX_WAIT_MS,
    );
  });
});
