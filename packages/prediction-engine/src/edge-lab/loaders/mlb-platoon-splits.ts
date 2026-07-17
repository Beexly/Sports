/**
 * MLB platoon-split (vs L / vs R) player-season feature loader — MLB parity
 * item for the edge-lab loaders (edge-lab handoff §6; intel reconciliation
 * queue item 6: "MLB Statcast + platoon-split loaders behind clearance").
 * Sibling of ./statcast-features.ts.
 *
 * ── Source & rights ──
 * MLB Stats API's `statSplits` stat group — the SAME source and access
 * category mlb-games.ts already ingests from (free, keyless, public JSON,
 * no login/paywall/CAPTCHA): "MLB Stats API, free public API." See
 * mlb-games.ts's header for the full rights writeup and for why this loader
 * doesn't call packages/data-ingestion's source-registry / assertIngestible
 * directly (prediction-engine's package.json declares no dependency on
 * @sports/data-ingestion) — that reasoning applies verbatim here.
 *
 *   GET https://statsapi.mlb.com/api/v1/people/{personId}/stats
 *       ?stats=statSplits&sitCodes=vl,vr&season={sourceSeason}&group={hitting|pitching}
 *
 * Verified live 2026-07-16 against several real personIds/seasons:
 *   - 665742 (Juan Soto), season=2023, group=hitting: 2 splits (`vl`, `vr`),
 *     each carrying `stat.ops` as a QUOTED STRING (e.g. `".813"`,
 *     `"1.037"`... actual Soto values `.813` vs-left / `.980` vs-right) and
 *     `stat.plateAppearances` as a real JSON NUMBER (207 / 501) — confirming
 *     the task's "fields may be strings" warning applies specifically to the
 *     rate stat (`ops`), not the count (`plateAppearances`).
 *   - 605483 (Blake Snell), season=2023, group=pitching: same shape, but the
 *     PA-equivalent field is named `battersFaced`, NOT `plateAppearances` —
 *     the pitching stat schema simply doesn't have a `plateAppearances` key.
 *     This loader reads the group-appropriate field name explicitly rather
 *     than assuming one name covers both groups.
 *   - 458681 (Lance Lynn), season=2023 (a real in-season trade: White Sox ->
 *     Dodgers at the 2023 deadline), group=pitching: the API returned SIX
 *     entries for `sitCodes=vl,vr`, not two — one `vl` and one `vr` PER TEAM
 *     he played for that season, PLUS one `vl` and one `vr` entry with NO
 *     `team` field at all, which carries the season-TOTAL combined split
 *     (verified: its `battersFaced` equals the sum of the two team-scoped
 *     entries' `battersFaced` for that split code). This loader prefers that
 *     team-less aggregate entry when multiple entries share a split code —
 *     see `pickSplitEntry` below — rather than re-deriving a combined OPS
 *     from raw AB/BB/etc. components itself (out of scope: the API already
 *     computed the honest combined number).
 *
 * ── Why this loader takes an explicit `personIds` list (unlike mlb-games.ts) ──
 * MLB Stats API's schedule endpoint (mlb-games.ts) is a bulk, per-SEASON
 * call: one request covers the entire league's games. `statSplits`, by
 * contrast, is a bulk, per-PLAYER call: there is no "give me every player's
 * platoon splits for season S" request. This loader therefore requires the
 * caller to supply the roster/person-id universe (e.g. from a rosters feed —
 * out of scope for this file) and issues one request per
 * (personId, targetSeason, group) — `personIds.length * targetSeasons.length
 * * groups.length` requests total. That is a real, documented scaling
 * difference from mlb-games.ts's one-request-per-season, not an oversight.
 *
 * ── LEAK-FREE DISCIPLINE (non-negotiable — read this before calling) ──
 * Season-aggregate platoon splits leak future games within the same season
 * for the identical reason statcast-features.ts documents: a player's
 * September OPS-vs-lefties includes plate appearances from games that
 * happened after an April game earlier that same season. This loader's only
 * public entry point takes `targetSeasons` (the seasons whose GAMES you want
 * features for) and internally fetches `targetSeason - 1`'s statSplits — the
 * player's complete PRIOR season — framed as `targetSeason`'s feature input.
 * Every record carries `sourceSeason` for audit and an `observedAt` stamp
 * fixed at the prior season's conservative close (see
 * ./mlb-season-boundaries.js). There is no code path here that returns
 * same-season splits for a target season. No same-season aggregates, period.
 */

