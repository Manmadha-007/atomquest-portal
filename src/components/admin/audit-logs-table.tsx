"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ShieldCheck } from "lucide-react";

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

export type AuditLogTableRow = {
  id: string;
  actorLabel: string;
  action: string;
  actionLabel: string;
  entityType: string;
  entityId: string;
  timestampLabel: string;
  metadataSummary: string;
};

type AuditLogsTableProps = {
  logs: AuditLogTableRow[];
};

type ColumnMeta = {
  headerClassName?: string;
  cellClassName?: string;
};

const columns: ColumnDef<AuditLogTableRow>[] = [
  {
    accessorKey: "actorLabel",
    header: "Actor",
    cell: ({ row }) => (
      <div className="min-w-44">
        <p className="font-medium text-foreground">{row.original.actorLabel}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Governance principal
        </p>
      </div>
    ),
  },
  {
    accessorKey: "actionLabel",
    header: "Action",
    cell: ({ row }) => (
      <Badge variant="outline" className="h-6 rounded-md px-2 font-medium">
        {row.original.actionLabel}
      </Badge>
    ),
  },
  {
    accessorKey: "entityType",
    header: "Entity",
    cell: ({ row }) => (
      <div className="min-w-44">
        <p className="font-medium">{row.original.entityType}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {row.original.entityId}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "timestampLabel",
    header: "Timestamp",
    cell: ({ row }) => row.original.timestampLabel,
    meta: {
      headerClassName: "hidden lg:table-cell",
      cellClassName: "hidden lg:table-cell text-muted-foreground",
    } satisfies ColumnMeta,
  },
  {
    accessorKey: "metadataSummary",
    header: "Workflow metadata",
    cell: ({ row }) => (
      <p className="line-clamp-2 min-w-72 max-w-2xl text-sm text-muted-foreground">
        {row.original.metadataSummary}
      </p>
    ),
  },
];

function getColumnMeta<TData, TValue>(column: ColumnDef<TData, TValue>) {
  return column.meta as ColumnMeta | undefined;
}

export function AuditLogsTable({ logs }: AuditLogsTableProps) {
  // TanStack Table owns internal function state; keep the required hook local.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b">
        <CardTitle>Audit trail</CardTitle>
        <CardDescription>
          Recent workflow, governance, and decision records.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {logs.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-base font-semibold">
                No audit logs yet
              </h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Workflow and governance decisions will appear here as they are
                recorded.
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
