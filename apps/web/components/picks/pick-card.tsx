import type {
  PublicPick,
  PickType,
  PickGrade,
  PickResult,
  RiskLevel,
  FactorBreakdown,
} from "@sports/types";
import { PICK_GRADE_LABELS, RISK_LEVEL_LABELS } from "@sports/types";
import { EvidenceAuditDrawer } from "./evidence-audit-drawer";
import { AskWhy } from "./ask-why";
import Link from "next/link";

// ─────────────────────────────────────────────
// Main PickCard
// ─────────────────────────────────────────────

interface PickCardProps {
  pick: PublicPick;
  canSeeConfidence: boolean;
  canSeeEdgeScore: boolean;
  canSeeFactorBreakdown: boolean;
}

const PICK_GRADE_STYLES: Record<PickGrade, string> = {
  ELITE_PLAY: "text-plasma bg-plasma/10",
  STRONG_PLAY: "text-verify bg-verify/10",
  SOLID_PLAY: "text-ion-blue bg-ion-blue/10",
  LEAN: "text-ion-2 bg-titanium/40",
};

const RISK_LEVEL_STYLES: Record<RiskLevel, string> = {
  LOW_RISK: "text-verify",
  MODERATE: "text-plasma",
  HIGH_VARIANCE: "text-ultraviolet",
  INJURY_RISK: "text-alert",
  LINE_STEAM: "text-ultraviolet",
};

export function PickCard({
  pick,
  canSeeConfidence,
  canSeeEdgeScore,
  canSeeFactorBreakdown,
}: PickCardProps) {
  const gameTime = new Date(pick.game.commenceTime).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const riskInfo = RISK_LEVEL_LABELS[pick.riskLevel];

  const freshnessAge = pick.dataFreshnessAt
    ? Math.round((Date.now() - new Date(pick.dataFreshnessAt).getTime()) / 60_000)
    : null;

  const isFeatured = pick.isFeatured;

  return (
    <article
      className={[
        "relative flex flex-col gap-4 rounded-2xl border p-5 transition-shadow hover:shadow-lg hover:shadow-black/40",
        isFeatured
          ? "border-plasma/50 bg-carbon shadow-plasma/20"
          : "border-titanium bg-carbon",
      ].join(" ")}
    >
      {/* Featured ribbon */}
      {isFeatured && (
        <div className="absolute right-4 top-0 -translate-y-1/2">
          <span className="rounded-full bg-plasma px-2.5 py-0.5 text-xs font-bold text-plasma-ink">
            Top Pick
          </span>
        </div>
      )}

      {/* Header: sport + badges */}
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="rounded-full bg-titanium px-2.5 py-0.5 text-xs font-semibold text-ion-1">
          {pick.game.sport}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <GradeBadge grade={pick.pickGrade} />
          <TierBadge tier={pick.tier} />
          <ResultBadge result={pick.result} />
        </div>
      </div>

      {/* Matchup */}
      <div>
        <p className="text-xs text-ion-1">{gameTime}</p>
        <div className="mt-1.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{pick.game.awayTeam}</p>
            <p className="text-[10px] text-ion-1">@</p>
            <p className="text-sm font-semibold text-white">{pick.game.homeTeam}</p>
          </div>
          <PickTypeBadge type={pick.pickType} />
        </div>
      </div>

      {/* Selection box */}
      <div className="rounded-lg bg-titanium/60 px-4 py-3">
        <p className="text-xs font-medium text-ion-1">Pick</p>
        <p className="mt-0.5 text-lg font-bold text-white">{pick.selection}</p>
        {/* SPREAD's chosen-side number already lives in `selection` (e.g.
            "Away Favs -6.0"). `line` is stored in HOME-team perspective for
            settlement, so rendering it raw here would contradict the selection
            for away-favored picks. Show the explicit line for TOTAL/MONEYLINE only. */}
        {pick.line !== 0 && pick.pickType !== "SPREAD" && (
          <p className="mt-0.5 text-xs text-ion-1">
            Line: {pick.line > 0 ? "+" : ""}{pick.line}
          </p>
        )}
      </div>

      {/* Scores row: confidence + edge + risk */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Confidence */}
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-medium text-ion-1">Confidence</p>
          {canSeeConfidence && pick.confidence !== null ? (
            <ConfidenceBadge confidence={pick.confidence} calibrated={pick.confidenceCalibrated} />
          ) : (
            <LockedValue label="Conf." />
          )}
        </div>

        {/* Edge score */}
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-medium text-ion-1">Edge Score</p>
          {canSeeEdgeScore && pick.edgeScore !== null ? (
            <EdgeScoreBadge edgeScore={pick.edgeScore} />
          ) : (
            <LockedValue label="Edge" />
          )}
        </div>

        {/* Risk */}
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-medium text-ion-1">Risk</p>
          <span className={`text-xs font-semibold ${RISK_LEVEL_STYLES[pick.riskLevel]}`}>
            {riskInfo.label}
          </span>
        </div>
      </div>

      {/* Reasoning teaser / full */}
      <p className="text-xs leading-relaxed text-ion-1">
        {canSeeConfidence ? pick.reasoning : pick.reasoningShort}
      </p>

      {/* Factor breakdown (PRO+ only) */}
      {canSeeFactorBreakdown && pick.factorBreakdown && (
        <FactorBreakdownPanel breakdown={pick.factorBreakdown} />
      )}
      {!canSeeFactorBreakdown && (
        <Link
          href="/pricing"
          className="block rounded-lg border border-dashed border-titanium/50 px-4 py-3 transition-colors hover:border-plasma/50"
        >
          <p className="text-xs text-ion-1">
            Factor breakdown unlocks on Pro &amp; Elite →
          </p>
        </Link>
      )}

      {/* Data quality + freshness footer */}
      <div className="flex flex-col gap-2 border-t border-titanium/60 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <DataQualityMeter score={pick.dataQualityScore} />
        {freshnessAge !== null && (
          <div className="flex items-center gap-1.5">
            <FreshnessIndicator ageMinutes={freshnessAge} />
          </div>
        )}
      </div>

      {/* Evidence audit trigger — visible to ALL tiers for real picks (drives upgrade for FREE). */}
      <div className="flex items-center justify-stretch sm:justify-end">
        {pick.isAuditAvailable ? (
          <EvidenceAuditDrawer pickId={pick.id} />
        ) : (
          <span className="rounded-full border border-titanium bg-carbon/50 px-3 py-1 text-[11px] font-medium tracking-wide text-ion-1">
            Evidence opens on live picks
          </span>
        )}
      </div>

      {/* Glass-box explainer — PRO+ only, on real picks (server enforces the gate too). */}
      {canSeeFactorBreakdown && pick.isAuditAvailable && <AskWhy pickId={pick.id} />}
    </article>
  );
}

