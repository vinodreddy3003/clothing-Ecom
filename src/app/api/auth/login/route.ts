import { route, parseBody, clientIp } from "@/lib/api";
import { createSession, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validators";

// Compared against when the email doesn't exist, so response time doesn't reveal registered emails.
const DUMMY_HASH = "$2b$12$5v7zxxZJDyXOV0S/lmilu.KO4mtgGSb50O6fDpaXw2mM/wtyZgFWe";

export const POST = route(async (req) => {
  const input = await parseBody(req, loginSchema);
  rateLimit(`login:${clientIp(req)}:${input.email}`, 10, 60_000);
  const user = await db.user.findUnique({ where: { email: input.email } });
  const ok = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || !user.isActive) throw new HttpError(401, "Email or password is incorrect.");
  await createSession(user.id);
  return { role: user.role };
});
