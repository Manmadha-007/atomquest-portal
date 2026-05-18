import { auth } from "@/auth";

import { handleDismissEscalation } from "@/features/escalation/api/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return handleDismissEscalation({
    request,
    session: await auth(),
    escalationLogId: id,
  });
}
