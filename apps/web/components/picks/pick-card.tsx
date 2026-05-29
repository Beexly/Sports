"use client";

import type {
  PublicPick,
  PickType,
  PickGrade,
  PickResult,
  FactorBreakdown,
} from "@sports/types";
import { PICK_GRADE_LABELS, RISK_LEVEL_LABELS } from "@sports/types";
import { EvidenceAuditDrawer } from "./evidence-audit-drawer";
import { PickEvidenceSection, ageToFreshness } from "./PickEvidenceSection";
import type { EvidenceSource } from "@/components/ui/evidence-card";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// Surface-Agnostic PickCard — PickCardData interface
// Used by: Today's Board, Pick Feed, any surface that renders picks
// ─────────────────────────────────────────────────────────────────────────────

export type PickCardData = {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  selection: string;
  pickType: "SPREAD" | "MONEYLINE" | "TOTAL";
  confidence: number; // 0–100
  tier: "FREE" | "PRO" | "ELITE";
  signalGrade?: "A" | "B" | "C" | "D" | "F";
  riskGrade?: "low" | "moderate" | "elevated" | "high";
  isFeatured?: boolean;
  publishedAt?: string;
  result?: "WIN" | "LOSS" | "PUSH" | "PENDING" | "VOID";
  factorTrailHref?: string;
  // Evidence provenance — canonical via PickEvidenceSection
  source?: EvidenceSource;
  dataFreshnessAt?: string | null;
  modelVersion?: string;
  failureCase?: string;
};

