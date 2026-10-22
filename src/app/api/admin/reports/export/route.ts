import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/errors";

const csv = (rows: (string | number | null)[][]) =>
  rows
    .map((r) =>
      r
        .map((v) => {
          const s = v == null ? "" : String(v);
          // Quote, and neutralise spreadsheet formula injection from customer-entered text.
          const safe = /^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s;
          return `"${safe.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");

const rupees = (paise: number) => (paise / 100).toFixed(2);

export const GET = route(async (req) => {
  await requireAdmin();
  const type = req.nextUrl.searchParams.get("type");
  const days = Math.min(366, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 30));
  let body: string;

  if (type === "sales") {
    const orders = await db.order.findMany({ where: { createdAt: { gte: new Date(Date.now() - days * 864e5) } }, orderBy: { createdAt: "asc" } });
    body = csv([
      ["Order", "Date", "Customer", "Email", "Status", "Payment status", "Method", "Subtotal", "Discount", "Shipping", "Total", "Coupon"],
      ...orders.map((o) => [
        o.number, o.createdAt.toISOString(), o.shippingName, o.email, o.status, o.paymentStatus, o.paymentMethod,
        rupees(o.subtotal), rupees(o.discount), rupees(o.shippingFee), rupees(o.total), o.couponCode,
      ]),
    ]);
  } else if (type === "inventory") {
    const variants = await db.variant.findMany({
      include: { product: { select: { name: true, status: true, price: true, salePrice: true } } },
      orderBy: [{ product: { name: "asc" } }, { color: "asc" }, { size: "asc" }],
    });
    body = csv([
      ["Product", "Product status", "SKU", "Size", "Colour", "Active", "Stock", "Low-stock threshold", "Unit price", "Stock value"],
      ...variants.map((v) => {
        const price = v.product.salePrice ?? v.product.price;
        return [v.product.name, v.product.status, v.sku, v.size, v.color, v.isActive ? "yes" : "no", v.stock, v.lowStockThreshold, rupees(price), rupees(price * v.stock)];
      }),
    ]);
  } else {
    throw new HttpError(400, "Use type=sales or type=inventory.");
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
