import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { AddressBook } from "@/components/store/account-forms";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const user = await requireUserPage("/account/addresses");
  const addresses = await db.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select: { id: true, fullName: true, phone: true, line1: true, line2: true, city: true, state: true, postalCode: true, country: true, isDefault: true },
  });
  return <AddressBook addresses={addresses} />;
}
