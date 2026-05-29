import type {
  PublicPick,
  PickType,
  PickGrade,
  PickResult,
  FactorBreakdown,
} from "@sports/types";
import { PICK_GRADE_LABELS, RISK_LEVEL_LABELS } from "@sports/types";
import { EvidenceAuditDrawer } from "./evidence-audit-drawer";

// ─────────────────────────────────────────────
// Main PickCard
// ─────────────────────────────────────────────

interface PickCardProps {
  pick: PublicPick;
  canSeeConfidence: boolean;
  canSeeEdgeScore: boolean;
  canSeeFactorBreakdown: boolean;
}

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
          ? "border-yellow-700/50 bg-gray-900 shadow-yellow-900/20"
          : "border-gray-800 bg-gray-900",
      ].join(" ")}
    >
      {/* Featured ribbon */}
      {isFeatured && (
        <div className="absolute right-4 top-0 -translate-y-1/2">
          <span className="rounded-full bg-yellow-400 px-2.5 py-0.5 text-xs font-bold text-yellow-900">
            Top Pick
          </span>
        </div>
      )}

      {/* Header: sport + badges */}
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-semibold text-gray-300">
          {pick.game.sport}
        </span>
        <div className="flex items-center gap-1.5">
          <GradeBadge grade={pick.pickGrade} />
          <TierBadge tier={pick.tier} />
          <ResultBadge result={pick.result} />
        </div>
      </div>

      {/* Matchup */}
      <div>
        <p className="text-xs text-gray-500">{gameTime}</p>
        <div className="mt-1.5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{pick.game.awayTeam}</p>
            <p className="text-[10px] text-gray-600">@</p>
            <p className="text-sm font-semibold text-white">{pick.game.homeTeam}</p>
          </div>
          <PickTypeBadge type={pick.pickType} />
        </div>
      </div>

      {/* Selection box */}
      <div className="rounded-lg bg-gray-800/60 px-4 py-3">
        <p className="text-xs font-medium text-gray-500">Pick</p>
        <p className="mt-0.5 text-lg font-bold text-white">{pick.selection}</p>
        {pick.line !== 0 && (
          <p className="mt-0.5 text-xs text-gray-500">
            Line: {pick.line > 0 ? "+" : ""}{pick.line}
          </p>
        )}
      </div>

      {/* Scores row: confidence + edge + risk */}
      <div className="flex items-center gap-3">
        {/* Confidence */}
        <div className="flex-1">
          <p className="mb-1 text-[10px] font-medium text-gray-600">Confidence</p>
          {canSeeConfidence && pick.confidence !== null ? (
            <ConfidenceBadge confidence={pick.confidence} />
          ) : (
            <LockedValue label="Conf." />
          )}
        </div>

        {/* Edge score */}
        <div className="flex-1">
          <p className="mb-1 text-[10px] font-medium text-gray-600">Edge Score</p>
          {canSeeEdgeScore && pick.edgeScore !== null ? (
            <EdgeScoreBadge edgeScore={pick.edgeScore} />
          ) : (
            <LockedValue label="Edge" />
          )}
        </div>

        {/* Risk */}
        <div className="flex-1">
          <p className="mb-1 text-[10px] font-medium text-gray-600">Risk</p>
          <span className={`text-xs font-semibold ${riskInfo.color}`}>
            {riskInfo.label}
          </span>
        </div>
      </div>

      {/* Reasoning teaser / full */}
      <p className="text-xs leading-relaxed text-gray-500">
        {canSeeConfidence ? pick.reasoning : pick.reasoningShort}
      </p>

      {/* Factor breakdown (PRO+ only) */}
      {canSeeFactorBreakdown && pick.factorBreakdown && (
        <FactorBreakdownPanel breakdown={pick.factorBreakdown} />
      )}
      {!canSeeFactorBreakdown && (
        <div className="rounded-lg border border-dashed border-gray-700/50 px-4 py-3">
          <p className="text-xs text-gray-600">
            Factor breakdown available on Pro &amp; Elite
          </p>
        </div>
      )}

      {/* Data quality + freshness footer */}
      <div className="flex items-center justify-between border-t border-gray-800/60 pt-2">
        <DataQualityMeter score={pick.dataQualityScore} />
        {freshnessAge !== null && <FreshnessIndicator ageMinutes={freshnessAge} />}
      </div>

      {/* Evidence audit trigger — visible to ALL tiers for real picks (drives upgrade for FREE). */}
      <div className="flex items-center justify-end">
        {pick.isAuditAvailable ? (
          <EvidenceAuditDrawer pickId={pick.id} />
        ) : (
          <span className="rounded-full border border-gray-800 bg-gray-900/50 px-3 py-1 text-[11px] font-medium tracking-wide text-gray-500">
            Evidence opens on live picks
          </span>
        )}
      </div>
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
    <div className="rounded-lg border border-gray-800/60 bg-gray-950/40 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        Factor Breakdown
      </p>

      {/* Core market score bars */}
      <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <ScoreBar label="Consensus" value={breakdown.consensusScore} max={30} color="bg-blue-500" />
        <ScoreBar label="Market Depth" value={breakdown.marketDepthScore} max={20} color="bg-purple-500" />
        <ScoreBar label="Pricing Edge" value={breakdown.edgeScore} max={25} color="bg-green-500" />
        <ScoreBar label="Line Movement" value={Math.max(0, breakdown.lineMovementScore)} max={15} color="bg-yellow-500" />
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
                    ? "bg-green-400"
                    : factor.impact === "negative"
                    ? "bg-red-400"
                    : "bg-gray-500",
                ].join(" ")}
                aria-hidden="true"
              />
              <span className="text-[10px] leading-relaxed text-gray-400">
                {factor.description}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Penalty summary row */}
      {(breakdown.volatilityPenalty < 0 || (breakdown.uncertaintyPenalty !== undefined && breakdown.uncertaintyPenalty < 0)) && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {breakdown.volatilityPenalty < 0 && (
            <div className="flex items-center gap-1 rounded bg-red-950/30 px-2 py-0.5">
              <span className="text-[10px] text-red-400">
                Market risk: {breakdown.volatilityPenalty} pts
              </span>
            </div>
          )}
          {breakdown.uncertaintyPenalty !== undefined && breakdown.uncertaintyPenalty < 0 && (
            <div className="flex items-center gap-1 rounded bg-orange-950/30 px-2 py-0.5">
              <span className="text-[10px] text-orange-400">
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
          ? "bg-emerald-900/40 text-emerald-400"
          : "bg-red-900/30 text-red-400",
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
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-400">{Math.round(value)}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-gray-800">
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
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${info.color} ${info.bgColor}`}>
      {info.label}
    </span>
  );
}

function TierBadge({ tier }: { tier: "FREE" | "PREMIUM" }) {
  if (tier === "FREE") {
    return (
      <span className="rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-semibold text-green-400">
        Free
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-yellow-900/40 px-2 py-0.5 text-xs font-semibold text-yellow-400">
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
    SPREAD: "bg-blue-900/40 text-blue-400",
    MONEYLINE: "bg-purple-900/40 text-purple-400",
    TOTAL: "bg-orange-900/40 text-orange-400",
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

function ConfidenceBadge({ confidence }: { confidence: number }) {
  let color = "text-gray-400 bg-gray-800";
  if (confidence >= 80) color = "text-green-400 bg-green-900/40";
  else if (confidence >= 70) color = "text-blue-400 bg-blue-900/40";
  else if (confidence >= 60) color = "text-yellow-400 bg-yellow-900/40";

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${color}`}
      aria-label={`Model confidence: ${confidence} out of 100`}
    >
      {confidence}%
    </span>
  );
}

