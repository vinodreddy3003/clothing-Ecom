import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { collectionSchema } from "@/lib/validators";

export const POST = route(async (req) => {
  const admin = await requireAdmin();
  const { productIds, ...data } = await parseBody(req, collectionSchema);
  const last = await db.collection.aggregate({ _max: { sortOrder: true } });
  const c = await db.collection.create({
    data: {
      ...data,
      sortOrder: (last._max.sortOrder ?? -1) + 1,
      products: { create: productIds.map((productId, i) => ({ productId, sortOrder: i })) },
    },
  });
  await audit(admin.id, "collection.create", "Collection", c.id, { ...data, productIds });
  return { id: c.id };
});
