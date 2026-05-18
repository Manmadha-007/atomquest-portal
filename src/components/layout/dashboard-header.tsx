import { signOut } from "@/auth";
import { SignoutConfirmation } from "@/components/auth/signout-confirmation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { AppRole } from "@/lib/auth";

type DashboardHeaderUser = {
  name: string | null;
  email: string | null;
  role: AppRole;
};

type DashboardHeaderProps = {
  user: DashboardHeaderUser;
};

const roleLabels = {
  ADMIN: "Admin Workspace",
  MANAGER: "Manager Workspace",
  EMPLOYEE: "Employee Workspace",
} satisfies Record<AppRole, string>;

export function DashboardHeader({
  user,
}: DashboardHeaderProps) {
  async function handleSignOut() {
    "use server";

    await signOut({
      redirectTo: "/",
    });
  }

  const workspaceLabel = roleLabels[user.role];

  const userLabel =
    user.name ??
    user.email ??
    "Authenticated workspace user";

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border/70 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-5 lg:px-6">
      <SidebarTrigger className="-ml-1 md:hidden" />

      <Separator
        orientation="vertical"
        className="h-6 md:hidden"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-sm font-semibold sm:text-base">
            {workspaceLabel}
          </h1>

          <Badge
            variant="secondary"
            className="hidden h-5 rounded-md px-1.5 text-[0.68rem] sm:inline-flex"
          >
            {workspaceLabel}
          </Badge>
        </div>

        <p className="truncate text-xs text-muted-foreground">
          {userLabel}
        </p>
      </div>

      <SignoutConfirmation
        action={handleSignOut}
        userLabel={userLabel}
        workspaceLabel={workspaceLabel}
      />
    </header>
  );
}
