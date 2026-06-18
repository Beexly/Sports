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
  /** Stagger index for entrance animation delay (optional). */
  index?: number;
}

// Grade → card border + ambient glow (base state).
// hover adds a dark lift on top; both shadow values stack in CSS.
const GRADE_CARD_STYLES: Record<PickGrade, { border: string; shadow: string }> = {
  ELITE_PLAY: { border: "border-plasma/50",   shadow: "shadow-glow-plasma" },
  STRONG_PLAY:{ border: "border-ion-blue/30", shadow: "shadow-glow-cyan" },
  SOLID_PLAY: { border: "border-ion-blue/15", shadow: "" },
  LEAN:       { border: "border-titanium",    shadow: "" },
};

const RISK_LEVEL_STYLES: Record<RiskLevel, string> = {
  LOW_RISK:     "text-verify",
  MODERATE:     "text-plasma",
  HIGH_VARIANCE:"text-ultraviolet",
  INJURY_RISK:  "text-alert",
  LINE_STEAM:   "text-ultraviolet",
};

export function PickCard({
  pick,
  canSeeConfidence,
  canSeeEdgeScore,
  canSeeFactorBreakdown,
  index = 0,
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
  const gradeStyle = GRADE_CARD_STYLES[pick.pickGrade];

  return (
    <article
      className={[
        "relative flex flex-col gap-4 rounded-2xl border p-5",
        "bg-carbon transition-all duration-300",
        "hover:shadow-[0_8px_32px_rgba(0,0,0,0.6)]",
        "animate-fade-up",
        gradeStyle.border,
        gradeStyle.shadow,
      ].join(" ")}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {/* Featured ribbon */}
      {isFeatured && (
        <div className="absolute right-4 top-0 -translate-y-1/2">
          <span className="rounded-full bg-plasma px-2.5 py-0.5 text-xs font-bold text-plasma-ink shadow-[0_0_12px_rgba(255,45,214,0.6)]">
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
            <p className="truncate text-sm font-semibold text-white">{pick.game.awayTeam}</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-white">
              <span className="font-normal text-ion-2">@ </span>
              {pick.game.homeTeam}
            </p>
          </div>
          <PickTypeBadge type={pick.pickType} />
        </div>
      </div>

      {/* Selection box */}
      <div className="rounded-lg bg-titanium/60 px-4 py-3">
        <p className="text-xs font-medium text-ion-1">Pick</p>
        <p className="mt-0.5 text-lg font-bold text-white">{pick.selection}</p>
        {pick.line !== 0 && pick.pickType !== "SPREAD" && (
          <p className="mt-0.5 text-xs text-ion-1">
            Line: {pick.line > 0 ? "+" : ""}{pick.line}
          </p>
        )}
      </div>

      {/* Scores row: confidence + edge + risk */}
      <div className="grid grid-cols-3 gap-3">
        {/* Confidence */}
        <div className="min-w-0">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ion-3">
            Confidence
          </p>
          {canSeeConfidence && pick.confidence !== null ? (
            <ConfidenceRing confidence={pick.confidence} />
          ) : (
            <LockedValue label="Conf." />
          )}
        </div>

        {/* Edge score */}
        <div className="min-w-0">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ion-3">
            Edge
          </p>
          {canSeeEdgeScore && pick.edgeScore !== null ? (
            <EdgeRing edgeScore={pick.edgeScore} />
          ) : (
            <LockedValue label="Edge" />
          )}
        </div>

        {/* Risk */}
        <div className="min-w-0">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ion-3">
            Risk
          </p>
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
        <DataQualityRing score={pick.dataQualityScore} />
        {freshnessAge !== null && (
          <div className="flex items-center gap-1.5">
            <FreshnessIndicator ageMinutes={freshnessAge} />
          </div>
        )}
      </div>

      {/* Evidence audit trigger */}
      <div className="flex items-center justify-stretch sm:justify-end">
        {pick.isAuditAvailable ? (
          <EvidenceAuditDrawer pickId={pick.id} />
        ) : (
          <span className="rounded-full border border-titanium bg-carbon/50 px-3 py-1 text-[11px] font-medium tracking-wide text-ion-1">
            Evidence opens on live picks
          </span>
        )}
      </div>

      {/* Glass-box explainer — PRO+ only */}
      {canSeeFactorBreakdown && pick.isAuditAvailable && <AskWhy pickId={pick.id} />}
    </article>
  );
}

// ─────────────────────────────────────────────
// SVG Radial Ring Gauges
// ─────────────────────────────────────────────

function ConfidenceRing({ confidence }: { confidence: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r; // ≈ 100.5
  const filled = (confidence / 100) * circ;

  let stroke = "#9AA3C0"; // ion-3
  let textCls = "text-ion-2";
  if (confidence >= 80) { stroke = "#5FD9A3"; textCls = "text-verify"; }
  else if (confidence >= 70) { stroke = "#00E5FF"; textCls = "text-ion-blue"; }
  else if (confidence >= 60) { stroke = "#FF2DD6"; textCls = "text-plasma"; }

  return (
    <div
      className="flex items-center gap-2"
      aria-label={`Model confidence: ${confidence}%`}
    >
      <svg
        width="40" height="40" viewBox="0 0 40 40"
        aria-hidden="true"
        className="shrink-0 -rotate-90"
      >
        {/* Track */}
        <circle
          cx="20" cy="20" r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="3"
        />
        {/* Arc */}
        <circle
          cx="20" cy="20" r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
          style={confidence >= 75
            ? { filter: `drop-shadow(0 0 4px ${stroke})` }
            : undefined
          }
        />
      </svg>
      <span className={`text-xs font-bold tabular-nums ${textCls}`}>
        {confidence}%
      </span>
    </div>
  );
}

function EdgeRing({ edgeScore }: { edgeScore: number }) {
  const r = 12;
  const circ = 2 * Math.PI * r; // ≈ 75.4
  const filled = (edgeScore / 100) * circ;

  let stroke = "#9AA3C0";
  let textCls = "text-ion-2";
  if (edgeScore >= 70) { stroke = "#5FD9A3"; textCls = "text-verify"; }
  else if (edgeScore >= 50) { stroke = "#00E5FF"; textCls = "text-ion-blue"; }
  else if (edgeScore >= 30) { stroke = "#FF2DD6"; textCls = "text-plasma"; }

  return (
    <div
      className="flex items-center gap-2"
      aria-label={`Edge score: ${edgeScore}`}
    >
      <svg
        width="30" height="30" viewBox="0 0 30 30"
        aria-hidden="true"
        className="shrink-0 -rotate-90"
      >
        <circle
          cx="15" cy="15" r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="2.5"
        />
        <circle
          cx="15" cy="15" r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
        />
      </svg>
      <span className={`text-xs font-bold tabular-nums ${textCls}`}>
        {edgeScore}
      </span>
    </div>
  );
}

function DataQualityRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const r = 8;
  const circ = 2 * Math.PI * r; // ≈ 50.3
  const filled = (clamped / 100) * circ;

  let stroke = "#5FD9A3"; // verify
  let label = "High";
  let textCls = "text-verify";
  if (clamped < 40) { stroke = "#FF6470"; label = "Low"; textCls = "text-alert"; }
  else if (clamped < 70) { stroke = "#FF2DD6"; label = "Med"; textCls = "text-plasma"; }

  return (
    <div
      className="flex items-center gap-2"
      aria-label={`Data quality: ${label}, ${clamped} out of 100`}
    >
      <svg
        width="20" height="20" viewBox="0 0 20 20"
        aria-hidden="true"
        className="shrink-0 -rotate-90"
      >
        <circle
          cx="10" cy="10" r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="2"
        />
        <circle
          cx="10" cy="10" r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[10px] text-ion-1">Data Quality</span>
      <span className={`text-[10px] font-semibold ${textCls}`}>{label}</span>
    </div>
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

      <div className="mb-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
        <ScoreBar label="Consensus" value={breakdown.consensusScore} max={30} color="bg-ion-blue" />
        <ScoreBar label="Market Depth" value={breakdown.marketDepthScore} max={20} color="bg-ultraviolet" />
        <ScoreBar label="Pricing Edge" value={breakdown.edgeScore} max={25} color="bg-verify" />
        <ScoreBar label="Line Movement" value={Math.max(0, breakdown.lineMovementScore)} max={15} color="bg-plasma" />
      </div>

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

      {breakdown.independentEdge && breakdown.independentEdge.decision !== "PASS" && (
        <div className="mt-2 rounded-md border border-ion-blue/30 bg-ion-blue/5 p-2">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ion-blue">
              Independent edge
            </span>
            <span className="rounded-full bg-titanium px-1.5 py-0.5 text-[9px] text-ion-2">
              {breakdown.independentEdge.sources.join(", ") || "—"} · not yet priced
            </span>
          </div>
          {breakdown.independentEdge.trueProb !== null && (
            <div className="mb-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[10px] text-ion-2">
                Our read{" "}
                <span className="font-semibold text-ion-blue">
                  {Math.round(breakdown.independentEdge.trueProb * 100)}%
                </span>
              </span>
              <span className="text-[9px] text-ion-3">vs</span>
              <span className="text-[10px] text-ion-2">
                Market{" "}
                <span className="font-semibold text-ion-1">
                  {Math.round(breakdown.independentEdge.marketFairProb * 100)}%
                </span>
              </span>
              {breakdown.independentEdge.expectedClv > 0 && (
                <span className="text-[10px] text-ion-2">
                  Beat-the-close{" "}
                  <span className="font-semibold text-verify">
                    +{breakdown.independentEdge.expectedClv.toFixed(1)} pts
                  </span>
                </span>
              )}
            </div>
          )}
          <p className="text-[10px] leading-relaxed text-ion-2">
            {breakdown.independentEdge.rationale}
          </p>
        </div>
      )}

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
        positive ? "bg-verify/10 text-verify" : "bg-alert/10 text-alert",
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
  if (grade === "LEAN") return null;

  const baseStyles: Record<Exclude<PickGrade, "LEAN">, string> = {
    ELITE_PLAY:  "text-plasma bg-plasma/10 shadow-[0_0_12px_rgba(255,45,214,0.5)]",
    STRONG_PLAY: "text-verify bg-verify/10",
    SOLID_PLAY:  "text-ion-blue bg-ion-blue/10",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${baseStyles[grade as Exclude<PickGrade, "LEAN">]}`}
    >
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
    SPREAD:    "bg-ion-blue/10 text-ion-blue",
    MONEYLINE: "bg-ultraviolet/10 text-ultraviolet",
    TOTAL:     "bg-ultraviolet/10 text-ultraviolet",
  };
  const labels: Record<PickType, string> = {
    SPREAD:    "Spread",
    MONEYLINE: "ML",
    TOTAL:     "Total",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[type]}`}>
      {labels[type]}
    </span>
  );
}

function ResultBadge({ result }: { result: PickResult }) {
  if (result === "PENDING") return null;
  const styles: Record<Exclude<PickResult, "PENDING">, string> = {
    WIN:  "bg-verify/10 text-verify",
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

function FreshnessIndicator({ ageMinutes }: { ageMinutes: number }) {
  const isLive = ageMinutes < 10;
  let dotCls = isLive
    ? "bg-verify animate-live-pulse"
    : ageMinutes < 30
    ? "bg-ion-3"
    : "bg-plasma";

  let textCls = "text-verify";
  let label = "Live";
  if (ageMinutes >= 60) {
    textCls = "text-alert";
    label = `${Math.round(ageMinutes / 60)}h old`;
  } else if (ageMinutes >= 30) {
    textCls = "text-plasma";
    label = `${ageMinutes}m old`;
  } else if (ageMinutes >= 10) {
    textCls = "text-ion-2";
    label = `${ageMinutes}m ago`;
  }

  return (
    <>
      <span
        className={`h-1.5 w-1.5 rounded-full ${dotCls}`}
        aria-hidden="true"
      />
      <span className={`text-[10px] ${textCls}`}>Data: {label}</span>
    </>
  );
}
