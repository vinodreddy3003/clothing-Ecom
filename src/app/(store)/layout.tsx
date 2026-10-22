import { getCurrentUser } from "@/lib/auth";
import { navCategories } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { StoreProviders } from "@/components/store/providers";
import { SiteHeader } from "@/components/store/site-header";
import { SiteFooter } from "@/components/store/site-footer";
import { BottomNav } from "@/components/store/header-client";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, user, categories] = await Promise.all([getSettings(), getCurrentUser(), navCategories()]);
  return (
    <StoreProviders>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      {settings.announcement && (
        <p className="bg-ink px-4 py-2 text-center text-[13px] font-medium text-paper">{settings.announcement}</p>
      )}
      <SiteHeader user={user} storeName={settings.storeName} logoUrl={settings.logoUrl} categories={categories} />
      <main id="main" className="mx-auto min-h-[60vh] max-w-[1280px] px-4 pb-28 md:px-6 md:pb-0 lg:px-10">
        {children}
      </main>
      <SiteFooter {...settings} categories={categories} />
      <BottomNav />
    </StoreProviders>
  );
}
