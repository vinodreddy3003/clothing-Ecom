import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductPreview } from "@/components/admin/product-preview";
import { StatusBadge } from "@/components/status-badge";
import { db } from "@/lib/db";

export const metadata = { title: "Preview product" };

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await db.product.findUnique({
    where: { id },
    include: { category: true, images: { orderBy: { sortOrder: "asc" } }, variants: { orderBy: { createdAt: "asc" } } },
  });
  if (!p) notFound();
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-paper">
        <span className="flex items-center gap-2">
          Preview — {p.status === "PUBLISHED" ? "this is what customers see" : "not published"} <StatusBadge status={p.status} />
        </span>
        <Link href={`/admin/products/${p.id}`} className="underline">
          Back to edit
        </Link>
      </div>
      <ProductPreview
        p={{
          name: p.name,
          description: p.description,
          category: p.category.name,
          price: p.price,
          salePrice: p.salePrice,
          images: p.images,
          variants: p.variants,
        }}
      />
    </div>
  );
}
