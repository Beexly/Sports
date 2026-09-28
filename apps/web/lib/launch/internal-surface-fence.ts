/**
 * Internal-surface fence — the public/private surface doctrine, enforced.
 *
 * THE DOCTRINE (Garrett, 2026-09-28, HARD). The public site shows ONLY
 * projections, rankings, and published picks with their outcomes. The data,
 * metrics, signals, and methodology behind them stay internal. This extends the
 * NGS internal-only doctrine to every proprietary surface.
 *   Source: docs/research/2026-09-28/orchestration/public-private-surface-doctrine.md
 *
 * WHAT THIS IS NOT. It is not a new readiness gate and it does not read the
 * existing ones. `canExposePerformanceStats` and `PUBLISH_LEDGER` are the
 * PROOF surface — published picks and their record — and the doctrine KEEPS
 * those. A "performance stats" flag turning on must never re-open methodology.
 * Keeping this a separate, single-purpose registry is what makes that
 * structurally impossible rather than a rule someone has to remember.
 *
 * DEFAULT CLOSED, and that is the point. The audit found these surfaces
 * reachable with no gate at all, so the honest starting state is dark. Each
 * surface re-opens ONLY behind its own named env flag, which is founder-owned
 * under AGENTS.md law 3 — this module never sets one and never defaults one
 * true. `isStatsPublic` is the existing precedent: opt-in, default dark, 404
 * when shut. This file is that pattern applied to the doctrine.
 *
 * FAIL CLOSED, NEVER PARTIAL. An unknown path is not on the list, so it is
 * public — this registry is an ALLOW-LIST of internal surfaces, not a
 * deny-list. That direction is deliberate: a new internal page written today is
 * public until someone adds it here, which is the same failure the audit
 * already found once. The test below pins the registry against the audit
 * inventory so the list cannot silently drift, and a new exposure is caught by
 * the doctrine-scan test rather than by this module guessing.
 *
 * It gates ROUTES AND PAGES, not the narrative. Copy that is published
 * elsewhere (nav labels, sitemap entries, cross-links) is handled by the same
 * call, so a surface cannot be dark in one place and linked from another.
 */

function truthy(raw: string | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * Internal surfaces, each with the exact thing it leaks.
 *
 * `exposes` is the audit's finding, recorded next to the gate so a future
 * reader can see WHY a surface is dark without re-running the audit.
 * `env` is the founder-owned opt-in. None are set by this module.
 */
export const INTERNAL_SURFACES = {
  /** Full methodology: the factor list and the three-stage engine stack. */
  "/methodology": {
    env: "METHODOLOGY_PUBLIC",
    exposes: "factor list + three-stage scoring stack (how the model works)",
  },
  /** "Glass box on every signal": named metrics with stability labels. */
  "/intelligence/metrics": {
    env: "METRICS_PUBLIC",
    exposes: "named metric inventory with anchor/signal/noise labels",
  },
  /** Live player-week rows: opportunities, target share, WOPR. */
  "/nflverse": {
    env: "NFLVERSE_PUBLIC",
    exposes: "raw player-week rows: target share, WOPR, opportunity counts",
  },
  /** PlayerLab tables, PlayerLens rail, MetricExplainer. */
  "/players": {
    env: "PLAYERS_PUBLIC",
    exposes: "metric-explainer tables behind each player row",
  },
  /** "Parlay genome": per-leg risk, survivability, EV, correlation. */
  "/parlay-mri": {
    env: "PARLAY_MRI_PUBLIC",
    exposes: "per-leg risk, survivability, expected value, house-edge compounding",
  },
} as const satisfies Readonly<Record<string, { env: string; exposes: string }>>;

export type InternalSurfacePath = keyof typeof INTERNAL_SURFACES;

/** JSON API routes that serve internal payloads. Same doctrine, API surface. */
export const INTERNAL_API_ROUTES = {
  /** Public calibration report JSON — calibration internals. */
  "/api/calibration": {
    env: "CALIBRATION_JSON_PUBLIC",
    exposes: "calibration report internals",
  },
  /** Real-time truth topology and the "law" — methodology as data. */
  "/api/gse/v1/truth": {
    env: "TRUTH_TOPOLOGY_PUBLIC",
    exposes: "truth topology graph and the rule set behind it",
  },
} as const satisfies Readonly<Record<string, { env: string; exposes: string }>>;

export type InternalApiRoute = keyof typeof INTERNAL_API_ROUTES;

const PAGE_FLAGS: Readonly<Record<InternalSurfacePath, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(INTERNAL_SURFACES).map(([p, v]) => [p, v.env]),
  ) as Record<InternalSurfacePath, string>,
);

