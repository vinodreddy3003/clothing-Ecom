import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { productSchema } from "@/lib/validators";
import { saveProduct } from "./_save";

export const POST = route(async (req) => {
  const admin = await requireAdmin();
  return saveProduct(admin.id, await parseBody(req, productSchema));
});
