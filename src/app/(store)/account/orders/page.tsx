import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { requireUserPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/store/empty-state";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await requireUserPage("/account/orders");
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { items: { select: { id: true, imageUrl: true, quantity: true } } },
  });
  if (!orders.length) {
    return <EmptyState icon={Package} title="No orders yet." body="When you place an order, you'll find it here." action={{ label: "Start shopping", href: "/shop" }} />;
  }
  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">Order history</h2>
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/orders/${o.id}`} className="flex items-center gap-4 rounded-3xl border border-line p-4 hover:bg-tile">
              <div className="flex -space-x-4">
                {o.items.slice(0, 3).map((i) => (
                  <div key={i.id} className="relative aspect-[4/5] w-12 overflow-hidden rounded-xl border-2 border-paper bg-tile">
                    {i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="48px" className="object-cover" />}
                  </div>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{o.number}</p>
                <p className="text-sm text-stone">
                  {o.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}, {o.items.reduce((n, i) => n + i.quantity, 0)} items, {formatMoney(o.total, o.currency)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <StatusBadge status={o.status} />
                  <StatusBadge status={o.paymentStatus} pendingLabel={o.paymentMethod === "COD" ? "Pay on delivery" : "Payment pending"} />
                </div>
              </div>
              <ChevronRight className="size-5 shrink-0 text-stone" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
