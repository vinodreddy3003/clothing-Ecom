"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { api } from "@/lib/fetcher";
import type { CardProduct } from "@/lib/catalog";
import { useWishlist } from "@/components/store/providers";
import { ProductGrid } from "@/components/store/product-card";
import { EmptyState } from "@/components/store/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export function WishlistView() {
  const { ids, ready } = useWishlist();
  const [products, setProducts] = useState<CardProduct[] | null>(null);
  const key = ids.join(",");

  useEffect(() => {
    if (!ready) return;
    if (!key) {
      setProducts([]);
      return;
    }
    api<{ products: CardProduct[] }>(`/api/products/by-ids?ids=${encodeURIComponent(key)}`)
      .then((r) => setProducts(key.split(",").map((id) => r.products.find((p) => p.id === id)).filter((p): p is CardProduct => !!p)))
      .catch(() => setProducts([]));
  }, [key, ready]);

  return (
    <div className="pt-2 md:pt-8">
      <h1 className="mb-6 text-[26px] leading-8 font-bold tracking-[-0.02em] md:text-[40px] md:leading-[44px]">Wishlist</h1>
      {products === null ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-3xl bg-tile" />
          ))}
        </div>
      ) : products.length ? (
        <ProductGrid products={products} />
      ) : (
        <EmptyState icon={Heart} title="Your wishlist is empty." body="Tap the heart on a product to save it here." action={{ label: "Browse products", href: "/shop" }} />
      )}
    </div>
  );
}