// ─────────────────────────────────────────────
// Factor Breakdown Panel
// ─────────────────────────────────────────────

function FactorBreakdownPanel({ breakdown }: { breakdown: FactorBreakdown }) {
  const hasIntelligenceLayer =
    (breakdown.headToHeadScore !== undefined && breakdown.headToHeadScore !== 0) ||
    (breakdown.venueFormScore !== undefined && breakdown.venueFormScore !== 0) ||
    (breakdown.crossMarketScore !== undefined && breakdown.crossMarketScore !== 0);

  return (
    <div className="rounded-lg border border-titanium/60 bg-obsidian/40 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ion-1">
        Factor Breakdown
      </p>

      {/* Core market score bars */}
      <div className="mb-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
        <ScoreBar label="Consensus" value={breakdown.consensusScore} max={30} color="bg-ion-blue" />
        <ScoreBar label="Market Depth" value={breakdown.marketDepthScore} max={20} color="bg-ultraviolet" />
        <ScoreBar label="Pricing Edge" value={breakdown.edgeScore} max={25} color="bg-verify" />
        <ScoreBar label="Line Movement" value={Math.max(0, breakdown.lineMovementScore)} max={15} color="bg-plasma" />
      </div>

      {/* Intelligence layer signal chips (v4) */}
      {hasIntelligenceLayer && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {breakdown.headToHeadScore !== undefined && breakdown.headToHeadScore > 0 && (
            <IntelChip label="H2H +" positive />
          )}
          {breakdown.headToHeadScore !== undefined && breakdown.headToHeadScore < 0 && (
            <IntelChip label="H2H –" positive={false} />
          )}
          {breakdown.venueFormScore !== undefined && breakdown.venueFormScore > 0 && (
            <IntelChip label="Venue +" positive />
          )}
          {breakdown.venueFormScore !== undefined && breakdown.venueFormScore < 0 && (
            <IntelChip label="Venue –" positive={false} />
          )}
          {breakdown.crossMarketScore !== undefined && breakdown.crossMarketScore > 0 && (
            <IntelChip label="Markets align" positive />
          )}
          {breakdown.crossMarketScore !== undefined && breakdown.crossMarketScore < 0 && (
            <IntelChip label="Markets split" positive={false} />
          )}
        </div>
      )}

      {/* Individual factors */}
      {breakdown.factors.length > 0 && (
        <div className="flex flex-col gap-1">
          {breakdown.factors.map((factor, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span
                className={[
                  "mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full",
                  factor.impact === "positive"
                    ? "bg-verify"
                    : factor.impact === "negative"
                    ? "bg-alert"
                    : "bg-ion-3",
                ].join(" ")}
                aria-hidden="true"
              />
              <span className="text-[10px] leading-relaxed text-ion-2">
                {factor.description}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Independent-edge layer (#10) — surfaced, not yet priced into confidence. */}
      {breakdown.independentEdge && breakdown.independentEdge.decision !== "PASS" && (
        <div className="mt-2 rounded-md border border-ion-blue/30 bg-ion-blue/5 p-2">
          <div className="mb-0.5 flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ion-blue">
              Independent edge
            </span>
            <span className="rounded-full bg-titanium px-1.5 py-0.5 text-[9px] text-ion-2">
              {breakdown.independentEdge.sources.join(", ") || "—"} · not yet priced
            </span>
          </div>
          <p className="text-[10px] leading-relaxed text-ion-2">
            {breakdown.independentEdge.rationale}
          </p>
        </div>
      )}

      {/* Penalty summary row */}
      {(breakdown.volatilityPenalty < 0 || (breakdown.uncertaintyPenalty !== undefined && breakdown.uncertaintyPenalty < 0)) && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {breakdown.volatilityPenalty < 0 && (
            <div className="flex items-center gap-1 rounded bg-alert/10 px-2 py-0.5">
              <span className="text-[10px] text-alert">
                Market risk: {breakdown.volatilityPenalty} pts
              </span>
            </div>
          )}
          {breakdown.uncertaintyPenalty !== undefined && breakdown.uncertaintyPenalty < 0 && (
            <div className="flex items-center gap-1 rounded bg-ultraviolet/10 px-2 py-0.5">
              <span className="text-[10px] text-ultraviolet">
                Signal conflict: {breakdown.uncertaintyPenalty} pts
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IntelChip({ label, positive }: { label: string; positive: boolean }) {
  return (
    <span
      className={[
        "rounded-full px-2 py-0.5 text-[9px] font-semibold",
        positive
          ? "bg-verify/10 text-verify"
          : "bg-alert/10 text-alert",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function ScoreBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.round(Math.max(0, Math.min((value / max) * 100, 100)));
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[10px]">
        <span className="text-ion-1">{label}</span>
        <span className="font-medium text-ion-2">{Math.round(value)}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-titanium">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Badge sub-components
// ─────────────────────────────────────────────

function GradeBadge({ grade }: { grade: PickGrade }) {
  const info = PICK_GRADE_LABELS[grade];
  if (grade === "LEAN") return null; // don't show lean badge — it's the default
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PICK_GRADE_STYLES[grade]}`}>
      {info.label}
    </span>
  );
}

function TierBadge({ tier }: { tier: "FREE" | "PREMIUM" }) {
  if (tier === "FREE") {
    return (
      <span className="rounded-full bg-verify/10 px-2 py-0.5 text-xs font-semibold text-verify">
        Free
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-plasma/10 px-2 py-0.5 text-xs font-semibold text-plasma">
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 1a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L10 13.187l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L2.818 7.125a.75.75 0 01.416-1.28l4.21-.61L9.327 1.42A.75.75 0 0110 1z"
          clipRule="evenodd"
        />
      </svg>
      Premium
    </span>
  );
}

function PickTypeBadge({ type }: { type: PickType }) {
  const colors: Record<PickType, string> = {
    SPREAD: "bg-ion-blue/10 text-ion-blue",
    MONEYLINE: "bg-ultraviolet/10 text-ultraviolet",
    TOTAL: "bg-ultraviolet/10 text-ultraviolet",
  };
  const labels: Record<PickType, string> = {
    SPREAD: "Spread",
    MONEYLINE: "ML",
    TOTAL: "Total",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[type]}`}>
      {labels[type]}
    </span>
  );
}

function badgeColor(value: number): string {
  if (value >= 80) return "text-verify bg-verify/10";
  if (value >= 70) return "text-ion-blue bg-ion-blue/10";
  if (value >= 60) return "text-plasma bg-plasma/10";
  return "text-ion-2 bg-titanium";
}

function ConfidenceBadge({
  confidence,
  calibrated,
}: {
  confidence: number;
  calibrated?: { pct: number; label: string } | null;
}) {
  // Thread 2: when the audited calibrator is active, show the HONEST calibrated
  // label + win probability instead of the raw, overstated heuristic %.
  if (calibrated) {
    return (
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeColor(calibrated.pct)}`}
        aria-label={`Calibrated confidence: ${calibrated.label}, about ${calibrated.pct} percent win probability`}
      >
        {calibrated.label} · {calibrated.pct}%
      </span>
    );
  }
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeColor(confidence)}`}
      aria-label={`Model confidence: ${confidence} out of 100`}
    >
      {confidence}%
    </span>
  );
}

function EdgeScoreBadge({ edgeScore }: { edgeScore: number }) {
  let color = "text-ion-2";
  if (edgeScore >= 70) color = "text-verify";
  else if (edgeScore >= 50) color = "text-ion-blue";
  else if (edgeScore >= 30) color = "text-plasma";
  else color = "text-ion-1";

  return (
    <span
      className={`text-xs font-bold ${color}`}
      aria-label={`Edge score: ${edgeScore} out of 100`}
    >
      {edgeScore}
    </span>
  );
}

function ResultBadge({ result }: { result: PickResult }) {
  if (result === "PENDING") return null;
  const styles: Record<Exclude<PickResult, "PENDING">, string> = {
    WIN: "bg-verify/10 text-verify",
    LOSS: "bg-alert/10 text-alert",
    PUSH: "bg-titanium text-ion-2",
    VOID: "bg-titanium text-ion-1",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${styles[result as Exclude<PickResult, "PENDING">]}`}>
      {result}
    </span>
  );
}

// Locked confidence/edge is the highest-intent, most-rendered conversion atom for
// FREE users — so it links to /pricing instead of dead-ending. Purely navigational
// (no entitlement logic; the server gate in /api/picks stays authoritative).
function LockedValue({ label }: { label: string }) {
  return (
    <Link
      href="/pricing"
      aria-label={`${label} unlocks on Pro — see pricing`}
      className="flex items-center gap-1 text-xs text-ion-1 transition-colors hover:text-plasma"
    >
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
          clipRule="evenodd"
        />
      </svg>
      {label}
    </Link>
  );
}

function DataQualityMeter({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  let color = "bg-verify";
  let textColor = "text-verify";
  let label = "High";
  if (clamped < 40) {
    color = "bg-alert";
    textColor = "text-alert";
    label = "Low";
  } else if (clamped < 70) {
    color = "bg-plasma";
    textColor = "text-plasma";
    label = "Med";
  }
  return (
    <div
      className="flex items-center gap-2"
      aria-label={`Data quality: ${label}, ${clamped} out of 100`}
    >
      <span className="text-[10px] text-ion-1">Data Quality</span>
      <div className="h-1 w-16 overflow-hidden rounded-full bg-titanium" aria-hidden="true">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className={`text-[10px] font-semibold ${textColor}`}>{label}</span>
    </div>
  );
}

function FreshnessIndicator({ ageMinutes }: { ageMinutes: number }) {
  let color = "text-verify";
  let label = "Live";
  if (ageMinutes >= 60) {
    color = "text-alert";
    label = `${Math.round(ageMinutes / 60)}h old`;
  } else if (ageMinutes >= 30) {
    color = "text-plasma";
    label = `${ageMinutes}m old`;
  } else if (ageMinutes >= 10) {
    color = "text-ion-2";
    label = `${ageMinutes}m ago`;
  }

  return (
    <>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          ageMinutes < 10 ? "bg-verify" : ageMinutes < 30 ? "bg-ion-3" : "bg-plasma"
        }`}
        aria-hidden="true"
      />
      <span className={`text-[10px] ${color}`}>
        Data: {label}
      </span>
    </>
  );
}
