import { NextResponse, type NextRequest } from "next/server";
import { releaseExpiredReservations } from "@/lib/services/orders";

// Run every 5 minutes (EventBridge Scheduler → HTTPS, or a cron curl) with
// Authorization: Bearer $CRON_SECRET
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await releaseExpiredReservations());
}
