/**
 * Cockpit — Trust Loop. Runs the full devig → blend → evidence → verdict →
 * frozen-receipt pipeline on illustrative inputs, plus CLV + Glicko-2 demos.
 * Pure/static, admin-gated.
 */

import {
  runTrustLoop,
  verifyReceipt,
  gradeClv,
  glicko2Update,
  blackLittermanBlend,
  type Evidence,
  type CounterEvidence,
  type Falsifier,
} from "@/lib/gse";
import { SystemShell, Section, ScoreBadge, Pill, Table } from "../_gse/shell";

export const metadata = { title: "Trust Loop · Cockpit" };

const evidence: Evidence[] = [
  { evidenceId: "e1", supportsClaim: "c", kind: "structured_data", strength: "strong", reliability: 90, freshness: 1, independent: true, sourceId: "consensus", summary: "Two estimators land short of the line and agree." },
  { evidenceId: "e2", supportsClaim: "c", kind: "market_signal", strength: "moderate", reliability: 80, freshness: 0.9, independent: true, sourceId: "books", summary: "Number drifted toward the thesis without a public surge." },
];
const counter: CounterEvidence[] = [
  { counterId: "x", challengesClaim: "c", severity: "moderate", kind: "reported_fact", reliability: 80, freshness: 1, sourceId: "beat", summary: "A questionable status sits upstream of the edge." },
];
const falsifiers: Falsifier[] = [
  { falsifierId: "f", forClaim: "c", condition: "Status downgraded to OUT before lock", likelihood: 0.3, monitored: true, monitoringSource: "injury-agent", timeToActionMins: 120, actionIfTriggered: "collapse to NO-PLAY" },
];

const loop = runTrustLoop({
  marketOdds: [-110, -110], modelProb: 0.62, marketConfidence: 1, modelConfidence: 1.4,
  evidence, counterEvidence: counter, falsifiers, dataQuality: 82, modelAgreement: 0.85,
  primaryAction: "play", inputFreshness: 0.95, timeToActionMins: 120,
  claim: "Illustrative: Home -3.5 carries value over the close", asOf: "2026-06-22T00:00:00Z",
});

const clv = gradeClv(110, -110);
const glicko = glicko2Update(
  { rating: 1500, rd: 200, volatility: 0.06 },
  [{ rating: 1400, rd: 30, score: 1 }, { rating: 1550, rd: 100, score: 0 }, { rating: 1700, rd: 300, score: 0 }],
);
const blendMarket = blackLittermanBlend(0.5, 0.62, 3, 1);

export default function TrustLoopPage(): JSX.Element {
  return (
    <SystemShell
      kicker="Trust Loop"
      title="The loop the whole field leaves open"
      intro="De-vig the market → blend model ⊕ market by precision → marshal evidence → return a verdict → freeze an auditable receipt BEFORE the result → grade CLV after. Outlier has EV but no tracking; Betstamp has CLV but no calibration; DRatings has calibration but weak UX. GSE owns the pieces — here they run end to end (illustrative inputs)."
    >
      <Section title="Pipeline (illustrative case)" blurb="Every intermediate is shown so the work is auditable.">
        <Table
          columns={["Stage", "Output", "Detail"]}
          rows={[
            ["1 · De-vig market", `${(loop.marketFairProb * 100).toFixed(1)}% fair`, "Proportional de-vig of a -110/-110 two-way market → 50/50"],
            ["2 · Blend model⊕market", `${(loop.blend.probability * 100).toFixed(1)}%`, `precision-weighted (market ${(loop.blend.weightMarket * 100).toFixed(0)}% / model ${(loop.blend.weightModel * 100).toFixed(0)}%)`],
            ["3 · Edge vs market", `${(loop.edge * 100).toFixed(1)} pts`, "posterior probability minus de-vigged market"],
            ["4 · Evidence strength", <ScoreBadge key="e" score={loop.evidenceStrength} />, loop.evidenceStrength.rationale.join(" · ")],
            ["5 · Counter severity", <ScoreBadge key="c" score={loop.counterSeverity} riskOriented />, counter[0]!.summary],
            ["6 · Falsifier risk", <ScoreBadge key="x" score={loop.falsifierRisk} riskOriented />, falsifiers[0]!.condition],
            ["7 · Confidence", <ScoreBadge key="cf" score={loop.confidence} />, "process confidence — never a win probability"],
            ["8 · Fragility", <ScoreBadge key="fr" score={loop.fragility} riskOriented />, "how easily one shock breaks it"],
          ]}
        />
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-titanium/40 bg-obsidian/50 p-4">
          <span className="text-sm font-semibold text-ion-white">Verdict:</span>
          <Pill tone={loop.verdict.action === "play" ? "good" : loop.verdict.action === "no_play" ? "bad" : "warn"}>
            {loop.verdict.action.replace(/_/g, " ").toUpperCase()}
          </Pill>
          <span className="text-xs text-ion-3">What would change it: {loop.verdict.whatWouldChange}</span>
        </div>
      </Section>

      <Section title="9 · Frozen trust receipt (pre-result)" blurb="The claim state is hashed and frozen before the outcome — recomputing the hash verifies it was not edited after the fact. This is the white space competitors leave open.">
        <div className="rounded-lg border border-titanium/40 bg-obsidian/50 p-4 font-mono text-[11px] text-ion-2">
          <div>claim: {loop.receipt.claim}</div>
          <div>action: {loop.receipt.action} · confidence: {loop.receipt.confidence} · fragility: {loop.receipt.fragility}</div>
          <div>asOf: {loop.receipt.asOf}</div>
          <div>hash: <span className="text-orbital-cyan">{loop.receipt.hash}</span> · verified: <span className={verifyReceipt(loop.receipt) ? "text-emerald-300" : "text-rose-300"}>{String(verifyReceipt(loop.receipt))}</span></div>
        </div>
      </Section>

      <Section title="10 · Grade CLV (after the result)" blurb="Closing-line value is a process signal, never a guarantee a bet won.">
        <p className="text-xs text-ion-2">
          Took <code className="text-ion-1">+110</code>, line closed <code className="text-ion-1">-110</code> →{" "}
          <Pill tone={clv.beatClose ? "good" : "bad"}>{clv.beatClose ? "beat the close" : "worse than close"}</Pill>{" "}
          <span className="text-ion-3">({clv.clvPoints.toFixed(1)} pts of CLV)</span>
        </p>
      </Section>

      <Section title="New modeling primitives" blurb="Built this sprint (pure, tested) — pairing with the existing engine.">
        <Table
          columns={["Primitive", "Example", "Result"]}
          rows={[
            ["Glicko-2 update", "1500/200/0.06 vs 3 opponents", `rating ${glicko.rating.toFixed(1)} · RD ${glicko.rd.toFixed(1)} · σ ${glicko.volatility.toFixed(4)}`],
            ["Black-Litterman blend", "market 50% (prec 3) ⊕ model 62% (prec 1)", `${(blendMarket.probability * 100).toFixed(1)}% posterior`],
          ]}
        />
      </Section>
    </SystemShell>
  );
}
