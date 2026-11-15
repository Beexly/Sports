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
  readonly team?: string;
  readonly position?: string;
  readonly reason?: string;
}

export interface Stage0Config {
  readonly schema?: string;
  readonly season?: number;
  readonly week: number;
  readonly as_of?: string;
  readonly generated_utc?: string;
  readonly max_age_days?: number;
  readonly blocked_statuses?: readonly string[];
  readonly excluded_players: readonly (Stage0ExcludedPlayer | string)[];
  readonly traded_players?: readonly {
    readonly name: string;
    readonly from: string;
    readonly to: string;
    readonly date: string;
    readonly note?: string;
  }[];
  readonly confirmed_qb1: Readonly<Record<string, string>>;
  readonly situational_flags?: Readonly<Record<string, string>>;
  readonly return_from_ir?: Readonly<Record<string, any>>;
  readonly effective_role_snap_share?: Readonly<Record<string, number>>;
  readonly sealed_started_teams?: readonly string[];
  readonly unstarted_pre_teams?: readonly string[];
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
  const dateStr = cfg.as_of ?? (cfg.generated_utc ? cfg.generated_utc.split("T")[0] : undefined);
  if (dateStr) {
    const asOf = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00Z`);
    const ageDays = Math.floor((now.getTime() - asOf.getTime()) / 86_400_000);
    const maxAge = cfg.max_age_days ?? 3;
    if (ageDays > maxAge) {
      throw new PreflightRosterGateError(
        `roster config as_of ${dateStr} is ${ageDays} days old (max ${maxAge}); refresh transactions/injuries first`,
      );
    }
  }

  // Disjointness check: confirmed_qb1 must never clash with excluded_players
  for (const [team, qb] of Object.entries(cfg.confirmed_qb1 ?? {})) {
    if (!qb) continue;
    const normQb = normName(qb);
    for (const ep of cfg.excluded_players ?? []) {
      const epName = typeof ep === "string" ? ep : ep.name;
      if (normName(epName) === normQb) {
        throw new PreflightRosterGateError(
          `confirmed_qb1 for ${team} (${qb}) is listed in excluded_players`,
        );
      }
    }
  }

  return cfg;
}

/** Teams whose QB1 slot is vacated by an excluded (OUT/IR/season-ending) QB. */
export function teamsWithQb1Out(cfg: Stage0Config): ReadonlyMap<string, readonly string[]> {
  const m = new Map<string, string[]>();
  for (const p of cfg.excluded_players ?? []) {
    const pos = (typeof p === "string" ? "" : (p.position ?? "")).toUpperCase();
    if (pos !== "QB") continue;
    const team = typeof p === "string" ? "" : (p.team ?? "");
    const name = typeof p === "string" ? p : p.name;
    if (!team) continue;
    const arr = m.get(team) ?? [];
    arr.push(name);
    m.set(team, arr);
  }
  return m;
}

/** Throws if `names` contains any excluded or traded-away player. */
export function assertNamesClean(names: readonly string[], cfg: Stage0Config): void {
  const blocked = new Set<string>([
    ...(cfg.excluded_players ?? []).map((p) => normName(typeof p === "string" ? p : p.name)),
    ...(cfg.traded_players ?? []).map((p) => normName(p.name)),
  ]);
  const bad = names.filter((n) => blocked.has(normName(n)));
  if (bad.length > 0) {
    throw new PreflightRosterGateError(`output contains blocked players: ${bad.join(", ")}`);
  }
}
