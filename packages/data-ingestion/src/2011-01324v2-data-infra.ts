/**
 * Valuing Player Actions in Counter-Strike: Global Offensive
 *
 * arXiv:2011.01324v2 · lane:data_infra · verdict:ADAPT · owner:Hermes
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Feed hygiene primitives: record normalization (string trimming, numeric-string coercion, null/empty
 * dropping with a dropped-key audit trail), required-field validation, and key-based deduplication
 * keeping the first occurrence.
 *
 * Improvement (wiring record): Event-level action valuation on nflverse play-by-play: train an XGBoost win-probability model on
 * 2016-2024 play states (down, distance, yardline, score diff, time, timeouts, spread-implied team
 * strength), add per-event credit by differencing consecutive-state WP at sub-play resolution where
 * charting data allows; adopt the paper's stability/independence/discrimination battery (split-half
 * correlation, correlation vs EPA baseline, bootstrap CIs per player, Fisher r-to-z) for any new GSE
 * player metric; bootstrap player value estimates (100-500 resamples) and publish per-player SD
 * alongside point estimates.
 *
 * ACCEPTANCE GATE: ADAPT the event-level WPA + bootstrap-uncertainty design if, on the 2024 test window: (a) the
 * XGBoost WP model beats logistic regression on log loss by >= 0.01 with a calibrated reliability
 * curve (max bin deviation <= 3pp); and (b) player WPA split-half correlation >= 0.35 and its
 * correlation with EPA/play < 0.90 (independence margin).
 *
 * Ingest role: feed hygiene (normalization, required-field validation, dedupe).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2011.01324v2" as const;
export const LANE = "data_infra" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT the event-level WPA + bootstrap-uncertainty design if, on the 2024 test window: (a) the XGBoost WP model beats logistic regression on log loss by >= 0.01 with a calibrated reliability curve (max bin deviation <= 3pp); and (b) player WPA split-half correlation >= 0.35 and its correlation with EPA/play < 0.90 (independence margin).`;

/** Disabled by default: additive utility only, never auto-wired into a live ingestion path. */
export const ENABLED = false as const;

export const CONFIG = {
  enabled: false,
  method: "feed record normalization + required-field validation + dedupe",
} as const;

const NUMERIC_RE = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;

/**
 * Normalize a raw feed record: trim strings, coerce numeric strings to numbers,
 * drop null/undefined/empty values. Returns the normalized record plus dropped keys.
 */
export function normalizeFeedRecord(
  raw: Record<string, unknown>,
): { record: Record<string, unknown>; dropped: string[] } | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const record: Record<string, unknown> = {};
  const dropped: string[] = [];
  for (const [k, v] of Object.entries(raw)) {
    if (v === null || v === undefined || v === "") {
      dropped.push(k);
      continue;
    }
    if (typeof v === "string") {
      const t = v.trim();
      if (t === "") {
        dropped.push(k);
        continue;
      }
      record[k] = NUMERIC_RE.test(t) ? Number(t) : t;
    } else {
      record[k] = v;
    }
  }
  return { record, dropped };
}

/** Required-field validation: returns the list of missing or empty keys. */
export function validateRequired(record: Record<string, unknown>, required: readonly string[]): string[] | null {
  if (typeof record !== "object" || record === null || Array.isArray(record)) return null;
  return required.filter((k) => {
    const v = record[k];
    return v === undefined || v === null || v === "";
  });
}

/** Deduplicate rows by key, keeping the first occurrence. */
export function dedupeByKey<T>(
  rows: readonly T[],
  key: (row: T) => string,
): { rows: T[]; duplicates: number } | null {
  if (!Array.isArray(rows) || typeof key !== "function") return null;
  const seen = new Set<string>();
  const out: T[] = [];
  let duplicates = 0;
  for (const r of rows) {
    const k = key(r);
    if (typeof k !== "string") return null;
    if (seen.has(k)) {
      duplicates++;
      continue;
    }
    seen.add(k);
    out.push(r);
  }
  return { rows: out, duplicates };
}
