import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SIGN_IN_PATH,
  getDashboardPathForRole,
  type AppRole,
} from "@/lib/auth";

const roleLabels = {
  ADMIN: "admin",
  MANAGER: "manager",
  EMPLOYEE: "employee",
} satisfies Record<AppRole, string>;

type DashboardAuthStateProps = {
  description?: string;
  requiredRole?: AppRole;
  title?: string;
  userRole?: AppRole | null;
};

export function DashboardAuthState({
  description,
  requiredRole,
  title,
  userRole,
}: DashboardAuthStateProps) {
  const hasAuthenticatedUser = Boolean(userRole);

  const hasWrongRole =
    hasAuthenticatedUser &&
    Boolean(requiredRole) &&
    userRole !== requiredRole;

  const resolvedTitle =
    title ??
    (hasWrongRole
      ? "Workspace unavailable"
      : "Session unavailable");

  const resolvedDescription =
    description ??
    (hasWrongRole &&
    requiredRole &&
    userRole
      ? `This area is for ${roleLabels[requiredRole]} users. Your active session is a ${roleLabels[userRole]} workspace.`
      : "Your dashboard session could not be resolved for this request.");

  const actionHref =
  hasAuthenticatedUser && userRole
    ? getDashboardPathForRole(userRole)
    : SIGN_IN_PATH;

  const actionLabel = hasAuthenticatedUser
    ? "Open my dashboard"
    : "Sign in";

  return (
    <Card className="mx-auto mt-12 w-full max-w-2xl rounded-lg">
      <CardHeader>
        <CardTitle>{resolvedTitle}</CardTitle>

        <CardDescription>
          {resolvedDescription}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Button asChild>
          <Link href={actionHref}>
            {actionLabel}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}