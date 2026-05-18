import { Prisma } from "@prisma/client";

export const GOVERNANCE_TRANSACTION_TIMEOUT_MS = 20_000;
export const GOVERNANCE_TRANSACTION_MAX_WAIT_MS = 10_000;

export const governanceExecutionTransactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: GOVERNANCE_TRANSACTION_MAX_WAIT_MS,
  timeout: GOVERNANCE_TRANSACTION_TIMEOUT_MS,
} as const;
