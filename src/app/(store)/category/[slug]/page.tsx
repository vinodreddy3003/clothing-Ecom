import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { availableSizes, getCategory, listProducts, navCategories, parseFilters } from "@/lib/catalog";
import { Listing } from "@/components/store/listing";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategory((await params).slug);
  if (!category) return {};
  return {
    title: category.name,
    description: category.description ?? undefined,
    alternates: { canonical: `/category/${category.slug}` },
    openGraph: category.imageUrl ? { images: [category.imageUrl] } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  const filters = { ...parseFilters(await searchParams), category: slug };
  const [result, categories, sizes] = await Promise.all([listProducts(filters), navCategories(), availableSizes()]);
  return (
    <Listing
      title={category.name}
      description={category.description}
      basePath={`/category/${slug}`}
      filters={filters}
      result={result}
      categories={categories}
      activeCategory={slug}
      sizes={sizes}
    />
  );
}
