import Link from "next/link";
import { BannerManager, CollectionManager } from "@/components/admin/homepage-manager";
import { PageHeader, Panel } from "@/components/admin/ui";
import { db } from "@/lib/db";

export const metadata = { title: "Homepage" };

export default async function HomepageAdmin() {
  const [banners, collections, products, flags] = await Promise.all([
    db.banner.findMany({ orderBy: { sortOrder: "asc" } }),
    db.collection.findMany({ orderBy: { sortOrder: "asc" }, include: { products: { orderBy: { sortOrder: "asc" }, select: { productId: true } } } }),
    db.product.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true, status: true } }),
    Promise.all([
      db.product.count({ where: { status: "PUBLISHED", isFeatured: true } }),
      db.product.count({ where: { status: "PUBLISHED", isNewArrival: true } }),
      db.product.count({ where: { status: "PUBLISHED", isBestSeller: true } }),
    ]),
  ]);
  return (
    <>
      <PageHeader title="Homepage" description="Banners, promotional collections and product sections. Changes show on the store immediately." />
      <div className="flex flex-col gap-6">
        <Panel title="Hero banners">
          <BannerManager banners={banners} />
        </Panel>
        <Panel title="Collections">
          <CollectionManager
            products={products}
            collections={collections.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, imageUrl: c.imageUrl, showOnHome: c.showOnHome, isActive: c.isActive, productIds: c.products.map((p) => p.productId) }))}
          />
        </Panel>
        <Panel title="Product sections">
          <p className="p-4 text-sm text-stone">
            Featured ({flags[0]}), New arrivals ({flags[1]}) and Best sellers ({flags[2]}) are filled from published products with those
            flags. Set them on each product, or <Link href="/admin/products" className="text-ink underline">open products</Link>. Discounts come from each
            product&apos;s sale price and from <Link href="/admin/coupons" className="text-ink underline">coupons</Link>.
          </p>
        </Panel>
      </div>
    </>
  );
}
