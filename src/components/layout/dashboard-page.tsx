import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DashboardPageProps = {
  children: ReactNode;
  className?: string;
};

type DashboardHeroProps = {
  children?: ReactNode;
  className?: string;
  description: string;
  eyebrow: string;
  gradientClassName?: string;
  icon: LucideIcon;
  summaryClassName?: string;
  title: string;
};

type DashboardMetricGridProps = {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
};

export function DashboardPage({
  children,
  className,
}: DashboardPageProps) {
  return (
    <div className={cn("grid gap-5 lg:gap-6", className)}>
      {children}
    </div>
  );
}

export function DashboardHero({
  children,
  className,
  description,
  eyebrow,
  gradientClassName = "from-sky-500/10 via-emerald-500/5 to-transparent",
  icon: Icon,
  summaryClassName,
  title,
}: DashboardHeroProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sm",
        className,
      )}
    >
      <div className="relative isolate p-4 sm:p-5 lg:p-6">
        <div
          className={cn(
            "absolute inset-y-0 right-0 -z-10 hidden w-1/2 bg-gradient-to-l lg:block",
            gradientClassName,
          )}
        />

        <div
          className={cn(
            "grid gap-4",
            children &&
              "lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:items-center",
          )}
        >
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <Icon className="size-3.5" aria-hidden="true" />
              {eyebrow}
            </div>

            <div className="space-y-2">
              <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                {title}
              </h1>

              <p className="text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
          </div>

          {children ? (
            <div
              className={cn(
                "grid min-w-0 gap-3 rounded-lg border bg-background/80 p-3 shadow-sm sm:p-4",
                summaryClassName,
              )}
            >
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function DashboardMetricGrid({
  ariaLabel,
  children,
  className,
}: DashboardMetricGridProps) {
  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        "grid items-stretch gap-3 sm:grid-cols-2 lg:gap-4",
        className,
      )}
    >
      {children}
    </section>
  );
}
