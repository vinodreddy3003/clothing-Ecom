"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

type Preview = {
  name: string;
  description: string;
  category: string;
  price: number;
  salePrice: number | null;
  images: { url: string; alt: string }[];
  variants: { size: string; color: string; colorHex: string; stock: number; isActive: boolean }[];
};

/** Storefront-style product detail for admins, rendered from the saved (possibly unpublished) product. */
export function ProductPreview({ p }: { p: Preview }) {
  const variants = p.variants.filter((v) => v.isActive);
  const colors = [...new Map(variants.map((v) => [v.color, v.colorHex])).entries()];
  const [img, setImg] = useState(0);
  const [color, setColor] = useState(colors[0]?.[0]);
  const [size, setSize] = useState<string>();
  const sizes = variants.filter((v) => v.color === color);
  const selected = sizes.find((v) => v.size === size);
  const onSale = p.salePrice != null && p.salePrice < p.price;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-tile">
          {/* eslint-disable-next-line @next/next/no-img-element -- preview of arbitrary admin URLs */}
          {p.images[img] && <img src={p.images[img].url} alt={p.images[img].alt || p.name} className="size-full object-cover" />}
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {p.images.map((im, i) => (
            <button
              key={im.url + i}
              type="button"
              onClick={() => setImg(i)}
              aria-label={`Image ${i + 1}`}
              aria-pressed={i === img}
              className={cn("size-16 shrink-0 overflow-hidden rounded-full bg-tile ring-offset-2", i === img && "ring-2 ring-lime")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail */}
              <img src={im.url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-sm text-stone">{p.category}</p>
          <h2 className="text-3xl font-bold tracking-tight">{p.name}</h2>
          <p className="tabular mt-2 text-xl font-bold">
            {formatMoney(onSale ? p.salePrice! : p.price)}
            {onSale && <span className="ml-2 text-base font-normal text-stone line-through">{formatMoney(p.price)}</span>}
          </p>
        </div>
        {colors.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold">Colour: {color}</p>
            <div className="flex gap-2">
              {colors.map(([c, hex]) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  aria-pressed={c === color}
                  onClick={() => {
                    setColor(c);
                    setSize(undefined);
                  }}
                  className={cn("size-9 rounded-full border border-line ring-offset-2", c === color && "ring-2 ring-ink")}
                  style={{ background: hex }}
                />
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="mb-2 text-sm font-semibold">Select size</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((v) => (
              <button
                key={v.size}
                type="button"
                disabled={v.stock === 0}
                onClick={() => setSize(v.size)}
                className={cn(
                  "h-11 min-w-11 rounded-full bg-tile px-4 text-sm font-semibold disabled:text-stone disabled:line-through",
                  v.size === size && "bg-lime",
                )}
              >
                {v.size}
              </button>
            ))}
          </div>
          {selected && <p className="mt-2 text-sm text-stone">{selected.stock} in stock</p>}
        </div>
        <p className="whitespace-pre-line text-[15px] leading-relaxed">{p.description}</p>
        <button type="button" disabled className="h-12 rounded-full bg-lime font-semibold opacity-80">
          Add to bag (disabled in preview)
        </button>
      </div>
    </div>
  );
}
