"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, Boxes, FileText, FolderTree, Home, LayoutDashboard, LogOut, Mail, Menu, Package,
  Settings, ShoppingBag, Store, Tag, Users,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/homepage", label: "Homepage", icon: Home },
  { href: "/admin/coupons", label: "Coupons", icon: Tag },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/messages", label: "Messages", icon: Mail },
  { href: "/admin/pages", label: "Pages", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function NavLinks({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const signOut = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  };
  const item = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
  return (
    <nav className="flex flex-1 flex-col gap-0.5" aria-label="Admin">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={compact ? label : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(item, compact && "justify-center px-0", active ? "bg-ink text-paper" : "text-ink hover:bg-tile")}
          >
            <Icon className="size-[18px] shrink-0" aria-hidden />
            <span className={cn(compact && "sr-only")}>{label}</span>
          </Link>
        );
      })}
      <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-3">
        <Link href="/" className={cn(item, compact && "justify-center px-0", "text-stone hover:bg-tile hover:text-ink")} title={compact ? "View store" : undefined}>
          <Store className="size-[18px]" aria-hidden />
          <span className={cn(compact && "sr-only")}>View store</span>
        </Link>
        <button type="button" onClick={signOut} className={cn(item, compact && "justify-center px-0", "text-stone hover:bg-tile hover:text-ink")} title={compact ? "Sign out" : undefined}>
          <LogOut className="size-[18px]" aria-hidden />
          <span className={cn(compact && "sr-only")}>Sign out</span>
        </button>
      </div>
    </nav>
  );
}

export function AdminSidebar({ storeName }: { storeName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Mobile top bar + sheet */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper px-4 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col p-4">
            <SheetTitle className="px-3 pb-2 text-lg font-bold">{storeName}</SheetTitle>
            <NavLinks onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <span className="font-bold">{storeName} admin</span>
        <span className="size-8" />
      </header>
      {/* Tablet icon rail */}
      <aside className="sticky top-0 hidden h-dvh w-16 flex-col border-r border-line bg-sidebar p-2 md:flex lg:hidden">
        <div className="mb-4 flex h-10 items-center justify-center rounded-lg bg-ink text-sm font-bold text-paper" aria-hidden>
          {storeName.slice(0, 1)}
        </div>
        <NavLinks compact />
      </aside>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 flex-col border-r border-line bg-sidebar p-4 lg:flex">
        <div className="mb-6 px-3">
          <p className="text-lg font-bold leading-tight">{storeName}</p>
          <p className="text-sm text-stone">Admin</p>
        </div>
        <NavLinks />
      </aside>
    </>
  );
}
