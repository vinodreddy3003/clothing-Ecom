import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { StatusBadge } from "@/components/status-badge";
import { db } from "@/lib/db";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: [{ color: "asc" }, { createdAt: "asc" }] },
        _count: { select: { orderItems: true } },
      },
    }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();

  return (
    <>
      <PageHeader
        title={product.name}
        description={`Last updated ${product.updatedAt.toLocaleString("en-IN")}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={product.status} />
            {product.status === "PUBLISHED" && (
              <Link href={`/product/${product.slug}`} target="_blank" className="text-sm underline">
                View in store
              </Link>
            )}
          </div>
        }
      />
      <ProductForm
        productId={product.id}
        hasOrders={product._count.orderItems > 0}
        categories={categories}
        initial={{
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          description: product.description,
          categoryId: product.categoryId,
          price: String(product.price / 100),
          salePrice: product.salePrice != null ? String(product.salePrice / 100) : "",
          status: product.status,
          isFeatured: product.isFeatured,
          isNewArrival: product.isNewArrival,
          isBestSeller: product.isBestSeller,
          images: product.images.map((i) => ({ url: i.url, alt: i.alt })),
          variants: product.variants.map((v) => ({
            id: v.id,
            size: v.size,
            color: v.color,
            colorHex: v.colorHex,
            sku: v.sku,
            stock: String(v.stock),
            lowStockThreshold: String(v.lowStockThreshold),
            isActive: v.isActive,
          })),
        }}
      />
    </>
  );
}
