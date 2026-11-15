/**
 * Corpus grounding evidence loader with a SLATE-LEVEL cache.
 *
 * The corpus is static within a slate and most games share most situational
 * facets (the five base facets fire for every game). Grounding per game,
 * serially, re-queries the same facet text once per game; this loader keys
 * cached results by the facet query signature instead of the game id, so a
 * whole slate pays for each distinct facet query exactly once — even when
 * games load concurrently (the cache stores promises, not resolved values).
 *
 * Honesty rules (evidence-spine contract):
 *  - A failed lookup NEVER becomes support. If groundGame throws, or every
 *    facet errored on every attempted layer without retrieving anything, the
 *    loader returns MISSING. A partially failed load keeps the facets that
 *    retrieved evidence and drops the ones that did not (a failed lookup is
 *    not the same claim as "the corpus says nothing").
 *  - Support below minSupport (default 0.8) is reported as NO SUPPORT: the
 *    score measures topical match, not agreement, so a 0.6 match is not
 *    evidence that the mechanism applies. Its citations are dropped with it.
 *
 * SELECT only — every query goes through groundGame/groundFacet, which are
 * read-only. No writes, no schema changes.
 */

import type { SqlClient } from "@sports/prediction-engine/src/literature/literature-retrieval.js";
import type {
  CorpusCitation,
  CorpusGroundingRecord,
  Evidence,
} from "@sports/prediction-engine/src/evidence/types.js";
import { missing, real } from "@sports/prediction-engine/src/evidence/types.js";
import {
  groundGame,
  type FacetGrounding,
  type GroundingFacet,
} from "@sports/prediction-engine/src/literature/corpus-grounding.js";
import {
  facetsForGame,
  type FacetGameContext,
} from "@sports/prediction-engine/src/literature/situational-facets.js";

const SOURCE = "lit:corpus-grounding";
const DEFAULT_MIN_SUPPORT = 0.8;

export interface CorpusLoaderOptions {
  readonly db: SqlClient;
  readonly now?: Date;
  readonly perLayerK?: number;
  /** Facets scoring below this are reported as no support (default 0.8). */
  readonly minSupport?: number;
}

export interface CorpusLoaderStats {
  /** SQL statements actually issued through the wrapped client. */
  readonly queries: number;
  /** Facet lookups served from the slate cache instead of SQL. */
  readonly cacheHits: number;
  /** Cumulative wall-clock milliseconds spent inside load(). */
  readonly elapsedMs: number;
}

export interface CorpusLoader {
  load(gameId: string, ctx: FacetGameContext): Promise<Evidence<readonly CorpusGroundingRecord[]>>;
  stats(): CorpusLoaderStats;
}

/**
 * Cache key = the facet query signature, never the game. Everything that
 * changes the SQL or the post-query filtering goes into the key: the query
 * text, the anchors, the facet weight and the family. perLayerK is fixed per
 * loader instance, so it does not need to appear here.
 */
