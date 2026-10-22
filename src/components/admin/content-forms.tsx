"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SingleImageInput } from "@/components/admin/image-uploader";
import { Field, Panel } from "@/components/admin/ui";
import { useAction } from "@/components/admin/use-action";
import { api } from "@/lib/fetcher";

export function PageForm({ slug, title, content }: { slug: string; title: string; content: string }) {
  const { run, busy, errors } = useAction();
  const [form, setForm] = useState({ title, content });
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => api(`/api/admin/pages/${slug}`, { method: "PATCH", body: form }), "Page saved");
      }}
    >
      <Field label="Title" htmlFor="pg-title" error={errors.title}>
        <Input id="pg-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </Field>
      <Field label="Content" htmlFor="pg-content" error={errors.content} hint='Separate paragraphs with a blank line. Start a line with "## " for a heading.'>
        <Textarea id="pg-content" rows={20} className="font-[inherit] leading-relaxed" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
      </Field>
      <div>
        <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Save page</Button>
      </div>
    </form>
  );
}

type Settings = {
  storeName: string; tagline: string | null; logoUrl: string | null; email: string | null; phone: string | null; address: string | null;
  currency: string; shippingFee: number; freeShippingThreshold: number | null; codEnabled: boolean; codMaxTotal: number | null; announcement: string | null;
};

const r = (p: number | null) => (p == null ? "" : String(p / 100));
const p = (v: string) => (v.trim() === "" ? null : Math.round(Number(v) * 100));

export function SettingsForm({ initial }: { initial: Settings }) {
  const { run, busy, errors } = useAction();
  const [f, setF] = useState({
    storeName: initial.storeName, tagline: initial.tagline ?? "", logoUrl: initial.logoUrl ?? "", email: initial.email ?? "",
    phone: initial.phone ?? "", address: initial.address ?? "", currency: initial.currency, shippingFee: r(initial.shippingFee),
    freeShippingThreshold: r(initial.freeShippingThreshold), codEnabled: initial.codEnabled, codMaxTotal: r(initial.codMaxTotal),
    announcement: initial.announcement ?? "",
  });
  const set = (patch: Partial<typeof f>) => setF({ ...f, ...patch });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(
      () =>
        api("/api/admin/settings", {
          method: "PATCH",
          body: { ...f, shippingFee: p(f.shippingFee) ?? 0, freeShippingThreshold: p(f.freeShippingThreshold), codMaxTotal: p(f.codMaxTotal) },
        }),
      "Settings saved",
    );
  };

  return (
    <form onSubmit={submit} className="flex max-w-3xl flex-col gap-6">
      <Panel title="Store">
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Store name" htmlFor="s-name" error={errors.storeName}>
            <Input id="s-name" value={f.storeName} onChange={(e) => set({ storeName: e.target.value })} />
          </Field>
          <Field label="Tagline" htmlFor="s-tag" error={errors.tagline} hint="Used in search results">
            <Input id="s-tag" value={f.tagline} onChange={(e) => set({ tagline: e.target.value })} />
          </Field>
          <Field label="Logo" htmlFor="s-logo" error={errors.logoUrl} className="sm:col-span-2" hint="Shown in the header instead of the store name">
            <SingleImageInput id="s-logo" value={f.logoUrl} onChange={(logoUrl) => set({ logoUrl })} />
          </Field>
          <Field label="Announcement bar" htmlFor="s-ann" error={errors.announcement} className="sm:col-span-2" hint="Leave empty to hide">
            <Input id="s-ann" value={f.announcement} onChange={(e) => set({ announcement: e.target.value })} />
          </Field>
        </div>
      </Panel>
      <Panel title="Contact">
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Email" htmlFor="s-email" error={errors.email}>
            <Input id="s-email" type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field label="Phone" htmlFor="s-phone" error={errors.phone}>
            <Input id="s-phone" value={f.phone} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
          <Field label="Address" htmlFor="s-addr" error={errors.address} className="sm:col-span-2">
            <Textarea id="s-addr" rows={2} value={f.address} onChange={(e) => set({ address: e.target.value })} />
          </Field>
        </div>
      </Panel>
      <Panel title="Shipping and payment">
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Currency" htmlFor="s-cur" hint="Razorpay settles in INR">
            <Input id="s-cur" value={f.currency} disabled />
          </Field>
          <div />
          <Field label="Shipping fee (₹)" htmlFor="s-ship" error={errors.shippingFee}>
            <Input id="s-ship" type="number" min="0" step="0.01" value={f.shippingFee} onChange={(e) => set({ shippingFee: e.target.value })} />
          </Field>
          <Field label="Free shipping from (₹)" htmlFor="s-free" error={errors.freeShippingThreshold} hint="Empty means always charge shipping">
            <Input id="s-free" type="number" min="0" step="0.01" value={f.freeShippingThreshold} onChange={(e) => set({ freeShippingThreshold: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Switch checked={f.codEnabled} onCheckedChange={(codEnabled) => set({ codEnabled })} /> Offer cash on delivery
          </label>
          <Field label="Cash on delivery up to (₹)" htmlFor="s-codmax" error={errors.codMaxTotal} hint="Empty for no limit">
            <Input id="s-codmax" type="number" min="0" step="0.01" disabled={!f.codEnabled} value={f.codMaxTotal} onChange={(e) => set({ codMaxTotal: e.target.value })} />
          </Field>
        </div>
      </Panel>
      <div>
        <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Save settings</Button>
      </div>
    </form>
  );
}
