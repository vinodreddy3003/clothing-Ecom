import { SettingsForm } from "@/components/admin/content-forms";
import { PageHeader } from "@/components/admin/ui";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Settings" description="Store details, shipping charges and payment options." />
      <SettingsForm
        initial={{
          storeName: s.storeName, tagline: s.tagline, logoUrl: s.logoUrl, email: s.email, phone: s.phone, address: s.address,
          currency: s.currency, shippingFee: s.shippingFee, freeShippingThreshold: s.freeShippingThreshold, codEnabled: s.codEnabled,
          codMaxTotal: s.codMaxTotal, announcement: s.announcement,
        }}
      />
    </>
  );
}
