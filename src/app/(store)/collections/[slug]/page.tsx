import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { availableSizes, getCollection, listProducts, navCategories, parseFilters } from "@/lib/catalog";
import { Listing } from "@/components/store/listing";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collection = await getCollection((await params).slug);
  if (!collection) return {};
  return {
    title: collection.name,
    description: collection.description ?? undefined,
    alternates: { canonical: `/collections/${collection.slug}` },
    openGraph: collection.imageUrl ? { images: [collection.imageUrl] } : undefined,
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) notFound();
  const filters = { ...parseFilters(await searchParams), collection: slug };
  const [result, categories, sizes] = await Promise.all([listProducts(filters), navCategories(), availableSizes()]);
  return (
    <Listing
      title={collection.name}
      description={collection.description}
      basePath={`/collections/${slug}`}
      filters={filters}
      result={result}
      categories={categories}
      sizes={sizes}
      showCategoryFilter
    />
  );
}
