/**
 * SGP stack projections — loader for the public /projections surface.
 *
 * DATA FLOW (this branch): the SGP runner
 * (`intelligence/sgp/price_from_real_prices.py`, branch
 * motif/sgp-real-prices-2026-10-12) publishes
 * `outbox/sgp_projections_latest.json`. A snapshot of that artifact is
 * bundled next to this module (`sgp-projections.snapshot.json`) so the
 * surface builds and typechecks without a live database. The view-model
 * mapping below is the whole contract: when the production read path
 * lands (runner artifact ingested to Neon, read through FreshnessGate),
 * `loadSgpProjections` swaps its source and neither the page nor the
 * card changes.
 *
 * PUBLIC-SURFACE RULES (Garrett's, non-negotiable):
 * - The public view model carries ONLY projections: matchup, kickoff,
 *   team, the stack's legs in plain words, and the model's projected
 *   probability. Nothing else in the artifact crosses this boundary —
 *   no de-vig internals, no correlation figures, no fair-odds numbers,
 *   no provenance endpoints, no engine details. Those are methodology
 *   and data internals; they stay internal.
 * - This surface has no pick mode. The artifact is stamped DIAGNOSTIC
 *   with residual-versus-close NOT cleared, and the page renders
 *   projections only, honestly framed, regardless of what a future
 *   artifact claims. Fail closed: an artifact that asserts it is a pick
 *   or an edge claim (`is_pick` / `is_edge_claim` not exactly false) is
 *   refused outright and the surface renders its honest-empty state.
 * - Honest-empty: a game renders only while it is upcoming, pre-game,
 *   fully priced, and carrying at least one valid stack. Expired or
 *   absent projections render the stale / empty states — never rows
 *   reconstructed from a finished slate.
 */

import snapshotJson from "./sgp-projections.snapshot.json";

/** Oldest an artifact may be before a still-upcoming slate reads stale. */
const MAX_ARTIFACT_AGE_MS = 72 * 60 * 60 * 1000;

export interface SgpStackProjection {
  readonly teamAbbr: string;
  readonly teamName: string;
  /** The stack's parts, in the artifact's own plain words. */
  readonly legs: readonly string[];
  /** Model-projected probability that every leg lands together, 0..1. */
  readonly projectedProbability: number;
}

export interface SgpGameProjections {
  readonly eventId: string;
  readonly matchup: string;
  readonly kickoffIso: string;
  /** Stacks for this game, ranked by projected probability, highest first. */
  readonly stacks: readonly SgpStackProjection[];
}

export type SgpSurfaceState = "live" | "stale" | "empty";

export interface SgpProjectionsPayload {
  readonly data: {
    readonly games: readonly SgpGameProjections[];
    readonly generatedAt: string | null;
  };
  readonly meta: {
    readonly state: SgpSurfaceState;
    readonly dataError: "ARTIFACT_INVALID" | null;
  };
}

/* ── Raw artifact shape (only the fields this loader consumes) ─────── */

interface RawStack {
  readonly legs?: unknown;
  readonly scaled?: { readonly fair_probability?: unknown } | null;
}

interface RawGame {
  readonly event_id?: unknown;
  readonly name?: unknown;
  readonly commence_time?: unknown;
  readonly state?: unknown;
  readonly home_team?: unknown;
  readonly away_team?: unknown;
  readonly home_abbr?: unknown;
  readonly away_abbr?: unknown;
  readonly complete_prices?: unknown;
  readonly sgp_stacks?: unknown;
}

