import Link from "next/link";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { loadLatestCalibrationMetrics } from "@/lib/ops/calibration-eligibility-durable";
import {
  ECE_MARKET_ECHO_CAVEAT,
  brierSkillScoreVsBaseRate,
} from "@/lib/fable/ece-caveat";
import {
  NUMERIC_TEXT_CLASS,
  STAT_PLACEHOLDER,
  formatBrier,
  formatCount,
  formatRatioAsPercent,
} from "@/lib/format/stat";

function formatEce(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return STAT_PLACEHOLDER;
  return value.toFixed(4);
}

function formatBss(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return STAT_PLACEHOLDER;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(4)}`;
}

export async function ProofDashboard() {
  let report: Awaited<ReturnType<typeof loadPublicCalibrationReport>> | null = null;
  let durable: Awaited<ReturnType<typeof loadLatestCalibrationMetrics>> = null;
  try {
    [report, durable] = await Promise.all([
      loadPublicCalibrationReport(),
      loadLatestCalibrationMetrics().catch(() => null),
    ]);
  } catch {
    return (
      <section
        data-testid="fable-proof-dashboard"
        className="mt-10 rounded-2xl border border-caution/40 bg-caution/[0.06] p-6"
      >
        <h2 className="text-2xl font-bold text-ion-white">Proof Dashboard</h2>
        <p className="mt-3 text-sm text-ion-1">
          Calibration data is temporarily unavailable. A connection problem, not a verdict.
        </p>
      </section>
    );
  }

  if (!report) {
    return (
      <section data-testid="fable-proof-dashboard" className="mt-10 rounded-2xl border border-mineral p-6">
        <h2 className="text-2xl font-bold text-ion-white">Proof Dashboard</h2>
        <p className="mt-3 text-sm text-ion-1">Proof numbers are not published yet.</p>
      </section>
    );
  }

  const published = !report.meta.gated && !report.data.isCollecting && report.data.sampleSize > 0;
  const overall =
    published && durable !== null && durable.status === "ok" ? durable.overall : null;
  const ece = overall?.ece ?? null;
  const rel = overall?.murphy.reliability ?? null;
  const res = overall?.murphy.resolution ?? null;
  const unc = overall?.murphy.uncertainty ?? null;
  const brier = published ? report.data.brierScore : null;
  const bss =
    overall !== null && unc !== null ? brierSkillScoreVsBaseRate(overall.brier, unc) : null;
  const emptyReason = report.meta.gated
    ? "Public calibration stays dark until eligibility is GREEN and publish policy allows it."
    : "Building calibration history from settled canonical picks.";

  return (
    <section
      data-testid="fable-proof-dashboard"
      className="mt-10 rounded-2xl border border-orbital-cyan/25 bg-orbital-cyan/[0.04] p-6"
    >
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-orbital-cyan">
        Proof Dashboard
      </p>
      <h2 className="mt-3 text-2xl font-bold text-ion-white">Live calibration, published numbers only.</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-ion-1">
        The reliability curve is the public calibration report. Murphy terms and ECE
        come from the durable artifact when that artifact is published. Nothing is
        hardcoded. Nothing is shown while the readiness gate is dark.
      </p>

      {!published ? (
        <p
          data-testid="fable-proof-empty"
          className="mt-6 rounded-xl border border-mineral bg-carbon/60 px-4 py-5 text-sm text-ion-1"
        >
          {emptyReason}
        </p>
      ) : (
        <ReliabilityCurve
          buckets={report.data.buckets}
          sampleSize={report.data.sampleSize}
          publicMessage={report.data.publicMessage}
        />
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          testId="fable-proof-rel"
          label="REL"
          value={rel === null ? STAT_PLACEHOLDER : formatBrier(rel)}
          detail="Reliability — mass-weighted (forecast − observed)²"
        />
        <Metric
          testId="fable-proof-res"
          label="RES"
          value={res === null ? STAT_PLACEHOLDER : formatBrier(res)}
          detail="Resolution — how much outcome rates differ across bins"
        />
        <Metric
          testId="fable-proof-unc"
          label="UNC"
          value={unc === null ? STAT_PLACEHOLDER : formatBrier(unc)}
          detail="Uncertainty — base-rate noise ȳ(1 − ȳ)"
        />
        <Metric
          testId="fable-proof-bss"
          label="BSS vs base rate"
          value={formatBss(bss)}
          detail="1 − Brier / UNC. Negative means worse than climatology."
        />
      </div>

      <div
        data-testid="fable-proof-ece"
        className="mt-6 rounded-xl border border-mineral bg-carbon/60 p-5"
      >
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ion-3">
          Model ECE
        </p>
        <p className={`mt-3 text-3xl font-black text-ion-white ${NUMERIC_TEXT_CLASS}`}>
          {formatEce(ece)}
        </p>
        <p data-testid="fable-proof-ece-caveat" className="mt-3 text-sm leading-6 text-ion-1">
          {ECE_MARKET_ECHO_CAVEAT}
        </p>
        {ece === null && (
          <p className="mt-2 text-xs text-ion-2">
            Durable ECE is unpublished or the artifact has not been written yet.
          </p>
        )}
        {brier !== null && (
          <p className={`mt-2 text-xs text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
            Public Brier {formatBrier(brier)} · n={formatCount(report.data.sampleSize)}
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <ProofLink href="/calibration" label="Calibration" body="The Proof Room — every published receipt." />
        <ProofLink href="/kill-ledger" label="Kill Ledger" body="Failed strategies, left in the record." />
        <ProofLink href="/bookgrade" label="BookGrade" body="Price quality vs consensus close, totals only." />
      </div>
    </section>
  );
}

