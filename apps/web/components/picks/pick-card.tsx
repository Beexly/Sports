"use client";

import { useState } from "react";
import type { PublicPick, PickType, PickGrade, PickResult, FactorBreakdown, PickTrends, AtsRecord } from "@sports/types";
import { PICK_GRADE_LABELS, RISK_LEVEL_LABELS } from "@sports/types";

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
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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
  const confidenceColor = getConfidenceColor(pick.confidence);

  function copyPick() {
    const trends = pick.trends;
    const hasAts = trends?.homeTeamAts;
    const shortHome = shortTeamName(pick.game.homeTeam);
    const lines: string[] = [];
    lines.push(`${pick.selection} · ${canSeeConfidence && pick.confidence !== null ? `${pick.confidence}/100` : pick.pickGrade}`);
    if (hasAts && canSeeConfidence) {
      const r = trends.homeTeamAts!;
      lines.push(`${shortHome} ${r.wins}-${r.losses} ATS last ${r.window}`);
    }
    const ctx = trends?.seriesContext;
    if (ctx) {
      const lead = ctx.trailingTeam === null
        ? `Series tied ${ctx.seriesHomeWins}-${ctx.seriesAwayWins}`
        : `${shortTeamName(ctx.trailingTeam === "AWAY" ? pick.game.homeTeam : pick.game.awayTeam)} leads ${Math.max(ctx.seriesHomeWins, ctx.seriesAwayWins)}-${Math.min(ctx.seriesHomeWins, ctx.seriesAwayWins)}`;
      lines.push(lead);
    }
    lines.push(`via SportsPicks Pro`);
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <article
      className={[
        "group relative flex flex-col rounded-2xl border transition-all duration-200",
        "hover:shadow-xl hover:shadow-black/50 hover:-translate-y-0.5",
        isFeatured
          ? "border-yellow-700/50 bg-gradient-to-b from-gray-900 to-gray-900/95 shadow-md shadow-yellow-900/10"
          : "border-gray-800 bg-gray-900",
      ].join(" ")}
    >
      {/* Confidence accent bar — top edge, full width */}
      <div
        className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl"
        style={{
          background: pick.confidence !== null
            ? confidenceGradient(pick.confidence)
            : "linear-gradient(to right, #374151, #4b5563)",
        }}
        aria-hidden="true"
      />

      <div className="flex flex-col gap-4 p-5">
        {/* Featured ribbon */}
        {isFeatured && (
          <div className="absolute right-4 top-0 -translate-y-1/2">
            <span className="rounded-full bg-yellow-400 px-2.5 py-0.5 text-xs font-bold text-yellow-900 shadow">
              Top Pick
            </span>
          </div>
        )}

        {/* Header row: sport + badges + copy */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-semibold text-gray-300">
              {pick.game.sport}
            </span>
            <GradeBadge grade={pick.pickGrade} />
            <TierBadge tier={pick.tier} />
            <ResultBadge result={pick.result} />
          </div>
          <button
            onClick={copyPick}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-gray-600 transition-colors hover:bg-gray-800 hover:text-gray-300"
            title="Copy pick"
            aria-label="Copy pick to clipboard"
          >
            {copied ? (
              <svg className="h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
            )}
            <span>{copied ? "Copied" : "Share"}</span>
          </button>
        </div>

        {/* Matchup — prominent */}
        <div>
          <p className="mb-2 text-[10px] text-gray-500">{gameTime}</p>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-600">Away</span>
                <p className="text-sm font-semibold text-white leading-tight">{pick.game.awayTeam}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-600">Home</span>
                <p className="text-sm font-semibold text-white leading-tight">{pick.game.homeTeam}</p>
              </div>
            </div>
            <PickTypeBadge type={pick.pickType} />
          </div>
        </div>

        {/* Selection box */}
        <div className="rounded-xl bg-gray-800/70 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Pick</p>
          <p className="mt-0.5 text-xl font-bold tracking-tight text-white">{pick.selection}</p>
        </div>

        {/* Confidence bar + score row */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-semibold uppercase tracking-wide text-gray-500">Confidence</span>
            {canSeeConfidence && pick.confidence !== null ? (
              <span className={`font-bold text-sm ${confidenceColor}`}>{pick.confidence}<span className="text-[10px] font-normal text-gray-500">/100</span></span>
            ) : (
              <LockedValue label="Unlock with Pro" />
            )}
          </div>
          <ConfidenceBar confidence={canSeeConfidence ? pick.confidence : null} />
        </div>

        {/* Signal row: edge + risk */}
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex-1">
            <p className="mb-0.5 text-[10px] text-gray-600">Edge Score</p>
            {canSeeEdgeScore && pick.edgeScore !== null ? (
              <EdgeScoreBadge edgeScore={pick.edgeScore} />
            ) : (
              <LockedValue label="Edge" />
            )}
          </div>
          <div className="flex-1">
            <p className="mb-0.5 text-[10px] text-gray-600">Risk</p>
            <span className={`text-xs font-semibold ${riskInfo.color}`}>{riskInfo.label}</span>
          </div>
          <div className="flex-1">
            <p className="mb-0.5 text-[10px] text-gray-600">Data Quality</p>
            <DataQualityMeter score={pick.dataQualityScore} inline />
          </div>
        </div>

        {/* Reasoning */}
        <p className="text-xs leading-relaxed text-gray-400">
          {canSeeConfidence ? pick.reasoning : pick.reasoningShort}
        </p>

        {/* Trends panel */}
        <TrendsPanel pick={pick} canSeeTrends={canSeeConfidence} />

        {/* Factor breakdown — collapsible for PRO+ */}
        {canSeeFactorBreakdown && pick.factorBreakdown && (
          <div>
            <button
              onClick={() => setBreakdownOpen((v) => !v)}
              className="flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-400 transition-colors"
            >
              <span>Factor Breakdown</span>
              <svg
                className={`h-3.5 w-3.5 transition-transform ${breakdownOpen ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {breakdownOpen && <FactorBreakdownPanel breakdown={pick.factorBreakdown} />}
          </div>
        )}
        {!canSeeFactorBreakdown && (
          <div className="rounded-xl border border-dashed border-gray-700/50 px-4 py-3">
            <p className="text-[10px] text-gray-600">Factor breakdown · Pro &amp; Elite only</p>
          </div>
        )}

        {/* Footer: freshness */}
        {freshnessAge !== null && (
          <div className="flex items-center justify-end gap-1.5 border-t border-gray-800/60 pt-2">
            <FreshnessIndicator ageMinutes={freshnessAge} />
          </div>
        )}
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────
// Confidence gradient bar
// ─────────────────────────────────────────────

function confidenceGradient(score: number): string {
  if (score >= 80) return "linear-gradient(to right, #22c55e, #16a34a)";
  if (score >= 70) return "linear-gradient(to right, #3b82f6, #2563eb)";
  if (score >= 60) return "linear-gradient(to right, #eab308, #ca8a04)";
  return "linear-gradient(to right, #6b7280, #4b5563)";
}

function getConfidenceColor(score: number | null): string {
  if (score === null) return "text-gray-500";
  if (score >= 80) return "text-green-400";
  if (score >= 70) return "text-blue-400";
  if (score >= 60) return "text-yellow-400";
  return "text-gray-400";
}

function ConfidenceBar({ confidence }: { confidence: number | null }) {
  const pct = confidence !== null ? Math.max(0, Math.min(100, confidence)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${confidence !== null ? pct : 30}%`,
          background: confidence !== null ? confidenceGradient(confidence) : "linear-gradient(to right, #374151, #4b5563)",
          opacity: confidence !== null ? 1 : 0.4,
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Trends Panel — series context + ATS form
// ─────────────────────────────────────────────

function TrendsPanel({ pick, canSeeTrends }: { pick: PublicPick; canSeeTrends: boolean }) {
  const trends = pick.trends;
  const hasSeriesContext = !!trends?.seriesContext;
  const hasAtsData = !!(
    trends?.homeTeamAts ||
    trends?.awayTeamAts ||
    trends?.homeTeamAtsAtHome ||
    trends?.awayTeamAtsAway ||
    trends?.headToHead
  );

  return (
    <div className="space-y-2">
      {/* Series context: visible to all tiers */}
      {hasSeriesContext && trends?.seriesContext && (
        <SeriesContextBadge
          homeTeam={pick.game.homeTeam}
          awayTeam={pick.game.awayTeam}
          ctx={trends.seriesContext}
        />
      )}

      {canSeeTrends ? (
        hasAtsData && trends ? (
          <AtsTrendsPanel
            trends={trends}
            homeTeam={pick.game.homeTeam}
            awayTeam={pick.game.awayTeam}
          />
        ) : (
          // PRO user but no trend data yet
          <div className="rounded-xl border border-gray-800/60 bg-gray-950/30 px-4 py-3">
            <p className="text-[10px] text-gray-500">
              Trend data building — activates as games settle
            </p>
          </div>
        )
      ) : (
        <div className="rounded-xl border border-dashed border-gray-700/50 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[10px] text-gray-600">
            <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
            </svg>
            ATS form trends · Pro &amp; Elite only
          </p>
        </div>
      )}
    </div>
  );
}

function SeriesContextBadge({
  homeTeam,
  awayTeam,
  ctx,
}: {
  homeTeam: string;
  awayTeam: string;
  ctx: NonNullable<PickTrends["seriesContext"]>;
}) {
  const isTied = ctx.trailingTeam === null;
  const leader = ctx.trailingTeam === "AWAY" ? homeTeam : awayTeam;
  const leadWins = Math.max(ctx.seriesHomeWins, ctx.seriesAwayWins);
  const trailWins = Math.min(ctx.seriesHomeWins, ctx.seriesAwayWins);
  const seriesLine = isTied
    ? `Series tied ${ctx.seriesHomeWins}–${ctx.seriesAwayWins}`
    : `${shortTeamName(leader)} leads ${leadWins}–${trailWins}`;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-yellow-800/30 bg-yellow-950/20 px-3 py-2">
      <svg className="h-3.5 w-3.5 shrink-0 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M10 1a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L10 13.187l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L2.818 7.125a.75.75 0 01.416-1.28l4.21-.61L9.327 1.42A.75.75 0 0110 1z" clipRule="evenodd" />
      </svg>
      <span className="text-[11px] font-semibold text-yellow-300">{seriesLine}</span>
      {ctx.isEliminationGame && (
        <span className="ml-auto rounded bg-red-900/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-400">
          Elimination
        </span>
      )}
    </div>
  );
}

function AtsTrendsPanel({
  trends,
  homeTeam,
  awayTeam,
}: {
  trends: PickTrends;
  homeTeam: string;
  awayTeam: string;
}) {
  const homeName = shortTeamName(homeTeam);
  const awayName = shortTeamName(awayTeam);

  const stats: Array<{ label: string; record: AtsRecord }> = [
    trends.homeTeamAts && { label: `${homeName} last ${trends.homeTeamAts.window}`, record: trends.homeTeamAts },
    trends.homeTeamAtsAtHome && { label: `${homeName} at home`, record: trends.homeTeamAtsAtHome },
    trends.awayTeamAts && { label: `${awayName} last ${trends.awayTeamAts.window}`, record: trends.awayTeamAts },
    trends.awayTeamAtsAway && { label: `${awayName} away`, record: trends.awayTeamAtsAway },
    trends.headToHead && { label: "H2H ATS", record: trends.headToHead },
  ].filter((s): s is { label: string; record: AtsRecord } => !!s);

  if (stats.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-800/60 bg-gray-950/30 p-3">
      <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-gray-500">
        Recent Form (ATS)
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {stats.map((stat) => (
          <AtsStatRow key={stat.label} label={stat.label} record={stat.record} />
        ))}
      </div>
    </div>
  );
}

function AtsStatRow({ label, record }: { label: string; record: AtsRecord }) {
  const total = record.wins + record.losses;
  const winPct = total > 0 ? record.wins / total : 0;
  const valueColor =
    winPct >= 0.6 ? "text-green-400" : winPct <= 0.4 ? "text-red-400" : "text-gray-300";

  return (
    <div>
      <p className="mb-0.5 text-[9px] uppercase tracking-wide text-gray-600">{label}</p>
      <p className={`text-xs font-bold ${valueColor}`}>
        {record.wins}–{record.losses}{record.pushes > 0 ? `–${record.pushes}` : ""}
      </p>
    </div>
  );
}

function shortTeamName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
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
    <div className="mt-2 rounded-xl border border-gray-800/60 bg-gray-950/30 p-3">
      <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2">
        <ScoreBar label="Consensus" value={breakdown.consensusScore} max={30} color="blue" />
        <ScoreBar label="Market Depth" value={breakdown.marketDepthScore} max={20} color="purple" />
        <ScoreBar label="Pricing Edge" value={breakdown.edgeScore} max={25} color="green" />
        <ScoreBar label="Line Movement" value={Math.max(0, breakdown.lineMovementScore)} max={15} color="yellow" />
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
        <div className="flex flex-col gap-1 border-t border-gray-800/40 pt-2">
          {breakdown.factors.map((factor, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span
                className={[
                  "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
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

      {(breakdown.volatilityPenalty < 0 || (breakdown.uncertaintyPenalty !== undefined && breakdown.uncertaintyPenalty < 0)) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {breakdown.volatilityPenalty < 0 && (
            <div className="rounded bg-red-950/40 px-2 py-0.5">
              <span className="text-[10px] text-red-400">
                Market risk: {breakdown.volatilityPenalty} pts
              </span>
            </div>
          )}
          {breakdown.uncertaintyPenalty !== undefined && breakdown.uncertaintyPenalty < 0 && (
            <div className="rounded bg-orange-950/40 px-2 py-0.5">
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
  color: "blue" | "purple" | "green" | "yellow";
}) {
  const pct = Math.round(Math.max(0, Math.min((value / max) * 100, 100)));
  const colorMap = {
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
  };
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[10px]">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-400">{Math.round(value)}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className={`h-full rounded-full ${colorMap[color]}`}
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
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${info.color} ${info.bgColor}`}>
      {info.label}
    </span>
  );
}

function TierBadge({ tier }: { tier: "FREE" | "PREMIUM" }) {
  if (tier === "FREE") {
    return (
      <span className="rounded-full bg-green-900/30 px-2 py-0.5 text-[10px] font-semibold text-green-400">
        Free
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-yellow-900/30 px-2 py-0.5 text-[10px] font-semibold text-yellow-400">
      <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M10 1a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L10 13.187l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L2.818 7.125a.75.75 0 01.416-1.28l4.21-.61L9.327 1.42A.75.75 0 0110 1z" clipRule="evenodd" />
      </svg>
      Premium
    </span>
  );
}

function PickTypeBadge({ type }: { type: PickType }) {
  const configs: Record<PickType, { label: string; class: string }> = {
    SPREAD:    { label: "Spread",    class: "bg-blue-900/40 text-blue-400" },
    MONEYLINE: { label: "ML",        class: "bg-purple-900/40 text-purple-400" },
    TOTAL:     { label: "Total",     class: "bg-orange-900/40 text-orange-400" },
  };
  const cfg = configs[type];
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${cfg.class}`}>
      {cfg.label}
    </span>
  );
}

function ResultBadge({ result }: { result: PickResult }) {
  if (result === "PENDING") return null;
  const styles: Record<Exclude<PickResult, "PENDING">, string> = {
    WIN:  "bg-green-900/50 text-green-400",
    LOSS: "bg-red-900/50 text-red-400",
    PUSH: "bg-gray-800 text-gray-400",
    VOID: "bg-gray-800 text-gray-500",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${styles[result as Exclude<PickResult, "PENDING">]}`}>
      {result}
    </span>
  );
}

function LockedValue({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1 text-[10px] text-gray-600">
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
      </svg>
      {label}
    </span>
  );
}

function DataQualityMeter({ score, inline }: { score: number; inline?: boolean }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  let color = "bg-green-500";
  let textColor = "text-green-400";
  let label = "High";
  if (clamped < 40) { color = "bg-red-500"; textColor = "text-red-400"; label = "Low"; }
  else if (clamped < 70) { color = "bg-yellow-500"; textColor = "text-yellow-400"; label = "Med"; }

  if (inline) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="h-1 w-12 overflow-hidden rounded-full bg-gray-800">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
        </div>
        <span className={`text-[10px] font-semibold ${textColor}`}>{label}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-600">Data Quality</span>
      <div className="h-1 w-16 overflow-hidden rounded-full bg-gray-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className={`text-[10px] font-semibold ${textColor}`}>{label}</span>
    </div>
  );
}

function FreshnessIndicator({ ageMinutes }: { ageMinutes: number }) {
  let color = "text-green-400";
  let dotColor = "bg-green-400";
  let label = "Live";
  if (ageMinutes >= 60) {
    color = "text-red-400"; dotColor = "bg-red-400"; label = `${Math.round(ageMinutes / 60)}h old`;
  } else if (ageMinutes >= 30) {
    color = "text-yellow-400"; dotColor = "bg-yellow-400"; label = `${ageMinutes}m old`;
  } else if (ageMinutes >= 10) {
    color = "text-gray-400"; dotColor = "bg-gray-400"; label = `${ageMinutes}m ago`;
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} aria-hidden="true" />
      <span className={`text-[10px] ${color}`}>Updated {label}</span>
    </div>
  );
}

// Export EdgeScoreBadge for reuse
function EdgeScoreBadge({ edgeScore }: { edgeScore: number }) {
  let color = "text-gray-400";
  if (edgeScore >= 70) color = "text-green-400";
  else if (edgeScore >= 50) color = "text-blue-400";
  else if (edgeScore >= 30) color = "text-yellow-400";
  return <span className={`text-xs font-bold ${color}`}>{edgeScore}</span>;
}
