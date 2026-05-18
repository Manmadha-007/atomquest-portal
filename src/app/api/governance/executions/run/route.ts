import { auth } from "@/auth";

import { handleRunEscalationCycle } from "@/features/escalation/api/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRunEscalationCycle({
    request,
    session: await auth(),
  });
}
