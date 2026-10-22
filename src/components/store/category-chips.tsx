import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Horizontal pill row. Active chip = ink with sparkle (reference design). */
export function CategoryChips({
  categories,
  active,
  allHref = "/shop",
}: {
  categories: { id: string; name: string; slug: string }[];
  active?: string;
  allHref?: string;
}) {
  const chips = [{ id: "all", name: "All", href: allHref, isActive: !active }].concat(
    categories.map((c) => ({ id: c.id, name: c.name, href: `/category/${c.slug}`, isActive: c.slug === active })),
  );
  return (
    <nav aria-label="Shop by category" className="no-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex w-max gap-2">
        {chips.map((c) => (
          <li key={c.id}>
            <Link
              href={c.href}
              aria-current={c.isActive ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-2 rounded-full border px-5 text-[15px] font-medium transition-colors",
                c.isActive ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:bg-tile",
              )}
            >
              {c.isActive && <Sparkles className="size-4 text-lime" strokeWidth={2} aria-hidden />}
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
