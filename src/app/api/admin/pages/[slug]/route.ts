import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { pageSchema } from "@/lib/validators";

const PAGE_SLUGS = ["about", "contact", "privacy-policy", "terms", "shipping-policy", "return-policy"];

export const PATCH = route<{ slug: string }>(async (req, { params }) => {
  const admin = await requireAdmin();
  const { slug } = await params;
  if (!PAGE_SLUGS.includes(slug)) throw new HttpError(404, "Page not found.");
  const data = await parseBody(req, pageSchema);
  await db.page.upsert({ where: { slug }, update: data, create: { slug, ...data } });
  await audit(admin.id, "page.update", "Page", slug, { title: data.title });
  return { ok: true };
});
