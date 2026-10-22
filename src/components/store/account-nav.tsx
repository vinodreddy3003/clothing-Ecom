"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, LogOut, MapPin, Package, User } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

const links = [
  { href: "/account", label: "Profile", icon: User },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/orders", label: "Orders", icon: Package },
];

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await api("/api/auth/logout", { method: "POST" });
        } catch {
          toast.error("Couldn't sign out. Try again.");
          return;
        }
        router.replace("/");
        router.refresh();
      }}
      className={className}
    >
      <LogOut className="size-5" strokeWidth={1.75} />
      Sign out
    </button>
  );
}

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account">
      <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line md:divide-y-0 md:border-0">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 items-center gap-3 px-4 text-[15px] font-medium md:min-h-12 md:rounded-full",
                  active ? "md:bg-ink md:text-paper" : "hover:bg-tile",
                )}
              >
                <Icon className="size-5" strokeWidth={1.75} />
                <span className="flex-1">{label}</span>
                <ChevronRight className="size-4 text-stone md:hidden" />
              </Link>
            </li>
          );
        })}
        <li>
          <SignOutButton className="flex min-h-14 w-full items-center gap-3 px-4 text-[15px] font-medium text-danger hover:bg-tile md:min-h-12 md:rounded-full" />
        </li>
      </ul>
    </nav>
  );
}
