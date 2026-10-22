import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { collectionSchema } from "@/lib/validators";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const { productIds, ...data } = await parseBody(req, collectionSchema.partial());
  await db.$transaction(async (tx) => {
    await tx.collection.update({ where: { id }, data });
    if (productIds) {
      await tx.collectionProduct.deleteMany({ where: { collectionId: id } });
      await tx.collectionProduct.createMany({ data: productIds.map((productId, i) => ({ collectionId: id, productId, sortOrder: i })) });
    }
    await audit(admin.id, "collection.update", "Collection", id, { ...data, productIds: productIds ?? null }, tx);
  });
  return { id };
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  await db.collection.delete({ where: { id } });
  await audit(admin.id, "collection.delete", "Collection", id);
  return { deleted: true };
});
