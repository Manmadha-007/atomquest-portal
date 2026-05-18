import { cn } from "@/lib/utils";

type GovernanceBarListItem = {
  id: string;
  label: string;
  value: number;
  helper?: string;
  tone?: string;
};

export function GovernanceBarList({
  items,
  emptyMessage,
}: {
  items: GovernanceBarListItem[];
  emptyMessage: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 0);

  if (items.length === 0 || maxValue === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => {
        const width = `${Math.max(6, Math.round((item.value / maxValue) * 100))}%`;

        return (
          <div key={item.id} className="grid gap-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium">{item.label}</span>
              <span className="shrink-0 text-muted-foreground">
                {item.value}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full bg-sky-500",
                  item.tone,
                )}
                style={{ width }}
              />
            </div>
            {item.helper ? (
              <p className="text-xs text-muted-foreground">{item.helper}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
