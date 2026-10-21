import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { Prisma } from "@prisma/client";
import { HttpError } from "@/lib/errors";

type Ctx<P> = { params: Promise<P> };

/**
 * Wraps a route handler: same-origin check for mutations, consistent JSON errors.
 * Errors: { error: string, fields?: Record<string,string> }
 */
export function route<P = Record<string, string>>(
  handler: (req: NextRequest, ctx: Ctx<P>) => Promise<unknown>,
  opts: { skipOriginCheck?: boolean } = {},
) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      if (!opts.skipOriginCheck && req.method !== "GET") assertSameOrigin(req);
      const result = await handler(req, ctx);
      return result instanceof Response ? result : NextResponse.json(result ?? { ok: true });
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message, fields: err.fields }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) fields[issue.path.join(".")] ??= issue.message;
    return NextResponse.json({ error: "Check the highlighted fields.", fields }, { status: 400 });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = (err.meta?.target as string[] | undefined)?.join(", ") ?? "value";
    return NextResponse.json({ error: `That ${target} is already in use.` }, { status: 409 });
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong on our side. Try again." }, { status: 500 });
}

export async function parseBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const json = await req.json().catch(() => {
    throw new HttpError(400, "Request body must be JSON.");
  });
  return schema.parse(json);
}

// SameSite=Lax cookies already block most CSRF; this rejects cross-site POSTs explicitly.
function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients (curl, server-to-server) don't carry cookies by default
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (new URL(origin).host !== host) throw new HttpError(403, "Cross-site request blocked.");
}

export function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
}
