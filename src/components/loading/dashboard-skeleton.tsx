import { Skeleton, SkeletonHeader, SkeletonMetricsGrid } from "@/components/loading/skeleton";
import { TableSkeleton } from "@/components/loading/table-skeleton";

export function DashboardSkeleton() {
  return (
    <div className="grid gap-5 lg:gap-6">
      {/* Top Hero Section */}
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="relative isolate p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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
