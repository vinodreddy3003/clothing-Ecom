import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { couponSchema } from "@/lib/validators";

// Either a quick active toggle or the full coupon form.
const patchSchema = z.union([z.object({ isActive: z.boolean() }).strict(), couponSchema]);

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const data = await parseBody(req, patchSchema);
  await db.coupon.update({ where: { id }, data });
  await audit(admin.id, "coupon.update", "Coupon", id, JSON.parse(JSON.stringify(data)));
  return { id };
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const c = await db.coupon.delete({ where: { id } });
  await audit(admin.id, "coupon.delete", "Coupon", id, { code: c.code });
  return { deleted: true };
});
