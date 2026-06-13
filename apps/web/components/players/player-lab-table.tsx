"use client";

import type { ReactNode } from "react";
import { DataTable, type Column } from "@/components/ui/data-table";
import type { SignalTone } from "@/lib/intelligence/colors";
import { formatSigned, signedTone, buySellTone } from "@/lib/intelligence/colors";
import type {
  DefenseVsPositionRank,
  PlayerSeasonLine,
} from "@/lib/nflverse/player-lab";
import type { SnapShareRow } from "@/lib/nflverse/snap-share";
import {
  STABILITY_META,
  STABILITY_TOOLTIP,
  statStabilityGrade,
} from "@/lib/players/stat-stability";
import type { ReceivingOpportunityRow } from "@/lib/intelligence/receiving-opportunity";
import type { RushingEfficiencyRow } from "@/lib/intelligence/rushing-efficiency";
import type {
  NgsPassingLine,
  NgsReceivingLine,
  NgsRushingLine,
} from "@/lib/nflverse/next-gen-stats";
import type { CoverageRow, QbPressureRow } from "@/lib/nflverse/pressure-coverage";
import {
  PROTECTION_STRESS_TOOLTIP,
  protectionStress,
} from "@/lib/nflverse/protection-stress";
import type { CombineRow } from "@/lib/nflverse/combine";
import type { QbrRow } from "@/lib/nflverse/qbr";
import type { QbConsensusRow, Divergence } from "@/lib/intelligence/qb-consensus";
import type { EdgeSignalRow } from "@/lib/nflverse/edge-signals";
import type { InjuryRow, ReportStatus } from "@/lib/nflverse/injury-report";
import type { SleeperTrendingPlayer } from "@/lib/sleeper/market-signal";
import type { DfsSalaryRow } from "@/lib/dfs/salaries";
import type { EnumOption, SectionData } from "@/lib/players/views";

/**
 * Player Lab table (CLIENT).
 *
 * The Player Lab page is a SERVER component: it reads ?view=, awaits the active
 * view's loader, and hands the serializable result here. All of the table
 * PRESENTATION — column definitions (which carry render()/sortValue() fns), the
 * row-key / search / enum-filter / tone / title ACCESSORS — lives in this
 * 'use client' module, because functions cannot cross the server→client RSC
 * boundary. The server passes ONLY plain data (rows + serializable per-section
 * meta keyed by `kind`); this component reattaches the functions and renders one
 * DataTable per section. Columns, metrics, tones, and visuals are ported
 * faithfully from the original board pages — presentation only, no data change.
 */

// ── Formatting helpers (paper-surface; AA ink only) ───────────────────────────

const numberFormatter = new Intl.NumberFormat("en-US");

