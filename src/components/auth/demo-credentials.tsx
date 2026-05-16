import type { LucideIcon } from "lucide-react";
import { KeyRound, ShieldCheck, Target, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DemoAccount = {
  role: string;
  email: string;
  password: string;
  description: string;
  icon: LucideIcon;
  tone: string;
};

const demoAccounts = [
  {
    role: "Admin",
    email: "admin@atomquest.com",
    password: "Password@123",
    description: "Governance dashboards, review cycles, audit logs, exports.",
    icon: ShieldCheck,
    tone: "bg-slate-100 text-slate-800 ring-slate-200",
  },
  {
    role: "Manager",
    email: "manager@atomquest.com",
    password: "Password@123",
    description: "Team goals, approval queues, shared KPI oversight.",
    icon: UsersRound,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  {
    role: "Employee",
    email: "employee1@atomquest.com",
    password: "Password@123",
    description: "Owned goals, quarterly updates, execution progress.",
    icon: Target,
    tone: "bg-blue-50 text-blue-700 ring-blue-200",
  },
] satisfies DemoAccount[];

export function DemoCredentials() {
  return (
    <section
      aria-labelledby="demo-credentials-title"
      className="rounded-lg border bg-background/95 p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 id="demo-credentials-title" className="text-sm font-semibold">
              Demo credentials
            </h2>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Use these seeded accounts to evaluate the RBAC experience quickly.
          </p>
        </div>
        <Badge variant="outline" className="h-6 rounded-md px-2">
          Evaluator ready
        </Badge>
      </div>

      <div className="mt-4 grid gap-3">
        {demoAccounts.map((account) => {
          const Icon = account.icon;

          return (
            <article
              key={account.role}
              className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[auto_1fr]"
            >
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg ring-1",
                  account.tone,
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </div>

              <div className="min-w-0 space-y-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{account.role}</h3>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {account.description}
                    </p>
                  </div>
                </div>

                <dl className="grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-md border bg-background px-3 py-2">
                    <dt className="font-medium text-muted-foreground">Email</dt>
                    <dd className="mt-1 overflow-x-auto font-mono text-foreground">
                      {account.email}
                    </dd>
                  </div>
                  <div className="rounded-md border bg-background px-3 py-2">
                    <dt className="font-medium text-muted-foreground">
                      Password
                    </dt>
                    <dd className="mt-1 overflow-x-auto font-mono text-foreground">
                      {account.password}
                    </dd>
                  </div>
                </dl>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
