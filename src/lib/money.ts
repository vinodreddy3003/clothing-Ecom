/** Format an integer amount in minor units (paise) for display. */
export function formatMoney(minor: number, currency = "INR") {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

/** Convert a rupee amount typed by an admin (e.g. "1299.50") to paise. */
export const toMinor = (major: number) => Math.round(major * 100);
export const toMajor = (minor: number) => minor / 100;
