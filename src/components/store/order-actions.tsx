"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/fetcher";
import { payForOrder } from "@/components/store/razorpay-client";

export function PayNowButton({ orderId, label }: { orderId: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="lime"
      size="pill"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const result = await payForOrder(orderId);
          if (result === "paid") toast.success("Payment received. Your order is confirmed.");
          router.refresh();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Payment couldn't be started.");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy && <Loader2 className="size-4 animate-spin" />}
      {label}
    </Button>
  );
}

const copy = {
  cancel: { button: "Cancel order", title: "Cancel this order?", body: "Items go back on sale right away. If you paid online, the amount is refunded to your original payment method.", confirm: "Cancel order", done: "Order cancelled." },
  request: { button: "Request cancellation", title: "Request cancellation", body: "Your order is being packed. We'll try to stop it and let you know.", confirm: "Send request", done: "Cancellation requested." },
  return: { button: "Request a return", title: "Request a return", body: "Tell us what's wrong. We'll arrange a pickup and refund once the item is checked.", confirm: "Send request", done: "Return requested." },
};

export function CancelOrderDialog({ orderId, kind }: { orderId: string; kind: keyof typeof copy }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = copy[kind];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={kind === "cancel" ? "destructive" : "outline"} size="pill">
          {c.button}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await api(`/api/orders/${orderId}/cancel`, { body: { reason } });
              toast.success(c.done);
              setOpen(false);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Couldn't send. Try again.");
            } finally {
              setBusy(false);
            }
          }}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>{c.title}</DialogTitle>
            <DialogDescription>{c.body}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor="cancel-reason" className="text-sm font-semibold">
              Reason
            </label>
            <textarea
              id="cancel-reason"
              required
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-line p-3 text-[15px] outline-none focus-visible:border-ink"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
              Keep order
            </Button>
            <Button type="submit" variant={kind === "cancel" ? "destructive" : "default"} className="rounded-full" disabled={busy || !reason.trim()}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {c.confirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
