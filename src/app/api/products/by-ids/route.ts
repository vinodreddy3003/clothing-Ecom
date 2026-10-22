import { route } from "@/lib/api";
import { productsByIds } from "@/lib/catalog";

export const GET = route(async (req) => {
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 100);
  return { products: ids.length ? await productsByIds(ids) : [] };
});
