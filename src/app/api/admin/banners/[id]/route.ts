import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { bannerSchema } from "@/lib/validators";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const data = await parseBody(req, bannerSchema.partial());
  await db.banner.update({ where: { id }, data });
  await audit(admin.id, "banner.update", "Banner", id, data);
  return { id };
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  await db.banner.delete({ where: { id } });
  await audit(admin.id, "banner.delete", "Banner", id);
  return { deleted: true };
});
