import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/errors";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const { isActive } = await parseBody(req, z.object({ isActive: z.boolean() }));
  if (id === admin.id) throw new HttpError(400, "You can't deactivate your own account.");
  await db.$transaction([
    db.user.update({ where: { id }, data: { isActive } }),
    // Signing out everywhere makes deactivation take effect immediately.
    ...(isActive ? [] : [db.session.deleteMany({ where: { userId: id } })]),
  ]);
  await audit(admin.id, isActive ? "user.activate" : "user.deactivate", "User", id);
  return { ok: true };
});
