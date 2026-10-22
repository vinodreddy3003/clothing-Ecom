"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { EmptyState, Field, Table, selectClass, tdClass, thClass } from "@/components/admin/ui";
import { useAction } from "@/components/admin/use-action";
import { api } from "@/lib/fetcher";
import { formatMoney } from "@/lib/money";

type Coupon = {
  id: string; code: string; description: string | null; type: "PERCENT" | "FIXED"; value: number; minSubtotal: number;
  maxDiscount: number | null; usageLimit: number | null; usedCount: number; startsAt: string | null; endsAt: string | null; isActive: boolean;
};
// UI uses rupees and yyyy-mm-dd strings.
type Form = { code: string; description: string; type: "PERCENT" | "FIXED"; value: string; minSubtotal: string; maxDiscount: string; usageLimit: string; startsAt: string; endsAt: string; isActive: boolean };

const paise = (r: string) => (r.trim() === "" ? null : Math.round(Number(r) * 100));
const rupees = (p: number | null) => (p == null ? "" : String(p / 100));

function toBody(f: Form) {
  return {
    code: f.code,
    description: f.description,
    type: f.type,
    value: f.type === "FIXED" ? paise(f.value) : Number(f.value),
    minSubtotal: paise(f.minSubtotal) ?? 0,
    maxDiscount: f.type === "PERCENT" ? paise(f.maxDiscount) : null,
    usageLimit: f.usageLimit.trim() === "" ? null : Number(f.usageLimit),
    startsAt: f.startsAt ? new Date(`${f.startsAt}T00:00:00`).toISOString() : null,
    endsAt: f.endsAt ? new Date(`${f.endsAt}T23:59:59`).toISOString() : null,
    isActive: f.isActive,
  };
}

const describe = (c: Coupon) =>
  c.type === "PERCENT" ? `${c.value}% off${c.maxDiscount ? ` (max ${formatMoney(c.maxDiscount)})` : ""}` : `${formatMoney(c.value)} off`;

