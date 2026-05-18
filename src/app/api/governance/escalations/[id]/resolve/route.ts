import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import { handleResolveEscalation } from "@/features/escalation/api/handlers";
import type { EscalationDbClient } from "@/features/escalation/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return handleResolveEscalation({
    request,
    session: await auth(),
    db: prisma as unknown as EscalationDbClient,
    escalationLogId: id,
  });
}
