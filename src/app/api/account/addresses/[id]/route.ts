import { route, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { addressSchema } from "@/lib/validators";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const input = await parseBody(req, addressSchema.partial());
  return db.$transaction(async (tx) => {
    const existing = await tx.address.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw new HttpError(404, "Address not found.");
    if (input.isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    // An address can't be un-defaulted directly; pick another one as default instead.
    const isDefault = input.isDefault || existing.isDefault;
    return { address: await tx.address.update({ where: { id }, data: { ...input, isDefault } }) };
  });
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await db.$transaction(async (tx) => {
    const existing = await tx.address.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw new HttpError(404, "Address not found.");
    await tx.address.delete({ where: { id } });
    if (existing.isDefault) {
      const next = await tx.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
  return { ok: true };
});
