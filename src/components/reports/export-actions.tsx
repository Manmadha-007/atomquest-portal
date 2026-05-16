"use client";

import * as React from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ExportFormat = "csv" | "xlsx";

export type ReportExportAction = {
  id: string;
  label: string;
  href: string;
  description?: string;
  disabled?: boolean;
};

type ExportActionsProps = {
  actions: ReportExportAction[];
  className?: string;
  defaultFormat?: ExportFormat;
  description?: string;
  title?: string;
};

const formats = [
  { label: "CSV", value: "csv" },
  { label: "XLSX", value: "xlsx" },
] as const satisfies ReadonlyArray<{ label: string; value: ExportFormat }>;

function buildExportHref(href: string, format: ExportFormat) {
  const [pathWithSearch, hash = ""] = href.split("#");
  const separator = pathWithSearch.includes("?") ? "&" : "?";
  const nextHref = `${pathWithSearch}${separator}format=${format}`;

  return hash ? `${nextHref}#${hash}` : nextHref;
}

export function ExportActions({
  actions,
  className,
  defaultFormat = "csv",
  description,
  title = "Report exports",
}: ExportActionsProps) {
  const [format, setFormat] = React.useState<ExportFormat>(defaultFormat);
  const [pendingActionId, setPendingActionId] = React.useState<string | null>(
    null,
  );
  const pendingTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (pendingTimerRef.current) {
        window.clearTimeout(pendingTimerRef.current);
      }
    };
  }, []);

  if (actions.length === 0) {
    return null;
  }

  function startExport(
    event: React.MouseEvent<HTMLAnchorElement>,
    action: ReportExportAction,
  ) {
    if (action.disabled) {
      event.preventDefault();
      toast.error("Export unavailable", {
        description: `${action.label} cannot be downloaded right now.`,
      });
      return;
    }

    if (pendingActionId) {
      event.preventDefault();
      return;
    }

    setPendingActionId(action.id);

    toast.success("Export requested", {
      description: `${action.label} ${format.toUpperCase()} download started.`,
    });

    if (pendingTimerRef.current) {
      window.clearTimeout(pendingTimerRef.current);
    }

    pendingTimerRef.current = window.setTimeout(() => {
      setPendingActionId(null);
    }, 1200);
  }

  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 font-heading text-base font-semibold">
            <Download className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{title}</span>
          </div>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>

        <div
          aria-label="Export format"
          className="inline-flex w-fit rounded-lg border bg-muted/30 p-1"
          role="group"
        >
          {formats.map((item) => (
            <Button
              aria-pressed={format === item.value}
              className={cn(
                "h-7 px-3 text-xs",
                format === item.value && "bg-background shadow-sm",
              )}
              key={item.value}
              onClick={() => setFormat(item.value)}
              type="button"
              variant="ghost"
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => {
          const isPending = pendingActionId === action.id;
          const isDisabled = Boolean(pendingActionId) || action.disabled;

          return (
            <Button
              aria-busy={isPending}
              aria-disabled={isDisabled}
              asChild
              className="min-w-0 justify-start"
              key={action.id}
              title={action.description ?? action.label}
              variant="outline"
            >
              <a
                href={buildExportHref(action.href, format)}
                onClick={(event) => startExport(event, action)}
                tabIndex={isDisabled ? -1 : undefined}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <FileSpreadsheet className="size-4" aria-hidden="true" />
                )}
                <span className="truncate">{action.label}</span>
              </a>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
