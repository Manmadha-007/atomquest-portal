import "server-only";

import { auth } from "@/auth";
import { isAppRole, type AppRole } from "@/lib/auth";

export type DashboardUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: AppRole;
};

export async function getDashboardUser(): Promise<DashboardUser | null> {
  const session = await auth();

  const user = session?.user;

  if (
    !user ||
    typeof user !== "object" ||
    typeof user.id !== "string" ||
    !isAppRole(user.role)
  ) {
    return null;
  }

  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    role: user.role,
  };
}