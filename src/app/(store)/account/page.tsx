import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth";
import { PasswordForm, ProfileForm } from "@/components/store/account-forms";

export const metadata: Metadata = { title: "My account", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUserPage("/account");
  return (
    <div className="grid max-w-xl gap-10">
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Profile</h2>
        <ProfileForm name={user.name} phone={user.phone} />
      </section>
      <section className="space-y-4 border-t border-line pt-8">
        <h2 className="text-xl font-bold">Password</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
