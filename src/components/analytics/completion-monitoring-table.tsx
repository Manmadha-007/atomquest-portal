"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { AlertTriangle, ClipboardCheck } from "lucide-react";

import { CompletionStatusBadge } from "@/components/analytics/completion-status-badge";
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
import type {
  CompletionMonitoring,
  CompletionMonitoringRow,
} from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

type CompletionMonitoringTableProps = {
  completionMonitoring: CompletionMonitoring;
  isLoading?: boolean;
  scopeLabel: string;
};

type ColumnMeta = {
  cellClassName?: string;
  headerClassName?: string;
};

type SummaryMetric = {
  label: string;
  tone: string;
  value: number | string;
};

const columns: ColumnDef<CompletionMonitoringRow>[] = [
  {
    accessorKey: "employeeName",
    header: "Employee",
    cell: ({ row }) => (
      <div className="min-w-52">
        <p className="font-medium text-foreground">{row.original.employeeName}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {row.original.employeeEmail}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "managerName",
    header: "Manager",
    cell: ({ row }) => row.original.managerName,
    meta: {
      headerClassName: "hidden lg:table-cell",
      cellClassName: "hidden lg:table-cell text-muted-foreground",
    } satisfies ColumnMeta,
  },
  {
    accessorKey: "reviewCycleLabel",
    header: "Current review cycle",
    cell: ({ row }) => row.original.reviewCycleLabel,
    meta: {
      headerClassName: "hidden xl:table-cell",
      cellClassName: "hidden xl:table-cell text-muted-foreground",
    } satisfies ColumnMeta,
  },
  {
    accessorKey: "quarterlySubmissionStatus",
    header: "Quarterly submission",
    cell: ({ row }) => (
      <CompletionStatusBadge
        status={row.original.quarterlySubmissionStatus}
        label={row.original.quarterlySubmissionLabel}
      />
    ),
  },
  {
    accessorKey: "managerReviewStatus",
    header: "Manager review",
    cell: ({ row }) => (
      <CompletionStatusBadge
        status={row.original.managerReviewStatus}
        label={row.original.managerReviewLabel}
      />
    ),
  },
  {
    accessorKey: "lastUpdateTimestamp",
    header: "Last update",
    cell: ({ row }) => row.original.lastUpdateTimestamp,
    meta: {
      headerClassName: "hidden 2xl:table-cell",
      cellClassName: "hidden 2xl:table-cell text-muted-foreground",
    } satisfies ColumnMeta,
  },
  {
    accessorKey: "completionPercentage",
    header: "Completion",
    cell: ({ row }) => {
      const progress = row.original.completionPercentage;

      return (
        <div className="min-w-36 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium">{progress}%</span>
            <span className="text-muted-foreground">submitted</span>
          </div>
          <div
            aria-label={`${progress}% quarterly completion`}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={cn(
                "h-full rounded-full transition-all",
                row.original.isOverdue ? "bg-amber-500" : "bg-emerald-600",
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
      <div
        className={cn(
          "inline-flex h-6 items-center gap-1 rounded-md border px-2 text-xs font-medium",
          row.original.isOverdue
            ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
            : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300",
        )}
      >
        {row.original.isOverdue ? (
          <AlertTriangle className="size-3" aria-hidden="true" />
        ) : null}
        {row.original.overdueLabel}
      </div>
    ),
  },
];

function getColumnMeta<TData, TValue>(column: ColumnDef<TData, TValue>) {
  return column.meta as ColumnMeta | undefined;
}

function buildSummaryMetrics(
  monitoring: CompletionMonitoring,
): SummaryMetric[] {
  const summary = monitoring.summary;

  return [
    {
      label: "Completed updates",
      value: summary.completedQuarterlyUpdates,
      tone: "text-emerald-700 dark:text-emerald-300",
    },
    {
      label: "Pending updates",
      value: summary.pendingQuarterlyUpdates,
      tone: "text-slate-700 dark:text-slate-300",
    },
    {
      label: "Overdue updates",
      value: summary.overdueQuarterlyUpdates,
      tone: "text-amber-700 dark:text-amber-300",
    },
    {
      label: "No submissions",
      value: summary.noSubmissionEmployees,
      tone: "text-muted-foreground",
    },
    {
      label: "Reviewed",
      value: summary.reviewedSubmissions,
      tone: "text-blue-700 dark:text-blue-300",
    },
    {
      label: "Pending reviews",
      value: summary.pendingReviews,
      tone: "text-violet-700 dark:text-violet-300",
    },
    {
      label: "Overdue reviews",
      value: summary.overdueReviews,
      tone: "text-amber-700 dark:text-amber-300",
    },
  ];
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <TableRow key={index}>
          {columns.map((column, columnIndex) => {
            const meta = getColumnMeta(column);

            return (
              <TableCell
                key={`${index}-${columnIndex}`}
                className={cn("px-4 py-4", meta?.cellClassName)}
              >
                <div className="h-4 w-full max-w-36 animate-pulse rounded bg-muted" />
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </>
  );
}

export function CompletionMonitoringTable({
  completionMonitoring,
  isLoading = false,
  scopeLabel,
}: CompletionMonitoringTableProps) {
  const rows = [...completionMonitoring.rows];
  const summaryMetrics = buildSummaryMetrics(completionMonitoring);

  // TanStack Table owns internal function state; keep the required hook local.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-1">
            <CardTitle>Completion monitoring</CardTitle>
            <CardDescription>
              Current-cycle submission and manager review visibility for{" "}
              {scopeLabel}.
            </CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {summaryMetrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-lg border bg-background px-3 py-2"
              >
                <p className="text-[0.7rem] font-medium uppercase text-muted-foreground">
                  {metric.label}
                </p>
                <p className={cn("mt-1 text-lg font-semibold", metric.tone)}>
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 && !isLoading ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
              <ClipboardCheck className="size-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-base font-semibold">
                No completion records yet
              </h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Completion monitoring appears once an active review cycle and
                scoped employees are available.
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
                {isLoading ? (
                  <LoadingRows />
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/30">
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
        {rows.length > 0 ? (
          <div className="flex flex-col gap-2 border-t bg-muted/20 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Quarterly completion:{" "}
              {completionMonitoring.summary.quarterlyCompletionPercentage}%
            </span>
            <span>
              Manager review completion:{" "}
              {completionMonitoring.summary.managerReviewPercentage}%
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
