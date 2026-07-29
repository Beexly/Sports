/**
 * Phase C remeasure protocol — measurement only, no narrative ROI.
 * Baseline immutable until a real gate:phase-c run produces a new tuple.
 *
 * Two paths:
 * A) Odds path (founder-paid THE_ODDS_API_KEY + cron every 30m) — official (5b)
 * B) Non-book path (Gamma + model prior) — methodology CODE_READY, NOT a substitute claim for official (5b)
 *
 * Law: do not invent deltas; do not flip LIVE_BOARD; do not rewrite pav/ivap.
 */

export const PHASE_C_BASELINE = {
  tuple: "888|359|283|0|(5b)=0",
  verified: false as const,
  label: "UNVERIFIED",
  note: "Last known public Phase C board; (5b)=0 until measured",
} as const;

export type PhaseCTuple = {
  /** raw pipe string */
  raw: string;
  fields: {
    f1: number;
    f2: number;
    f3: number;
    f4: number;
    fiveB: number;
  };
  verified: boolean;
};

export type RemeasureEvidence = {
  path: "odds_api" | "non_book_gamma_model";
  oddsKeyPaid: boolean | null;
  cronRefreshOk: boolean | null;
  gateScriptRan: boolean;
  measuredAt: string | null;
  measuredTuple: string | null;
};

export type RemeasureReport =
  | {
      ok: true;
      baseline: typeof PHASE_C_BASELINE;
      now: PhaseCTuple;
      delta: Record<string, number>;
      path: RemeasureEvidence["path"];
      claimableAsOfficial5b: boolean;
    }
  | {
      ok: false;
      code: string;
      error: string;
      baseline: typeof PHASE_C_BASELINE;
      stillUnverified: true;
    };

export function parseTuple(raw: string): PhaseCTuple | null {
  // format: a|b|c|d|(5b)=n
  const m = raw.trim().match(
    /^(\d+)\|(\d+)\|(\d+)\|(\d+)\|\(5b\)=(\d+)$/,
  );
  if (!m) return null;
  return {
    raw: raw.trim(),
    fields: {
      f1: Number(m[1]),
      f2: Number(m[2]),
      f3: Number(m[3]),
      f4: Number(m[4]),
      fiveB: Number(m[5]),
    },
    verified: false,
  };
}

export function fieldDeltas(
  baseline: PhaseCTuple,
  now: PhaseCTuple,
): Record<string, number> {
  return {
    f1: now.fields.f1 - baseline.fields.f1,
    f2: now.fields.f2 - baseline.fields.f2,
    f3: now.fields.f3 - baseline.fields.f3,
    f4: now.fields.f4 - baseline.fields.f4,
    fiveB: now.fields.fiveB - baseline.fields.fiveB,
  };
}

/**
 * Record a remeasure. Without a measured tuple + gateScriptRan, refuse.
 * Non-book path never sets claimableAsOfficial5b=true.
 */
export function recordPhaseCRemeasure(ev: RemeasureEvidence): RemeasureReport {
  const baselineParsed = parseTuple(PHASE_C_BASELINE.tuple);
  if (!baselineParsed) {
    return {
      ok: false,
      code: "baseline_corrupt",
      error: "baseline tuple unparsable",
      baseline: PHASE_C_BASELINE,
      stillUnverified: true,
    };
  }

  if (!ev.gateScriptRan || !ev.measuredTuple || !ev.measuredAt) {
    return {
      ok: false,
      code: "not_measured",
      error:
        "No gate:phase-c measurement yet — keep UNVERIFIED; do not invent (5b)",
      baseline: PHASE_C_BASELINE,
      stillUnverified: true,
    };
  }

  if (ev.path === "odds_api" && ev.oddsKeyPaid !== true) {
    return {
      ok: false,
      code: "odds_key_unpaid",
      error: "Official odds path requires paid THE_ODDS_API_KEY evidence",
      baseline: PHASE_C_BASELINE,
      stillUnverified: true,
    };
  }

  const now = parseTuple(ev.measuredTuple);
  if (!now) {
    return {
      ok: false,
      code: "tuple_parse_fail",
      error: `cannot parse measured tuple: ${ev.measuredTuple}`,
      baseline: PHASE_C_BASELINE,
      stillUnverified: true,
    };
  }

  now.verified = ev.path === "odds_api" && ev.oddsKeyPaid === true;
  const claimableAsOfficial5b = now.verified;

  return {
    ok: true,
    baseline: PHASE_C_BASELINE,
    now,
    delta: fieldDeltas(baselineParsed, now),
    path: ev.path,
    claimableAsOfficial5b,
  };
}

/** Non-book methodology — for future independence metric, NOT official Phase C (5b). */
export const NON_BOOK_METHODOLOGY = {
  id: "phase_c_non_book_v0",
  qSources: ["polymarket_gamma", "model_prior"] as const,
  requiresOddsApi: false,
  replacesOfficial5b: false as const,
  steps: [
    "Collect dual-asOf settled cohort using Gamma + model prior as q",
    "Run same selective-gate kernel with width/n floors intact",
    "Report coverage tuple labeled NON_BOOK_SHADOW — never overwrite official (5b)",
    "Compare shadow vs official only after both measured",
  ],
  law: [
    "Shadow ≠ official Phase C",
    "No ROI narrative from shadow",
    "No pav/ivap rewrite",
    "No LIVE_BOARD flip",
  ],
} as const;

export function formatAgentReport(r: RemeasureReport): string {
  if (!r.ok) {
    return [
      `PHASE_C_BASELINE=${PHASE_C_BASELINE.tuple} ${PHASE_C_BASELINE.label}`,
      `PHASE_C_NOW=UNMEASURED UNVERIFIED`,
      `DELTA=n/a`,
      `CODE=${r.code}`,
      `ERROR=${r.error}`,
    ].join("\n");
  }
  return [
    `PHASE_C_BASELINE=${r.baseline.tuple} ${r.baseline.label}`,
    `PHASE_C_NOW=${r.now.raw} ${r.now.verified ? "VERIFIED" : "UNVERIFIED"}`,
    `DELTA=${JSON.stringify(r.delta)}`,
    `PATH=${r.path}`,
    `CLAIMABLE_OFFICIAL_5B=${r.claimableAsOfficial5b}`,
  ].join("\n");
}
