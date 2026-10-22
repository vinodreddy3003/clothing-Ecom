import { route, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { customerCancel } from "@/lib/services/orders";
import { cancelRequestSchema } from "@/lib/validators";

export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const { reason } = await parseBody(req, cancelRequestSchema);
  return customerCancel(id, user.id, reason);
});
