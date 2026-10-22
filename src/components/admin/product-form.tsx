"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/admin/image-uploader";
import { Field, Panel, selectClass, slugify } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ApiError, api } from "@/lib/fetcher";
import { productSchema, type ProductInput } from "@/lib/validators";

type VariantRow = {
  id?: string;
  size: string;
  color: string;
  colorHex: string;
  sku: string;
  stock: string;
  lowStockThreshold: string;
  isActive: boolean;
};

export type ProductFormValues = {
  name: string;
  slug: string;
  sku: string;
  description: string;
  categoryId: string;
  price: string; // rupees in the UI
  salePrice: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  images: { url: string; alt: string }[];
  variants: VariantRow[];
};

const code = (s: string) => s.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
const toPaise = (rupees: string) => (rupees.trim() === "" ? undefined : Math.round(Number(rupees) * 100));

/** Form values (rupees, strings) → API payload (paise, numbers). Empty variant SKUs are generated. */
function toPayload(v: ProductFormValues) {
  return {
    ...v,
    price: toPaise(v.price),
    salePrice: toPaise(v.salePrice) ?? null,
    variants: v.variants.map((row) => ({
      ...row,
      sku: row.sku.trim() || `${v.sku}-${code(row.color)}-${row.size.replace(/[^A-Za-z0-9]/g, "")}`.toUpperCase(),
      stock: row.stock === "" ? 0 : Number(row.stock),
      lowStockThreshold: row.lowStockThreshold === "" ? 5 : Number(row.lowStockThreshold),
    })),
  };
}

// The shared productSchema validates in paise, so convert first and validate the converted payload.
const resolver: Resolver<ProductFormValues> = (values, ctx, opts) =>
  zodResolver(productSchema)(toPayload(values) as never, ctx, opts as never) as never;

