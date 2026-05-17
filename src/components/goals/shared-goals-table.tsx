"use client";

type GoalMeasurementType = "MIN" | "MAX" | "TIMELINE" | "ZERO";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { GitBranch, Link2, UsersRound } from "lucide-react";

import { EmployeeGoalStatusBadge } from "@/components/goals/employee-goal-status-badge";
import { SharedGoalBadge } from "@/components/goals/shared-goal-badge";
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
import type {
  SharedGoalPropagationStatus,
  SharedGoalTableRow,
} from "@/lib/goals/shared-goal-types";

type SharedGoalsTableProps = {
  goals: SharedGoalTableRow[];
  reviewCycleLabel: string;
  scope: "admin" | "manager";
};

type ColumnMeta = {
  headerClassName?: string;
  cellClassName?: string;
};

const measurementLabels = {
  MAX: "Maximize",
  MIN: "Minimize",
  TIMELINE: "Timeline",
  ZERO: "Zero target",
} satisfies Record<GoalMeasurementType, string>;

const propagationBadgeKind = {
  SYNCED: "synced",
  AWAITING_PRIMARY_UPDATE: "pending",
  PRIMARY_LOCKED: "locked",
} as const satisfies Record<
  SharedGoalPropagationStatus,
  "synced" | "pending" | "locked"
>;

const columns: ColumnDef<SharedGoalTableRow>[] = [
  {
    accessorKey: "title",
    header: "Shared KPI",
    cell: ({ row }) => {
      const goal = row.original;

      return (
        <div className="min-w-72 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="line-clamp-2 font-medium text-foreground">
              {goal.title}
            </p>
            <SharedGoalBadge kind="linked" />
          </div>
          <p className="line-clamp-2 max-w-xl text-xs leading-5 text-muted-foreground">
            {goal.description ?? "No description provided"}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex max-w-44 items-center truncate rounded-md bg-muted px-2 py-1 font-medium">
              {goal.thrustArea}
            </span>
            <span>{measurementLabels[goal.measurementType]}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "primaryOwnerName",
    header: "Primary owner",
    cell: ({ row }) => (
      <div className="min-w-48">
        <div className="flex items-center gap-2">
          <SharedGoalBadge kind="primary" />
          <p className="font-medium">{row.original.primaryOwnerName}</p>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {row.original.primaryOwnerMeta}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "linkedEmployeeName",
    header: "Linked employee",
    cell: ({ row }) => (
      <div className="min-w-48">
        <p className="font-medium">{row.original.linkedEmployeeName}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {row.original.linkedEmployeeMeta}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {row.original.department ?? "No department"}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "weightage",
    header: "Weight",
    cell: ({ row }) => (
      <div className="min-w-24">
        <span className="font-medium">{row.original.weightage}%</span>
        <p className="mt-1 text-xs text-muted-foreground">recipient-owned</p>
      </div>
    ),
  },
  {
    accessorKey: "progressPercentage",
    header: "Derived progress",
    cell: ({ row }) => {
      const progress = row.original.progressPercentage;

      return (
        <div className="min-w-36 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium">{progress}%</span>
            <span className="text-muted-foreground">from primary</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            aria-label={`${progress}% progress`}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {row.original.achievementValueLabel}
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: "propagationStatus",
    header: "Propagation",
    cell: ({ row }) => (
      <div className="min-w-40 space-y-1">
        <SharedGoalBadge
          kind={propagationBadgeKind[row.original.propagationStatus]}
        />
        <p className="text-xs text-muted-foreground">
          {row.original.latestUpdateLabel}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Goal status",
    cell: ({ row }) => <EmployeeGoalStatusBadge status={row.original.status} />,
    meta: {
      headerClassName: "hidden lg:table-cell",
      cellClassName: "hidden lg:table-cell",
    } satisfies ColumnMeta,
  },
  {
    accessorKey: "createdDateLabel",
    header: "Created",
    cell: ({ row }) => (
      <div className="min-w-36">
        <p>{row.original.createdDateLabel}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          by {row.original.createdByName}
        </p>
      </div>
    ),
    meta: {
      headerClassName: "hidden xl:table-cell",
      cellClassName: "hidden xl:table-cell text-muted-foreground",
    } satisfies ColumnMeta,
  },
];

function getColumnMeta<TData, TValue>(column: ColumnDef<TData, TValue>) {
  return column.meta as ColumnMeta | undefined;
}

export function SharedGoalsTable({
  goals,
  reviewCycleLabel,
  scope,
}: SharedGoalsTableProps) {
  // TanStack Table owns internal function state; keep the required hook local.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: goals,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const title =
    scope === "admin" ? "Enterprise shared goals" : "Team shared goals";

  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Linked KPI assignments and parent-derived progress for{" "}
              {reviewCycleLabel}.
            </CardDescription>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
            <GitBranch className="size-3.5" aria-hidden="true" />
            {goals.length} linked assignment{goals.length === 1 ? "" : "s"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {goals.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
              {scope === "admin" ? (
                <UsersRound className="size-6" aria-hidden="true" />
              ) : (
                <Link2 className="size-6" aria-hidden="true" />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-base font-semibold">
                No shared goals yet
              </h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Propagate an approved primary KPI to employees to create linked
                goals with parent-synced progress.
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
