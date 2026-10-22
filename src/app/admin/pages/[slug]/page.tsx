import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageForm } from "@/components/admin/content-forms";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";

export const metadata = { title: "Edit page" };
const SLUGS = ["about", "contact", "privacy-policy", "terms", "shipping-policy", "return-policy"];

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUGS.includes(slug)) notFound();
  const page = await db.page.findUnique({ where: { slug } });
  return (
    <>
      <Link href="/admin/pages" className="mb-3 inline-flex items-center gap-1 text-sm text-stone hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Pages
      </Link>
      <PageHeader title={page?.title ?? slug} description={`Shown at /${slug}`} actions={<Link href={`/${slug}`} target="_blank" className="text-sm underline">View page</Link>} />
      <div className="max-w-3xl">
        <PageForm slug={slug} title={page?.title ?? ""} content={page?.content ?? ""} />
      </div>
    </>
  );
}
