import { route, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { profileSchema } from "@/lib/validators";

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const input = await parseBody(req, profileSchema);
  await db.user.update({ where: { id: user.id }, data: input });
  return { ok: true };
});
