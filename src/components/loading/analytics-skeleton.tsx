import { Skeleton, SkeletonCard, SkeletonMetricsGrid } from "@/components/loading/skeleton";

export function AnalyticsSkeleton() {
  return (
    <div className="grid gap-6">
      {/* Top metrics strip */}
      <SkeletonMetricsGrid count={4} />

      {/* Main charting area */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <SkeletonCard className="col-span-4 p-6 flex flex-col gap-4">
          <Skeleton className="h-6 w-[150px]" />
          <Skeleton className="h-4 w-[250px]" />
          {/* Main Chart Placeholder */}
          <Skeleton className="h-[350px] w-full mt-4 rounded-lg bg-muted/60" />
        </SkeletonCard>
        
        {/* Secondary breakdown area */}
        <SkeletonCard className="col-span-3 p-6 flex flex-col gap-4">
          <Skeleton className="h-6 w-[150px]" />
          <Skeleton className="h-4 w-[200px]" />
          {/* List items / smaller charts placeholder */}
          <div className="space-y-4 mt-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}
