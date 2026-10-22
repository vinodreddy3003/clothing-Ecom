import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { productSchema } from "@/lib/validators";
import { saveProduct } from "../_save";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  return saveProduct(admin.id, await parseBody(req, productSchema), id);
});

/** Hard-deletes a product that was never ordered; otherwise archives it so order history stays intact. */
export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id }, include: { _count: { select: { orderItems: true } } } });
  if (!product) throw new HttpError(404, "Product not found.");
  if (product._count.orderItems > 0) {
    await db.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    await audit(admin.id, "product.archive", "Product", id, { name: product.name });
    return { archived: true };
  }
  await db.product.delete({ where: { id } });
  await audit(admin.id, "product.delete", "Product", id, { name: product.name, sku: product.sku });
  return { deleted: true };
});
