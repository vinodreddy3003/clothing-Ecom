import { randomBytes } from "node:crypto";
import { Prisma, type OrderStatus, type PaymentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { getRazorpay, isRazorpayConfigured } from "@/lib/razorpay";
import { computeTotals, effectivePrice, evaluateCoupon } from "@/lib/services/pricing";
import type { CheckoutInput } from "@/lib/validators";

type Tx = Prisma.TransactionClient;

/** Unpaid online orders hold their stock this long, then are cancelled and the stock released. */
export const RESERVATION_MINUTES = 30;

// ---------------------------------------------------------------- cart quote

export type QuoteLine = {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  size: string;
  color: string;
  sku: string;
  unitPrice: number;
  listPrice: number;
  quantity: number;
  available: number;
  issue: string | null;
};

/** Merge duplicate variant lines so stock checks see the real requested quantity. */
function mergeLines(items: { variantId: string; quantity: number }[]) {
  const map = new Map<string, number>();
  for (const i of items) map.set(i.variantId, (map.get(i.variantId) ?? 0) + i.quantity);
  return [...map].map(([variantId, quantity]) => ({ variantId, quantity }));
}

/** Prices and availability straight from the database. Client prices are never used. */
export async function quoteCart(
  items: { variantId: string; quantity: number }[],
  couponCode?: string,
  tx: Tx = db,
) {
  const merged = mergeLines(items);
  const variants = await tx.variant.findMany({
    where: { id: { in: merged.map((i) => i.variantId) } },
    include: {
      product: {
        select: {
          id: true, name: true, slug: true, price: true, salePrice: true, status: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        },
      },
    },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const lines: QuoteLine[] = [];
  const missing: string[] = [];
  for (const item of merged) {
    const v = byId.get(item.variantId);
    if (!v) {
      missing.push(item.variantId);
      continue;
    }
    const purchasable = v.product.status === "PUBLISHED" && v.isActive;
    lines.push({
      variantId: v.id,
      productId: v.product.id,
      productName: v.product.name,
      productSlug: v.product.slug,
      imageUrl: v.product.images[0]?.url ?? null,
      size: v.size,
      color: v.color,
      sku: v.sku,
      unitPrice: effectivePrice(v.product),
      listPrice: v.product.price,
      quantity: item.quantity,
      available: purchasable ? v.stock : 0,
      issue: !purchasable
        ? "No longer available"
        : v.stock === 0
          ? "Out of stock"
          : v.stock < item.quantity
            ? `Only ${v.stock} left`
            : null,
    });
  }

  const settings = await tx.storeSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const preDiscount = computeTotals(lines, 0, settings);

  let coupon: { code: string; error?: string } | null = null;
  let discount = 0;
  if (couponCode) {
    const row = await tx.coupon.findUnique({ where: { code: couponCode.trim().toUpperCase() } });
    const res = evaluateCoupon(row, preDiscount.subtotal);
    coupon = { code: couponCode.trim().toUpperCase(), error: res.error };
    discount = res.error ? 0 : res.discount;
  }

  return {
    lines,
    missing,
    coupon,
    totals: computeTotals(lines, discount, settings),
    settings,
    hasIssues: missing.length > 0 || lines.some((l) => l.issue),
  };
}

// ---------------------------------------------------------------- place order

const orderNumber = () =>
  `ORD-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${randomBytes(3).toString("hex").toUpperCase()}`;

export type PlacedOrder = {
  id: string;
  number: string;
  total: number;
  currency: string;
  paymentMethod: "RAZORPAY" | "COD";
  razorpayOrderId: string | null;
};

const placedSelect = {
  id: true, number: true, total: true, currency: true, paymentMethod: true, razorpayOrderId: true, userId: true,
} as const;

/**
 * Creates the order and deducts stock in one transaction.
 * - Idempotent on input.idempotencyKey: a retry returns the original order, never a second one.
 * - Stock is decremented with a conditional UPDATE (stock >= qty), so concurrent buyers can't oversell.
 * - Online orders keep the stock reserved for RESERVATION_MINUTES while payment is pending.
 */
export async function placeOrder(userId: string, input: CheckoutInput): Promise<PlacedOrder> {
  const existing = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: placedSelect });
  if (existing) {
    if (existing.userId !== userId) throw new HttpError(409, "This checkout was already used.");
    return existing;
  }

  let order: PlacedOrder & { userId: string };
  try {
    order = await db.$transaction(async (tx) => {
      const quote = await quoteCart(input.items, input.couponCode, tx);
      if (quote.missing.length) throw new HttpError(409, "Some items in your bag are no longer available.");
      const problem = quote.lines.find((l) => l.issue);
      if (problem) {
        throw new HttpError(409, `${problem.productName} (${problem.size}, ${problem.color}): ${problem.issue}.`);
      }
      if (quote.coupon?.error) throw new HttpError(409, quote.coupon.error, { couponCode: quote.coupon.error });

      const { settings, totals } = quote;
      if (input.paymentMethod === "COD") {
        if (!settings.codEnabled) throw new HttpError(400, "Cash on delivery isn't available right now.");
        if (settings.codMaxTotal != null && totals.total > settings.codMaxTotal)
          throw new HttpError(400, "Cash on delivery isn't available for this order value. Pay online instead.");
      } else if (!isRazorpayConfigured()) {
        throw new HttpError(503, "Online payment isn't available right now. Choose cash on delivery.");
      }

      // Coupon usage: atomic check-and-increment so a usage limit can't be exceeded by concurrent checkouts.
      if (quote.coupon) {
        const used = await tx.$executeRaw`
          UPDATE "Coupon" SET "usedCount" = "usedCount" + 1
          WHERE code = ${quote.coupon.code} AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`;
        if (used !== 1) throw new HttpError(409, "This code has reached its usage limit.");
      }

      const created = await tx.order.create({
        data: {
          number: orderNumber(),
          userId,
          email: input.email,
          phone: input.address.phone,
          shippingName: input.address.fullName,
          shippingLine1: input.address.line1,
          shippingLine2: input.address.line2,
          shippingCity: input.address.city,
          shippingState: input.address.state,
          shippingPostalCode: input.address.postalCode,
          shippingCountry: input.address.country,
          paymentMethod: input.paymentMethod,
          currency: settings.currency,
          ...totals,
          couponCode: quote.coupon?.code ?? null,
          idempotencyKey: input.idempotencyKey,
          reservationExpiresAt:
            input.paymentMethod === "RAZORPAY" ? new Date(Date.now() + RESERVATION_MINUTES * 60_000) : null,
          items: {
            create: quote.lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              productName: l.productName,
              sku: l.sku,
              size: l.size,
              color: l.color,
              imageUrl: l.imageUrl,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
              lineTotal: l.unitPrice * l.quantity,
            })),
          },
          events: {
            create: {
              type: "STATUS",
              userId,
              message:
                input.paymentMethod === "COD" ? "Order placed with cash on delivery." : "Order placed. Awaiting payment.",
            },
          },
        },
        select: placedSelect,
      });

      for (const l of quote.lines) {
        const res = await tx.variant.updateMany({
          where: { id: l.variantId, stock: { gte: l.quantity } },
          data: { stock: { decrement: l.quantity } },
        });
        if (res.count !== 1) {
          throw new HttpError(409, `${l.productName} (${l.size}, ${l.color}) just sold out. Update your bag.`);
        }
        const { stock } = await tx.variant.findUniqueOrThrow({ where: { id: l.variantId }, select: { stock: true } });
        await tx.stockAdjustment.create({
          data: {
            variantId: l.variantId,
            delta: -l.quantity,
            stockAfter: stock,
            reason: "ORDER_PLACED",
            orderId: created.id,
            userId,
          },
        });
      }

      if (input.saveAddress) {
        const count = await tx.address.count({ where: { userId } });
        await tx.address.create({ data: { ...input.address, userId, isDefault: count === 0 } });
      }
      return created;
    }, { timeout: 15_000 });
  } catch (err) {
    // Two identical submits racing: the loser hits the unique idempotency key and gets the winner's order.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const winner = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: placedSelect });
      if (winner && winner.userId === userId) return winner;
    }
    throw err;
  }

  if (order.paymentMethod === "RAZORPAY") {
    try {
      const rzp = await getRazorpay().orders.create({
        amount: order.total,
        currency: order.currency,
        receipt: order.number,
        notes: { orderId: order.id },
      });
      order = await db.order.update({ where: { id: order.id }, data: { razorpayOrderId: rzp.id }, select: placedSelect });
    } catch (err) {
      console.error("Razorpay order creation failed", err);
      await cancelOrder(order.id, { reason: "Payment could not be started.", byUserId: null, paymentFailed: true });
      throw new HttpError(502, "We couldn't start the payment. Your bag is unchanged, try again.");
    }
  }
  return order;
}

