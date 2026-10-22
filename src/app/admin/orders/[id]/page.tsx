import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { OrderActions } from "@/components/admin/order-actions";
import { PageHeader, Panel, dateTimeFmt } from "@/components/admin/ui";
import { StatusBadge } from "@/components/status-badge";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { isRazorpayConfigured } from "@/lib/razorpay";
import { ORDER_TRANSITIONS } from "@/lib/services/orders";

export const metadata = { title: "Order" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      events: { orderBy: { createdAt: "asc" } },
      user: { select: { id: true, name: true, email: true, phone: true, _count: { select: { orders: true } } } },
    },
  });
  if (!order) notFound();
  const money = (n: number) => formatMoney(n, order.currency);
  const row = "flex justify-between gap-4 py-1";

  return (
    <>
      <Link href="/admin/orders" className="mb-3 inline-flex items-center gap-1 text-sm text-stone hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Orders
      </Link>
      <PageHeader
        title={order.number}
        description={`Placed ${dateTimeFmt(order.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            <StatusBadge status={order.paymentStatus} pendingLabel={order.paymentMethod === "COD" ? "COD due" : undefined} />
          </div>
        }
      />

      {order.cancelRequestedAt && (
        <div className="mb-6 rounded-xl border border-warn/30 bg-[#fffaeb] p-4 text-sm" role="status">
          <p className="font-semibold text-warn">
            {order.status === "DELIVERED" ? "Return and refund requested" : "Cancellation requested"} on {dateTimeFmt(order.cancelRequestedAt)}
          </p>
          {order.cancelRequestReason && <p className="mt-1">“{order.cancelRequestReason}”</p>}
          <p className="mt-1 text-stone">
            {order.status === "DELIVERED"
              ? "Approve by starting a refund once the item is back (add it to stock from Inventory as a customer return), or decline."
              : "Approve by cancelling the order, or decline."}
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Actions">
            <div className="p-4">
              <OrderActions
                orderId={order.id}
                status={order.status}
                next={ORDER_TRANSITIONS[order.status]}
                paymentMethod={order.paymentMethod}
                paymentStatus={order.paymentStatus}
                hasRequest={!!order.cancelRequestedAt}
                canRazorpayRefund={order.paymentMethod === "RAZORPAY" && !!order.razorpayPaymentId && isRazorpayConfigured()}
              />
            </div>
          </Panel>

          <Panel title={`Items (${order.items.length})`}>
            <ul className="divide-y divide-line">
              {order.items.map((it) => (
                <li key={it.id} className="flex gap-3 p-4">
                  <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-tile">
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                    {it.imageUrl && <img src={it.imageUrl} alt="" className="size-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <Link href={`/admin/products/${it.productId}`} className="font-medium hover:underline">{it.productName}</Link>
                    <p className="text-stone">{it.color} · {it.size} · {it.sku}</p>
                    <p className="tabular text-stone">{money(it.unitPrice)} × {it.quantity}</p>
                  </div>
                  <p className="tabular text-sm font-semibold">{money(it.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <div className="border-t border-line p-4 text-sm tabular">
              <div className={row}><span className="text-stone">Subtotal</span><span>{money(order.subtotal)}</span></div>
              {order.discount > 0 && (
                <div className={row}><span className="text-stone">Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span><span>−{money(order.discount)}</span></div>
              )}
              <div className={row}><span className="text-stone">Shipping</span><span>{order.shippingFee ? money(order.shippingFee) : "Free"}</span></div>
              <div className={`${row} border-t border-line pt-2 text-base font-bold`}><span>Total</span><span>{money(order.total)}</span></div>
            </div>
          </Panel>

          <Panel title="Timeline">
            <ol className="flex flex-col gap-4 p-4">
              {order.events.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-ink" aria-hidden />
                  <div>
                    <p>{e.message}</p>
                    <p className="text-xs text-stone">{dateTimeFmt(e.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Customer">
            <div className="flex flex-col gap-1 p-4 text-sm">
              <Link href={`/admin/customers/${order.user.id}`} className="font-medium hover:underline">{order.user.name}</Link>
              <a href={`mailto:${order.email}`} className="text-stone hover:underline">{order.email}</a>
              <a href={`tel:${order.phone}`} className="text-stone hover:underline">{order.phone}</a>
              <p className="text-stone">{order.user._count.orders} order{order.user._count.orders === 1 ? "" : "s"} in total</p>
            </div>
          </Panel>
          <Panel title="Delivery address">
            <address className="p-4 text-sm not-italic leading-relaxed">
              {order.shippingName}<br />
              {order.shippingLine1}<br />
              {order.shippingLine2 && <>{order.shippingLine2}<br /></>}
              {order.shippingCity}, {order.shippingState} {order.shippingPostalCode}<br />
              {order.shippingCountry}
            </address>
          </Panel>
          <Panel title="Payment">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-4 text-sm">
              <dt className="text-stone">Method</dt><dd>{order.paymentMethod === "COD" ? "Cash on delivery" : "Online (Razorpay)"}</dd>
              <dt className="text-stone">Status</dt><dd><StatusBadge status={order.paymentStatus} pendingLabel={order.paymentMethod === "COD" ? "COD due" : undefined} /></dd>
              {order.paidAt && (<><dt className="text-stone">Paid</dt><dd>{dateTimeFmt(order.paidAt)}</dd></>)}
              {order.razorpayOrderId && (<><dt className="text-stone">Razorpay order</dt><dd className="break-all text-xs">{order.razorpayOrderId}</dd></>)}
              {order.razorpayPaymentId && (<><dt className="text-stone">Payment ID</dt><dd className="break-all text-xs">{order.razorpayPaymentId}</dd></>)}
              {order.refundReference && (<><dt className="text-stone">Refund ref.</dt><dd className="break-all text-xs">{order.refundReference}</dd></>)}
              {order.reservationExpiresAt && order.status === "PENDING" && (
                <><dt className="text-stone">Pay by</dt><dd>{dateTimeFmt(order.reservationExpiresAt)}</dd></>
              )}
            </dl>
          </Panel>
          {(order.trackingNumber || order.status === "SHIPPED" || order.status === "DELIVERED") && (
            <Panel title="Shipment">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-4 text-sm">
                <dt className="text-stone">Carrier</dt><dd>{order.carrier ?? "—"}</dd>
                <dt className="text-stone">Tracking</dt>
                <dd>
                  {order.trackingUrl ? <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="underline">{order.trackingNumber}</a> : (order.trackingNumber ?? "—")}
                </dd>
                {order.shippedAt && (<><dt className="text-stone">Shipped</dt><dd>{dateTimeFmt(order.shippedAt)}</dd></>)}
                {order.deliveredAt && (<><dt className="text-stone">Delivered</dt><dd>{dateTimeFmt(order.deliveredAt)}</dd></>)}
              </dl>
            </Panel>
          )}
          {order.status === "CANCELLED" && (
            <Panel title="Cancellation">
              <p className="p-4 text-sm">
                {order.cancelReason}
                {order.cancelledAt && <span className="block text-xs text-stone">{dateTimeFmt(order.cancelledAt)}</span>}
                <span className="block pt-1 text-xs text-stone">Stock {order.stockRestored ? "returned to inventory" : "not returned"}.</span>
              </p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
