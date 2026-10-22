import { route, parseBody, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { contactSchema } from "@/lib/validators";

export const POST = route(async (req) => {
  rateLimit(`contact:${clientIp(req)}`, 5, 10 * 60_000);
  const input = await parseBody(req, contactSchema);
  await db.contactMessage.create({ data: input });
  return { ok: true };
});
