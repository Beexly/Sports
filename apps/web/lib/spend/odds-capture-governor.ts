/**
 * Odds API — quota-governed evidence capture (Phase 2 of the launch-lock program).
 *
 * The Odds API key is ALREADY present in the deployment. Its free tier is a hard
 * cap of ~500 credits/month across all sports (1 credit per market per region per
 * snapshot). The danger is not cost-per-call — it is burning the monthly free quota
 * with broad fan-out. This governor makes that impossible by deciding, per cycle,
 * the SMALLEST safe capture that stays inside a conservative slice of the quota.
 *
 * Scope is deliberately narrow (the launch-lock contract):
 *   - ONE sport at a time (the in-season primary), never a broad fan-out.
 *   - ONE region (`us`).
 *   - h2h / spreads / totals ONLY — no props, no alternate markets, no historical.
 *   - Internal evidence only: the captured snapshots feed CLV / line-replay /
 *     edge-reliability / no-bet / autopsy / calibration. They are NOT a public feed.
 *
 * Pure module: it makes NO network calls and never reads the key's VALUE — only its
 * presence. It returns a plan; the existing ingestion runner executes within it.
 *
 * Modes (env `ODDS_API_CAPTURE_MODE`, default HEALTH_ONLY when the key is present):
 *   OFF             — no calls at all.
 *   HEALTH_ONLY     — only the credit-free `/v4/sports` liveness ping; 0 credits.
 *   WATCHLIST_ONLY  — capture the single in-season primary sport at a low cadence.
 *   CAPTURE_ACTIVE  — capture the single active sport at the budgeted cadence.
 *   CAP_REACHED     — terminal for the period; no further credit-spending calls.
 */

export type Env = Record<string, string | undefined>;

export type OddsCaptureMode =
  | "OFF"
  | "HEALTH_ONLY"
  | "WATCHLIST_ONLY"
  | "CAPTURE_ACTIVE"
  | "CAP_REACHED";

export const ODDS_CAPTURE_MODES: readonly OddsCaptureMode[] = [
  "OFF",
  "HEALTH_ONLY",
  "WATCHLIST_ONLY",
  "CAPTURE_ACTIVE",
  "CAP_REACHED",
];

/** The only markets we ever capture — facts the engine already consumes. */
export const CAPTURE_MARKETS = ["h2h", "spreads", "totals"] as const;
/** The only region we capture. */
export const CAPTURE_REGION = "us" as const;

/** The Odds API free-tier monthly credit cap (conservative default). */
export const DEFAULT_MONTHLY_CREDIT_CAP = 500;
/**
 * We only ever plan against a SAFETY SLICE of the cap so a miscount, a retry storm,
 * or an end-of-month edge can never blow the real quota. 80% leaves a 20% buffer.
 */
export const SAFETY_FRACTION = 0.8;

/** Credits a single full snapshot of one sport costs: markets × regions. */
export const CREDITS_PER_SNAPSHOT = CAPTURE_MARKETS.length * 1; // 3 markets × 1 region = 3

/** Per-mode cadence intent (max snapshots/day) — a planning ceiling, budget still wins. */
const MODE_MAX_SNAPSHOTS_PER_DAY: Record<OddsCaptureMode, number> = {
  OFF: 0,
  HEALTH_ONLY: 0, // the liveness ping is credit-free; not a snapshot
  WATCHLIST_ONLY: 4, // ~every 6h
  CAPTURE_ACTIVE: 12, // ~every 2h
  CAP_REACHED: 0,
};

/** Resolve the capture mode from env. Key absent ⇒ OFF; otherwise default HEALTH_ONLY. */
export function resolveCaptureMode(env: Env = process.env): OddsCaptureMode {
  const keyPresent = typeof env["THE_ODDS_API_KEY"] === "string" && env["THE_ODDS_API_KEY"]!.trim() !== "";
  if (!keyPresent) return "OFF";
  if ((env["ODDS_API_CAP_REACHED"] ?? "").trim().toLowerCase() === "true") return "CAP_REACHED";
  const raw = (env["ODDS_API_CAPTURE_MODE"] ?? "").trim().toUpperCase();
  if ((ODDS_CAPTURE_MODES as readonly string[]).includes(raw)) return raw as OddsCaptureMode;
  return "HEALTH_ONLY";
}

export interface CaptureBudget {
  /** Conservative monthly cap we plan against (cap × SAFETY_FRACTION). */
  readonly plannableCredits: number;
  /** Credits already used this period (from real usage tracking; default 0). */
  readonly usedCredits: number;
  /** Credits still available within the safety slice. */
  readonly remainingCredits: number;
  /** Whole days left in the current month (inclusive of today). */
  readonly daysRemaining: number;
  /** Credits we may spend per day to glide the remaining budget to month end. */
  readonly dailyCreditAllowance: number;
}

/** Whole days remaining in the UTC month, inclusive of `now`'s day. */
export function daysRemainingInMonth(now: Date = new Date()): number {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return lastDay - now.getUTCDate() + 1;
}

