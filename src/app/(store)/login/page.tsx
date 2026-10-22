import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/store/auth-form";
import { safeNext } from "@/components/store/safe-next";
import { AuthShell } from "@/components/store/auth-shell";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(safeNext(next) ?? (user.role === "ADMIN" ? "/admin" : "/account"));
  return (
    <AuthShell title="Welcome back" body="Sign in to check out faster and track your orders.">
      <AuthForm mode="login" next={next} />
    </AuthShell>
  );
}
