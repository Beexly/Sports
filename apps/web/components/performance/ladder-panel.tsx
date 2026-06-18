/**
 * Calibration ladder status panel.
 *
 * Shows the path-to-70 Step 1 (calibration activation) progress and state.
 * When inactive: accrual progress bar toward the minimum sample floor.
 * When active: method name, held-out ECE, and Wilson lower bound at key tiers.
 *
 * The Wilson lower bound is the defensible public floor — "when we say 70%,
 * the 95% CI lower bound is at least XX%." The honest number behind any tier claim.
 *
 * Gated by canExposePerformanceStats and DEFAULT_LADDER_MIN_SAMPLE.
 * Never claims activation until the held-out test genuinely beats identity.
 */

import { loadCalibrationLadderState } from "@/lib/calibration/ladder-state";
import { NUMERIC_TEXT_CLASS, formatCount, formatRatioAsPercent } from "@/lib/format/stat";

const METHOD_LABELS: Record<string, string> = {
  identity: "Identity (not yet calibrated)",
  platt: "Platt / sigmoid (small-n-safe)",
  isotonic: "Isotonic / PAVA",
  "binned-empirical": "Binned empirical (Wilson-bounded)",
};

export async function LadderPanel() {
  let state: Awaited<ReturnType<typeof loadCalibrationLadderState>>;
  try {
    state = await loadCalibrationLadderState();
  } catch {
    return null;
  }

  const pct = Math.min(100, Math.round((state.settledCount / Math.max(state.minSample, 1)) * 100));
  const identityEce = state.heldOutEce.identity;
  const bestMethodEce =
    state.method !== "identity" ? (state.heldOutEce[state.method] ?? null) : null;

  return (
    <section
      data-testid="ladder-panel"
      className="mb-8 overflow-hidden rounded-2xl border border-mineral bg-gradient-to-br from-eclipse to-carbon"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mineral px-6 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ion-2">
          Calibration ladder — path-to-70 Step 1
        </h2>
        <span
          className={`text-[11px] uppercase tracking-widest ${
            state.isActive ? "text-orbital-cyan" : "text-ion-2"
          } ${NUMERIC_TEXT_CLASS}`}
        >
          {state.isActive ? "Active" : "Collecting"}
        </span>
      </div>

      <div className="px-6 py-6">
        {/* Accrual progress */}
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between text-xs text-ion-2">
            <span>Settled canonical picks (wins + losses)</span>
            <span className={`font-mono tabular-nums text-ion-1 ${NUMERIC_TEXT_CLASS}`}>
              {formatCount(state.settledCount)} / {formatCount(state.minSample)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-titanium">
            <div
              className={`h-full rounded-full transition-all ${
                state.isActive ? "bg-orbital-cyan" : "bg-orbital-cyan/50"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {!state.gateOpen && (
            <p className="mt-2 text-[11px] text-ion-3">
              The calibration gate and this panel open once the performance stats gate clears.
            </p>
          )}
        </div>

        {/* Method and ECE when active */}
        {state.isActive && (
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-orbital-cyan/30 bg-orbital-cyan/[0.06] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ion-2">
                Selected method
              </p>
              <p className="mt-1 text-sm font-semibold text-orbital-cyan">
                {METHOD_LABELS[state.method] ?? state.method}
              </p>
              <p className="mt-1 text-[11px] text-ion-3">
                Chosen by held-out, time-ordered ECE — not in-sample validation.
              </p>
            </div>
            {bestMethodEce !== null && identityEce !== undefined && (
              <div className="rounded-xl border border-mineral bg-eclipse/40 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ion-2">
                  Held-out ECE
                </p>
                <div className="mt-2 flex items-end gap-3">
                  <div>
                    <p className={`text-xl font-extrabold tabular-nums text-orbital-cyan ${NUMERIC_TEXT_CLASS}`}>
                      {bestMethodEce.toFixed(3)}
                    </p>
                    <p className="text-[10px] text-ion-3">calibrated</p>
                  </div>
                  <div className="mb-0.5 text-ion-3">vs</div>
                  <div>
                    <p className={`text-xl font-extrabold tabular-nums text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
                      {identityEce.toFixed(3)}
                    </p>
                    <p className="text-[10px] text-ion-3">raw (identity)</p>
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-ion-3">
                  Lower ECE = closer to perfect calibration (0 = ideal).
                </p>
              </div>
            )}
          </div>
        )}

        {/* Wilson lower bound — the defensible floor */}
        {(state.wilsonFloor65 !== null || state.wilsonFloor70 !== null) && (
          <div className="rounded-xl border border-mineral bg-eclipse/30 p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-ion-2">
              Wilson lower bound — the defensible 70-tier floor
            </p>
            <div className="grid grid-cols-2 gap-4 text-center">
              {state.wilsonFloor65 !== null && (
                <div>
                  <p className={`text-2xl font-extrabold tabular-nums text-ion-white ${NUMERIC_TEXT_CLASS}`}>
                    {formatRatioAsPercent(state.wilsonFloor65)}
                  </p>
                  <p className="mt-1 text-[11px] text-ion-3">
                    95% CI floor at confidence 65
                  </p>
                </div>
              )}
              {state.wilsonFloor70 !== null && (
                <div>
                  <p className={`text-2xl font-extrabold tabular-nums text-orbital-cyan ${NUMERIC_TEXT_CLASS}`}>
                    {formatRatioAsPercent(state.wilsonFloor70)}
                  </p>
                  <p className="mt-1 text-[11px] text-ion-3">
                    95% CI floor at confidence 70
                  </p>
                </div>
              )}
            </div>
            <p className="mt-3 text-[11px] text-ion-3">
              The Wilson lower bound is the conservative end of the 95% confidence interval
              on the calibrated win rate at each confidence level — the honest number behind
              any &ldquo;70% tier&rdquo; claim. Never shown until the ladder activates.
            </p>
          </div>
        )}

        {/* Collecting state — no wilson floor yet */}
        {state.wilsonFloor65 === null && state.wilsonFloor70 === null && (
          <div className="rounded-xl border border-mineral bg-eclipse/30 p-4 text-center">
            <p className="text-sm text-ion-1">
              The Wilson lower bound at each confidence tier will appear here once the
              calibration ladder activates (≥ {formatCount(state.minSample)} settled canonical picks,
              held-out test beats identity).
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-mineral px-6 py-4">
        <p className="text-[11px] leading-relaxed text-ion-2">
          The calibration ladder selects among Platt, isotonic, and binned-empirical
          methods by time-ordered held-out ECE — not in-sample validation, which would
          leak. It only activates when a method genuinely beats the identity passthrough
          on unseen data. Activation is a founder-gated MODEL_VERSION step.
        </p>
      </div>
    </section>
  );
}
