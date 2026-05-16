import type { LucideIcon } from "lucide-react";
import {
  BriefcaseBusiness,
  ClipboardCheck,
  Crown,
  ShieldCheck,
  Target,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RolePreview = {
  role: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  workspaceLabel: string;
  metrics: Array<{
    label: string;
    value: string;
  }>;
  workflow: Array<{
    label: string;
    status: string;
    progress: number;
  }>;
};

const rolePreviews = [
  {
    role: "Employee",
    title: "Personal execution workspace",
    description:
      "Employees manage owned goals, shared-goal context, quarterly updates, and progress evidence in one focused workspace.",
    icon: Target,
    tone: "bg-blue-50 text-blue-700 ring-blue-200",
    workspaceLabel: "Employee Workspace",
    metrics: [
      { label: "Owned goals", value: "8" },
      { label: "Updates due", value: "2" },
    ],
    workflow: [
      { label: "Improve onboarding activation", status: "On track", progress: 86 },
      { label: "Launch knowledge base refresh", status: "Submitted", progress: 72 },
      { label: "Reduce handoff variance", status: "Draft", progress: 44 },
    ],
  },
  {
    role: "Manager",
    title: "Operational oversight layer",
    description:
      "Managers monitor team portfolios, review submitted goals, unblock quarterly progress, and govern shared KPI adoption.",
    icon: UsersRound,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    workspaceLabel: "Manager Oversight",
    metrics: [
      { label: "Direct reports", value: "14" },
      { label: "Approval queue", value: "6" },
    ],
    workflow: [
      { label: "Team completion health", status: "84%", progress: 84 },
      { label: "Pending manager decisions", status: "6 open", progress: 58 },
      { label: "At-risk quarterly updates", status: "3 flags", progress: 32 },
    ],
  },
  {
    role: "Admin",
    title: "Governance command center",
    description:
      "Admins configure review cycles, employee access, goal locks, shared objectives, audit logs, and export reporting.",
    icon: ShieldCheck,
    tone: "bg-slate-100 text-slate-800 ring-slate-200",
    workspaceLabel: "Admin Governance",
    metrics: [
      { label: "Active controls", value: "11" },
      { label: "Audit events", value: "2.8k" },
    ],
    workflow: [
      { label: "QBR review cycle", status: "Locked", progress: 100 },
      { label: "Shared KPI propagation", status: "Live", progress: 91 },
      { label: "Export reporting coverage", status: "Ready", progress: 96 },
    ],
  },
] satisfies RolePreview[];

const architectureSignals = [
  "Role-aware navigation",
  "Scoped dashboard data",
  "Approval boundaries",
  "Governed exports",
];

export function RoleShowcase() {
  return (
    <section id="role-experience" className="border-b bg-muted/25 py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <Crown className="size-3.5" aria-hidden="true" />
              Role-based operating model
            </div>
            <div className="space-y-3">
              <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Purpose-built workspaces for every execution owner.
              </h2>
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                Enterprise RBAC is not an add-on. It shapes what every user can
                see, approve, govern, and export across the goal lifecycle.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:w-[25rem]">
            {architectureSignals.map((signal) => (
              <div
                key={signal}
                className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs font-medium text-muted-foreground"
              >
                <ClipboardCheck
                  className="size-3.5 text-emerald-600"
                  aria-hidden="true"
                />
                {signal}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {rolePreviews.map((preview) => {
            const Icon = preview.icon;

            return (
              <Card key={preview.role} className="rounded-lg">
                <CardHeader className="gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={cn(
                        "flex size-10 items-center justify-center rounded-lg ring-1",
                        preview.tone,
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <Badge variant="outline" className="h-6 rounded-md px-2">
                      {preview.role}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <CardTitle>{preview.title}</CardTitle>
                    <CardDescription className="leading-6">
                      {preview.description}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="rounded-lg border bg-background">
                    <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {preview.workspaceLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Permission-scoped view
                        </p>
                      </div>
                      <BriefcaseBusiness
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>

                    <div className="grid grid-cols-2 border-b">
                      {preview.metrics.map((metric) => (
                        <div key={metric.label} className="border-r p-4 last:border-r-0">
                          <p className="text-xl font-semibold tracking-tight">
                            {metric.value}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {metric.label}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4 p-4">
                      {preview.workflow.map((item) => (
                        <div key={item.label} className="space-y-2">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="min-w-0 truncate font-medium">
                              {item.label}
                            </span>
                            <span className="shrink-0 text-muted-foreground">
                              {item.status}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-foreground"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
