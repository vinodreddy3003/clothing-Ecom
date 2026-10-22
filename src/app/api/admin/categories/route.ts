import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { categorySchema } from "@/lib/validators";

export const POST = route(async (req) => {
  const admin = await requireAdmin();
  const data = await parseBody(req, categorySchema);
  const last = await db.category.aggregate({ _max: { sortOrder: true } });
  const category = await db.category.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  await audit(admin.id, "category.create", "Category", category.id, data);
  return { id: category.id };
});
