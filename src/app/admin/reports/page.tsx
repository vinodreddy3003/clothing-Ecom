import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SalesChart, fillDays } from "@/components/admin/sales-chart";
import { EmptyState, PageHeader, Panel, StatCard, Table, tdClass, thClass } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const since = new Date(Date.now() - 29 * 864e5);
  since.setUTCHours(0, 0, 0, 0);
  const [daily, byCategory, top, inventory, counts] = await Promise.all([
    db.$queryRaw<{ day: Date; total: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, SUM(total)::bigint AS total
      FROM "Order" WHERE "paymentStatus" = 'PAID' AND "createdAt" >= ${since} GROUP BY 1`,
    db.$queryRaw<{ name: string; units: bigint; revenue: bigint }[]>`
      SELECT c.name, SUM(i.quantity)::bigint AS units, SUM(i."lineTotal")::bigint AS revenue
      FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
      JOIN "Product" p ON p.id = i."productId" JOIN "Category" c ON c.id = p."categoryId"
      WHERE o."paymentStatus" = 'PAID' AND o."createdAt" >= ${since}
      GROUP BY c.name ORDER BY revenue DESC`,
    db.$queryRaw<{ productId: string; name: string; units: bigint; revenue: bigint }[]>`
      SELECT i."productId", MAX(i."productName") AS name, SUM(i.quantity)::bigint AS units, SUM(i."lineTotal")::bigint AS revenue
      FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
      WHERE o.status <> 'CANCELLED' AND o."createdAt" >= ${since}
      GROUP BY i."productId" ORDER BY units DESC LIMIT 10`,
    db.$queryRaw<{ units: bigint; value: bigint; low: bigint; out: bigint }[]>`
      SELECT COALESCE(SUM(v.stock), 0)::bigint AS units,
             COALESCE(SUM(v.stock * COALESCE(p."salePrice", p.price)), 0)::bigint AS value,
             COUNT(*) FILTER (WHERE v.stock <= v."lowStockThreshold" AND v.stock > 0)::bigint AS low,
             COUNT(*) FILTER (WHERE v.stock = 0)::bigint AS out
      FROM "Variant" v JOIN "Product" p ON p.id = v."productId"
      WHERE v."isActive" AND p.status <> 'ARCHIVED'`,
    db.order.groupBy({ by: ["status"], where: { createdAt: { gte: since } }, _count: true }),
  ]);
  const days = fillDays(daily, 30);
  const revenue = days.reduce((s, d) => s + d.total, 0);
  const paidOrders = await db.order.count({ where: { paymentStatus: "PAID", createdAt: { gte: since } } });
  const inv = inventory[0];
  const statusCount = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <PageHeader
        title="Reports"
        description="Last 30 days, paid orders only unless noted."
        actions={
          <>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download from an API route, not a page */}
            <Button variant="outline" asChild><a href="/api/admin/reports/export?type=sales&days=30"><Download /> Sales CSV</a></Button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download from an API route, not a page */}
            <Button variant="outline" asChild><a href="/api/admin/reports/export?type=inventory"><Download /> Inventory CSV</a></Button>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatMoney(revenue)} />
        <StatCard label="Paid orders" value={String(paidOrders)} note={`Average ${formatMoney(paidOrders ? Math.round(revenue / paidOrders) : 0)}`} />
        <StatCard label="Cancelled" value={String(statusCount("CANCELLED"))} note={`${statusCount("DELIVERED")} delivered`} />
        <StatCard label="Stock value" value={formatMoney(Number(inv.value))} note={`${Number(inv.units)} units · ${Number(inv.low)} low · ${Number(inv.out)} sold out`} tone={Number(inv.out) ? "warn" : undefined} />
      </div>
      <Panel title="Paid sales by day" className="mb-6">
        <SalesChart data={days} />
      </Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Sales by category">
          {byCategory.length === 0 ? <EmptyState message="No paid sales in this period." /> : (
            <Table>
              <thead><tr><th className={thClass}>Category</th><th className={thClass}>Units</th><th className={thClass}>Revenue</th></tr></thead>
              <tbody>
                {byCategory.map((c) => (
                  <tr key={c.name}><td className={tdClass}>{c.name}</td><td className={`${tdClass} tabular`}>{Number(c.units)}</td><td className={`${tdClass} tabular`}>{formatMoney(Number(c.revenue))}</td></tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
        <Panel title="Top products by units (not cancelled)">
          {top.length === 0 ? <EmptyState message="No orders in this period." /> : (
            <Table>
              <thead><tr><th className={thClass}>Product</th><th className={thClass}>Units</th><th className={thClass}>Revenue</th></tr></thead>
              <tbody>
                {top.map((p) => (
                  <tr key={p.productId}><td className={tdClass}>{p.name}</td><td className={`${tdClass} tabular`}>{Number(p.units)}</td><td className={`${tdClass} tabular`}>{formatMoney(Number(p.revenue))}</td></tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}
