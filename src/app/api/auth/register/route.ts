import { route, parseBody, clientIp } from "@/lib/api";
import { createSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validators";

export const POST = route(async (req) => {
  rateLimit(`register:${clientIp(req)}`, 5, 60_000);
  const input = await parseBody(req, registerSchema);
  if (await db.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
    throw new HttpError(409, "An account with this email already exists. Sign in instead.", {
      email: "Already registered",
    });
  }
  const user = await db.user.create({
    data: { name: input.name, email: input.email, passwordHash: await hashPassword(input.password) },
  });
  await createSession(user.id);
  return { role: user.role };
});
