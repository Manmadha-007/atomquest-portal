import "server-only";

import type { ReactNode } from "react";

import { DashboardAuthState } from "@/components/layout/dashboard-auth-state";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { getDashboardUser } from "@/lib/auth/session";

type DashboardShellProps = {
  children: ReactNode;
};

export async function DashboardShell({
  children,
}: DashboardShellProps) {
  const user = await getDashboardUser();

  if (!user) {
    return (
      <main className="min-h-svh bg-muted/30 p-4 sm:p-5 lg:p-6">
        <DashboardAuthState />
      </main>
    );
  }

  return (
    <SidebarProvider>
      <DashboardSidebar user={user} />

      <SidebarInset className="min-h-svh bg-muted/30">
        <DashboardHeader user={user} />

        <main className="flex-1 p-4 sm:p-5 lg:p-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 lg:gap-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
