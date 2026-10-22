"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-[15px]">
      <span className="text-stone">Sort</span>
      <select
        value={params.get("sort") ?? "new"}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          next.set("sort", e.target.value);
          next.delete("page");
          router.push(`${pathname}?${next}`);
        }}
        className="h-11 rounded-full border border-line bg-paper px-4 font-medium outline-none focus-visible:border-ink"
      >
        <option value="new">Newest</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
        <option value="discount">Biggest discount</option>
      </select>
    </label>
  );
}

export function FilterSheet({ children, activeCount }: { children: React.ReactNode; activeCount: number }) {
  const params = useSearchParams();
  const [open, setOpen] = useState(params.get("filters") === "1");
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={activeCount ? `Filters, ${activeCount} applied` : "Filters"}
        className="relative grid size-12 shrink-0 place-items-center rounded-full border border-line bg-paper"
      >
        <SlidersHorizontal className="size-5" strokeWidth={2} />
        {activeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-lime text-[11px] font-bold">
            {activeCount}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle className="text-xl">Filters</SheetTitle>
          <SheetDescription>Narrow down by price, size and availability.</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
