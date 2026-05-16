import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/auth";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SIGN_IN_PATH, isAppRole } from "@/lib/auth";

type DashboardShellProps = {
  children: ReactNode;
};

export async function DashboardShell({ children }: DashboardShellProps) {
  const session = await auth();
  const role = session?.user?.role;

  if (!session?.user || !isAppRole(role)) {
    redirect(`${SIGN_IN_PATH}?callbackUrl=/dashboard`);
  }

  const user = {
    name: session.user.name,
    email: session.user.email,
    role,
  };

  return (
    <SidebarProvider>
      <DashboardSidebar user={user} />
      <SidebarInset className="min-h-svh bg-muted/30">
        <DashboardHeader user={user} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
