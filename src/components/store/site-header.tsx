import Image from "next/image";
import Link from "next/link";
import { Heart, User } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { BagButton, DesktopNavLink } from "@/components/store/header-client";
import { SearchBar } from "@/components/store/search-bar";

type Props = {
  user: SessionUser | null;
  storeName: string;
  logoUrl: string | null;
  categories: { id: string; name: string; slug: string }[];
};

function Logo({ storeName, logoUrl }: Pick<Props, "storeName" | "logoUrl">) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 text-xl font-extrabold tracking-[-0.03em]">
      {logoUrl ? <Image src={logoUrl} alt={storeName} width={120} height={32} className="h-8 w-auto" /> : storeName}
    </Link>
  );
}

export function SiteHeader({ user, storeName, logoUrl, categories }: Props) {
  const firstName = user?.name.split(" ")[0];
  return (
    <header className="sticky top-0 z-30 border-b border-transparent bg-paper/95 backdrop-blur md:border-line">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-4 md:h-20 md:px-6 lg:px-10">
        {/* Mobile: greeting or logo */}
        <div className="flex flex-1 items-center md:hidden">
          {user ? (
            <Link href="/account" className="flex items-center gap-2 rounded-full border border-line py-1 pr-4 pl-1">
              <span className="grid size-8 place-items-center rounded-full bg-tile text-sm font-bold" aria-hidden>
                {firstName?.[0]?.toUpperCase()}
              </span>
              <span className="text-[15px] font-semibold">Hey, {firstName}</span>
            </Link>
          ) : (
            <Logo storeName={storeName} logoUrl={logoUrl} />
          )}
        </div>

        <div className="hidden md:block">
          <Logo storeName={storeName} logoUrl={logoUrl} />
        </div>

        <nav aria-label="Categories" className="hidden items-center gap-1 lg:flex">
          {categories.map((c) => (
            <DesktopNavLink key={c.id} href={`/category/${c.slug}`}>
              {c.name}
            </DesktopNavLink>
          ))}
        </nav>

        <SearchBar className="ml-auto hidden max-w-sm flex-1 md:flex" showFilter={false} />

        <div className="flex items-center gap-2">
          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="hidden size-11 place-items-center rounded-full border border-line hover:bg-tile md:grid"
          >
            <Heart className="size-5" strokeWidth={1.75} />
          </Link>
          <Link
            href={user ? "/account" : "/login"}
            aria-label={user ? "Your account" : "Sign in"}
            className="hidden size-11 place-items-center rounded-full border border-line hover:bg-tile md:grid"
          >
            <User className="size-5" strokeWidth={1.75} />
          </Link>
          <BagButton />
        </div>
      </div>
      {/* Tablet: category row (desktop shows them inline) */}
      <nav aria-label="Categories" className="no-scrollbar hidden gap-2 overflow-x-auto px-6 pb-3 md:flex lg:hidden">
        {categories.map((c) => (
          <DesktopNavLink key={c.id} href={`/category/${c.slug}`}>
            {c.name}
          </DesktopNavLink>
        ))}
      </nav>
    </header>
  );
}
