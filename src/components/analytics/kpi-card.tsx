import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  tone?: string;
};

export function KpiCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900",
}: KpiCardProps) {
  return (
    <Card className="h-full rounded-lg">
      <CardHeader className="grid-cols-[1fr_auto] items-start gap-3 pb-2">
        <div className="space-y-1">
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-2xl">{value}</CardTitle>
        </div>
        <div className={cn("rounded-lg p-2 ring-1", tone)}>
          <Icon className="size-4" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
