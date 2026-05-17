"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft } from "lucide-react";

import { getDashboardNavItems } from "@/components/navigation/nav-items";
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
import type { AppRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

type DashboardSidebarUser = {
  name: string | null;
  email: string | null;
  role: AppRole;
};

type DashboardSidebarProps = {
  user: DashboardSidebarUser;
};

function isActiveRoute(
  pathname: string,
  href: string,
) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

function getInitials(
  name: string | null,
  email: string | null,
) {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  }

  if (email?.trim()) {
    return email
      .slice(0, 2)
      .toUpperCase();
  }

  return "AQ";
}

function formatRole(role: AppRole) {
  return (
    role.charAt(0) +
    role.slice(1).toLowerCase()
  );
}

export function DashboardSidebar({
  user,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const navItems = getDashboardNavItems(
    user.role,
  );

  const {
    toggleSidebar,
    state,
    isMobile,
  } = useSidebar();

  const isCollapsed =
    state === "collapsed" && !isMobile;

  const displayName =
    user.name ?? "AtomQuest User";

  const initials = getInitials(
    user.name,
    user.email,
  );

  const formattedRole = formatRole(user.role);

  return (
    <Sidebar
      collapsible="icon"
      className="border-sidebar-border/50 bg-background"
    >
      <SidebarHeader className="group/header h-[4.25rem] justify-center border-b border-sidebar-border p-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-3">
        <div className="flex w-full items-center justify-between group-data-[collapsible=icon]:justify-center">
          <div className="group/logo relative flex items-center">
            {isCollapsed ? (
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Expand sidebar"
                className="relative flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm transition-all hover:bg-sidebar-primary/90"
              >
                <span className="absolute text-sm font-semibold transition-opacity duration-300 group-hover/logo:opacity-0">
                  AQ
                </span>

                <PanelLeft className="absolute size-4 opacity-0 transition-opacity duration-300 group-hover/logo:opacity-100" />
              </button>
            ) : (
              <Link
                href="/dashboard"
                className="flex items-center gap-3 transition-opacity hover:opacity-80"
              >
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

          {!isCollapsed ? (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <PanelLeft className="size-4" />
            </button>
          ) : null}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            Workspace
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;

                const isActive = isActiveRoute(
                  pathname,
                  item.href,
                );

                return (
                  <SidebarMenuItem
                    key={item.href}
                  >
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActive}
                      className={cn(
                        "h-10 transition-colors",
                        isActive &&
                          "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                      )}
                    >
                      <Link
                        href={item.href}
                        prefetch
                        aria-current={
                          isActive
                            ? "page"
                            : undefined
                        }
                      >
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

      <SidebarFooter className="gap-3 p-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-3">
        <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-2 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground shadow-sm ring-1 ring-sidebar-border/50">
            {initials}
          </div>

          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold">
              {displayName}
            </span>

            <span className="truncate text-xs text-sidebar-foreground/60">
              {user.email}
            </span>
          </div>

          <Badge
            variant="outline"
            className="h-5 rounded-md bg-sidebar-accent/50 px-1.5 text-[0.68rem] group-data-[collapsible=icon]:hidden"
          >
            {formattedRole}
          </Badge>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}