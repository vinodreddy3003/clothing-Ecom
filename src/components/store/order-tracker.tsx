import type { OrderStatus } from "@prisma/client";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "PENDING", label: "Placed" },
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "PROCESSING", label: "Processing" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "DELIVERED", label: "Delivered" },
];

/** Status steps; vertical on mobile, horizontal from md. Cancelled orders show one red step. */
export function OrderTracker({ status, dates }: { status: OrderStatus; dates: Partial<Record<OrderStatus, Date | null>> }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-[#fee4e2] p-4 text-danger">
        <span className="grid size-8 place-items-center rounded-full bg-danger text-paper">
          <X className="size-4" />
        </span>
        <p className="font-semibold">This order was cancelled.</p>
      </div>
    );
  }
  const current = STEPS.findIndex((s) => s.status === status);
  const fmt = (d?: Date | null) => (d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : null);
  return (
    <ol className="flex flex-col gap-0 md:flex-row" aria-label="Order progress">
      {STEPS.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s.status} className="relative flex gap-3 pb-6 last:pb-0 md:flex-1 md:flex-col md:items-center md:pb-0 md:text-center">
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-8 left-[15px] h-[calc(100%-2rem)] w-0.5 md:top-[15px] md:left-[calc(50%+16px)] md:h-0.5 md:w-[calc(100%-32px)]",
                  i < current ? "bg-ink" : "bg-line",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2",
                done ? "border-ink bg-ink text-paper" : "border-line bg-paper",
                i === current && "border-ink bg-lime text-ink",
              )}
            >
              {done && <Check className="size-4" strokeWidth={3} />}
            </span>
            <span className="md:mt-2">
              <span className={cn("block text-[15px] font-semibold", !done && "text-stone")} aria-current={i === current ? "step" : undefined}>
                {s.label}
              </span>
              {fmt(dates[s.status]) && <span className="block text-sm text-stone">{fmt(dates[s.status])}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
