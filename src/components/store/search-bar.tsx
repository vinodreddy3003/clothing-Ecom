import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/** GET form to /shop, works without JavaScript. `filterSlot` replaces the default filter link. */
export function SearchBar({
  defaultValue,
  className,
  filterSlot,
  showFilter = true,
}: {
  defaultValue?: string;
  className?: string;
  filterSlot?: React.ReactNode;
  showFilter?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <form action="/shop" role="search" className="relative flex-1">
        <label htmlFor="site-search" className="sr-only">
          Search products
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-stone" strokeWidth={1.75} />
        <input
          id="site-search"
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder="Explore fashion"
          className="h-12 w-full rounded-full border border-line bg-paper pr-4 pl-12 text-[15px] outline-none placeholder:text-stone focus-visible:border-ink"
        />
      </form>
      {showFilter &&
        (filterSlot ?? (
          <Link
            href="/shop?filters=1"
            aria-label="Filters"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-lime text-ink"
          >
            <SlidersHorizontal className="size-5" strokeWidth={2} />
          </Link>
        ))}
    </div>
  );
}
