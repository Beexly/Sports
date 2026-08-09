/**
 * Dual public board surfaces — kill switch policy.
 *
 * market  — book lines; oddsInserted>0 within Refresh SLA
 * signal  — model signals; slate/pick generation freshness; NEVER book labels
 *
 * Auto: if PUBLIC_BOARD_SURFACE unset and odds not fresh → signal (FOUNDING open without warm books).
 * Explicit PUBLIC_BOARD_SURFACE=market|signal overrides.
 * LIVE_BOARD always odds-fresh independently.
 */

export type BoardSurface = "market" | "signal";
export type EnvMap = Record<string, string | undefined>;

export function resolveBoardSurface(
  env: EnvMap = process.env,
  options?: { readonly oddsFresh?: boolean | null },
): BoardSurface {
  const v = env["PUBLIC_BOARD_SURFACE"]?.trim().toLowerCase();
  if (v === "signal" || v === "model" || v === "model_signal") return "signal";
  if (v === "market" || v === "odds" || v === "book") return "market";
  // Auto: no explicit env → signal when odds not fresh (or unknown); market when fresh
  if (options?.oddsFresh === true) return "market";
  return "signal";
}

export function boardSurfacePosture(
  env: EnvMap = process.env,
  options?: { readonly oddsFresh?: boolean | null },
): {
  readonly surface: BoardSurface;
  readonly killSwitch: "odds_fresh" | "slate_fresh";
  readonly lineLabel: "book_or_exchange" | "model_signal";
  readonly operatorHint: string;
  readonly auto: boolean;
} {
  const explicit = Boolean(env["PUBLIC_BOARD_SURFACE"]?.trim());
  const surface = resolveBoardSurface(env, options);
  if (surface === "signal") {
    return {
      surface,
      killSwitch: "slate_fresh",
      lineLabel: "model_signal",
      auto: !explicit,
      operatorHint:
        "Signal board: model picks without requiring live book odds. Lines labeled model-signal only. Odds key still for market board / edge when available.",
    };
  }
  return {
    surface: "market",
    killSwitch: "odds_fresh",
    lineLabel: "book_or_exchange",
    auto: !explicit,
    operatorHint:
      "Market board: dark when odds insert outside Refresh SLA. Never invent book prices.",
  };
}