function facetKey(facet: GroundingFacet): string {
  return JSON.stringify([facet.family, facet.query, facet.anchors ?? [], facet.weight ?? 1]); // documented-default: GroundingFacet.weight (corpus-grounding.ts:51)
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** A facet that errored and retrieved nothing is a failed lookup, not evidence. */
function isFailedLookup(facet: FacetGrounding): boolean {
  return facet.layerErrors.length > 0 && facet.evidence.length === 0;
}

export function createCorpusLoader(opts: CorpusLoaderOptions): CorpusLoader {
  const minSupport = opts.minSupport ?? DEFAULT_MIN_SUPPORT;
  const asOf = (opts.now ?? new Date()).toISOString();
  const groundOpts = opts.perLayerK === undefined ? undefined : { perLayerK: opts.perLayerK };

  let queries = 0;
  let cacheHits = 0;
  let elapsedMs = 0;

  // Count every SQL statement groundGame issues, without touching its code.
  const db: SqlClient = {
    query: (text, values) => {
      queries += 1;
      return opts.db.query(text, values);
    },
  };

  // Promise-valued so concurrent loads of the same facet share one query set.
  const cache = new Map<string, Promise<FacetGrounding>>();

  async function groundFacetsCached(
    gameId: string,
    facets: readonly GroundingFacet[],
  ): Promise<FacetGrounding[]> {
    const keys = facets.map(facetKey);
    const uncached: GroundingFacet[] = [];
    const uncachedKeys: string[] = [];
    for (let i = 0; i < facets.length; i += 1) {
      const facet = facets[i];
      const key = keys[i];
      if (facet === undefined || key === undefined) continue;
      if (cache.has(key)) {
        cacheHits += 1;
      } else {
        uncached.push(facet);
        uncachedKeys.push(key);
      }
    }

    if (uncached.length > 0) {
      // One groundGame call for the whole uncached batch; its per-facet
      // promises are registered immediately so a concurrent load that needs
      // the same facet awaits this batch instead of issuing its own.
      const batch = groundGame(db, gameId, uncached, groundOpts);
      for (let j = 0; j < uncachedKeys.length; j += 1) {
        const key = uncachedKeys[j];
        if (key === undefined) continue;
        const pending = batch.then((grounding) => {
          const grounded = grounding.facets[j];
          if (grounded === undefined) {
            throw new Error(`grounding returned no result for facet ${key}`);
          }
          if (isFailedLookup(grounded)) {
            // An outage is not a measurement: groundGame resolves with
            // layerErrors instead of throwing, so without this eviction a
            // transient failure would poison the slate cache. Current
            // awaiters still see the failure; the next load re-queries.
            cache.delete(key);
          }
          return grounded;
        });
        // Evict failures so a later game retries instead of inheriting a
        // permanently rejected promise.
        pending.catch(() => {
          cache.delete(key);
        });
        cache.set(key, pending);
      }
    }

    return Promise.all(
      keys.map(async (key) => {
        const pending = cache.get(key);
        if (pending === undefined) {
          throw new Error(`facet cache lost key ${key}`);
        }
        return pending;
      }),
    );
  }

  async function load(
    gameId: string,
    ctx: FacetGameContext,
  ): Promise<Evidence<readonly CorpusGroundingRecord[]>> {
    const startedAt = Date.now();
    try {
      const facets = facetsForGame(ctx);
      if (facets.length === 0) {
        return missing("no facets for this game context", SOURCE, asOf);
      }

      let grounded: FacetGrounding[];
      try {
        grounded = await groundFacetsCached(gameId, facets);
      } catch (err) {
        return missing(`corpus grounding failed: ${errorMessage(err)}`, SOURCE, asOf);
      }

      const failed = grounded.filter(isFailedLookup);
      if (grounded.length === 0 || failed.length === grounded.length) {
        const detail = failed.flatMap((f) => f.layerErrors).slice(0, 6).join("; ");
        return missing(
          `corpus grounding failed: every facet errored on all attempted layers (${detail})`,
          SOURCE,
          asOf,
        );
      }

      const records: CorpusGroundingRecord[] = [];
      for (const facet of grounded) {
        // A failed lookup is excluded, not zeroed: zero support is a measured
        // claim ("the corpus says nothing"), failure is no claim at all.
        if (isFailedLookup(facet)) continue;
        if (facet.support < minSupport) {
          records.push({ family: facet.family, facet: facet.query, support: 0, citations: [] });
          continue;
        }
        const citations: CorpusCitation[] = facet.evidence.map((e) => ({
          uri: e.citation,
          title: e.title ?? "",
          // weight is the final, trust-adjusted evidence weight in [0,1];
          // raw layer relevance is not comparable across layers.
          score: e.weight,
        }));
        records.push({ family: facet.family, facet: facet.query, support: facet.support, citations });
      }

      const note =
        failed.length > 0
          ? `${failed.length}/${grounded.length} facets failed lookup and were excluded; support < ${minSupport} reported as 0`
          : `support < ${minSupport} reported as 0 (topical match is not agreement)`;
      return real(records, SOURCE, asOf, note);
    } finally {
      elapsedMs += Date.now() - startedAt;
    }
  }

  return {
    load,
    stats: () => ({ queries, cacheHits, elapsedMs }),
  };
}
