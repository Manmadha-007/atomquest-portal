import { UserRole } from "@prisma/client";
import type { NextRequest } from "next/server";

import { auth } from "@/auth";
import {
  goalExportColumns,
  getGoalExportRows,
} from "@/lib/reports/export-goals";
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
    return createJsonError("Authentication is required to export goals.", 401);
  }

  if (!canExportPeopleReports(session.user.role)) {
    return createJsonError("You do not have permission to export goals.", 403);
  }

  const format = parseExportFormat(request.nextUrl.searchParams);

  if (!format) {
    return createJsonError("Export format must be csv or xlsx.", 400);
  }

  try {
    const rows = await getGoalExportRows({
      actorId: session.user.id,
      actorRole: session.user.role as UserRole,
    });

    return createExportResponse({
      columns: goalExportColumns,
      filenameBase: "goals-report",
      format,
      rows,
      worksheetName: "Goals",
    });
  } catch (error) {
    console.error("Failed to export goals", error);

    return createJsonError("Goals export could not be generated.", 500);
  }
}