function Metric({
  testId,
  label,
  value,
  detail,
}: {
  readonly testId: string;
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}) {
  return (
    <div data-testid={testId} className="rounded-lg border border-titanium/60 bg-carbon/70 p-4">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ion-3">
        {label}
      </p>
      <p className={`mt-3 text-3xl font-black text-ion-white ${NUMERIC_TEXT_CLASS}`}>{value}</p>
      <p className="mt-2 text-xs leading-5 text-ion-2">{detail}</p>
    </div>
  );
}

function ProofLink({
  href,
  label,
  body,
}: {
  readonly href: "/calibration" | "/kill-ledger" | "/bookgrade";
  readonly label: string;
  readonly body: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-mineral bg-eclipse/50 p-4 transition-colors hover:border-orbital-cyan/50"
    >
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-orbital-cyan">
        {label}
      </p>
      <p className="mt-2 text-sm text-ion-1">{body}</p>
    </Link>
  );
}

function ReliabilityCurve({
  buckets,
  sampleSize,
  publicMessage,
}: {
  readonly buckets: readonly {
    readonly label: string;
    readonly observedWinRate: number;
    readonly expectedWinRate: number;
    readonly sampleSize: number;
    readonly sufficientSample: boolean;
  }[];
  readonly sampleSize: number;
  readonly publicMessage: string;
}) {
  return (
    <div data-testid="fable-proof-curve" className="mt-6 rounded-xl border border-mineral bg-carbon/60 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ion-2">
          Reliability by confidence bucket
        </h3>
        <span className={`text-[11px] text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
          {formatCount(sampleSize)} settled picks
        </span>
      </div>
      <div className="divide-y divide-titanium/60">
        {buckets.map((bucket) => {
          const publishable = bucket.sufficientSample;
          return (
            <div key={bucket.label} className="flex items-center gap-3 py-2">
              <span className={`w-14 shrink-0 text-xs text-ion-1 ${NUMERIC_TEXT_CLASS}`}>
                {bucket.label}
              </span>
              <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-titanium">
                {publishable && (
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400"
                    style={{ width: `${Math.round(bucket.observedWinRate * 100)}%` }}
                  />
                )}
                <div
                  className="absolute top-0 h-full w-0.5 bg-ion-white/70"
                  style={{ left: `${Math.round(bucket.expectedWinRate * 100)}%` }}
                  aria-hidden
                />
              </div>
              <span className={`w-14 shrink-0 text-right text-xs text-ion ${NUMERIC_TEXT_CLASS}`}>
                {publishable ? formatRatioAsPercent(bucket.observedWinRate) : STAT_PLACEHOLDER}
              </span>
              <span className={`w-16 shrink-0 text-right text-[11px] text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
                {bucket.sampleSize === 0
                  ? "no data"
                  : publishable
                    ? `n=${formatCount(bucket.sampleSize)}`
                    : `${formatCount(bucket.sampleSize)}/30`}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-ion-2">{publicMessage}</p>
    </div>
  );
}