// ---------------------------------------------------------------- cancel + stock restore

/**
 * Cancels an order and restores its stock exactly once.
 * The `stockRestored: false` condition in the UPDATE is the guard: a second call (double click,
 * webhook + expiry job racing) matches zero rows and restores nothing.
 */
export async function cancelOrder(
  orderId: string,
  opts: { reason: string; byUserId: string | null; paymentFailed?: boolean },
) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new HttpError(404, "Order not found.");
    if (!["PENDING", "CONFIRMED", "PROCESSING"].includes(order.status)) {
      throw new HttpError(409, `A ${order.status.toLowerCase()} order can't be cancelled.`);
    }

    const paymentStatus: PaymentStatus =
      order.paymentStatus === "PAID"
        ? "REFUND_PENDING"
        : opts.paymentFailed && order.paymentStatus === "PENDING"
          ? "FAILED"
          : order.paymentStatus;

    const res = await tx.order.updateMany({
      where: { id: orderId, status: order.status, stockRestored: false },
      data: {
        status: "CANCELLED",
        paymentStatus,
        stockRestored: true,
        cancelledAt: new Date(),
        cancelReason: opts.reason,
        cancelRequestedAt: null,
        reservationExpiresAt: null,
      },
    });
    if (res.count !== 1) throw new HttpError(409, "This order was updated by someone else. Refresh and try again.");

    for (const item of order.items) {
      const v = await tx.variant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
        select: { stock: true },
      });
      await tx.stockAdjustment.create({
        data: {
          variantId: item.variantId,
          delta: item.quantity,
          stockAfter: v.stock,
          reason: "ORDER_CANCELLED",
          orderId,
          userId: opts.byUserId,
        },
      });
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        events: {
          create: [
            { type: "STATUS", message: `Order cancelled: ${opts.reason}`, userId: opts.byUserId },
            ...(paymentStatus === "REFUND_PENDING"
              ? [{ type: "REFUND", message: "Refund pending for the amount paid.", userId: opts.byUserId }]
              : []),
          ],
        },
      },
    });
    return { paymentStatus };
  });
}

