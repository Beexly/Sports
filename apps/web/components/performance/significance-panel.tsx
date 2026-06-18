/**
 * Edge-significance panel — the Monte-Carlo permutation test result.
 *
 * Answers: "is our win rate beyond luck?" A low p-value means the observed
 * wins exceed what a no-edge null model (nullProb = 0.5 for spread/total picks,
 * the market's fair price for ATS bets) would produce by chance. This is the
 * math behind the claim, not a promise.
 *
 * Uses edgeSignificance() from the prediction-engine (pure, injectable RNG).
 * nullProb = 0.5 for all picks — spread/total markets are priced symmetrically;
 * this is a documented approximation and slightly conservative for moneyline.
 *
 * Gated: only renders if canExposePerformanceStats is true (same gate as win
 * rate). Below the gate it shows an honest collecting state.
 */

import { db } from "@sports/db";
import { getReadinessGates, edgeSignificance } from "@sports/prediction-engine";
import { NUMERIC_TEXT_CLASS, formatCount } from "@/lib/format/stat";

const NULL_PROB = 0.5;
const ALPHA = 0.05;

function pValueLabel(p: number): string {
  if (p <= 0.01) return "Very strong";
  if (p <= 0.05) return "Significant";
  if (p <= 0.15) return "Suggestive";
  return "Not yet";
}

function pValueTone(p: number, significant: boolean): string {
  if (significant) return "text-orbital-cyan";
  if (p <= 0.15) return "text-caution";
  return "text-ion-2";
}

export async function SignificancePanel() {
  const gates = getReadinessGates();

  if (!gates.canExposePerformanceStats) {
    return (
      <section
        data-testid="significance-panel-gated"
        className="mb-8 rounded-2xl border border-mineral bg-eclipse/40 p-6"
      >
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ion-2">
          Edge significance — accruing
        </h2>
        <p className="text-sm leading-relaxed text-ion-1">
          The Monte-Carlo permutation test opens once enough settled canonical picks exist
          to distinguish skill from luck. The gate is the same as the public win rate.
        </p>
      </section>
    );
  }

  let result: Awaited<ReturnType<typeof edgeSignificance>> | null = null;
  let fetchError: string | null = null;

  try {
    const picks = await db.pick.findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: { in: ["WIN", "LOSS"] },
        signalSnapshot: { is: { eligibleForLearning: true } },
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      select: { result: true },
      take: 500,
    });

    const settled = picks.map((p: { result: string }) => ({
      won: p.result === "WIN",
      nullProb: NULL_PROB,
    }));

    result = edgeSignificance(settled, { trials: 2000, alpha: ALPHA });
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to compute significance.";
  }

  if (fetchError || !result) {
    return null;
  }

  if (result.picks === 0) {
    return null;
  }

  const verdictLabel = pValueLabel(result.winRatePValue);
  const verdictTone = pValueTone(result.winRatePValue, result.significant);
  const observedRate =
    result.picks > 0 ? Math.round((result.observedWins / result.picks) * 100) : 0;
  const expectedRate = Math.round(NULL_PROB * 100);

  return (
    <section
      data-testid="significance-panel"
      className="mb-8 overflow-hidden rounded-2xl border border-mineral bg-gradient-to-br from-eclipse to-carbon"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mineral px-6 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ion-2">
          Edge significance — is this skill or luck?
        </h2>
        <span className={`text-[11px] uppercase tracking-widest text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
          {formatCount(result.picks)} decided picks · {result.trials.toLocaleString()} MC trials
        </span>
      </div>

      <div className="grid grid-cols-2 gap-0 divide-x divide-mineral sm:grid-cols-4">
        <StatCell
          label="Observed wins"
          value={String(result.observedWins)}
          sub={`${observedRate}% win rate`}
          accent="text-orbital-cyan"
        />
        <StatCell
          label="Expected (null)"
          value={result.expectedWins.toFixed(1)}
          sub={`${expectedRate}% baseline`}
          accent="text-ion-2"
        />
        <StatCell
          label="P-value"
          value={result.winRatePValue <= 0.001 ? "<0.001" : result.winRatePValue.toFixed(3)}
          sub={`α = ${ALPHA}`}
          accent={verdictTone}
        />
        <StatCell
          label="Evidence"
          value={verdictLabel}
          sub={result.significant ? "beyond chance" : `need p ≤ ${ALPHA}`}
          accent={verdictTone}
        />
      </div>

      <div className="border-t border-mineral px-6 py-4">
        <p className="text-[11px] leading-relaxed text-ion-2">
          Null hypothesis: each pick wins with probability {NULL_PROB} (spread/total market
          pricing). Monte-Carlo permutation test with {result.trials.toLocaleString()} trials.
          A p-value ≤ {ALPHA} means the observed win count would occur by chance less than{" "}
          {Math.round(ALPHA * 100)}% of the time under the null. Evidence only — not a
          guarantee of future results.
        </p>
      </div>
    </section>
  );
}

function StatCell({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ion-2">{label}</p>
      <p className={`text-2xl font-extrabold tabular-nums ${accent} ${NUMERIC_TEXT_CLASS}`}>
        {value}
      </p>
      <p className={`text-[11px] text-ion-3 ${NUMERIC_TEXT_CLASS}`}>{sub}</p>
    </div>
  );
}
