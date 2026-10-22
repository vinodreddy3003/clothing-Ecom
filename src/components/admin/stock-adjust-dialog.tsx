"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, selectClass } from "@/components/admin/ui";
import { ApiError, api } from "@/lib/fetcher";

const reasons = [
  ["RESTOCK", "Restock (new stock received)"],
  ["RETURNED", "Customer return"],
  ["DAMAGED", "Damaged or lost"],
  ["MANUAL_CORRECTION", "Count correction"],
] as const;

export function StockAdjustDialog({ variantId, label, stock }: { variantId: string; label: string; stock: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState<(typeof reasons)[number][0]>("RESTOCK");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const n = Number(delta);
  const after = Number.isInteger(n) ? stock + n : stock;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setBusy(true);
    try {
      await api("/api/admin/inventory/adjust", { body: { variantId, delta, reason, note: note || undefined } });
      toast.success(`Stock updated to ${after}`);
      setOpen(false);
      setDelta("");
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? (err.fields?.delta ?? err.message) : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Adjust</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>{label} · currently {stock} in stock</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Change" htmlFor={`d-${variantId}`} error={error} hint="Positive to add, negative to remove (e.g. 10 or -2)">
            <Input id={`d-${variantId}`} type="number" step="1" required value={delta} onChange={(e) => setDelta(e.target.value)} autoFocus />
          </Field>
          <Field label="Reason" htmlFor={`r-${variantId}`}>
            <select id={`r-${variantId}`} className={selectClass} value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
              {reasons.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Note (optional)" htmlFor={`n-${variantId}`}>
            <Input id={`n-${variantId}`} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Supplier invoice, count reference…" />
          </Field>
          <p className="tabular text-sm">
            New stock: <strong className={after < 0 ? "text-danger" : undefined}>{after}</strong>
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy || !delta || n === 0 || after < 0}>Save adjustment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
