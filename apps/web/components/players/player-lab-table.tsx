"use client";

import { useMemo, useState, type ReactNode } from "react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { UpsellGate } from "@/components/ui/upsell-gate";
import type { SignalTone } from "@/lib/intelligence/colors";
import { formatSigned, signedTone, buySellTone } from "@/lib/intelligence/colors";
import {
  ShareBar,
  PercentileBar,
  DivergingBar,
  Sparkline,
  SignalChip,
} from "@/components/ui/dataviz";
import type {
  DefenseVsPositionRank,
  PlayerSeasonLine,
} from "@/lib/nflverse/player-lab";
import type { SnapShareRow, DefenseSnapShareRow } from "@/lib/nflverse/snap-share";
import type { ReceivingOpportunityRow } from "@/lib/intelligence/receiving-opportunity";
import type { RushingEfficiencyRow } from "@/lib/intelligence/rushing-efficiency";
import type { ScheduleContextRow } from "@/lib/nflverse/schedule-context";
import type { CoverageRow, QbPressureRow } from "@/lib/nflverse/pressure-coverage";
import type { CombineRow } from "@/lib/nflverse/combine";
import type { QbrRow } from "@/lib/nflverse/qbr";
import type { QbConsensusRow, Divergence } from "@/lib/intelligence/qb-consensus";
import type { EdgeSignalRow } from "@/lib/nflverse/edge-signals";
import type { InjuryRow, ReportStatus } from "@/lib/nflverse/injury-report";
import type { SleeperTrendingPlayer } from "@/lib/sleeper/market-signal";
import type { DfsSalaryRow } from "@/lib/dfs/salaries";
import type {
  EnumOption,
  SectionData,
  NgsReceivingFormRow,
  NgsPassingFormRow,
  NgsRushingFormRow,
  OffensiveLineViewRow,
} from "@/lib/players/views";

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

// ── Formatting helpers (dark surface; AA ion only) ────────────────────────────

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
  return <span className="font-mono font-medium text-ion-1">{team}</span>;
}
/** Name + small position kicker (matches the old two-line player cell). */
function playerCell(name: string, position?: string): ReactNode {
  return (
    <div>
      <span className="font-medium text-ion-white">{name}</span>
      {position ? (
        <span className="ml-2 font-mono text-xs uppercase tracking-wide text-ion-2">{position}</span>
      ) : null}
    </div>
  );
}
/** Tone a signed numeric value (good/bad/neutral) on the dark surface. */
function signedCell(value: number, digits = 1, invert = false): ReactNode {
  const tone = signedTone(value, invert);
  const cls = tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-rose-400" : "text-ion-1";
  return <span className={`font-semibold ${cls}`}>{formatSigned(value, digits)}</span>;
}

// ── PRODUCTION ────────────────────────────────────────────────────────────────

function productionLeaderColumns(): ReadonlyArray<Column<PlayerSeasonLine>> {
  return [
    { key: "playerName", label: "Player", sortable: true, render: (r) => playerCell(r.playerName, r.position) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "games", label: "G", align: "right", numeric: true },
    { key: "pprPerGame", label: "PPR/G", align: "right", numeric: true, render: (r) => fmtDecimal(r.pprPerGame) },
    { key: "last5PprPerGame", label: "5g", align: "right", numeric: true, tooltip: "last-5-game PPR/G", render: (r) => fmtDecimal(r.last5PprPerGame) },
    { key: "last5PprDelta", label: "Δ", align: "right", numeric: true, sortValue: (r) => r.last5PprDelta, tooltip: "recent form minus season pace", render: (r) => <DivergingBar value={r.last5PprDelta} domain={6} digits={1} /> },
    { key: "boomRate", label: "Boom%", align: "right", numeric: true, sortValue: (r) => r.boomRate, tooltip: "share of games ≥ 20 PPR", render: (r) => <ShareBar value={r.boomRate} tone="good" format={(v) => fmtPercent(v)} /> },
    { key: "bustRate", label: "Bust%", align: "right", numeric: true, sortValue: (r) => r.bustRate, tooltip: "share of games ≤ 10 PPR", render: (r) => <ShareBar value={r.bustRate} tone="bad" format={(v) => fmtPercent(v)} /> },
    { key: "opportunitiesPerGame", label: "Oppty/G", align: "right", numeric: true, render: (r) => fmtDecimal(r.opportunitiesPerGame) },
    { key: "targetsPerGame", label: "Tgt/G", align: "right", numeric: true, render: (r) => fmtDecimal(r.targetsPerGame) },
    { key: "receptionsPerGame", label: "Rec/G", align: "right", numeric: true, render: (r) => fmtDecimal(r.receptionsPerGame) },
    { key: "receivingYardsPerGame", label: "RecYd/G", align: "right", numeric: true, render: (r) => fmtDecimal(r.receivingYardsPerGame) },
    { key: "rushingYardsPerGame", label: "RushYd/G", align: "right", numeric: true, render: (r) => fmtDecimal(r.rushingYardsPerGame) },
    { key: "targetShare", label: "Tgt sh", align: "right", numeric: true, sortValue: (r) => r.targetShare, render: (r) => <ShareBar value={r.targetShare} format={(v) => fmtPercent(v)} /> },
    { key: "wopr", label: "WOPR", align: "right", numeric: true, sortValue: (r) => r.wopr, tooltip: "weighted opportunity rating (capped at 1.0 for the bar)", render: (r) => <ShareBar value={r.wopr} format={() => fmtDecimal(r.wopr, 2)} /> },
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
    { key: "snapSharePct", label: "Snap %", align: "right", numeric: true, sortValue: (r) => r.snapSharePct, render: (r) => <ShareBar value={r.snapSharePct} format={(v) => fmtPercent(v)} /> },
    { key: "snapsPerGame", label: "Snaps/G", align: "right", numeric: true, render: (r) => fmtDecimal(r.snapsPerGame) },
  ];
}

