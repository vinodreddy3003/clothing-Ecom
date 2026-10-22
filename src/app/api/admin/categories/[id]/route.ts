import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { categorySchema } from "@/lib/validators";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  // Partial updates let the list toggle active/showInNav without resending the whole form.
  const data = await parseBody(req, categorySchema.partial());
  await db.category.update({ where: { id }, data });
  await audit(admin.id, "category.update", "Category", id, data);
  return { id };
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const count = await db.product.count({ where: { categoryId: id } });
  if (count > 0) throw new HttpError(409, `Move or delete its ${count} product${count === 1 ? "" : "s"} first, or deactivate the category.`);
  await db.category.delete({ where: { id } });
  await audit(admin.id, "category.delete", "Category", id);
  return { deleted: true };
});
