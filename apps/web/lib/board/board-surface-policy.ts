/**
 * Dual public board surfaces — kill switch policy.
 *
 * market  — book/exchange lines; requires oddsInserted>0 within Refresh SLA
 * signal  — model signals only; requires slate/pick generation freshness; NEVER labels as book lines
 *
 * Env: PUBLIC_BOARD_SURFACE=market|signal (default market for honesty with FORCE_NO_BET)
 * LIVE_BOARD still requires market/odds freshness independently.
 */

export type BoardSurface = "market" | "signal";

export type EnvMap = Record<string, string | undefined>;

export function resolveBoardSurface(env: EnvMap = process.env): BoardSurface {
  const v = env["PUBLIC_BOARD_SURFACE"]?.trim().toLowerCase();
  if (v === "signal" || v === "model" || v === "model_signal") return "signal";
  return "market";
}

export function boardSurfacePosture(env: EnvMap = process.env): {
  readonly surface: BoardSurface;
  readonly killSwitch: "odds_fresh" | "slate_fresh";
  readonly lineLabel: "book_or_exchange" | "model_signal";
  readonly operatorHint: string;
} {
  const surface = resolveBoardSurface(env);
  if (surface === "signal") {
    return {
      surface,
      killSwitch: "slate_fresh",
      lineLabel: "model_signal",
      operatorHint:
        "Signal board: model picks without requiring live book odds. Lines must be labeled model-signal — never book/exchange. Odds key still used for market board / edge when available.",
    };
  }
  return {
    surface: "market",
    killSwitch: "odds_fresh",
    lineLabel: "book_or_exchange",
    operatorHint:
      "Market board: public surface dark when odds insert outside Refresh SLA (oddsInserted>0). OddsProvider failover remains; never invent book prices.",
  };
}