import { mlbSeasonEndIso } from "./mlb-season-boundaries.js";

export type PlatoonStatGroup = "hitting" | "pitching";

export interface LoadMlbPlatoonSplitsPriorSeasonOptions {
  /** Seasons you want PRIOR-SEASON platoon-split features FOR (e.g. 2024
   * means: fetch and return each person's 2023 statSplits, framed as feature
   * input for 2024 games). See header: never same-season. */
  readonly targetSeasons: readonly number[];
  /** MLBAM person ids to load splits for (statSplits is a per-player call —
   * see header). */
  readonly personIds: readonly number[];
  /** Stat groups to query. Defaults to both — a two-way player (e.g. Ohtani)
   * has meaningful splits under both. */
  readonly groups?: readonly PlatoonStatGroup[];
  /** Injectable for tests; defaults to the global `fetch`. */
  readonly fetcher?: typeof fetch;
}

/**
 * One player-season's platoon-split profile, framed as a feature input for
 * `targetSeason` but MEASURED in `sourceSeason` (= targetSeason - 1).
 * `opsVsL`/`opsVsR`/`paVsL`/`paVsR` are `null` when the player has no
 * recorded plate appearances (as a hitter) or batters faced (as a pitcher)
 * against that handedness in `sourceSeason` — never fabricated as 0, and
 * this loader ALWAYS emits exactly one record per requested
 * (personId, targetSeason, group), even when every field is null, so a
 * caller can count "no prior-season data" precisely (see
 * ./mlb-feature-ingest.js's skip counters) rather than silently losing that
 * player from the array.
 *
 * `paVsL`/`paVsR` are exposed specifically so consumers can empirical-Bayes
 * shrink small-sample splits (mirroring ../props-hb.ts's shrinkage machinery)
 * rather than trusting a 12-PA OPS at face value.
 */
export interface PlatoonSplitRecord {
  /** MLBAM person id. */
  readonly personId: number;
  /** The season these features apply TO. */
  readonly targetSeason: number;
  /** The season the underlying splits were actually measured in (always
   * targetSeason - 1). Kept for provenance/audit. */
  readonly sourceSeason: number;
  readonly group: PlatoonStatGroup;
  /** OPS vs LHP (hitting) / OPS allowed vs LHB (pitching). */
  readonly opsVsL: number | null;
  /** OPS vs RHP (hitting) / OPS allowed vs RHB (pitching). */
  readonly opsVsR: number | null;
  /** Plate appearances (hitting) / batters faced (pitching) behind opsVsL. */
  readonly paVsL: number | null;
  /** Plate appearances (hitting) / batters faced (pitching) behind opsVsR. */
  readonly paVsR: number | null;
  /** ISO instant this record becomes safe to serve as a feature — the prior
   * season's conservative end-of-season cutoff (see ./mlb-season-boundaries.js). */
  readonly observedAt: string;
}

const DEFAULT_GROUPS = ["hitting", "pitching"] as const satisfies readonly PlatoonStatGroup[];

/** Build the MLB Stats API statSplits URL for one (person, season, group). */
export function mlbPlatoonSplitsUrl(personId: number, sourceSeason: number, group: PlatoonStatGroup): string {
  return `https://statsapi.mlb.com/api/v1/people/${personId}/stats?stats=statSplits&sitCodes=vl,vr&season=${sourceSeason}&group=${group}`;
}

// ── MLB Stats API statSplits response shape (only the fields this loader reads) ──

interface MlbStatSplitStat {
  readonly ops?: string;
  readonly plateAppearances?: number;
  readonly battersFaced?: number;
}

interface MlbStatSplitEntry {
  /** Present for a team-scoped stint; ABSENT for the season-combined
   * aggregate entry (see header: verified via the Lance Lynn trade case). */
  readonly team?: { readonly id?: number; readonly name?: string };
  readonly split?: { readonly code?: string };
  readonly stat?: MlbStatSplitStat;
}

