/**
 * STAGE 0 - Pre-flight live roster, transaction, starter & injury gate (TypeScript mirror).
 *
 * Reads the SAME source of truth as scripts/ops/preflight_live_roster_injury_gate.py
 * (data/nflverse/week9_live_roster_transactions_and_starters_2026.json). Runs before any
 * pick / prop / SGP / simulation. Throws on stale config; never silently continues.
 */
import * as fs from "node:fs";

export interface Stage0ExcludedPlayer {
  readonly name: string;
  readonly team: string;
  readonly position?: string;
  readonly reason: string;
}

export interface Stage0Config {
  readonly week: number;
  readonly as_of: string;
  readonly max_age_days: number;
  readonly blocked_statuses: readonly string[];
  readonly excluded_players: readonly Stage0ExcludedPlayer[];
  readonly traded_players: readonly {
    readonly name: string;
    readonly from: string;
    readonly to: string;
    readonly date: string;
    readonly note?: string;
  }[];
  readonly confirmed_qb1: Readonly<Record<string, string>>;
  readonly situational_flags?: Readonly<Record<string, string>>;
}

export class PreflightRosterGateError extends Error {
  constructor(message: string) {
    super(`[STAGE 0] ${message}`);
    this.name = "PreflightRosterGateError";
  }
}

export const normName = (s: string): string =>
  s.toLowerCase().replace(/\./g, "").split(/\s+/).filter(Boolean).join(" ");

export function loadStage0Config(configPath: string, now: Date = new Date()): Stage0Config {
  if (!fs.existsSync(configPath)) {
    throw new PreflightRosterGateError(`roster config missing: ${configPath}`);
  }
  const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8")) as Stage0Config;
  const asOf = new Date(`${cfg.as_of}T00:00:00Z`);
  const ageDays = Math.floor((now.getTime() - asOf.getTime()) / 86_400_000);
  if (ageDays > cfg.max_age_days) {
    throw new PreflightRosterGateError(
      `roster config as_of ${cfg.as_of} is ${ageDays} days old (max ${cfg.max_age_days}); refresh transactions/injuries first`,
    );
  }
  return cfg;
}

/** Teams whose QB1 slot is vacated by an excluded (OUT/IR/season-ending) QB. */
export function teamsWithQb1Out(cfg: Stage0Config): ReadonlyMap<string, readonly string[]> {
  const m = new Map<string, string[]>();
  for (const p of cfg.excluded_players) {
    if ((p.position ?? "").toUpperCase() !== "QB") continue;
    const arr = m.get(p.team) ?? [];
    arr.push(p.name);
    m.set(p.team, arr);
  }
  return m;
}

/** Throws if `names` contains any excluded or traded-away player. */
export function assertNamesClean(names: readonly string[], cfg: Stage0Config): void {
  const blocked = new Set<string>([
    ...cfg.excluded_players.map((p) => normName(p.name)),
    ...cfg.traded_players.map((p) => normName(p.name)),
  ]);
  const bad = names.filter((n) => blocked.has(normName(n)));
  if (bad.length > 0) {
    throw new PreflightRosterGateError(`output contains blocked players: ${bad.join(", ")}`);
  }
}
