import { randomUUID, createHmac } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Fake Razorpay API; signature helpers stay real.
const rzp = {
  orders: {
    create: vi.fn(async () => ({ id: `order_${randomUUID().slice(0, 8)}` })),
    fetchPayments: vi.fn(async () => ({ items: [] as { id: string; status: string }[] })),
  },
  payments: { refund: vi.fn(async () => ({ id: "rfnd_test" })) },
};
vi.mock("@/lib/razorpay", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/razorpay")>()),
  isRazorpayConfigured: () => true,
  getRazorpay: () => rzp,
}));

import { db } from "@/lib/db";
import {
  cancelOrder,
  completeRefund,
  customerCancel,
  markOrderPaid,
  placeOrder,
  quoteCart,
  releaseExpiredReservations,
  updateOrderStatus,
} from "@/lib/services/orders";
import { adjustStock } from "@/lib/services/inventory";
import { computeTotals, evaluateCoupon } from "@/lib/services/pricing";
import { verifyPaymentSignature, verifyWebhookSignature } from "@/lib/razorpay";
import type { CheckoutInput } from "@/lib/validators";

let userId: string;
let adminId: string;
let variantId: string;
let productId: string;

const address = {
  fullName: "Asha Rao",
  phone: "9876543210",
  line1: "12 MG Road",
  line2: null,
  city: "Bengaluru",
  state: "Karnataka",
  postalCode: "560001",
  country: "India",
  isDefault: false,
};

const checkout = (over: Partial<CheckoutInput> = {}): CheckoutInput => ({
  items: [{ variantId, quantity: 1 }],
  address,
  email: "asha@example.com",
  paymentMethod: "COD",
  saveAddress: false,
  idempotencyKey: randomUUID(),
  ...over,
});

const stockOf = async (id = variantId) => (await db.variant.findUniqueOrThrow({ where: { id } })).stock;

beforeAll(async () => {
  // Wipe in FK order.
  await db.$executeRawUnsafe(
    `TRUNCATE "StockAdjustment","OrderEvent","OrderItem","Order","Variant","ProductImage","CollectionProduct","Product","Category","Coupon","Session","Address","AuditLog","User","StoreSettings" CASCADE`,
  );
  await db.storeSettings.create({ data: { id: 1, shippingFee: 9900, freeShippingThreshold: 199900, codEnabled: true } });
  const user = await db.user.create({ data: { email: "asha@example.com", name: "Asha", passwordHash: "x" } });
  const admin = await db.user.create({ data: { email: "admin@example.com", name: "Admin", passwordHash: "x", role: "ADMIN" } });
  userId = user.id;
  adminId = admin.id;
  const cat = await db.category.create({ data: { name: "Men", slug: "men" } });
  const product = await db.product.create({
    data: {
      name: "Oversized Tee",
      slug: "oversized-tee",
      sku: "TEE-1",
      description: "Tee",
      categoryId: cat.id,
      price: 99900,
      salePrice: 79900,
      status: "PUBLISHED",
      variants: { create: { sku: "TEE-1-M-BLK", size: "M", color: "Black", stock: 3 } },
    },
    include: { variants: true },
  });
  productId = product.id;
  variantId = product.variants[0].id;
});

beforeEach(async () => {
  await db.variant.update({ where: { id: variantId }, data: { stock: 3, isActive: true } });
  await db.product.update({ where: { id: productId }, data: { status: "PUBLISHED" } });
  rzp.orders.fetchPayments.mockResolvedValue({ items: [] });
});

describe("pricing", () => {
  it("adds shipping below the free threshold and none above it", () => {
    const settings = { shippingFee: 9900, freeShippingThreshold: 199900 };
    expect(computeTotals([{ unitPrice: 79900, quantity: 1 }], 0, settings)).toEqual({
      subtotal: 79900, discount: 0, shippingFee: 9900, total: 89800,
    });
    expect(computeTotals([{ unitPrice: 79900, quantity: 3 }], 0, settings).shippingFee).toBe(0);
  });

  it("caps percent coupons and never discounts below zero", () => {
    const base = { usageLimit: null, usedCount: 0, startsAt: null, endsAt: null, isActive: true, minSubtotal: 0 };
    expect(evaluateCoupon({ ...base, type: "PERCENT", value: 50, maxDiscount: 10000 }, 100000).discount).toBe(10000);
    expect(evaluateCoupon({ ...base, type: "FIXED", value: 500000, maxDiscount: null }, 100000).discount).toBe(100000);
    expect(evaluateCoupon({ ...base, type: "FIXED", value: 100, maxDiscount: null, minSubtotal: 5000 }, 100).error).toBeTruthy();
    expect(evaluateCoupon({ ...base, type: "FIXED", value: 100, maxDiscount: null, endsAt: new Date(0) }, 100).error).toMatch(/expired/);
  });
});

