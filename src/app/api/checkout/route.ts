import { route, parseBody, clientIp } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { placeOrder } from "@/lib/services/orders";
import { checkoutSchema } from "@/lib/validators";

export const POST = route(async (req) => {
  const user = await requireUser();
  rateLimit(`checkout:${user.id}:${clientIp(req)}`, 10, 60_000);
  const input = await parseBody(req, checkoutSchema);
  const order = await placeOrder(user.id, input);
  // For online payment the client then fetches /api/orders/[id]/payment for Razorpay Checkout options.
  return { order: { id: order.id, number: order.number, paymentMethod: order.paymentMethod } };
});
