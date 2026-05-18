import { auth } from "@/auth";

import { handleSchedulerStart } from "@/features/escalation/api/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  return handleSchedulerStart({
    session: await auth(),
  });
}