function EdgeScoreBadge({ edgeScore }: { edgeScore: number }) {
  let color = "text-gray-400";
  if (edgeScore >= 70) color = "text-green-400";
  else if (edgeScore >= 50) color = "text-blue-400";
  else if (edgeScore >= 30) color = "text-yellow-400";
  else color = "text-gray-500";

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
    WIN: "bg-green-900/50 text-green-400",
    LOSS: "bg-red-900/50 text-red-400",
    PUSH: "bg-gray-800 text-gray-400",
    VOID: "bg-gray-800 text-gray-500",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${styles[result as Exclude<PickResult, "PENDING">]}`}>
      {result}
    </span>
  );
}

function LockedValue({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1 text-xs text-gray-600">
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
          clipRule="evenodd"
        />
      </svg>
      {label}
    </span>
  );
}

function DataQualityMeter({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  let color = "bg-green-500";
  let textColor = "text-green-400";
  let label = "High";
  if (clamped < 40) {
    color = "bg-red-500";
    textColor = "text-red-400";
    label = "Low";
  } else if (clamped < 70) {
    color = "bg-yellow-500";
    textColor = "text-yellow-400";
    label = "Med";
  }
  return (
    <div
      className="flex items-center gap-2"
      aria-label={`Data quality: ${label}, ${clamped} out of 100`}
    >
      <span className="text-[10px] text-gray-600">Data Quality</span>
      <div className="h-1 w-16 overflow-hidden rounded-full bg-gray-800" aria-hidden="true">
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
  let color = "text-green-400";
  let label = "Live";
  if (ageMinutes >= 60) {
    color = "text-red-400";
    label = `${Math.round(ageMinutes / 60)}h old`;
  } else if (ageMinutes >= 30) {
    color = "text-yellow-400";
    label = `${ageMinutes}m old`;
  } else if (ageMinutes >= 10) {
    color = "text-gray-400";
    label = `${ageMinutes}m ago`;
  }

  return (
    <>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          ageMinutes < 10 ? "bg-green-400" : ageMinutes < 30 ? "bg-gray-400" : "bg-yellow-400"
        }`}
        aria-hidden="true"
      />
      <span className={`text-[10px] ${color}`}>
        Data: {label}
      </span>
    </>
  );
}