interface MlbStatSplitsGroupBlock {
  readonly splits?: readonly MlbStatSplitEntry[];
}

interface MlbStatSplitsResponse {
  readonly stats?: readonly MlbStatSplitsGroupBlock[];
}

/**
 * Load PRIOR-SEASON MLB platoon splits for the requested target seasons,
 * person ids, and stat groups. One request per
 * (personId, targetSeason, group) — see header.
 */
export async function loadMlbPlatoonSplitsPriorSeason(
  opts: LoadMlbPlatoonSplitsPriorSeasonOptions,
): Promise<PlatoonSplitRecord[]> {
  const doFetch = opts.fetcher ?? fetch;
  const groups = opts.groups ?? DEFAULT_GROUPS;
  const out: PlatoonSplitRecord[] = [];

  for (const targetSeason of opts.targetSeasons) {
    const sourceSeason = targetSeason - 1;
    for (const personId of opts.personIds) {
      for (const group of groups) {
        const url = mlbPlatoonSplitsUrl(personId, sourceSeason, group);
        const res = await doFetch(url);
        if (!res.ok) {
          throw new Error(`MLB Stats API statSplits fetch failed (${res.status}) for ${url}`);
        }
        const payload = (await res.json()) as MlbStatSplitsResponse;
        const splits = payload.stats?.[0]?.splits ?? [];

        const vl = extractSplit(splits, "vl", group);
        const vr = extractSplit(splits, "vr", group);

        out.push({
          personId,
          targetSeason,
          sourceSeason,
          group,
          opsVsL: vl.ops,
          opsVsR: vr.ops,
          paVsL: vl.pa,
          paVsR: vr.pa,
          observedAt: mlbSeasonEndIso(sourceSeason),
        });
      }
    }
  }

  return out;
}

// ── split extraction ─────────────────────────────────────────────────────

interface ExtractedSplit {
  readonly ops: number | null;
  readonly pa: number | null;
}

/**
 * Pick the entry to trust for one split code out of possibly-several entries
 * (a mid-season trade produces one team-scoped entry per stint PLUS one
 * team-less combined-season entry — see header). Prefers the team-less
 * aggregate; falls back to the single entry when there's only one; falls
 * back to the largest-PA entry among ambiguous multiples as a defensive
 * last resort (not the expected path per the verified live behavior above —
 * re-deriving a combined OPS from raw components is out of scope for this
 * loader, so this is documented as best-effort, not exact).
 */
function pickSplitEntry(candidates: readonly MlbStatSplitEntry[], group: PlatoonStatGroup): MlbStatSplitEntry | null {
  if (candidates.length === 0) return null;
  const aggregate = candidates.find((c) => c.team === undefined);
  if (aggregate !== undefined) return aggregate;
  if (candidates.length === 1) return candidates[0] ?? null;

  let best: MlbStatSplitEntry | null = null;
  let bestPa = -1;
  for (const c of candidates) {
    const pa = paField(c.stat, group) ?? -1;
    if (pa > bestPa) {
      best = c;
      bestPa = pa;
    }
  }
  return best;
}

function extractSplit(
  splits: readonly MlbStatSplitEntry[],
  code: "vl" | "vr",
  group: PlatoonStatGroup,
): ExtractedSplit {
  const candidates = splits.filter((s) => s.split?.code === code);
  const chosen = pickSplitEntry(candidates, group);
  if (chosen === null) return { ops: null, pa: null };
  return {
    ops: toNumber(chosen.stat?.ops),
    pa: paField(chosen.stat, group),
  };
}

/** Group-appropriate "sample size" field: `plateAppearances` for hitting,
 * `battersFaced` for pitching (see header: the pitching schema has no
 * `plateAppearances` key at all). */
function paField(stat: MlbStatSplitStat | undefined, group: PlatoonStatGroup): number | null {
  if (stat === undefined) return null;
  const raw = group === "hitting" ? stat.plateAppearances : stat.battersFaced;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

// ── small parsing helpers ───────────────────────────────────────────────────

function toNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
