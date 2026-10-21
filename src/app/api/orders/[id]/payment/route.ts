import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { getSettings } from "@/lib/settings";

/** Razorpay Checkout options for an unpaid online order (first attempt or retry). */
export const GET = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const order = await db.order.findFirst({ where: { id, userId: user.id } });
  if (!order || order.paymentMethod !== "RAZORPAY" || !order.razorpayOrderId) throw new HttpError(404, "Order not found.");
  if (order.status !== "PENDING" || !["PENDING", "FAILED"].includes(order.paymentStatus)) {
    throw new HttpError(409, "This order doesn't need payment.");
  }
  if (order.reservationExpiresAt && order.reservationExpiresAt < new Date()) {
    throw new HttpError(409, "The time to pay for this order has run out. Place the order again.");
  }
  const settings = await getSettings();
  return {
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID,
    amount: order.total,
    currency: order.currency,
    name: settings.storeName,
    description: `Order ${order.number}`,
    order_id: order.razorpayOrderId,
    prefill: { name: order.shippingName, email: order.email, contact: order.phone },
  };
});