/** Compute the gliding daily credit allowance from real usage + the safety slice. */
export function computeBudget(
  opts: { monthlyCapCredits?: number; usedCredits?: number; now?: Date } = {},
): CaptureBudget {
  const cap = opts.monthlyCapCredits ?? DEFAULT_MONTHLY_CREDIT_CAP;
  const used = Math.max(0, opts.usedCredits ?? 0);
  const now = opts.now ?? new Date();
  const plannable = Math.floor(cap * SAFETY_FRACTION);
  const remaining = Math.max(0, plannable - used);
  const daysRemaining = Math.max(1, daysRemainingInMonth(now));
  const dailyAllowance = Math.floor(remaining / daysRemaining);
  return {
    plannableCredits: plannable,
    usedCredits: used,
    remainingCredits: remaining,
    daysRemaining,
    dailyCreditAllowance: dailyAllowance,
  };
}

export interface CapturePlan {
  readonly mode: OddsCaptureMode;
  /** True when at least one credit-spending snapshot is authorized this cycle. */
  readonly allowed: boolean;
  /** Snapshots authorized for THIS cycle (0 for OFF/HEALTH_ONLY/CAP_REACHED/over-budget). */
  readonly snapshotsThisCycle: number;
  /** Estimated credits this cycle (snapshots × CREDITS_PER_SNAPSHOT). */
  readonly estimatedCredits: number;
  /** The single sport key to capture (caller supplies the in-season primary), or null. */
  readonly sportKey: string | null;
  readonly markets: readonly string[];
  readonly region: string;
  /** Whether the credit-free liveness ping should run this cycle. */
  readonly runHealthPing: boolean;
  /** Human explanation for the cockpit. */
  readonly reason: string;
  readonly budget: CaptureBudget;
}

export interface PlanInput {
  /** The single in-season primary sport key (e.g. "americanfootball_nfl"), or null if none. */
  readonly primarySportKey: string | null;
  /** Cycles per day the runner executes (to split the daily allowance). Default 4. */
  readonly cyclesPerDay?: number;
  readonly monthlyCapCredits?: number;
  readonly usedCredits?: number;
  readonly now?: Date;
  readonly env?: Env;
}

/**
 * Plan a single capture cycle. Returns the smallest safe action for the current mode
 * and budget. Never authorizes more than the gliding per-cycle credit allowance, never
 * more than one sport, never anything outside h2h/spreads/totals on the `us` region.
 */
export function planOddsCapture(input: PlanInput): CapturePlan {
  const env = input.env ?? process.env;
  const mode = resolveCaptureMode(env);
  const cyclesPerDay = Math.max(1, input.cyclesPerDay ?? 4);
  const budget = computeBudget({
    monthlyCapCredits: input.monthlyCapCredits,
    usedCredits: input.usedCredits,
    now: input.now,
  });

  const base = {
    mode,
    markets: CAPTURE_MARKETS,
    region: CAPTURE_REGION,
    budget,
    sportKey: null as string | null,
  };

  if (mode === "OFF") {
    return { ...base, allowed: false, snapshotsThisCycle: 0, estimatedCredits: 0, runHealthPing: false, reason: "Capture is OFF (no key, or explicitly disabled)." };
  }
  if (mode === "CAP_REACHED") {
    return { ...base, allowed: false, snapshotsThisCycle: 0, estimatedCredits: 0, runHealthPing: false, reason: "Monthly credit cap reached — no further credit-spending calls this period." };
  }
  if (mode === "HEALTH_ONLY") {
    return { ...base, allowed: false, snapshotsThisCycle: 0, estimatedCredits: 0, runHealthPing: true, reason: "HEALTH_ONLY — credit-free liveness ping only; no snapshots." };
  }

  // WATCHLIST_ONLY / CAPTURE_ACTIVE — capture the single primary sport, budget-gated.
  if (!input.primarySportKey) {
    return { ...base, allowed: false, snapshotsThisCycle: 0, estimatedCredits: 0, runHealthPing: true, reason: "No in-season primary sport — nothing to capture this cycle." };
  }
  if (budget.remainingCredits < CREDITS_PER_SNAPSHOT) {
    return { ...base, allowed: false, snapshotsThisCycle: 0, estimatedCredits: 0, runHealthPing: true, reason: "Budget exhausted for the period — holding to protect the free quota." };
  }

  // Per-cycle credit allowance = today's gliding allowance split across cycles.
  const perCycleCredits = Math.floor(budget.dailyCreditAllowance / cyclesPerDay);
  const byBudget = Math.floor(perCycleCredits / CREDITS_PER_SNAPSHOT);
  const byCadence = Math.floor(MODE_MAX_SNAPSHOTS_PER_DAY[mode] / cyclesPerDay);
  // Always permit at least one snapshot if any budget remains and cadence allows the mode.
  const cadenceFloor = MODE_MAX_SNAPSHOTS_PER_DAY[mode] > 0 ? 1 : 0;
  const snapshots = Math.max(cadenceFloor, Math.min(byBudget, Math.max(byCadence, cadenceFloor)));
  const capped = Math.min(snapshots, Math.floor(budget.remainingCredits / CREDITS_PER_SNAPSHOT));
  const estimatedCredits = capped * CREDITS_PER_SNAPSHOT;

  return {
    ...base,
    sportKey: input.primarySportKey,
    allowed: capped > 0,
    snapshotsThisCycle: capped,
    estimatedCredits,
    runHealthPing: false,
    reason:
      capped > 0
        ? `${mode}: capturing ${input.primarySportKey} (${CAPTURE_MARKETS.join("/")}, ${CAPTURE_REGION}) — ${capped} snapshot(s), ~${estimatedCredits} credits, within the ${budget.dailyCreditAllowance}/day glide.`
        : "Within budget but cadence/credits resolve to zero snapshots this cycle.",
  };
}
