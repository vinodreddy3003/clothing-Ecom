import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";
import { requireUserPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { OrderTracker } from "@/components/store/order-tracker";
import { OrderSummary } from "@/components/store/order-summary";
import { CancelOrderDialog, PayNowButton } from "@/components/store/order-actions";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string; payment?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const user = await requireUserPage(`/orders/${id}`);
  const order = await db.order.findFirst({
    where: { id, userId: user.id },
    include: { items: true, events: { orderBy: { createdAt: "desc" } } },
  });
  if (!order) notFound();
  const { placed } = await searchParams;

  const awaitingPayment =
    order.paymentMethod === "RAZORPAY" &&
    order.status === "PENDING" &&
    ["PENDING", "FAILED"].includes(order.paymentStatus) &&
    !!order.reservationExpiresAt &&
    order.reservationExpiresAt > new Date();

  const productSlugs = new Map(
    (await db.product.findMany({ where: { id: { in: order.items.map((i) => i.productId) } }, select: { id: true, slug: true } })).map((p) => [p.id, p.slug]),
  );

  const confirmedAt = order.events.find((e) => e.message.startsWith("Order confirmed") || e.message.startsWith("Status changed to confirmed"))?.createdAt;
  const processingAt = order.events.find((e) => e.message.startsWith("Status changed to processing"))?.createdAt;

  const action =
    order.status === "PENDING" || order.status === "CONFIRMED"
      ? "cancel"
      : order.status === "PROCESSING" && !order.cancelRequestedAt
        ? "request"
        : order.status === "DELIVERED" && !order.cancelRequestedAt && order.paymentStatus === "PAID"
          ? "return"
          : null;

  return (
    <div className="mx-auto max-w-4xl pt-2 md:pt-8">
      {placed && order.status !== "CANCELLED" && !awaitingPayment && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-3xl bg-lime p-5">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0" />
          <div>
            <p className="text-lg font-bold">Order placed. Thank you!</p>
            <p className="text-[15px]">We&apos;ve sent the details to {order.email}. You can track it here any time.</p>
          </div>
        </div>
      )}
      {awaitingPayment && (
        <div role="status" className="mb-6 flex flex-col gap-4 rounded-3xl bg-tile p-5 sm:flex-row sm:items-center">
          <Clock className="size-6 shrink-0 text-warn" />
          <div className="flex-1">
            <p className="font-bold">Payment not completed</p>
            <p className="text-[15px] text-stone">
              Your items are held until{" "}
              {order.reservationExpiresAt!.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}. Pay now to confirm the order.
            </p>
          </div>
          <PayNowButton orderId={order.id} label={`Pay ${formatMoney(order.total, order.currency)}`} />
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-stone">Order {order.number}</p>
          <h1 className="text-[26px] leading-8 font-bold tracking-[-0.02em] md:text-[40px] md:leading-[44px]">
            Placed on {order.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </h1>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.paymentStatus} pendingLabel={order.paymentMethod === "COD" ? "Pay on delivery" : "Payment pending"} />
        </div>
      </div>

      <section className="rounded-3xl border border-line p-5 md:p-8" aria-label="Order status">
        <OrderTracker
          status={order.status}
          dates={{ PENDING: order.createdAt, CONFIRMED: confirmedAt ?? order.paidAt, PROCESSING: processingAt, SHIPPED: order.shippedAt, DELIVERED: order.deliveredAt }}
        />
        {order.trackingNumber && (
          <p className="mt-6 border-t border-line pt-4 text-[15px]">
            Shipped with <strong>{order.carrier}</strong>, tracking number <strong className="tabular">{order.trackingNumber}</strong>
            {order.trackingUrl && (
              <>
                {" "}
                <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">
                  Track shipment
                </a>
              </>
            )}
          </p>
        )}
        {order.cancelRequestedAt && (
          <p className="mt-4 rounded-2xl bg-tile p-4 text-[15px]">
            We received your request on {order.cancelRequestedAt.toLocaleDateString("en-IN")} and will update you soon.
          </p>
        )}
        {order.status === "CANCELLED" && order.cancelReason && <p className="mt-4 text-[15px] text-stone">{order.cancelReason}</p>}
        {order.paymentStatus === "REFUND_PENDING" && (
          <p className="mt-4 text-[15px]">Your refund of {formatMoney(order.total, order.currency)} is being processed.</p>
        )}
        {order.paymentStatus === "REFUNDED" && <p className="mt-4 text-[15px]">Refunded {formatMoney(order.total, order.currency)}.</p>}
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
        <section aria-labelledby="items-heading" className="rounded-3xl border border-line p-5 md:p-6">
          <h2 id="items-heading" className="mb-4 text-xl font-bold">
            Items
          </h2>
          <ul className="space-y-4">
            {order.items.map((item) => {
              const slug = productSlugs.get(item.productId);
              return (
                <li key={item.id} className="flex gap-4">
                  <div className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-xl bg-tile">
                    {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="64px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    {slug ? (
                      <Link href={`/product/${slug}`} className="font-semibold hover:underline">
                        {item.productName}
                      </Link>
                    ) : (
                      <p className="font-semibold">{item.productName}</p>
                    )}
                    <p className="text-sm text-stone">
                      {item.color}, {item.size}, qty {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold tabular">{formatMoney(item.lineTotal, order.currency)}</p>
                </li>
              );
            })}
          </ul>
          <OrderSummary
            className="mt-6 border-t border-line pt-4"
            totals={order}
            currency={order.currency}
            couponCode={order.couponCode}
          />
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl bg-tile p-5 text-[15px]" aria-labelledby="ship-heading">
            <h2 id="ship-heading" className="mb-2 font-bold">
              Delivery address
            </h2>
            <address className="text-stone not-italic">
              {order.shippingName}
              <br />
              {order.shippingLine1}
              {order.shippingLine2 && (
                <>
                  <br />
                  {order.shippingLine2}
                </>
              )}
              <br />
              {order.shippingCity}, {order.shippingState} {order.shippingPostalCode}
              <br />
              {order.phone}
            </address>
            <h2 className="mt-4 mb-1 font-bold">Payment</h2>
            <p className="text-stone">{order.paymentMethod === "COD" ? "Cash on delivery" : "Online payment (Razorpay)"}</p>
          </section>
          {action && (
            <div className="flex flex-wrap gap-3">
              <CancelOrderDialog orderId={order.id} kind={action} />
            </div>
          )}
          <section aria-labelledby="timeline-heading">
            <h2 id="timeline-heading" className="mb-3 font-bold">
              Updates
            </h2>
            <ol className="space-y-3 border-l-2 border-line pl-4 text-[15px]">
              {order.events.map((e) => (
                <li key={e.id}>
                  <p>{e.message}</p>
                  <p className="text-sm text-stone">
                    {e.createdAt.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                  </p>
                </li>
              ))}
            </ol>
          </section>
          <p className="text-sm text-stone">
            Need help? <Link href="/contact" className="font-semibold text-ink underline underline-offset-4">Contact us</Link> with your order number.
          </p>
        </div>
      </div>
    </div>
  );
}
