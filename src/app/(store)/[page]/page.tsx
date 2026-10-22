import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { ContactForm } from "@/components/store/contact-form";

export const dynamic = "force-dynamic";

const CONTENT_PAGES = ["about", "contact", "privacy-policy", "terms", "shipping-policy", "return-policy"];

type Props = { params: Promise<{ page: string }> };

const getPage = async (slug: string) => (CONTENT_PAGES.includes(slug) ? db.page.findUnique({ where: { slug } }) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page: slug } = await params;
  const page = await getPage(slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.content.replace(/^## .*$/gm, "").trim().slice(0, 160),
    alternates: { canonical: `/${slug}` },
  };
}

/** Admin-edited text: blank lines separate paragraphs, lines starting "## " are headings. Rendered as text, never HTML. */
function Content({ text }: { text: string }) {
  return (
    <div className="space-y-4 text-[15px] leading-[26px] md:text-base">
      {text
        .split(/\n\s*\n/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block, i) =>
          block.startsWith("## ") ? (
            <h2 key={i} className="pt-4 text-xl font-bold tracking-[-0.01em] md:text-2xl">
              {block.slice(3)}
            </h2>
          ) : (
            <p key={i} className="whitespace-pre-line text-ink/80">
              {block}
            </p>
          ),
        )}
    </div>
  );
}

export default async function ContentPage({ params }: Props) {
  const { page: slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  if (slug === "contact") {
    const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
    return (
      <div className="grid gap-10 pt-2 md:pt-8 lg:grid-cols-2 lg:gap-16">
        <div className="max-w-[70ch]">
          <h1 className="mb-6 text-[26px] leading-8 font-bold tracking-[-0.02em] md:text-[40px] md:leading-[44px]">{page.title}</h1>
          <Content text={page.content} />
          <dl className="mt-8 space-y-4 rounded-3xl bg-tile p-6 text-[15px]">
            {settings.email && (
              <div>
                <dt className="font-semibold">Email</dt>
                <dd>
                  <a href={`mailto:${settings.email}`} className="underline underline-offset-4">
                    {settings.email}
                  </a>
                </dd>
              </div>
            )}
            {settings.phone && (
              <div>
                <dt className="font-semibold">Phone</dt>
                <dd>
                  <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="underline underline-offset-4">
                    {settings.phone}
                  </a>
                </dd>
              </div>
            )}
            {settings.address && (
              <div>
                <dt className="font-semibold">Address</dt>
                <dd>{settings.address}</dd>
              </div>
            )}
          </dl>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-bold">Send us a message</h2>
          <ContactForm defaultName={user?.name} defaultEmail={user?.email} />
        </div>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-[70ch] pt-2 md:pt-8">
      <h1 className="mb-2 text-[26px] leading-8 font-bold tracking-[-0.02em] md:text-[40px] md:leading-[44px]">{page.title}</h1>
      <p className="mb-8 text-sm text-stone">
        Last updated {page.updatedAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
      </p>
      <Content text={page.content} />
    </article>
  );
}
