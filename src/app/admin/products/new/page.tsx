import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { db } from "@/lib/db";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
  return (
    <>
      <PageHeader title="New product" description="Saved as a draft unless you choose Published." />
      <ProductForm
        categories={categories}
        initial={{
          name: "", slug: "", sku: "", description: "", categoryId: "", price: "", salePrice: "", status: "DRAFT",
          isFeatured: false, isNewArrival: true, isBestSeller: false, images: [], variants: [],
        }}
      />
    </>
  );
}
