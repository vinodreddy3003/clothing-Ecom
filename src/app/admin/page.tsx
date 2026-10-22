import Link from "next/link";
import { EmptyState, PageHeader, Panel, StatCard, Table, dateTimeFmt, tdClass, thClass } from "@/components/admin/ui";
import { SalesChart, fillDays } from "@/components/admin/sales-chart";
import { StatusBadge } from "@/components/status-badge";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { releaseExpiredReservations } from "@/lib/services/orders";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // Opportunistic cleanup so stale online reservations don't linger if the cron job isn't set up yet.
  try {
    await releaseExpiredReservations();
  } catch (e) {
    console.error("releaseExpiredReservations failed", e);
  }

  const since = new Date(Date.now() - 13 * 864e5);
  since.setUTCHours(0, 0, 0, 0);
  const [settings, totalOrders, sales, pending, requests, recent, lowStock, daily] = await Promise.all([
    getSettings(),
    db.order.count(),
    db.order.aggregate({ where: { paymentStatus: "PAID" }, _sum: { total: true } }),
    db.order.count({ where: { status: { in: ["PENDING", "CONFIRMED", "PROCESSING"] } } }),
    db.order.count({ where: { cancelRequestedAt: { not: null } } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.$queryRaw<{ id: string; sku: string; size: string; color: string; stock: number; productId: string; name: string }[]>`
      SELECT v.id, v.sku, v.size, v.color, v.stock, p.id AS "productId", p.name
      FROM "Variant" v JOIN "Product" p ON p.id = v."productId"
      WHERE v."isActive" AND p.status <> 'ARCHIVED' AND v.stock <= v."lowStockThreshold"
      ORDER BY v.stock ASC, p.name ASC`,
    db.$queryRaw<{ day: Date; total: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, SUM(total)::bigint AS total
      FROM "Order" WHERE "paymentStatus" = 'PAID' AND "createdAt" >= ${since}
      GROUP BY 1`,
  ]);
  const days = fillDays(daily, 14);
  const money = (n: number) => formatMoney(n, settings.currency);

  return (
    <>
      <PageHeader title="Dashboard" description={`${settings.storeName} at a glance`} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total orders" value={totalOrders.toLocaleString("en-IN")} />
        <StatCard label="Sales (paid)" value={money(sales._sum.total ?? 0)} note="All time, excludes refunds" />
        <StatCard label="Orders to fulfil" value={String(pending)} note={requests ? `${requests} open request${requests === 1 ? "" : "s"}` : "Pending, confirmed or processing"} />
        <StatCard label="Low-stock variants" value={String(lowStock.length)} tone={lowStock.length ? "warn" : undefined} />
      </div>

      <Panel title="Paid sales, last 14 days" className="mb-6" action={<span className="tabular text-sm font-semibold">{money(days.reduce((s, d) => s + d.total, 0))}</span>}>
        <SalesChart data={days} currency={settings.currency} />
      </Panel>

      {requests > 0 && (
        <Link href="/admin/orders?requests=1" className="mb-6 block rounded-xl border border-warn/30 bg-[#fffaeb] p-4 text-sm font-medium text-warn hover:underline">
          {requests} customer request{requests === 1 ? "" : "s"} for cancellation or return need a decision.
        </Link>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Recent orders" action={<Link href="/admin/orders" className="text-sm underline">All orders</Link>}>
          {recent.length === 0 ? (
            <EmptyState message="No orders yet." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className={thClass}>Order</th>
                  <th className={thClass}>Customer</th>
                  <th className={thClass}>Total</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td className={tdClass}>
                      <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.number}</Link>
                      <span className="block text-xs text-stone">{dateTimeFmt(o.createdAt)}</span>
                    </td>
                    <td className={tdClass}>{o.shippingName}</td>
                    <td className={`${tdClass} tabular whitespace-nowrap`}>{money(o.total)}</td>
                    <td className={tdClass}><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
        <Panel title="Low stock" action={<Link href="/admin/inventory?low=1" className="text-sm underline">Inventory</Link>}>
          {lowStock.length === 0 ? (
            <EmptyState message="Everything is well stocked." />
          ) : (
            <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
              {lowStock.slice(0, 20).map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <Link href={`/admin/products/${v.productId}`} className="font-medium hover:underline">{v.name}</Link>
                    <p className="text-xs text-stone">{v.color} · {v.size}</p>
                  </div>
                  <span className={`tabular font-semibold ${v.stock === 0 ? "text-danger" : "text-warn"}`}>{v.stock === 0 ? "Sold out" : `${v.stock} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
