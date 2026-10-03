/**
 * Parse an optional `?date=` query param into a valid Date.
 *
 * `new Date("garbage")` yields an Invalid Date that silently flows into
 * Prisma `gte`/`lte` filters (via `startOfDay`/`endOfDay`) and produces a
 * broken query or a 500. This helper guarantees a usable Date: it falls back
 * to "now" whenever the input is missing or unparseable.
 */
export function parseDateParam(raw: string | null | undefined): Date {
  if (!raw) return new Date();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
