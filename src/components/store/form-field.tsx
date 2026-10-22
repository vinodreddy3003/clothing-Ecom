import { cn } from "@/lib/utils";

export const inputClass =
  "h-12 w-full rounded-xl border border-line bg-paper px-4 text-[15px] outline-none placeholder:text-stone focus-visible:border-ink aria-invalid:border-danger";

/** Label + control + error, wired with aria-describedby. */
export function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-stone">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Props to spread on an input so it links to its Field error. */
export const errorProps = (id: string, error?: string) => ({
  id,
  "aria-invalid": !!error || undefined,
  "aria-describedby": error ? `${id}-error` : undefined,
});
