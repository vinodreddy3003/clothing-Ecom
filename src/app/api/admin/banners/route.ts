import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { bannerSchema } from "@/lib/validators";

export const POST = route(async (req) => {
  const admin = await requireAdmin();
  const data = await parseBody(req, bannerSchema);
  const last = await db.banner.aggregate({ _max: { sortOrder: true } });
  const banner = await db.banner.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  await audit(admin.id, "banner.create", "Banner", banner.id, data);
  return { id: banner.id };
});