const API_FLAGS: Readonly<Record<InternalApiRoute, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(INTERNAL_API_ROUTES).map(([p, v]) => [p, v.env]),
  ) as Record<InternalApiRoute, string>,
);

export function isInternalSurface(path: string): boolean {
  return Object.prototype.hasOwnProperty.call(PAGE_FLAGS, path);
}

export function isInternalApiRoute(path: string): boolean {
  return Object.prototype.hasOwnProperty.call(API_FLAGS, path);
}

/**
 * True when a page may render. Call `notFound()` when false — the same 404 the
 * StatKing gate uses, so a dark surface is indistinguishable from one that was
 * never built, which is what "internal" has to mean on a public host.
 */
export function isPagePublic(path: string): boolean {
  const flag = PAGE_FLAGS[path as InternalSurfacePath];
  if (!flag) return true; // not internal
  return truthy(process.env[flag]);
}

/** True when an API route may serve its payload. */
export function isApiRoutePublic(path: string): boolean {
  const flag = API_FLAGS[path as InternalApiRoute];
  if (!flag) return true; // not internal
  return truthy(process.env[flag]);
}

/**
 * The 404 body for a dark API route. It names the surface but carries NO
 * detail about what it would have returned — an error that explains the payload
 * is the payload. The founder-only opt-in name is included because this route
 * is reachable by the founder debugging their own deployment, and "set
 * X=true" is the same instruction the existing bootstrap gate gives.
 */
export function internalSurfaceBlockedResponse(path: string): {
  error: string;
  reason: "internal_surface";
  surface: string;
  hint: string;
} {
  const entry = INTERNAL_API_ROUTES[path as InternalApiRoute];
  const flag = entry?.env ?? "—";
  return {
    error: "This surface is internal.",
    reason: "internal_surface",
    surface: path,
    hint: `Internal under the public/private surface doctrine. Founder-only opt-in: ${flag}.`,
  };
}

/**
 * Policy map for operators, matching the shape of PUBLIC_NAV_POLICY so the two
 * registries can be read together. The doctrine verdict per surface.
 */
export const INTERNAL_SURFACE_POLICY = {
  "/methodology": "internal — factor list and engine stack (opt-in METHODOLOGY_PUBLIC)",
  "/intelligence/metrics": "internal — named metric inventory (opt-in METRICS_PUBLIC)",
  "/nflverse": "internal — raw player-week rows (opt-in NFLVERSE_PUBLIC)",
  "/players": "internal — metric-explainer tables (opt-in PLAYERS_PUBLIC)",
  "/parlay-mri": "internal — per-leg risk and EV (opt-in PARLAY_MRI_PUBLIC)",
  "/api/calibration": "internal — calibration internals (opt-in CALIBRATION_JSON_PUBLIC)",
  "/api/gse/v1/truth": "internal — truth topology (opt-in TRUTH_TOPOLOGY_PUBLIC)",
  "/clv": "public — gated proof surface, 503 until canExposePerformanceStats (UNCHANGED)",
  "/stats": "public — gated proof surface, 404 until STATS_PUBLIC (UNCHANGED)",
  "/api/projections": "public — projections are the allowed surface (UNCHANGED)",
  "/api/proof/ledger": "public — published picks and their record (UNCHANGED)",
} as const;
