"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SingleImageInput } from "@/components/admin/image-uploader";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { EmptyState, Field, Table, slugify, tdClass, thClass } from "@/components/admin/ui";
import { ApiError, api } from "@/lib/fetcher";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  showInNav: boolean;
  products: number;
};
type Form = { name: string; slug: string; description: string; imageUrl: string; isActive: boolean; showInNav: boolean };
const blank: Form = { name: "", slug: "", description: "", imageUrl: "", isActive: true, showInNav: true };

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id?: string; form: Form } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const call = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      router.refresh();
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(e.fields);
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const move = (i: number, d: -1 | 1) => {
    const ids = categories.map((c) => c.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    call(() => api("/api/admin/categories/reorder", { body: { ids } }), "Order saved");
  };
  const toggle = (c: Category, key: "isActive" | "showInNav", value: boolean) =>
    call(() => api(`/api/admin/categories/${c.id}`, { method: "PATCH", body: { [key]: value } }), "Category updated");

  const save = async () => {
    if (!editing) return;
    setErrors({});
    const { id, form } = editing;
    const ok = await call(
      () => api(id ? `/api/admin/categories/${id}` : "/api/admin/categories", { method: id ? "PATCH" : "POST", body: form }),
      id ? "Category saved" : "Category created",
    );
    if (ok) setEditing(null);
  };
  const set = (patch: Partial<Form>) => editing && setEditing({ ...editing, form: { ...editing.form, ...patch } });

  return (
    <>
      <div className="flex justify-end border-b border-line p-4">
        <Button onClick={() => { setErrors({}); setEditing({ form: blank }); }}>
          <Plus /> New category
        </Button>
      </div>
      {categories.length === 0 ? (
        <EmptyState message="No categories yet. Create Men, Women, Kids or your own." />
      ) : (
        <Table>
          <thead>
            <tr>
              <th className={thClass}>Order</th>
              <th className={thClass}>Category</th>
              <th className={thClass}>Products</th>
              <th className={thClass}>Active</th>
              <th className={thClass}>In navigation</th>
              <th className={thClass}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c, i) => (
              <tr key={c.id}>
                <td className={tdClass}>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label={`Move ${c.name} up`} disabled={i === 0 || busy} onClick={() => move(i, -1)}>
                      <ArrowUp />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Move ${c.name} down`} disabled={i === categories.length - 1 || busy} onClick={() => move(i, 1)}>
                      <ArrowDown />
                    </Button>
                  </div>
                </td>
                <td className={tdClass}>
                  <span className="block font-medium">{c.name}</span>
                  <span className="block text-xs text-stone">/category/{c.slug}</span>
                </td>
                <td className={`${tdClass} tabular`}>{c.products}</td>
                <td className={tdClass}>
                  <Switch aria-label={`${c.name} active`} checked={c.isActive} disabled={busy} onCheckedChange={(v) => toggle(c, "isActive", v)} />
                </td>
                <td className={tdClass}>
                  <Switch aria-label={`Show ${c.name} in navigation`} checked={c.showInNav} disabled={busy} onCheckedChange={(v) => toggle(c, "showInNav", v)} />
                </td>
                <td className={`${tdClass} text-right`}>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setErrors({});
                        setEditing({
                          id: c.id,
                          form: { name: c.name, slug: c.slug, description: c.description ?? "", imageUrl: c.imageUrl ?? "", isActive: c.isActive, showInNav: c.showInNav },
                        });
                      }}
                    >
                      <Pencil /> Edit
                    </Button>
                    {c.products === 0 && (
                      <ConfirmButton
                        label="Delete"
                        title={`Delete ${c.name}?`}
                        description="This category has no products. This can't be undone."
                        confirmLabel="Delete"
                        url={`/api/admin/categories/${c.id}`}
                        method="DELETE"
                        success="Category deleted"
                        variant="destructive"
                        destructive
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <Field label="Name" htmlFor="cat-name" error={errors.name}>
                <Input
                  id="cat-name"
                  value={editing.form.name}
                  onChange={(e) => set({ name: e.target.value, ...(editing.id ? {} : { slug: slugify(e.target.value) }) })}
                />
              </Field>
              <Field label="URL slug" htmlFor="cat-slug" error={errors.slug}>
                <Input id="cat-slug" value={editing.form.slug} onChange={(e) => set({ slug: e.target.value })} />
              </Field>
              <Field label="Description" htmlFor="cat-desc" error={errors.description}>
                <Textarea id="cat-desc" rows={3} value={editing.form.description} onChange={(e) => set({ description: e.target.value })} />
              </Field>
              <Field label="Image" htmlFor="cat-img" error={errors.imageUrl}>
                <SingleImageInput id="cat-img" value={editing.form.imageUrl} onChange={(imageUrl) => set({ imageUrl })} />
              </Field>
              <label className="flex items-center justify-between text-sm">
                Active (visible in the store)
                <Switch checked={editing.form.isActive} onCheckedChange={(isActive) => set({ isActive })} />
              </label>
              <label className="flex items-center justify-between text-sm">
                Show in navigation
                <Switch checked={editing.form.showInNav} onCheckedChange={(showInNav) => set({ showInNav })} />
              </label>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit" disabled={busy}>{editing.id ? "Save changes" : "Create category"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
