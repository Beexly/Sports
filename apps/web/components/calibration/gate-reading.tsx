/**
 * Public "gate reading" for /calibration: the numbers the calibration
 * receipt is built on, read from the durable eligibility snap the cron
 * persists, with the floors beside them. This is the market-anchored
 * measurement (publish-time market price, MONEYLINE only, in-play and
 * unpriceable rows excluded and counted), not the confidence-bucket chart.
 *
 * Honesty rules, in code:
 *   - No snap: renders nothing. Nothing is invented.
 *   - Numbers render only when the latest receipt says published AND the
 *     snap itself reads GREEN AND PERFORMANCE_STATS_ENABLED is on AND the
 *     snap is fresh. A RED evaluation closes the figures the moment it lands,
 *     before any unpublish receipt is written (the same rule as
 *     calibration-publish-policy); an unpublish receipt, a missing flag, or a
 *     snap older than MAX_SNAP_AGE_MS closes them too.
 *   - Freshness: the eligibility cron is six-hourly. A snap older than four
 *     missed runs (24h) is shown as STALE with its timestamp, never as live.
 *   - Every figure is the snap's own value; raw ECE is shown beside the
 *     bias-corrected figure the floor reads (AGENTS.md law 3 amendment).
 */

import {
  loadLatestCalibrationMetrics,
  loadLatestEligibilitySnap,
  loadPublishReceipt,
  metricsPBasis,
  type EligibilityDurableSnap,
  type PublishReceipt,
} from "@/lib/ops/calibration-eligibility-durable";

export type GateReadingModel = {
  readonly snap: EligibilityDurableSnap;
  readonly receipt: PublishReceipt | null;
  readonly pBasis: string;
  readonly numbersPublished: boolean;
  /** True when the snap is older than MAX_SNAP_AGE_MS or carries no valid timestamp. */
  readonly stale: boolean;
};

/** Four missed six-hourly runs. */
export const MAX_SNAP_AGE_MS = 24 * 60 * 60 * 1000;

export function snapIsStale(snap: EligibilityDurableSnap, now: number = Date.now()): boolean {
  const t = Date.parse(snap.evaluatedAt);
  if (!Number.isFinite(t)) return true;
  return now - t > MAX_SNAP_AGE_MS;
}

function fmt(x: number | null | undefined, dp = 3): string {
  return typeof x === "number" && Number.isFinite(x) ? x.toFixed(dp) : "n/a";
}

export function performanceStatsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env["PERFORMANCE_STATS_ENABLED"] === "true";
}

export async function loadGateReading(): Promise<GateReadingModel | null> {
  try {
    const [snap, receipt, metrics] = await Promise.all([
      loadLatestEligibilitySnap(),
      loadPublishReceipt(),
      loadLatestCalibrationMetrics(),
    ]);
    if (!snap) return null;
    const stale = snapIsStale(snap);
    return {
      snap,
      receipt,
      pBasis: snap.pBasis ?? metricsPBasis(metrics),
      numbersPublished:
        receipt?.published === true && snap.report.status === "GREEN" && performanceStatsEnabled() && !stale,
      stale,
    };
  } catch {
    return null;
  }
}

function Row({ label, value, floor, pass }: { label: string; value: string; floor: string; pass: boolean | null }) {
  return (
    <tr className="border-t border-white/5">
      <td className="py-2 pr-4 text-ion-1">{label}</td>
      <td className="py-2 pr-4 font-mono text-ion-white" data-testid="gate-reading-value">{value}</td>
      <td className="py-2 pr-4 font-mono text-ion-2">{floor}</td>
      <td className={`py-2 font-mono ${pass === null ? "text-ion-2" : pass ? "text-orbital-cyan" : "text-alert"}`}>
        {pass === null ? "" : pass ? "pass" : "fail"}
      </td>
    </tr>
  );
}

