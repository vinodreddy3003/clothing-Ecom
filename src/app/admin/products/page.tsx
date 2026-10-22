import Link from "next/link";
import type { Prisma, ProductStatus } from "@prisma/client";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, Pagination, Panel, Table, pageParam, selectClass, tdClass, thClass } from "@/components/admin/ui";
import { StatusBadge } from "@/components/status-badge";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Products" };
const PER_PAGE = 20;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const status = ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(sp.status ?? "") ? (sp.status as ProductStatus) : undefined;
  const where: Prisma.ProductWhereInput = {
    ...(status ? { status } : {}),
    ...(sp.category ? { categoryId: sp.category } : {}),
    ...(sp.q
      ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { sku: { contains: sp.q, mode: "insensitive" } }] }
      : {}),
  };
  const [products, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        category: { select: { name: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: { select: { stock: true, isActive: true, lowStockThreshold: true } },
      },
    }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Products"
        description={`${total} product${total === 1 ? "" : "s"}`}
        actions={
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus /> New product
            </Link>
          </Button>
        }
      />
      <Panel>
        <form className="flex flex-wrap gap-2 border-b border-line p-4" role="search">
          <Input name="q" defaultValue={sp.q} placeholder="Search name or SKU" aria-label="Search products" className="w-full sm:w-64" />
          <select name="status" defaultValue={sp.status ?? ""} className={selectClass} aria-label="Status">
            <option value="">All statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select name="category" defaultValue={sp.category ?? ""} className={selectClass} aria-label="Category">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary">Filter</Button>
          {(sp.q || sp.status || sp.category) && (
            <Button variant="ghost" asChild>
              <Link href="/admin/products">Clear</Link>
            </Button>
          )}
        </form>
        {products.length === 0 ? (
          <EmptyState
            message={total === 0 && !sp.q && !status ? "No products yet. Create your first product." : "No products match these filters."}
            action={<Button asChild variant="outline"><Link href="/admin/products/new">New product</Link></Button>}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={thClass}>Product</th>
                <th className={thClass}>Category</th>
                <th className={thClass}>Price</th>
                <th className={thClass}>Stock</th>
                <th className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const active = p.variants.filter((v) => v.isActive);
                const stock = active.reduce((s, v) => s + v.stock, 0);
                const low = active.filter((v) => v.stock <= v.lowStockThreshold).length;
                return (
                  <tr key={p.id}>
                    <td className={tdClass}>
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 hover:underline">
                        <span className="h-12 w-10 shrink-0 overflow-hidden rounded-md bg-tile">
                          {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                          {p.images[0] && <img src={p.images[0].url} alt="" className="size-full object-cover" />}
                        </span>
                        <span>
                          <span className="block font-medium">{p.name}</span>
                          <span className="block text-xs text-stone">{p.sku}</span>
                        </span>
                      </Link>
                    </td>
                    <td className={tdClass}>{p.category.name}</td>
                    <td className={`${tdClass} tabular whitespace-nowrap`}>
                      {formatMoney(p.salePrice ?? p.price)}
                      {p.salePrice != null && <span className="ml-1 text-xs text-stone line-through">{formatMoney(p.price)}</span>}
                    </td>
                    <td className={`${tdClass} tabular`}>
                      {stock}
                      {low > 0 && <span className="ml-2 text-xs text-warn">{low} low</span>}
                    </td>
                    <td className={tdClass}>
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} params={sp} basePath="/admin/products" />
      </Panel>
    </>
  );
}
