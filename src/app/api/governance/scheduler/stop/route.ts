import { auth } from "@/auth";

import { handleSchedulerStop } from "@/features/escalation/api/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  return handleSchedulerStop({
    session: await auth(),
  });
}
