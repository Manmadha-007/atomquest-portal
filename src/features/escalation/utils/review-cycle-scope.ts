import type { Prisma } from "@prisma/client";

import type {
  ActiveEscalationRule,
  EscalationDbClient,
  ReviewCycleScope,
} from "@/features/escalation/types";

const reviewCycleScopeSelect = {
  id: true,
  name: true,
  year: true,
  quarter: true,
  startDate: true,
  endDate: true,
  submissionDeadline: true,
  isActive: true,
} as const satisfies Prisma.ReviewCycleSelect;

export async function findReviewCyclesForRule(input: {
  db: EscalationDbClient;
  rule: ActiveEscalationRule;
}): Promise<ReviewCycleScope[]> {
  return input.db.reviewCycle.findMany({
    where: input.rule.reviewCycleId
      ? { id: input.rule.reviewCycleId }
      : { isActive: true },
    orderBy: [
      { year: "desc" },
      { quarter: "desc" },
      { startDate: "desc" },
    ],
    select: reviewCycleScopeSelect,
  });
}
