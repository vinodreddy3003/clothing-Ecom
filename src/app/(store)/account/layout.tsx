import { requireUserPage } from "@/lib/auth";
import { AccountNav } from "@/components/store/account-nav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage("/account");
  return (
    <div className="pt-2 md:pt-8">
      <p className="text-[15px] text-stone">Signed in as {user.email}</p>
      <h1 className="mb-6 text-[26px] leading-8 font-bold tracking-[-0.02em] md:text-[40px] md:leading-[44px]">My account</h1>
      <div className="grid gap-8 md:grid-cols-[220px_1fr] lg:gap-12">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
