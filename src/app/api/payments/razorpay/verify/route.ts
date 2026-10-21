import { route, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { markOrderPaid } from "@/lib/services/orders";
import { razorpayVerifySchema } from "@/lib/validators";

// Called by the browser after Razorpay Checkout succeeds. The order is only marked paid
// if the HMAC signature checks out against our secret; the frontend's word alone is never enough.
export const POST = route(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, razorpayVerifySchema);
  const order = await db.order.findFirst({ where: { id: body.orderId, userId: user.id }, select: { razorpayOrderId: true } });
  if (!order || order.razorpayOrderId !== body.razorpay_order_id) throw new HttpError(404, "Order not found.");
  if (!verifyPaymentSignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)) {
    throw new HttpError(400, "We couldn't verify this payment. If money was deducted, it will be confirmed or refunded automatically.");
  }
  const { order: updated } = await markOrderPaid(body.razorpay_order_id, body.razorpay_payment_id, "checkout");
  return { status: updated.status, paymentStatus: updated.paymentStatus };
});
