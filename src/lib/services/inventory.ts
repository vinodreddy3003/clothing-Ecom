import type { StockReason } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { audit } from "@/lib/audit";

/** Manual stock change by an admin. Never lets stock go below zero; always leaves an adjustment record. */
export async function adjustStock(
  adminId: string,
  input: { variantId: string; delta: number; reason: Exclude<StockReason, "ORDER_PLACED" | "ORDER_CANCELLED">; note?: string },
) {
  return db.$transaction(async (tx) => {
    const res = await tx.variant.updateMany({
      where: { id: input.variantId, ...(input.delta < 0 ? { stock: { gte: -input.delta } } : {}) },
      data: { stock: { increment: input.delta } },
    });
    if (res.count !== 1) {
      const exists = await tx.variant.count({ where: { id: input.variantId } });
      throw exists
        ? new HttpError(409, "Stock can't go below zero.", { delta: "More than what's in stock" })
        : new HttpError(404, "Variant not found.");
    }
    const variant = await tx.variant.findUniqueOrThrow({ where: { id: input.variantId }, select: { stock: true, sku: true } });
    const adjustment = await tx.stockAdjustment.create({
      data: { ...input, stockAfter: variant.stock, userId: adminId },
    });
    await audit(adminId, "stock.adjust", "Variant", input.variantId, { sku: variant.sku, ...input, stockAfter: variant.stock }, tx);
    return adjustment;
  });
}
