import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/store/auth-form";
import { safeNext } from "@/components/store/safe-next";
import { AuthShell } from "@/components/store/auth-shell";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(safeNext(next) ?? "/account");
  return (
    <AuthShell title="Create your account" body="Save addresses, check out faster and see all your orders in one place.">
      <AuthForm mode="register" next={next} />
    </AuthShell>
  );
}
