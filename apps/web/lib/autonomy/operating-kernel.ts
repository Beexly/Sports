/**
 * GSE Autonomous Operating Kernel — pure, deterministic, founder-safe.
 *
 * Mission: self-correct, self-prioritize, self-introspect under refuse-default.
 * Never flips LIVE_BOARD / PUBLISH_LEDGER / PUBLIC_PICKS / PERFORMANCE_STATS.
 * Never invents scores. Never auto-publishes. Never places bets.
 *
 * Input: live capability probes + settlement health + optional RCA/STP summary.
 * Output: ordered action plan, severity, introspective assessment, learning hooks.
 *
 * This is the control plane for "what should the system do next right now?"
 */

import type { SettlementHealthBand } from "@/lib/performance/settlement-health";
import type { SettlementRootCauseCode } from "@/lib/settlement/root-cause-analysis";

export type AutonomySeverity = "P0" | "P1" | "P2" | "P3" | "OK";

export type AutonomyActionKind =
  | "RUN_FREE_SETTLE"
  | "RUN_FREE_SPINE_HEALTH"
  | "RUN_REFRESH_ODDS_FREE"
  | "RUN_GENERATE_DRAFTS"
  | "RUN_CALIBRATION_METRICS"
  // Referenced by EXECUTABLE_CRON_TARGETS in execute-autonomy-cycle.ts and
  // already approved in AUTONOMY_SAFE_CRON_TARGETS, but never added here — so
  // the map entry failed `satisfies Partial<Record<AutonomyActionKind, string>>`.
  // NOTE: planAutonomyCycle does not emit this kind yet, so the entry stays
  // unreachable at runtime; this only makes the half-landed wiring type-legal.
  | "RUN_GENERATE_SIGNAL_SLATE"
  | "ATTACK_RCA_WAVE_A"
  | "ATTACK_RCA_WAVE_B"
  | "ESCALATE_DISPUTES"
  | "FIX_PATH_MISCONFIG"
  | "HOLD_PUBLIC_GATES"
  | "ACCUMULATE_SETTLED_SAMPLE"
  | "RECORD_LEARNING"
  | "UPDATE_OPS_TRUTH"
  | "NO_OP_HEALTHY";

export interface AutonomyAction {
  readonly kind: AutonomyActionKind;
  readonly priority: number;
  readonly severity: AutonomySeverity;
  readonly title: string;
  readonly detail: string;
  /** Machine-routable target (cron path, module, or human). */
  readonly target: string;
  /** True only when a human/owner must decide — never auto-execute. */
  readonly requiresOwner: boolean;
  /** Safe for unattended cron / agent loop. */
  readonly autonomousSafe: boolean;
}

export interface AutonomyObservation {
  readonly observedAt: string;
  readonly deploymentSha: string | null;
  readonly databaseOk: boolean;
  readonly ingestionOk: boolean;
  readonly ingestionAgeMinutes: number | null;
  /**
   * Age of durable free-spine snap in minutes (I3/I8).
   * null = missing/unreadable; undefined = observer did not probe (legacy).
   * SLA = FREE_SPINE_SLA_MINUTES (120).
   */
  readonly freeSpineAgeMinutes?: number | null;
  readonly settlementBand: SettlementHealthBand | "UNKNOWN";
  readonly settlementOverdue: number | null;
  readonly settlementCommenced: number | null;
  readonly topRcaCause: SettlementRootCauseCode | null;
  readonly rcaHeadline: string | null;
  readonly stpAutoEligible: number | null;
  readonly stpExceptions: number | null;
  readonly burnDraining: boolean | null;
  readonly liveBoardEnabled: boolean;
  readonly publicPicksEnabled: boolean;
  readonly performanceStatsEnabled: boolean;
  readonly publishLedgerEnabled: boolean;
  readonly draftOnly: boolean;
  readonly boardSuppressed: boolean;
  readonly openPicks: number | null;
  readonly canonicalSettled: number | null;
  readonly minSettledForLearning: number;
}

