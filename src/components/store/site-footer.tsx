import Link from "next/link";

const help = [
  ["Contact us", "/contact"],
  ["Shipping policy", "/shipping-policy"],
  ["Return policy", "/return-policy"],
  ["Track an order", "/account/orders"],
];
const company = [
  ["About us", "/about"],
  ["Privacy policy", "/privacy-policy"],
  ["Terms and conditions", "/terms"],
];

export function SiteFooter({
  storeName,
  tagline,
  email,
  phone,
  address,
  categories,
}: {
  storeName: string;
  tagline: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  categories: { id: string; name: string; slug: string }[];
}) {
  return (
    <footer className="mt-16 bg-ink text-paper md:mt-24">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-12 sm:grid-cols-2 md:px-6 lg:grid-cols-4 lg:px-10">
        <div className="space-y-3">
          <p className="text-2xl font-extrabold tracking-[-0.03em]">{storeName}</p>
          {tagline && <p className="max-w-xs text-[15px] text-paper/70">{tagline}</p>}
        </div>
        <FooterList title="Shop" links={categories.map((c) => [c.name, `/category/${c.slug}`])} />
        <FooterList title="Help" links={help} />
        <div className="space-y-3">
          <FooterList title="Company" links={company} />
          <address className="space-y-1 pt-2 text-sm text-paper/70 not-italic">
            {email && (
              <a className="block hover:text-paper" href={`mailto:${email}`}>
                {email}
              </a>
            )}
            {phone && (
              <a className="block hover:text-paper" href={`tel:${phone.replace(/\s/g, "")}`}>
                {phone}
              </a>
            )}
            {address && <p>{address}</p>}
          </address>
        </div>
      </div>
      <div className="border-t border-paper/15">
        <p className="mx-auto max-w-[1280px] px-4 py-5 pb-28 text-sm text-paper/60 md:px-6 md:pb-5 lg:px-10">
          © {new Date().getFullYear()} {storeName}. All prices include GST.
        </p>
      </div>
    </footer>
  );
}

function FooterList({ title, links }: { title: string; links: string[][] }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-paper/60">{title}</h2>
      <ul className="space-y-2 text-[15px]">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="hover:underline">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
