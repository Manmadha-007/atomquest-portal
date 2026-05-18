"use client";

type GoalStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "LOCKED";
type GoalMeasurementType = "MIN" | "MAX" | "TIMELINE" | "ZERO";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { CalendarClock, ListChecks, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { submitGoal } from "@/actions/goals/submit-goal";
import {
  EditGoalDialog,
  type EditableGoalData,
} from "@/components/goals/edit-goal-dialog";
import { EmployeeGoalStatusBadge } from "@/components/goals/employee-goal-status-badge";
import { SharedGoalBadge } from "@/components/goals/shared-goal-badge";
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

export type EmployeeGoalTableRow = {
  id: string;
  title: string;
  description: string | null;
  thrustArea: string;
  status: GoalStatus;
  measurementType: GoalMeasurementType;
  weightage: number;
  progressPercentage: number;
  dueDateLabel: string;
  priority: number;
  isSharedGoal: boolean;
  primaryOwnerName: string | null;
  rejectionComment: string | null;
  /** Editable field data for the revision dialog */
  editData: EditableGoalData | null;
};

type EmployeeGoalsTableProps = {
  goals: EmployeeGoalTableRow[];
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

type PriorityConfig = {
  label: string;
  className: string;
};

const priorityConfig: Record<number, PriorityConfig> = {
  1: {
    label: "Critical",
    className:
      "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  },
  2: {
    label: "High",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  },
  3: {
    label: "Medium",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  },
  4: {
    label: "Low",
    className:
      "bg-slate-100 text-slate-700 dark:bg-slate-900/70 dark:text-slate-300",
  },
};

function getPriorityConfig(priority: number) {
  return priorityConfig[priority] ?? priorityConfig[3];
}

function SubmitGoalButton({
  goalId,
  goalTitle,
}: {
  goalId: string;
  goalTitle: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await submitGoal({ goalId });

      if (!result.ok) {
        toast.error("Goal was not submitted", {
          description: result.message,
        });
        return;
      }

      toast.success("Goal submitted", {
        description: "Your manager can now review this goal.",
      });
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      disabled={isPending}
      onClick={handleSubmit}
      aria-label={`Submit ${goalTitle} for manager approval`}
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Send className="size-3.5" aria-hidden="true" />
      )}
      {isPending ? "Submitting" : "Submit"}
    </Button>
  );
}

const columns: ColumnDef<EmployeeGoalTableRow>[] = [
  {
    accessorKey: "title",
    header: "Goal",
    cell: ({ row }) => {
      const goal = row.original;

      return (
        <div className="min-w-64 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium text-foreground">{goal.title}</div>
            {goal.isSharedGoal ? <SharedGoalBadge kind="linked" /> : null}
          </div>
          {goal.description ? (
            <p className="line-clamp-2 max-w-xl text-xs leading-5 text-muted-foreground">
              {goal.description}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              No description provided
            </p>
          )}
          {goal.primaryOwnerName ? (
            <p className="text-xs text-muted-foreground">
              Progress synced from {goal.primaryOwnerName}
            </p>
          ) : null}
          {goal.status === "REJECTED" && goal.rejectionComment ? (
            <div className="mt-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 dark:border-rose-900 dark:bg-rose-950/30">
              <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
                Manager feedback: <span className="font-normal">{goal.rejectionComment}</span>
              </p>
            </div>
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: "thrustArea",
    header: "Thrust area",
    cell: ({ row }) => (
      <span className="inline-flex max-w-44 items-center truncate rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
        {row.original.thrustArea}
      </span>
    ),
    meta: {
      headerClassName: "hidden md:table-cell",
      cellClassName: "hidden md:table-cell",
    } satisfies ColumnMeta,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <EmployeeGoalStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "measurementType",
    header: "Measure",
    cell: ({ row }) => measurementLabels[row.original.measurementType],
    meta: {
      headerClassName: "hidden lg:table-cell",
      cellClassName: "hidden lg:table-cell",
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
    accessorKey: "progressPercentage",
    header: "Progress",
    cell: ({ row }) => {
      const progress = row.original.progressPercentage;

      return (
        <div className="min-w-28 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium">{progress}%</span>
            <span className="text-muted-foreground">complete</span>
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
    accessorKey: "dueDateLabel",
    header: "Due date",
    cell: ({ row }) => row.original.dueDateLabel,
    meta: {
      headerClassName: "hidden xl:table-cell",
      cellClassName: "hidden xl:table-cell",
    } satisfies ColumnMeta,
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      const priority = getPriorityConfig(row.original.priority);

      return (
        <span
          className={cn(
            "inline-flex rounded-md px-2 py-1 text-xs font-medium",
            priority.className,
          )}
        >
          {priority.label}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const goal = row.original;
      const canSubmit = (goal.status === "DRAFT" || goal.status === "REJECTED") && !goal.isSharedGoal;
      const canRevise = goal.editData !== null;

      return (
        <div className="flex min-w-36 items-center justify-center gap-2">
          {canRevise ? (
            <EditGoalDialog goal={goal.editData!} />
          ) : null}
          {canSubmit ? (
            <SubmitGoalButton goalId={goal.id} goalTitle={goal.title} />
          ) : !canRevise ? (
            <span className="text-xs text-muted-foreground">-</span>
          ) : null}
        </div>
      );
    },
    meta: {
      headerClassName: "text-center",
    } satisfies ColumnMeta,
  },
];

function getColumnMeta<TData, TValue>(column: ColumnDef<TData, TValue>) {
  return column.meta as ColumnMeta | undefined;
}

export function EmployeeGoalsTable({
  goals,
  reviewCycleLabel,
}: EmployeeGoalsTableProps) {
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
            <CardTitle>Active cycle goals</CardTitle>
            <CardDescription>
              KPI-oriented objectives for {reviewCycleLabel}.
            </CardDescription>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            Active review cycle
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {goals.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="rounded-xl bg-muted p-3 text-muted-foreground">
              <ListChecks className="size-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-base font-semibold">
                No active goals yet
              </h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Create draft goals for this review cycle to start tracking
                measurable progress.
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
