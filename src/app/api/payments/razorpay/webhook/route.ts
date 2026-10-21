import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { markOrderPaid, markPaymentFailed } from "@/lib/services/orders";

type PaymentEntity = { id: string; order_id: string; status: string; error_description?: string };

/**
 * Razorpay webhook. Configure in Razorpay Dashboard → Webhooks with events:
 * payment.captured, payment.failed, order.paid. Retries are safe: events are de-duplicated by
 * x-razorpay-event-id and the order updates themselves are idempotent.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(raw) as { event: string; payload: { payment?: { entity: PaymentEntity } } };
  const eventId = req.headers.get("x-razorpay-event-id") ?? `${event.event}:${event.payload.payment?.entity.id}`;
  if (await db.webhookEvent.findUnique({ where: { id: eventId } })) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const payment = event.payload.payment?.entity;
  try {
    if (payment && (event.event === "payment.captured" || event.event === "order.paid")) {
      await markOrderPaid(payment.order_id, payment.id, `webhook ${event.event}`);
    } else if (payment && event.event === "payment.failed") {
      await markPaymentFailed(payment.order_id, payment.error_description ?? "declined");
    }
  } catch (err) {
    console.error("Webhook processing failed", eventId, err);
    // 5xx makes Razorpay retry later; nothing was recorded, so the retry is processed fresh.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  try {
    await db.webhookEvent.create({
      data: { id: eventId, provider: "razorpay", type: event.event, payload: event as unknown as Prisma.InputJsonValue },
    });
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
  }
  return NextResponse.json({ ok: true });
}