interface RawArtifact {
  readonly is_pick?: unknown;
  readonly is_edge_claim?: unknown;
  readonly generated_at?: unknown;
  readonly games?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidPayload(): SgpProjectionsPayload {
  return {
    data: { games: [], generatedAt: null },
    meta: { state: "empty", dataError: "ARTIFACT_INVALID" },
  };
}

function parseStack(
  raw: unknown,
): { legs: readonly string[]; projectedProbability: number } | null {
  if (!isRecord(raw)) return null;
  const stack = raw as RawStack;
  const legs = Array.isArray(stack.legs)
    ? stack.legs.filter(
        (leg): leg is string => typeof leg === "string" && leg.trim().length > 0,
      )
    : [];
  const probability = isRecord(stack.scaled)
    ? stack.scaled.fair_probability
    : undefined;
  if (legs.length === 0) return null;
  if (
    typeof probability !== "number" ||
    !Number.isFinite(probability) ||
    probability <= 0 ||
    probability >= 1
  ) {
    return null;
  }
  return { legs, projectedProbability: probability };
}

/**
 * Map a raw runner artifact to the public payload. Pure and exported for
 * tests; `loadSgpProjections` is the request-path wrapper.
 */
export function buildSgpProjectionsView(
  input: unknown,
  now: Date,
): SgpProjectionsPayload {
  if (!isRecord(input)) return invalidPayload();
  const artifact = input as RawArtifact;

  // Fail closed: this surface publishes projections, never picks. An
  // artifact claiming to be a pick or an edge claim is not reframed —
  // it is refused, and the surface stays honestly empty.
  if (artifact.is_pick !== false || artifact.is_edge_claim !== false) {
    return invalidPayload();
  }
  if (!Array.isArray(artifact.games)) return invalidPayload();

  const generatedAt =
    typeof artifact.generated_at === "string" &&
    !Number.isNaN(Date.parse(artifact.generated_at))
      ? artifact.generated_at
      : null;
  if (generatedAt === null) return invalidPayload();

  let anyValidStack = false;
  const games: SgpGameProjections[] = [];

  for (const rawGame of artifact.games as readonly unknown[]) {
    if (!isRecord(rawGame)) continue;
    const game = rawGame as RawGame;
    if (game.state !== "pre" || game.complete_prices !== true) continue;
    if (!isRecord(game.sgp_stacks)) continue;

    const stacks: SgpStackProjection[] = [];
    for (const [abbr, rawStack] of Object.entries(game.sgp_stacks)) {
      const parsed = parseStack(rawStack);
      if (!parsed) continue;
      // Stack keys are team abbreviations; show the full team name when
      // the abbreviation matches a side of this game, else the key.
      const displayName =
        abbr === game.home_abbr && typeof game.home_team === "string"
          ? game.home_team
          : abbr === game.away_abbr && typeof game.away_team === "string"
            ? game.away_team
            : abbr;
      stacks.push({ ...parsed, teamAbbr: abbr, teamName: displayName });
    }
    if (stacks.length === 0) continue;
    anyValidStack = true;

    const kickoffIso =
      typeof game.commence_time === "string" ? game.commence_time : null;
    if (kickoffIso === null || Number.isNaN(Date.parse(kickoffIso))) continue;
    if (Date.parse(kickoffIso) <= now.getTime()) continue; // already kicked

    stacks.sort((a, b) => b.projectedProbability - a.projectedProbability);
    games.push({
      eventId: typeof game.event_id === "string" ? game.event_id : kickoffIso,
      matchup:
        typeof game.name === "string"
          ? game.name
          : "Upcoming game",
      kickoffIso,
      stacks,
    });
  }

  games.sort((a, b) => Date.parse(a.kickoffIso) - Date.parse(b.kickoffIso));

  const artifactAgeMs = now.getTime() - Date.parse(generatedAt);
  let state: SgpSurfaceState;
  if (games.length > 0) {
    state = artifactAgeMs > MAX_ARTIFACT_AGE_MS ? "stale" : "live";
  } else {
    state = anyValidStack ? "stale" : "empty";
  }

  return {
    data: { games: state === "live" ? games : [], generatedAt },
    meta: { state, dataError: null },
  };
}

/**
 * Request-path loader. Reads the bundled runner snapshot today; the
 * production source (Neon, through FreshnessGate) replaces the snapshot
 * import behind this same signature.
 */
export function loadSgpProjections(now: Date = new Date()): SgpProjectionsPayload {
  try {
    return buildSgpProjectionsView(snapshotJson, now);
  } catch {
    return invalidPayload();
  }
}
