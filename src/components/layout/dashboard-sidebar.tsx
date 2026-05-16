"use client";

import type { UserRole } from "@prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { getDashboardNavItems } from "@/components/navigation/nav-items";
import { cn } from "@/lib/utils";

type DashboardSidebarUser = {
  name?: string | null;
  email?: string | null;
  role: UserRole;
};

type DashboardSidebarProps = {
  user: DashboardSidebarUser;
};

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  return email?.slice(0, 2).toUpperCase() ?? "AQ";
}

function formatRole(role: UserRole) {
  return role.toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname();
  const navItems = getDashboardNavItems(user.role);

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border/80">
      <SidebarHeader className="gap-3 border-b border-sidebar-border px-3 py-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
            AQ
          </div>
          <div className="grid min-w-0 gap-0.5 group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold">
              AtomQuest
            </span>
            <span className="truncate text-xs text-sidebar-foreground/60">
              Goal Operations
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(pathname, item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "h-10",
                        isActive &&
                          "bg-sidebar-accent text-sidebar-accent-foreground",
                      )}
                    >
                      <Link href={item.href} prefetch={true} aria-current={isActive ? "page" : undefined}>
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="gap-3 p-3">
        <div className="flex items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-xs font-semibold text-foreground shadow-sm ring-1 ring-sidebar-border">
            {getInitials(user.name, user.email)}
          </div>
          <div className="grid min-w-0 flex-1 gap-1 group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">
              {user.name ?? "AtomQuest User"}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/60">
              {user.email}
            </span>
          </div>
          <Badge
            variant="outline"
            className="h-5 rounded-md px-1.5 text-[0.68rem] group-data-[collapsible=icon]:hidden"
          >
            {formatRole(user.role)}
          </Badge>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
