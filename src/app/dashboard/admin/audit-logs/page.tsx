import type { Prisma } from "@prisma/client";
import { FileText, ShieldCheck, UserRound } from "lucide-react";

import {
  AuditLogsTable,
  type AuditLogTableRow,
} from "@/components/admin/audit-logs-table";
import { DashboardAuthState } from "@/components/layout/dashboard-auth-state";
import { ExportActions } from "@/components/reports/export-actions";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const auditLogExportActions = [
  { id: "audit-logs", label: "Audit logs", href: "/api/exports/audit-logs" },
];

const auditLogSelect = {
  id: true,
  actorId: true,
  entityType: true,
  entityId: true,
  action: true,
  metadata: true,
  createdAt: true,
  actor: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  },
} as const satisfies Prisma.AuditLogSelect;

type AuditLogRecord = Prisma.AuditLogGetPayload<{
  select: typeof auditLogSelect;
}>;

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatActor(log: AuditLogRecord) {
  if (!log.actor) {
    return log.actorId ? "Deleted user" : "System";
  }

  return `${log.actor.firstName} ${log.actor.lastName}`.trim() || log.actor.email;
}

function formatAction(action: string) {
  return action
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function summarizeMetadata(metadata: Prisma.JsonValue | null) {
  if (!metadata) {
    return "No workflow metadata captured.";
  }

  if (typeof metadata !== "object" || Array.isArray(metadata)) {
    return JSON.stringify(metadata);
  }

  const entries = Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 6)
    .map(([key, value]) => `${key}: ${String(value)}`);

  return entries.length > 0 ? entries.join("; ") : "No workflow metadata captured.";
}

function mapAuditLogToRow(log: AuditLogRecord): AuditLogTableRow {
  return {
    id: log.id,
    actorLabel: formatActor(log),
    action: log.action,
    actionLabel: formatAction(log.action),
    entityType: log.entityType,
    entityId: log.entityId,
    timestampLabel: formatDateTime(log.createdAt),
    metadataSummary: summarizeMetadata(log.metadata),
  };
}

export default async function AdminAuditLogsPage() {
  const user = await getDashboardUser();

  if (!user || user.role !== "ADMIN") {
    return <DashboardAuthState requiredRole="ADMIN" userRole={user?.role} />;
  }

  const [logs, totalLogCount, governanceLogCount, actorCount] =
    await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: auditLogSelect,
      }),
      prisma.auditLog.count(),
      prisma.auditLog.count({
        where: {
          action: {
            in: [
              "REVIEW_CYCLE_CREATED",
              "REVIEW_CYCLE_ACTIVATED",
              "REVIEW_CYCLE_DEACTIVATED",
              "GOAL_LOCKED",
              "GOAL_UNLOCKED",
            ],
          },
        },
      }),
      prisma.auditLog.groupBy({
        by: ["actorId"],
        _count: { _all: true },
      }),
    ]);

  const tableRows = logs.map(mapAuditLogToRow);

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="relative isolate p-6 sm:p-8">
          <div className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 bg-gradient-to-l from-slate-500/10 via-blue-500/5 to-transparent lg:block" />
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Audit governance
            </div>
            <div className="space-y-2">
              <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Audit logs
              </h1>
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                Review administrative governance actions, workflow decisions,
                entity changes, and structured metadata from the audit trail.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Total records</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <FileText className="size-5 text-muted-foreground" />
              {totalLogCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Governance events</CardDescription>
            <CardTitle className="text-2xl">{governanceLogCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Actors recorded</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <UserRound className="size-5 text-muted-foreground" />
              {actorCount.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <ExportActions
        actions={auditLogExportActions}
        description="Governance CSV/XLSX reporting."
      />

      <AuditLogsTable logs={tableRows} />
    </div>
  );
}
