import { UserRole } from "@prisma/client";
import type { NextRequest } from "next/server";

import { auth } from "@/auth";
import {
  getQuarterlyUpdateExportRows,
  quarterlyUpdateExportColumns,
} from "@/lib/reports/export-quarterly-updates";
import {
  canExportPeopleReports,
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
      "Authentication is required to export quarterly updates.",
      401,
    );
  }

  if (!canExportPeopleReports(session.user.role)) {
    return createJsonError(
      "You do not have permission to export quarterly updates.",
      403,
    );
  }

  const format = parseExportFormat(request.nextUrl.searchParams);

  if (!format) {
    return createJsonError("Export format must be csv or xlsx.", 400);
  }

  try {
    const rows = await getQuarterlyUpdateExportRows({
      actorId: session.user.id,
      actorRole: session.user.role as UserRole,
    });

    return createExportResponse({
      columns: quarterlyUpdateExportColumns,
      filenameBase: "quarterly-updates-report",
      format,
      rows,
      worksheetName: "Quarterly Updates",
    });
  } catch (error) {
    console.error("Failed to export quarterly updates", error);

    return createJsonError(
      "Quarterly updates export could not be generated.",
      500,
    );
  }
}