/** I8 SLA: free-spine durable snap age ceiling (minutes). */
export const FREE_SPINE_SLA_MINUTES = 120;

export interface AutonomyIntrospection {
  readonly honestyScore: number; // 0..100
  readonly selfDescription: string;
  readonly contradictions: readonly string[];
  readonly growthEdges: readonly string[];
  readonly refuseDefaultHeld: boolean;
}

export interface AutonomyPlan {
  readonly version: "gse-autonomy-v1";
  readonly severity: AutonomySeverity;
  readonly headline: string;
  readonly actions: readonly AutonomyAction[];
  readonly autonomousQueue: readonly AutonomyAction[];
  readonly ownerQueue: readonly AutonomyAction[];
  readonly introspection: AutonomyIntrospection;
  readonly learningDirectives: readonly string[];
  readonly revenueReadiness: {
    readonly trackRecordReady: boolean;
    readonly publicSurfaceBlocked: boolean;
    readonly blockers: readonly string[];
    readonly nextRevenueMilestone: string;
  };
}

function sevRank(s: AutonomySeverity): number {
  switch (s) {
    case "P0":
      return 0;
    case "P1":
      return 1;
    case "P2":
      return 2;
    case "P3":
      return 3;
    default:
      return 4;
  }
}

function worse(a: AutonomySeverity, b: AutonomySeverity): AutonomySeverity {
  return sevRank(a) <= sevRank(b) ? a : b;
}

/**
 * Pure autonomy planner. Call from crons, cockpits, agents — same inputs → same plan.
 */
