"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { SingleImageInput } from "@/components/admin/image-uploader";
import { EmptyState, Field, slugify } from "@/components/admin/ui";
import { useAction } from "@/components/admin/use-action";
import { api } from "@/lib/fetcher";

// ---------------------------------------------------------------- banners

type Banner = { id: string; title: string; subtitle: string | null; ctaLabel: string | null; ctaHref: string | null; imageUrl: string; isActive: boolean };
type BannerForm = { title: string; subtitle: string; ctaLabel: string; ctaHref: string; imageUrl: string; isActive: boolean };

export function BannerManager({ banners }: { banners: Banner[] }) {
  const { run, busy, errors, setErrors } = useAction();
  const [editing, setEditing] = useState<{ id?: string; form: BannerForm } | null>(null);
  const set = (p: Partial<BannerForm>) => editing && setEditing({ ...editing, form: { ...editing.form, ...p } });

  const move = (i: number, d: -1 | 1) => {
    const ids = banners.map((b) => b.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    run(() => api("/api/admin/banners/reorder", { body: { ids } }), "Order saved");
  };
  const save = async () => {
    if (!editing) return;
    const ok = await run(
      () => api(editing.id ? `/api/admin/banners/${editing.id}` : "/api/admin/banners", { method: editing.id ? "PATCH" : "POST", body: editing.form }),
      editing.id ? "Banner saved" : "Banner added",
    );
    if (ok) setEditing(null);
  };

  return (
    <>
      <div className="flex justify-end border-b border-line p-4">
        <Button
          onClick={() => {
            setErrors({});
            setEditing({ form: { title: "", subtitle: "", ctaLabel: "Shop now", ctaHref: "/shop", imageUrl: "", isActive: true } });
          }}
        >
          <Plus /> New banner
        </Button>
      </div>
      {banners.length === 0 ? (
        <EmptyState message="No banners. The homepage hero is hidden until you add one." />
      ) : (
        <ul className="divide-y divide-line">
          {banners.map((b, i) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="flex flex-col">
                <Button variant="ghost" size="icon-sm" aria-label={`Move ${b.title} up`} disabled={i === 0 || busy} onClick={() => move(i, -1)}><ArrowUp /></Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Move ${b.title} down`} disabled={i === banners.length - 1 || busy} onClick={() => move(i, 1)}><ArrowDown /></Button>
              </div>
              <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-tile">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                <img src={b.imageUrl} alt="" className="size-full object-cover" />
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">{b.title}</p>
                <p className="truncate text-stone">{b.subtitle}</p>
                {b.ctaHref && <p className="text-xs text-stone">{b.ctaLabel} → {b.ctaHref}</p>}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={b.isActive} disabled={busy} onCheckedChange={(v) => run(() => api(`/api/admin/banners/${b.id}`, { method: "PATCH", body: { isActive: v } }), v ? "Banner shown" : "Banner hidden")} />
                Active
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setErrors({});
                  setEditing({ id: b.id, form: { title: b.title, subtitle: b.subtitle ?? "", ctaLabel: b.ctaLabel ?? "", ctaHref: b.ctaHref ?? "", imageUrl: b.imageUrl, isActive: b.isActive } });
                }}
              >
                <Pencil /> Edit
              </Button>
              <ConfirmButton label="Delete" title="Delete this banner?" description="It's removed from the homepage. This can't be undone." confirmLabel="Delete" url={`/api/admin/banners/${b.id}`} method="DELETE" success="Banner deleted" variant="destructive" destructive />
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit banner" : "New banner"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <Field label="Headline" htmlFor="b-title" error={errors.title}>
                <Input id="b-title" value={editing.form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Super sale discount up to 50%" />
              </Field>
              <Field label="Supporting text" htmlFor="b-sub" error={errors.subtitle}>
                <Input id="b-sub" value={editing.form.subtitle} onChange={(e) => set({ subtitle: e.target.value })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Button label" htmlFor="b-cta" error={errors.ctaLabel}>
                  <Input id="b-cta" value={editing.form.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} />
                </Field>
                <Field label="Button link" htmlFor="b-href" error={errors.ctaHref} hint="/shop?sort=discount, /category/women…">
                  <Input id="b-href" value={editing.form.ctaHref} onChange={(e) => set({ ctaHref: e.target.value })} />
                </Field>
              </div>
              <Field label="Image" htmlFor="b-img" error={errors.imageUrl}>
                <SingleImageInput id="b-img" value={editing.form.imageUrl} onChange={(imageUrl) => set({ imageUrl })} />
              </Field>
              <label className="flex items-center justify-between text-sm">
                Show on homepage
                <Switch checked={editing.form.isActive} onCheckedChange={(isActive) => set({ isActive })} />
              </label>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit" disabled={busy}>{editing.id ? "Save changes" : "Add banner"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------- collections

type Collection = {
  id: string; name: string; slug: string; description: string | null; imageUrl: string | null;
  showOnHome: boolean; isActive: boolean; productIds: string[];
};
type CollectionForm = Omit<Collection, "id" | "description" | "imageUrl"> & { description: string; imageUrl: string };
type ProductOption = { id: string; name: string; status: string };

export function CollectionManager({ collections, products }: { collections: Collection[]; products: ProductOption[] }) {
  const { run, busy, errors, setErrors } = useAction();
  const [editing, setEditing] = useState<{ id?: string; form: CollectionForm } | null>(null);
  const [search, setSearch] = useState("");
  const set = (p: Partial<CollectionForm>) => editing && setEditing({ ...editing, form: { ...editing.form, ...p } });
  const names = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);
  const visible = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    if (!editing) return;
    const ok = await run(
      () => api(editing.id ? `/api/admin/collections/${editing.id}` : "/api/admin/collections", { method: editing.id ? "PATCH" : "POST", body: editing.form }),
      editing.id ? "Collection saved" : "Collection created",
    );
    if (ok) setEditing(null);
  };
  const toggleProduct = (id: string) =>
    editing && set({ productIds: editing.form.productIds.includes(id) ? editing.form.productIds.filter((x) => x !== id) : [...editing.form.productIds, id] });

  return (
    <>
      <div className="flex justify-end border-b border-line p-4">
        <Button
          onClick={() => {
            setErrors({});
            setSearch("");
            setEditing({ form: { name: "", slug: "", description: "", imageUrl: "", showOnHome: true, isActive: true, productIds: [] } });
          }}
        >
          <Plus /> New collection
        </Button>
      </div>
      {collections.length === 0 ? (
        <EmptyState message="No collections. Group products into a promotional section like “Summer dresses”." />
      ) : (
        <ul className="divide-y divide-line">
          {collections.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.name}</p>
                <p className="text-stone">
                  {c.productIds.length} product{c.productIds.length === 1 ? "" : "s"} · /collections/{c.slug}
                </p>
              </div>
              <label className="flex items-center gap-2">
                <Switch checked={c.showOnHome} disabled={busy} onCheckedChange={(v) => run(() => api(`/api/admin/collections/${c.id}`, { method: "PATCH", body: { showOnHome: v } }), "Collection updated")} />
                On homepage
              </label>
              <label className="flex items-center gap-2">
                <Switch checked={c.isActive} disabled={busy} onCheckedChange={(v) => run(() => api(`/api/admin/collections/${c.id}`, { method: "PATCH", body: { isActive: v } }), "Collection updated")} />
                Active
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setErrors({});
                  setSearch("");
                  setEditing({ id: c.id, form: { name: c.name, slug: c.slug, description: c.description ?? "", imageUrl: c.imageUrl ?? "", showOnHome: c.showOnHome, isActive: c.isActive, productIds: c.productIds } });
                }}
              >
                <Pencil /> Edit
              </Button>
              <ConfirmButton label="Delete" title={`Delete ${c.name}?`} description="Products stay in the catalog; only the grouping is removed." confirmLabel="Delete" url={`/api/admin/collections/${c.id}`} method="DELETE" success="Collection deleted" variant="destructive" destructive />
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit collection" : "New collection"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" htmlFor="c-name" error={errors.name}>
                  <Input id="c-name" value={editing.form.name} onChange={(e) => set({ name: e.target.value, ...(editing.id ? {} : { slug: slugify(e.target.value) }) })} />
                </Field>
                <Field label="URL slug" htmlFor="c-slug" error={errors.slug}>
                  <Input id="c-slug" value={editing.form.slug} onChange={(e) => set({ slug: e.target.value })} />
                </Field>
              </div>
              <Field label="Description" htmlFor="c-desc" error={errors.description}>
                <Textarea id="c-desc" rows={2} value={editing.form.description} onChange={(e) => set({ description: e.target.value })} />
              </Field>
              <Field label="Image" htmlFor="c-img" error={errors.imageUrl}>
                <SingleImageInput id="c-img" value={editing.form.imageUrl} onChange={(imageUrl) => set({ imageUrl })} />
              </Field>
              <div className="flex flex-wrap gap-6 text-sm">
                <label className="flex items-center gap-2"><Switch checked={editing.form.showOnHome} onCheckedChange={(showOnHome) => set({ showOnHome })} /> Show on homepage</label>
                <label className="flex items-center gap-2"><Switch checked={editing.form.isActive} onCheckedChange={(isActive) => set({ isActive })} /> Active</label>
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">Products ({editing.form.productIds.length} selected, shown in this order)</legend>
                {editing.form.productIds.length > 0 && (
                  <p className="text-xs text-stone">{editing.form.productIds.map((id) => names.get(id)).filter(Boolean).join(", ")}</p>
                )}
                <Input aria-label="Search products" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} />
                <ul className="max-h-60 overflow-y-auto rounded-lg border border-line">
                  {visible.map((p) => (
                    <li key={p.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-tile">
                        <input type="checkbox" className="size-4 accent-black" checked={editing.form.productIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                        <span className="flex-1">{p.name}</span>
                        {p.status !== "PUBLISHED" && <span className="text-xs text-stone">{p.status.toLowerCase()}</span>}
                      </label>
                    </li>
                  ))}
                  {visible.length === 0 && <li className="px-3 py-4 text-center text-sm text-stone">No products match.</li>}
                </ul>
                {errors.productIds && <p className="text-xs text-danger">{errors.productIds}</p>}
              </fieldset>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit" disabled={busy}>{editing.id ? "Save changes" : "Create collection"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
