type UserRole = "EMPLOYEE" | "MANAGER" | "ADMIN";

import { signOut } from "@/auth";
import { SignoutConfirmation } from "@/components/auth/signout-confirmation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

type DashboardHeaderUser = {
  name?: string | null;
  email?: string | null;
  role: UserRole;
};

type DashboardHeaderProps = {
  user: DashboardHeaderUser;
};

const roleLabels = {
  ADMIN: "Admin Workspace",
  MANAGER: "Manager Workspace",
  EMPLOYEE: "Employee Workspace",
} satisfies Record<UserRole, string>;

export function DashboardHeader({ user }: DashboardHeaderProps) {
  async function signOutAction(_formData: FormData) {
    "use server";

    void _formData;
    await signOut({ redirectTo: "/" });
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border/70 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <SidebarTrigger className="md:hidden -ml-1" />
      <Separator orientation="vertical" className="md:hidden h-6" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-sm font-semibold sm:text-base">
            {roleLabels[user.role]}
          </h1>
          <Badge
            variant="secondary"
            className="hidden h-5 rounded-md px-1.5 text-[0.68rem] sm:inline-flex"
          >
            {roleLabels[user.role]}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {user.name ?? user.email}
        </p>
      </div>

      <SignoutConfirmation
        action={signOutAction}
        userLabel={user.name ?? user.email}
        workspaceLabel={roleLabels[user.role]}
      />
    </header>
  );
}
