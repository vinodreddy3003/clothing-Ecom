"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Field } from "@/components/admin/ui";
import { ApiError, api } from "@/lib/fetcher";

/** Dialog with a small form; submits fields to an API and refreshes. */
function FormDialog({
  trigger, title, description, fields, submitLabel, url, method = "POST", extra, variant = "outline", destructive,
}: {
  trigger: string;
  title: string;
  description: string;
  fields: { name: string; label: string; required?: boolean; multiline?: boolean; hint?: string; placeholder?: string }[];
  submitLabel: string;
  url: string;
  method?: string;
  extra?: Record<string, unknown>;
  variant?: "outline" | "default" | "destructive";
  destructive?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const body = { ...extra, ...Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim())) };
      await api(url, { method, body });
      toast.success(`${submitLabel}: done`);
      setOpen(false);
      setValues({});
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant}>{trigger}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {fields.map((f) => (
            <Field key={f.name} label={f.label} htmlFor={`f-${f.name}`} error={errors[f.name]} hint={f.hint}>
              {f.multiline ? (
                <Textarea id={`f-${f.name}`} rows={3} required={f.required} value={values[f.name] ?? ""} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} placeholder={f.placeholder} />
              ) : (
                <Input id={`f-${f.name}`} required={f.required} value={values[f.name] ?? ""} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} placeholder={f.placeholder} />
              )}
            </Field>
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <Button type="submit" disabled={busy} className={destructive ? "bg-danger text-paper hover:bg-danger/90" : undefined}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const label: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirm order",
  PROCESSING: "Start processing",
  SHIPPED: "Mark shipped",
  DELIVERED: "Mark delivered",
  CANCELLED: "Cancel order",
};

export function OrderActions({
  orderId, status, next, paymentMethod, paymentStatus, hasRequest, canRazorpayRefund,
}: {
  orderId: string;
  status: OrderStatus;
  next: OrderStatus[]; // valid transitions, computed on the server from ORDER_TRANSITIONS
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  hasRequest: boolean;
  canRazorpayRefund: boolean;
}) {
  const statusUrl = `/api/admin/orders/${orderId}/status`;
  const awaitingPayment = paymentMethod === "RAZORPAY" && paymentStatus !== "PAID";
  const simple = next.filter((s) => s === "CONFIRMED" || s === "PROCESSING" || s === "DELIVERED").filter((s) => !(s === "CONFIRMED" && awaitingPayment));

  const nothing =
    simple.length === 0 && !next.includes("SHIPPED") && !next.includes("CANCELLED") && paymentStatus !== "PAID" && paymentStatus !== "REFUND_PENDING" && !hasRequest;

  return (
    <div className="flex flex-col gap-3">
      {awaitingPayment && status === "PENDING" && (
        <p className="text-sm text-stone">Waiting for online payment. The order confirms itself when payment is received, or cancels after 30 minutes.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {simple.map((s) => (
          <ConfirmButton
            key={s}
            label={label[s]}
            title={`${label[s]}?`}
            description={
              s === "DELIVERED" && paymentMethod === "COD" && paymentStatus === "PENDING"
                ? "This also records the cash payment as collected."
                : `The order moves to ${s.toLowerCase()} and the customer sees the new status.`
            }
            confirmLabel={label[s]}
            url={statusUrl}
            method="PATCH"
            body={{ status: s }}
            success={`Order ${s.toLowerCase()}`}
            variant="default"
            size="default"
          />
        ))}
        {next.includes("SHIPPED") && (
          <FormDialog
            trigger="Mark shipped"
            title="Ship order"
            description="The customer sees the carrier and tracking number on their order page."
            fields={[
              { name: "carrier", label: "Carrier", required: true, placeholder: "Delhivery, Blue Dart…" },
              { name: "trackingNumber", label: "Tracking number", required: true },
              { name: "trackingUrl", label: "Tracking link (optional)", placeholder: "https://…" },
            ]}
            submitLabel="Mark shipped"
            url={statusUrl}
            method="PATCH"
            extra={{ status: "SHIPPED" }}
            variant="default"
          />
        )}
        {next.includes("CANCELLED") && (
          <FormDialog
            trigger="Cancel order"
            title="Cancel this order?"
            description={`Stock goes back to inventory.${paymentStatus === "PAID" ? " The payment moves to refund pending." : ""} This can't be undone.`}
            fields={[{ name: "note", label: "Reason", required: true, multiline: true }]}
            submitLabel="Cancel order"
            url={statusUrl}
            method="PATCH"
            extra={{ status: "CANCELLED" }}
            destructive
          />
        )}
        {paymentStatus === "PAID" && (status === "CANCELLED" || status === "DELIVERED" || hasRequest) && (
          <FormDialog
            trigger="Start refund"
            title="Start a refund?"
            description="Use this for an approved return. The payment moves to refund pending; complete it once the money is sent."
            fields={[{ name: "note", label: "Note (optional)", multiline: true }]}
            submitLabel="Start refund"
            url={`/api/admin/orders/${orderId}/refund`}
            extra={{ action: "start" }}
          />
        )}
        {paymentStatus === "REFUND_PENDING" && (
          <FormDialog
            trigger="Complete refund"
            title="Complete refund"
            description={
              canRazorpayRefund
                ? "Leave the reference empty to refund the full amount through Razorpay now, or enter a reference if you refunded another way."
                : "Enter the bank or UPI transaction reference for the refund you sent."
            }
            fields={[{ name: "reference", label: "Refund reference", required: !canRazorpayRefund }]}
            submitLabel="Complete refund"
            url={`/api/admin/orders/${orderId}/refund`}
            extra={{ action: "complete" }}
            variant="default"
          />
        )}
        {hasRequest && (
          <FormDialog
            trigger="Decline request"
            title="Decline the customer's request?"
            description="The request is closed and the order continues as it is."
            fields={[{ name: "note", label: "Note (optional)", multiline: true }]}
            submitLabel="Decline request"
            url={`/api/admin/orders/${orderId}/dismiss-request`}
          />
        )}
      </div>
      {nothing && <p className="text-sm text-stone">No further actions for this order.</p>}
    </div>
  );
}
