import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Small presentational helpers shared by admin pages. No hooks, so usable from server and client components.

export const selectClass =
  "h-9 rounded-lg border border-line bg-paper px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ink";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-stone">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-line bg-paper", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          {title && <h2 className="font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "warn" }) {
  return (
    <div className="rounded-xl border border-line p-4">
      <p className="text-sm text-stone">{label}</p>
      <p className={cn("tabular mt-1 text-2xl font-bold md:text-3xl", tone === "warn" && "text-warn")}>{value}</p>
      {note && <p className="mt-1 text-xs text-stone">{note}</p>}
    </div>
  );
}

export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center text-sm text-stone">
      <p>{message}</p>
      {action}
    </div>
  );
}

/** Builds pagination links that keep the current filters. */
export function Pagination({ page, pages, params, basePath }: { page: number; pages: number; params: Record<string, string | undefined>; basePath: string }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries({ ...params, page: String(p) }).filter(([, v]) => v) as [string, string][]);
    return `${basePath}?${q}`;
  };
  const btn = "inline-flex h-9 items-center gap-1 rounded-lg border border-line px-3 text-sm hover:bg-tile";
  return (
    <nav className="flex items-center justify-between gap-2 px-4 py-3 text-sm" aria-label="Pagination">
      <span className="text-stone">
        Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link className={btn} href={href(page - 1)}>
            <ChevronLeft className="size-4" aria-hidden /> Previous
          </Link>
        )}
        {page < pages && (
          <Link className={btn} href={href(page + 1)}>
            Next <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
    </nav>
  );
}

export function Field({ label, htmlFor, error, hint, children, className }: { label: string; htmlFor?: string; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  const describedBy = htmlFor ? `${htmlFor}-msg` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {(error || hint) && (
        <p id={describedBy} className={cn("text-xs", error ? "text-danger" : "text-stone")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export const thClass = "whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-stone";
export const tdClass = "px-4 py-3 align-middle";

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm [&_tbody_tr]:border-t [&_tbody_tr]:border-line [&_tbody_tr:hover]:bg-tile/50">
        {children}
      </table>
    </div>
  );
}

export const pageParam = (v: string | undefined) => Math.max(1, Number.parseInt(v ?? "1", 10) || 1);

export const dateFmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const dateTimeFmt = (d: Date) =>
  d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 120);
