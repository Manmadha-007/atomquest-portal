"use client";

import { useEffect, useRef, useState } from "react";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { DistributionDatum } from "@/lib/analytics/types";

type DistributionChartProps = {
  title: string;
  description: string;
  data: readonly Readonly<DistributionDatum>[];
  emptyMessage: string;
  variant?: "pie" | "bar";
  maxItems?: number;
  dynamicMaxItems?: boolean;
  viewAllTitle?: string;
};

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-lg border border-dashed bg-muted/20 px-5 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

type DistributionTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: DistributionDatum }>;
};

function DistributionTooltip({ active, payload }: DistributionTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0]?.payload as DistributionDatum | undefined;

  if (!item) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-popover-foreground">{item.label}</p>
      <p className="mt-1 text-muted-foreground">
        {item.count} goals - {item.percentage}%
      </p>
    </div>
  );
}

function RankedBars({ data, maxCount }: { data: readonly Readonly<DistributionDatum>[], maxCount: number }) {
  return (
    <div className="flex flex-col justify-center gap-4">
      {data.map((item) => (
        <div key={item.key} className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: item.fill }}
                aria-hidden="true"
              />
              <span className="truncate">{item.label}</span>
            </div>
            <span className="font-medium text-muted-foreground">
              {item.count} <span className="font-normal opacity-70">({item.percentage}%)</span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                backgroundColor: item.fill,
                width: `${(item.count / maxCount) * 100}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DistributionChart({
  title,
  description,
  data,
  emptyMessage,
  variant = "pie",
  maxItems,
  dynamicMaxItems,
  viewAllTitle = "View all",
}: DistributionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [calculatedMaxItems, setCalculatedMaxItems] = useState<number>(maxItems ?? 6);

  useEffect(() => {
    if (variant !== "bar" || !dynamicMaxItems || !containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      const { height } = entries[0].contentRect;
      // Reserve ~70px for the "View all" button and padding.
      // Each bar is approximately 46px tall including its bottom gap.
      const availableForBars = height - 70;
      const fit = Math.max(3, Math.floor(availableForBars / 46));
      setCalculatedMaxItems(fit);
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [variant, dynamicMaxItems]);

  const populatedData = data.filter((item) => item.count > 0);
  const hasData = populatedData.length > 0;
  
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const maxCount = Math.max(...sortedData.map((d) => d.count), 1);
  
  const effectiveMaxItems = dynamicMaxItems ? calculatedMaxItems : maxItems;
  const isTruncated = variant === "bar" && effectiveMaxItems !== undefined && sortedData.length > effectiveMaxItems;
  const visibleData = isTruncated ? sortedData.slice(0, effectiveMaxItems) : sortedData;

  return (
    <Card className="flex h-full flex-col rounded-lg shadow-sm">
      <CardHeader className="border-b px-4 py-4">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent ref={containerRef} className="flex flex-1 flex-col p-4 min-h-0">
        {!hasData ? (
          <EmptyChart message={emptyMessage} />
        ) : variant === "bar" ? (
          <div className="flex flex-col h-full">
            <RankedBars data={visibleData} maxCount={maxCount} />
            {isTruncated && (
              <div className="mt-auto pt-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full h-8 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                      {viewAllTitle}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{title}</DialogTitle>
                      <DialogDescription>{description}</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto px-1 py-2 pr-3">
                      <RankedBars data={sortedData} maxCount={maxCount} />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-5">
            <div className="relative h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={populatedData}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    strokeWidth={0}
                  >
                    {populatedData.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<DistributionTooltip />} cursor={{fill: "transparent"}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-auto grid grid-cols-2 gap-3 sm:grid-cols-2">
              {data.map((item) => (
                <div
                  key={item.key}
                  className="flex flex-col gap-1 rounded-lg border border-border/50 bg-muted/10 p-2.5 text-xs transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.fill }}
                      aria-hidden="true"
                    />
                    <span className="truncate font-medium text-foreground">{item.label}</span>
                  </div>
                  <div className="pl-4 text-muted-foreground">
                    <span className="font-semibold text-foreground/80">{item.count}</span>
                    <span className="ml-1 opacity-70">({item.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
