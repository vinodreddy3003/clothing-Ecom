import { HttpError } from "@/lib/errors";

// ponytail: in-memory fixed window, per server instance. Move to Redis/ElastiCache when running >1 instance.
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
    return;
  }
  if (++entry.count > limit) throw new HttpError(429, "Too many attempts. Wait a minute and try again.");
}
