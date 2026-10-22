"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, ShoppingBag, Store, User } from "lucide-react";
import { useCart } from "@/components/store/providers";
import { cn } from "@/lib/utils";

export function BagButton({ className }: { className?: string }) {
  const { count, ready } = useCart();
  return (
    <Link
      href="/cart"
      aria-label={ready && count ? `Bag, ${count} item${count === 1 ? "" : "s"}` : "Bag"}
      className={cn("relative grid size-11 place-items-center rounded-full border border-line bg-paper hover:bg-tile", className)}
    >
      <ShoppingBag className="size-5" strokeWidth={1.75} />
      {ready && count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] font-bold leading-5 text-paper tabular">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function DesktopNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full px-4 py-2 text-[15px] font-medium transition-colors hover:bg-tile",
        active && "bg-ink text-paper hover:bg-ink",
      )}
    >
      {children}
    </Link>
  );
}

const tabs = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/shop", label: "Shop", icon: Store, match: (p: string) => /^\/(shop|category|collections|product)/.test(p) },
  { href: "/wishlist", label: "Wishlist", icon: Heart, match: (p: string) => p.startsWith("/wishlist") },
  { href: "/account", label: "Account", icon: User, match: (p: string) => /^\/(account|orders|login|register)/.test(p) },
];

/** Mobile-only floating pill navigation (reference design). */
export function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/checkout") || pathname.startsWith("/product/")) return null;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between rounded-full border border-line bg-paper/95 p-2 shadow-[0_8px_24px_rgb(0_0_0/0.08)] backdrop-blur md:hidden"
    >
      {tabs.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            className={cn(
              "flex h-11 items-center gap-2 rounded-full transition-[background-color,padding] duration-150",
              active ? "bg-tile pr-4 pl-1" : "px-3",
            )}
          >
            <span className={cn("grid size-9 place-items-center rounded-full", active && "bg-lime")}>
              <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
            </span>
            {active && <span className="text-sm font-semibold">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
