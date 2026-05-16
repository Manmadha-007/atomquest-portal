import {
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GitBranch,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type TeamActivityFeedItemType =
  | "approval"
  | "feedback"
  | "governance"
  | "goal"
  | "rejection"
  | "shared"
  | "update";

export type TeamActivityFeedItem = {
  id: string;
  type: TeamActivityFeedItemType;
  title: string;
  description: string;
  actorLabel: string;
  employeeLabel: string;
  timestampLabel: string;
};

type TeamActivityFeedProps = {
  items: TeamActivityFeedItem[];
};

const activityConfig = {
  approval: {
    icon: CheckCircle2,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
  },
  feedback: {
    icon: MessageSquareText,
    tone: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900",
  },
  governance: {
    icon: LockKeyhole,
    tone: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
  },
  goal: {
    icon: FileText,
    tone: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-800",
  },
  rejection: {
    icon: XCircle,
    tone: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900",
  },
  shared: {
    icon: GitBranch,
    tone: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900",
  },
  update: {
    icon: RefreshCw,
    tone: "bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:ring-cyan-900",
  },
} satisfies Record<TeamActivityFeedItemType, { icon: LucideIcon; tone: string }>;

export function TeamActivityFeed({ items }: TeamActivityFeedProps) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b">
        <CardTitle>Team activity feed</CardTitle>
        <CardDescription>
          Recent submissions, manager reviews, shared-goal events, and
          governance changes for direct reports.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
              <ClipboardCheck className="size-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-base font-semibold">
                No recent team activity
              </h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Quarterly updates, approvals, rejections, shared-goal changes,
                and governance events will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {items.map((item) => {
              const config = activityConfig[item.type];
              const Icon = config.icon;

              return (
                <div
                  key={item.id}
                  className="grid gap-3 px-4 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-start"
                >
                  <div className={cn("rounded-lg p-2 ring-1", config.tone)}>
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">
                        {item.title}
                      </p>
                      <span className="rounded-md border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {item.employeeLabel}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                      {item.description}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {item.actorLabel}
                    </p>
                  </div>
                  <div className="text-left text-xs text-muted-foreground sm:text-right">
                    {item.timestampLabel}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
