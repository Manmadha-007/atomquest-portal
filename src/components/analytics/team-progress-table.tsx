"use client";

type GoalStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "LOCKED";
type QuarterlyStatus = "NOT_STARTED" | "ON_TRACK" | "COMPLETED" | "DELAYED";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { AlertTriangle, ClipboardList, Clock3 } from "lucide-react";

import { EmployeeGoalStatusBadge } from "@/components/goals/employee-goal-status-badge";
import { QuarterlyStatusBadge } from "@/components/goals/quarterly-status-badge";
import { SharedGoalBadge } from "@/components/goals/shared-goal-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type TeamProgressApprovalState =
  | "approved"
  | "draft"
  | "locked"
  | "not_required"
  | "pending"
  | "rejected";

export type TeamProgressUpdateRecency = "current" | "missing" | "stale";

export type TeamProgressTableRow = {
  id: string;
  employeeName: string;
  employeeEmail: string;
  employeeTitle: string | null;
  department: string | null;
  goalTitle: string;
  goalDescription: string | null;
  status: GoalStatus;
  progressPercentage: number;
  isOverdue: boolean;
  overdueLabel: string;
  latestQuarterlyStatus: QuarterlyStatus | null;
  latestQuarterlyUpdateLabel: string;
  updateRecency: TeamProgressUpdateRecency;
  updateRecencyLabel: string;
  isSharedGoal: boolean;
  primaryOwnerName: string | null;
  approvalState: TeamProgressApprovalState;
  approvalStateLabel: string;
  approvalStateDetail: string;
  dueDateLabel: string;
};

type TeamProgressTableProps = {
  goals: TeamProgressTableRow[];
  reviewCycleLabel: string;
};

type ColumnMeta = {
  headerClassName?: string;
  cellClassName?: string;
};

const approvalStateConfig = {
  approved: {
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  draft: {
    className:
      "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300",
  },
  locked: {
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  },
  not_required: {
    className:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300",
  },
  pending: {
    className:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300",
  },
  rejected: {
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300",
  },
} satisfies Record<TeamProgressApprovalState, { className: string }>;

const recencyConfig = {
  current: {
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  missing: {
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  },
  stale: {
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300",
  },
} satisfies Record<TeamProgressUpdateRecency, { className: string }>;

function getInitials(name: string, email: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || email.slice(0, 2).toUpperCase();
}

function OverdueBadge({
  isOverdue,
  label,
}: {
  isOverdue: boolean;
  label: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 rounded-md px-2 font-medium",
        isOverdue
          ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
          : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300",
      )}
    >
      {isOverdue ? <AlertTriangle className="size-3" aria-hidden="true" /> : null}
      {label}
    </Badge>
  );
}

function LatestQuarterlyUpdate({
  label,
  status,
}: {
  label: string;
  status: QuarterlyStatus | null;
}) {
  return (
    <div className="min-w-40 space-y-1">
      {status ? (
        <QuarterlyStatusBadge status={status} />
      ) : (
        <Badge
          variant="outline"
          className="h-6 rounded-md border-slate-200 bg-slate-100 px-2 font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
        >
          No update
        </Badge>
      )}
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function UpdateRecencyBadge({
  label,
  recency,
}: {
  label: string;
  recency: TeamProgressUpdateRecency;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 rounded-md px-2 font-medium",
        recencyConfig[recency].className,
      )}
    >
      {recency !== "current" ? <Clock3 className="size-3" aria-hidden="true" /> : null}
      {label}
    </Badge>
  );
}

function ApprovalBadge({ goal }: { goal: TeamProgressTableRow }) {
  return (
    <div className="min-w-40 space-y-1">
      <Badge
        variant="outline"
        className={cn(
          "h-6 rounded-md px-2 font-medium",
          approvalStateConfig[goal.approvalState].className,
        )}
      >
        {goal.approvalStateLabel}
      </Badge>
      <p className="text-xs text-muted-foreground">
        {goal.approvalStateDetail}
      </p>
    </div>
  );
}

