import { formatMoney } from "@/lib/money";

/** Pure SVG bar chart: one bar per day. Values in paise. */
export function SalesChart({ data, currency = "INR" }: { data: { date: string; total: number }[]; currency?: string }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const W = 100 / data.length;
  const sum = data.reduce((s, d) => s + d.total, 0);
  return (
    <figure className="p-4">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label={`Sales over ${data.length} days, ${formatMoney(sum, currency)} in total`}>
        {data.map((d, i) => {
          const h = (d.total / max) * 36;
          return (
            <rect key={d.date} x={i * W + W * 0.15} y={40 - Math.max(h, 0.4)} width={W * 0.7} height={Math.max(h, 0.4)} rx={0.6} className={d.total ? "fill-ink" : "fill-line"}>
              <title>{`${d.date}: ${formatMoney(d.total, currency)}`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex justify-between text-xs text-stone">
        <span>{data[0]?.date}</span>
        <span>{data.at(-1)?.date}</span>
      </figcaption>
    </figure>
  );
}

/** Daily paid-sales totals for the last `days` days, zero-filled. */
export function fillDays(rows: { day: Date; total: bigint | number }[], days: number) {
  const byDay = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), Number(r.total)]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - (days - 1 - i));
    const key = d.toISOString().slice(0, 10);
    return { date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), key, total: byDay.get(key) ?? 0 };
  });
}
