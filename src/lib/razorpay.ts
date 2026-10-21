import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";

export const isRazorpayConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

let client: Razorpay | null = null;
export function getRazorpay() {
  if (!isRazorpayConfigured()) throw new Error("Razorpay keys are not configured");
  client ??= new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
  return client;
}

function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Checkout handler signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
  secret = process.env.RAZORPAY_KEY_SECRET ?? "",
) {
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw body, webhook secret). */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
) {
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
