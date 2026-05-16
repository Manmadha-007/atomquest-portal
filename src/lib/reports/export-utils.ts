import ExcelJS from "exceljs";
import { UserRole, type Prisma } from "@prisma/client";

export const EXPORT_FORMATS = ["csv", "xlsx"] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];
export type ExportCellValue = string | number | boolean | Date | null | undefined;
export type ExportScope = {
  actorId: string;
  actorRole: UserRole;
};

export type ExportColumn<Row extends object> = {
  key: Extract<keyof Row, string>;
  header: string;
  width?: number;
};

type CreateExportResponseInput<Row extends object> = {
  columns: Array<ExportColumn<Row>>;
  filenameBase: string;
  format: ExportFormat;
  rows: Row[];
  worksheetName: string;
};

const CSV_MIME_TYPE = "text/csv; charset=utf-8";
const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const textEncoder = new TextEncoder();

export function parseExportFormat(searchParams: URLSearchParams) {
  const requestedFormat = (searchParams.get("format") ?? "csv").toLowerCase();

  return EXPORT_FORMATS.includes(requestedFormat as ExportFormat)
    ? (requestedFormat as ExportFormat)
    : null;
}

export function canExportPeopleReports(role?: UserRole | null) {
  return role === UserRole.ADMIN || role === UserRole.MANAGER;
}

export function canExportAuditReports(role?: UserRole | null) {
  return role === UserRole.ADMIN;
}

export function getScopedGoalOwnerWhere(scope: ExportScope): Prisma.UserWhereInput {
  if (scope.actorRole === UserRole.MANAGER) {
    return {
      managerId: scope.actorId,
      isActive: true,
    };
  }

  return {};
}

export function formatPersonName(person: {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
}) {
  const fullName = `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();

  return fullName || person.name || person.email || "Unknown user";
}

export function formatEnumLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export function formatReviewCycleLabel(reviewCycle: {
  name: string;
  quarter: number;
  year: number;
}) {
  return `${reviewCycle.name} - Q${reviewCycle.quarter} ${reviewCycle.year}`;
}

export function formatExportDate(value?: Date | null) {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

export function formatExportDateTime(value?: Date | null) {
  if (!value) {
    return "";
  }

  return value.toISOString();
}

export function toExportNumber(value?: Prisma.Decimal | number | string | null) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function formatExportNumber(
  value?: Prisma.Decimal | number | string | null,
) {
  const parsedValue = toExportNumber(value);

  if (parsedValue === null) {
    return "";
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 4,
    useGrouping: false,
  }).format(parsedValue);
}

export function formatJsonValue(value: Prisma.JsonValue | undefined) {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function sanitizeFilename(filename: string) {
  return filename
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function buildFilename(filenameBase: string, format: ExportFormat) {
  const dateStamp = new Date().toISOString().slice(0, 10);

  return `${sanitizeFilename(filenameBase)}-${dateStamp}.${format}`;
}

function buildContentDisposition(filename: string) {
  const encodedFilename = encodeURIComponent(filename);

  return `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`;
}

function buildDownloadHeaders(input: {
  byteLength: number;
  filename: string;
  format: ExportFormat;
}) {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Disposition": buildContentDisposition(input.filename),
    "Content-Length": String(input.byteLength),
    "Content-Type": input.format === "csv" ? CSV_MIME_TYPE : XLSX_MIME_TYPE,
    Expires: "0",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
  };
}

function getExportCellValue<Row extends object>(
  row: Row,
  column: ExportColumn<Row>,
): ExportCellValue {
  return (row as Record<string, ExportCellValue>)[column.key];
}

function formatCsvCell(value: ExportCellValue) {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function buildCsvBytes<Row extends object>(
  columns: Array<ExportColumn<Row>>,
  rows: Row[],
) {
  const lines = [
    columns.map((column) => formatCsvCell(column.header)).join(","),
    ...rows.map((row) =>
      columns
        .map((column) => formatCsvCell(getExportCellValue(row, column)))
        .join(","),
    ),
  ];
  const csv = `\uFEFF${lines.join("\r\n")}\r\n`;

  return textEncoder.encode(csv);
}

function getExcelColumnName(columnNumber: number) {
  let remaining = columnNumber;
  let columnName = "";

  while (remaining > 0) {
    const modulo = (remaining - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    remaining = Math.floor((remaining - modulo) / 26);
  }

  return columnName;
}

async function buildXlsxBytes<Row extends object>(input: {
  columns: Array<ExportColumn<Row>>;
  rows: Row[];
  worksheetName: string;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AtomQuest Portal";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet(input.worksheetName, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  worksheet.columns = input.columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width ?? Math.max(column.header.length + 4, 16),
  }));

  worksheet.addRows(
    input.rows.map((row) =>
      Object.fromEntries(
        input.columns.map((column) => [
          column.key,
          getExportCellValue(row, column) ?? "",
        ]),
      ),
    ),
  );

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" },
  };
  headerRow.alignment = { vertical: "middle" };

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  });

  if (input.columns.length > 0) {
    worksheet.autoFilter = {
      from: "A1",
      to: `${getExcelColumnName(input.columns.length)}1`,
    };
  }

  worksheet.pageSetup = {
    fitToHeight: 0,
    fitToPage: true,
    fitToWidth: 1,
    orientation: "landscape",
  };

  const excelBuffer = await workbook.xlsx.writeBuffer();

  return new Uint8Array(excelBuffer);
}

export async function createExportResponse<Row extends object>(
  input: CreateExportResponseInput<Row>,
) {
  const body =
    input.format === "csv"
      ? buildCsvBytes(input.columns, input.rows)
      : await buildXlsxBytes({
          columns: input.columns,
          rows: input.rows,
          worksheetName: input.worksheetName,
        });
  const filename = buildFilename(input.filenameBase, input.format);

  return new Response(body, {
    headers: buildDownloadHeaders({
      byteLength: body.byteLength,
      filename,
      format: input.format,
    }),
  });
}
