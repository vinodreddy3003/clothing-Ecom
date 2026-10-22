import { route, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { addressSchema } from "@/lib/validators";

export const GET = route(async () => {
  const user = await requireUser();
  return { addresses: await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }) };
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = await parseBody(req, addressSchema);
  return db.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId: user.id } });
    if (count >= 20) throw new HttpError(400, "You can save up to 20 addresses.");
    const isDefault = input.isDefault || count === 0;
    if (isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    return { address: await tx.address.create({ data: { ...input, isDefault, userId: user.id } }) };
  });
});