function defenseSnapColumns(): ReadonlyArray<Column<DefenseSnapShareRow>> {
  return [
    { key: "playerName", label: "Player", render: (r) => playerCell(r.playerName, r.position) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "group", label: "Grp", tooltip: "defensive group (DL / LB / CB / S)", render: (r) => <span className="font-mono text-xs uppercase tracking-wide text-ion-2">{r.group}</span> },
    { key: "games", label: "G", align: "right", numeric: true },
    { key: "snapSharePct", label: "Def snap %", align: "right", numeric: true, tooltip: "share of team defensive snaps", sortValue: (r) => r.snapSharePct, render: (r) => <ShareBar value={r.snapSharePct} format={(v) => fmtPercent(v)} /> },
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
    { key: "targetShare", label: "Tgt%", align: "right", numeric: true, sortValue: (r) => r.targetShare, tooltip: "target share", render: (r) => <ShareBar value={r.targetShare} format={(v) => fmtPctRounded(v)} /> },
    { key: "airYardsShare", label: "AY%", align: "right", numeric: true, sortValue: (r) => r.airYardsShare, tooltip: "air-yards share", render: (r) => <ShareBar value={r.airYardsShare} format={(v) => fmtPctRounded(v)} /> },
    { key: "aDOT", label: "aDOT", align: "right", numeric: true, tooltip: "avg depth of target", render: (r) => r.aDOT.toFixed(1) },
    { key: "racr", label: "RACR", align: "right", numeric: true, tooltip: "receiver air conversion ratio", render: (r) => r.racr.toFixed(2) },
    {
      key: "signal",
      label: "The read",
      tooltip: "opportunity vs production divergence",
      sortValue: (r) => OPP_SIGNAL_LABEL[r.signal],
      render: (r) => <SignalChip label={OPP_SIGNAL_LABEL[r.signal]} tone={oppTone(r.signal)} title={r.note} />,
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
  const readTone = (read: RushingEfficiencyRow["read"]): SignalTone =>
    read === "bell-cow" || read === "buy-low" ? "good" : read === "limited" ? "bad" : "neutral";
  return [
    { key: "name", label: "Player", render: (r) => playerCell(r.name) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "attempts", label: "Att", align: "right", numeric: true, tooltip: "rush attempts (volume)" },
    { key: "ryoePerAtt", label: "RYOE/att", align: "right", numeric: true, tooltip: "rush yards over expected per attempt", render: (r) => signedCell(r.ryoePerAtt, 2) },
    { key: "pctStackedBox", label: "Box%", align: "right", numeric: true, sortValue: (r) => r.pctStackedBox, tooltip: "% of carries vs an 8+ man box", render: (r) => <ShareBar value={r.pctStackedBox} tone="bad" format={(v) => `${(v * 100).toFixed(0)}%`} /> },
    {
      key: "read",
      label: "The read",
      sortValue: (r) => READ_LABEL[r.read],
      render: (r) => <SignalChip label={READ_LABEL[r.read]} tone={readTone(r.read)} title={r.note} />,
    },
  ];
}

// ── NEXT GEN ──────────────────────────────────────────────────────────────────

/**
 * A recent-form Δ cell: a DivergingBar of (trailing minus season) — positive =
 * heating up over the last weeks, negative = cooling. Null (no recent weeks)
 * renders an honest dash via DivergingBar's own null handling.
 */
function formDeltaCell(delta: number | null, domain: number, digits: number): ReactNode {
  return <DivergingBar value={delta} domain={domain} digits={digits} />;
}
/**
 * A recent-form spark line of the real weekly series. <2 weeks → the Sparkline
 * returns null, so we fall back to a dash (never a fabricated flat line).
 */
function formSparkCell(values: readonly number[], ariaLabel: string, tone: SignalTone = "neutral"): ReactNode {
  const spark = Sparkline({ values, ariaLabel, tone });
  if (spark === null) return <span className="font-mono tabular-nums text-ion-2">—</span>;
  return spark;
}

function ngsReceivingColumns(): ReadonlyArray<Column<NgsReceivingFormRow>> {
  return [
    { key: "playerName", label: "Player", render: (r) => playerCell(r.playerName, r.position) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "targets", label: "Tgt", align: "right", numeric: true },
    { key: "avgSeparation", label: "Sep", align: "right", numeric: true, tooltip: "yards of space at the catch point (season)", render: (r) => r.avgSeparation.toFixed(2) },
    { key: "avgCushion", label: "Cush", align: "right", numeric: true, tooltip: "pre-snap cushion", render: (r) => r.avgCushion.toFixed(2) },
    { key: "avgYacAboveExpectation", label: "YAC+/-", align: "right", numeric: true, sortValue: (r) => r.avgYacAboveExpectation, tooltip: "yards after catch over expected", render: (r) => <DivergingBar value={r.avgYacAboveExpectation} domain={3} digits={1} /> },
    { key: "shareOfIntendedAirYards", label: "Air sh", align: "right", numeric: true, sortValue: (r) => r.shareOfIntendedAirYards, render: (r) => <ShareBar value={r.shareOfIntendedAirYards} format={(v) => fmtPercent(v)} /> },
    { key: "catchPct", label: "Catch%", align: "right", numeric: true, sortValue: (r) => r.catchPct, render: (r) => <ShareBar value={r.catchPct} tone="good" format={(v) => fmtPercent(v)} /> },
    { key: "trailingSeparation", label: "Sep 4g", align: "right", numeric: true, tooltip: "separation over the last 4 played weeks", sortValue: (r) => r.trailingSeparation, render: (r) => fmtDecimal(r.trailingSeparation, 2) },
    { key: "separationDelta", label: "Sep Δ", align: "right", numeric: true, tooltip: "recent-form separation minus season", sortValue: (r) => r.separationDelta, render: (r) => formDeltaCell(r.separationDelta, 1, 2) },
    { key: "separationSeries", label: "Trend", sortable: false, tooltip: "weekly separation, oldest → newest", render: (r) => formSparkCell(r.separationSeries, `Weekly separation for ${r.playerName}`) },
  ];
}
function ngsPassingColumns(): ReadonlyArray<Column<NgsPassingFormRow>> {
  return [
    { key: "playerName", label: "Player", render: (r) => playerCell(r.playerName) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "attempts", label: "Att", align: "right", numeric: true },
    { key: "cpoe", label: "CPOE", align: "right", numeric: true, sortValue: (r) => r.cpoe, tooltip: "completion % over expected (season)", render: (r) => <DivergingBar value={r.cpoe} domain={8} digits={1} /> },
    { key: "completionPct", label: "Comp%", align: "right", numeric: true, render: (r) => r.completionPct.toFixed(1) },
    { key: "expectedCompletionPct", label: "xComp%", align: "right", numeric: true, render: (r) => r.expectedCompletionPct.toFixed(1) },
    { key: "avgTimeToThrow", label: "TT throw", align: "right", numeric: true, render: (r) => r.avgTimeToThrow.toFixed(2) },
    { key: "aggressiveness", label: "Aggr", align: "right", numeric: true, render: (r) => r.aggressiveness.toFixed(1) },
    { key: "passerRating", label: "Rating", align: "right", numeric: true, render: (r) => r.passerRating.toFixed(1) },
    { key: "trailingCpoe", label: "CPOE 4g", align: "right", numeric: true, tooltip: "CPOE over the last 4 played weeks", sortValue: (r) => r.trailingCpoe, render: (r) => fmtDecimal(r.trailingCpoe, 1) },
    { key: "cpoeDelta", label: "CPOE Δ", align: "right", numeric: true, tooltip: "recent-form CPOE minus season", sortValue: (r) => r.cpoeDelta, render: (r) => formDeltaCell(r.cpoeDelta, 5, 1) },
    { key: "cpoeSeries", label: "Trend", sortable: false, tooltip: "weekly CPOE, oldest → newest", render: (r) => formSparkCell(r.cpoeSeries, `Weekly CPOE for ${r.playerName}`) },
  ];
}
function ngsRushingColumns(): ReadonlyArray<Column<NgsRushingFormRow>> {
  return [
    { key: "playerName", label: "Player", render: (r) => playerCell(r.playerName) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "rushAttempts", label: "Att", align: "right", numeric: true },
    { key: "ryoePerAtt", label: "RYOE/att", align: "right", numeric: true, sortValue: (r) => r.ryoePerAtt, tooltip: "rush yards over expected per attempt (season)", render: (r) => <DivergingBar value={r.ryoePerAtt} domain={1.5} digits={2} /> },
    { key: "efficiency", label: "Eff", align: "right", numeric: true, render: (r) => r.efficiency.toFixed(2) },
    { key: "pctStackedBox", label: "Stacked%", align: "right", numeric: true, sortValue: (r) => r.pctStackedBox, tooltip: "% carries vs 8+ defenders", render: (r) => <ShareBar value={r.pctStackedBox} tone="bad" format={(v) => fmtPercent(v)} /> },
    { key: "avgTimeToLos", label: "TT LOS", align: "right", numeric: true, render: (r) => r.avgTimeToLos.toFixed(2) },
    { key: "trailingRyoePerAtt", label: "RYOE 4g", align: "right", numeric: true, tooltip: "RYOE/att over the last 4 played weeks", sortValue: (r) => r.trailingRyoePerAtt, render: (r) => fmtDecimal(r.trailingRyoePerAtt, 2) },
    { key: "ryoeDelta", label: "RYOE Δ", align: "right", numeric: true, tooltip: "recent-form RYOE/att minus season", sortValue: (r) => r.ryoeDelta, render: (r) => formDeltaCell(r.ryoeDelta, 1, 2) },
    { key: "ryoeSeries", label: "Trend", sortable: false, tooltip: "weekly RYOE/att, oldest → newest", render: (r) => formSparkCell(r.ryoeSeries, `Weekly RYOE per attempt for ${r.playerName}`) },
  ];
}

// ── TRENCHES (pressure & coverage) ────────────────────────────────────────────

function qbPressureColumns(): ReadonlyArray<Column<QbPressureRow>> {
  return [
    { key: "name", label: "Player", render: (r) => playerCell(r.name) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "games", label: "G", align: "right", numeric: true },
    { key: "pressurePct", label: "Pressure%", align: "right", numeric: true, render: (r) => <span className="font-semibold text-rose-400">{fmtPercent(r.pressurePct)}</span> },
    { key: "badThrowPct", label: "Bad throw%", align: "right", numeric: true, render: (r) => fmtPercent(r.badThrowPct) },
    { key: "sacks", label: "Sacks", align: "right", numeric: true },
    { key: "blitzesFaced", label: "Blitzes", align: "right", numeric: true },
  ];
}
function coverageColumns(): ReadonlyArray<Column<CoverageRow>> {
  return [
    { key: "name", label: "Player", render: (r) => playerCell(r.name) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "targets", label: "Tgt", align: "right", numeric: true },
    { key: "completionPct", label: "Cmp%", align: "right", numeric: true, render: (r) => fmtPercent(r.completionPct) },
    { key: "yardsPerTarget", label: "Yd/Tgt", align: "right", numeric: true, render: (r) => r.yardsPerTarget.toFixed(1) },
    { key: "passerRatingAllowed", label: "Rating allowed", align: "right", numeric: true, render: (r) => <span className="font-semibold text-emerald-400">{r.passerRatingAllowed.toFixed(1)}</span> },
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

// ── OFFENSIVE LINE (trenches) ─────────────────────────────────────────────────

/** Line-spot chip from the bucketed group (T / G / C), with the raw PFR code
 *  (LT/RT/LG/RG/C) as the hover title so the side detail isn't lost. */
function olPositionCell(r: OffensiveLineViewRow): ReactNode {
  return (
    <span
      title={`line spot ${r.group} · charted as ${r.position}`}
      className="font-mono text-xs font-semibold uppercase tracking-wide text-ion-1"
    >
      {r.group}
    </span>
  );
}

/** Starter / backup role chip from the real depth-chart order; an honest dash
 *  when the lineman isn't on the latest chart (depthOrder null). */
function olRoleCell(r: OffensiveLineViewRow): ReactNode {
  if (r.depthOrder == null) return <span className="font-mono tabular-nums text-ion-2">—</span>;
  if (r.isStarter) return <SignalChip label="Starter" tone="good" title="depth-chart order 1" />;
  return <SignalChip label={`Backup #${r.depthOrder}`} tone="neutral" title={`depth-chart order ${r.depthOrder}`} />;
}

/** A college combine measurable (the pre-draft athletic PRIOR). Renders the real
 *  number or an honest dash; never a guess. Always labeled "college" upstream. */
function olCombineCell(value: number | null, digits: number): ReactNode {
  return value == null ? (
    <span className="font-mono tabular-nums text-ion-2">—</span>
  ) : (
    <span className="font-mono tabular-nums text-ion-1">{value.toFixed(digits)}</span>
  );
}

/** The two metrics the free feed cannot give honestly: a single neutral "not in
 *  the free feed" chip, shared by the pass-pro grade and scheme-fit columns, so
 *  the gap is visible in the table and never reads as a real grade. */
function olGapCell(title: string): ReactNode {
  return <SignalChip label="Not in free feed" tone="neutral" title={title} />;
}

const OL_PASS_PRO_GAP_TITLE =
  "Per-lineman pass-protection grade is PFF-paywalled — GSE shows a dash and never fabricates an individual blocking grade. The closest free signal is the team protection proxy (pressure rate allowed / pocket time).";
const OL_SCHEME_FIT_GAP_TITLE =
  "Scheme fit (zone vs gap blocking) requires PFF/All-22 charting and is in no free source — GSE labels this a gap rather than guessing a scheme.";

function offensiveLineColumns(): ReadonlyArray<Column<OffensiveLineViewRow>> {
  return [
    { key: "playerName", label: "Player", render: (r) => playerCell(r.playerName) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "position", label: "Spot", tooltip: "line spot (T / G / C); hover for the charted side", sortValue: (r) => r.group, render: (r) => olPositionCell(r) },
    { key: "games", label: "G", align: "right", numeric: true },
    { key: "snapSharePct", label: "Snap %", align: "right", numeric: true, tooltip: "share of team offensive snaps — the iron-man tell", sortValue: (r) => r.snapSharePct, render: (r) => <ShareBar value={r.snapSharePct} format={(v) => fmtPercent(v)} /> },
    { key: "snapsPerGame", label: "Snaps/G", align: "right", numeric: true, render: (r) => fmtDecimal(r.snapsPerGame) },
    { key: "role", label: "Role", tooltip: "depth-chart role (starter / backup); dash if not charted", sortable: false, render: (r) => olRoleCell(r) },
    { key: "teamPressureRateAllowed", label: "Unit press% allow", align: "right", numeric: true, tooltip: "TEAM protection proxy: pressure rate allowed (unit + QB + scheme), not a per-lineman grade", sortValue: (r) => r.teamPressureRateAllowed, render: (r) => <ShareBar value={r.teamPressureRateAllowed} tone="bad" format={(v) => fmtPercent(v)} /> },
    { key: "teamPocketTime", label: "Unit pocket (s)", align: "right", numeric: true, tooltip: "TEAM protection proxy: mean pocket time (higher = more time)", sortValue: (r) => r.teamPocketTime, render: (r) => olCombineCell(r.teamPocketTime, 2) },
    { key: "teamSacksAllowed", label: "Unit sacks", align: "right", numeric: true, tooltip: "TEAM protection proxy: sacks the unit's QBs took (context, not blame)", sortValue: (r) => r.teamSacksAllowed, render: (r) => (r.teamSacksAllowed == null ? <span className="font-mono tabular-nums text-ion-2">—</span> : String(r.teamSacksAllowed)) },
    { key: "collegeForty", label: "40 (college)", align: "right", numeric: true, tooltip: "pre-draft combine 40-yard dash (s) — college prior, not current form", sortValue: (r) => r.collegePrior.forty, render: (r) => olCombineCell(r.collegePrior.forty, 2) },
    { key: "collegeCone", label: "3-cone (college)", align: "right", numeric: true, tooltip: "pre-draft combine 3-cone (s) — college prior", sortValue: (r) => r.collegePrior.cone, render: (r) => olCombineCell(r.collegePrior.cone, 2) },
    { key: "collegeBench", label: "Bench (college)", align: "right", numeric: true, tooltip: "pre-draft combine 225 bench reps — college prior", sortValue: (r) => r.collegePrior.bench, render: (r) => olCombineCell(r.collegePrior.bench, 0) },
    { key: "collegeWeight", label: "Wt (college)", align: "right", numeric: true, tooltip: "pre-draft combine weight (lb) — college prior", sortValue: (r) => r.collegePrior.weight, render: (r) => olCombineCell(r.collegePrior.weight, 0) },
    { key: "passProGrade", label: "Pass-pro grade", sortable: false, tooltip: OL_PASS_PRO_GAP_TITLE, render: () => olGapCell(OL_PASS_PRO_GAP_TITLE) },
    { key: "schemeFit", label: "Scheme fit", sortable: false, tooltip: OL_SCHEME_FIT_GAP_TITLE, render: () => olGapCell(OL_SCHEME_FIT_GAP_TITLE) },
  ];
}

// ── QBR ───────────────────────────────────────────────────────────────────────

function qbrColumns(): ReadonlyArray<Column<QbrRow>> {
  return [
    { key: "name", label: "Player", render: (r) => playerCell(r.name) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "games", label: "G", align: "right", numeric: true },
    { key: "qbr", label: "QBR", align: "right", numeric: true, tooltip: "play-weighted Total QBR (0-100)", render: (r) => r.qbr.toFixed(1) },
    { key: "epaTotal", label: "EPA", align: "right", numeric: true, sortValue: (r) => r.epaTotal, tooltip: "total expected points added", render: (r) => <DivergingBar value={r.epaTotal} domain={60} digits={1} /> },
    { key: "ptsAdded", label: "Pts added", align: "right", numeric: true, sortValue: (r) => r.ptsAdded, render: (r) => <DivergingBar value={r.ptsAdded} domain={60} digits={1} /> },
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
    { key: "qbrPct", label: "QBR %ile", align: "right", numeric: true, tooltip: "QBR percentile within the pool", sortValue: (r) => r.qbrPct, render: (r) => <PercentileBar pct={r.qbrPct} /> },
    { key: "cpoePct", label: "CPOE %ile", align: "right", numeric: true, tooltip: "CPOE (Next Gen accuracy) percentile", sortValue: (r) => r.cpoePct, render: (r) => <PercentileBar pct={r.cpoePct} /> },
    { key: "consensus", label: "Consensus", align: "right", numeric: true, tooltip: "mean of available percentiles", sortValue: (r) => r.consensus, render: (r) => <PercentileBar pct={r.consensus} /> },
    {
      key: "divergence",
      label: "The read",
      sortValue: (r) => DIVERGENCE_LABEL[r.divergence],
      render: (r) => <SignalChip label={DIVERGENCE_LABEL[r.divergence]} tone={divergenceTone(r.divergence)} title={r.note} />,
    },
  ];
}

// ── EDGE ──────────────────────────────────────────────────────────────────────

function edgeColumns(tone: "buy" | "sell"): ReadonlyArray<Column<EdgeSignalRow>> {
  const gapTone: SignalTone = tone === "buy" ? "good" : "bad";
  return [
    { key: "playerName", label: "Player", render: (r) => playerCell(r.playerName, r.position) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "games", label: "G", align: "right", numeric: true },
    { key: "pprPerGame", label: "PPR/G", align: "right", numeric: true, render: (r) => r.pprPerGame.toFixed(1) },
    { key: "targetShare", label: "Tgt sh", align: "right", numeric: true, sortValue: (r) => r.targetShare, render: (r) => <ShareBar value={r.targetShare} format={(v) => fmtPercent(v)} /> },
    { key: "avgSeparation", label: "Sep", align: "right", numeric: true, render: (r) => r.avgSeparation.toFixed(2) },
    { key: "yacAboveExpectation", label: "YAC+/-", align: "right", numeric: true, render: (r) => formatSigned(r.yacAboveExpectation, 2) },
    { key: "shareIntendedAirYards", label: "Air sh", align: "right", numeric: true, sortValue: (r) => r.shareIntendedAirYards, render: (r) => <ShareBar value={r.shareIntendedAirYards} format={(v) => fmtPercent(v)} /> },
    { key: "underlyingZ", label: "Undr z", align: "right", numeric: true, tooltip: "z-score of the underlying tracking signal", render: (r) => formatSigned(r.underlyingZ, 2) },
    { key: "productionZ", label: "Prod z", align: "right", numeric: true, tooltip: "z-score of actual production", render: (r) => formatSigned(r.productionZ, 2) },
    { key: "gap", label: "Gap", align: "right", numeric: true, sortValue: (r) => r.gap, tooltip: "underlying z minus production z", render: (r) => <DivergingBar value={r.gap} domain={3} tone={gapTone} digits={2} /> },
  ];
}

// ── INJURIES ──────────────────────────────────────────────────────────────────

function injuryStatusBadge(r: InjuryRow): ReactNode {
  const cls: Record<ReportStatus, string> = {
    Out: "border-rose-400/40 text-rose-400",
    Doubtful: "border-amber-400/40 text-amber-400",
    Questionable: "border-sky-400/40 text-sky-400",
    Other: "border-surface-line text-ion-2",
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
    { key: "injuryStatus", label: "Status", sortValue: (r) => r.injuryStatus, render: (r) => (r.injuryStatus ? <span className="text-amber-400">{r.injuryStatus}</span> : "—") },
    { key: "count", label: "Moves", align: "right", numeric: true, render: (r) => fmtNumber(r.count) },
  ];
}

// ── DFS ───────────────────────────────────────────────────────────────────────

function dfsColumns(): ReadonlyArray<Column<DfsSalaryRow>> {
  const agreementCell = (r: DfsSalaryRow): ReactNode => {
    const tone: SignalTone =
      r.agreement === "agree" ? "good" : r.agreement === "disagree" ? "bad" : "neutral";
    const text = r.agreement === "disagree" ? `±$${fmtNumber(r.spread)}` : r.agreement;
    return <SignalChip label={text} tone={tone} title={`feeds ${r.agreement}`} />;
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

// ── SCHEDULE CONTEXT ──────────────────────────────────────────────────────────

const ROOF_LABEL: Record<ScheduleContextRow["roof"], string> = {
  dome: "Dome",
  outdoors: "Outdoors",
  closed: "Closed",
  open: "Open",
  retractable: "Retractable",
  unknown: "—",
};

/** A rest-edge chip: home-minus-away rest days, toned + signed; dash when absent. */
function restEdgeCell(r: ScheduleContextRow): ReactNode {
  if (r.restEdge == null) return <span className="font-mono tabular-nums text-ion-2">—</span>;
  if (r.restEdge === 0) return <span className="font-mono tabular-nums text-ion-2">even</span>;
  const tone: SignalTone = r.restEdge > 0 ? "good" : "bad";
  const who = r.restEdge > 0 ? r.homeTeam : r.awayTeam;
  return <SignalChip label={`${who} +${Math.abs(r.restEdge)}d`} tone={tone} title="rest-days edge (home rest − away rest)" />;
}

function scheduleContextColumns(): ReadonlyArray<Column<ScheduleContextRow>> {
  return [
    { key: "game", label: "Game", render: (r) => <span className="font-mono font-medium text-ion-white">{r.game}</span> },
    { key: "gameday", label: "Date", render: (r) => (r.gameday ? <span className="font-mono text-xs text-ion-1">{r.gameday}</span> : "—") },
    { key: "homeRest", label: "Home rest", align: "right", numeric: true, tooltip: "home days of rest", render: (r) => (r.homeRest == null ? "—" : String(r.homeRest)) },
    { key: "awayRest", label: "Away rest", align: "right", numeric: true, tooltip: "away days of rest", render: (r) => (r.awayRest == null ? "—" : String(r.awayRest)) },
    { key: "restEdge", label: "Rest edge", sortValue: (r) => r.restEdge, tooltip: "home rest − away rest", render: (r) => restEdgeCell(r) },
    { key: "roof", label: "Roof", sortValue: (r) => ROOF_LABEL[r.roof], render: (r) => <span className="text-ion-1">{ROOF_LABEL[r.roof]}</span> },
    { key: "surface", label: "Surface", sortValue: (r) => r.surface, render: (r) => <span className="text-ion-1">{r.surface ?? "—"}</span> },
    { key: "divGame", label: "Div", align: "center", sortValue: (r) => (r.divGame ? 1 : 0), tooltip: "divisional game", render: (r) => (r.divGame ? <span className="font-mono text-xs text-ion-1">DIV</span> : <span className="text-ion-2">—</span>) },
    { key: "temp", label: "Temp", align: "right", numeric: true, tooltip: "kickoff temperature (°F); dash if not posted", render: (r) => (r.temp == null ? "—" : `${r.temp}°`) },
    { key: "wind", label: "Wind", align: "right", numeric: true, tooltip: "kickoff wind (mph); dash if not posted", render: (r) => (r.wind == null ? "—" : `${r.wind}`) },
    { key: "spreadLine", label: "Spread", align: "right", numeric: true, tooltip: "closing spread (+ = home favored); dash pre-posting", render: (r) => fmtDecimal(r.spreadLine, 1) },
    { key: "totalLine", label: "Total", align: "right", numeric: true, tooltip: "closing total; dash pre-posting", render: (r) => fmtDecimal(r.totalLine, 1) },
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
    case "snaps-defense": {
      return {
        columns: defenseSnapColumns() as ReadonlyArray<Column<unknown>>,
        rowKey: (row) => {
          const r = row as DefenseSnapShareRow;
          return `${r.playerId}-${r.team}`;
        },
        searchAccessor: (row) => {
          const r = row as DefenseSnapShareRow;
          return `${r.playerName} ${r.team} ${r.position} ${r.group}`;
        },
        enumAccessor: (row) => (row as DefenseSnapShareRow).group,
        enumLabel: "Group",
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
          const r = row as NgsReceivingFormRow;
          return `${r.playerId}-${r.team}`;
        },
        searchAccessor: (row) => {
          const r = row as NgsReceivingFormRow;
          return `${r.playerName} ${r.team} ${r.position}`;
        },
        rowTone: (row) => {
          const r = row as NgsReceivingFormRow;
          return r.separationDelta == null ? null : r.separationDelta >= 0.3 ? "good" : r.separationDelta <= -0.3 ? "bad" : null;
        },
      };
    }
    case "nextgen-passing": {
      return {
        columns: ngsPassingColumns() as ReadonlyArray<Column<unknown>>,
        rowKey: (row) => {
          const r = row as NgsPassingFormRow;
          return `${r.playerId}-${r.team}`;
        },
        searchAccessor: (row) => {
          const r = row as NgsPassingFormRow;
          return `${r.playerName} ${r.team}`;
        },
        rowTone: (row) => {
          const r = row as NgsPassingFormRow;
          return r.cpoeDelta == null ? null : r.cpoeDelta >= 1.5 ? "good" : r.cpoeDelta <= -1.5 ? "bad" : null;
        },
      };
    }
    case "nextgen-rushing": {
      return {
        columns: ngsRushingColumns() as ReadonlyArray<Column<unknown>>,
        rowKey: (row) => {
          const r = row as NgsRushingFormRow;
          return `${r.playerId}-${r.team}`;
        },
        searchAccessor: (row) => {
          const r = row as NgsRushingFormRow;
          return `${r.playerName} ${r.team}`;
        },
        rowTone: (row) => {
          const r = row as NgsRushingFormRow;
          return r.ryoeDelta == null ? null : r.ryoeDelta >= 0.4 ? "good" : r.ryoeDelta <= -0.4 ? "bad" : null;
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
    case "offensive-line": {
      return {
        columns: offensiveLineColumns() as ReadonlyArray<Column<unknown>>,
        rowKey: (row) => {
          const r = row as OffensiveLineViewRow;
          return `${r.playerId}-${r.team}-${r.position}`;
        },
        searchAccessor: (row) => {
          const r = row as OffensiveLineViewRow;
          return `${r.playerName} ${r.team} ${r.position} ${r.group} ${r.collegePrior.school ?? ""}`;
        },
        enumAccessor: (row) => (row as OffensiveLineViewRow).group,
        enumLabel: "Spot",
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
    case "schedule-context": {
      return {
        columns: scheduleContextColumns() as ReadonlyArray<Column<unknown>>,
        rowKey: (row) => (row as ScheduleContextRow).gameId,
        searchAccessor: (row) => {
          const r = row as ScheduleContextRow;
          return `${r.game} ${r.awayTeam} ${r.homeTeam}`;
        },
        rowTone: (row) => {
          const r = row as ScheduleContextRow;
          return r.restEdge == null || r.restEdge === 0 ? null : r.restEdge > 0 ? "good" : "bad";
        },
      };
    }
    default: {
      // Exhaustiveness guard — a new kind must add a binding above.
      const _exhaustive: never = section.kind;
      throw new Error(`Unknown player-lab section kind: ${String(_exhaustive)}`);
    }
  }
}

// ── Density: lead-with-the-read column reducer ────────────────────────────────

/**
 * Pick the default-visible columns for a section. When the server declares
 * `primaryColumns` (the player + the key read + a few numbers), we show only
 * those by default and keep the long tail behind a toggle — the page leads, it
 * doesn't wall. A declared key that doesn't resolve to a real column is ignored
 * (never an error), so a stale key degrades to "show that column from the tail"
 * rather than dropping it. With no `primaryColumns`, every column shows.
 */
function pickColumns(
  all: ReadonlyArray<Column<unknown>>,
  primary: readonly string[] | undefined,
  showAll: boolean,
): { columns: ReadonlyArray<Column<unknown>>; hiddenCount: number } {
  if (!primary || primary.length === 0) {
    return { columns: all, hiddenCount: 0 };
  }
  const primarySet = new Set(primary);
  const lead = all.filter((c) => primarySet.has(c.key));
  // Guard against a section whose declared keys don't match any column: fall
  // back to the full set so a stale config never blanks the table.
  if (lead.length === 0) {
    return { columns: all, hiddenCount: 0 };
  }
  const hiddenCount = all.length - lead.length;
  return { columns: showAll ? all : lead, hiddenCount };
}

// ── Section + view rendering (CLIENT) ─────────────────────────────────────────

function SectionBlock({ section }: { section: SectionData }): JSX.Element {
  const binding = resolveBinding(section);
  const [showAll, setShowAll] = useState(false);

  const { columns, hiddenCount } = useMemo(
    () => pickColumns(binding.columns, section.primaryColumns, showAll),
    [binding.columns, section.primaryColumns, showAll],
  );

  const enumOptions: ReadonlyArray<EnumOption> | undefined = section.enumOptions;
  const enumFilter =
    enumOptions && binding.enumAccessor
      ? {
          label: binding.enumLabel ?? POS_ENUM_LABEL,
          options: enumOptions,
          accessor: binding.enumAccessor,
        }
      : undefined;

  const hasHeader = Boolean(section.eyebrow || section.title || section.blurb);

  return (
    <section className="flex flex-col gap-3">
      {hasHeader ? (
        // Card-style header (the MovesCard pattern): a quiet raised panel that
        // frames the section read above the table, so the surface breathes.
        <div className="rounded-ds-md border border-surface-line bg-surface-raised/60 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
            <div className="min-w-0">
              {section.eyebrow ? (
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-orbital-cyan">
                  {section.eyebrow}
                </p>
              ) : null}
              <h2 className="mt-1 text-2xl font-semibold text-ion-white">{section.title}</h2>
              {section.blurb ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-ion-1">{section.blurb}</p>
              ) : null}
            </div>

            {hiddenCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                aria-expanded={showAll}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-ds-sm border border-surface-line px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-ion-1 transition-colors hover:border-surface-line-strong hover:text-ion-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbital-cyan/40"
              >
                {showAll ? "Fewer columns" : `All ${hiddenCount} more columns`}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <DataTable<unknown>
        columns={columns}
        rows={section.rows}
        rowKey={binding.rowKey}
        searchable={Boolean(binding.searchAccessor)}
        searchAccessor={binding.searchAccessor}
        enumFilter={enumFilter}
        rowTone={binding.rowTone}
        rowTitle={binding.rowTitle}
        showRank={section.showRank}
        minWidth={showAll ? section.minWidth : undefined}
        emptyTitle={section.emptyTitle}
        emptyHint={section.emptyHint}
      />

      {section.footnote ? (
        <p className="text-xs leading-5 text-ion-2">{section.footnote}</p>
      ) : null}
    </section>
  );
}

export interface PlayerLabTableProps {
  /** The serializable sections for the active view (in render order). */
  readonly sections: ReadonlyArray<SectionData>;
  /**
   * Whether this view's depth is gated for the current viewer. The server
   * decides it (via lib/access.ts: ACCESS.freePlayerViews + canAccess) and
   * passes a serializable boolean — true means FREE is looking at a paid view.
   * Default false (open) so an un-gated caller renders everything.
   */
  readonly locked?: boolean;
  /** Tier that unlocks a gated view — drives the CTA copy. Default "PRO". */
  readonly unlockTier?: "PRO" | "ELITE";
}

/**
 * Renders all of the active view's DataTable sections from serializable data.
 * The server page owns the loaders + hero/tabs/attribution and the gate
 * DECISION; this owns the tables (and therefore the render/sort/accessor
 * functions) and the gate PRESENTATION.
 *
 * When `locked`, the sections render as a blurred, inert teaser behind an
 * "Unlock with {tier}" CTA — the shape of the depth is visible, the depth
 * itself is sold. When open, they render in full.
 */
export function PlayerLabTable({
  sections,
  locked = false,
  unlockTier = "PRO",
}: PlayerLabTableProps): JSX.Element {
  const body = (
    <div className="flex flex-col gap-12">
      {sections.map((s) => (
        <SectionBlock key={s.id} section={s} />
      ))}
    </div>
  );

  return (
    <UpsellGate locked={locked} tier={unlockTier} label="the full Player Lab">
      {body}
    </UpsellGate>
  );
}

export default PlayerLabTable;
