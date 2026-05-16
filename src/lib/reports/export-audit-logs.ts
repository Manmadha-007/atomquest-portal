import { type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  formatExportDateTime,
  formatJsonValue,
  formatPersonName,
  type ExportColumn,
} from "@/lib/reports/export-utils";

export type AuditLogExportRow = {
  actor: string;
  action: string;
  entity: string;
  previousValue: string;
  newValue: string;
  timestamp: string;
};

export const auditLogExportColumns = [
  { key: "actor", header: "Actor", width: 26 },
  { key: "action", header: "Action", width: 30 },
  { key: "entity", header: "Entity", width: 34 },
  { key: "previousValue", header: "Previous Value", width: 28 },
  { key: "newValue", header: "New Value", width: 28 },
  { key: "timestamp", header: "Timestamp", width: 26 },
] satisfies Array<ExportColumn<AuditLogExportRow>>;

const auditLogExportSelect = {
  id: true,
  actorId: true,
  action: true,
  entityType: true,
  entityId: true,
  metadata: true,
  createdAt: true,
  actor: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const satisfies Prisma.AuditLogSelect;

type AuditLogExportRecord = Prisma.AuditLogGetPayload<{
  select: typeof auditLogExportSelect;
}>;

function getMetadataObject(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  return metadata;
}

function pickMetadataValue(
  metadata: Prisma.JsonObject | null,
  keys: string[],
) {
  if (!metadata) {
    return "";
  }

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(metadata, key)) {
      return formatJsonValue(metadata[key]);
    }
  }

  return "";
}

function getActorLabel(log: AuditLogExportRecord) {
  if (log.actor) {
    return formatPersonName(log.actor);
  }

  return log.actorId ? "Deleted user" : "System";
}

function mapAuditLogToExportRow(log: AuditLogExportRecord): AuditLogExportRow {
  const metadata = getMetadataObject(log.metadata);

  return {
    actor: getActorLabel(log),
    action: log.action,
    entity: `${log.entityType}:${log.entityId}`,
    previousValue: pickMetadataValue(metadata, [
      "previousValue",
      "previousStatus",
      "previousWeightage",
      "before",
      "from",
    ]),
    newValue: pickMetadataValue(metadata, [
      "newValue",
      "nextValue",
      "nextStatus",
      "nextWeightage",
      "after",
      "to",
      "decision",
      "quarterlyStatus",
      "status",
    ]),
    timestamp: formatExportDateTime(log.createdAt),
  };
}

export async function getAuditLogExportRows(): Promise<AuditLogExportRow[]> {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    select: auditLogExportSelect,
  });

  return logs.map(mapAuditLogToExportRow);
}
