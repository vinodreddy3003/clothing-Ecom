import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CustomerActiveToggle } from "@/components/admin/toggles";
import { EmptyState, PageHeader, Panel, StatCard, Table, dateFmt, dateTimeFmt, tdClass, thClass } from "@/components/admin/ui";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, me] = await Promise.all([
    db.user.findUnique({ where: { id }, include: { addresses: true, orders: { orderBy: { createdAt: "desc" }, include: { _count: { select: { items: true } } } } } }),
    getCurrentUser(),
  ]);
  if (!user) notFound();
  const paid = user.orders.filter((o) => o.paymentStatus === "PAID").reduce((s, o) => s + o.total, 0);

  return (
    <>
      <Link href="/admin/customers" className="mb-3 inline-flex items-center gap-1 text-sm text-stone hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Customers
      </Link>
      <PageHeader
        title={user.name}
        description={`${user.email}${user.phone ? ` · ${user.phone}` : ""} · joined ${dateFmt(user.createdAt)}${user.role === "ADMIN" ? " · admin" : ""}`}
        actions={<CustomerActiveToggle id={user.id} isActive={user.isActive} disabled={user.id === me?.id} />}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Orders" value={String(user.orders.length)} />
        <StatCard label="Total spent (paid)" value={formatMoney(paid)} />
        <StatCard label="Saved addresses" value={String(user.addresses.length)} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Panel title="Orders">
          {user.orders.length === 0 ? (
            <EmptyState message="No orders yet." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className={thClass}>Order</th>
                  <th className={thClass}>Items</th>
                  <th className={thClass}>Total</th>
                  <th className={thClass}>Payment</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {user.orders.map((o) => (
                  <tr key={o.id}>
                    <td className={tdClass}>
                      <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.number}</Link>
                      <span className="block text-xs text-stone">{dateTimeFmt(o.createdAt)}</span>
                    </td>
                    <td className={`${tdClass} tabular`}>{o._count.items}</td>
                    <td className={`${tdClass} tabular`}>{formatMoney(o.total, o.currency)}</td>
                    <td className={tdClass}><StatusBadge status={o.paymentStatus} pendingLabel={o.paymentMethod === "COD" ? "COD due" : undefined} /></td>
                    <td className={tdClass}><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
        <Panel title="Addresses">
          {user.addresses.length === 0 ? (
            <EmptyState message="No saved addresses." />
          ) : (
            <ul className="divide-y divide-line">
              {user.addresses.map((a) => (
                <li key={a.id} className="p-4 text-sm leading-relaxed">
                  <p className="font-medium">{a.fullName}{a.isDefault && <span className="ml-2 text-xs text-stone">default</span>}</p>
                  <p className="text-stone">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.postalCode}</p>
                  <p className="text-stone">{a.phone}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