describe("placing orders", () => {
  it("uses database prices, deducts stock and logs the adjustment", async () => {
    const order = await placeOrder(userId, checkout({ items: [{ variantId, quantity: 2 }] }));
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
    expect(saved.subtotal).toBe(2 * 79900); // sale price, not anything from the client
    expect(saved.total).toBe(2 * 79900 + 9900);
    expect(saved.status).toBe("PENDING");
    expect(saved.paymentStatus).toBe("PENDING");
    expect(await stockOf()).toBe(1);
    const adj = await db.stockAdjustment.findMany({ where: { orderId: order.id } });
    expect(adj).toMatchObject([{ delta: -2, stockAfter: 1, reason: "ORDER_PLACED" }]);
  });

  it("rejects quantities above available stock and leaves stock untouched", async () => {
    await expect(placeOrder(userId, checkout({ items: [{ variantId, quantity: 4 }] }))).rejects.toThrow(/Only 3 left/);
    expect(await stockOf()).toBe(3);
  });

  it("counts duplicate lines for the same variant together", async () => {
    const items = [{ variantId, quantity: 2 }, { variantId, quantity: 2 }];
    await expect(placeOrder(userId, checkout({ items }))).rejects.toThrow(/Only 3 left/);
  });

  it("refuses unpublished or archived products", async () => {
    await db.product.update({ where: { id: productId }, data: { status: "ARCHIVED" } });
    await expect(placeOrder(userId, checkout())).rejects.toThrow(/No longer available/);
    expect((await quoteCart([{ variantId, quantity: 1 }])).hasIssues).toBe(true);
  });

  it("returns the same order for a repeated idempotency key", async () => {
    const input = checkout();
    const [a, b] = await Promise.all([placeOrder(userId, input), placeOrder(userId, input)]);
    expect(a.id).toBe(b.id);
    expect(await db.order.count({ where: { idempotencyKey: input.idempotencyKey } })).toBe(1);
    expect(await stockOf()).toBe(2);
  });

  it("never oversells when buyers race for the last units", async () => {
    await db.variant.update({ where: { id: variantId }, data: { stock: 1 } });
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => placeOrder(userId, checkout())),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await stockOf()).toBe(0);
  });

  it("enforces coupon usage limits", async () => {
    await db.coupon.create({ data: { code: "ONCE", type: "FIXED", value: 10000, usageLimit: 1 } });
    const first = await placeOrder(userId, checkout({ couponCode: "once" }));
    expect((await db.order.findUniqueOrThrow({ where: { id: first.id } })).discount).toBe(10000);
    await expect(placeOrder(userId, checkout({ couponCode: "ONCE" }))).rejects.toThrow(/usage limit/);
  });
});

