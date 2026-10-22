"use client";

import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useWishlist } from "@/components/store/providers";
import { cn } from "@/lib/utils";

export function WishlistButton({ productId, name, className }: { productId: string; name: string; className?: string }) {
  const { has, toggle, ready } = useWishlist();
  const saved = ready && has(productId);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toast(toggle(productId) ? "Saved to wishlist" : "Removed from wishlist");
      }}
      className={cn("grid size-11 place-items-center rounded-full bg-paper transition-colors hover:bg-tile", className)}
    >
      <Heart className={cn("size-5", saved && "fill-ink")} strokeWidth={1.75} />
    </button>
  );
}
