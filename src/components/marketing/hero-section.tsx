import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SIGN_IN_PATH } from "@/lib/auth";

const operatingMetrics = [
  {
    label: "Completion health",
    value: "84%",
    detail: "11 pts above baseline",
  },
  {
    label: "Active goals",
    value: "312",
    detail: "Across 28 operating teams",
  },
  {
    label: "Pending reviews",
    value: "18",
    detail: "Manager decisions queued",
  },
];

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

export function HeroSection() {
  return (
    <section className="relative isolate border-b bg-[linear-gradient(180deg,#fafafa_0%,#ffffff_58%,#f8fafc_100%)]">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(15,23,42,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.055)_1px,transparent_1px)] bg-[size:42px_42px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]"
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <nav
          aria-label="Primary"
          className="flex min-h-16 items-center justify-between gap-4 py-3"
        >
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-foreground text-sm font-semibold text-background shadow-sm">
              AQ
            </span>
            <span className="grid">
              <span className="text-sm font-semibold leading-5">AtomQuest</span>
              <span className="text-xs text-muted-foreground">
                Goal Operations
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <Link href="#platform-capabilities" className="hover:text-foreground">
              Platform
            </Link>
            <Link href="#role-experience" className="hover:text-foreground">
              Roles
            </Link>
            <Link href="#governance" className="hover:text-foreground">
              Governance
            </Link>
          </div>

          <Button asChild variant="outline" size="sm" className="bg-background/80">
            <Link href={SIGN_IN_PATH}>Sign In</Link>
          </Button>
        </nav>

        <div className="grid gap-10 pb-16 pt-12 sm:pb-20 sm:pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-12 lg:pb-24 lg:pt-20">
          <div className="max-w-3xl space-y-8">
            <div className="space-y-5">
              <Badge
                variant="outline"
                className="h-7 rounded-md border-foreground/10 bg-background/80 px-3 text-muted-foreground shadow-sm"
              >
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Enterprise execution intelligence
              </Badge>

              <div className="space-y-5">
                <h1 className="max-w-4xl text-balance font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                  Enterprise goal execution, governance, and workforce
                  performance intelligence in one platform.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                  AtomQuest turns quarterly objectives into an accountable
                  operating system for employees, managers, and administrators,
                  with governed workflows, shared KPI propagation, audit-ready
                  decisions, and executive analytics.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-11 px-4">
                <Link href={SIGN_IN_PATH}>
                  Sign In
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 bg-background/80 px-4"
              >
                <Link href="#platform-capabilities">Explore Platform</Link>
              </Button>
            </div>

            <div className="grid max-w-2xl gap-3 border-t pt-6 sm:grid-cols-3">
              {operatingMetrics.map((metric) => (
                <div key={metric.label} className="space-y-1">
                  <p className="text-2xl font-semibold tracking-tight">
                    {metric.value}
                  </p>
                  <p className="text-sm font-medium">{metric.label}</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {metric.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

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
                  <p className="mt-3 text-2xl font-semibold">91%</p>
                  <div className="mt-3 h-1.5 rounded-full bg-muted">
                    <div className="h-full w-[91%] rounded-full bg-blue-600" />
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
                  <p className="mt-3 text-2xl font-semibold">+14%</p>
                  <div className="mt-3 flex h-8 items-end gap-1.5">
                    {[34, 42, 39, 51, 63, 72].map((height) => (
                      <span
                        key={height}
                        className="w-full rounded-sm bg-emerald-500/80"
                        style={{ height: `${height}%` }}
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
                  <p className="mt-3 text-2xl font-semibold">99.8%</p>
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
                    {executionRows.map((row) => (
                      <div key={row.team} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-medium">{row.team}</span>
                          <span className="text-muted-foreground">
                            {row.status}
                          </span>
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
        </div>
      </div>
    </section>
  );
}