// ---------------------------------------------------------------- payment results

/**
 * Marks an online order as paid. Safe to call any number of times (client verify + webhook + reconcile).
 * Only a server-verified signature or webhook may call this.
 */
export async function markOrderPaid(razorpayOrderId: string, razorpayPaymentId: string, source: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { razorpayOrderId } });
    if (!order) throw new HttpError(404, "Order not found for this payment.");
    if (["PAID", "REFUND_PENDING", "REFUNDED"].includes(order.paymentStatus)) return { order, changed: false };

    const now = new Date();
    if (order.status === "CANCELLED") {
      // Paid after the reservation expired. Stock is already released, so refund rather than revive.
      const res = await tx.order.updateMany({
        where: { id: order.id, paymentStatus: { in: ["PENDING", "FAILED"] } },
        data: { paymentStatus: "REFUND_PENDING", razorpayPaymentId, paidAt: now },
      });
      if (res.count === 1) {
        await tx.orderEvent.create({
          data: { orderId: order.id, type: "REFUND", message: `Payment received after cancellation (${source}). Refund required.` },
        });
      }
      return { order: await tx.order.findUniqueOrThrow({ where: { id: order.id } }), changed: res.count === 1 };
    }

    const res = await tx.order.updateMany({
      where: { id: order.id, paymentStatus: { in: ["PENDING", "FAILED"] }, status: { not: "CANCELLED" } },
      data: {
        paymentStatus: "PAID",
        razorpayPaymentId,
        paidAt: now,
        reservationExpiresAt: null,
        ...(order.status === "PENDING" ? { status: "CONFIRMED" as const } : {}),
      },
    });
    if (res.count === 1) {
      await tx.orderEvent.createMany({
        data: [
          { orderId: order.id, type: "PAYMENT", message: `Payment received (${source}).` },
          ...(order.status === "PENDING" ? [{ orderId: order.id, type: "STATUS", message: "Order confirmed." }] : []),
        ],
      });
    }
    return { order: await tx.order.findUniqueOrThrow({ where: { id: order.id } }), changed: res.count === 1 };
  });
}

