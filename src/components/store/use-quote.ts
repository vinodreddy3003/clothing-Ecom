"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/fetcher";
import type { QuoteLine } from "@/lib/services/orders";
import { useCart } from "@/components/store/providers";

export type Quote = {
  lines: QuoteLine[];
  missing: string[];
  coupon: { code: string; error?: string } | null;
  totals: { subtotal: number; discount: number; shippingFee: number; total: number };
  hasIssues: boolean;
  currency: string;
  codAvailable: boolean;
  freeShippingThreshold: number | null;
};

const COUPON_KEY = "coupon:v1";

export function getSavedCoupon() {
  try {
    return localStorage.getItem(COUPON_KEY) ?? "";
  } catch {
    return "";
  }
}
export function saveCoupon(code: string) {
  try {
    if (code) localStorage.setItem(COUPON_KEY, code);
    else localStorage.removeItem(COUPON_KEY);
  } catch {}
}

/**
 * Server-priced quote for the current bag. Drops lines whose variant no longer exists and
 * clamps quantities to what's in stock, so the bag self-corrects.
 */
export function useQuote(coupon: string) {
  const cart = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const seq = useRef(0);

  const key = JSON.stringify(cart.items) + coupon;
  useEffect(() => {
    if (!cart.ready) return;
    if (!cart.items.length) {
      setQuote(null);
      setLoading(false);
      return;
    }
    const id = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const q = await api<Quote>("/api/cart/quote", { body: { items: cart.items, couponCode: coupon || undefined } });
        if (id !== seq.current) return;
        const fixes: string[] = [];
        for (const m of q.missing) cart.remove(m);
        if (q.missing.length) fixes.push("Some items were removed because they're no longer sold.");
        for (const l of q.lines) {
          if (l.available > 0 && l.quantity > l.available) {
            cart.update(l.variantId, l.available);
            fixes.push(`${l.productName} (${l.size}): only ${l.available} left, quantity updated.`);
          }
        }
        if (fixes.length) setNotices(fixes);
        setQuote(q);
        setError(null);
      } catch (e) {
        if (id === seq.current) setError(e instanceof Error ? e.message : "Couldn't load your bag.");
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, cart.ready]);

  return { quote, loading, error, notices, dismissNotices: () => setNotices([]) };
}
