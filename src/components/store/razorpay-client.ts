"use client";

import { api } from "@/lib/fetcher";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let loading: Promise<void> | null = null;
function loadScript() {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("Couldn't load the payment window. Check your connection and try again."));
    };
    document.body.appendChild(s);
  });
  return loading;
}

/**
 * Opens Razorpay Checkout for an order. Resolves "paid" only after the server verified the signature;
 * "dismissed" when the customer closed the window. The order stays reserved for retry either way.
 */
export async function payForOrder(orderId: string): Promise<"paid" | "dismissed"> {
  const [options] = await Promise.all([api<Record<string, unknown>>(`/api/orders/${orderId}/payment`), loadScript()]);
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      ...options,
      theme: { color: "#000000" },
      handler: async (res: RazorpayResponse) => {
        try {
          await api("/api/payments/razorpay/verify", { body: { orderId, ...res } });
          resolve("paid");
        } catch (e) {
          reject(e);
        }
      },
      modal: { ondismiss: () => resolve("dismissed") },
    });
    rzp.open();
  });
}
