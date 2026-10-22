import Link from "next/link";
import { SearchX } from "lucide-react";
import type { CardProduct, ListFilters } from "@/lib/catalog";
import { ProductGrid } from "@/components/store/product-card";
import { CategoryChips } from "@/components/store/category-chips";
import { EmptyState } from "@/components/store/empty-state";
import { SearchBar } from "@/components/store/search-bar";
import { FilterSheet, SortSelect } from "@/components/store/listing-controls";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string | null;
  basePath: string;
  filters: ListFilters;
  result: { items: CardProduct[]; total: number; page: number; pages: number };
  categories: { id: string; name: string; slug: string }[];
  activeCategory?: string;
  sizes: string[];
  showCategoryFilter?: boolean;
};

function FilterForm({ basePath, filters, categories, sizes, showCategoryFilter, idPrefix }: Props & { idPrefix: string }) {
  const field = "h-11 w-full rounded-xl border border-line bg-paper px-3 text-[15px] outline-none focus-visible:border-ink";
  return (
    <form action={basePath} className="space-y-6">
      {filters.q && <input type="hidden" name="q" value={filters.q} />}
      {filters.sort && filters.sort !== "new" && <input type="hidden" name="sort" value={filters.sort} />}
      {showCategoryFilter && (
        <div className="space-y-2">
          <label htmlFor={`${idPrefix}-category`} className="text-[15px] font-semibold">
            Category
          </label>
          <select id={`${idPrefix}-category`} name="category" defaultValue={filters.category ?? ""} className={field}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <fieldset className="space-y-2">
        <legend className="mb-2 text-[15px] font-semibold">Price (₹)</legend>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`${idPrefix}-min`}>
            Minimum price
          </label>
          <input id={`${idPrefix}-min`} name="min" type="number" min={0} inputMode="numeric" placeholder="Min" defaultValue={filters.min} className={field} />
          <span className="text-stone" aria-hidden>
            to
          </span>
          <label className="sr-only" htmlFor={`${idPrefix}-max`}>
            Maximum price
          </label>
          <input id={`${idPrefix}-max`} name="max" type="number" min={0} inputMode="numeric" placeholder="Max" defaultValue={filters.max} className={field} />
        </div>
      </fieldset>
      {sizes.length > 0 && (
        <fieldset>
          <legend className="mb-3 text-[15px] font-semibold">Size</legend>
          <div className="flex flex-wrap gap-2">
            <SizeOption idPrefix={idPrefix} value="" label="Any" checked={!filters.size} />
            {sizes.map((s) => (
              <SizeOption key={s} idPrefix={idPrefix} value={s} label={s} checked={filters.size === s} />
            ))}
          </div>
        </fieldset>
      )}
      <label className="flex min-h-11 items-center gap-3 text-[15px] font-medium">
        <input type="checkbox" name="inStock" value="1" defaultChecked={filters.inStock} className="size-5 accent-ink" />
        In stock only
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="pill" className="flex-1">
          Apply filters
        </Button>
        <Button asChild variant="outline" size="pill">
          <Link href={basePath}>Clear</Link>
        </Button>
      </div>
    </form>
  );
}

function SizeOption({ idPrefix, value, label, checked }: { idPrefix: string; value: string; label: string; checked: boolean }) {
  const id = `${idPrefix}-size-${value || "any"}`;
  return (
    <div>
      <input type="radio" id={id} name="size" value={value} defaultChecked={checked} className="peer sr-only" />
      <label
        htmlFor={id}
        className="grid h-11 min-w-11 cursor-pointer place-items-center rounded-full border border-line px-3 text-sm font-semibold peer-checked:border-ink peer-checked:bg-lime peer-focus-visible:outline-2 peer-focus-visible:outline-ink"
      >
        {label}
      </label>
    </div>
  );
}

function pageHref(basePath: string, filters: ListFilters, page: number, withCategory?: boolean) {
  const p = new URLSearchParams();
  if (filters.q) p.set("q", filters.q);
  if (filters.category && withCategory) p.set("category", filters.category);
  if (filters.min != null) p.set("min", String(filters.min));
  if (filters.max != null) p.set("max", String(filters.max));
  if (filters.size) p.set("size", filters.size);
  if (filters.inStock) p.set("inStock", "1");
  if (filters.sort && filters.sort !== "new") p.set("sort", filters.sort);
  if (page > 1) p.set("page", String(page));
  const qs = p.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Listing(props: Props) {
  const { title, description, filters, result, basePath, categories, activeCategory } = props;
  const activeCount =
    [filters.min != null, filters.max != null, !!filters.size, !!filters.inStock].filter(Boolean).length +
    (props.showCategoryFilter && filters.category ? 1 : 0);

  return (
    <div className="pt-2 md:pt-8">
      <div className="mb-4 space-y-4 lg:hidden">
        <SearchBar
          defaultValue={filters.q}
          filterSlot={
            <FilterSheet activeCount={activeCount}>
              <FilterForm {...props} idPrefix="m" />
            </FilterSheet>
          }
        />
        <CategoryChips categories={categories} active={activeCategory} />
      </div>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] leading-8 font-bold tracking-[-0.02em] md:text-[40px] md:leading-[44px]">
            {filters.q ? `Results for “${filters.q}”` : title}
          </h1>
          {description && !filters.q && <p className="mt-2 max-w-xl text-[15px] text-stone">{description}</p>}
          <p className="mt-1 text-[15px] text-stone" aria-live="polite">
            {result.total} {result.total === 1 ? "product" : "products"}
          </p>
        </div>
        <SortSelect />
      </div>

      <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-28">
            <FilterForm {...props} idPrefix="d" />
          </div>
        </aside>
        <div>
          {result.items.length ? (
            <ProductGrid products={result.items} priorityCount={4} />
          ) : (
            <EmptyState
              icon={SearchX}
              title="No products match these filters."
              body="Try a different search or remove a filter."
              action={{ label: "Clear filters", href: basePath }}
            />
          )}
          {result.pages > 1 && (
            <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
              {Array.from({ length: result.pages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={pageHref(basePath, filters, n, props.showCategoryFilter)}
                  aria-current={n === result.page ? "page" : undefined}
                  className={cn(
                    "grid size-11 place-items-center rounded-full border text-[15px] font-semibold",
                    n === result.page ? "border-ink bg-ink text-paper" : "border-line hover:bg-tile",
                  )}
                >
                  {n}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
