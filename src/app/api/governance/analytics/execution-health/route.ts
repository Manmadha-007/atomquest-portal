import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import { handleGovernanceAnalytics } from "@/features/escalation/api/handlers";
import type { EscalationDbClient } from "@/features/escalation/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleGovernanceAnalytics({
    request,
    session: await auth(),
    db: prisma as unknown as EscalationDbClient,
    kind: "execution-health",
  });
}
