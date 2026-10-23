import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/store/auth-form";
import { safeNext } from "@/components/store/safe-next";
import { AuthShell } from "@/components/store/auth-shell";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const { next, reason } = await searchParams;
  const user = await getCurrentUser();
  const needsAdmin = reason === "admin" && user && user.role !== "ADMIN";
  if (user && !needsAdmin) redirect(safeNext(next) ?? (user.role === "ADMIN" ? "/admin" : "/account"));
  return (
    <AuthShell
      title={needsAdmin ? "Admin sign in" : "Welcome back"}
      body={needsAdmin ? "The dashboard is for store admins." : "Sign in to check out faster and track your orders."}
    >
      {needsAdmin && (
        <p role="status" className="mb-4 rounded-2xl bg-tile p-3 text-[15px]">
          You&apos;re signed in as {user.email}, which isn&apos;t an admin account. Sign in with an admin account to open the dashboard.
        </p>
      )}
      <AuthForm mode="login" next={next} />
    </AuthShell>
  );
}
