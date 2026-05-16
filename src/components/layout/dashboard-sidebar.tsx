"use client";

import type { UserRole } from "@prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft } from "lucide-react";

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
  useSidebar,
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
  const { toggleSidebar, state, isMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border/50 bg-background">
      <SidebarHeader className="group/header h-[4.25rem] justify-center border-b border-sidebar-border p-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-3 group-data-[collapsible=icon]:items-center">
        <div className="flex items-center justify-between w-full group-data-[collapsible=icon]:justify-center">
          <div className="group/logo relative flex items-center">
            {state === "collapsed" && !isMobile ? (
              <button
                onClick={toggleSidebar}
                className="relative flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm transition-all hover:bg-sidebar-primary/90"
                aria-label="Expand Sidebar"
              >
                <span className="absolute text-sm font-semibold transition-opacity duration-300 group-hover/logo:opacity-0">
                  AQ
                </span>
                <PanelLeft className="absolute size-4 opacity-0 transition-opacity duration-300 group-hover/logo:opacity-100" />
              </button>
            ) : (
              <Link href="/dashboard" className="flex items-center gap-3 transition-opacity hover:opacity-80">
                <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground shadow-sm">
                  AQ
                </div>
                <div className="grid min-w-0 gap-0.5 group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-semibold leading-tight text-sidebar-foreground">
                    AtomQuest
                  </span>
                  <span className="truncate text-xs font-medium text-sidebar-foreground/60">
                    Goal Operations
                  </span>
                </div>
              </Link>
            )}
          </div>
          
          {state === "expanded" && !isMobile && (
             <button
                onClick={toggleSidebar}
                className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="Collapse Sidebar"
             >
                <PanelLeft className="size-4" />
             </button>
          )}
        </div>
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
                        "h-10 transition-colors",
                        isActive &&
                          "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
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

      <div className="px-3 group-data-[collapsible=icon]:px-0">
        <SidebarSeparator className="mx-0 w-full" />
      </div>

      <SidebarFooter className="gap-3 p-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-3 group-data-[collapsible=icon]:justify-center">
        <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:w-full">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground shadow-sm ring-1 ring-sidebar-border/50">
            {getInitials(user.name, user.email)}
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold">
              {user.name ?? "AtomQuest User"}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/60">
              {user.email}
            </span>
          </div>
          <Badge
            variant="outline"
            className="h-5 rounded-md px-1.5 text-[0.68rem] bg-sidebar-accent/50 group-data-[collapsible=icon]:hidden"
          >
            {formatRole(user.role)}
          </Badge>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
