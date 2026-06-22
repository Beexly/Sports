import { LogoMarkInline } from "@/components/brand/logo-mark-inline";
import { CountUp } from "@/components/ui/count-up";
import { getClaim } from "@/lib/trust-claims";

/**
 * Methodology / Trust Surface
 *
 * The living trust band on the homepage. It opens with a real, live ledger of
 * the operation (settled picks calibrated, what cleared and gated today, live
 * player rows) that counts up on scroll, under the signature signal fade. Below
 * it, the methodology cards explain HOW each of those numbers is produced.
 *
 * The bullets are sourced from the Trust Claim Registry — anything shown here is
 * either an APPROVED METHODOLOGY/DATA_TRANSPARENCY claim or a GATED PERFORMANCE
 * claim flagged with its readiness gate. This component never invents social
 * proof or a track-record number; the ledger figures are live operational
 * counts passed in from real loaders.
 */

interface MethodologyItem {
  readonly title: string;
  readonly claimId: string;
  readonly hint?: string; // small explanatory text under the body
  readonly lane: "data" | "model" | "gate";
}

/** Live operational figures, all real (passed from the page's loaders). */
export interface TrustLedgerMetrics {
  /** Settled canonical picks the calibration is computed on. */
  readonly settled: number;
  /** Picks that cleared the gates and published today. */
  readonly cleared: number;
  /** Reads the gate held back today (restraint as a first-class output). */
  readonly gated: number;
  /** Live player rows ingested (0 when intake is warming up). */
  readonly playerRows: number;
}

const ITEMS: readonly MethodologyItem[] = [
  {
    title: "Live odds ingestion",
    claimId: "methodology.odds-ingestion",
    lane: "data",
  },
  {
    title: "Bookmaker coverage as a transparency signal",
    claimId: "methodology.bookmaker-coverage",
    lane: "data",
  },
  {
    title: "Data freshness on every pick",
    claimId: "methodology.data-freshness",
    lane: "data",
  },
  {
    title: "Calibrated confidence presentation",
    claimId: "methodology.confidence-presentation",
    hint: "Until we have enough settled outcomes to calibrate against, confidence is shown as a label, not a number.",
    lane: "model",
  },
  {
    title: "Risk level on every pick",
    claimId: "methodology.risk-levels",
    lane: "model",
  },
  {
    title: "Factor breakdown for subscribers",
    claimId: "methodology.factor-breakdown",
    lane: "model",
  },
  {
    title: "Public performance is gated, not advertised",
    claimId: "performance.public-stats-gated",
    hint: "When you see win-loss numbers on the Performance page, you'll also see the period, sample size, model version, and the exact win-rate definition.",
    lane: "gate",
  },
];

function laneAccent(lane: MethodologyItem["lane"]): string {
  switch (lane) {
    case "model":
      return "text-ultraviolet";
    case "gate":
      return "text-plasma";
    case "data":
    default:
      return "text-orbital-cyan";
  }
}

/** A single live figure in the ledger band — counts up on scroll into view. */
function LedgerStat({
  value,
  label,
  sub,
  tone,
  group = false,
}: {
  value: number;
  label: string;
  sub: string;
  tone: "ion" | "cyan" | "plasma" | "uv";
  group?: boolean;
}) {
  const color =
    tone === "cyan"
      ? "text-orbital-cyan"
      : tone === "plasma"
        ? "text-plasma"
        : tone === "uv"
          ? "text-ultraviolet"
          : "text-ion-white";
  return (
    <div className="bg-carbon px-5 py-6">
      <CountUp
        value={value}
        group={group}
        className={`block font-numerals text-4xl font-bold tabular-nums ${color}`}
      />
      <p className="mt-2 text-sm font-semibold text-ion-white">{label}</p>
      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">{sub}</p>
    </div>
  );
}

export function MethodologySection({ metrics }: { metrics?: TrustLedgerMetrics }) {
  // Resolve each item against the registry. We use getClaim() so both APPROVED
  // and GATED entries surface — the GATED ones (e.g. performance.public-stats-gated)
  // describe the *policy* about when public stats appear, which is itself an
  // approved methodology claim to make publicly.
  const resolved = ITEMS.map((item) => ({
    item,
    claim: getClaim(item.claimId),
  }));

  return (
    <section
      data-testid="methodology-section"
      className="relative isolate border-y border-mineral bg-carbon px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="methodology-heading"
    >
      {/* Watermark — the mark watches the methodology */}
      <div aria-hidden className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 opacity-[0.03] sm:right-16">
        <LogoMarkInline size={200} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-rule-fade" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-rule-fade" aria-hidden="true" />
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow text-ion-1">Methodology / Trust Surface</p>
          <h2
            id="methodology-heading"
            className="mt-4 font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl"
          >
            The audit trail behind every{" "}
            <span className="bg-signal-fade bg-clip-text text-transparent">signal</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-ion sm:text-lg">
            Every published pick ties back to live markets, timestamped data,
            factor scoring, and the gates that keep weak picks off the board.
          </p>
        </div>

        {/* ── Live ledger band — real operational figures, counting up ──────── */}
        {metrics && (
          <div className="mx-auto mt-12 max-w-5xl">
            <div className="surface-card relative overflow-hidden p-0">
              {/* The signature signal fade crowns the live numbers. */}
              <div aria-hidden className="h-1 w-full bg-signal-fade" />
              <div className="grid grid-cols-2 gap-px bg-mineral lg:grid-cols-4">
                <LedgerStat
                  value={metrics.settled}
                  label={metrics.settled > 0 ? "Settled picks calibrated" : "Calibration sample"}
                  sub={metrics.settled > 0 ? "the only basis for any number" : "building honestly"}
                  tone="ion"
                  group
                />
                <LedgerStat
                  value={metrics.cleared}
                  label="Cleared today"
                  sub="passed every gate"
                  tone="cyan"
                />
                <LedgerStat
                  value={metrics.gated}
                  label="Gated today"
                  sub="restraint, logged"
                  tone="plasma"
                />
                <LedgerStat
                  value={metrics.playerRows}
                  label={metrics.playerRows > 0 ? "Live player rows" : "Player intake"}
                  sub={metrics.playerRows > 0 ? "ingested + structured" : "warming up"}
                  tone="uv"
                  group
                />
              </div>
            </div>
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">
              Live counts · the numbers below explain how each one is produced
            </p>
          </div>
        )}

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resolved.map(({ item, claim }) => (
            <article
              key={item.claimId}
              data-claim-id={item.claimId}
              className="surface-card flex min-h-full flex-col gap-4 p-5 transition-colors hover:border-mineral-hi"
            >
              <div className="flex items-center justify-between gap-3">
                <p className={`font-mono text-[10px] uppercase tracking-[0.16em] ${laneAccent(item.lane)}`}>
                  {item.lane}
                </p>
                <span className="h-px flex-1 bg-mineral" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold leading-snug text-ion-white">{item.title}</h3>
              <p className="text-sm leading-6 text-ion">
                {claim?.copy ?? ""}
              </p>
              {item.hint && (
                <p className="mt-auto border-t border-mineral pt-4 text-xs leading-5 text-ion-1">
                  {item.hint}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