export function GateReadingView({ model }: { model: GateReadingModel }) {
  const r = model.snap.report;
  const f = r.floors;
  const green = r.status === "GREEN";
  const dv = r.deployedVersion;
  const dvHasBound = typeof dv?.eceDebiasedCi90Lo === "number" && Number.isFinite(dv.eceDebiasedCi90Lo);
  const dvValue = dvHasBound ? dv.eceDebiasedCi90Lo : (dv?.eceDebiased ?? dv?.ece ?? null);
  return (
    <section
      data-testid="calibration-gate-reading"
      className="rounded-2xl border border-orbital-cyan/30 bg-orbital-cyan/[0.04] p-6"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">
        Calibration gate · live reading
      </p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span
          data-testid="gate-reading-status"
          className={`rounded-md px-2 py-0.5 font-mono text-sm ${green ? "bg-orbital-cyan/15 text-orbital-cyan" : "bg-alert/15 text-alert"}`}
        >
          {r.status}
        </span>
        {model.stale ? (
          <span data-testid="gate-reading-stale" className="rounded-md bg-caution/15 px-2 py-0.5 font-mono text-sm text-caution">
            STALE · last evaluated {model.snap.evaluatedAt}
          </span>
        ) : null}
        <span className="font-mono text-sm text-ion-1">
          streak {r.consecutiveGreen} of {r.streakRequired} required
        </span>
        <span className="font-mono text-xs text-ion-2">basis {model.pBasis}</span>
        {r.generatedAt ? (
          <span className="font-mono text-xs text-ion-2">measured {r.generatedAt}</span>
        ) : null}
      </div>
      {model.numbersPublished ? (
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
              <th className="pb-2 pr-4 font-normal">measure</th>
              <th className="pb-2 pr-4 font-normal">reading</th>
              <th className="pb-2 pr-4 font-normal">floor</th>
              <th className="pb-2 font-normal" />
            </tr>
          </thead>
          <tbody>
            <Row label="Settled moneyline picks" value={String(r.n)} floor={`≥ ${f.n}`} pass={r.n >= f.n} />
            <Row
              label="Expected calibration error, bias-corrected (raw beside)"
              value={`${fmt(r.eceDebiased ?? r.ece)} (raw ${fmt(r.ece)})`}
              floor={`≤ ${f.ece}`}
              pass={(r.eceDebiased ?? r.ece ?? Infinity) <= f.ece}
            />
            <Row label="Brier score" value={fmt(r.brier, 4)} floor={`≤ ${f.brier}`} pass={(r.brier ?? Infinity) <= f.brier} />
            <Row
              label="Murphy reliability"
              value={fmt(r.murphy?.reliability, 4)}
              floor={`≤ ${f.murphyReliability}`}
              pass={(r.murphy?.reliability ?? Infinity) <= f.murphyReliability}
            />
            {dv ? (
              <Row
                label={`Deployed ${dv.key} on its own ${dv.n} rows (${dvHasBound ? "5th-percentile bound" : "point estimate, no bound on this artifact"})`}
                value={dvHasBound ? `${fmt(dvValue)} (point ${fmt(dv.eceDebiased ?? dv.ece)})` : fmt(dvValue)}
                floor={`≤ ${f.ece}`}
                pass={dvValue == null ? null : dvValue <= f.ece}
              />
            ) : null}
          </tbody>
        </table>
      ) : (
        <p className="mt-3 text-sm text-ion-1" data-testid="gate-reading-withheld">
          {model.stale
            ? "This reading is older than the measurement schedule allows. Figures are withheld until a fresh evaluation lands."
            : "The figures publish when the receipt lands and the founder opens the record. Until then the gate status and streak are the only numbers shown."}
        </p>
      )}
      <p className="mt-4 text-xs leading-5 text-ion-2">
        Scored on the publish-time market price rebuilt from the append-only odds table, two-way
        moneylines only. Picks generated after kickoff and picks the odds table cannot price are
        excluded and counted. Method and every correction: docs/ops/CALIBRATION_ECE_ESTIMATOR_2026-09-09.md.
      </p>
    </section>
  );
}

export default async function GateReading() {
  const model = await loadGateReading();
  if (!model) return null;
  return <GateReadingView model={model} />;
}
