"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "./animated-number";

const executionRows = [
  {
    team: "Product Operations",
    progress: 92,
    status: "On track",
  },
  {
    team: "Customer Success",
    progress: 78,
    status: "Reviewing",
  },
  {
    team: "Enterprise Sales",
    progress: 64,
    status: "At risk",
  },
];

const governanceSignals = [
  "RBAC enforced",
  "Audit events live",
  "Exports ready",
];

export function DashboardPreview() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Slight delay so the user sees the animation start when the page loads
    const timer = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      aria-label="AtomQuest enterprise analytics dashboard preview"
      className="relative rounded-lg border bg-background/95 p-3 shadow-2xl shadow-slate-900/10 ring-1 ring-foreground/5"
    >
      <div className="rounded-md border bg-muted/30">
        <div className="flex flex-col gap-3 border-b bg-background/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Enterprise cockpit
            </p>
            <h2 className="mt-1 text-base font-semibold">
              QBR execution command center
            </h2>
          </div>
          <Badge
            variant="secondary"
            className="h-6 rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          >
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Active cycle
          </Badge>
        </div>

        <div className="grid gap-3 p-3 sm:grid-cols-3">
          <div className="rounded-md border bg-background p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Approval rate
              </span>
              <ClipboardCheck
                className="size-3.5 text-blue-600"
                aria-hidden="true"
              />
            </div>
            <p className="mt-3 text-2xl font-semibold">
              <AnimatedNumber value={91} suffix="%" delay={100} />
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-[1500ms] ease-[cubic-bezier(0.2,0,0,1)]"
                style={{ width: mounted ? "91%" : "0%" }}
              />
            </div>
          </div>

          <div className="rounded-md border bg-background p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Execution trend
              </span>
              <TrendingUp
                className="size-3.5 text-emerald-600"
                aria-hidden="true"
              />
            </div>
            <p className="mt-3 text-2xl font-semibold">
              <AnimatedNumber value={14} prefix="+" suffix="%" delay={200} />
            </p>
            <div className="mt-3 flex h-8 items-end gap-1.5 overflow-hidden">
              {[34, 42, 39, 51, 63, 72].map((height, i) => (
                <span
                  key={i}
                  className="w-full rounded-sm bg-emerald-500/80 transition-all ease-[cubic-bezier(0.2,0,0,1)]"
                  style={{
                    height: mounted ? `${height}%` : "0%",
                    transitionDuration: "1000ms",
                    transitionDelay: `${i * 100}ms`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-md border bg-background p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Governance
              </span>
              <ShieldCheck
                className="size-3.5 text-slate-700"
                aria-hidden="true"
              />
            </div>
            <p className="mt-3 text-2xl font-semibold">
              <AnimatedNumber value={99.8} decimals={1} suffix="%" delay={300} />
            </p>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Audit coverage across goal state transitions.
            </p>
          </div>
        </div>

        <div className="grid gap-3 p-3 pt-0 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-md border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">
                  Completion monitoring
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Portfolio health by operating team.
                </p>
              </div>
              <BarChart3
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </div>

            <div className="mt-5 space-y-4">
              {executionRows.map((row, i) => (
                <div key={row.team} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium">{row.team}</span>
                    <span className="text-muted-foreground">
                      {row.status}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-slate-900 transition-all ease-[cubic-bezier(0.2,0,0,1)]"
                      style={{
                        width: mounted ? `${row.progress}%` : "0%",
                        transitionDuration: "1500ms",
                        transitionDelay: `${i * 200}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Control signals</h3>
              <Gauge
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </div>

            <div className="mt-5 grid gap-2">
              {governanceSignals.map((signal) => (
                <div
                  key={signal}
                  className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-xs"
                >
                  <span className="font-medium">{signal}</span>
                  <CheckCircle2
                    className="size-3.5 text-emerald-600"
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-md border bg-slate-950 p-3 text-slate-50">
              <p className="text-xs text-slate-300">
                Next review lock window
              </p>
              <p className="mt-2 text-lg font-semibold">4 days</p>
              <p className="mt-1 text-xs text-slate-400">
                Goal changes require manager approval.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
