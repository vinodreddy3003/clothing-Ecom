import { CategoryManager } from "@/components/admin/category-manager";
import { PageHeader, Panel } from "@/components/admin/ui";
import { db } from "@/lib/db";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } });
  return (
    <>
      <PageHeader title="Categories" description="Order here is the order customers see in the navigation and category chips." />
      <Panel>
        <CategoryManager
          categories={categories.map((c) => ({
            id: c.id, name: c.name, slug: c.slug, description: c.description, imageUrl: c.imageUrl,
            isActive: c.isActive, showInNav: c.showInNav, products: c._count.products,
          }))}
        />
      </Panel>
    </>
  );
}
