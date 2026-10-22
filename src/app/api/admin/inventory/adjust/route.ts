import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { adjustStock } from "@/lib/services/inventory";
import { stockAdjustSchema } from "@/lib/validators";

export const POST = route(async (req) => {
  const admin = await requireAdmin();
  const input = await parseBody(req, stockAdjustSchema);
  const adj = await adjustStock(admin.id, input);
  return { stock: adj.stockAfter };
});