export function ProductForm({
  productId,
  initial,
  categories,
  hasOrders = false,
}: {
  productId?: string;
  initial: ProductFormValues;
  categories: { id: string; name: string }[];
  hasOrders?: boolean;
}) {
  const router = useRouter();
  const [slugTouched, setSlugTouched] = useState(Boolean(productId));
  const {
    register, control, handleSubmit, setValue, watch, setError, getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProductFormValues>({ defaultValues: initial, resolver });
  const variants = useFieldArray({ control, name: "variants", keyName: "key" });
  const [quick, setQuick] = useState({ sizes: "S, M, L, XL", color: "", hex: "#111111" });

  const onSubmit = handleSubmit(async (payload) => {
    const body = payload as unknown as ProductInput;
    try {
      const res = await api<{ id: string }>(productId ? `/api/admin/products/${productId}` : "/api/admin/products", {
        method: productId ? "PATCH" : "POST",
        body,
      });
      toast.success(productId ? "Product saved" : "Product created");
      if (productId) router.refresh();
      else router.push(`/admin/products/${res.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        for (const [k, msg] of Object.entries(e.fields)) setError(k as keyof ProductFormValues, { message: msg });
      }
      toast.error((e as Error).message);
    }
  });

  const quickAdd = () => {
    const sizes = quick.sizes.split(",").map((s) => s.trim()).filter(Boolean);
    if (!quick.color.trim() || !sizes.length) {
      toast.error("Enter a colour and at least one size.");
      return;
    }
    const sku = getValues("sku");
    for (const size of sizes) {
      variants.append({
        size,
        color: quick.color.trim(),
        colorHex: quick.hex,
        sku: sku ? `${sku}-${code(quick.color)}-${size.replace(/[^A-Za-z0-9]/g, "")}`.toUpperCase() : "",
        stock: "0",
        lowStockThreshold: "5",
        isActive: true,
      });
    }
    setQuick((q) => ({ ...q, color: "" }));
  };

  const err = (path: string) => {
    const parts = path.split(".");
    let cur: unknown = errors;
    for (const p of parts) cur = (cur as Record<string, unknown> | undefined)?.[p];
    return (cur as { message?: string } | undefined)?.message;
  };
  const status = watch("status");

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1fr_320px]" noValidate>
      <div className="flex min-w-0 flex-col gap-6">
        <Panel title="Details">
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="name" error={err("name")} className="sm:col-span-2">
              <Input
                id="name"
                aria-invalid={!!errors.name}
                {...register("name", {
                  onChange: (e) => {
                    if (!slugTouched) setValue("slug", slugify(e.target.value));
                  },
                })}
              />
            </Field>
            <Field label="URL slug" htmlFor="slug" error={err("slug")} hint="Used in /product/your-slug">
              <Input id="slug" aria-invalid={!!errors.slug} {...register("slug", { onChange: () => setSlugTouched(true) })} />
            </Field>
            <Field label="Product SKU" htmlFor="sku" error={err("sku")}>
              <Input id="sku" aria-invalid={!!errors.sku} {...register("sku")} />
            </Field>
            <Field label="Category" htmlFor="categoryId" error={err("categoryId")}>
              <select id="categoryId" className={selectClass} {...register("categoryId")}>
                <option value="">Choose a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description" htmlFor="description" error={err("description")} className="sm:col-span-2">
              <Textarea id="description" rows={6} aria-invalid={!!errors.description} {...register("description")} />
            </Field>
          </div>
        </Panel>

        <Panel title="Pricing">
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Field label="Price (₹)" htmlFor="price" error={err("price")} hint="List price (MRP), inclusive of tax">
              <Input id="price" type="number" step="0.01" min="0" inputMode="decimal" {...register("price")} />
            </Field>
            <Field label="Sale price (₹)" htmlFor="salePrice" error={err("salePrice")} hint="Leave empty for no discount">
              <Input id="salePrice" type="number" step="0.01" min="0" inputMode="decimal" {...register("salePrice")} />
            </Field>
          </div>
        </Panel>

        <Panel title="Images">
          <div className="p-4">
            <Controller control={control} name="images" render={({ field }) => <ImageUploader value={field.value} onChange={field.onChange} />} />
            {err("images") && <p className="mt-2 text-xs text-danger">{err("images")}</p>}
          </div>
        </Panel>

        <Panel title="Variants" action={productId ? <Link href="/admin/inventory" className="text-sm underline">Adjust stock</Link> : undefined}>
          <div className="flex flex-col gap-4 p-4">
            <div className="grid gap-2 rounded-lg bg-tile p-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
              <Field label="Sizes (comma separated)" htmlFor="quick-sizes">
                <Input id="quick-sizes" value={quick.sizes} onChange={(e) => setQuick({ ...quick, sizes: e.target.value })} className="bg-paper" />
              </Field>
              <Field label="Colour" htmlFor="quick-color">
                <Input id="quick-color" value={quick.color} onChange={(e) => setQuick({ ...quick, color: e.target.value })} placeholder="Black" className="bg-paper" />
              </Field>
              <Field label="Swatch" htmlFor="quick-hex">
                <input id="quick-hex" type="color" value={quick.hex} onChange={(e) => setQuick({ ...quick, hex: e.target.value })} className="h-9 w-14 rounded-lg border border-line bg-paper" />
              </Field>
              <Button type="button" variant="secondary" className="bg-paper" onClick={quickAdd}>
                <Plus /> Add sizes
              </Button>
            </div>

            {err("variants") && <p className="text-xs text-danger">{err("variants")}</p>}

            {variants.fields.length === 0 ? (
              <p className="py-6 text-center text-sm text-stone">No variants yet. Add sizes for a colour above.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-stone">
                      <th className="py-2 pr-2 font-semibold">Size</th>
                      <th className="py-2 pr-2 font-semibold">Colour</th>
                      <th className="py-2 pr-2 font-semibold">Swatch</th>
                      <th className="py-2 pr-2 font-semibold">SKU</th>
                      <th className="py-2 pr-2 font-semibold">Stock</th>
                      <th className="py-2 pr-2 font-semibold">Low at</th>
                      <th className="py-2 pr-2 font-semibold">Active</th>
                      <th className="py-2"><span className="sr-only">Remove</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.fields.map((f, i) => {
                      const existing = Boolean(f.id);
                      return (
                        <tr key={f.key} className="border-t border-line align-top">
                          <td className="py-2 pr-2">
                            <Input aria-label="Size" className="w-20" aria-invalid={!!err(`variants.${i}.size`)} {...register(`variants.${i}.size`)} />
                          </td>
                          <td className="py-2 pr-2">
                            <Input aria-label="Colour" className="w-32" aria-invalid={!!err(`variants.${i}.color`)} {...register(`variants.${i}.color`)} />
                          </td>
                          <td className="py-2 pr-2">
                            <input type="color" aria-label="Swatch colour" className="h-9 w-12 rounded-lg border border-line" defaultValue={f.colorHex} {...register(`variants.${i}.colorHex`)} />
                          </td>
                          <td className="py-2 pr-2">
                            <Input aria-label="Variant SKU" placeholder="Auto" className="w-44" aria-invalid={!!err(`variants.${i}.sku`)} {...register(`variants.${i}.sku`)} />
                            {err(`variants.${i}.sku`) && <p className="mt-1 text-xs text-danger">{err(`variants.${i}.sku`)}</p>}
                          </td>
                          <td className="py-2 pr-2">
                            {existing ? (
                              <span className="tabular inline-flex h-9 items-center px-1" title="Change stock from Inventory">{f.stock}</span>
                            ) : (
                              <Input aria-label="Opening stock" type="number" min="0" className="w-20" {...register(`variants.${i}.stock`)} />
                            )}
                          </td>
                          <td className="py-2 pr-2">
                            <Input aria-label="Low-stock threshold" type="number" min="0" className="w-20" {...register(`variants.${i}.lowStockThreshold`)} />
                          </td>
                          <td className="py-2 pr-2">
                            <Controller
                              control={control}
                              name={`variants.${i}.isActive`}
                              render={({ field }) => <Switch aria-label="Variant active" checked={field.value} onCheckedChange={field.onChange} className="mt-2" />}
                            />
                          </td>
                          <td className="py-2">
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove variant" onClick={() => variants.remove(i)}>
                              <Trash2 />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => variants.append({ size: "", color: "", colorHex: "#111111", sku: "", stock: "0", lowStockThreshold: "5", isActive: true })}
              >
                <Plus /> Add one variant
              </Button>
              <p className="mt-1 text-xs text-stone">
                Removing a variant that has been ordered deactivates it instead of deleting it.
              </p>
            </div>
          </div>
        </Panel>
      </div>

      <aside className="flex flex-col gap-6 xl:sticky xl:top-6 xl:self-start">
        <Panel title="Publishing">
          <div className="flex flex-col gap-4 p-4">
            <Field label="Status" htmlFor="status" error={err("status")}>
              <select id="status" className={selectClass} {...register("status")}>
                <option value="DRAFT">Draft (hidden)</option>
                <option value="PUBLISHED">Published (on sale)</option>
                <option value="ARCHIVED">Archived (hidden, not purchasable)</option>
              </select>
            </Field>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 text-sm font-medium">Show on homepage in</legend>
              {(
                [
                  ["isFeatured", "Featured (Special for you)"],
                  ["isNewArrival", "New arrivals"],
                  ["isBestSeller", "Best sellers"],
                ] as const
              ).map(([name, label]) => (
                <Controller
                  key={name}
                  control={control}
                  name={name}
                  render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                      {label}
                    </label>
                  )}
                />
              ))}
            </fieldset>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {productId ? "Save changes" : status === "PUBLISHED" ? "Create and publish" : "Create product"}
            </Button>
            {productId && (
              <Button variant="outline" asChild>
                <Link href={`/admin/products/${productId}/preview`} target="_blank">
                  <Eye /> Preview{isDirty ? " (saved version)" : ""}
                </Link>
              </Button>
            )}
          </div>
        </Panel>
        {productId && (
          <Panel title="Remove product">
            <div className="flex flex-col gap-2 p-4 text-sm text-stone">
              <p>
                {hasOrders
                  ? "This product has orders, so it will be archived: hidden from the store and not purchasable, with order history kept."
                  : "This product has no orders and will be permanently deleted."}
              </p>
              <ConfirmButton
                label={hasOrders ? "Archive product" : "Delete product"}
                title={hasOrders ? "Archive this product?" : "Delete this product?"}
                description={hasOrders ? "Customers won't see or buy it. You can publish it again later." : "This can't be undone."}
                confirmLabel={hasOrders ? "Archive" : "Delete"}
                url={`/api/admin/products/${productId}`}
                method="DELETE"
                success={hasOrders ? "Product archived" : "Product deleted"}
                redirectTo="/admin/products"
                variant="destructive"
                destructive
              />
            </div>
          </Panel>
        )}
      </aside>
    </form>
  );
}
