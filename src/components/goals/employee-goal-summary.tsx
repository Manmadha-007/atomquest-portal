import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Percent,
  Target,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardMetricGrid } from "@/components/layout/dashboard-page";
import { cn } from "@/lib/utils";

type EmployeeGoalSummaryMetrics = {
  totalGoals: number;
  totalWeightage: number;
  approvedGoals: number;
  draftGoals: number;
  overdueGoals: number;
};

type EmployeeGoalSummaryProps = {
  metrics: EmployeeGoalSummaryMetrics;
};

const summaryItems = [
  {
    key: "totalGoals",
    label: "Total goals",
    description: "Active cycle objectives",
    icon: Target,
    tone: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900",
  },
  {
    key: "totalWeightage",
    label: "Total weightage",
    description: "Allocated goal weight",
    icon: Percent,
    suffix: "%",
    tone: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-900",
  },
  {
    key: "approvedGoals",
    label: "Approved goals",
    description: "Manager approved",
    icon: CheckCircle2,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
  },
  {
    key: "draftGoals",
    label: "Draft goals",
    description: "Not yet submitted",
    icon: FileText,
    tone: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-800",
  },
  {
    key: "overdueGoals",
    label: "Overdue goals",
    description: "Past due and incomplete",
    icon: AlertTriangle,
    tone: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900",
  },
] as const;

export function EmployeeGoalSummary({ metrics }: EmployeeGoalSummaryProps) {
  return (
    <DashboardMetricGrid
      ariaLabel="Employee goal summary"
      className="xl:grid-cols-5"
    >
      {summaryItems.map((item) => {
        const Icon = item.icon;
        const value = metrics[item.key];

        return (
          <Card key={item.key} className="h-full rounded-lg">
            <CardHeader className="grid-cols-[1fr_auto] items-start gap-3">
              <div className="space-y-1">
                <CardDescription>{item.label}</CardDescription>
                <CardTitle className="text-2xl">
                  {value}
                  {"suffix" in item ? item.suffix : ""}
                </CardTitle>
              </div>
              <div className={cn("rounded-lg p-2 ring-1", item.tone)}>
                <Icon className="size-4" aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </DashboardMetricGrid>
  );
}
