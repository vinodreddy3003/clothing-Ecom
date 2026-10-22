import "server-only";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import type { ProductInput } from "@/lib/validators";

/**
 * Create or update a product with its images and variants.
 * Existing variants never have stock changed here (stock only moves through adjustStock / orders).
 * Removed variants with order history are deactivated, others deleted.
 */
type Input = Omit<ProductInput, "salePrice"> & { salePrice?: number | null };

export async function saveProduct(adminId: string, input: Input, id?: string) {
  return db.$transaction(
    async (tx) => {
      const existing = id
        ? await tx.product.findUnique({
            where: { id },
            include: { variants: { include: { _count: { select: { orderItems: true } } } } },
          })
        : null;
      if (id && !existing) throw new HttpError(404, "Product not found.");
      if (!(await tx.category.findUnique({ where: { id: input.categoryId } }))) {
        throw new HttpError(400, "Choose a category.", { categoryId: "Category not found" });
      }

      const data = {
        name: input.name,
        slug: input.slug,
        sku: input.sku,
        description: input.description,
        categoryId: input.categoryId,
        price: input.price,
        salePrice: input.salePrice ?? null,
        status: input.status,
        isFeatured: input.isFeatured,
        isNewArrival: input.isNewArrival,
        isBestSeller: input.isBestSeller,
        publishedAt: input.status === "PUBLISHED" ? (existing?.publishedAt ?? new Date()) : (existing?.publishedAt ?? null),
      };
      const product = existing
        ? await tx.product.update({ where: { id: existing.id }, data })
        : await tx.product.create({ data });

      await tx.productImage.deleteMany({ where: { productId: product.id } });
      if (input.images.length) {
        await tx.productImage.createMany({
          data: input.images.map((img, i) => ({ productId: product.id, url: img.url, alt: img.alt, sortOrder: i })),
        });
      }

      const current = new Map((existing?.variants ?? []).map((v) => [v.id, v]));
      const keep = new Set<string>();
      for (const v of input.variants) {
        const fields = { size: v.size, color: v.color, colorHex: v.colorHex, sku: v.sku, lowStockThreshold: v.lowStockThreshold, isActive: v.isActive };
        if (v.id && current.has(v.id)) {
          keep.add(v.id);
          await tx.variant.update({ where: { id: v.id }, data: fields });
        } else {
          const created = await tx.variant.create({ data: { ...fields, productId: product.id, stock: v.stock } });
          await tx.stockAdjustment.create({
            data: { variantId: created.id, delta: v.stock, stockAfter: v.stock, reason: "INITIAL", userId: adminId, note: "Variant created" },
          });
        }
      }
      for (const v of current.values()) {
        if (keep.has(v.id)) continue;
        if (v._count.orderItems > 0) await tx.variant.update({ where: { id: v.id }, data: { isActive: false } });
        else await tx.variant.delete({ where: { id: v.id } });
      }

      await audit(adminId, existing ? "product.update" : "product.create", "Product", product.id, {
        name: input.name,
        status: input.status,
        price: input.price,
        salePrice: input.salePrice ?? null,
        ...(existing && existing.status !== input.status ? { statusFrom: existing.status } : {}),
      }, tx);
      return { id: product.id };
    },
    { timeout: 20_000 },
  );
}
