import type { Coupon, StoreSettings } from "@prisma/client";

// Pure functions: no DB access, so they are trivially testable and shared by cart preview and checkout.

export const effectivePrice = (p: { price: number; salePrice: number | null }) =>
  p.salePrice != null && p.salePrice < p.price ? p.salePrice : p.price;

export const discountPercent = (p: { price: number; salePrice: number | null }) =>
  p.salePrice != null && p.salePrice < p.price ? Math.round((1 - p.salePrice / p.price) * 100) : 0;

type CouponRule = Pick<
  Coupon,
  "type" | "value" | "minSubtotal" | "maxDiscount" | "usageLimit" | "usedCount" | "startsAt" | "endsAt" | "isActive"
>;

/** Returns the discount in paise, or an error message explaining why the coupon can't be used. */
export function evaluateCoupon(
  coupon: CouponRule | null,
  subtotal: number,
  now = new Date(),
): { discount: number; error?: string } {
  if (!coupon || !coupon.isActive) return { discount: 0, error: "This code isn't valid." };
  if (coupon.startsAt && coupon.startsAt > now) return { discount: 0, error: "This code isn't active yet." };
  if (coupon.endsAt && coupon.endsAt < now) return { discount: 0, error: "This code has expired." };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit)
    return { discount: 0, error: "This code has reached its usage limit." };
  if (subtotal < coupon.minSubtotal)
    return { discount: 0, error: `Add items worth ${coupon.minSubtotal / 100} or more to use this code.` };

  let discount =
    coupon.type === "PERCENT" ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  return { discount: Math.min(discount, subtotal) };
}

export function shippingFor(
  subtotalAfterDiscount: number,
  settings: Pick<StoreSettings, "shippingFee" | "freeShippingThreshold">,
) {
  if (subtotalAfterDiscount === 0) return 0;
  if (settings.freeShippingThreshold != null && subtotalAfterDiscount >= settings.freeShippingThreshold) return 0;
  return settings.shippingFee;
}

export function computeTotals(
  lines: { unitPrice: number; quantity: number }[],
  discount: number,
  settings: Pick<StoreSettings, "shippingFee" | "freeShippingThreshold">,
) {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const safeDiscount = Math.max(0, Math.min(discount, subtotal));
  const shippingFee = shippingFor(subtotal - safeDiscount, settings);
  return { subtotal, discount: safeDiscount, shippingFee, total: subtotal - safeDiscount + shippingFee };
}