/** A failed attempt doesn't cancel the order: the customer can retry until the reservation expires. */
export async function markPaymentFailed(razorpayOrderId: string, reason: string) {
  const order = await db.order.findUnique({ where: { razorpayOrderId } });
  if (!order) return;
  const res = await db.order.updateMany({
    where: { id: order.id, paymentStatus: "PENDING" },
    data: { paymentStatus: "FAILED" },
  });
  await db.orderEvent.create({
    data: { orderId: order.id, type: "PAYMENT", message: `Payment attempt failed: ${reason}` },
  });
  return res.count === 1;
}

/**
 * Cancels unpaid online orders whose reservation has expired and releases their stock.
 * Before cancelling, asks Razorpay whether a payment actually went through (webhook may be late).
 */
export async function releaseExpiredReservations(now = new Date()) {
  const expired = await db.order.findMany({
    where: {
      paymentMethod: "RAZORPAY",
      status: "PENDING",
      paymentStatus: { in: ["PENDING", "FAILED"] },
      reservationExpiresAt: { lt: now },
    },
    select: { id: true, razorpayOrderId: true },
    take: 100,
  });
  let released = 0;
  for (const o of expired) {
    try {
      if (o.razorpayOrderId && isRazorpayConfigured()) {
        const payments = await getRazorpay().orders.fetchPayments(o.razorpayOrderId);
        const captured = payments.items.find((p) => p.status === "captured");
        if (captured) {
          await markOrderPaid(o.razorpayOrderId, captured.id, "reconciliation");
          continue;
        }
      }
      await cancelOrder(o.id, { reason: "Payment wasn't completed in time.", byUserId: null, paymentFailed: true });
      released++;
    } catch (err) {
      console.error("Failed to release reservation", o.id, err);
    }
  }
  return { checked: expired.length, released };
}

// ---------------------------------------------------------------- admin status changes

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export async function updateOrderStatus(
  orderId: string,
  adminId: string,
  input: {
    status: OrderStatus;
    note?: string;
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string | null;
  },
) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new HttpError(404, "Order not found.");
  if (!ORDER_TRANSITIONS[order.status].includes(input.status)) {
    throw new HttpError(409, `Can't move an order from ${order.status} to ${input.status}.`);
  }

  if (input.status === "CANCELLED") {
    await cancelOrder(orderId, { reason: input.note || "Cancelled by store.", byUserId: adminId });
    await audit(adminId, "order.cancel", "Order", orderId, { from: order.status, note: input.note ?? null });
    return;
  }
  if (input.status === "CONFIRMED" && order.paymentMethod === "RAZORPAY" && order.paymentStatus !== "PAID") {
    throw new HttpError(409, "Online orders are confirmed automatically once payment is received.");
  }
  if (input.status === "SHIPPED" && !(input.carrier && input.trackingNumber)) {
    throw new HttpError(400, "Add the carrier and tracking number to mark as shipped.", {
      trackingNumber: "Required for shipping",
    });
  }

  const now = new Date();
  const codCollected = input.status === "DELIVERED" && order.paymentMethod === "COD" && order.paymentStatus === "PENDING";
  await db.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: {
        status: input.status,
        ...(input.status === "CONFIRMED" ? { reservationExpiresAt: null } : {}),
        ...(input.status === "SHIPPED"
          ? { carrier: input.carrier, trackingNumber: input.trackingNumber, trackingUrl: input.trackingUrl, shippedAt: now }
          : {}),
        ...(input.status === "DELIVERED" ? { deliveredAt: now } : {}),
        ...(codCollected ? { paymentStatus: "PAID" as const, paidAt: now } : {}),
      },
    });
    if (res.count !== 1) throw new HttpError(409, "This order was updated by someone else. Refresh and try again.");
    await tx.orderEvent.createMany({
      data: [
        {
          orderId,
          type: "STATUS",
          userId: adminId,
          message:
            input.status === "SHIPPED"
              ? `Shipped via ${input.carrier} (${input.trackingNumber}).`
              : `Status changed to ${input.status.toLowerCase()}.${input.note ? ` ${input.note}` : ""}`,
        },
        ...(codCollected
          ? [{ orderId, type: "PAYMENT", userId: adminId, message: "Cash collected on delivery." }]
          : []),
      ],
    });
    await audit(adminId, "order.status", "Order", orderId, { from: order.status, to: input.status }, tx);
  });
}

