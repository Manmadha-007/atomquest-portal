type UserRole = "EMPLOYEE" | "MANAGER" | "ADMIN";
import {
  Activity,
  BarChart3,
  ClipboardCheck,
  FileClock,
  Goal,
  LayoutDashboard,
  ListChecks,
  Share2,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type DashboardNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export const dashboardNavItems = {
  ADMIN: [
    {
      title: "Overview",
      href: "/dashboard/admin",
      icon: LayoutDashboard,
      description: "Enterprise operating summary",
    },
    {
      title: "Employees",
      href: "/dashboard/admin/employees",
      icon: Users,
      description: "Org structure and active users",
    },
    {
      title: "Review Cycles",
      href: "/dashboard/admin/review-cycles",
      icon: FileClock,
      description: "Quarterly cycle governance",
    },
    {
      title: "Shared Goals",
      href: "/dashboard/admin/shared-goals",
      icon: Share2,
      description: "KPI propagation control",
    },
    {
      title: "Analytics",
      href: "/dashboard/admin/analytics",
      icon: BarChart3,
      description: "Goal and performance insights",
    },
    {
      title: "Audit Logs",
      href: "/dashboard/admin/audit-logs",
      icon: ShieldCheck,
      description: "Workflow and access history",
    },
  ],
  MANAGER: [
    {
      title: "Team Goals",
      href: "/dashboard/manager/team-goals",
      icon: Goal,
      description: "Team goal portfolio",
    },
    {
      title: "Approvals",
      href: "/dashboard/manager/approvals",
      icon: ClipboardCheck,
      description: "Pending goal decisions",
    },
    {
      title: "Shared Goals",
      href: "/dashboard/manager/shared-goals",
      icon: Share2,
      description: "Direct-report KPI propagation",
    },
    {
      title: "Team Progress",
      href: "/dashboard/manager/team-progress",
      icon: Activity,
      description: "Quarterly team health",
    },
    {
      title: "Analytics",
      href: "/dashboard/manager/analytics",
      icon: BarChart3,
      description: "Manager-level insights",
    },
  ],
  EMPLOYEE: [
    {
      title: "My Goals",
      href: "/dashboard/employee",
      icon: Target,
      description: "Owned goals and priorities",
    },
    {
      title: "Quarterly Updates",
      href: "/dashboard/employee/quarterly-updates",
      icon: ListChecks,
      description: "Progress update cadence",
    },
    {
      title: "Progress Tracker",
      href: "/dashboard/employee/progress-tracker",
      icon: Activity,
      description: "Personal execution trends",
    },
  ],
} satisfies Record<UserRole, DashboardNavItem[]>;

export type DashboardRole = keyof typeof dashboardNavItems;

export function getDashboardNavItems(role: UserRole) {
  return dashboardNavItems[role];
}
