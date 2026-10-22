import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { completeRefund, startRefund } from "@/lib/services/orders";

const schema = z.object({
  action: z.enum(["start", "complete"]),
  reference: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
});

export const POST = route<{ id: string }>(async (req, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const body = await parseBody(req, schema);
  if (body.action === "start") await startRefund(id, admin.id, body.note);
  else await completeRefund(id, admin.id, body.reference);
  return { ok: true };
});