export function CouponManager({ coupons }: { coupons: Coupon[] }) {
  const { run, busy, errors, setErrors } = useAction();
  const [editing, setEditing] = useState<{ id?: string; form: Form } | null>(null);
  const set = (p: Partial<Form>) => editing && setEditing({ ...editing, form: { ...editing.form, ...p } });
  const now = new Date();

  const save = async () => {
    if (!editing) return;
    const ok = await run(
      () => api(editing.id ? `/api/admin/coupons/${editing.id}` : "/api/admin/coupons", { method: editing.id ? "PATCH" : "POST", body: toBody(editing.form) }),
      editing.id ? "Coupon saved" : "Coupon created",
    );
    if (ok) setEditing(null);
  };
  const open = (c?: Coupon) => {
    setErrors({});
    setEditing(
      c
        ? {
            id: c.id,
            form: {
              code: c.code, description: c.description ?? "", type: c.type,
              value: c.type === "FIXED" ? rupees(c.value) : String(c.value),
              minSubtotal: c.minSubtotal ? rupees(c.minSubtotal) : "", maxDiscount: rupees(c.maxDiscount),
              usageLimit: c.usageLimit == null ? "" : String(c.usageLimit),
              startsAt: c.startsAt?.slice(0, 10) ?? "", endsAt: c.endsAt?.slice(0, 10) ?? "", isActive: c.isActive,
            },
          }
        : { form: { code: "", description: "", type: "PERCENT", value: "10", minSubtotal: "", maxDiscount: "", usageLimit: "", startsAt: "", endsAt: "", isActive: true } },
    );
  };

  return (
    <>
      <div className="flex justify-end border-b border-line p-4">
        <Button onClick={() => open()}><Plus /> New coupon</Button>
      </div>
      {coupons.length === 0 ? (
        <EmptyState message="No coupons yet. Create a code customers can enter in their bag." />
      ) : (
        <Table>
          <thead>
            <tr>
              <th className={thClass}>Code</th>
              <th className={thClass}>Discount</th>
              <th className={thClass}>Minimum</th>
              <th className={thClass}>Used</th>
              <th className={thClass}>Valid</th>
              <th className={thClass}>Active</th>
              <th className={thClass}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => {
              const expired = c.endsAt && new Date(c.endsAt) < now;
              return (
                <tr key={c.id}>
                  <td className={tdClass}>
                    <span className="font-semibold">{c.code}</span>
                    {c.description && <span className="block text-xs text-stone">{c.description}</span>}
                  </td>
                  <td className={tdClass}>{describe(c)}</td>
                  <td className={`${tdClass} tabular`}>{c.minSubtotal ? formatMoney(c.minSubtotal) : "—"}</td>
                  <td className={`${tdClass} tabular`}>{c.usedCount}{c.usageLimit != null ? ` / ${c.usageLimit}` : ""}</td>
                  <td className={`${tdClass} whitespace-nowrap text-xs ${expired ? "text-danger" : "text-stone"}`}>
                    {c.startsAt ? new Date(c.startsAt).toLocaleDateString("en-IN") : "Now"} – {c.endsAt ? new Date(c.endsAt).toLocaleDateString("en-IN") : "No end"}
                    {expired && " (expired)"}
                  </td>
                  <td className={tdClass}>
                    <Switch aria-label={`${c.code} active`} checked={c.isActive} disabled={busy} onCheckedChange={(v) => run(() => api(`/api/admin/coupons/${c.id}`, { method: "PATCH", body: { isActive: v } }), v ? "Coupon on" : "Coupon off")} />
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => open(c)}><Pencil /> Edit</Button>
                      <ConfirmButton label="Delete" title={`Delete ${c.code}?`} description="Customers can no longer use it. Past orders keep their discount." confirmLabel="Delete" url={`/api/admin/coupons/${c.id}`} method="DELETE" success="Coupon deleted" variant="destructive" destructive />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit coupon" : "New coupon"}</DialogTitle></DialogHeader>
          {editing && (
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <Field label="Code" htmlFor="cp-code" error={errors.code}>
                <Input id="cp-code" value={editing.form.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="WELCOME10" />
              </Field>
              <Field label="Type" htmlFor="cp-type">
                <select id="cp-type" className={selectClass} value={editing.form.type} onChange={(e) => set({ type: e.target.value as Form["type"] })}>
                  <option value="PERCENT">Percentage off</option>
                  <option value="FIXED">Fixed amount off</option>
                </select>
              </Field>
              <Field label="Description (shown to customers)" htmlFor="cp-desc" error={errors.description} className="sm:col-span-2">
                <Input id="cp-desc" value={editing.form.description} onChange={(e) => set({ description: e.target.value })} />
              </Field>
              <Field label={editing.form.type === "PERCENT" ? "Percent off" : "Amount off (₹)"} htmlFor="cp-val" error={errors.value}>
                <Input id="cp-val" type="number" min="1" step={editing.form.type === "PERCENT" ? "1" : "0.01"} value={editing.form.value} onChange={(e) => set({ value: e.target.value })} />
              </Field>
              {editing.form.type === "PERCENT" ? (
                <Field label="Maximum discount (₹)" htmlFor="cp-max" error={errors.maxDiscount} hint="Optional cap">
                  <Input id="cp-max" type="number" min="0" step="0.01" value={editing.form.maxDiscount} onChange={(e) => set({ maxDiscount: e.target.value })} />
                </Field>
              ) : <div />}
              <Field label="Minimum bag value (₹)" htmlFor="cp-min" error={errors.minSubtotal}>
                <Input id="cp-min" type="number" min="0" step="0.01" value={editing.form.minSubtotal} onChange={(e) => set({ minSubtotal: e.target.value })} />
              </Field>
              <Field label="Total uses allowed" htmlFor="cp-limit" error={errors.usageLimit} hint="Empty for unlimited">
                <Input id="cp-limit" type="number" min="1" step="1" value={editing.form.usageLimit} onChange={(e) => set({ usageLimit: e.target.value })} />
              </Field>
              <Field label="Starts" htmlFor="cp-start" error={errors.startsAt}>
                <Input id="cp-start" type="date" value={editing.form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
              </Field>
              <Field label="Ends" htmlFor="cp-end" error={errors.endsAt}>
                <Input id="cp-end" type="date" value={editing.form.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
              </Field>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <Switch checked={editing.form.isActive} onCheckedChange={(isActive) => set({ isActive })} /> Active
              </label>
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit" disabled={busy}>{editing.id ? "Save changes" : "Create coupon"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
