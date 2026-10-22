import Link from "next/link";
import { PageHeader, Panel, dateFmt } from "@/components/admin/ui";
import { db } from "@/lib/db";

export const metadata = { title: "Pages" };

const SLUGS: [string, string][] = [
  ["about", "About us"],
  ["contact", "Contact us"],
  ["privacy-policy", "Privacy policy"],
  ["terms", "Terms and conditions"],
  ["shipping-policy", "Shipping policy"],
  ["return-policy", "Return policy"],
];

export default async function PagesAdmin() {
  const pages = new Map((await db.page.findMany()).map((p) => [p.slug, p]));
  return (
    <>
      <PageHeader title="Pages" description="About, contact and policy pages linked in the store footer." />
      <Panel>
        <ul className="divide-y divide-line">
          {SLUGS.map(([slug, fallback]) => {
            const p = pages.get(slug);
            return (
              <li key={slug} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <Link href={`/admin/pages/${slug}`} className="font-medium hover:underline">{p?.title ?? fallback}</Link>
                  <p className="text-xs text-stone">/{slug} · {p ? `updated ${dateFmt(p.updatedAt)}` : "not written yet"}</p>
                </div>
                <Link href={`/admin/pages/${slug}`} className="underline">Edit</Link>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