const columns: ColumnDef<TeamProgressTableRow>[] = [
  {
    accessorKey: "employeeName",
    header: "Employee",
    cell: ({ row }) => {
      const goal = row.original;

      return (
        <div className="flex min-w-56 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
            {getInitials(goal.employeeName, goal.employeeEmail)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {goal.employeeName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {goal.employeeTitle ?? goal.employeeEmail}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {goal.department ?? "No department"}
            </p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "goalTitle",
    header: "Goal title",
    cell: ({ row }) => {
      const goal = row.original;

      return (
        <div className="min-w-72 space-y-1">
          <p className="line-clamp-2 font-medium text-foreground">
            {goal.goalTitle}
          </p>
          <p className="line-clamp-2 max-w-xl text-xs leading-5 text-muted-foreground">
            {goal.goalDescription ?? "No description provided"}
          </p>
          {goal.primaryOwnerName ? (
            <p className="text-xs text-muted-foreground">
              Progress synced from {goal.primaryOwnerName}
            </p>
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <EmployeeGoalStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "progressPercentage",
    header: "Progress",
    cell: ({ row }) => {
      const goal = row.original;
      const progress = goal.progressPercentage;

      return (
        <div className="min-w-32 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium">{progress}%</span>
            <span className="text-muted-foreground">complete</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            aria-label={`${progress}% progress`}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all",
                progress >= 100
                  ? "bg-emerald-600"
                  : goal.isOverdue || goal.updateRecency !== "current"
                    ? "bg-amber-500"
                    : "bg-primary",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "overdueLabel",
    header: "Overdue",
    cell: ({ row }) => (
      <OverdueBadge
        isOverdue={row.original.isOverdue}
        label={row.original.overdueLabel}
      />
    ),
  },
  {
    accessorKey: "latestQuarterlyStatus",
    header: "Latest update",
    cell: ({ row }) => (
      <LatestQuarterlyUpdate
        label={row.original.latestQuarterlyUpdateLabel}
        status={row.original.latestQuarterlyStatus}
      />
    ),
  },
  {
    accessorKey: "updateRecency",
    header: "Recency",
    cell: ({ row }) => (
      <UpdateRecencyBadge
        label={row.original.updateRecencyLabel}
        recency={row.original.updateRecency}
      />
    ),
  },
  {
    accessorKey: "isSharedGoal",
    header: "Shared",
    cell: ({ row }) =>
      row.original.isSharedGoal ? (
        <SharedGoalBadge kind="linked" />
      ) : (
        <SharedGoalBadge kind="primary" />
      ),
    meta: {
      headerClassName: "hidden xl:table-cell",
      cellClassName: "hidden xl:table-cell",
    } satisfies ColumnMeta,
  },
  {
    accessorKey: "approvalState",
    header: "Approval",
    cell: ({ row }) => <ApprovalBadge goal={row.original} />,
  },
  {
    accessorKey: "dueDateLabel",
    header: "Due date",
    cell: ({ row }) => row.original.dueDateLabel,
    meta: {
      headerClassName: "hidden 2xl:table-cell",
      cellClassName: "hidden 2xl:table-cell text-muted-foreground",
    } satisfies ColumnMeta,
  },
];

function getColumnMeta<TData, TValue>(column: ColumnDef<TData, TValue>) {
  return column.meta as ColumnMeta | undefined;
}

export function TeamProgressTable({
  goals,
  reviewCycleLabel,
}: TeamProgressTableProps) {
  // TanStack Table owns internal function state; keep the required hook local.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: goals,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Team progress monitoring</CardTitle>
            <CardDescription>
              Goal-level execution drift, update recency, and approval state for{" "}
              {reviewCycleLabel}.
            </CardDescription>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
            <ClipboardList className="size-3.5" aria-hidden="true" />
            {goals.length} goal{goals.length === 1 ? "" : "s"} monitored
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {goals.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="rounded-xl bg-muted p-3 text-muted-foreground">
              <ClipboardList className="size-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-base font-semibold">
                No team progress signals yet
              </h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Direct-report goals and propagated KPIs will appear here once
                the active cycle has execution activity.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-muted/40">
                    {headerGroup.headers.map((header) => {
                      const meta = getColumnMeta(header.column.columnDef);

                      return (
                        <TableHead
                          key={header.id}
                          className={cn(
                            "h-10 px-4 text-xs uppercase tracking-wide text-muted-foreground",
                            meta?.headerClassName,
                          )}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "hover:bg-muted/30",
                      (row.original.isOverdue ||
                        row.original.updateRecency !== "current") &&
                        "bg-amber-50/40 hover:bg-amber-50/70 dark:bg-amber-950/10 dark:hover:bg-amber-950/20",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = getColumnMeta(cell.column.columnDef);

                      return (
                        <TableCell
                          key={cell.id}
                          className={cn("px-4 py-3", meta?.cellClassName)}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