function fmtNumber(value: number): string {
  return numberFormatter.format(value);
}
function fmtDecimal(value: number | null, digits = 1): string {
  return value === null ? "—" : value.toFixed(digits);
}
function fmtPercent(value: number | null, digits = 1): string {
  return value === null ? "—" : `${(value * 100).toFixed(digits)}%`;
}
function fmtPctRounded(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** A muted team chip used across player tables. */
function teamCell(team: string): ReactNode {
  return <span className="font-mono font-medium text-ink-1">{team}</span>;
}
/** Name + small position kicker (matches the old two-line player cell). */
function stabilityCell(games: number): ReactNode {
  const meta = STABILITY_META[statStabilityGrade(games)];
  return (
    <span title={meta.label} aria-label={meta.label}>
      {meta.glyph}
    </span>
  );
}

function playerCell(name: string, position?: string): ReactNode {
  return (
    <div>
      <span className="font-medium text-ink">{name}</span>
      {position ? (
        <span className="ml-2 font-mono text-xs uppercase tracking-wide text-ink-2">{position}</span>
      ) : null}
    </div>
  );
}
/** Tone a signed numeric value (good/bad/neutral) on the paper surface. */
function signedCell(value: number, digits = 1, invert = false): ReactNode {
  const tone = signedTone(value, invert);
  const cls = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-rose-700" : "text-ink-1";
  return <span className={`font-semibold ${cls}`}>{formatSigned(value, digits)}</span>;
}

// ── PRODUCTION ────────────────────────────────────────────────────────────────

function productionLeaderColumns(): ReadonlyArray<Column<PlayerSeasonLine>> {
  return [
    { key: "playerName", label: "Player", sortable: true, render: (r) => playerCell(r.playerName, r.position) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "games", label: "G", align: "right", numeric: true },
    { key: "stability", label: "Stab", align: "right", tooltip: STABILITY_TOOLTIP, sortValue: (r) => r.games, render: (r) => stabilityCell(r.games) },
    { key: "pprPerGame", label: "PPR/G", align: "right", numeric: true, render: (r) => fmtDecimal(r.pprPerGame) },
    { key: "last5PprPerGame", label: "5g", align: "right", numeric: true, tooltip: "last-5-game PPR/G", render: (r) => fmtDecimal(r.last5PprPerGame) },
    { key: "last5PprDelta", label: "Δ", align: "right", numeric: true, tooltip: "recent form minus season pace", render: (r) => signedCell(r.last5PprDelta, 1) },
    { key: "boomRate", label: "Boom%", align: "right", numeric: true, tooltip: "share of games ≥ 20 PPR", render: (r) => fmtPercent(r.boomRate) },
    { key: "bustRate", label: "Bust%", align: "right", numeric: true, tooltip: "share of games ≤ 10 PPR", render: (r) => fmtPercent(r.bustRate) },
    { key: "opportunitiesPerGame", label: "Oppty/G", align: "right", numeric: true, render: (r) => fmtDecimal(r.opportunitiesPerGame) },
    { key: "targetsPerGame", label: "Tgt/G", align: "right", numeric: true, render: (r) => fmtDecimal(r.targetsPerGame) },
    { key: "receptionsPerGame", label: "Rec/G", align: "right", numeric: true, render: (r) => fmtDecimal(r.receptionsPerGame) },
    { key: "receivingYardsPerGame", label: "RecYd/G", align: "right", numeric: true, render: (r) => fmtDecimal(r.receivingYardsPerGame) },
    { key: "rushingYardsPerGame", label: "RushYd/G", align: "right", numeric: true, render: (r) => fmtDecimal(r.rushingYardsPerGame) },
    { key: "targetShare", label: "Tgt sh", align: "right", numeric: true, sortValue: (r) => r.targetShare, render: (r) => fmtPercent(r.targetShare) },
    { key: "wopr", label: "WOPR", align: "right", numeric: true, sortValue: (r) => r.wopr, render: (r) => fmtDecimal(r.wopr, 2) },
  ];
}

function defenseColumns(): ReadonlyArray<Column<DefenseVsPositionRank>> {
  return [
    { key: "rank", label: "Rank", align: "right", numeric: true, tooltip: "1 = softest matchup (allows most)" },
    { key: "team", label: "Def", render: (r) => teamCell(r.team) },
    { key: "games", label: "G", align: "right", numeric: true },
    { key: "pprAllowedPerGame", label: "PPR/G", align: "right", numeric: true, render: (r) => fmtDecimal(r.pprAllowedPerGame) },
    { key: "opportunitiesAllowedPerGame", label: "Oppty/G", align: "right", numeric: true, render: (r) => fmtDecimal(r.opportunitiesAllowedPerGame) },
  ];
}

// ── SNAPS ─────────────────────────────────────────────────────────────────────

function snapColumns(): ReadonlyArray<Column<SnapShareRow>> {
  return [
    { key: "playerName", label: "Player", render: (r) => playerCell(r.playerName, r.position) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "games", label: "G", align: "right", numeric: true },
    { key: "stability", label: "Stab", align: "right", tooltip: STABILITY_TOOLTIP, sortValue: (r) => r.games, render: (r) => stabilityCell(r.games) },
    { key: "snapSharePct", label: "Snap %", align: "right", numeric: true, render: (r) => fmtPercent(r.snapSharePct) },
    { key: "snapsPerGame", label: "Snaps/G", align: "right", numeric: true, render: (r) => fmtDecimal(r.snapsPerGame) },
  ];
}

// ── OPPORTUNITY ───────────────────────────────────────────────────────────────

const OPP_SIGNAL_LABEL: Record<ReceivingOpportunityRow["signal"], string> = {
  "buy-low": "Buy-low",
  "sell-high": "Sell-high",
  stable: "Stable",
};
function oppTone(s: ReceivingOpportunityRow["signal"]): SignalTone {
  return buySellTone(s === "buy-low" ? "buy" : s === "sell-high" ? "sell" : "in-line");
}

function opportunityColumns(): ReadonlyArray<Column<ReceivingOpportunityRow>> {
  return [
    { key: "name", label: "Player", render: (r) => playerCell(r.name) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "position", label: "Pos" },
    { key: "targets", label: "Tgt", align: "right", numeric: true },
    { key: "wopr", label: "WOPR", align: "right", numeric: true, tooltip: "1.5·target share + 0.7·air-yards share", render: (r) => r.wopr.toFixed(2) },
    { key: "targetShare", label: "Tgt%", align: "right", numeric: true, tooltip: "target share", render: (r) => fmtPctRounded(r.targetShare) },
    { key: "airYardsShare", label: "AY%", align: "right", numeric: true, tooltip: "air-yards share", render: (r) => fmtPctRounded(r.airYardsShare) },
    { key: "aDOT", label: "aDOT", align: "right", numeric: true, tooltip: "avg depth of target", render: (r) => r.aDOT.toFixed(1) },
    { key: "racr", label: "RACR", align: "right", numeric: true, tooltip: "receiver air conversion ratio", render: (r) => r.racr.toFixed(2) },
    {
      key: "signal",
      label: "The read",
      tooltip: "opportunity vs production divergence",
      sortValue: (r) => OPP_SIGNAL_LABEL[r.signal],
      render: (r) => {
        const tone = oppTone(r.signal);
        const cls = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-rose-700" : "text-ink-1";
        return <span className={`font-semibold ${cls}`}>{OPP_SIGNAL_LABEL[r.signal]}</span>;
      },
    },
  ];
}

function rushingColumns(): ReadonlyArray<Column<RushingEfficiencyRow>> {
  const READ_LABEL: Record<RushingEfficiencyRow["read"], string> = {
    "bell-cow": "Bell-cow",
    "buy-low": "Buy-low",
    "volume-dependent": "Volume-dep",
    limited: "Limited",
  };
  return [
    { key: "name", label: "Player", render: (r) => playerCell(r.name) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "attempts", label: "Att", align: "right", numeric: true, tooltip: "rush attempts (volume)" },
    { key: "ryoePerAtt", label: "RYOE/att", align: "right", numeric: true, tooltip: "rush yards over expected per attempt", render: (r) => signedCell(r.ryoePerAtt, 2) },
    { key: "pctStackedBox", label: "Box%", align: "right", numeric: true, tooltip: "% of carries vs an 8+ man box", render: (r) => fmtPercent(r.pctStackedBox) },
    {
      key: "read",
      label: "The read",
      sortValue: (r) => READ_LABEL[r.read],
      render: (r) => <span className="font-semibold text-ink-1">{READ_LABEL[r.read]}</span>,
    },
  ];
}

// ── NEXT GEN ──────────────────────────────────────────────────────────────────

function ngsReceivingColumns(): ReadonlyArray<Column<NgsReceivingLine>> {
  return [
    { key: "playerName", label: "Player", render: (r) => playerCell(r.playerName, r.position) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "targets", label: "Tgt", align: "right", numeric: true },
    { key: "avgSeparation", label: "Sep", align: "right", numeric: true, tooltip: "yards of space at the catch point", render: (r) => r.avgSeparation.toFixed(2) },
    { key: "avgCushion", label: "Cush", align: "right", numeric: true, tooltip: "pre-snap cushion", render: (r) => r.avgCushion.toFixed(2) },
    { key: "avgYacAboveExpectation", label: "YAC+/-", align: "right", numeric: true, tooltip: "yards after catch over expected", render: (r) => signedCell(r.avgYacAboveExpectation, 1) },
    { key: "shareOfIntendedAirYards", label: "Air sh", align: "right", numeric: true, render: (r) => fmtPercent(r.shareOfIntendedAirYards) },
    { key: "catchPct", label: "Catch%", align: "right", numeric: true, render: (r) => fmtPercent(r.catchPct) },
  ];
}
function ngsPassingColumns(): ReadonlyArray<Column<NgsPassingLine>> {
  return [
    { key: "playerName", label: "Player", render: (r) => playerCell(r.playerName) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "attempts", label: "Att", align: "right", numeric: true },
    { key: "cpoe", label: "CPOE", align: "right", numeric: true, tooltip: "completion % over expected", render: (r) => signedCell(r.cpoe, 1) },
    { key: "completionPct", label: "Comp%", align: "right", numeric: true, render: (r) => r.completionPct.toFixed(1) },
    { key: "expectedCompletionPct", label: "xComp%", align: "right", numeric: true, render: (r) => r.expectedCompletionPct.toFixed(1) },
    { key: "avgTimeToThrow", label: "TT throw", align: "right", numeric: true, render: (r) => r.avgTimeToThrow.toFixed(2) },
    { key: "aggressiveness", label: "Aggr", align: "right", numeric: true, render: (r) => r.aggressiveness.toFixed(1) },
    { key: "passerRating", label: "Rating", align: "right", numeric: true, render: (r) => r.passerRating.toFixed(1) },
  ];
}
function ngsRushingColumns(): ReadonlyArray<Column<NgsRushingLine>> {
  return [
    { key: "playerName", label: "Player", render: (r) => playerCell(r.playerName) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "rushAttempts", label: "Att", align: "right", numeric: true },
    { key: "ryoePerAtt", label: "RYOE/att", align: "right", numeric: true, tooltip: "rush yards over expected per attempt", render: (r) => signedCell(r.ryoePerAtt, 2) },
    { key: "efficiency", label: "Eff", align: "right", numeric: true, render: (r) => r.efficiency.toFixed(2) },
    { key: "pctStackedBox", label: "Stacked%", align: "right", numeric: true, tooltip: "% carries vs 8+ defenders", render: (r) => fmtPercent(r.pctStackedBox) },
    { key: "avgTimeToLos", label: "TT LOS", align: "right", numeric: true, render: (r) => r.avgTimeToLos.toFixed(2) },
  ];
}

// ── TRENCHES (pressure & coverage) ────────────────────────────────────────────

function qbPressureColumns(): ReadonlyArray<Column<QbPressureRow>> {
  return [
    { key: "name", label: "Player", render: (r) => playerCell(r.name) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "games", label: "G", align: "right", numeric: true },
    { key: "pressurePct", label: "Pressure%", align: "right", numeric: true, render: (r) => <span className="font-semibold text-rose-700">{fmtPercent(r.pressurePct)}</span> },
    { key: "badThrowPct", label: "Bad throw%", align: "right", numeric: true, render: (r) => fmtPercent(r.badThrowPct) },
    { key: "sacks", label: "Sacks", align: "right", numeric: true },
    { key: "blitzesFaced", label: "Blitzes", align: "right", numeric: true },
    {
      key: "protectionStress",
      label: "Prot stress",
      align: "right",
      tooltip: PROTECTION_STRESS_TOOLTIP,
      sortValue: (r) => protectionStress(r).index,
      render: (r) => {
        const s = protectionStress(r);
        const cls =
          s.band === "high"
            ? "font-semibold text-rose-700"
            : s.band === "moderate"
              ? "text-amber-700"
              : "text-ink-2";
        return <span className={cls}>{s.index}</span>;
      },
    },
  ];
}
function coverageColumns(): ReadonlyArray<Column<CoverageRow>> {
  return [
    { key: "name", label: "Player", render: (r) => playerCell(r.name) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "targets", label: "Tgt", align: "right", numeric: true },
    { key: "completionPct", label: "Cmp%", align: "right", numeric: true, render: (r) => fmtPercent(r.completionPct) },
    { key: "yardsPerTarget", label: "Yd/Tgt", align: "right", numeric: true, render: (r) => r.yardsPerTarget.toFixed(1) },
    { key: "passerRatingAllowed", label: "Rating allowed", align: "right", numeric: true, render: (r) => <span className="font-semibold text-emerald-700">{r.passerRatingAllowed.toFixed(1)}</span> },
    { key: "missedTacklePct", label: "Miss tkl%", align: "right", numeric: true, render: (r) => fmtPercent(r.missedTacklePct) },
  ];
}

// ── COMBINE ───────────────────────────────────────────────────────────────────

function combineColumns(showYear: boolean): ReadonlyArray<Column<CombineRow>> {
  const cols: Column<CombineRow>[] = [
    { key: "name", label: "Player", render: (r) => playerCell(r.name) },
    { key: "position", label: "Pos" },
    { key: "school", label: "School" },
  ];
  if (showYear) cols.push({ key: "draftYear", label: "Yr", align: "right", numeric: true, render: (r) => (r.draftYear ? String(r.draftYear) : "—") });
  cols.push(
    { key: "weight", label: "Wt", align: "right", numeric: true, sortValue: (r) => r.weight, render: (r) => fmtDecimal(r.weight, 0) },
    { key: "forty", label: "40", align: "right", numeric: true, sortValue: (r) => r.forty, render: (r) => fmtDecimal(r.forty, 2) },
    { key: "vertical", label: "Vert", align: "right", numeric: true, sortValue: (r) => r.vertical, render: (r) => fmtDecimal(r.vertical, 1) },
    { key: "broadJump", label: "Broad", align: "right", numeric: true, sortValue: (r) => r.broadJump, render: (r) => fmtDecimal(r.broadJump, 0) },
    { key: "cone", label: "3-cone", align: "right", numeric: true, sortValue: (r) => r.cone, render: (r) => fmtDecimal(r.cone, 2) },
    { key: "shuttle", label: "Shuttle", align: "right", numeric: true, sortValue: (r) => r.shuttle, render: (r) => fmtDecimal(r.shuttle, 2) },
  );
  return cols;
}

// ── QBR ───────────────────────────────────────────────────────────────────────

function qbrColumns(): ReadonlyArray<Column<QbrRow>> {
  return [
    { key: "name", label: "Player", render: (r) => playerCell(r.name) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "games", label: "G", align: "right", numeric: true },
    { key: "qbr", label: "QBR", align: "right", numeric: true, tooltip: "play-weighted Total QBR (0-100)", render: (r) => r.qbr.toFixed(1) },
    { key: "epaTotal", label: "EPA", align: "right", numeric: true, tooltip: "total expected points added", render: (r) => signedCell(r.epaTotal, 1) },
    { key: "ptsAdded", label: "Pts added", align: "right", numeric: true, render: (r) => signedCell(r.ptsAdded, 1) },
    { key: "plays", label: "Plays", align: "right", numeric: true },
  ];
}

const DIVERGENCE_LABEL: Record<Divergence, string> = {
  aligned: "Aligned",
  "results-over-accuracy": "Results › accuracy",
  "accuracy-over-results": "Accuracy › results",
  "single-source": "Single source",
};
function divergenceTone(d: Divergence): SignalTone {
  return d === "aligned" ? "good" : d === "single-source" ? "neutral" : "neutral";
}
function consensusColumns(): ReadonlyArray<Column<QbConsensusRow>> {
  return [
    { key: "name", label: "Player", render: (r) => playerCell(r.name) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "qbrPct", label: "QBR %ile", align: "right", numeric: true, tooltip: "QBR percentile within the pool", sortValue: (r) => r.qbrPct, render: (r) => (r.qbrPct === null ? "—" : r.qbrPct.toFixed(0)) },
    { key: "cpoePct", label: "CPOE %ile", align: "right", numeric: true, tooltip: "CPOE (Next Gen accuracy) percentile", sortValue: (r) => r.cpoePct, render: (r) => (r.cpoePct === null ? "—" : r.cpoePct.toFixed(0)) },
    { key: "consensus", label: "Consensus", align: "right", numeric: true, tooltip: "mean of available percentiles", render: (r) => r.consensus.toFixed(0) },
    {
      key: "divergence",
      label: "The read",
      sortValue: (r) => DIVERGENCE_LABEL[r.divergence],
      render: (r) => {
        const tone = divergenceTone(r.divergence);
        const cls = tone === "good" ? "text-emerald-700" : "text-ink-1";
        return <span className={`font-semibold ${cls}`}>{DIVERGENCE_LABEL[r.divergence]}</span>;
      },
    },
  ];
}

// ── EDGE ──────────────────────────────────────────────────────────────────────

function edgeColumns(tone: "buy" | "sell"): ReadonlyArray<Column<EdgeSignalRow>> {
  const gapCls = tone === "buy" ? "text-emerald-700" : "text-rose-700";
  return [
    { key: "playerName", label: "Player", render: (r) => playerCell(r.playerName, r.position) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "games", label: "G", align: "right", numeric: true },
    { key: "stability", label: "Stab", align: "right", tooltip: STABILITY_TOOLTIP, sortValue: (r) => r.games, render: (r) => stabilityCell(r.games) },
    { key: "pprPerGame", label: "PPR/G", align: "right", numeric: true, render: (r) => r.pprPerGame.toFixed(1) },
    { key: "targetShare", label: "Tgt sh", align: "right", numeric: true, sortValue: (r) => r.targetShare, render: (r) => fmtPercent(r.targetShare) },
    { key: "avgSeparation", label: "Sep", align: "right", numeric: true, render: (r) => r.avgSeparation.toFixed(2) },
    { key: "yacAboveExpectation", label: "YAC+/-", align: "right", numeric: true, render: (r) => formatSigned(r.yacAboveExpectation, 2) },
    { key: "shareIntendedAirYards", label: "Air sh", align: "right", numeric: true, render: (r) => fmtPercent(r.shareIntendedAirYards) },
    { key: "underlyingZ", label: "Undr z", align: "right", numeric: true, tooltip: "z-score of the underlying tracking signal", render: (r) => formatSigned(r.underlyingZ, 2) },
    { key: "productionZ", label: "Prod z", align: "right", numeric: true, tooltip: "z-score of actual production", render: (r) => formatSigned(r.productionZ, 2) },
    { key: "gap", label: "Gap", align: "right", numeric: true, tooltip: "underlying z minus production z", render: (r) => <span className={`font-semibold ${gapCls}`}>{formatSigned(r.gap, 2)}</span> },
  ];
}

// ── INJURIES ──────────────────────────────────────────────────────────────────

function injuryStatusBadge(r: InjuryRow): ReactNode {
  const cls: Record<ReportStatus, string> = {
    Out: "border-rose-300 text-rose-700",
    Doubtful: "border-amber-300 text-amber-700",
    Questionable: "border-sky-300 text-sky-700",
    Other: "border-paper-border text-ink-2",
  };
  return (
    <span className={`rounded-ds-sm border px-2 py-0.5 font-mono text-xs uppercase tracking-wide ${cls[r.reportStatus]}`}>
      {r.reportStatusRaw || r.practiceStatus || "—"}
    </span>
  );
}
function injuryColumns(): ReadonlyArray<Column<InjuryRow>> {
  return [
    { key: "reportStatus", label: "Status", sortValue: (r) => r.reportStatus, render: (r) => injuryStatusBadge(r) },
    { key: "playerName", label: "Player", render: (r) => playerCell(r.playerName) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "position", label: "Pos" },
    { key: "primaryInjury", label: "Injury", render: (r) => r.primaryInjury || "—" },
    { key: "practiceStatus", label: "Practice", render: (r) => r.practiceStatus || "—" },
  ];
}

// ── MARKET (Sleeper) ──────────────────────────────────────────────────────────

function marketColumns(): ReadonlyArray<Column<SleeperTrendingPlayer>> {
  return [
    { key: "name", label: "Player", render: (r) => playerCell(r.name) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "position", label: "Pos" },
    { key: "injuryStatus", label: "Status", sortValue: (r) => r.injuryStatus, render: (r) => (r.injuryStatus ? <span className="text-amber-700">{r.injuryStatus}</span> : "—") },
    { key: "count", label: "Moves", align: "right", numeric: true, render: (r) => fmtNumber(r.count) },
  ];
}

// ── DFS ───────────────────────────────────────────────────────────────────────

function dfsColumns(): ReadonlyArray<Column<DfsSalaryRow>> {
  const agreementCell = (r: DfsSalaryRow): ReactNode => {
    const cls: Record<DfsSalaryRow["agreement"], string> = {
      agree: "border-emerald-300 text-emerald-700",
      single: "border-paper-border text-ink-2",
      disagree: "border-rose-300 text-rose-700",
    };
    const text = r.agreement === "disagree" ? `±$${fmtNumber(r.spread)}` : r.agreement;
    return <span className={`rounded-ds-sm border px-2 py-0.5 font-mono text-xs uppercase tracking-wide ${cls[r.agreement]}`}>{text}</span>;
  };
  return [
    { key: "name", label: "Player", render: (r) => playerCell(r.name) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "position", label: "Pos" },
    { key: "salary", label: "DK salary", align: "right", numeric: true, render: (r) => `$${fmtNumber(r.salary)}` },
    { key: "providerCount", label: "Feeds", align: "right", numeric: true },
    { key: "agreement", label: "Check", sortValue: (r) => r.agreement, render: (r) => agreementCell(r) },
  ];
}

// ── Per-kind presentation binding ─────────────────────────────────────────────

/**
 * Everything a DataTable needs that is NOT serializable — columns and the
 * row-key / search / enum / tone / title accessors — resolved from a section's
 * serializable `kind` (+ `enumOptions` / `variant`). Kept generic over `unknown`
 * so it composes with the page's untyped section rows; each binding casts to its
 * concrete row type internally, exactly as the original columns were typed.
 */
interface SectionBinding {
  readonly columns: ReadonlyArray<Column<unknown>>;
  readonly rowKey: (row: unknown, index: number) => string;
  readonly searchAccessor?: (row: unknown) => string;
  readonly enumAccessor?: (row: unknown) => string;
  readonly enumLabel?: string;
  readonly rowTone?: (row: unknown) => SignalTone | null;
  readonly rowTitle?: (row: unknown) => string | undefined;
}

const POS_ENUM_LABEL = "Pos";

function resolveBinding(section: SectionData): SectionBinding {
  const variant = section.variant;
  switch (section.kind) {
    case "production-leaders": {
      return {
        columns: productionLeaderColumns() as ReadonlyArray<Column<unknown>>,
        rowKey: (row) => {
          const r = row as PlayerSeasonLine;
          return `${r.playerId}-${r.team}`;
        },
        searchAccessor: (row) => {
          const r = row as PlayerSeasonLine;
          return `${r.playerName} ${r.team} ${r.position}`;
        },
        enumAccessor: (row) => (row as PlayerSeasonLine).position,
        enumLabel: POS_ENUM_LABEL,
        rowTone: (row) => {
          const r = row as PlayerSeasonLine;
          return r.last5PprDelta >= 1.5 ? "good" : r.last5PprDelta <= -1.5 ? "bad" : null;
        },
      };
    }
    case "production-defense": {
      return {
        columns: defenseColumns() as ReadonlyArray<Column<unknown>>,
        rowKey: (row) => {
          const r = row as DefenseVsPositionRank;
          return `${r.team}-${r.position}`;
        },
      };
    }
    case "snaps": {
      return {
        columns: snapColumns() as ReadonlyArray<Column<unknown>>,
        rowKey: (row) => {
          const r = row as SnapShareRow;
          return `${r.playerId}-${r.team}`;
        },
        searchAccessor: (row) => {
          const r = row as SnapShareRow;
          return `${r.playerName} ${r.team} ${r.position}`;
        },
        enumAccessor: (row) => (row as SnapShareRow).position,
        enumLabel: POS_ENUM_LABEL,
      };
    }
    case "opportunity-receiving": {
      return {
        columns: opportunityColumns() as ReadonlyArray<Column<unknown>>,
        rowKey: (row) => (row as ReceivingOpportunityRow).playerId,
        searchAccessor: (row) => {
          const r = row as ReceivingOpportunityRow;
          return `${r.name} ${r.team} ${r.position}`;
        },
        enumAccessor: (row) => (row as ReceivingOpportunityRow).position,
        enumLabel: POS_ENUM_LABEL,
        rowTitle: (row) => (row as ReceivingOpportunityRow).note,
        rowTone: (row) => oppTone((row as ReceivingOpportunityRow).signal),
      };
    }
    case "opportunity-rushing": {
      return {
        columns: rushingColumns() as ReadonlyArray<Column<unknown>>,
        rowKey: (row) => (row as RushingEfficiencyRow).playerId,
        searchAccessor: (row) => {
          const r = row as RushingEfficiencyRow;
          return `${r.name} ${r.team}`;
        },
        rowTitle: (row) => (row as RushingEfficiencyRow).note,
      };
    }
    case "nextgen-receiving": {
      return {
        columns: ngsReceivingColumns() as ReadonlyArray<Column<unknown>>,
        rowKey: (row) => {
          const r = row as NgsReceivingLine;
          return `${r.playerId}-${r.team}`;
        },
        searchAccessor: (row) => {
          const r = row as NgsReceivingLine;
          return `${r.playerName} ${r.team} ${r.position}`;
        },
      };
    }
    case "nextgen-passing": {
      return {
        columns: ngsPassingColumns() as ReadonlyArray<Column<unknown>>,
        rowKey: (row) => {
          const r = row as NgsPassingLine;
          return `${r.playerId}-${r.team}`;
        },
        searchAccessor: (row) => {
          const r = row as NgsPassingLine;
          return `${r.playerName} ${r.team}`;
        },
      };
    }
    case "nextgen-rushing": {
      return {
        columns: ngsRushingColumns() as ReadonlyArray<Column<unknown>>,
        rowKey: (row) => {
          const r = row as NgsRushingLine;
          return `${r.playerId}-${r.team}`;
        },
        searchAccessor: (row) => {
          const r = row as NgsRushingLine;
          return `${r.playerName} ${r.team}`;
        },
      };
    }
    case "trenches-qb": {
      return {
        columns: qbPressureColumns() as ReadonlyArray<Column<unknown>>,
        rowKey: (row) => (row as QbPressureRow).playerId,
        searchAccessor: (row) => {
          const r = row as QbPressureRow;
          return `${r.name} ${r.team}`;
        },
      };
    }
    case "trenches-coverage": {
      return {
        columns: coverageColumns() as ReadonlyArray<Column<unknown>>,
        rowKey: (row) => (row as CoverageRow).playerId,
        searchAccessor: (row) => {
          const r = row as CoverageRow;
          return `${r.name} ${r.team}`;
        },
      };
    }
    case "combine": {
      const showYear = variant === "with-year";
      return {
        columns: combineColumns(showYear) as ReadonlyArray<Column<unknown>>,
        rowKey: (row, index) => {
          const r = row as CombineRow;
          return `${r.name}-${r.draftYear}-${index}`;
        },
        searchAccessor: (row) => {
          const r = row as CombineRow;
          return `${r.name} ${r.position} ${r.school}`;
        },
      };
    }
    case "qbr": {
      return {
        columns: qbrColumns() as ReadonlyArray<Column<unknown>>,
        rowKey: (row) => (row as QbrRow).playerId,
        searchAccessor: (row) => {
          const r = row as QbrRow;
          return `${r.name} ${r.team}`;
        },
      };
    }
    case "qbr-consensus": {
      return {
        columns: consensusColumns() as ReadonlyArray<Column<unknown>>,
        rowKey: (row, index) => {
          const r = row as QbConsensusRow;
          return `${r.name}-${index}`;
        },
        searchAccessor: (row) => {
          const r = row as QbConsensusRow;
          return `${r.name} ${r.team}`;
        },
        rowTitle: (row) => (row as QbConsensusRow).note,
        rowTone: (row) => ((row as QbConsensusRow).divergence === "aligned" ? "good" : null),
      };
    }
    case "edge": {
      const edgeTone: "buy" | "sell" = variant === "sell" ? "sell" : "buy";
      const fixedTone: SignalTone = edgeTone === "buy" ? "good" : "bad";
      return {
        columns: edgeColumns(edgeTone) as ReadonlyArray<Column<unknown>>,
        rowKey: (row) => {
          const r = row as EdgeSignalRow;
          return `${r.playerId}-${r.team}`;
        },
        searchAccessor: (row) => {
          const r = row as EdgeSignalRow;
          return `${r.playerName} ${r.team} ${r.position}`;
        },
        rowTone: () => fixedTone,
      };
    }
    case "injuries": {
      return {
        columns: injuryColumns() as ReadonlyArray<Column<unknown>>,
        rowKey: (row) => {
          const r = row as InjuryRow;
          return `${r.playerId}-${r.team}`;
        },
        searchAccessor: (row) => {
          const r = row as InjuryRow;
          return `${r.playerName} ${r.team} ${r.position} ${r.primaryInjury}`;
        },
        enumAccessor: (row) => (row as InjuryRow).position,
        enumLabel: POS_ENUM_LABEL,
        rowTone: (row) => ((row as InjuryRow).reportStatus === "Out" ? "bad" : null),
      };
    }
    case "market": {
      const fixedTone: SignalTone = variant === "sell" ? "bad" : "good";
      return {
        columns: marketColumns() as ReadonlyArray<Column<unknown>>,
        rowKey: (row) => (row as SleeperTrendingPlayer).playerId,
        searchAccessor: (row) => {
          const r = row as SleeperTrendingPlayer;
          return `${r.name} ${r.team} ${r.position}`;
        },
        enumAccessor: (row) => (row as SleeperTrendingPlayer).position,
        enumLabel: POS_ENUM_LABEL,
        rowTone: () => fixedTone,
      };
    }
    case "dfs": {
      return {
        columns: dfsColumns() as ReadonlyArray<Column<unknown>>,
        rowKey: (row) => {
          const r = row as DfsSalaryRow;
          return `${r.name}-${r.team}`;
        },
        searchAccessor: (row) => {
          const r = row as DfsSalaryRow;
          return `${r.name} ${r.team} ${r.position}`;
        },
        enumAccessor: (row) => (row as DfsSalaryRow).position,
        enumLabel: POS_ENUM_LABEL,
        rowTone: (row) => ((row as DfsSalaryRow).agreement === "disagree" ? "bad" : null),
      };
    }
    default: {
      // Exhaustiveness guard — a new kind must add a binding above.
      const _exhaustive: never = section.kind;
      throw new Error(`Unknown player-lab section kind: ${String(_exhaustive)}`);
    }
  }
}

// ── Section + view rendering (CLIENT) ─────────────────────────────────────────

function SectionBlock({ section }: { section: SectionData }): JSX.Element {
  const binding = resolveBinding(section);
  const enumOptions: ReadonlyArray<EnumOption> | undefined = section.enumOptions;
  const enumFilter =
    enumOptions && binding.enumAccessor
      ? {
          label: binding.enumLabel ?? POS_ENUM_LABEL,
          options: enumOptions,
          accessor: binding.enumAccessor,
        }
      : undefined;

  return (
    <section className="flex flex-col gap-3">
      {section.eyebrow || section.title || section.blurb ? (
        <div>
          {section.eyebrow ? (
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-orbital-cyan-on-light">
              {section.eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-2xl font-semibold text-ink">{section.title}</h2>
          {section.blurb ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-1">{section.blurb}</p>
          ) : null}
        </div>
      ) : null}

      <DataTable<unknown>
        columns={binding.columns}
        rows={section.rows}
        rowKey={binding.rowKey}
        searchable={Boolean(binding.searchAccessor)}
        searchAccessor={binding.searchAccessor}
        enumFilter={enumFilter}
        rowTone={binding.rowTone}
        rowTitle={binding.rowTitle}
        showRank={section.showRank}
        minWidth={section.minWidth}
        emptyTitle={section.emptyTitle}
        emptyHint={section.emptyHint}
      />

      {section.footnote ? (
        <p className="text-xs leading-5 text-ink-2">{section.footnote}</p>
      ) : null}
    </section>
  );
}

export interface PlayerLabTableProps {
  /** The serializable sections for the active view (in render order). */
  readonly sections: ReadonlyArray<SectionData>;
}

/**
 * Renders all of the active view's DataTable sections from serializable data.
 * The server page owns the loaders + hero/tabs/attribution; this owns the
 * tables (and therefore the render/sort/accessor functions).
 */
export function PlayerLabTable({ sections }: PlayerLabTableProps): JSX.Element {
  return (
    <>
      {sections.map((s) => (
        <SectionBlock key={s.id} section={s} />
      ))}
    </>
  );
}

export default PlayerLabTable;
