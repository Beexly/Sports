/**
 * Sport-param resolution for /preview/[sport]/[slug].
 *
 * Canonical URLs carry the human sport slug — `slugify(Sport.name)` ("nfl",
 * "nba") — but ~731 indexed URLs carry the legacy Sport cuid in the [sport]
 * segment (the page used to query `Game.sportId` with the raw param). This
 * module maps EITHER form to the Sport row so the page can render canonical
 * URLs and 308 the legacy ones. A config-level redirect list (next.config.js
 * `redirects()`) is impossible here: cuids differ per environment, so the
 * mapping MUST come from the DB at request time — never a hardcoded cuid map.
 *
 * Ambiguity rule: if two active sports ever slugify to the same name-slug, the
 * sport with the lexicographically smallest `Sport.key` wins. `key` is unique,
 * human-assigned, and identical across environments, so resolution is
 * deterministic everywhere and independent of DB return order (enforced by
 * `orderBy: { key: "asc" }` + first-match `find`). Inactive sports never
 * resolve — both URL forms 404.
 */

import { cache } from "react";
import { db } from "@sports/db";
import { slugify } from "@/lib/seo/sports-jsonld";

export type ResolvedSport = Readonly<{
  id: string;
  name: string;
  slug: string; // slugify(name) — the canonical [sport] URL segment
}>;

export type SportParamResolution =
  | { readonly kind: "ok"; readonly sport: ResolvedSport } // param === sport.slug → render
  | { readonly kind: "redirect"; readonly sport: ResolvedSport } // legacy cuid OR non-canonical casing → 308
  | { readonly kind: "unknown" }; // no sport → 404

type SportRow = Readonly<{ id: string; key: string; name: string }>;

function toResolved(sport: SportRow): ResolvedSport {
  return { id: sport.id, name: sport.name, slug: slugify(sport.name) };
}

/**
 * Pure matcher — exported for unit tests. `sports` MUST be pre-sorted by key
 * asc (the ambiguity tie-break; see the module docstring). `find` = first
 * match = deterministic winner.
 */
export function matchSportParam(
  param: string,
  sports: ReadonlyArray<SportRow>,
): SportParamResolution {
  // 1. Exact canonical slug → render. Cuids can never hit this rule: rule 1
  //    uses exact slug equality and a cuid (25-char alphanumeric) is never a
  //    name-slug.
  const canonical = sports.find((s) => slugify(s.name) === param);
  if (canonical) return { kind: "ok", sport: toResolved(canonical) };

  // 2. Legacy Sport cuid — the indexed cuid URLs → 308 to the slug form.
  const byId = sports.find((s) => s.id === param);
  if (byId) return { kind: "redirect", sport: toResolved(byId) };

  // 3. Loose name match ("NFL", stray punctuation) → 308 to the canonical
  //    lowercase slug.
  const loose = sports.find((s) => slugify(s.name) === slugify(param));
  if (loose) return { kind: "redirect", sport: toResolved(loose) };

  return { kind: "unknown" };
}

// React's `cache` ships in the server build Next resolves for Server
// Components (dedupes the sports query between generateMetadata and the page
// within one request); the stable client build test runners resolve doesn't
// export it. Feature-detect with a passthrough fallback — correctness never
// depends on the dedupe, only one bounded query is saved.
const dedupe: typeof cache =
  typeof cache === "function" ? cache : (fn) => fn;

/** DB wrapper, React cache()-deduped per request (generateMetadata + page share one query). */
export const resolveSportParam: (param: string) => Promise<SportParamResolution> =
  dedupe(async (param: string): Promise<SportParamResolution> => {
    try {
      const sports = await db.sport.findMany({
        where: { active: true },
        select: { id: true, key: true, name: true },
        orderBy: { key: "asc" },
      });
      return matchSportParam(param, sports);
    } catch {
      // DB unavailable → 404, exactly the page's existing fail-safe posture.
      return { kind: "unknown" };
    }
  });