export function planAutonomyCycle(obs: AutonomyObservation): AutonomyPlan {
  const actions: AutonomyAction[] = [];
  let severity: AutonomySeverity = "OK";

  // ── Settlement (P0 when critically behind) ─────────────────────────────
  if (obs.settlementBand === "CRITICAL" || (obs.settlementOverdue ?? 0) >= 5) {
    severity = worse(severity, "P0");
    actions.push({
      kind: "RUN_FREE_SETTLE",
      priority: 1000,
      severity: "P0",
      title: "Drain settlement backlog (free-path settle-picks)",
      detail: `Settlement ${obs.settlementBand}: ${obs.settlementOverdue ?? "?"} overdue of ${obs.settlementCommenced ?? "?"} commenced. Trigger free settle with STP priority.`,
      target: "/api/cron/settle-picks",
      requiresOwner: false,
      autonomousSafe: true,
    });
    actions.push({
      kind: "ATTACK_RCA_WAVE_A",
      priority: 950,
      severity: "P0",
      title: "Attack Wave A RCA causes (no score / reprocess)",
      detail: obs.rcaHeadline ?? `Top cause: ${obs.topRcaCause ?? "OVERDUE_NO_SCORE"}. Re-run free scores then settle.`,
      target: "settlement:rca:wave-A",
      requiresOwner: false,
      autonomousSafe: true,
    });
  } else if (obs.settlementBand === "DEGRADED" || (obs.settlementOverdue ?? 0) > 0) {
    severity = worse(severity, "P1");
    actions.push({
      kind: "RUN_FREE_SETTLE",
      priority: 800,
      severity: "P1",
      title: "Clear degraded settlement backlog",
      detail: `${obs.settlementOverdue} overdue pending — free settle before CLV starves.`,
      target: "/api/cron/settle-picks",
      requiresOwner: false,
      autonomousSafe: true,
    });
  }

  if ((obs.stpExceptions ?? 0) > 0) {
    severity = worse(severity, "P1");
    actions.push({
      kind: "ESCALATE_DISPUTES",
      priority: 700,
      severity: "P1",
      title: "Escalate STP exception queue",
      detail: `${obs.stpExceptions} exception(s) (DISPUTED / orient / path) need human evidence — never force-settle.`,
      target: "settlement:stp:exception-queue",
      requiresOwner: true,
      autonomousSafe: false,
    });
  }

  if (obs.topRcaCause === "PATH_MISCONFIG") {
    severity = worse(severity, "P0");
    actions.push({
      kind: "FIX_PATH_MISCONFIG",
      priority: 990,
      severity: "P0",
      title: "Remove/blank THE_ODDS_API_KEY for free path",
      detail: "Present+deactivated odds key blocks free STP. Key must be absent for path:free.",
      target: "env:THE_ODDS_API_KEY",
      requiresOwner: true,
      autonomousSafe: false,
    });
  }

  if (obs.topRcaCause === "TEAM_ORIENT_FAIL") {
    severity = worse(severity, "P1");
    actions.push({
      kind: "ATTACK_RCA_WAVE_B",
      priority: 650,
      severity: "P1",
      title: "Fix team identity normalisation (Wave B)",
      detail: "Finals found but orient failed — alias debt. Patch normalizeTeamToken coverage.",
      target: "apps/web/lib/data-sources/score-verification.ts",
      requiresOwner: false,
      autonomousSafe: false,
    });
  }

  // ── Ingestion freshness + free-spine durable SLA (I2/I3/I8) ─────────────
  // I2: stale/failed ingestion → free-spine-health stamps SUCCESS IngestionRun.
  // I8: durable free-spine snap age > 120m (or missing) → same autonomous act.
  {
    const spineAge = obs.freeSpineAgeMinutes;
    const spineMissing = spineAge === null; // explicit null only; undefined = not probed
    const spineStale =
      typeof spineAge === "number" && spineAge > FREE_SPINE_SLA_MINUTES;
    const ingestionStale =
      !obs.ingestionOk ||
      (obs.ingestionAgeMinutes !== null && obs.ingestionAgeMinutes > 90);

    if (ingestionStale || spineStale || spineMissing) {
      const spineSev: AutonomySeverity =
        typeof spineAge === "number" && spineAge > 360
          ? "P0"
          : spineMissing || spineStale
            ? "P1"
            : obs.ingestionAgeMinutes !== null && obs.ingestionAgeMinutes > 360
              ? "P0"
              : "P1";
      severity = worse(severity, spineSev);
      const spineDetail = spineMissing
        ? "No durable free-spine snap (I3 cold isolate / never probed) — run free-spine-health."
        : spineStale
          ? `Free-spine durable age ${spineAge}m exceeds ${FREE_SPINE_SLA_MINUTES}m SLA (I8).`
          : `Ingestion age ${obs.ingestionAgeMinutes ?? "?"}m — write durable SUCCESS IngestionRun via free-spine-health.`;
      actions.push({
        kind: "RUN_FREE_SPINE_HEALTH",
        priority: 900,
        severity: spineSev,
        title: "Refresh free-spine ingestion health",
        detail: spineDetail,
        target: "/api/cron/free-spine-health",
        requiresOwner: false,
        autonomousSafe: true,
      });
    }
  }

  // Public picks kill switch. FORCE_NO_BET_IF_STALE is a SEPARATE, independent
  // flag — it does NOT auto-arm with PUBLIC_PICKS. platform-config.ts reads it
  // straight from the env with default false, and public-freshness-gate.ts is
  // only ever consulted when getReadinessGates().forceNoBetIfStale is true. So
  // PUBLIC_PICKS on with FORCE_NO_BET_IF_STALE off performs NO freshness check
  // and stale picks stay publishable — the two must be flipped together.
  // (An earlier version of this comment claimed "auto-on with PUBLIC_PICKS";
  // that was wrong, and believing it is how a stale board ships.)
  //
  // Once armed, the gate requires an IngestionRun SUCCESS with oddsInserted > 0
  // within the 240m Refresh SLA. free-spine SUCCESS alone is NOT enough (G4
  // empty-odds trap), so a freshly-flipped surface stays dark until the paid
  // odds path runs — keep it warm via allow-listed refresh-odds.
  if (obs.publicPicksEnabled) {
    severity = worse(severity, "P1");
    actions.push({
      kind: "RUN_REFRESH_ODDS_FREE",
      priority: 880,
      severity: "P1",
      title: "Refresh odds for public-picks kill switch",
      detail:
        "PUBLIC_PICKS open — surface stays dark until odds-inserting SUCCESS within 240m. " +
        "Invoke refresh-odds (may spend THE_ODDS_API_KEY). free-spine SLA alone cannot clear this gate.",
      target: "/api/cron/refresh-odds",
      requiresOwner: false,
      autonomousSafe: true,
    });
  }

  if (!obs.databaseOk) {
    severity = worse(severity, "P0");
    actions.push({
      kind: "UPDATE_OPS_TRUTH",
      priority: 1100,
      severity: "P0",
      title: "Database probe failed",
      detail: "Primary DB unhealthy — all money paths must refuse. Restore Neon connectivity before any settle.",
      target: "capability:database",
      requiresOwner: true,
      autonomousSafe: false,
    });
  }

  // ── Law / refuse-default (always reinforce when public surfaces look tempting) ─
  if (obs.liveBoardEnabled || obs.publicPicksEnabled || obs.performanceStatsEnabled || obs.publishLedgerEnabled) {
    // If any public gate is open while settlement critical or board suppressed — hold
    if (obs.settlementBand === "CRITICAL" || obs.boardSuppressed || !obs.databaseOk) {
      severity = worse(severity, "P0");
      actions.push({
        kind: "HOLD_PUBLIC_GATES",
        priority: 1050,
        severity: "P0",
        title: "Hold/revert public gates — honesty violated",
        detail: "Public gate open while settlement/board/db unsafe. Refuse-default: close public fire.",
        target: "gates:LIVE_BOARD|PUBLIC_PICKS|PERFORMANCE_STATS|PUBLISH_LEDGER",
        requiresOwner: true,
        autonomousSafe: false,
      });
    }
  } else {
    actions.push({
      kind: "HOLD_PUBLIC_GATES",
      priority: 10,
      severity: "OK",
      title: "Refuse-default held (public gates closed)",
      detail: "LIVE_BOARD/PUBLIC_PICKS/PERFORMANCE_STATS/PUBLISH_LEDGER closed — correct while sample/settlement incomplete.",
      target: "gates:status",
      requiresOwner: false,
      autonomousSafe: true,
    });
  }

  // ── Learning / sample accumulation ─────────────────────────────────────
  const settled = obs.canonicalSettled ?? 0;
  if (settled < obs.minSettledForLearning) {
    severity = worse(severity, settled === 0 ? "P1" : "P2");
    actions.push({
      kind: "ACCUMULATE_SETTLED_SAMPLE",
      priority: 400,
      severity: settled === 0 ? "P1" : "P2",
      title: `Accumulate settled sample (${settled}/${obs.minSettledForLearning})`,
      detail: "Pricing ladder PROVEN step needs ≥100 settled + published calibration. Drain backlog; do not fabricate.",
      target: "learning:settled-sample",
      requiresOwner: false,
      autonomousSafe: true,
    });
  }

  if (obs.burnDraining === false && (obs.settlementOverdue ?? 0) > 0) {
    severity = worse(severity, "P1");
    actions.push({
      kind: "RECORD_LEARNING",
      priority: 500,
      severity: "P1",
      title: "Backlog not draining — fix top RCA before more volume",
      detail: "Net burn ≤ 0. Gate inflow of new overdue and attack Pareto #1 cause.",
      target: "settlement:burn-rate",
      requiresOwner: false,
      autonomousSafe: true,
    });
  }

  // ── Allow-listed housekeeping (never flips gates; fills remaining maxActions) ─
  actions.push({
    kind: "RUN_CALIBRATION_METRICS",
    priority: 120,
    severity: "P3",
    title: "Refresh calibration metrics + versioned map",
    detail: "Internal-only Brier/ECE/reliability fit. Does not publish or flip CALIBRATION_ADJUSTMENTS.",
    target: "/api/cron/calibration-metrics",
    requiresOwner: false,
    autonomousSafe: true,
  });
  actions.push({
    kind: "RUN_GENERATE_DRAFTS",
    priority: 100,
    severity: "P3",
    title: "Generate content drafts (free-lane first)",
    detail: "Jynx free-lane drafts only; never auto-publishes public blog/picks claims.",
    target: "/api/cron/generate-drafts",
    requiresOwner: false,
    autonomousSafe: true,
  });

  if (actions.filter((a) => a.severity !== "OK").length === 0) {
    actions.push({
      kind: "NO_OP_HEALTHY",
      priority: 0,
      severity: "OK",
      title: "No P0/P1 autonomy work",
      detail: "Core probes healthy under closed public gates. Continue free-spine + settle cadence; update ops truth.",
      target: "autonomy:idle",
      requiresOwner: false,
      autonomousSafe: true,
    });
  }

  // Always keep ops truth fresh when docs lag production
  actions.push({
    kind: "UPDATE_OPS_TRUTH",
    priority: 50,
    severity: "P3",
    title: "Refresh CURRENT_STATE from live probes",
    detail: "Docs must not claim July state while Aug production differs. Snapshot health + deployment SHA.",
    target: "docs/ops/CURRENT_STATE.md",
    requiresOwner: false,
    autonomousSafe: true,
  });

  actions.sort((a, b) => b.priority - a.priority);

  const introspection = introspect(obs, severity, actions);
  const learningDirectives = buildLearningDirectives(obs, actions);
  const revenueReadiness = buildRevenueReadiness(obs);

  const headline =
    severity === "OK"
      ? "Autonomy: system stable under refuse-default; continue free cadence + sample accumulation."
      : `Autonomy ${severity}: ${actions.find((a) => a.severity === severity)?.title ?? "act on top priority"}.`;

  return {
    version: "gse-autonomy-v1",
    severity,
    headline,
    actions,
    autonomousQueue: actions.filter((a) => a.autonomousSafe && a.severity !== "OK"),
    ownerQueue: actions.filter((a) => a.requiresOwner),
    introspection,
    learningDirectives,
    revenueReadiness,
  };
}

