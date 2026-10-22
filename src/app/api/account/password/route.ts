import { route, parseBody, clientIp } from "@/lib/api";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { passwordChangeSchema } from "@/lib/validators";

export const POST = route(async (req) => {
  const user = await requireUser();
  rateLimit(`password:${user.id}:${clientIp(req)}`, 5, 60_000);
  const input = await parseBody(req, passwordChangeSchema);
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(input.currentPassword, row.passwordHash))) {
    throw new HttpError(400, "Your current password is incorrect.", { currentPassword: "Incorrect password" });
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(input.newPassword) } });
  return { ok: true };
});
