import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { couponSchema } from "@/lib/validators";

export const POST = route(async (req) => {
  const admin = await requireAdmin();
  const data = await parseBody(req, couponSchema);
  const coupon = await db.coupon.create({ data });
  await audit(admin.id, "coupon.create", "Coupon", coupon.id, { code: data.code, type: data.type, value: data.value });
  return { id: coupon.id };
});