type PickCardProps = {
  pick: PickCardData;
  variant?: "compact" | "full";
  showResult?: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickTypeStyles(
  type: "SPREAD" | "MONEYLINE" | "TOTAL",
): { pill: string; label: string; text: string } {
  switch (type) {
    case "SPREAD":
      return {
        pill: "bg-blue-950/30 border border-blue-800/40",
        label: "Spread",
        text: "text-blue-400",
      };
    case "MONEYLINE":
      return {
        pill: "bg-purple-950/30 border border-purple-800/40",
        label: "Moneyline",
        text: "text-purple-400",
      };
    case "TOTAL":
      return {
        pill: "bg-orange-950/30 border border-orange-800/40",
        label: "Total",
        text: "text-orange-400",
      };
  }
}

function confidenceStyles(score: number): {
  label: string;
  textColor: string;
  fillColor: string;
} {
  if (score >= 80)
    return {
      label: "Elite",
      textColor: "text-green-400",
      fillColor: "bg-green-400",
    };
  if (score >= 65)
    return {
      label: "High",
      textColor: "text-cyan-400",
      fillColor: "bg-cyan-400",
    };
  if (score >= 50)
    return {
      label: "Moderate",
      textColor: "text-yellow-400",
      fillColor: "bg-yellow-400",
    };
  return {
    label: "Low",
    textColor: "text-gray-400",
    fillColor: "bg-gray-500",
  };
}

function tierStyles(tier: "FREE" | "PRO" | "ELITE"): {
  classes: string;
  label: string;
} {
  switch (tier) {
    case "FREE":
      return {
        classes:
          "bg-gray-800/60 text-gray-300 border border-gray-700/40",
        label: "FREE",
      };
    case "PRO":
      return {
        classes:
          "bg-cyan-950/40 text-cyan-300 border border-cyan-800/40",
        label: "PRO",
      };
    case "ELITE":
      return {
        classes:
          "bg-purple-950/40 text-purple-300 border border-purple-800/40",
        label: "ELITE",
      };
  }
}

function resultStyles(result: NonNullable<PickCardData["result"]>): string {
  switch (result) {
    case "WIN":
      return "text-green-400 bg-green-950/30 border border-green-800/40";
    case "LOSS":
      return "text-red-400 bg-red-950/30 border border-red-800/40";
    case "PUSH":
      return "text-yellow-400 bg-yellow-950/30 border border-yellow-800/40";
    case "PENDING":
      return "text-gray-400 bg-gray-800/40 border border-gray-700/40";
    case "VOID":
      return "text-gray-500 bg-gray-900/40 border border-gray-800/40";
  }
}

function signalGradeStyles(grade: NonNullable<PickCardData["signalGrade"]>): string {
  switch (grade) {
    case "A":
      return "text-green-400 bg-green-950/30 border border-green-800/40";
    case "B":
      return "text-cyan-400 bg-cyan-950/30 border border-cyan-800/40";
    case "C":
      return "text-yellow-400 bg-yellow-950/30 border border-yellow-800/40";
    case "D":
      return "text-orange-400 bg-orange-950/30 border border-orange-800/40";
    case "F":
      return "text-red-400 bg-red-950/30 border border-red-800/40";
  }
}

function riskGradeStyles(grade: NonNullable<PickCardData["riskGrade"]>): string {
  switch (grade) {
    case "low":
      return "text-green-400";
    case "moderate":
      return "text-yellow-400";
    case "elevated":
      return "text-orange-400";
    case "high":
      return "text-red-400";
  }
}

function riskGradeLabel(grade: NonNullable<PickCardData["riskGrade"]>): string {
  switch (grade) {
    case "low":
      return "Low risk";
    case "moderate":
      return "Moderate risk";
    case "elevated":
      return "Elevated risk";
    case "high":
      return "High risk";
  }
}

function sportBadgeColor(sport: string): string {
  const s = sport.toUpperCase();
  if (s === "NFL" || s.includes("NCAAF")) return "bg-amber-950/40 text-amber-300 border border-amber-800/30";
  if (s === "NBA" || s.includes("NCAAB")) return "bg-blue-950/40 text-blue-300 border border-blue-800/30";
  if (s === "MLB") return "bg-red-950/40 text-red-300 border border-red-800/30";
  if (s === "NHL") return "bg-sky-950/40 text-sky-300 border border-sky-800/30";
  if (s === "SOCCER" || s === "MLS") return "bg-emerald-950/40 text-emerald-300 border border-emerald-800/30";
  return "bg-gray-800/60 text-gray-300 border border-gray-700/40";
}

function formatPublishedAt(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ─── PickCard component ───────────────────────────────────────────────────────

export function PickCard({
  pick,
  variant = "full",
  showResult = false,
}: PickCardProps): JSX.Element {
  const typeStyle = pickTypeStyles(pick.pickType);
  const conf = confidenceStyles(pick.confidence);
  const tier = tierStyles(pick.tier);
  const confPct = Math.min(100, Math.max(0, pick.confidence));
  const isCompact = variant === "compact";

  const articleClasses = [
    "relative flex flex-col rounded-xl border bg-gray-900/60",
    pick.isFeatured
      ? "border-l-4 border-l-cyan-500 border-mineral bg-gradient-to-r from-cyan-950/20"
      : "border-mineral",
    isCompact ? "gap-3 p-4" : "gap-4 p-5",
  ].join(" ");

  return (
    <article className={articleClasses}>
      {/* ── Featured ribbon ─────────────────────────────────────────── */}
      {pick.isFeatured && (
        <span className="absolute right-3 top-3 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-400">
          Featured
        </span>
      )}

      {/* ── Header row: sport badge + tier + result ──────────────────── */}
      <div className="flex items-center gap-2 flex-wrap pr-12">
        <span
          className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${sportBadgeColor(pick.sport)}`}
        >
          {pick.sport.toUpperCase()}
        </span>

        <span
          className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${tier.classes}`}
        >
          {tier.label}
        </span>

        {pick.signalGrade && (
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold ${signalGradeStyles(pick.signalGrade)}`}
            title="Signal grade"
          >
            {pick.signalGrade}
          </span>
        )}

        {showResult && pick.result && pick.result !== "PENDING" && (
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold ${resultStyles(pick.result)}`}
          >
            {pick.result}
          </span>
        )}
      </div>

      {/* ── Matchup header ───────────────────────────────────────────── */}
      <div className={isCompact ? "" : "pr-4"}>
        <p className="text-xs font-semibold leading-snug text-white">
          {pick.awayTeam}{" "}
          <span className="text-gray-500">@</span>{" "}
          {pick.homeTeam}
        </p>
        {pick.publishedAt && (
          <p className="mt-0.5 font-mono text-[10px] text-gray-500">
            {formatPublishedAt(pick.publishedAt)}
          </p>
        )}
      </div>

      {/* ── Selection pill ───────────────────────────────────────────── */}
      <div
        className={`inline-flex self-start items-center gap-2 rounded-lg px-3 py-2 ${typeStyle.pill}`}
      >
        <div>
          <p
            className={`font-mono text-[9px] uppercase tracking-widest ${typeStyle.text}`}
          >
            {typeStyle.label}
          </p>
          <p className="mt-0.5 text-sm font-bold text-white leading-snug">
            {pick.selection}
          </p>
        </div>
      </div>

      {/* ── Confidence bar ───────────────────────────────────────────── */}
      {!isCompact && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-wider text-gray-500">
              Confidence
            </span>
            <span className={`font-mono text-[10px] font-semibold ${conf.textColor}`}>
              {conf.label} · {pick.confidence}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-800">
            <div
              className={`h-full rounded-full ${conf.fillColor}`}
              style={{ width: `${confPct}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Compact confidence display ───────────────────────────────── */}
      {isCompact && (
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-gray-800">
            <div
              className={`h-full rounded-full ${conf.fillColor}`}
              style={{ width: `${confPct}%` }}
            />
          </div>
          <span className={`font-mono text-[10px] font-bold tabular-nums ${conf.textColor}`}>
            {pick.confidence}
          </span>
        </div>
      )}

      {/* ── Footer row: evidence provenance + risk grade + factor trail ── */}
      {!isCompact && (
        <>
          <PickEvidenceSection
            kind="pick"
            source={pick.source ?? "galaxy-model"}
            freshness={ageToFreshness(
              pick.dataFreshnessAt
                ? Math.round((Date.now() - new Date(pick.dataFreshnessAt).getTime()) / 60_000)
                : null,
            )}
            modelVersion={pick.modelVersion}
            failureCase={pick.failureCase ?? "Not available — snapshot pending."}
          />
          <div className="flex items-center justify-between">
            {pick.riskGrade && (
              <span
                className={`font-mono text-[10px] font-semibold ${riskGradeStyles(pick.riskGrade)}`}
              >
                {riskGradeLabel(pick.riskGrade)}
              </span>
            )}
            {pick.factorTrailHref && (
              <Link
                href={pick.factorTrailHref}
                className="ml-auto text-xs font-semibold text-ion-blue hover:underline"
              >
                View trail →
              </Link>
            )}
          </div>
        </>
      )}
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FullPickCard — full-featured card backed by PublicPick from @sports/types
// Used by: /picks page (server-rendered, auth-gated entitlements)
// ─────────────────────────────────────────────────────────────────────────────

interface FullPickCardProps {
  pick: PublicPick;
  canSeeConfidence: boolean;
  canSeeEdgeScore: boolean;
  canSeeFactorBreakdown: boolean;
}

export function FullPickCard({
  pick,
  canSeeConfidence,
  canSeeEdgeScore,
  canSeeFactorBreakdown,
}: FullPickCardProps) {
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
          : "border-mineral bg-gray-900",
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

      {/* Evidence row: canonical PickEvidenceSection — Evidence Chain Standard */}
      <div className="flex items-center gap-3 border-t border-mineral/60 pt-2">
        <DataQualityMeter score={pick.dataQualityScore} />
        <div className="flex-1">
          <PickEvidenceSection
            kind="pick"
            source="galaxy-model"
            freshness={ageToFreshness(freshnessAge)}
            failureCase={
              (pick as { premortem?: { headline: string } }).premortem?.headline ??
              "Not available — snapshot pending."
            }
          />
        </div>
      </div>

      {/* Evidence audit trigger — visible to ALL tiers for real picks (drives upgrade for FREE). */}
      <div className="flex items-center justify-end">
        {pick.isAuditAvailable ? (
          <EvidenceAuditDrawer pickId={pick.id} />
        ) : (
          <span className="rounded-full border border-mineral bg-gray-900/50 px-3 py-1 text-[11px] font-medium tracking-wide text-gray-500">
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
    <div className="rounded-lg border border-mineral/60 bg-carbon/40 p-3">
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
// Badge sub-components (used by FullPickCard)
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
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${color}`}>
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

  return <span className={`text-xs font-bold ${color}`}>{edgeScore}</span>;
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
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-600">Data Quality</span>
      <div className="h-1 w-16 overflow-hidden rounded-full bg-gray-800">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className={`text-[10px] font-semibold ${textColor}`}>{label}</span>
    </div>
  );
}

