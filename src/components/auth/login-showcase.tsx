import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileDown,
  Gauge,
  ShieldCheck,
  Target,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AccessLane = {
  label: string;
  description: string;
  icon: LucideIcon;
  tone: string;
};

const accessLanes = [
  {
    label: "Employee execution tracking",
    description: "Owned goals, shared objectives, and quarterly progress.",
    icon: Target,
    tone: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  {
    label: "Manager operational oversight",
    description: "Approval queues, direct-report health, and delivery signals.",
    icon: UsersRound,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  {
    label: "Admin governance visibility",
    description: "Review cycles, locks, audit logs, and export reporting.",
    icon: ShieldCheck,
    tone: "bg-slate-100 text-slate-800 ring-slate-200",
  },
] satisfies AccessLane[];

const metrics = [
  ["Completion health", "84%"],
  ["Approval SLA", "94%"],
  ["Audit coverage", "99.8%"],
];

const monitorRows = [
  { label: "Quarterly updates", value: "On track", progress: 82 },
  { label: "Shared KPI adoption", value: "91%", progress: 91 },
  { label: "Export readiness", value: "Ready", progress: 96 },
];

export function LoginShowcase() {
  return (
    <section className="space-y-6">
      <div className="max-w-3xl space-y-5">
        <Badge
          variant="outline"
          className="h-7 rounded-md border-foreground/10 bg-background/80 px-3 text-muted-foreground shadow-sm"
        >
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Secure enterprise access
        </Badge>

        <div className="space-y-4">
          <h1 className="max-w-3xl text-balance font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Governed workspace access for every execution owner.
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            AtomQuest routes each authenticated user into the right operating
            surface for goal ownership, team oversight, governance controls,
            analytics, completion monitoring, and reporting.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-lg border bg-background/85 p-4">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="hidden rounded-lg border bg-background/95 p-3 shadow-xl shadow-slate-900/5 lg:block">
        <div className="rounded-md border bg-muted/20">
          <div className="flex items-center justify-between gap-4 border-b bg-background/80 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Access intelligence
              </p>
              <h2 className="mt-1 text-base font-semibold">
                Role-aware operating console
              </h2>
            </div>
            <Badge
              variant="secondary"
              className="h-6 rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
            >
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Active
            </Badge>
          </div>

          <div className="grid gap-3 p-3 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-3">
              {accessLanes.map((lane) => {
                const Icon = lane.icon;

                return (
                  <div
                    key={lane.label}
                    className="grid grid-cols-[auto_1fr] gap-3 rounded-md border bg-background p-3"
                  >
                    <div
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg ring-1",
                        lane.tone,
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{lane.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {lane.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-md border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">
                    Completion monitoring
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Signals available after access is resolved.
                  </p>
                </div>
                <Gauge className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>

              <div className="mt-5 space-y-4">
                {monitorRows.map((row) => (
                  <div key={row.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium">{row.label}</span>
                      <span className="text-muted-foreground">{row.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-slate-900"
                        style={{ width: `${row.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-xs">
                {[
                  [BarChart3, "Analytics"],
                  [ClipboardCheck, "Approvals"],
                  [FileDown, "Exports"],
                ].map(([Icon, label]) => {
                  const Component = Icon as LucideIcon;

                  return (
                    <div
                      key={label as string}
                      className="rounded-md border bg-muted/30 p-2 text-center text-muted-foreground"
                    >
                      <Component
                        className="mx-auto mb-1 size-3.5 text-foreground"
                        aria-hidden="true"
                      />
                      {label as string}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
