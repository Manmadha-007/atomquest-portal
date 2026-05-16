"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProgressTrendDatum } from "@/lib/analytics/dashboard-analytics";

type ProgressTrendChartProps = {
  data: ProgressTrendDatum[];
};

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

type TrendTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: ProgressTrendDatum }>;
  label?: string;
};

function TrendTooltip({ active, payload, label }: TrendTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0]?.payload as ProgressTrendDatum | undefined;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-popover-foreground">{label}</p>
      <p className="mt-1 text-muted-foreground">
        Average progress: {item?.averageProgress ?? 0}%
      </p>
      <p className="text-muted-foreground">
        {item?.updateCount ?? 0} updates, {item?.completedCount ?? 0} completed
      </p>
    </div>
  );
}

export function ProgressTrendChart({ data }: ProgressTrendChartProps) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b">
        <CardTitle>Quarterly progress trend</CardTitle>
        <CardDescription>
          Average progress across submitted quarterly updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        {data.length === 0 ? (
          <EmptyChart message="No quarterly updates are available for trend analysis yet." />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 10, right: 18, left: -18, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  fontSize={12}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<TrendTooltip />} />
                <Line
                  type="monotone"
                  dataKey="averageProgress"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
