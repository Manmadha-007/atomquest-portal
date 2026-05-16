import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Gauge,
  ShieldCheck,
  Target,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AnimatedSection } from "@/components/marketing/animated-section";
import { AnimatedProgress } from "@/components/marketing/animated-progress";
import { AnimatedNumber } from "@/components/marketing/animated-number";

type AccessLane = {
  label: string;
  description: string;
  icon: LucideIcon;
  tone: string;
};

const accessLanes = [
  {
    label: "Employee tracking",
    description: "Owned goals and progress.",
    icon: Target,
    tone: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  {
    label: "Manager oversight",
    description: "Approval queues and signals.",
    icon: UsersRound,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
] satisfies AccessLane[];

const monitorRows = [
  { label: "Quarterly updates", value: "On track", progress: 82 },
  { label: "Export readiness", value: "Ready", progress: 96 },
];

export function LoginShowcase() {
  return (
    <section className="space-y-4">
      <AnimatedSection className="max-w-3xl space-y-3">
        <Badge
          variant="outline"
          className="h-7 rounded-md border-foreground/10 bg-background/80 px-3 text-muted-foreground shadow-sm"
        >
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Secure enterprise access
        </Badge>

        <div className="space-y-2">
          <h1 className="max-w-3xl text-balance font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Governed workspace access for every execution owner.
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            AtomQuest routes each authenticated user into the right operating
            surface for goal ownership, team oversight, governance controls,
            analytics, completion monitoring, and reporting.
          </p>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={200} className="hidden rounded-lg border bg-background/95 p-3 shadow-xl shadow-slate-900/5 lg:block">
        <div className="rounded-md border bg-muted/20">
          <div className="flex items-center justify-between gap-4 border-b bg-background/80 p-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Access intelligence
              </p>
              <h2 className="mt-1 text-sm font-semibold">
                Role-aware operating console
              </h2>
            </div>
            <Badge
              variant="secondary"
              className="h-6 rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2 text-xs"
            >
              <CheckCircle2 className="size-3.5 mr-1.5" aria-hidden="true" />
              Active
            </Badge>
          </div>

          <div className="grid gap-3 p-3 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-2">
              {accessLanes.map((lane) => {
                const Icon = lane.icon;

                return (
                  <div
                    key={lane.label}
                    className="grid grid-cols-[auto_1fr] gap-2 rounded-md border bg-background p-2"
                  >
                    <div
                      className={cn(
                        "flex size-9 items-center justify-center rounded-md ring-1",
                        lane.tone,
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{lane.label}</p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        {lane.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold">
                    Completion monitoring
                  </h3>
                </div>
                <Gauge className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>

              <div className="mt-4 space-y-4">
                {monitorRows.map((row, index) => (
                  <div key={row.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium">{row.label}</span>
                      <span className="text-muted-foreground">
                        {row.value.endsWith("%") ? (
                          <AnimatedNumber value={parseInt(row.value)} suffix="%" delay={300 + index * 150} />
                        ) : (
                          row.value
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <AnimatedProgress
                        value={row.progress}
                        className="h-full rounded-full bg-slate-900"
                        delay={300 + index * 150}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
}
