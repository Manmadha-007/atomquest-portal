import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Gauge,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Kpi = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
};

const kpis = [
  {
    label: "Execution health",
    value: "86%",
    detail: "Weighted progress across active-cycle goals.",
    icon: Gauge,
    tone: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  {
    label: "Completion rate",
    value: "74%",
    detail: "Completed or validated through quarterly status.",
    icon: CheckCircle2,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  {
    label: "Shared KPI adoption",
    value: "91%",
    detail: "Propagated goals linked to accountable owners.",
    icon: TrendingUp,
    tone: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  },
  {
    label: "Policy exceptions",
    value: "7",
    detail: "Items requiring review before the cycle lock.",
    icon: CircleAlert,
    tone: "bg-amber-50 text-amber-700 ring-amber-200",
  },
] satisfies Kpi[];

const trendBars = [
  { label: "Q1", value: 48 },
  { label: "Q2", value: 62 },
  { label: "Q3", value: 71 },
  { label: "Q4", value: 86 },
];

const completionSegments = [
  { label: "Completed", value: 74, className: "bg-emerald-600" },
  { label: "On track", value: 17, className: "bg-blue-600" },
  { label: "At risk", value: 9, className: "bg-amber-500" },
];

const governanceIndicators = [
  ["Approval SLA", "94%", "Manager decisions within operating window"],
  ["Locked changes", "31", "Post-cutoff updates routed to approval"],
  ["Export packages", "3", "Goals, updates, and audit records"],
];

export function AnalyticsPreview() {
  return (
    <section id="analytics" className="border-b bg-background py-16 sm:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
        <div className="max-w-2xl space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              <BarChart3 className="size-3.5" aria-hidden="true" />
              Analytics preview
            </div>
            <div className="space-y-3">
              <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Executive visibility without operational noise.
              </h2>
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                Monitor completion, approval throughput, overdue exposure,
                shared-goal adoption, and execution trends from the same
                operating data your teams use every week.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;

              return (
                <div key={kpi.label} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {kpi.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight">
                        {kpi.value}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg ring-1",
                        kpi.tone,
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </div>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-muted-foreground">
                    {kpi.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xl shadow-slate-900/5">
          <div className="rounded-md border bg-background">
            <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Enterprise analytics
                </p>
                <h3 className="mt-1 text-base font-semibold">
                  Completion and governance monitoring
                </h3>
              </div>
              <Badge
                variant="outline"
                className="h-6 rounded-md border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                Live operating cycle
              </Badge>
            </div>

            <div className="grid gap-3 p-3 lg:grid-cols-[1fr_0.82fr]">
              <div className="rounded-md border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      Execution trend
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Average progress by review quarter.
                    </p>
                  </div>
                  <Activity
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>

                <div className="mt-6 flex h-56 items-end gap-4 border-b border-l px-3 pb-4">
                  {trendBars.map((bar) => (
                    <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-44 w-full items-end">
                        <div
                          className="w-full rounded-t-md bg-slate-900"
                          style={{ height: `${bar.value}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {bar.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-md border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">
                      Completion mix
                    </p>
                    <CheckCircle2
                      className="size-4 text-emerald-600"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted">
                    {completionSegments.map((segment) => (
                      <span
                        key={segment.label}
                        className={segment.className}
                        style={{ width: `${segment.value}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-4 grid gap-2">
                    {completionSegments.map((segment) => (
                      <div
                        key={segment.label}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span
                            className={cn("size-2 rounded-full", segment.className)}
                            aria-hidden="true"
                          />
                          {segment.label}
                        </span>
                        <span className="font-medium">{segment.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border bg-slate-950 p-4 text-slate-50">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Governance signals</p>
                    <ShieldCheck
                      className="size-4 text-slate-300"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-4 space-y-3">
                    {governanceIndicators.map(([label, value, detail]) => (
                      <div key={label} className="border-t border-white/10 pt-3 first:border-t-0 first:pt-0">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-300">
                            {label}
                          </span>
                          <span className="text-sm font-semibold">
                            {value}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          {detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
