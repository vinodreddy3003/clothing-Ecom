import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { reorderSchema } from "@/lib/validators";

export const POST = route(async (req) => {
  const admin = await requireAdmin();
  const { ids } = await parseBody(req, reorderSchema);
  await db.$transaction(ids.map((id, i) => db.banner.update({ where: { id }, data: { sortOrder: i } })));
  await audit(admin.id, "banner.reorder", "Banner", null, { ids });
  return { ok: true };
});
