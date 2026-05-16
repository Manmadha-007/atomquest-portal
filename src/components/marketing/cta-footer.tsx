import Link from "next/link";
import { ArrowRight, BarChart3, ShieldCheck, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SIGN_IN_PATH } from "@/lib/auth";

const footerLinks = [
  ["Platform", "#platform-capabilities"],
  ["Roles", "#role-experience"],
  ["Analytics", "#analytics"],
  ["Governance", "#governance"],
];

const platformSignals = [
  {
    label: "Goal operations",
    icon: Target,
  },
  {
    label: "Enterprise analytics",
    icon: BarChart3,
  },
  {
    label: "Audit governance",
    icon: ShieldCheck,
  },
];

export function CtaFooter() {
  return (
    <footer className="bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="overflow-hidden rounded-lg border bg-slate-950 text-slate-50 shadow-xl shadow-slate-900/10">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
            <div className="max-w-3xl space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                AtomQuest Goal Operations
              </p>
              <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Run quarterly execution with the governance your enterprise
                expects.
              </h2>
              <p className="text-sm leading-7 text-slate-300 sm:text-base">
                Give every employee, manager, and admin the right workspace for
                accountable goals, monitored progress, review discipline, and
                audit-ready reporting.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button asChild size="lg" className="h-11 bg-slate-50 px-4 text-slate-950 hover:bg-slate-200">
                <Link href={SIGN_IN_PATH}>
                  Sign In
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 border-white/20 bg-white/5 px-4 text-slate-50 hover:bg-white/10 hover:text-slate-50"
              >
                <Link href="#platform-capabilities">Explore Platform</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-6 border-t border-white/10 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
            <div className="grid gap-3 sm:grid-cols-3">
              {platformSignals.map((signal) => {
                const Icon = signal.icon;

                return (
                  <div
                    key={signal.label}
                    className="flex items-center gap-2 text-sm text-slate-300"
                  >
                    <span className="flex size-7 items-center justify-center rounded-md bg-white/10 text-slate-50">
                      <Icon className="size-3.5" aria-hidden="true" />
                    </span>
                    {signal.label}
                  </div>
                );
              })}
            </div>

            <nav
              aria-label="Footer"
              className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400"
            >
              {footerLinks.map(([label, href]) => (
                <Link key={label} href={href} className="hover:text-slate-50">
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
