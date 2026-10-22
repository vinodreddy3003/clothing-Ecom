import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, relatedProducts, toDetailProps } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { effectivePrice } from "@/lib/services/pricing";
import { ProductDetail } from "@/components/store/product-detail";
import { ProductGrid, SectionHeading } from "@/components/store/product-card";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { title: "Product not found" };
  const description = product.description.slice(0, 160);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: { title: product.name, description, images: product.images.slice(0, 1).map((i) => ({ url: i.url, alt: i.alt })) },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const [settings, related] = await Promise.all([getSettings(), relatedProducts(product.id, product.categoryId)]);
  const inStock = product.variants.some((v) => v.stock > 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    image: product.images.map((i) => i.url),
    category: product.category.name,
    brand: { "@type": "Brand", name: settings.storeName },
    offers: {
      "@type": "Offer",
      priceCurrency: settings.currency,
      price: (effectivePrice(product) / 100).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `/product/${product.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ProductDetail product={toDetailProps(product, settings.currency)} />
      {related.length > 0 && (
        <section className="mt-16 md:mt-24">
          <SectionHeading title="You may also like" href={`/category/${product.category.slug}`} />
          <ProductGrid products={related} />
        </section>
      )}
    </>
  );
}
