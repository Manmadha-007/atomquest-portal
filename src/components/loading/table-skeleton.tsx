import { Skeleton, SkeletonCard } from "@/components/loading/skeleton";

export function TableSkeleton() {
  return (
    <SkeletonCard className="w-full">
      {/* Toolbar placeholder */}
      <div className="flex items-center justify-between p-4 border-b">
        <Skeleton className="h-9 w-[250px]" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-[100px]" />
          <Skeleton className="h-9 w-[100px]" />
        </div>
      </div>
      
      {/* Header placeholder */}
      <div className="flex items-center gap-4 border-b bg-muted/20 px-4 py-3">
        <Skeleton className="h-4 w-full max-w-[200px]" />
        <Skeleton className="h-4 w-full max-w-[150px] hidden sm:block" />
        <Skeleton className="h-4 w-full max-w-[100px] hidden md:block" />
        <Skeleton className="h-4 w-[80px] ml-auto" />
      </div>

      {/* Data rows placeholder */}
      <div className="divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            {/* Primary column (e.g. Title + description) */}
            <div className="space-y-2 w-full max-w-[250px]">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-[70%]" />
            </div>
            
            {/* Secondary column */}
            <Skeleton className="h-4 w-full max-w-[120px] hidden sm:block" />
            
            {/* Status pill column */}
            <Skeleton className="h-5 w-[80px] rounded-full hidden md:block" />
            
            {/* Action column */}
            <div className="ml-auto flex items-center gap-2">
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}
