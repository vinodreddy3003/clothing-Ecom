import type { OrderStatus, PaymentStatus, ProductStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const tone = {
  neutral: "bg-tile text-ink",
  dark: "bg-ink text-paper",
  good: "bg-lime text-ink",
  warn: "bg-[#fef0c7] text-warn",
  bad: "bg-[#fee4e2] text-danger",
};

const map: Record<string, [keyof typeof tone, string]> = {
  PENDING: ["warn", "Pending"],
  CONFIRMED: ["neutral", "Confirmed"],
  PROCESSING: ["neutral", "Processing"],
  SHIPPED: ["dark", "Shipped"],
  DELIVERED: ["good", "Delivered"],
  CANCELLED: ["bad", "Cancelled"],
  PAID: ["good", "Paid"],
  FAILED: ["bad", "Failed"],
  REFUND_PENDING: ["warn", "Refund pending"],
  REFUNDED: ["neutral", "Refunded"],
  DRAFT: ["neutral", "Draft"],
  PUBLISHED: ["good", "Published"],
  ARCHIVED: ["bad", "Archived"],
};

export function StatusBadge({
  status,
  className,
  pendingLabel,
}: {
  status: OrderStatus | PaymentStatus | ProductStatus;
  className?: string;
  pendingLabel?: string; // e.g. "Pay on delivery" for COD payment status
}) {
  const [t, label] = map[status] ?? ["neutral", status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tone[t], className)}>
      {status === "PENDING" && pendingLabel ? pendingLabel : label}
    </span>
  );
}