function introspect(
  obs: AutonomyObservation,
  severity: AutonomySeverity,
  actions: readonly AutonomyAction[],
): AutonomyIntrospection {
  const contradictions: string[] = [];
  if (obs.liveBoardEnabled && obs.boardSuppressed) {
    contradictions.push("LIVE_BOARD on but board SUPPRESSED_STALE — public fire would be dishonest.");
  }
  if (obs.performanceStatsEnabled && (obs.canonicalSettled ?? 0) < obs.minSettledForLearning) {
    contradictions.push("PERFORMANCE_STATS on below learning floor — claims risk.");
  }
  if (obs.settlementBand === "CRITICAL" && (obs.openPicks ?? 0) > 0) {
    contradictions.push("Publishing posture with critical settlement — track record incomplete.");
  }
  if (obs.ingestionOk && obs.settlementBand === "CRITICAL") {
    contradictions.push("Ingestion healthy while settlement critical — settle path / matching gap, not data absence.");
  }

  const growthEdges: string[] = [];
  if ((obs.canonicalSettled ?? 0) < obs.minSettledForLearning) {
    growthEdges.push("Grow canonical settled sample without inventing outcomes.");
  }
  if (obs.topRcaCause) {
    growthEdges.push(`Automate remediation for top RCA: ${obs.topRcaCause}.`);
  }
  if (
    obs.freeSpineAgeMinutes === null ||
    (typeof obs.freeSpineAgeMinutes === "number" && obs.freeSpineAgeMinutes > FREE_SPINE_SLA_MINUTES)
  ) {
    growthEdges.push("Close free-spine durable SLA loop (I3/I8) via free-spine-health.");
  }
  growthEdges.push("Keep autonomy plans pure + test-backed; wire more crons into autonomousQueue safely.");

  let honesty = 100;
  honesty -= contradictions.length * 15;
  if (severity === "P0") honesty -= 25;
  else if (severity === "P1") honesty -= 12;
  if (!obs.draftOnly && obs.liveBoardEnabled) honesty -= 10;
  if (typeof obs.freeSpineAgeMinutes === "number" && obs.freeSpineAgeMinutes > FREE_SPINE_SLA_MINUTES) {
    honesty -= 8;
  } else if (obs.freeSpineAgeMinutes === null) {
    honesty -= 5;
  }
  honesty = Math.max(0, Math.min(100, honesty));

  const refuseDefaultHeld =
    !obs.liveBoardEnabled &&
    !obs.publicPicksEnabled &&
    !obs.performanceStatsEnabled &&
    !obs.publishLedgerEnabled;

  return {
    honestyScore: honesty,
    selfDescription:
      `GSE autonomy observes DB/ingestion/settlement/gates. Severity ${severity}. ` +
      `${actions.length} actions planned (${actions.filter((a) => a.autonomousSafe).length} auto-safe). ` +
      (refuseDefaultHeld
        ? "Refuse-default held."
        : "Public gates open — verify evidence before any claim."),
    contradictions,
    growthEdges,
    refuseDefaultHeld,
  };
}

