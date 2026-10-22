import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, Pagination, Panel, Table, dateFmt, pageParam, tdClass, thClass } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Customers" };
const PER_PAGE = 25;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const q = sp.q?.trim();
  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
  };
  const [users, total] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { _count: { select: { orders: true } } } }),
    db.user.count({ where }),
  ]);
  const spent = new Map(
    (await db.order.groupBy({ by: ["userId"], where: { userId: { in: users.map((u) => u.id) }, paymentStatus: "PAID" }, _sum: { total: true } })).map((g) => [g.userId, g._sum.total ?? 0]),
  );

  return (
    <>
      <PageHeader title="Customers" description={`${total} customer account${total === 1 ? "" : "s"}`} />
      <Panel>
        <form className="flex flex-wrap gap-2 border-b border-line p-4" role="search">
          <Input name="q" defaultValue={q} placeholder="Name, email or phone" aria-label="Search customers" className="w-full sm:w-72" />
          <Button type="submit" variant="secondary">Search</Button>
          {q && <Button variant="ghost" asChild><Link href="/admin/customers">Clear</Link></Button>}
        </form>
        {users.length === 0 ? (
          <EmptyState message={q ? "No customers match." : "No customers yet."} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={thClass}>Customer</th>
                <th className={thClass}>Phone</th>
                <th className={thClass}>Orders</th>
                <th className={thClass}>Spent</th>
                <th className={thClass}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className={tdClass}>
                    <Link href={`/admin/customers/${u.id}`} className="font-medium hover:underline">{u.name}</Link>
                    {!u.isActive && <span className="ml-2 text-xs text-danger">deactivated</span>}
                    <span className="block text-xs text-stone">{u.email}</span>
                  </td>
                  <td className={`${tdClass} text-stone`}>{u.phone ?? "—"}</td>
                  <td className={`${tdClass} tabular`}>{u._count.orders}</td>
                  <td className={`${tdClass} tabular`}>{formatMoney(spent.get(u.id) ?? 0)}</td>
                  <td className={`${tdClass} whitespace-nowrap text-stone`}>{dateFmt(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} params={sp} basePath="/admin/customers" />
      </Panel>
    </>
  );
}
