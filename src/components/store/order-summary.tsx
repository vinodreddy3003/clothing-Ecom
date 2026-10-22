import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export function OrderSummary({
  totals,
  currency,
  couponCode,
  className,
  children,
}: {
  totals: { subtotal: number; discount: number; shippingFee: number; total: number };
  currency?: string;
  couponCode?: string | null;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <dl className={cn("space-y-3 text-[15px] tabular", className)}>
      <div className="flex justify-between">
        <dt className="text-stone">Subtotal</dt>
        <dd>{formatMoney(totals.subtotal, currency)}</dd>
      </div>
      {totals.discount > 0 && (
        <div className="flex justify-between">
          <dt className="text-stone">Discount{couponCode ? ` (${couponCode})` : ""}</dt>
          <dd>−{formatMoney(totals.discount, currency)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-stone">Shipping</dt>
        <dd>{totals.shippingFee ? formatMoney(totals.shippingFee, currency) : "Free"}</dd>
      </div>
      <div className="flex justify-between border-t border-line pt-3 text-lg font-bold">
        <dt>Total</dt>
        <dd>{formatMoney(totals.total, currency)}</dd>
      </div>
      {children}
    </dl>
  );
}
