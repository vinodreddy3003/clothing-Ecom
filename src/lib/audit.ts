import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Tx = Prisma.TransactionClient;

export function audit(
  userId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  data?: Prisma.InputJsonValue,
  tx: Tx = db,
) {
  return tx.auditLog.create({ data: { userId, action, entity, entityId, data } });
}
