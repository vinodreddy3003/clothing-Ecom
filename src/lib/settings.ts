import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

/** Single-row store settings; created with defaults on first read. */
export const getSettings = cache(() =>
  db.storeSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
);
