"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Minus, Plus, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCart } from "@/components/store/providers";
import { WishlistButton } from "@/components/store/wishlist-button";
import { Price } from "@/components/store/product-card";
import { discountPercent } from "@/lib/services/pricing";
import { cn } from "@/lib/utils";

export type DetailProps = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  salePrice: number | null;
  currency: string;
  category: { name: string; slug: string };
  images: { id: string; url: string; alt: string }[];
  variants: { id: string; size: string; color: string; colorHex: string; stock: number; lowStockThreshold: number }[];
};

const SIZE_CHART = [
  ["S", "36", "28–30"],
  ["M", "38–40", "30–32"],
  ["L", "42", "32–34"],
  ["XL", "44", "34–36"],
  ["XXL", "46", "36–38"],
];

export function ProductDetail({ product, preview = false }: { product: DetailProps; preview?: boolean }) {
  const router = useRouter();
  const cart = useCart();

  const colors = useMemo(() => {
    const seen = new Map<string, { color: string; hex: string; inStock: boolean }>();
    for (const v of product.variants) {
      const c = seen.get(v.color) ?? { color: v.color, hex: v.colorHex, inStock: false };
      c.inStock ||= v.stock > 0;
      seen.set(v.color, c);
    }
    return [...seen.values()];
  }, [product.variants]);

  const [color, setColor] = useState(() => (colors.find((c) => c.inStock) ?? colors[0])?.color);
  const sizes = product.variants.filter((v) => v.color === color);
  const [size, setSize] = useState<string | null>(() => (sizes.length === 1 ? sizes[0].size : null));
  const variant = sizes.find((v) => v.size === size) ?? null;
  const maxQty = Math.min(10, variant?.stock ?? 0);
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const allSoldOut = product.variants.every((v) => v.stock <= 0);
  const off = discountPercent(product);
  const image = product.images[imageIndex];

  function pickColor(next: string) {
    setColor(next);
    const nextSizes = product.variants.filter((v) => v.color === next);
    // Keep the chosen size if it exists in the new colour.
    if (!nextSizes.some((v) => v.size === size)) setSize(nextSizes.length === 1 ? nextSizes[0].size : null);
    setQty(1);
  }

  function addToBag() {
    if (!variant) {
      toast.error("Select a size first.");
      return;
    }
    if (variant.stock <= 0) return;
    const inBag = cart.items.find((i) => i.variantId === variant.id)?.quantity ?? 0;
    const allowed = Math.max(0, Math.min(qty, variant.stock - inBag));
    if (!allowed) {
      toast.error(`You already have all ${variant.stock} available in your bag.`);
      return;
    }
    cart.add(variant.id, allowed);
    toast.success(`Added to bag: ${product.name}`, {
      description: `${variant.color}, ${variant.size}${allowed > 1 ? `, ${allowed} pcs` : ""}`,
      action: { label: "View bag", onClick: () => router.push("/cart") },
    });
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Link copied");
      }
    } catch {
      /* user cancelled */
    }
  }

  const stockMessage = !variant
    ? null
    : variant.stock <= 0
      ? { text: `Out of stock in ${variant.size}`, tone: "text-danger" }
      : variant.stock <= variant.lowStockThreshold
        ? { text: `Only ${variant.stock} left in ${variant.size}`, tone: "text-warn" }
        : { text: "In stock", tone: "text-stone" };

  const addLabel = allSoldOut ? "Sold out" : preview ? "Add to bag (preview)" : "Add to bag";

  return (
    <div className="pt-2 md:pt-8">
      <div className="mb-4 flex items-center justify-between md:hidden">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="grid size-11 place-items-center rounded-full border border-line"
        >
          <ArrowLeft className="size-5" />
        </button>
        <p className="text-lg font-bold">Details</p>
        <WishlistButton productId={product.id} name={product.name} className="border border-line" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        {/* Gallery */}
        <div className={cn(product.images.length > 1 && "lg:grid lg:grid-cols-[88px_1fr] lg:gap-4")}>
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-tile lg:order-2">
            {image && (
              <Image
                key={image.id}
                src={image.url}
                alt={image.alt || product.name}
                fill
                priority
                sizes="(min-width: 1024px) 50vw, (min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            )}
            {product.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 lg:hidden" aria-hidden>
                {product.images.map((img, i) => (
                  <span key={img.id} className={cn("block h-1.5 rounded-full", i === imageIndex ? "w-5 bg-lime" : "w-1.5 bg-paper")} />
                ))}
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <ul className="no-scrollbar mt-4 flex gap-3 overflow-x-auto lg:order-1 lg:mt-0 lg:flex-col" aria-label="Product images">
              {product.images.map((img, i) => (
                <li key={img.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setImageIndex(i)}
                    aria-label={`Show image ${i + 1}`}
                    aria-pressed={i === imageIndex}
                    className={cn(
                      "relative block size-16 overflow-hidden rounded-full bg-tile ring-offset-2 md:size-20 lg:size-[88px] lg:rounded-2xl",
                      i === imageIndex && "ring-3 ring-lime",
                    )}
                  >
                    <Image src={img.url} alt="" fill sizes="88px" className="object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Info */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Link href={`/category/${product.category.slug}`} className="text-[13px] font-medium text-stone hover:text-ink">
            {product.category.name}
          </Link>
          <div className="mt-1 flex items-start justify-between gap-4">
            <h1 className="text-[22px] leading-7 font-bold tracking-[-0.01em] md:text-[32px] md:leading-[38px]">{product.name}</h1>
            <div className="text-right">
              <Price price={product.price} salePrice={product.salePrice} currency={product.currency} className="justify-end text-xl md:text-2xl" />
              {off > 0 && <p className="text-sm font-semibold">{off}% off</p>}
            </div>
          </div>

          {colors.length > 0 && (
            <fieldset className="mt-6">
              <legend className="mb-3 text-[15px] font-semibold">
                Colour: <span className="font-normal text-stone">{color}</span>
              </legend>
              <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-3">
                {colors.map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    role="radio"
                    aria-checked={c.color === color}
                    aria-label={`${c.color}${c.inStock ? "" : ", out of stock"}`}
                    onClick={() => pickColor(c.color)}
                    className={cn(
                      "grid size-11 place-items-center rounded-full border-2",
                      c.color === color ? "border-ink" : "border-transparent",
                    )}
                  >
                    <span
                      className={cn("block size-8 rounded-full border border-line", !c.inStock && "opacity-40")}
                      style={{ backgroundColor: c.hex }}
                    />
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <fieldset className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <legend className="text-[15px] font-semibold">Select size</legend>
              <Dialog>
                <DialogTrigger className="text-sm text-stone underline-offset-4 hover:text-ink hover:underline">Size chart</DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Size chart</DialogTitle>
                    <DialogDescription>Body measurements in inches.</DialogDescription>
                  </DialogHeader>
                  <table className="w-full text-left text-[15px] tabular">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="py-2 font-semibold">Size</th>
                        <th className="py-2 font-semibold">Chest</th>
                        <th className="py-2 font-semibold">Waist</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SIZE_CHART.map(([s, chest, waist]) => (
                        <tr key={s} className="border-b border-line last:border-0">
                          <td className="py-2">{s}</td>
                          <td className="py-2">{chest}</td>
                          <td className="py-2">{waist}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DialogContent>
              </Dialog>
            </div>
            <div role="radiogroup" aria-label="Size" className="flex flex-wrap gap-2.5">
              {sizes.map((v) => {
                const out = v.stock <= 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={v.size === size}
                    aria-label={`${v.size}${out ? ", out of stock" : ""}`}
                    disabled={out}
                    onClick={() => {
                      setSize(v.size);
                      setQty(1);
                    }}
                    className={cn(
                      "grid h-12 min-w-12 place-items-center rounded-full border px-3 text-[15px] font-semibold transition-colors",
                      v.size === size ? "border-ink bg-lime" : "border-line bg-paper hover:border-ink",
                      out && "cursor-not-allowed text-stone line-through opacity-60 hover:border-line",
                    )}
                  >
                    {v.size}
                  </button>
                );
              })}
            </div>
            <p className={cn("mt-3 min-h-5 text-sm font-medium", stockMessage?.tone)} aria-live="polite">
              {stockMessage?.text}
            </p>
          </fieldset>

          {variant && variant.stock > 1 && (
            <div className="mt-4 flex items-center gap-4">
              <span className="text-[15px] font-semibold" id="qty-label">
                Quantity
              </span>
              <div className="flex items-center rounded-full border border-line" role="group" aria-labelledby="qty-label">
                <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty(qty - 1)} className="grid size-11 place-items-center disabled:opacity-40">
                  <Minus className="size-4" />
                </button>
                <span className="w-8 text-center font-semibold tabular" aria-live="polite">
                  {qty}
                </span>
                <button type="button" aria-label="Increase quantity" disabled={qty >= maxQty} onClick={() => setQty(qty + 1)} className="grid size-11 place-items-center disabled:opacity-40">
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 hidden items-center gap-3 md:flex">
            <Button variant="lime" size="pill" className="h-14 flex-1 text-base" disabled={allSoldOut || preview} onClick={addToBag}>
              {addLabel}
            </Button>
            <WishlistButton productId={product.id} name={product.name} className="size-14 border border-line" />
            <button type="button" onClick={share} aria-label="Share" className="grid size-14 place-items-center rounded-full border border-line hover:bg-tile">
              <Share2 className="size-5" />
            </button>
          </div>

          <div className="mt-8 border-t border-line pt-6">
            <h2 className="mb-2 text-[15px] font-semibold">Description</h2>
            <p className={cn("max-w-[65ch] text-[15px] leading-6 whitespace-pre-line text-stone md:text-base md:leading-[26px]", !expanded && "line-clamp-4")}>
              {product.description}
            </p>
            {product.description.length > 220 && (
              <button type="button" onClick={() => setExpanded(!expanded)} className="mt-1 text-sm font-semibold underline-offset-4 hover:underline">
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
          <details className="group border-t border-line py-4 mt-6">
            <summary className="flex min-h-11 cursor-pointer items-center justify-between text-[15px] font-semibold">Shipping and returns</summary>
            <p className="text-[15px] text-stone">
              Dispatched in 1–2 working days. Easy 7-day returns on unworn items.{" "}
              <Link href="/shipping-policy" className="underline underline-offset-4">
                Shipping policy
              </Link>{" "}
              and{" "}
              <Link href="/return-policy" className="underline underline-offset-4">
                return policy
              </Link>
              .
            </p>
          </details>
        </div>
      </div>

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-paper/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <button type="button" onClick={share} aria-label="Share" className="grid size-12 shrink-0 place-items-center rounded-full bg-tile">
          <Share2 className="size-5" />
        </button>
        <Button variant="lime" size="pill" className="h-12 flex-1 text-base" disabled={allSoldOut || preview} onClick={addToBag}>
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
