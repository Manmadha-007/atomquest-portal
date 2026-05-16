import type { UserRole } from "@prisma/client";
import { LogOut } from "lucide-react";

import { signOut } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border/70 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />

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

      <form
        action={async () => {
          "use server";

          await signOut({ redirectTo: "/" });
        }}
      >
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="gap-1.5"
        >
          <LogOut className="size-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </form>
    </header>
  );
}
