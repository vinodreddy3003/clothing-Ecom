import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Uptime/deploy check. Reports the database error class and code only, never connection details. */
export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, db: "DATABASE_URL is not set" }, { status: 503 });
  }
  try {
    await db.$queryRaw`SELECT 1`;
    const tables = await db.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM information_schema.tables WHERE table_name = 'Product'`;
    if (Number(tables[0]?.n ?? 0) === 0) {
      return NextResponse.json({ ok: false, db: "connected, but migrations have not been applied" }, { status: 503 });
    }
    return NextResponse.json({ ok: true, db: "ok" });
  } catch (err) {
    const code =
      err instanceof Prisma.PrismaClientInitializationError
        ? err.errorCode
        : err instanceof Prisma.PrismaClientKnownRequestError
          ? err.code
          : undefined;
    const kind = err instanceof Error ? err.constructor.name : "UnknownError";
    // First line of Prisma's message names the problem (unreachable host, auth failed, missing engine) without the URL.
    const hint = err instanceof Error ? err.message.split("\n").filter(Boolean).at(-1)?.replace(/postgres(ql)?:\/\/\S+/g, "<url>").slice(0, 200) : undefined;
    return NextResponse.json({ ok: false, db: "error", kind, code, hint }, { status: 503 });
  }
}
