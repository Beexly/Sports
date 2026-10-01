/**
 * The customer-facing calibration state card.
 *
 * Closes the loop the honest caveat never closed. `CONFIDENCE_PROBABILITY_CAVEAT`
 * has been computed, carried on the report, and pinned by tests since 2026-09-19
 * , and rendered on no surface at all. The string existed; the disclosure did
 * not. This component is the surface it was written for.
 *
 * It renders a graded `CalibrationPublicState` rather than a boolean, and it
 * ships the state's `notEstablished` list with every reading. That is the whole
 * design: a customer should never be able to read our state without also
 * reading what that state does not establish. A badge on its own invites the
 * inference the badge cannot support.
 *
 * Server component. Pure render over a plain object, no fetching, so it can be
 * used from a page, a panel, or an API payload unchanged.
 */

import { NUMERIC_TEXT_CLASS } from "@/lib/format/stat";
import type { CalibrationPublicState, CalibrationState } from "@/lib/calibration/public-state";

/**
 * Presentation per state. `tone` is deliberately drawn from the existing
 * semantic scale (`text-orbital-cyan` = clear signal, `text-alert` = bad) and
 * never from a green/red casino ramp, which the brand standards ban. The
 * label is the STATE, not a grade: a customer should be able to read their own
 * position without interpreting a symbol.
 */
const PRESENTATION: Readonly<
  Record<CalibrationState, { readonly label: string; readonly tone: string; readonly border: string }>
> = {
  MEETS_FLOOR: {
    label: "Clears our floor",
    tone: "text-orbital-cyan",
    border: "border-l-orbit-cyan/40",
  },
  BELOW_FLOOR: {
    label: "Below our floor",
    tone: "text-alert",
    border: "border-l-alert/40",
  },
  COLLECTING: {
    label: "Still collecting",
    tone: "text-caution",
    border: "border-l-caution/40",
  },
  STALE: {
    label: "Reading expired",
    tone: "text-caution",
    border: "border-l-caution/40",
  },
  UNAVAILABLE: {
    label: "Could not read",
    tone: "text-ion-2",
    border: "border-l-ion-2/40",
  },
  NO_EVIDENCE: {
    label: "No reading yet",
    tone: "text-ion-2",
    border: "border-l-ion-2/40",
  },
};

/**
 * Short form for a metric. A missing value renders as "n/a", NOT as an em
 * dash: the brand guard bans em/en dashes in public copy, and a dash here
 * would also read as a value rather than as the absence of one.
 */
function metric(value: number | null | undefined, digits: number): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "n/a";
}

export function CalibrationStateCard({
  state,
  className,
}: {
  readonly state: CalibrationPublicState;
  readonly className?: string;
}): JSX.Element {
  const p = PRESENTATION[state.state];
  const e = state.evidence;

  return (
    <section
      data-testid="calibration-state-card"
      data-state={state.state}
      data-clears-floor={state.clearsOurFloor ? "true" : "false"}
      aria-label={`Calibration state: ${p.label}`}
      className={`w-full rounded border border-mineral/40 border-l-2 bg-carbon/40 p-4 ${p.border} ${
        className ?? ""
      }`}
    >
      <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={`font-mono text-[11px] uppercase tracking-[0.16em] ${p.tone}`}>
          Calibration · {p.label}
        </h3>
        {state.measuredAt ? (
          <span className={`font-mono text-[10px] text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
            measured {state.measuredAt}
          </span>
        ) : null}
      </header>

      {/*
        The state sentence is authored by `resolveCalibrationState`, not written
        here. That is the point: the wording that reaches a customer is the same
        one the tests assert is banned-phrase clean, so it cannot drift into an
        overclaim through a presentational edit.
      */}
      <p className="mb-3 text-sm leading-relaxed text-ion-1">{state.statement}</p>

      {e ? (
        <dl className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
          <div>
            <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-ion-2">Settled</dt>
            <dd className={`text-sm text-ion-1 ${NUMERIC_TEXT_CLASS}`}>{e.n.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-ion-2">Brier</dt>
            <dd className={`text-sm text-ion-1 ${NUMERIC_TEXT_CLASS}`}>{metric(e.brier, 3)}</dd>
          </div>
          <div>
            <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-ion-2">ECE (adj.)</dt>
            <dd className={`text-sm text-ion-1 ${NUMERIC_TEXT_CLASS}`}>{metric(e.eceDebiased, 3)}</dd>
          </div>
          <div>
            <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-ion-2">Reliability</dt>
            <dd className={`text-sm text-ion-1 ${NUMERIC_TEXT_CLASS}`}>
              {metric(e.murphyReliability, 3)}
            </dd>
          </div>
        </dl>
      ) : (
        /*
          No evidence object means the state WITHHELD its figures. Saying so is
          better than rendering an empty grid: a reader can tell the difference
          between "we measured and it failed" and "we have nothing to show".
        */
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
          No calibration figures are published in this state.
        </p>
      )}

      <p className="mb-3 border-t border-mineral/30 pt-2 text-[11px] leading-relaxed text-ion-2">
        Measured on {state.measuredQuantity}.
        {e?.eceNoise != null && e.eceNoise > 0
          ? ` The calibration-error figure above has ${e.eceNoise.toFixed(3)} of expected sampling noise removed.`
          : ""}
      </p>

      {/*
        The confidence-score disclosure, on every state. It is injected from
        `CONFIDENCE_PROBABILITY_CAVEAT` (its single source of truth) so this
        surface cannot fork the wording from the report.
      */}
      <p className="mb-3 text-[11px] leading-relaxed text-ion-2">
        {state.confidenceScoreDisclosure}
      </p>

      {/*
        Rendered unconditionally. This is the load-bearing part of the card: the
        limits travel with the reading, so the badge can never be screenshotted
        and circulated without them.
      */}
      <details className="group">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2 hover:text-ion-1">
          What this does not establish
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-ion-2">
          {state.notEstablished.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
