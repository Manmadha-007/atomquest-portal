import { cn } from "@/lib/utils";
import { Skeleton as BaseSkeleton } from "@/components/ui/skeleton";

export function SkeletonCard({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden", className)}>
      {children}
    </div>
  );
}

export function SkeletonHeader({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <BaseSkeleton className="h-7 w-[200px]" />
      <BaseSkeleton className="h-4 w-[350px] max-w-full" />
    </div>
  );
}

export function SkeletonMetricsGrid({ className, count = 4 }: { className?: string; count?: number }) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} className="p-4">
          <BaseSkeleton className="h-4 w-[100px] mb-3" />
          <BaseSkeleton className="h-8 w-[60px]" />
        </SkeletonCard>
      ))}
    </div>
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-between py-4", className)}>
      <div className="space-y-2 w-full max-w-[200px]">
        <BaseSkeleton className="h-4 w-full" />
        <BaseSkeleton className="h-3 w-4/5" />
      </div>
      <BaseSkeleton className="h-8 w-20 rounded-md" />
    </div>
  );
}

export { BaseSkeleton as Skeleton };