function buildLearningDirectives(
  obs: AutonomyObservation,
  actions: readonly AutonomyAction[],
): string[] {
  const out: string[] = [];
  if (actions.some((a) => a.kind === "RUN_FREE_SETTLE")) {
    out.push("After each settle cycle: persist RCA Pareto + burn rate; feed overdue residual into next plan.");
  }
  if ((obs.canonicalSettled ?? 0) > 0) {
    out.push("Export settled picks for offline calibration; never apply CALIBRATION_ADJUSTMENTS without floor + held-out proof.");
  }
  out.push("Log autonomy plan severity transitions as operator memory candidates (not auto-confirmed).");
  out.push("Treat skipped-green PG integration suites as unproven until GSE_REQUIRE_PG_INTEGRATION job exists.");
  return out;
}

function buildRevenueReadiness(obs: AutonomyObservation): AutonomyPlan["revenueReadiness"] {
  const blockers: string[] = [];
  if (obs.settlementBand === "CRITICAL" || obs.settlementBand === "DEGRADED") {
    blockers.push("Settlement not healthy — track record incomplete.");
  }
  if ((obs.canonicalSettled ?? 0) < obs.minSettledForLearning) {
    blockers.push(
      `Settled sample ${obs.canonicalSettled ?? 0}/${obs.minSettledForLearning} below PROVEN ladder floor.`,
    );
  }
  if (obs.boardSuppressed) blockers.push("Public board SUPPRESSED_STALE.");
  if (!obs.databaseOk) blockers.push("Database unhealthy.");

  const trackRecordReady =
    blockers.length === 0 && (obs.canonicalSettled ?? 0) >= obs.minSettledForLearning;

  return {
    trackRecordReady,
    publicSurfaceBlocked: !obs.liveBoardEnabled || !obs.publicPicksEnabled || blockers.length > 0,
    blockers,
    nextRevenueMilestone: trackRecordReady
      ? "Owner may consider proof-gated PERFORMANCE_STATS / packaging step-up after audit — not auto."
      : "Drain settlement + accumulate ≥100 canonical settled with published calibration path before any public performance claim.",
  };
}

/**
 * Merge autonomy headlines into Jarvis-style next actions (string list).
 * Pure adapter — does not mutate Jarvis assessment structure.
 */
export function autonomyActionsAsJarvisNext(
  plan: AutonomyPlan,
  limit = 5,
): string[] {
  return plan.actions
    .filter((a) => a.severity !== "OK" || a.kind === "HOLD_PUBLIC_GATES")
    .slice(0, limit)
    .map((a) => `[${a.severity}] ${a.title} → ${a.target}`);
}
