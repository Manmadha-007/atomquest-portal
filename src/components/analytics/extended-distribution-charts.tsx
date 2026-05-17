"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DistributionDatum } from "@/lib/analytics/types";

type DistributionChartProps = {
  title: string;
  description: string;
  data: readonly Readonly<DistributionDatum>[];
  emptyMessage: string;
};

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 text-center text-sm text-muted-foreground">
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

export function DistributionChart({
  title,
  description,
  data,
  emptyMessage,
}: DistributionChartProps) {
  const populatedData = data.filter((item) => item.count > 0);
  const hasData = populatedData.length > 0;

  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        {!hasData ? (
          <EmptyChart message={emptyMessage} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={populatedData}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {populatedData.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<DistributionTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid content-center gap-2">
              {data.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: item.fill }}
                      aria-hidden="true"
                    />
                    <span className="truncate font-medium">{item.label}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {item.count} - {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
