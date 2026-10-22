import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { DetailProps } from "@/components/store/product-detail";

// Storefront reads. Everything here returns PUBLISHED products in ACTIVE categories only.

export const PAGE_SIZE = 24;

const visible = { status: "PUBLISHED", category: { isActive: true } } satisfies Prisma.ProductWhereInput;

export const cardSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  salePrice: true,
  category: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" }, take: 2, select: { url: true, alt: true } },
  variants: { where: { isActive: true }, select: { stock: true } },
} satisfies Prisma.ProductSelect;

export type CardProduct = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export type ListFilters = {
  q?: string;
  category?: string;
  collection?: string;
  min?: number; // rupees
  max?: number; // rupees
  size?: string;
  inStock?: boolean;
  sort?: "new" | "price-asc" | "price-desc" | "discount";
  page?: number;
};

export function parseFilters(sp: Record<string, string | string[] | undefined>): ListFilters {
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const num = (k: string) => {
    const n = Number(one(k));
    return Number.isFinite(n) && n >= 0 && one(k) !== undefined ? n : undefined;
  };
  const sort = one("sort");
  return {
    q: one("q")?.slice(0, 100),
    category: one("category"),
    min: num("min"),
    max: num("max"),
    size: one("size")?.slice(0, 20),
    inStock: one("inStock") === "1",
    sort: sort === "price-asc" || sort === "price-desc" || sort === "discount" ? sort : "new",
    page: Math.max(1, Math.floor(num("page") ?? 1)),
  };
}

/**
 * Filtered, sorted, paginated listing. Filtering and sorting run in one SQL query over the effective
 * price (COALESCE(salePrice, price)) so pagination and totals stay correct; cards are then loaded by id.
 */
export async function listProducts(f: ListFilters) {
  const where: Prisma.Sql[] = [Prisma.sql`p.status = 'PUBLISHED'`, Prisma.sql`c."isActive" = true`];
  if (f.q) {
    const like = `%${f.q.replace(/[%_\\]/g, "\\$&")}%`;
    where.push(Prisma.sql`(p.name ILIKE ${like} OR p.description ILIKE ${like} OR c.name ILIKE ${like})`);
  }
  if (f.category) where.push(Prisma.sql`c.slug = ${f.category}`);
  if (f.collection) {
    where.push(Prisma.sql`EXISTS (SELECT 1 FROM "CollectionProduct" cp JOIN "Collection" col ON col.id = cp."collectionId"
      WHERE cp."productId" = p.id AND col.slug = ${f.collection} AND col."isActive" = true)`);
  }
  const price = Prisma.sql`COALESCE(p."salePrice", p.price)`;
  if (f.min != null) where.push(Prisma.sql`${price} >= ${Math.round(f.min * 100)}`);
  if (f.max != null) where.push(Prisma.sql`${price} <= ${Math.round(f.max * 100)}`);
  if (f.size || f.inStock) {
    const conds = [Prisma.sql`v."productId" = p.id`, Prisma.sql`v."isActive" = true`];
    if (f.size) conds.push(Prisma.sql`v.size = ${f.size}`);
    if (f.inStock) conds.push(Prisma.sql`v.stock > 0`);
    where.push(Prisma.sql`EXISTS (SELECT 1 FROM "Variant" v WHERE ${Prisma.join(conds, " AND ")})`);
  }
  const order =
    f.sort === "price-asc"
      ? Prisma.sql`${price} ASC, p.id`
      : f.sort === "price-desc"
        ? Prisma.sql`${price} DESC, p.id`
        : f.sort === "discount"
          ? Prisma.sql`(p.price - ${price})::float / p.price DESC, p."publishedAt" DESC NULLS LAST, p.id`
          : Prisma.sql`p."publishedAt" DESC NULLS LAST, p."createdAt" DESC, p.id`;
  const whereSql = Prisma.join(where, " AND ");
  const page = f.page ?? 1;

  const [rows, [{ count }]] = await Promise.all([
    db.$queryRaw<{ id: string }[]>`
      SELECT p.id FROM "Product" p JOIN "Category" c ON c.id = p."categoryId"
      WHERE ${whereSql} ORDER BY ${order} LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count FROM "Product" p JOIN "Category" c ON c.id = p."categoryId" WHERE ${whereSql}`,
  ]);
  const ids = rows.map((r) => r.id);
  const products = await db.product.findMany({ where: { id: { in: ids } }, select: cardSelect });
  const byId = new Map(products.map((p) => [p.id, p]));
  return { items: ids.map((id) => byId.get(id)!).filter(Boolean), total: Number(count), page, pages: Math.ceil(Number(count) / PAGE_SIZE) };
}

export async function availableSizes() {
  const rows = await db.variant.findMany({
    where: { isActive: true, product: visible },
    distinct: ["size"],
    select: { size: true },
  });
  const order = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
  const rank = (s: string) => (order.includes(s) ? order.indexOf(s) : 100);
  return rows.map((r) => r.size).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, undefined, { numeric: true }));
}

export const navCategories = () =>
  db.category.findMany({
    where: { isActive: true, showInNav: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true, imageUrl: true },
  });

export const getCategory = (slug: string) => db.category.findFirst({ where: { slug, isActive: true } });

export const getCollection = (slug: string) => db.collection.findFirst({ where: { slug, isActive: true } });

export const getProductBySlug = (slug: string) =>
  db.product.findFirst({
    where: { slug, ...visible },
    include: {
      category: { select: { name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
    },
  });

/** Any product (incl. drafts) for admin preview. */
export const getProductForPreview = (id: string) =>
  db.product.findUnique({
    where: { id },
    include: {
      category: { select: { name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
    },
  });

export type DetailProduct = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

const byFlag = (flag: "isFeatured" | "isNewArrival" | "isBestSeller", take = 8) =>
  db.product.findMany({
    where: { ...visible, [flag]: true },
    orderBy: { publishedAt: "desc" },
    take,
    select: cardSelect,
  });

export async function homeData() {
  const [banners, categories, featured, newArrivals, bestSellers, collections] = await Promise.all([
    db.banner.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    navCategories(),
    byFlag("isFeatured"),
    byFlag("isNewArrival", 10),
    byFlag("isBestSeller", 10),
    db.collection.findMany({
      where: { isActive: true, showOnHome: true },
      orderBy: { sortOrder: "asc" },
      include: {
        products: {
          where: { product: visible },
          orderBy: { sortOrder: "asc" },
          take: 8,
          select: { product: { select: cardSelect } },
        },
      },
    }),
  ]);
  return { banners, categories, featured, newArrivals, bestSellers, collections };
}

export const relatedProducts = (productId: string, categoryId: string) =>
  db.product.findMany({
    where: { ...visible, categoryId, id: { not: productId } },
    orderBy: [{ isBestSeller: "desc" }, { publishedAt: "desc" }],
    take: 4,
    select: cardSelect,
  });

export const productsByIds = (ids: string[]) =>
  db.product.findMany({ where: { ...visible, id: { in: ids.slice(0, 100) } }, select: cardSelect });

/** Serializable props for <ProductDetail> (storefront PDP and admin preview). */
export function toDetailProps(product: DetailProduct, currency: string): DetailProps {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    salePrice: product.salePrice,
    currency,
    category: product.category,
    images: product.images.map(({ id, url, alt }) => ({ id, url, alt })),
    variants: product.variants.map(({ id, size, color, colorHex, stock, lowStockThreshold }) => ({
      id, size, color, colorHex, stock, lowStockThreshold,
    })),
  };
}
