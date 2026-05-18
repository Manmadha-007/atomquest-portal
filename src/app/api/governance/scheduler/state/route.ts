import { auth } from "@/auth";

import { handleSchedulerState } from "@/features/escalation/api/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return handleSchedulerState({
    session: await auth(),
  });
}
