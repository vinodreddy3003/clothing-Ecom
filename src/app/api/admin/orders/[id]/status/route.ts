import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { updateOrderStatus } from "@/lib/services/orders";
import { orderStatusSchema } from "@/lib/validators";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  await updateOrderStatus(id, admin.id, await parseBody(req, orderStatusSchema));
  return { ok: true };
});
