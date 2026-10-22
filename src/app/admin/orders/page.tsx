import Link from "next/link";
import type { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, Pagination, Panel, Table, dateTimeFmt, pageParam, selectClass, tdClass, thClass } from "@/components/admin/ui";
import { StatusBadge } from "@/components/status-badge";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Orders" };
const PER_PAGE = 25;
const STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
const PAYMENTS = ["PENDING", "PAID", "FAILED", "REFUND_PENDING", "REFUNDED"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const q = sp.q?.trim();
  const where: Prisma.OrderWhereInput = {
    ...(STATUSES.includes(sp.status ?? "") ? { status: sp.status as OrderStatus } : {}),
    ...(PAYMENTS.includes(sp.payment ?? "") ? { paymentStatus: sp.payment as PaymentStatus } : {}),
    ...(sp.method === "COD" || sp.method === "RAZORPAY" ? { paymentMethod: sp.method as PaymentMethod } : {}),
    ...(sp.requests === "1" ? { cancelRequestedAt: { not: null } } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { shippingName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { _count: { select: { items: true } } },
    }),
    db.order.count({ where }),
  ]);
  const filtered = q || sp.status || sp.payment || sp.method || sp.requests;

  return (
    <>
      <PageHeader title="Orders" description={`${total} order${total === 1 ? "" : "s"}`} />
      <Panel>
        <form className="flex flex-wrap gap-2 border-b border-line p-4" role="search">
          <Input name="q" defaultValue={q} placeholder="Order number, email, name or phone" aria-label="Search orders" className="w-full sm:w-72" />
          <select name="status" defaultValue={sp.status ?? ""} className={selectClass} aria-label="Order status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
          </select>
          <select name="payment" defaultValue={sp.payment ?? ""} className={selectClass} aria-label="Payment status">
            <option value="">All payments</option>
            {PAYMENTS.map((s) => <option key={s} value={s}>{(s.charAt(0) + s.slice(1).toLowerCase()).replace("_", " ")}</option>)}
          </select>
          <select name="method" defaultValue={sp.method ?? ""} className={selectClass} aria-label="Payment method">
            <option value="">All methods</option>
            <option value="RAZORPAY">Online</option>
            <option value="COD">Cash on delivery</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="requests" value="1" defaultChecked={sp.requests === "1"} className="size-4 accent-black" /> Open requests
          </label>
          <Button type="submit" variant="secondary">Filter</Button>
          {filtered && <Button variant="ghost" asChild><Link href="/admin/orders">Clear</Link></Button>}
        </form>
        {orders.length === 0 ? (
          <EmptyState message={filtered ? "No orders match these filters." : "No orders yet. They'll appear here as customers check out."} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={thClass}>Order</th>
                <th className={thClass}>Date</th>
                <th className={thClass}>Customer</th>
                <th className={thClass}>Items</th>
                <th className={thClass}>Total</th>
                <th className={thClass}>Payment</th>
                <th className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className={tdClass}>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.number}</Link>
                    {o.cancelRequestedAt && <span className="ml-2 rounded-full bg-[#fef0c7] px-2 py-0.5 text-xs font-semibold text-warn">Request</span>}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-stone`}>{dateTimeFmt(o.createdAt)}</td>
                  <td className={tdClass}>
                    {o.shippingName}
                    <span className="block text-xs text-stone">{o.email}</span>
                  </td>
                  <td className={`${tdClass} tabular`}>{o._count.items}</td>
                  <td className={`${tdClass} tabular whitespace-nowrap font-semibold`}>{formatMoney(o.total, o.currency)}</td>
                  <td className={tdClass}>
                    <StatusBadge status={o.paymentStatus} pendingLabel={o.paymentMethod === "COD" ? "COD due" : undefined} />
                    <span className="block pt-1 text-xs text-stone">{o.paymentMethod === "COD" ? "Cash on delivery" : "Online"}</span>
                  </td>
                  <td className={tdClass}><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} params={sp} basePath="/admin/orders" />
      </Panel>
    </>
  );
}
