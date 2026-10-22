import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StockAdjustDialog } from "@/components/admin/stock-adjust-dialog";
import { EmptyState, PageHeader, Pagination, Panel, Table, dateTimeFmt, pageParam, tdClass, thClass } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata = { title: "Inventory" };
const PER_PAGE = 30;

const reasonLabel: Record<string, string> = {
  ORDER_PLACED: "Order placed",
  ORDER_CANCELLED: "Order cancelled",
  RESTOCK: "Restock",
  MANUAL_CORRECTION: "Correction",
  DAMAGED: "Damaged",
  RETURNED: "Returned",
  INITIAL: "Opening stock",
};

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const low = sp.low === "1";
  const q = sp.q?.trim();

  // Low stock compares two columns (stock <= lowStockThreshold), which Prisma's where can't express.
  const lowIds = low
    ? (await db.$queryRaw<{ id: string }[]>`SELECT id FROM "Variant" WHERE "isActive" AND stock <= "lowStockThreshold"`).map((r) => r.id)
    : undefined;
  const where: Prisma.VariantWhereInput = {
    ...(lowIds ? { id: { in: lowIds } } : {}),
    ...(q
      ? {
          OR: [
            { sku: { contains: q, mode: "insensitive" } },
            { product: { name: { contains: q, mode: "insensitive" } } },
            { color: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [variants, total, history] = await Promise.all([
    db.variant.findMany({
      where,
      orderBy: low ? [{ stock: "asc" }] : [{ product: { name: "asc" } }, { color: "asc" }, { size: "asc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { product: { select: { id: true, name: true, status: true } } },
    }),
    db.variant.count({ where }),
    db.stockAdjustment.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { variant: { select: { sku: true, size: true, color: true, product: { select: { name: true } } } } },
    }),
  ]);
  const userIds = [...new Set(history.map((h) => h.userId).filter(Boolean))] as string[];
  const users = new Map((await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
  const orders = new Map(
    (await db.order.findMany({ where: { id: { in: history.map((h) => h.orderId).filter(Boolean) as string[] } }, select: { id: true, number: true } })).map((o) => [o.id, o.number]),
  );

  return (
    <>
      <PageHeader title="Inventory" description="Stock per size and colour. Every change is recorded below." />
      <Panel className="mb-6">
        <form className="flex flex-wrap items-center gap-2 border-b border-line p-4" role="search">
          <Input name="q" defaultValue={q} placeholder="Search product, SKU or colour" aria-label="Search inventory" className="w-full sm:w-72" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="low" value="1" defaultChecked={low} className="size-4 accent-black" /> Low stock only
          </label>
          <Button type="submit" variant="secondary">Filter</Button>
          {(q || low) && <Button variant="ghost" asChild><Link href="/admin/inventory">Clear</Link></Button>}
        </form>
        {variants.length === 0 ? (
          <EmptyState message={low ? "Nothing is running low." : "No variants match."} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={thClass}>Product</th>
                <th className={thClass}>SKU</th>
                <th className={thClass}>Size</th>
                <th className={thClass}>Colour</th>
                <th className={thClass}>Stock</th>
                <th className={thClass}>Low at</th>
                <th className={thClass}><span className="sr-only">Adjust</span></th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => {
                const isLow = v.isActive && v.stock <= v.lowStockThreshold;
                return (
                  <tr key={v.id} className={cn(!v.isActive && "text-stone")}>
                    <td className={tdClass}>
                      <Link href={`/admin/products/${v.product.id}`} className="font-medium hover:underline">{v.product.name}</Link>
                      {(!v.isActive || v.product.status !== "PUBLISHED") && (
                        <span className="ml-2 text-xs text-stone">{!v.isActive ? "inactive" : v.product.status.toLowerCase()}</span>
                      )}
                    </td>
                    <td className={`${tdClass} text-xs`}>{v.sku}</td>
                    <td className={tdClass}>{v.size}</td>
                    <td className={tdClass}>
                      <span className="inline-flex items-center gap-2">
                        <span className="size-3 rounded-full border border-line" style={{ background: v.colorHex }} aria-hidden />
                        {v.color}
                      </span>
                    </td>
                    <td className={cn(tdClass, "tabular font-semibold", v.stock === 0 ? "text-danger" : isLow && "text-warn")}>
                      {v.stock}
                      {v.stock === 0 ? <span className="ml-1 text-xs font-normal">sold out</span> : isLow && <span className="ml-1 text-xs font-normal">low</span>}
                    </td>
                    <td className={`${tdClass} tabular`}>{v.lowStockThreshold}</td>
                    <td className={`${tdClass} text-right`}>
                      <StockAdjustDialog variantId={v.id} stock={v.stock} label={`${v.product.name} · ${v.color} · ${v.size}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} params={sp} basePath="/admin/inventory" />
      </Panel>

      <Panel title="Recent stock changes">
        {history.length === 0 ? (
          <EmptyState message="No stock changes yet." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={thClass}>When</th>
                <th className={thClass}>Item</th>
                <th className={thClass}>Change</th>
                <th className={thClass}>Stock after</th>
                <th className={thClass}>Reason</th>
                <th className={thClass}>By</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className={`${tdClass} whitespace-nowrap text-stone`}>{dateTimeFmt(h.createdAt)}</td>
                  <td className={tdClass}>
                    {h.variant.product.name}
                    <span className="block text-xs text-stone">{h.variant.color} · {h.variant.size} · {h.variant.sku}</span>
                  </td>
                  <td className={cn(tdClass, "tabular font-semibold", h.delta < 0 ? "text-danger" : "")}>{h.delta > 0 ? `+${h.delta}` : h.delta}</td>
                  <td className={`${tdClass} tabular`}>{h.stockAfter}</td>
                  <td className={tdClass}>
                    {reasonLabel[h.reason] ?? h.reason}
                    {h.orderId && orders.get(h.orderId) && (
                      <Link href={`/admin/orders/${h.orderId}`} className="ml-1 text-xs underline">{orders.get(h.orderId)}</Link>
                    )}
                    {h.note && <span className="block text-xs text-stone">{h.note}</span>}
                  </td>
                  <td className={`${tdClass} text-stone`}>{(h.userId && users.get(h.userId)) ?? "System"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
