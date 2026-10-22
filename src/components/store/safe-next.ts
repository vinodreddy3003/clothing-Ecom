/** Only same-site relative paths, so `?next=` can't redirect off-site. */
export function safeNext(next: string | undefined | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : null;
}
