import Image from "next/image";
import Link from "next/link";
import { homeData } from "@/lib/catalog";
import { HeroBanner } from "@/components/store/hero-banner";
import { CategoryChips } from "@/components/store/category-chips";
import { SearchBar } from "@/components/store/search-bar";
import { ProductGrid, ProductRail, SectionHeading } from "@/components/store/product-card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { banners, categories, featured, newArrivals, bestSellers, collections } = await homeData();

  return (
    <div className="space-y-10 pt-2 md:space-y-16 md:pt-8">
      <div className="space-y-5 md:space-y-8">
        <SearchBar className="md:hidden" />
        <HeroBanner banners={banners} />
        <div className="lg:hidden">
          <CategoryChips categories={categories} />
        </div>
      </div>

      {categories.length > 0 && (
        <section className="hidden lg:block" aria-labelledby="shop-by-category">
          <SectionHeading title="Shop by category" />
          <div className="grid grid-cols-4 gap-6">
            {categories.map((c) => (
              <Link key={c.id} href={`/category/${c.slug}`} className="group relative block overflow-hidden rounded-3xl bg-tile">
                <div className="relative aspect-[4/5]">
                  {c.imageUrl && (
                    <Image src={c.imageUrl} alt="" fill sizes="25vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  )}
                </div>
                <span className="absolute bottom-4 left-4 rounded-full bg-paper px-5 py-2.5 text-[15px] font-semibold">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section>
          <SectionHeading title="Special for you" href="/shop" />
          <ProductGrid products={featured} />
        </section>
      )}
      {newArrivals.length > 0 && (
        <section>
          <SectionHeading title="New arrivals" href="/shop?sort=new" />
          <ProductRail products={newArrivals.slice(0, 8)} />
        </section>
      )}
      {bestSellers.length > 0 && (
        <section>
          <SectionHeading title="Best sellers" href="/shop" />
          <ProductRail products={bestSellers.slice(0, 8)} />
        </section>
      )}
      {collections
        .filter((c) => c.products.length)
        .map((c) => (
          <section key={c.id}>
            <SectionHeading title={c.name} href={`/collections/${c.slug}`} />
            {c.description && <p className="-mt-2 mb-5 max-w-xl text-[15px] text-stone md:-mt-3">{c.description}</p>}
            <ProductRail products={c.products.map((p) => p.product)} />
          </section>
        ))}
    </div>
  );
}
