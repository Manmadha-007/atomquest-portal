import { Skeleton, SkeletonHeader, SkeletonMetricsGrid } from "@/components/loading/skeleton";
import { TableSkeleton } from "@/components/loading/table-skeleton";

export function DashboardSkeleton() {
  return (
    <div className="grid gap-6">
      {/* Top Hero Section */}
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="relative isolate p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SkeletonHeader />
            {/* Right side Active Cycle block */}
            <Skeleton className="h-[80px] w-full lg:w-[250px] rounded-xl" />
          </div>
        </div>
      </section>

      {/* KPI Summary Strip */}
      <SkeletonMetricsGrid count={4} />

      {/* Main Content Area (Table) */}
      <TableSkeleton />
    </div>
  );
}
