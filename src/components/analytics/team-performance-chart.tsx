"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
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
import type {
  AnalyticsScope,
  TeamPerformanceDatum,
} from "@/lib/analytics/dashboard-analytics";

type TeamPerformanceChartProps = {
  data: TeamPerformanceDatum[];
  scope: AnalyticsScope;
};

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-80 items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

type TeamTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: TeamPerformanceDatum }>;
  label?: string;
};

function TeamTooltip({ active, payload, label }: TeamTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0]?.payload as TeamPerformanceDatum | undefined;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-popover-foreground">{label}</p>
      <p className="mt-1 text-muted-foreground">
        Average progress: {item?.averageProgress ?? 0}%
      </p>
      <p className="text-muted-foreground">
        Completion rate: {item?.completionRate ?? 0}%
      </p>
      <p className="text-muted-foreground">
        {item?.goalCount ?? 0} goals, {item?.overdueCount ?? 0} overdue
      </p>
    </div>
  );
}

export function TeamPerformanceChart({
  data,
  scope,
}: TeamPerformanceChartProps) {
  const label =
    scope === "admin" ? "department performance" : "direct-report performance";

  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b">
        <CardTitle>Team performance comparison</CardTitle>
        <CardDescription>
          Active cycle {label} by average progress.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        {data.length === 0 ? (
          <EmptyChart message="No active-cycle goals are available for team comparison." />
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 8, right: 18, left: 20, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                  fontSize={12}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <Tooltip content={<TeamTooltip />} />
                <Bar
                  dataKey="averageProgress"
                  fill="#059669"
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
