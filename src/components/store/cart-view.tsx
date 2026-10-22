"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/components/store/providers";
import { getSavedCoupon, saveCoupon, useQuote } from "@/components/store/use-quote";
import { OrderSummary } from "@/components/store/order-summary";
import { EmptyState } from "@/components/store/empty-state";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export function CartView() {
  const cart = useCart();
  const [coupon, setCoupon] = useState("");
  const [couponInput, setCouponInput] = useState("");
  useEffect(() => {
    const saved = getSavedCoupon();
    setCoupon(saved);
    setCouponInput(saved);
  }, []);
  const { quote, loading, error, notices, dismissNotices } = useQuote(coupon);

  if (cart.ready && !cart.items.length) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Your bag is empty."
        body="Browse new arrivals and add something you love."
        action={{ label: "Browse new arrivals", href: "/shop?sort=new" }}
      />
    );
  }

  const qtyOf = (variantId: string) => cart.items.find((i) => i.variantId === variantId)?.quantity ?? 0;
  const couponError = quote?.coupon?.error;

  function applyCoupon(e: React.FormEvent) {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    setCoupon(code);
    saveCoupon(code);
  }

  return (
    <div className="pt-2 md:pt-8">
      <h1 className="mb-6 text-[26px] leading-8 font-bold tracking-[-0.02em] md:text-[40px] md:leading-[44px]">
        My bag{cart.ready && cart.count ? ` (${cart.count})` : ""}
      </h1>

      {notices.length > 0 && (
        <div role="status" className="mb-4 flex items-start gap-3 rounded-2xl bg-tile p-4 text-[15px]">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn" />
          <ul className="flex-1 space-y-1">
            {notices.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <button type="button" onClick={dismissNotices} aria-label="Dismiss" className="grid size-8 place-items-center">
            <X className="size-4" />
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mb-4 rounded-2xl bg-[#fee4e2] p-4 text-[15px] text-danger">
          {error}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
        <ul className="space-y-4" aria-busy={loading}>
          {!quote
            ? cart.items.map((i) => <Skeleton key={i.variantId} className="h-32 rounded-3xl bg-tile" />)
            : quote.lines.map((l) => {
                const qty = qtyOf(l.variantId) || l.quantity;
                const unavailable = l.available === 0;
                return (
                  <li key={l.variantId} className="flex gap-4 rounded-3xl border border-line p-3">
                    <Link href={`/product/${l.productSlug}`} className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-2xl bg-tile md:w-28">
                      {l.imageUrl && <Image src={l.imageUrl} alt={l.productName} fill sizes="112px" className={cn("object-cover", unavailable && "opacity-50")} />}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/product/${l.productSlug}`} className="line-clamp-2 font-semibold hover:underline">
                            {l.productName}
                          </Link>
                          <p className="text-sm text-stone">
                            {l.color}, {l.size}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => cart.remove(l.variantId)}
                          aria-label={`Remove ${l.productName} from bag`}
                          className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-tile"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      {l.issue && (
                        <p className={cn("mt-1 text-sm font-medium", unavailable ? "text-danger" : "text-warn")}>{l.issue}</p>
                      )}
                      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                        <p className="tabular">
                          <span className="font-bold">{formatMoney(l.unitPrice, quote.currency)}</span>
                          {l.unitPrice < l.listPrice && (
                            <s className="ml-2 text-sm text-stone">{formatMoney(l.listPrice, quote.currency)}</s>
                          )}
                        </p>
                        {!unavailable && (
                          <div className="flex items-center rounded-full bg-tile" role="group" aria-label={`Quantity of ${l.productName}`}>
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() => cart.update(l.variantId, qty - 1)}
                              className="grid size-10 place-items-center"
                            >
                              <Minus className="size-4" />
                            </button>
                            <span className="w-6 text-center font-semibold tabular" aria-live="polite">
                              {qty}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              disabled={qty >= Math.min(10, l.available)}
                              onClick={() => cart.update(l.variantId, qty + 1)}
                              className="grid size-10 place-items-center disabled:opacity-40"
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
        </ul>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="space-y-5 rounded-3xl bg-tile p-5 md:p-6">
            <form onSubmit={applyCoupon} className="space-y-2">
              <label htmlFor="coupon" className="text-[15px] font-semibold">
                Promo code
              </label>
              <div className="flex gap-2">
                <input
                  id="coupon"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Enter code"
                  aria-invalid={!!couponError}
                  aria-describedby={couponError ? "coupon-error" : undefined}
                  className="h-11 min-w-0 flex-1 rounded-full border border-line bg-paper px-4 uppercase outline-none placeholder:normal-case focus-visible:border-ink"
                />
                {coupon && !couponError ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-full px-5"
                    onClick={() => {
                      setCoupon("");
                      setCouponInput("");
                      saveCoupon("");
                    }}
                  >
                    Remove
                  </Button>
                ) : (
                  <Button type="submit" className="h-11 rounded-full px-5" disabled={!couponInput.trim()}>
                    Apply
                  </Button>
                )}
              </div>
              {couponError && (
                <p id="coupon-error" className="text-sm text-danger">
                  {couponError}
                </p>
              )}
              {coupon && quote && !couponError && <p className="text-sm font-medium">Code {coupon} applied.</p>}
            </form>

            {quote ? (
              <OrderSummary totals={quote.totals} currency={quote.currency} couponCode={couponError ? null : coupon}>
                {quote.freeShippingThreshold != null && quote.totals.shippingFee > 0 && (
                  <p className="text-sm text-stone">
                    Add {formatMoney(quote.freeShippingThreshold - (quote.totals.subtotal - quote.totals.discount), quote.currency)} more for free shipping.
                  </p>
                )}
              </OrderSummary>
            ) : (
              <Skeleton className="h-32 bg-paper" />
            )}

            {quote?.hasIssues && <p className="text-sm font-medium text-danger">Remove unavailable items to continue.</p>}
            <Button
              asChild={!(loading || !quote || quote.hasIssues)}
              variant="lime"
              size="pill"
              className="h-14 w-full text-base"
              disabled={loading || !quote || quote.hasIssues}
            >
              {loading || !quote || quote.hasIssues ? <span>Checkout</span> : <Link href="/checkout">Checkout</Link>}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
