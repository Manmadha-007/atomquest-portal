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
import type { StatusDistributionDatum } from "@/lib/analytics/dashboard-analytics";

type StatusDistributionChartProps = {
  data: StatusDistributionDatum[];
};

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

type StatusTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: StatusDistributionDatum }>;
};

function StatusTooltip({ active, payload }: StatusTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0]?.payload as StatusDistributionDatum | undefined;

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

export function StatusDistributionChart({
  data,
}: StatusDistributionChartProps) {
  const populatedData = data.filter((item) => item.count > 0);
  const hasData = populatedData.length > 0;

  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b">
        <CardTitle>Status distribution</CardTitle>
        <CardDescription>
          Active review cycle goals by workflow state.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        {!hasData ? (
          <EmptyChart message="No active-cycle goals are available for status analysis." />
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
                      <Cell key={entry.status} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<StatusTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid content-center gap-2">
              {data.map((item) => (
                <div
                  key={item.status}
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