describe("cancellation", () => {
  it("restores stock exactly once, even when cancel is called twice concurrently", async () => {
    const order = await placeOrder(userId, checkout({ items: [{ variantId, quantity: 2 }] }));
    expect(await stockOf()).toBe(1);
    const results = await Promise.allSettled([
      cancelOrder(order.id, { reason: "a", byUserId: adminId }),
      cancelOrder(order.id, { reason: "b", byUserId: adminId }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await stockOf()).toBe(3);
    await expect(cancelOrder(order.id, { reason: "c", byUserId: adminId })).rejects.toThrow(/can't be cancelled/);
    expect(await stockOf()).toBe(3);
  });

  it("customer cancel of a processing order only files a request", async () => {
    const order = await placeOrder(userId, checkout());
    await updateOrderStatus(order.id, adminId, { status: "CONFIRMED" });
    await updateOrderStatus(order.id, adminId, { status: "PROCESSING" });
    expect(await customerCancel(order.id, userId, "Changed my mind")).toEqual({ cancelled: false });
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(saved.status).toBe("PROCESSING");
    expect(saved.cancelRequestedAt).not.toBeNull();
  });
});

describe("order status transitions", () => {
  it("blocks invalid jumps and requires tracking to ship", async () => {
    const order = await placeOrder(userId, checkout());
    await expect(updateOrderStatus(order.id, adminId, { status: "DELIVERED" })).rejects.toThrow(/Can't move/);
    await updateOrderStatus(order.id, adminId, { status: "CONFIRMED" });
    await updateOrderStatus(order.id, adminId, { status: "PROCESSING" });
    await expect(updateOrderStatus(order.id, adminId, { status: "SHIPPED" })).rejects.toThrow(/tracking/);
    await updateOrderStatus(order.id, adminId, { status: "SHIPPED", carrier: "Delhivery", trackingNumber: "DL123" });
    await updateOrderStatus(order.id, adminId, { status: "DELIVERED" });
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(saved.status).toBe("DELIVERED");
    expect(saved.paymentStatus).toBe("PAID"); // COD collected on delivery
    await expect(updateOrderStatus(order.id, adminId, { status: "CANCELLED" })).rejects.toThrow(/Can't move/);
  });
});

describe("online payments", () => {
  it("stays pending until a verified payment, then confirms once", async () => {
    const order = await placeOrder(userId, checkout({ paymentMethod: "RAZORPAY" }));
    expect(order.razorpayOrderId).toMatch(/^order_/);
    await expect(updateOrderStatus(order.id, adminId, { status: "CONFIRMED" })).rejects.toThrow(/automatically/);

    const first = await markOrderPaid(order.razorpayOrderId!, "pay_1", "checkout");
    const second = await markOrderPaid(order.razorpayOrderId!, "pay_1", "webhook");
    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(first.order).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID" });
    expect(await db.orderEvent.count({ where: { orderId: order.id, type: "PAYMENT" } })).toBe(1);
    expect(await stockOf()).toBe(2); // deducted once at placement, not again on payment
  });

  it("releases stock for expired unpaid orders, and a late payment becomes a refund", async () => {
    const order = await placeOrder(userId, checkout({ paymentMethod: "RAZORPAY" }));
    expect(await stockOf()).toBe(2);
    await releaseExpiredReservations(new Date(Date.now() + 31 * 60_000));
    expect(await stockOf()).toBe(3);
    const cancelled = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(cancelled).toMatchObject({ status: "CANCELLED", paymentStatus: "FAILED", stockRestored: true });

    const late = await markOrderPaid(order.razorpayOrderId!, "pay_late", "webhook");
    expect(late.order.paymentStatus).toBe("REFUND_PENDING");
    expect(await stockOf()).toBe(3);

    await completeRefund(order.id, adminId);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("REFUNDED");
    await expect(completeRefund(order.id, adminId)).rejects.toThrow(/No refund is pending/);
    expect(rzp.payments.refund).toHaveBeenCalledTimes(1);
  });

  it("reconciles a captured payment instead of cancelling on expiry", async () => {
    const order = await placeOrder(userId, checkout({ paymentMethod: "RAZORPAY" }));
    rzp.orders.fetchPayments.mockResolvedValueOnce({ items: [{ id: "pay_cap", status: "captured" }] });
    await releaseExpiredReservations(new Date(Date.now() + 31 * 60_000));
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(saved).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID", razorpayPaymentId: "pay_cap" });
    expect(await stockOf()).toBe(2);
  });

  it("verifies Razorpay signatures with HMAC-SHA256", () => {
    const sig = createHmac("sha256", "secret").update("order_1|pay_1").digest("hex");
    expect(verifyPaymentSignature("order_1", "pay_1", sig, "secret")).toBe(true);
    expect(verifyPaymentSignature("order_1", "pay_2", sig, "secret")).toBe(false);
    expect(verifyPaymentSignature("order_1", "pay_1", sig, "")).toBe(false);
    const body = '{"event":"payment.captured"}';
    const wsig = createHmac("sha256", "wh").update(body).digest("hex");
    expect(verifyWebhookSignature(body, wsig, "wh")).toBe(true);
    expect(verifyWebhookSignature(body + " ", wsig, "wh")).toBe(false);
  });
});

describe("inventory adjustments", () => {
  it("records adjustments and refuses to go negative", async () => {
    await adjustStock(adminId, { variantId, delta: 5, reason: "RESTOCK" });
    expect(await stockOf()).toBe(8);
    await expect(adjustStock(adminId, { variantId, delta: -9, reason: "DAMAGED" })).rejects.toThrow(/below zero/);
    expect(await stockOf()).toBe(8);
    expect(await db.auditLog.count({ where: { action: "stock.adjust", entityId: variantId } })).toBe(1);
  });
});
