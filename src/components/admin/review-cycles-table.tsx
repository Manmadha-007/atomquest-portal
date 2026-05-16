"use client";

type QuarterlyStatus = "NOT_STARTED" | "ON_TRACK" | "COMPLETED" | "DELAYED";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { CheckCircle2, CirclePause, FileClock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { updateReviewCycleActivation } from "@/actions/admin/create-review-cycle";
import { Badge } from "@/components/ui/badge";
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

export type ReviewCycleTableRow = {
  id: string;
  name: string;
  year: number;
  quarter: number;
  status: QuarterlyStatus;
  isActive: boolean;
  startDateLabel: string;
  endDateLabel: string;
  submissionDeadlineLabel: string;
  lockDateLabel: string;
  goalCount: number;
  createdByLabel: string;
};

type ReviewCyclesTableProps = {
  cycles: ReviewCycleTableRow[];
};

type ColumnMeta = {
  headerClassName?: string;
  cellClassName?: string;
};

const statusConfig = {
  ["NOT_STARTED"]: {
    label: "Not started",
    className:
      "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300",
  },
  ["ON_TRACK"]: {
    label: "On track",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300",
  },
  ["COMPLETED"]: {
    label: "Completed",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  ["DELAYED"]: {
    label: "Delayed",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  },
} satisfies Record<QuarterlyStatus, { label: string; className: string }>;

function CycleStatusBadge({ status }: { status: QuarterlyStatus }) {
  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={cn("h-6 rounded-md px-2 font-medium", config.className)}
    >
      {config.label}
    </Badge>
  );
}

function ActivationButton({ cycle }: { cycle: ReviewCycleTableRow }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const nextActiveState = !cycle.isActive;

  async function handleActivationChange() {
    setIsPending(true);
    const result = await updateReviewCycleActivation({
      reviewCycleId: cycle.id,
      isActive: nextActiveState,
    });
    setIsPending(false);

    if (!result.ok) {
      toast.error("Cycle activation was not updated", {
        description: result.message,
      });
      return;
    }

    toast.success(nextActiveState ? "Cycle activated" : "Cycle deactivated", {
      description: result.message,
    });
    router.refresh();
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={cycle.isActive ? "outline" : "default"}
      disabled={isPending}
      onClick={handleActivationChange}
    >
      {cycle.isActive ? (
        <CirclePause className="size-3.5" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
      )}
      {cycle.isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}

const columns: ColumnDef<ReviewCycleTableRow>[] = [
  {
    accessorKey: "name",
    header: "Cycle",
    cell: ({ row }) => {
      const cycle = row.original;

      return (
        <div className="min-w-56">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{cycle.name}</p>
            {cycle.isActive ? (
              <Badge className="h-6 rounded-md bg-emerald-600 px-2 text-white">
                Active
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Q{cycle.quarter} {cycle.year} - {cycle.goalCount} goals
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <CycleStatusBadge status={row.original.status} />,
  },
  {
    id: "window",
    header: "Window",
    cell: ({ row }) => (
      <div className="min-w-48 text-sm">
        <p>{row.original.startDateLabel}</p>
        <p className="text-muted-foreground">to {row.original.endDateLabel}</p>
      </div>
    ),
  },
  {
    accessorKey: "submissionDeadlineLabel",
    header: "Submission",
    cell: ({ row }) => row.original.submissionDeadlineLabel,
    meta: {
      headerClassName: "hidden lg:table-cell",
      cellClassName: "hidden lg:table-cell text-muted-foreground",
    } satisfies ColumnMeta,
  },
  {
    accessorKey: "lockDateLabel",
    header: "Lock date",
    cell: ({ row }) => row.original.lockDateLabel,
    meta: {
      headerClassName: "hidden xl:table-cell",
      cellClassName: "hidden xl:table-cell text-muted-foreground",
    } satisfies ColumnMeta,
  },
  {
    accessorKey: "createdByLabel",
    header: "Created by",
    cell: ({ row }) => row.original.createdByLabel,
    meta: {
      headerClassName: "hidden xl:table-cell",
      cellClassName: "hidden xl:table-cell text-muted-foreground",
    } satisfies ColumnMeta,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex justify-end">
        <ActivationButton cycle={row.original} />
      </div>
    ),
  },
];

function getColumnMeta<TData, TValue>(column: ColumnDef<TData, TValue>) {
  return column.meta as ColumnMeta | undefined;
}

export function ReviewCyclesTable({ cycles }: ReviewCyclesTableProps) {
  // TanStack Table owns internal function state; keep the required hook local.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: cycles,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b">
        <CardTitle>Review cycles</CardTitle>
        <CardDescription>
          Govern quarterly windows and active-cycle availability.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {cycles.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
              <FileClock className="size-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-base font-semibold">
                No review cycles yet
              </h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Create the first quarterly cycle to open governed goal planning.
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
