"use client";

type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { AlertTriangle, Search, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

import { CompletionStatusBadge } from "@/components/analytics/completion-status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CompletionStatus } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

export type EmployeeDirectoryTableRow = {
  activeGoalsCount: number;
  completionPercentage: number | null;
  createdDateLabel: string;
  department: string | null;
  email: string;
  id: string;
  isActive: boolean;
  managerName: string | null;
  name: string;
  overdueGoals: number;
  pendingApprovals: number;
  quarterlyStatus: CompletionStatus;
  quarterlyStatusLabel: string;
  role: UserRole;
  searchText: string;
  title: string | null;
};

type EmployeesTableProps = {
  employees: EmployeeDirectoryTableRow[];
  reviewCycleLabel: string;
};

type ColumnMeta = {
  cellClassName?: string;
  headerClassName?: string;
};

type RoleFilter = "ALL" | UserRole;

const roleLabels = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
} satisfies Record<UserRole, string>;

const roleBadgeClasses = {
  ADMIN:
    "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300",
  MANAGER:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300",
  EMPLOYEE:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
} satisfies Record<UserRole, string>;

const roleOptions = [
  { label: "All roles", value: "ALL" },
  { label: "Admins", value: "ADMIN" },
  { label: "Managers", value: "MANAGER" },
  { label: "Employees", value: "EMPLOYEE" },
] as const satisfies ReadonlyArray<{ label: string; value: RoleFilter }>;

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge
      variant="outline"
      className={cn("h-6 rounded-md px-2 font-medium", roleBadgeClasses[role])}
    >
      {roleLabels[role]}
    </Badge>
  );
}

function CompletionCell({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="text-xs font-medium text-muted-foreground">
        Not tracked
      </span>
    );
  }

  return (
    <div className="min-w-32 space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium">{value}%</span>
        <span className="text-muted-foreground">complete</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        aria-label={`${value}% completion`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            value >= 100
              ? "bg-emerald-600"
              : value >= 50
                ? "bg-blue-600"
                : "bg-amber-500",
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function CountChip({
  count,
  kind,
}: {
  count: number;
  kind: "neutral" | "warning";
}) {
  const isWarning = kind === "warning" && count > 0;

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-md border px-2 text-xs font-medium",
        isWarning
          ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
          : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300",
      )}
    >
      {isWarning ? <AlertTriangle className="size-3" aria-hidden="true" /> : null}
      {count}
    </span>
  );
}

const columns: ColumnDef<EmployeeDirectoryTableRow>[] = [
  {
    accessorKey: "name",
    header: "Employee",
    cell: ({ row }) => {
      const employee = row.original;
      const initials = employee.name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      return (
        <div className="flex min-w-56 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
            {initials || employee.email.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium text-foreground">
                {employee.name}
              </p>
              {!employee.isActive ? (
                <Badge
                  variant="outline"
                  className="h-5 rounded-md border-slate-200 bg-slate-100 px-1.5 text-[0.68rem] text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
                >
                  Inactive
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {employee.title ?? employee.department ?? "No title assigned"}
            </p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.original.email,
    meta: {
      headerClassName: "hidden md:table-cell",
      cellClassName: "hidden md:table-cell text-muted-foreground",
    } satisfies ColumnMeta,
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => <RoleBadge role={row.original.role} />,
  },
  {
    accessorKey: "managerName",
    header: "Manager",
    cell: ({ row }) => row.original.managerName ?? "No manager",
    meta: {
      headerClassName: "hidden lg:table-cell",
      cellClassName: "hidden lg:table-cell text-muted-foreground",
    } satisfies ColumnMeta,
  },
  {
    accessorKey: "activeGoalsCount",
    header: "Active goals",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.activeGoalsCount}</span>
    ),
  },
  {
    accessorKey: "completionPercentage",
    header: "Completion",
    cell: ({ row }) => (
      <CompletionCell value={row.original.completionPercentage} />
    ),
  },
  {
    accessorKey: "pendingApprovals",
    header: "Pending approvals",
    cell: ({ row }) => (
      <CountChip count={row.original.pendingApprovals} kind="neutral" />
    ),
    meta: {
      headerClassName: "hidden xl:table-cell",
      cellClassName: "hidden xl:table-cell",
    } satisfies ColumnMeta,
  },
  {
    accessorKey: "overdueGoals",
    header: "Overdue",
    cell: ({ row }) => (
      <CountChip count={row.original.overdueGoals} kind="warning" />
    ),
  },
  {
    accessorKey: "quarterlyStatusLabel",
    header: "Quarterly status",
    cell: ({ row }) => (
      <CompletionStatusBadge
        status={row.original.quarterlyStatus}
        label={row.original.quarterlyStatusLabel}
      />
    ),
  },
  {
    accessorKey: "createdDateLabel",
    header: "Joined",
    cell: ({ row }) => row.original.createdDateLabel,
    meta: {
      headerClassName: "hidden 2xl:table-cell",
      cellClassName: "hidden 2xl:table-cell text-muted-foreground",
    } satisfies ColumnMeta,
  },
];

function getColumnMeta<TData, TValue>(column: ColumnDef<TData, TValue>) {
  return column.meta as ColumnMeta | undefined;
}

function filterRows(
  employees: EmployeeDirectoryTableRow[],
  searchQuery: string,
  roleFilter: RoleFilter,
) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return employees.filter((employee) => {
    const matchesRole = roleFilter === "ALL" || employee.role === roleFilter;
    const matchesSearch =
      normalizedQuery.length === 0 ||
      employee.searchText.includes(normalizedQuery);

    return matchesRole && matchesSearch;
  });
}

export function EmployeesTable({
  employees,
  reviewCycleLabel,
}: EmployeesTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const filteredEmployees = useMemo(
    () => filterRows(employees, searchQuery, roleFilter),
    [employees, roleFilter, searchQuery],
  );

  // TanStack Table owns internal function state; keep the required hook local.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredEmployees,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-1">
            <CardTitle>Workforce directory</CardTitle>
            <CardDescription>
              Role, manager, active-cycle goal, and completion visibility for{" "}
              {reviewCycleLabel}.
            </CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(16rem,1fr)_10rem] xl:min-w-[28rem]">
            <label className="relative">
              <span className="sr-only">Search employees</span>
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-8"
                placeholder="Search people, email, manager"
              />
            </label>
            <label>
              <span className="sr-only">Filter by role</span>
              <Select
                value={roleFilter}
                onValueChange={(value) => setRoleFilter(value as RoleFilter)}
              >
                <SelectTrigger className="w-full xl:w-auto">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {employees.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
              <UsersRound className="size-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-base font-semibold">
                No users available
              </h3>
              <p className="max-w-md text-sm text-muted-foreground">
                The directory appears once workforce records exist.
              </p>
            </div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
              <Search className="size-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-base font-semibold">
                No matching users
              </h3>
              <p className="max-w-md text-sm text-muted-foreground">
                No workforce records match the current directory view.
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

        {employees.length > 0 ? (
          <div className="flex flex-col gap-2 border-t bg-muted/20 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {filteredEmployees.length} of {employees.length} users
            </span>
            <span>{reviewCycleLabel}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
