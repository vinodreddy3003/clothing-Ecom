import { route, parseBody } from "@/lib/api";
import { quoteCart } from "@/lib/services/orders";
import { cartSchema } from "@/lib/validators";

export const POST = route(async (req) => {
  const { items, couponCode } = await parseBody(req, cartSchema);
  const { lines, missing, coupon, totals, hasIssues, settings } = await quoteCart(items, couponCode || undefined);
  return {
    lines,
    missing,
    coupon,
    totals,
    hasIssues,
    currency: settings.currency,
    codAvailable: settings.codEnabled && (settings.codMaxTotal == null || totals.total <= settings.codMaxTotal),
    freeShippingThreshold: settings.freeShippingThreshold,
  };
});
