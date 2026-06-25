/**
 * NFL STAT UNIVERSE — Ingestion Cadence Planner.
 *
 * The organism observes at different rates depending on the moment. Shock mode observes MORE (it never
 * acts more — that's the runtime's job). A plan, not an executor: the worker/cron runs it. Pure.
 */

export type IngestMode = "normal_week" | "game_day" | "shock" | "pre_lock" | "post_settlement";

export interface CadencePlan {
  readonly mode: IngestMode;
  readonly intervalMinutes: number;
  readonly prioritySources: readonly string[];
  readonly note: string;
}

const PLANS: Readonly<Record<IngestMode, CadencePlan>> = {
  normal_week: { mode: "normal_week", intervalMinutes: 240, prioritySources: ["nflverse", "sleeper"], note: "Quiet week — refresh role + crowd a few times a day." },
  game_day: { mode: "game_day", intervalMinutes: 30, prioritySources: ["the_odds_api", "sportsgameodds", "nflverse"], note: "Game day — tighten market + inactives." },
  shock: { mode: "shock", intervalMinutes: 5, prioritySources: ["the_odds_api", "sportsgameodds", "nflverse", "sleeper"], note: "Role/injury shock — observe densely; the runtime still gates action." },
  pre_lock: { mode: "pre_lock", intervalMinutes: 2, prioritySources: ["the_odds_api", "sportsgameodds"], note: "Near lock — capture closing-line movement for CLV proof." },
  post_settlement: { mode: "post_settlement", intervalMinutes: 720, prioritySources: ["nflverse"], note: "After games — settle outcomes; feed the slow learning clock." },
};

export function planCadence(mode: IngestMode): CadencePlan {
  return PLANS[mode];
}
