import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { dismissCancelRequest } from "@/lib/services/orders";

export const POST = route<{ id: string }>(async (req, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const { note } = await parseBody(req, z.object({ note: z.string().trim().max(500).optional() }));
  await dismissCancelRequest(id, admin.id, note);
  return { ok: true };
});
