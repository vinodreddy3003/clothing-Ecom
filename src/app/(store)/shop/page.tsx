import type { Metadata } from "next";
import { availableSizes, listProducts, navCategories, parseFilters } from "@/lib/catalog";
import { Listing } from "@/components/store/listing";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = parseFilters(await searchParams);
  return {
    title: q ? `Search: ${q}` : "Shop all",
    alternates: { canonical: "/shop" },
    robots: q ? { index: false } : undefined,
  };
}

export default async function ShopPage({ searchParams }: Props) {
  const filters = parseFilters(await searchParams);
  const [result, categories, sizes] = await Promise.all([listProducts(filters), navCategories(), availableSizes()]);
  return (
    <Listing
      title="Shop all"
      basePath="/shop"
      filters={filters}
      result={result}
      categories={categories}
      activeCategory={filters.category}
      sizes={sizes}
      showCategoryFilter
    />
  );
}
