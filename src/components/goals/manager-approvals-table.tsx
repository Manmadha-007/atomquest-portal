"use client";

type GoalMeasurementType = "MIN" | "MAX" | "TIMELINE" | "ZERO";
type GoalStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "LOCKED";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";

import { EmployeeGoalStatusBadge } from "@/components/goals/employee-goal-status-badge";
import { GoalApprovalDialog } from "@/components/goals/goal-approval-dialog";
import { Button } from "@/components/ui/button";
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

export type ManagerApprovalTableRow = {
  id: string;
  employeeName: string;
  employeeEmail: string;
  employeeTitle: string | null;
  department: string | null;
  title: string;
  measurementType: GoalMeasurementType;
  weightage: number;
  priority: number;
  submittedDateLabel: string;
  progressPercentage: number;
  status: GoalStatus;
};

type ManagerApprovalsTableProps = {
  goals: ManagerApprovalTableRow[];
  reviewCycleLabel: string;
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

const priorityLabels: Record<number, string> = {
  1: "Critical",
  2: "High",
  3: "Medium",
  4: "Low",
};

const columns: ColumnDef<ManagerApprovalTableRow>[] = [
  {
    accessorKey: "employeeName",
    header: "Employee",
    cell: ({ row }) => {
      const goal = row.original;
      const initials = goal.employeeName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      return (
        <div className="flex min-w-52 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {goal.employeeName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {goal.employeeTitle ?? goal.employeeEmail}
            </p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "title",
    header: "Goal",
    cell: ({ row }) => (
      <div className="min-w-64">
        <p className="line-clamp-2 font-medium text-foreground">
          {row.original.title}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {row.original.department ?? "No department"} -{" "}
          {measurementLabels[row.original.measurementType]}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "measurementType",
    header: "Measure",
    cell: ({ row }) => measurementLabels[row.original.measurementType],
    meta: {
      headerClassName: "hidden lg:table-cell",
      cellClassName: "hidden lg:table-cell text-muted-foreground",
    } satisfies ColumnMeta,
  },
  {
    accessorKey: "weightage",
    header: "Weight",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.weightage}%</span>
    ),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => priorityLabels[row.original.priority] ?? "Medium",
    meta: {
      headerClassName: "hidden md:table-cell",
      cellClassName: "hidden md:table-cell",
    } satisfies ColumnMeta,
  },
  {
    accessorKey: "submittedDateLabel",
    header: "Submitted",
    cell: ({ row }) => row.original.submittedDateLabel,
    meta: {
      headerClassName: "hidden xl:table-cell",
      cellClassName: "hidden xl:table-cell text-muted-foreground",
    } satisfies ColumnMeta,
  },
  {
    accessorKey: "progressPercentage",
    header: "Progress",
    cell: ({ row }) => {
      const progress = row.original.progressPercentage;

      return (
        <div className="min-w-28 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium">{progress}%</span>
            <span className="text-muted-foreground">done</span>
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
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const goal = row.original;

      return (
        <div className="flex min-w-40 justify-end gap-2">
          <GoalApprovalDialog goal={goal} mode="reject">
            <Button variant="outline" size="sm">
              <XCircle className="size-3.5" aria-hidden="true" />
              Reject
            </Button>
          </GoalApprovalDialog>
          <GoalApprovalDialog goal={goal} mode="approve">
            <Button size="sm">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Approve
            </Button>
          </GoalApprovalDialog>
        </div>
      );
    },
  },
];

function getColumnMeta<TData, TValue>(column: ColumnDef<TData, TValue>) {
  return column.meta as ColumnMeta | undefined;
}

export function ManagerApprovalsTable({
  goals,
  reviewCycleLabel,
}: ManagerApprovalsTableProps) {
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
            <CardTitle>Submitted goals</CardTitle>
            <CardDescription>
              Direct-report approvals awaiting decision for {reviewCycleLabel}.
            </CardDescription>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
            {goals.length} pending review{goals.length === 1 ? "" : "s"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {goals.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="rounded-xl bg-muted p-3 text-muted-foreground">
              <ClipboardCheck className="size-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-base font-semibold">
                No submitted goals to review
              </h3>
              <p className="max-w-md text-sm text-muted-foreground">
                New submissions from your direct reports will appear here for
                approval or rejection.
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
                    id={`goal-${row.original.id}`}
                    className="hover:bg-muted/30"
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
