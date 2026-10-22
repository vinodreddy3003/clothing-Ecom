import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { settingsSchema } from "@/lib/validators";

export const PATCH = route(async (req) => {
  const admin = await requireAdmin();
  const data = await parseBody(req, settingsSchema);
  await db.storeSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  await audit(admin.id, "settings.update", "StoreSettings", "1", data);
  return { ok: true };
});
