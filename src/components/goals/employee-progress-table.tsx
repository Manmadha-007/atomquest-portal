"use client";

import type { GoalStatus, QuarterlyStatus } from "@prisma/client";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { AlertTriangle, Activity, CalendarClock } from "lucide-react";

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

export type EmployeeProgressTableRow = {
  id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  progressPercentage: number;
  dueDateLabel: string;
  isSharedGoal: boolean;
  primaryOwnerName: string | null;
  isOverdue: boolean;
  overdueLabel: string;
  latestQuarterlyStatus: QuarterlyStatus | null;
  latestQuarterlyUpdateLabel: string;
  latestUpdateTimestampLabel: string;
};

type EmployeeProgressTableProps = {
  goals: EmployeeProgressTableRow[];
  reviewCycleLabel: string;
};

type ColumnMeta = {
  headerClassName?: string;
  cellClassName?: string;
};

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

const columns: ColumnDef<EmployeeProgressTableRow>[] = [
  {
    accessorKey: "title",
    header: "Goal title",
    cell: ({ row }) => {
      const goal = row.original;

      return (
        <div className="min-w-72 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="line-clamp-2 font-medium text-foreground">
              {goal.title}
            </p>
            {goal.isSharedGoal ? <SharedGoalBadge kind="linked" /> : null}
          </div>
          <p className="line-clamp-2 max-w-xl text-xs leading-5 text-muted-foreground">
            {goal.description ?? "No description provided"}
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
                  : goal.isOverdue
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
    accessorKey: "dueDateLabel",
    header: "Due date",
    cell: ({ row }) => row.original.dueDateLabel,
    meta: {
      headerClassName: "hidden lg:table-cell",
      cellClassName: "hidden lg:table-cell text-muted-foreground",
    } satisfies ColumnMeta,
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
    accessorKey: "latestUpdateTimestampLabel",
    header: "Updated",
    cell: ({ row }) => row.original.latestUpdateTimestampLabel,
    meta: {
      headerClassName: "hidden 2xl:table-cell",
      cellClassName: "hidden 2xl:table-cell text-muted-foreground",
    } satisfies ColumnMeta,
  },
];

function getColumnMeta<TData, TValue>(column: ColumnDef<TData, TValue>) {
  return column.meta as ColumnMeta | undefined;
}

export function EmployeeProgressTable({
  goals,
  reviewCycleLabel,
}: EmployeeProgressTableProps) {
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
            <CardTitle>Goal execution table</CardTitle>
            <CardDescription>
              Progress state, update cadence, and overdue exposure for{" "}
              {reviewCycleLabel}.
            </CardDescription>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            {goals.length} active goal{goals.length === 1 ? "" : "s"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {goals.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
              <Activity className="size-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-base font-semibold">
                No execution signals yet
              </h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Active goals, quarterly updates, and propagated shared KPIs will
                appear here once the cycle is underway.
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
                            "h-11 px-4 text-xs uppercase tracking-wide text-muted-foreground",
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
                      row.original.isOverdue &&
                        "bg-amber-50/40 hover:bg-amber-50/70 dark:bg-amber-950/10 dark:hover:bg-amber-950/20",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = getColumnMeta(cell.column.columnDef);

                      return (
                        <TableCell
                          key={cell.id}
                          className={cn("px-4 py-4", meta?.cellClassName)}
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
