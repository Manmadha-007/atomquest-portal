import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  ClipboardList,
  FileClock,
  FileDown,
  Lock,
  ScrollText,
  ShieldCheck,
  Stamp,
} from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type GovernanceControl = {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
};

const controls = [
  {
    title: "Review Cycles",
    description:
      "Open, monitor, and close quarterly execution windows with clear owner expectations.",
    icon: FileClock,
    tone: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  {
    title: "Approvals",
    description:
      "Route submitted goals and sensitive changes through manager decisions before they become operating truth.",
    icon: Stamp,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  {
    title: "Locking",
    description:
      "Protect active cycles from uncontrolled edits while preserving request and decision context.",
    icon: Lock,
    tone: "bg-slate-100 text-slate-800 ring-slate-200",
  },
  {
    title: "Audit Logs",
    description:
      "Record workflow actions, actors, entities, timestamps, and metadata for every governed transition.",
    icon: ScrollText,
    tone: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  {
    title: "Export Reporting",
    description:
      "Generate operational reports for goals, quarterly updates, and audit trails without manual cleanup.",
    icon: FileDown,
    tone: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  {
    title: "Compliance Visibility",
    description:
      "Give leadership confidence in who changed what, when, why, and under which review cycle.",
    icon: ShieldCheck,
    tone: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  },
] satisfies GovernanceControl[];

const auditRows = [
  ["Admin", "Locked QBR cycle", "Goal changes gated"],
  ["Manager", "Approved submitted goal", "Decision logged"],
  ["Employee", "Posted quarterly update", "Progress captured"],
  ["System", "Generated export", "Report trace retained"],
];

export function GovernanceSection() {
  return (
    <section id="governance" className="border-b bg-muted/25 py-16 sm:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="space-y-8">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Governance and auditability
            </div>
            <div className="space-y-3">
              <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Built for accountable operating rhythms.
              </h2>
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                AtomQuest treats goals as governed business records. Review
                cycles, approvals, locks, exports, and audit logs work together
                so execution data can stand up to leadership scrutiny.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {controls.map((control) => {
              const Icon = control.icon;

              return (
                <Card key={control.title} className="rounded-lg">
                  <CardHeader className="grid-cols-[auto_1fr] gap-4">
                    <div
                      className={cn(
                        "flex size-10 items-center justify-center rounded-lg ring-1",
                        control.tone,
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle>{control.title}</CardTitle>
                      <CardDescription className="leading-6">
                        {control.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="lg:pt-12">
          <div className="rounded-lg border bg-background p-3 shadow-xl shadow-slate-900/5">
            <div className="rounded-md border">
              <div className="border-b p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Governance ledger
                    </p>
                    <h3 className="mt-1 text-base font-semibold">
                      Audit-ready decision history
                    </h3>
                  </div>
                  <div className="flex size-9 items-center justify-center rounded-lg bg-slate-950 text-slate-50">
                    <ClipboardList className="size-4" aria-hidden="true" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 border-b bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span>Actor</span>
                <span>Action</span>
                <span>Evidence</span>
              </div>

              <div className="divide-y">
                {auditRows.map(([actor, action, evidence]) => (
                  <div
                    key={`${actor}-${action}`}
                    className="grid grid-cols-3 gap-3 px-4 py-4 text-sm"
                  >
                    <span className="font-medium">{actor}</span>
                    <span className="text-muted-foreground">{action}</span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2
                        className="size-3.5 shrink-0 text-emerald-600"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 truncate">{evidence}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t bg-slate-950 p-4 text-slate-50">
                <p className="text-sm font-semibold">
                  Compliance-ready by design
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Every critical workflow leaves a durable trail across actor,
                  role, entity, timestamp, and metadata.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
