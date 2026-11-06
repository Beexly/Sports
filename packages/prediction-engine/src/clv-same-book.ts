/**
 * Same-book CLV. Additive to clv-capture.ts, which still averages the
 * union. This module grades only the intersection of bookmaker keys
 * present at mint and at close. Empty intersection refuses. A row with
 * no bookmaker key is refused, never silently included.
 */

export type SameBookRefusalReason =
  | "missing_bookmaker_key"
  | "empty_intersection";

export interface BookKeyedRow {
  readonly bookmaker: string | null | undefined;
}

export interface SameBookComposition {
  readonly mintKeys: readonly string[];
  readonly closeKeys: readonly string[];
  readonly intersection: readonly string[];
  readonly mintOnly: readonly string[];
  readonly closeOnly: readonly string[];
}

export type SameBookBasis =
  | { readonly ok: true; readonly composition: SameBookComposition }
  | {
      readonly ok: false;
      readonly reason: SameBookRefusalReason;
      readonly composition: SameBookComposition;
      readonly unnamedMint: number;
      readonly unnamedClose: number;
    };

function keySet(rows: readonly BookKeyedRow[]): {
  keys: Set<string>;
  unnamed: number;
} {
  const keys = new Set<string>();
  let unnamed = 0;
  for (const r of rows) {
    const k = typeof r.bookmaker === "string" ? r.bookmaker.trim() : "";
    if (!k) unnamed += 1;
    else keys.add(k);
  }
  return { keys, unnamed };
}

function sorted(xs: Iterable<string>): string[] {
  return [...xs].sort();
}

export function sameBookBasis(
  mint: readonly BookKeyedRow[],
  close: readonly BookKeyedRow[],
): SameBookBasis {
  const m = keySet(mint);
  const c = keySet(close);
  const intersection = new Set([...m.keys].filter((k) => c.keys.has(k)));
  const composition: SameBookComposition = {
    mintKeys: sorted(m.keys),
    closeKeys: sorted(c.keys),
    intersection: sorted(intersection),
    mintOnly: sorted([...m.keys].filter((k) => !intersection.has(k))),
    closeOnly: sorted([...c.keys].filter((k) => !intersection.has(k))),
  };
  if (m.unnamed > 0 || c.unnamed > 0) {
    return {
      ok: false,
      reason: "missing_bookmaker_key",
      composition,
      unnamedMint: m.unnamed,
      unnamedClose: c.unnamed,
    };
  }
  if (intersection.size === 0) {
    return {
      ok: false,
      reason: "empty_intersection",
      composition,
      unnamedMint: 0,
      unnamedClose: 0,
    };
  }
  return { ok: true, composition };
}

export function rowsOnIntersection<T extends BookKeyedRow>(
  rows: readonly T[],
  keys: readonly string[],
): T[] {
  const allow = new Set(keys);
  return rows.filter((r) => typeof r.bookmaker === "string" && allow.has(r.bookmaker));
}
