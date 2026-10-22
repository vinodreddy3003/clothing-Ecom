import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const { isRead } = await parseBody(req, z.object({ isRead: z.boolean() }));
  await db.contactMessage.update({ where: { id }, data: { isRead } });
  return { ok: true };
});
