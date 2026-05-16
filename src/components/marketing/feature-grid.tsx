import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ClipboardCheck,
  FileDown,
  FileSearch,
  GitBranch,
  ListChecks,
  LockKeyhole,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AnimatedSection } from "./animated-section";

type Capability = {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
};

const capabilities = [
  {
    title: "Goal Governance",
    description:
      "Define ownership, cycle rules, approval states, and role-specific authority across the goal portfolio.",
    icon: LockKeyhole,
    tone: "bg-slate-100 text-slate-800 ring-slate-200",
  },
  {
    title: "Quarterly Execution Tracking",
    description:
      "Keep operating teams aligned around active-cycle objectives, progress updates, and manager review cadence.",
    icon: ListChecks,
    tone: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  {
    title: "Shared Goals Propagation",
    description:
      "Cascade strategic KPIs into employee workspaces while preserving source context and accountability.",
    icon: GitBranch,
    tone: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  },
  {
    title: "Completion Monitoring",
    description:
      "Surface overdue work, at-risk progress, completed outcomes, and stalled quarterly updates before reviews.",
    icon: ClipboardCheck,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  {
    title: "Executive Analytics",
    description:
      "Read organization health through approval rates, completion trends, team performance, and status distribution.",
    icon: BarChart3,
    tone: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  {
    title: "Audit & Reporting",
    description:
      "Export governed records for goals, quarterly updates, and audit logs with decision history intact.",
    icon: FileDown,
    tone: "bg-amber-50 text-amber-700 ring-amber-200",
  },
] satisfies Capability[];

export function FeatureGrid() {
  return (
    <section id="platform-capabilities" className="border-b bg-background py-16 sm:py-20 overflow-hidden">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              <FileSearch className="size-3.5" aria-hidden="true" />
              Platform capabilities
            </div>
            <div className="space-y-3">
              <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                A control plane for enterprise execution.
              </h2>
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                AtomQuest connects goal planning, quarterly updates, review
                workflows, shared goals, and analytics into one governed
                operating rhythm.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Cycle cadence", "Quarterly"],
              ["Access model", "RBAC"],
              ["Reporting", "CSV/XLSX"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border bg-muted/30 p-4 text-sm"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </AnimatedSection>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {capabilities.map((capability, index) => {
            const Icon = capability.icon;

            return (
            <AnimatedSection key={capability.title} delay={index * 100}>
              <Card className="rounded-lg h-full">
                <CardHeader className="gap-4">
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg ring-1",
                      capability.tone,
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle>{capability.title}</CardTitle>
                    <CardDescription className="leading-6">
                      {capability.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
