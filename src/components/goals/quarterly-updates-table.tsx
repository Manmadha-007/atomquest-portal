"use client";

type QuarterlyStatus = "NOT_STARTED" | "ON_TRACK" | "COMPLETED" | "DELAYED";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ListChecks } from "lucide-react";

import { QuarterlyStatusBadge } from "@/components/goals/quarterly-status-badge";
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

export type QuarterlyUpdateTableRow = {
  id: string;
  goalTitle: string;
  progressPercentage: number;
  quarterlyStatus: QuarterlyStatus;
  achievementValueLabel: string;
  updatedDateLabel: string;
  latestCommentary: string;
};

type QuarterlyUpdatesTableProps = {
  updates: QuarterlyUpdateTableRow[];
  reviewCycleLabel: string;
};

type ColumnMeta = {
  headerClassName?: string;
  cellClassName?: string;
};

const columns: ColumnDef<QuarterlyUpdateTableRow>[] = [
  {
    accessorKey: "goalTitle",
    header: "Goal",
    cell: ({ row }) => (
      <div className="min-w-64">
        <p className="line-clamp-2 font-medium text-foreground">
          {row.original.goalTitle}
        </p>
        <p className="mt-1 line-clamp-2 max-w-xl text-xs leading-5 text-muted-foreground">
          {row.original.latestCommentary}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "progressPercentage",
    header: "Current progress",
    cell: ({ row }) => {
      const progress = row.original.progressPercentage;

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
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "quarterlyStatus",
    header: "Status",
    cell: ({ row }) => (
      <QuarterlyStatusBadge status={row.original.quarterlyStatus} />
    ),
  },
  {
    accessorKey: "achievementValueLabel",
    header: "Achievement",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.achievementValueLabel}</span>
    ),
  },
  {
    accessorKey: "updatedDateLabel",
    header: "Updated",
    cell: ({ row }) => row.original.updatedDateLabel,
    meta: {
      headerClassName: "hidden lg:table-cell",
      cellClassName: "hidden lg:table-cell text-muted-foreground",
    } satisfies ColumnMeta,
  },
  {
    accessorKey: "latestCommentary",
    header: "Latest commentary",
    cell: ({ row }) => (
      <p className="line-clamp-2 min-w-64 max-w-xl text-sm text-muted-foreground">
        {row.original.latestCommentary}
      </p>
    ),
    meta: {
      headerClassName: "hidden xl:table-cell",
      cellClassName: "hidden xl:table-cell",
    } satisfies ColumnMeta,
  },
];

function getColumnMeta<TData, TValue>(column: ColumnDef<TData, TValue>) {
  return column.meta as ColumnMeta | undefined;
}

export function QuarterlyUpdatesTable({
  updates,
  reviewCycleLabel,
}: QuarterlyUpdatesTableProps) {
  // TanStack Table owns internal function state; keep the required hook local.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: updates,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Quarterly update history</CardTitle>
            <CardDescription>
              Submitted progress snapshots for {reviewCycleLabel}.
            </CardDescription>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
            {updates.length} update{updates.length === 1 ? "" : "s"} recorded
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {updates.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="rounded-xl bg-muted p-3 text-muted-foreground">
              <ListChecks className="size-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-base font-semibold">
                No quarterly updates yet
              </h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Submit progress against an approved goal to create the first
                historical check-in for this review cycle.
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
                  <TableRow key={row.id} className="hover:bg-muted/30">
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
