import Image from "next/image";
import Link from "next/link";
import type { CardProduct } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { discountPercent, effectivePrice } from "@/lib/services/pricing";
import { WishlistButton } from "@/components/store/wishlist-button";
import { cn } from "@/lib/utils";

export function Price({
  price,
  salePrice,
  currency,
  className,
}: {
  price: number;
  salePrice: number | null;
  currency?: string;
  className?: string;
}) {
  const now = effectivePrice({ price, salePrice });
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2 tabular", className)}>
      <span className="font-bold">{formatMoney(now, currency)}</span>
      {now < price && (
        <>
          <s className="text-[0.85em] text-stone">
            <span className="sr-only">Was </span>
            {formatMoney(price, currency)}
          </s>
        </>
      )}
    </p>
  );
}

export function ProductCard({ product, priority = false }: { product: CardProduct; priority?: boolean }) {
  const soldOut = product.variants.every((v) => v.stock <= 0);
  const off = discountPercent(product);
  const image = product.images[0];
  return (
    <article className="group relative">
      <Link href={`/product/${product.slug}`} className="block rounded-3xl focus-visible:outline-offset-4">
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-tile">
          {image && (
            <Image
              src={image.url}
              alt={image.alt || product.name}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className={cn("object-cover transition-transform duration-500 group-hover:scale-[1.03]", soldOut && "opacity-60")}
            />
          )}
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {soldOut ? (
              <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold">Sold out</span>
            ) : off > 0 ? (
              <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-paper">-{off}%</span>
            ) : null}
          </div>
        </div>
        <div className="space-y-0.5 px-1 pt-3">
          <p className="text-xs font-medium text-stone md:text-[13px]">{product.category.name}</p>
          <h3 className="line-clamp-1 text-[15px] font-semibold md:text-base">{product.name}</h3>
          <Price price={product.price} salePrice={product.salePrice} className="text-base md:text-lg" />
        </div>
      </Link>
      <WishlistButton productId={product.id} name={product.name} className="absolute top-2.5 right-2.5 size-9" />
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: CardProduct[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-4 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}

export function ProductRail({ products }: { products: CardProduct[] }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 md:-mx-6 md:gap-4 md:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0">
      {products.map((p) => (
        <div key={p.id} className="w-[44%] shrink-0 snap-start md:w-[30%] lg:w-auto">
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}

export function SectionHeading({ title, href, linkLabel = "See all" }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 md:mb-6">
      <h2 className="text-xl font-bold tracking-[-0.01em] md:text-[28px] md:leading-[34px]">{title}</h2>
      {href && (
        <Link href={href} className="shrink-0 text-[15px] font-medium text-stone hover:text-ink">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
