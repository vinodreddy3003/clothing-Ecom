import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { isRazorpayConfigured } from "@/lib/razorpay";
import { CheckoutForm } from "@/components/store/checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await requireUserPage("/checkout");
  const addresses = await db.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select: { id: true, fullName: true, phone: true, line1: true, line2: true, city: true, state: true, postalCode: true, country: true, isDefault: true },
  });
  return (
    <CheckoutForm
      email={user.email}
      name={user.name}
      phone={user.phone}
      addresses={addresses}
      razorpayEnabled={isRazorpayConfigured()}
    />
  );
}
