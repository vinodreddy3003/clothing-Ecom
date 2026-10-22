"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { addressSchema } from "@/lib/validators";
import { api, ApiError } from "@/lib/fetcher";
import { formatMoney } from "@/lib/money";
import { useCart } from "@/components/store/providers";
import { getSavedCoupon, useQuote } from "@/components/store/use-quote";
import { OrderSummary } from "@/components/store/order-summary";
import { AddressFields } from "@/components/store/address-fields";
import { Field, errorProps, inputClass } from "@/components/store/form-field";
import { EmptyState } from "@/components/store/empty-state";
import { payForOrder } from "@/components/store/razorpay-client";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  address: addressSchema,
  saveAddress: z.boolean(),
  paymentMethod: z.enum(["RAZORPAY", "COD"]),
});

type SavedAddress = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

const emptyAddress = { fullName: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "India", isDefault: false };

export function CheckoutForm({
  email,
  name,
  phone,
  addresses,
  razorpayEnabled,
}: {
  email: string;
  name: string;
  phone: string | null;
  addresses: SavedAddress[];
  razorpayEnabled: boolean;
}) {
  const router = useRouter();
  const cart = useCart();
  const [coupon, setCoupon] = useState("");
  useEffect(() => setCoupon(getSavedCoupon()), []);
  const { quote, loading } = useQuote(coupon);
  // One key per checkout visit: resubmits and network retries can't create a second order.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [selected, setSelected] = useState<string>(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "new");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const toForm = (a?: SavedAddress) =>
    a ? { ...a, line2: a.line2 ?? "", isDefault: false } : { ...emptyAddress, fullName: name, phone: phone ?? "" };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email,
      address: toForm(addresses.find((a) => a.id === selected)),
      saveAddress: addresses.length === 0,
      paymentMethod: razorpayEnabled ? ("RAZORPAY" as const) : ("COD" as const),
    },
  });

  const method = watch("paymentMethod");
  const codAvailable = quote?.codAvailable ?? true;
  useEffect(() => {
    if (quote && !codAvailable && method === "COD" && razorpayEnabled) setValue("paymentMethod", "RAZORPAY");
  }, [quote, codAvailable, method, razorpayEnabled, setValue]);

  function chooseAddress(id: string) {
    setSelected(id);
    reset({ ...getValues(), address: toForm(addresses.find((a) => a.id === id)), saveAddress: id === "new" });
  }

  if (cart.ready && !cart.items.length && !submitting) {
    return (
      <EmptyState icon={ShoppingBag} title="Your bag is empty." body="Add something to your bag to check out." action={{ label: "Continue shopping", href: "/shop" }} />
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSubmitting(true);
    try {
      const { order } = await api<{ order: { id: string; paymentMethod: "RAZORPAY" | "COD" } }>("/api/checkout", {
        body: { ...values, items: cart.items, couponCode: coupon || undefined, idempotencyKey },
      });
      if (order.paymentMethod === "COD") {
        cart.clear();
        router.push(`/orders/${order.id}?placed=1`);
        return;
      }
      // Stock is reserved now; clear the bag so a retry happens from the order page, not a new order.
      cart.clear();
      try {
        const result = await payForOrder(order.id);
        router.push(`/orders/${order.id}${result === "paid" ? "?placed=1" : "?payment=pending"}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Payment couldn't be verified.");
        router.push(`/orders/${order.id}?payment=pending`);
      }
    } catch (e) {
      setSubmitting(false);
      const msg = e instanceof ApiError ? e.message : "Couldn't place the order. Check your connection and try again.";
      setFormError(msg);
      if (e instanceof ApiError && e.status === 401) router.push("/login?next=/checkout");
    }
  });

  const payLabel =
    method === "COD" ? "Place order" : quote ? `Pay ${formatMoney(quote.totals.total, quote.currency)}` : "Pay";

  return (
    <form onSubmit={onSubmit} noValidate className="pt-2 md:pt-8">
      <h1 className="mb-6 text-[26px] leading-8 font-bold tracking-[-0.02em] md:text-[40px] md:leading-[44px]">Checkout</h1>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,640px)_1fr] lg:gap-12">
        <div className="space-y-10">
          <section aria-labelledby="step-contact" className="space-y-4">
            <h2 id="step-contact" className="flex items-center gap-3 text-xl font-bold">
              <span className="grid size-8 place-items-center rounded-full bg-ink text-sm text-paper">1</span>
              Contact
            </h2>
            <Field id="email" label="Email for order updates" error={errors.email?.message}>
              <input {...register("email")} {...errorProps("email", errors.email?.message)} type="email" autoComplete="email" className={inputClass} />
            </Field>
          </section>

          <section aria-labelledby="step-address" className="space-y-4">
            <h2 id="step-address" className="flex items-center gap-3 text-xl font-bold">
              <span className="grid size-8 place-items-center rounded-full bg-ink text-sm text-paper">2</span>
              Delivery address
            </h2>
            {addresses.length > 0 && (
              <div role="radiogroup" aria-label="Saved addresses" className="grid gap-3 sm:grid-cols-2">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-2xl border p-4 text-[15px] has-focus-visible:outline-2 has-focus-visible:outline-ink",
                      selected === a.id ? "border-ink bg-tile" : "border-line",
                    )}
                  >
                    <input type="radio" name="saved-address" checked={selected === a.id} onChange={() => chooseAddress(a.id)} className="mt-1 size-4 accent-ink" />
                    <span>
                      <span className="block font-semibold">{a.fullName}</span>
                      <span className="block text-stone">
                        {a.line1}
                        {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.postalCode}
                      </span>
                      <span className="block text-stone">{a.phone}</span>
                    </span>
                  </label>
                ))}
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-[15px] font-semibold has-focus-visible:outline-2 has-focus-visible:outline-ink",
                    selected === "new" ? "border-ink bg-tile" : "border-line",
                  )}
                >
                  <input type="radio" name="saved-address" checked={selected === "new"} onChange={() => chooseAddress("new")} className="size-4 accent-ink" />
                  Use a new address
                </label>
              </div>
            )}
            {/* Saved addresses still go through the same validation; their fields are just hidden. */}
            <div className={cn(selected !== "new" && "hidden")}>
              <AddressFields register={register} errors={errors.address} prefix="address." />
              <label className="mt-4 flex min-h-11 items-center gap-3 text-[15px]">
                <input type="checkbox" {...register("saveAddress")} className="size-5 accent-ink" />
                Save this address for next time
              </label>
            </div>
            {selected !== "new" && errors.address && (
              <p className="text-sm text-danger">This saved address is incomplete. Choose “Use a new address” to enter it again.</p>
            )}
          </section>

          <section aria-labelledby="step-payment" className="space-y-4">
            <h2 id="step-payment" className="flex items-center gap-3 text-xl font-bold">
              <span className="grid size-8 place-items-center rounded-full bg-ink text-sm text-paper">3</span>
              Payment
            </h2>
            <div role="radiogroup" aria-label="Payment method" className="space-y-3">
              {razorpayEnabled && (
                <PaymentOption value="RAZORPAY" register={register} checked={method === "RAZORPAY"} title="Pay online" body="UPI, cards, net banking and wallets via Razorpay." />
              )}
              <PaymentOption
                value="COD"
                register={register}
                checked={method === "COD"}
                disabled={!codAvailable}
                title="Cash on delivery"
                body={codAvailable ? "Pay in cash or UPI when your order arrives." : "Not available for this order."}
              />
            </div>
            {!razorpayEnabled && <p className="text-sm text-stone">Online payment is not available right now.</p>}
            {errors.paymentMethod && <p className="text-sm text-danger">Choose a payment method.</p>}
          </section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="space-y-5 rounded-3xl bg-tile p-5 md:p-6">
            <h2 className="text-xl font-bold">Order summary</h2>
            {!quote ? (
              <Skeleton className="h-40 bg-paper" />
            ) : (
              <>
                <ul className="space-y-3">
                  {quote.lines.map((l) => (
                    <li key={l.variantId} className="flex gap-3">
                      <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-xl bg-paper">
                        {l.imageUrl && <Image src={l.imageUrl} alt="" fill sizes="56px" className="object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1 text-[15px]">
                        <p className="line-clamp-1 font-semibold">{l.productName}</p>
                        <p className="text-sm text-stone">
                          {l.color}, {l.size}, qty {l.quantity}
                        </p>
                        {l.issue && <p className="text-sm text-danger">{l.issue}</p>}
                      </div>
                      <p className="text-[15px] font-semibold tabular">{formatMoney(l.unitPrice * l.quantity, quote.currency)}</p>
                    </li>
                  ))}
                </ul>
                <OrderSummary totals={quote.totals} currency={quote.currency} couponCode={quote.coupon?.error ? null : quote.coupon?.code} />
                {quote.coupon?.error && <p className="text-sm text-danger">Code {quote.coupon.code}: {quote.coupon.error}</p>}
              </>
            )}
            {formError && (
              <div role="alert" className="rounded-2xl bg-[#fee4e2] p-4 text-[15px] text-danger">
                {formError}{" "}
                <Link href="/cart" className="font-semibold underline">
                  Review your bag
                </Link>
              </div>
            )}
            {quote?.hasIssues && (
              <p className="text-sm text-danger">
                Some items need attention. <Link href="/cart" className="font-semibold underline">Review your bag</Link>
              </p>
            )}
            <Button
              type="submit"
              variant="lime"
              size="pill"
              className="h-14 w-full text-base"
              disabled={submitting || loading || !quote || quote.hasIssues}
            >
              {submitting && <Loader2 className="size-5 animate-spin" />}
              {submitting ? "Placing order" : payLabel}
            </Button>
            <p className="text-center text-xs text-stone">
              By placing this order you agree to our <Link href="/terms" className="underline">terms</Link> and{" "}
              <Link href="/return-policy" className="underline">return policy</Link>.
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}

function PaymentOption({
  value,
  register,
  checked,
  disabled,
  title,
  body,
}: {
  value: "RAZORPAY" | "COD";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  checked: boolean;
  disabled?: boolean;
  title: string;
  body: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 has-focus-visible:outline-2 has-focus-visible:outline-ink",
        checked ? "border-ink bg-tile" : "border-line",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input type="radio" value={value} disabled={disabled} {...register("paymentMethod")} className="mt-1 size-4 accent-ink" />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-stone">{body}</span>
      </span>
    </label>
  );
}