/** Paid order → refund pending (e.g. approved return of a delivered order). */
export async function startRefund(orderId: string, adminId: string, note?: string) {
  const res = await db.order.updateMany({
    where: { id: orderId, paymentStatus: "PAID" },
    data: { paymentStatus: "REFUND_PENDING", cancelRequestedAt: null },
  });
  if (res.count !== 1) throw new HttpError(409, "Only paid orders can be refunded.");
  await db.orderEvent.create({
    data: { orderId, type: "REFUND", userId: adminId, message: `Refund started.${note ? ` ${note}` : ""}` },
  });
  await audit(adminId, "order.refund.start", "Order", orderId, { note: note ?? null });
}

/**
 * Completes a pending refund. For Razorpay payments without a manual reference, issues the refund via API.
 * The REFUND_PENDING → REFUNDED conditional update keeps it single-shot.
 */
export async function completeRefund(orderId: string, adminId: string, reference?: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentStatus !== "REFUND_PENDING") throw new HttpError(409, "No refund is pending on this order.");

  let ref = reference?.trim();
  if (!ref && order.paymentMethod === "RAZORPAY" && order.razorpayPaymentId) {
    if (!isRazorpayConfigured()) throw new HttpError(503, "Razorpay isn't configured. Enter the refund reference manually.");
    // Claim first so a double click can't send two refunds to Razorpay.
    const claim = await db.order.updateMany({
      where: { id: orderId, paymentStatus: "REFUND_PENDING", refundReference: null },
      data: { refundReference: "processing" },
    });
    if (claim.count !== 1) throw new HttpError(409, "A refund is already being processed.");
    try {
      const refund = await getRazorpay().payments.refund(order.razorpayPaymentId, {
        amount: order.total,
        notes: { orderNumber: order.number },
      });
      ref = refund.id;
    } catch (err) {
      await db.order.update({ where: { id: orderId }, data: { refundReference: null } });
      console.error("Razorpay refund failed", err);
      throw new HttpError(502, "Razorpay rejected the refund. Check the payment in the Razorpay dashboard.");
    }
  }
  if (!ref) throw new HttpError(400, "Enter the refund reference (bank/UPI transaction ID).", { reference: "Required" });

  await db.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: "REFUND_PENDING" },
      data: { paymentStatus: "REFUNDED", refundReference: ref },
    });
    if (res.count !== 1) throw new HttpError(409, "This refund was already completed.");
    await tx.orderEvent.create({ data: { orderId, type: "REFUND", userId: adminId, message: `Refunded. Reference ${ref}.` } });
    await audit(adminId, "order.refund.complete", "Order", orderId, { reference: ref }, tx);
  });
}

// ---------------------------------------------------------------- customer requests

export async function customerCancel(orderId: string, userId: string, reason: string) {
  const order = await db.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw new HttpError(404, "Order not found.");

  if (order.status === "PENDING" || order.status === "CONFIRMED") {
    await cancelOrder(orderId, { reason: `Cancelled by customer: ${reason}`, byUserId: userId });
    return { cancelled: true };
  }
  if (order.status === "PROCESSING" || order.status === "DELIVERED") {
    if (order.cancelRequestedAt) throw new HttpError(409, "You've already sent a request for this order.");
    const kind = order.status === "DELIVERED" ? "Return and refund" : "Cancellation";
    await db.order.update({
      where: { id: orderId },
      data: {
        cancelRequestedAt: new Date(),
        cancelRequestReason: reason,
        events: { create: { type: "CANCEL_REQUEST", userId, message: `${kind} requested: ${reason}` } },
      },
    });
    return { cancelled: false };
  }
  throw new HttpError(409, "This order can't be cancelled now. Contact us for help.");
}

export async function dismissCancelRequest(orderId: string, adminId: string, note?: string) {
  const res = await db.order.updateMany({
    where: { id: orderId, cancelRequestedAt: { not: null } },
    data: { cancelRequestedAt: null },
  });
  if (res.count !== 1) throw new HttpError(409, "There's no open request on this order.");
  await db.orderEvent.create({
    data: { orderId, type: "CANCEL_REQUEST", userId: adminId, message: `Request declined.${note ? ` ${note}` : ""}` },
  });
  await audit(adminId, "order.request.decline", "Order", orderId, { note: note ?? null });
}
