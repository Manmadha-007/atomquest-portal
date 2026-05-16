import type { NextRequest } from "next/server";

import { auth } from "@/auth";
import {
  auditLogExportColumns,
  getAuditLogExportRows,
} from "@/lib/reports/export-audit-logs";
import {
  canExportAuditReports,
  createExportResponse,
  parseExportFormat,
} from "@/lib/reports/export-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function createJsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return createJsonError(
      "Authentication is required to export audit logs.",
      401,
    );
  }

  if (!canExportAuditReports(session.user.role)) {
    return createJsonError(
      "You do not have permission to export audit logs.",
      403,
    );
  }

  const format = parseExportFormat(request.nextUrl.searchParams);

  if (!format) {
    return createJsonError("Export format must be csv or xlsx.", 400);
  }

  try {
    const rows = await getAuditLogExportRows();

    return createExportResponse({
      columns: auditLogExportColumns,
      filenameBase: "audit-logs-report",
      format,
      rows,
      worksheetName: "Audit Logs",
    });
  } catch (error) {
    console.error("Failed to export audit logs", error);

    return createJsonError("Audit log export could not be generated.", 500);
  }
}
