import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8 pt-4 md:pt-8" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-[200px] rounded-3xl bg-tile md:h-[320px] lg:h-[440px]" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/5] rounded-3xl bg-tile" />
            <Skeleton className="h-4 w-2/3 bg-tile" />
            <Skeleton className="h-4 w-1/3 bg-tile" />
          </div>
        ))}
      </div>
    </div>
  );
}
