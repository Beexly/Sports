import type { ReactNode } from "react";
import type { Column } from "@/components/ui/data-table";
import type { MetricTerm } from "@/components/ui/metric-explainer";
import type { SignalTone } from "@/lib/intelligence/colors";
import { formatSigned, signedTone, buySellTone } from "@/lib/intelligence/colors";

// ── Loaders (reused verbatim — consolidation is presentation only) ────────────
import {
  loadNflversePlayerLab,
  type DefenseVsPositionRank,
  type PlayerSeasonLine,
  type SkillPosition,
} from "@/lib/nflverse/player-lab";
import { loadNflverseSnapShare, type SnapShareRow } from "@/lib/nflverse/snap-share";
import {
  loadReceivingOpportunity,
  type ReceivingOpportunityRow,
} from "@/lib/intelligence/receiving-opportunity";
import {
  loadRushingEfficiency,
  type RushingEfficiencyRow,
} from "@/lib/intelligence/rushing-efficiency";
import {
  loadNflverseNextGenStats,
  type NgsPassingLine,
  type NgsReceivingLine,
  type NgsRushingLine,
} from "@/lib/nflverse/next-gen-stats";
import {
  loadNflversePressureCoverage,
  type CoverageRow,
  type QbPressureRow,
} from "@/lib/nflverse/pressure-coverage";
import { loadNflverseCombine, type CombineRow } from "@/lib/nflverse/combine";
import { loadNflverseQbr, type QbrRow } from "@/lib/nflverse/qbr";
import { loadQbConsensus, type QbConsensusRow, type Divergence } from "@/lib/intelligence/qb-consensus";
import { loadNflverseEdgeSignals, type EdgeSignalRow } from "@/lib/nflverse/edge-signals";
import {
  loadNflverseInjuryReport,
  type InjuryRow,
  type ReportStatus,
} from "@/lib/nflverse/injury-report";
import { loadSleeperMarketSignal, type SleeperTrendingPlayer } from "@/lib/sleeper/market-signal";
import { loadDfsSalaries, type DfsSalaryRow } from "@/lib/dfs/salaries";

/**
 * Player Lab view registry.
 *
 * Collapses the ~11 separate /players/* board pages into one tabbed lab. Each
 * view reuses its EXISTING loader (no loader rewrites) and declares, as data,
 * exactly how to present it on the shared LIGHT paper kit: the hero copy, the
 * "how to read it" explainer, and one or more DataTable sections (every metric
 * and column ported faithfully, no data dropped). A view can render more than
 * one table (e.g. Production has RB/WR/TE leaders + defense-vs-position), so a
 * view resolves to `sections: TableSection[]` — one DataTable per section.
 *
 * The page (app/players/page.tsx) reads ?view=, awaits the active view's
 * `load()`, and renders the result. Loaders stay server-only; this module is
 * imported only by the server component.
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

const POSITIONS: readonly SkillPosition[] = ["RB", "WR", "TE"];
const POSITION_LABEL: Record<SkillPosition, string> = {
  RB: "Running backs",
  WR: "Wide receivers",
  TE: "Tight ends",
};
const POS_OPTIONS = POSITIONS.map((p) => ({ value: p, label: p }));

/** Build distinct, sorted enum options from a row list (e.g. positions present). */
function distinctOptions<Row>(
  rows: readonly Row[],
  accessor: (row: Row) => string,
): ReadonlyArray<{ value: string; label: string }> {
  const set = new Set<string>();
  for (const r of rows) {
    const v = accessor(r);
    if (v) set.add(v);
  }
  return Array.from(set)
    .sort((a, b) => a.localeCompare(b))
    .map((v) => ({ value: v, label: v }));
}

// ── Public shapes ─────────────────────────────────────────────────────────────

/** A single DataTable's worth of rows + presentation, fully self-described. */
export interface TableSection {
  /** Stable key (also React key). */
  readonly id: string;
  /** Section eyebrow (small mono kicker). */
  readonly eyebrow?: string;
  /** Section heading. */
  readonly title: string;
  /** One-line "what this is" blurb under the heading. */
  readonly blurb?: string;
  /** A small note rendered under the table (formula / qualifier). */
  readonly footnote?: ReactNode;
  /** The table columns (ported faithfully from the old page). */
  readonly columns: ReadonlyArray<Column<Record<string, never>>>;
  /** The rows to render. */
  readonly rows: ReadonlyArray<unknown>;
  /** Stable row key. */
  readonly rowKey: (row: unknown, index: number) => string;
  /** Free-text search over a row (enables the search box when present). */
  readonly searchAccessor?: (row: unknown) => string;
  /** Optional enum filter (position is the common one). */
  readonly enumFilter?: {
    readonly label: string;
    readonly options: ReadonlyArray<{ value: string; label: string }>;
    readonly accessor: (row: unknown) => string;
  };
  /** Optional per-row accent tone. */
  readonly rowTone?: (row: unknown) => SignalTone | null;
  /** Optional native row tooltip. */
  readonly rowTitle?: (row: unknown) => string | undefined;
  /** Show the rank "#" column. */
  readonly showRank?: boolean;
  /** Min table width to keep numerics from crushing. */
  readonly minWidth?: number;
  /** Empty-state copy. */
  readonly emptyTitle?: string;
  readonly emptyHint?: string;
}

/** What a view's load() resolves to. */
export interface ViewResult {
  readonly status: "live" | "source-error";
  /** Honest reason when status === "source-error". */
  readonly error?: ReactNode;
  /** Short source-window summary for the hero (e.g. "Season 2024, week 12"). */
  readonly windowLabel?: string;
  /** Source attribution ids. */
  readonly sourceIds: readonly string[];
  /** One DataTable per section. */
  readonly sections: readonly TableSection[];
}

/** A registered player-lab view. */
export interface PlayerView {
  readonly slug: string;
  /** Tab label (short). */
  readonly label: string;
  /** Tab tooltip. */
  readonly tabTooltip?: string;
  /** Hero eyebrow. */
  readonly eyebrow: string;
  /** Hero title. */
  readonly title: ReactNode;
  /** Hero description. */
  readonly description: ReactNode;
  /** Optional "how to read it" explainer (hero aside). */
  readonly explainer?: ReadonlyArray<MetricTerm>;
  /** JSON export href (kept from each old page's hero). */
  readonly jsonHref: string;
  /** Resolve the view's data + presentation. */
  readonly load: () => Promise<ViewResult>;
}

// Small helper so each section's typed columns/rows compose without `any` noise.
function section<Row>(s: {
  id: string;
  eyebrow?: string;
  title: string;
  blurb?: string;
  footnote?: ReactNode;
  columns: ReadonlyArray<Column<Row>>;
  rows: ReadonlyArray<Row>;
  rowKey: (row: Row, index: number) => string;
  searchAccessor?: (row: Row) => string;
  enumFilter?: {
    label: string;
    options: ReadonlyArray<{ value: string; label: string }>;
    accessor: (row: Row) => string;
  };
  rowTone?: (row: Row) => SignalTone | null;
  rowTitle?: (row: Row) => string | undefined;
  showRank?: boolean;
  minWidth?: number;
  emptyTitle?: string;
  emptyHint?: string;
}): TableSection {
  return s as unknown as TableSection;
}

// ── PRODUCTION ────────────────────────────────────────────────────────────────

function productionLeaderColumns(): ReadonlyArray<Column<PlayerSeasonLine>> {
  return [
    { key: "playerName", label: "Player", sortable: true, render: (r) => playerCell(r.playerName, r.position) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "games", label: "G", align: "right", numeric: true },
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

async function loadProductionView(): Promise<ViewResult> {
  const lab = await loadNflversePlayerLab();
  if (lab.status === "source-error") {
    return {
      status: "source-error",
      error: lab.error ?? lab.blockReason ?? "UNKNOWN",
      sourceIds: ["nflverse"],
      sections: [],
    };
  }
  const allLeaders: PlayerSeasonLine[] = [...lab.leaders.RB, ...lab.leaders.WR, ...lab.leaders.TE];
  const leaderColumns = productionLeaderColumns();
  const defenseCols = defenseColumns();

  const sections: TableSection[] = [
    section<PlayerSeasonLine>({
      id: "leaders",
      eyebrow: "Season leaders",
      title: "Who is producing, who is heating up",
      blurb: `Ranked by PPR per game${lab.throughWeek ? ` over the first ${lab.throughWeek} weeks` : ""}. 5g is last-5 form; Δ is recent form minus season pace. Filter by position.`,
      footnote: "Settled, historical PPR — not a projection. Boom ≥ 20 PPR, bust ≤ 10 PPR per game.",
      columns: leaderColumns,
      rows: allLeaders,
      rowKey: (r) => `${r.playerId}-${r.team}`,
      searchAccessor: (r) => `${r.playerName} ${r.team} ${r.position}`,
      enumFilter: { label: "Pos", options: POS_OPTIONS, accessor: (r) => r.position },
      rowTone: (r) => (r.last5PprDelta >= 1.5 ? "good" : r.last5PprDelta <= -1.5 ? "bad" : null),
      showRank: true,
      minWidth: 1180,
    }),
  ];

  for (const position of POSITIONS) {
    sections.push(
      section<DefenseVsPositionRank>({
        id: `defense-${position}`,
        eyebrow: `Defense vs ${position}`,
        title: `Softest matchups for ${POSITION_LABEL[position].toLowerCase()}`,
        blurb: "PPR opportunity allowed per game, ranked across qualifying defenses. Rank 1 allows the most — what actually happened on the field.",
        columns: defenseCols,
        rows: lab.defenseVsPosition[position],
        rowKey: (r) => `${r.team}-${r.position}`,
        minWidth: 360,
        emptyTitle: "Not enough games in the source window.",
      }),
    );
  }

  return {
    status: "live",
    windowLabel: `Season ${lab.season}${lab.throughWeek ? `, through week ${lab.throughWeek}` : ""}`,
    sourceIds: ["nflverse"],
    sections,
  };
}

// ── SNAPS ─────────────────────────────────────────────────────────────────────

function snapColumns(): ReadonlyArray<Column<SnapShareRow>> {
  return [
    { key: "playerName", label: "Player", render: (r) => playerCell(r.playerName, r.position) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "games", label: "G", align: "right", numeric: true },
    { key: "snapSharePct", label: "Snap %", align: "right", numeric: true, render: (r) => fmtPercent(r.snapSharePct) },
    { key: "snapsPerGame", label: "Snaps/G", align: "right", numeric: true, render: (r) => fmtDecimal(r.snapsPerGame) },
  ];
}

async function loadSnapsView(): Promise<ViewResult> {
  const snap = await loadNflverseSnapShare();
  if (snap.status === "source-error") {
    return { status: "source-error", error: snap.error ?? snap.blockReason ?? "UNKNOWN", sourceIds: ["nflverse"], sections: [] };
  }
  const rows: SnapShareRow[] = [...snap.leaders.RB, ...snap.leaders.WR, ...snap.leaders.TE];
  return {
    status: "live",
    windowLabel: `Season ${snap.season}`,
    sourceIds: ["nflverse"],
    sections: [
      section<SnapShareRow>({
        id: "snaps",
        eyebrow: "Snap share",
        title: "Workload before box score",
        blurb: "Share of team offensive snaps a player is on the field for, averaged across the season. Filter by position.",
        footnote: "Snap share is the cleanest leading indicator of opportunity — it moves before targets and production do.",
        columns: snapColumns(),
        rows,
        rowKey: (r) => `${r.playerId}-${r.team}`,
        searchAccessor: (r) => `${r.playerName} ${r.team} ${r.position}`,
        enumFilter: { label: "Pos", options: POS_OPTIONS, accessor: (r) => r.position },
        showRank: true,
        minWidth: 560,
      }),
    ],
  };
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
    { key: "pctStackedBox", label: "Box%", align: "right", numeric: true, tooltip: "% of carries vs an 8+ man box", render: (r) => `${r.pctStackedBox.toFixed(0)}%` },
    {
      key: "read",
      label: "The read",
      sortValue: (r) => READ_LABEL[r.read],
      render: (r) => <span className="font-semibold text-ink-1">{READ_LABEL[r.read]}</span>,
    },
  ];
}

async function loadOpportunityView(): Promise<ViewResult> {
  const [o, ru] = await Promise.all([loadReceivingOpportunity(), loadRushingEfficiency()]);
  if (o.status === "source-error") {
    return { status: "source-error", error: o.error ?? o.note ?? "UNKNOWN", sourceIds: ["nflverse"], sections: [] };
  }
  const sections: TableSection[] = [
    section<ReceivingOpportunityRow>({
      id: "receiving",
      eyebrow: `Opportunity leaders${o.throughWeek ? ` · ${o.season} through week ${o.throughWeek}` : ""}`,
      title: "Who's earning the looks",
      blurb: o.note,
      footnote: "WOPR = 1.5·target share + 0.7·air-yards share (mean per game). The read compares opportunity vs production percentiles — weight this, not the box score.",
      columns: opportunityColumns(),
      rows: o.rows,
      rowKey: (r) => r.playerId,
      searchAccessor: (r) => `${r.name} ${r.team} ${r.position}`,
      enumFilter: { label: "Pos", options: distinctOptions(o.rows, (r) => r.position), accessor: (r) => r.position },
      rowTitle: (r) => r.note,
      rowTone: (r) => oppTone(r.signal),
      showRank: true,
      minWidth: 920,
    }),
  ];
  if (ru.status !== "source-error" && ru.rows.length > 0) {
    sections.push(
      section<RushingEfficiencyRow>({
        id: "rushing",
        eyebrow: `Backfield · efficiency vs volume${ru.season ? ` · ${ru.season}` : ""}`,
        title: "RB value is a different equation",
        blurb: ru.note,
        footnote: "Volume is the floor (sticky, coach-driven); RYOE is the regression-prone ceiling. Hover a row for the read.",
        columns: rushingColumns(),
        rows: ru.rows,
        rowKey: (r) => r.playerId,
        searchAccessor: (r) => `${r.name} ${r.team}`,
        rowTitle: (r) => r.note,
        showRank: true,
        minWidth: 820,
      }),
    );
  }
  return {
    status: "live",
    windowLabel: `Season ${o.season}${o.throughWeek ? ` through week ${o.throughWeek}` : ""}`,
    sourceIds: ["nflverse"],
    sections,
  };
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

async function loadNextGenView(): Promise<ViewResult> {
  const ngs = await loadNflverseNextGenStats();
  if (ngs.status === "source-error") {
    return { status: "source-error", error: ngs.error ?? ngs.blockReason ?? "UNKNOWN", sourceIds: ["nflverse"], sections: [] };
  }
  return {
    status: "live",
    windowLabel: `Season ${ngs.season}`,
    sourceIds: ["nflverse"],
    sections: [
      section<NgsReceivingLine>({
        id: "receiving",
        eyebrow: "Receiving · tracking",
        title: "Who gets open",
        blurb: "Separation (space at the catch point), cushion (pre-snap space), and YAC over expected.",
        columns: ngsReceivingColumns(),
        rows: ngs.receiving,
        rowKey: (r) => `${r.playerId}-${r.team}`,
        searchAccessor: (r) => `${r.playerName} ${r.team} ${r.position}`,
        showRank: true,
        minWidth: 860,
      }),
      section<NgsPassingLine>({
        id: "passing",
        eyebrow: "Passing · tracking",
        title: "Who is accurate beyond expectation",
        blurb: "CPOE (completion % over expected, given throw difficulty), time-to-throw, aggressiveness.",
        columns: ngsPassingColumns(),
        rows: ngs.passing,
        rowKey: (r) => `${r.playerId}-${r.team}`,
        searchAccessor: (r) => `${r.playerName} ${r.team}`,
        showRank: true,
        minWidth: 860,
      }),
      section<NgsRushingLine>({
        id: "rushing",
        eyebrow: "Rushing · tracking",
        title: "Who beats the blocking",
        blurb: "Rush yards over expected per attempt — production above what the blocking and box gave them.",
        columns: ngsRushingColumns(),
        rows: ngs.rushing,
        rowKey: (r) => `${r.playerId}-${r.team}`,
        searchAccessor: (r) => `${r.playerName} ${r.team}`,
        showRank: true,
        minWidth: 760,
      }),
    ],
  };
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

async function loadTrenchesView(): Promise<ViewResult> {
  const pc = await loadNflversePressureCoverage();
  if (pc.status === "source-error") {
    return { status: "source-error", error: pc.error ?? pc.blockReason ?? "UNKNOWN", sourceIds: ["nflverse"], sections: [] };
  }
  return {
    status: "live",
    windowLabel: `Season ${pc.season}`,
    sourceIds: ["nflverse"],
    sections: [
      section<QbPressureRow>({
        id: "qb-pressure",
        eyebrow: "QB pressure",
        title: "Most pressured passers",
        blurb: "Share of dropbacks pressured (season mean). Bad-throw% and sacks show how it cashes out.",
        columns: qbPressureColumns(),
        rows: pc.qbPressure,
        rowKey: (r) => r.playerId,
        searchAccessor: (r) => `${r.name} ${r.team}`,
        showRank: true,
        minWidth: 640,
        emptyTitle: "No qualifying quarterbacks in the source window.",
      }),
      section<CoverageRow>({
        id: "coverage",
        eyebrow: "Coverage",
        title: "Lockdown defenders",
        blurb: "Lowest passer rating allowed in coverage (target-weighted), min 25 targets. Who you can't throw at.",
        columns: coverageColumns(),
        rows: pc.coverage,
        rowKey: (r) => r.playerId,
        searchAccessor: (r) => `${r.name} ${r.team}`,
        showRank: true,
        minWidth: 720,
        emptyTitle: "No qualifying defenders in the source window.",
      }),
    ],
  };
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

async function loadCombineView(): Promise<ViewResult> {
  const c = await loadNflverseCombine();
  if (c.status === "source-error") {
    return { status: "source-error", error: c.error ?? c.blockReason ?? "UNKNOWN", sourceIds: ["nflverse"], sections: [] };
  }
  return {
    status: "live",
    windowLabel: `Latest class ${c.latestYear ?? "N/A"}`,
    sourceIds: ["nflverse"],
    sections: [
      section<CombineRow>({
        id: "latest",
        eyebrow: `Class of ${c.latestYear ?? ""}`,
        title: "Fastest 40 in the latest class",
        blurb: "Athletic-trait scouting priors — forty, vertical, broad jump, three-cone, shuttle. Filter by position.",
        columns: combineColumns(false),
        rows: c.latestClass,
        rowKey: (r, i) => `${r.name}-${r.draftYear}-${i}`,
        searchAccessor: (r) => `${r.name} ${r.position} ${r.school}`,
        showRank: true,
        minWidth: 760,
        emptyTitle: "No measurements in the source window.",
      }),
      section<CombineRow>({
        id: "fastest",
        eyebrow: "All-time",
        title: "Fastest 40 on record",
        blurb: "The fastest forties in the source file, all classes.",
        columns: combineColumns(true),
        rows: c.fastestForty,
        rowKey: (r, i) => `${r.name}-${r.draftYear}-${i}`,
        searchAccessor: (r) => `${r.name} ${r.position} ${r.school}`,
        showRank: true,
        minWidth: 820,
        emptyTitle: "No measurements in the source window.",
      }),
    ],
  };
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

async function loadQbrView(): Promise<ViewResult> {
  const [q, consensus] = await Promise.all([loadNflverseQbr(), loadQbConsensus()]);
  if (q.status === "source-error") {
    return { status: "source-error", error: q.error ?? q.blockReason ?? "UNKNOWN", sourceIds: ["nflverse"], sections: [] };
  }
  const sections: TableSection[] = [
    section<QbrRow>({
      id: "qbr",
      eyebrow: "QBR leaders",
      title: `Play-weighted, ${q.season} regular season`,
      blurb: "ESPN Total QBR (0-100), play-weighted across the season. One independent QB-quality estimate.",
      footnote: "QBR is play-weighted across the season; min 6 games. EPA = total expected points added.",
      columns: qbrColumns(),
      rows: q.leaders,
      rowKey: (r) => r.playerId,
      searchAccessor: (r) => `${r.name} ${r.team}`,
      showRank: true,
      minWidth: 640,
    }),
  ];
  if (consensus.status !== "source-error" && consensus.rows.length > 0) {
    sections.push(
      section<QbConsensusRow>({
        id: "consensus",
        eyebrow: "Consensus · two independent lenses",
        title: "Where the estimators agree — and where they don't",
        blurb: consensus.note,
        footnote: `Two independent estimators, each as a within-pool percentile. We surface disagreement (results vs accuracy) instead of averaging it into false precision.${!consensus.sources.ngs ? " CPOE feed unavailable — single-source reads only." : ""}`,
        columns: consensusColumns(),
        rows: consensus.rows,
        rowKey: (r, i) => `${r.name}-${i}`,
        searchAccessor: (r) => `${r.name} ${r.team}`,
        rowTitle: (r) => r.note,
        rowTone: (r) => (r.divergence === "aligned" ? "good" : null),
        showRank: true,
        minWidth: 720,
      }),
    );
  }
  return { status: "live", windowLabel: `Season ${q.season}`, sourceIds: ["nflverse"], sections };
}

// ── EDGE ──────────────────────────────────────────────────────────────────────

function edgeColumns(tone: "buy" | "sell"): ReadonlyArray<Column<EdgeSignalRow>> {
  const gapCls = tone === "buy" ? "text-emerald-700" : "text-rose-700";
  return [
    { key: "playerName", label: "Player", render: (r) => playerCell(r.playerName, r.position) },
    { key: "team", label: "Tm", render: (r) => teamCell(r.team) },
    { key: "games", label: "G", align: "right", numeric: true },
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

async function loadEdgeView(): Promise<ViewResult> {
  const edge = await loadNflverseEdgeSignals();
  if (edge.status === "source-error") {
    return { status: "source-error", error: edge.error ?? edge.blockReason ?? "UNKNOWN", sourceIds: ["nflverse"], sections: [] };
  }
  return {
    status: "live",
    windowLabel: `Season ${edge.season}`,
    sourceIds: ["nflverse"],
    sections: [
      section<EdgeSignalRow>({
        id: "buy-low",
        eyebrow: "Buy-low · regression up",
        title: "Underlying ahead of the box score",
        blurb: "Tracking signal runs hotter than production. Ranked by the gap (underlying z minus production z).",
        columns: edgeColumns("buy"),
        rows: edge.buyLow,
        rowKey: (r) => `${r.playerId}-${r.team}`,
        searchAccessor: (r) => `${r.playerName} ${r.team} ${r.position}`,
        rowTone: () => "good",
        showRank: true,
        minWidth: 940,
        emptyTitle: "No players cleared the gap threshold in the source window.",
      }),
      section<EdgeSignalRow>({
        id: "sell-high",
        eyebrow: "Sell-high · regression risk",
        title: "Production ahead of the underlying",
        blurb: "Output is outrunning the tracking signal. Ranked by the most negative gap.",
        columns: edgeColumns("sell"),
        rows: edge.sellHigh,
        rowKey: (r) => `${r.playerId}-${r.team}`,
        searchAccessor: (r) => `${r.playerName} ${r.team} ${r.position}`,
        rowTone: () => "bad",
        showRank: true,
        minWidth: 940,
        emptyTitle: "No players cleared the gap threshold in the source window.",
      }),
    ],
  };
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

async function loadInjuriesView(): Promise<ViewResult> {
  const report = await loadNflverseInjuryReport();
  if (report.status === "source-error") {
    return { status: "source-error", error: report.error ?? report.note ?? "UNKNOWN", sourceIds: ["nflverse"], sections: [] };
  }
  return {
    status: "live",
    windowLabel: `Season ${report.season}, week ${report.week ?? "N/A"}`,
    sourceIds: ["nflverse"],
    sections: [
      section<InjuryRow>({
        id: "injuries",
        eyebrow: "Latest week",
        title: "Designations & practice status",
        blurb: `Out ${report.counts.out} · Doubtful ${report.counts.doubtful} · Questionable ${report.counts.questionable}. Official team-submitted designations. Filter by position.`,
        footnote: report.note,
        columns: injuryColumns(),
        rows: report.rows,
        rowKey: (r) => `${r.playerId}-${r.team}`,
        searchAccessor: (r) => `${r.playerName} ${r.team} ${r.position} ${r.primaryInjury}`,
        enumFilter: { label: "Pos", options: distinctOptions(report.rows, (r) => r.position), accessor: (r) => r.position },
        rowTone: (r) => (r.reportStatus === "Out" ? "bad" : null),
        minWidth: 820,
        emptyTitle: "No designations in the latest week of the source file.",
      }),
    ],
  };
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

async function loadMarketView(): Promise<ViewResult> {
  const signal = await loadSleeperMarketSignal();
  if (signal.status === "source-error") {
    return { status: "source-error", error: signal.error ?? signal.note ?? "UNKNOWN", sourceIds: ["sleeper"], sections: [] };
  }
  return {
    status: "live",
    windowLabel: `Last ${signal.lookbackHours} hours`,
    sourceIds: ["sleeper"],
    sections: [
      section<SleeperTrendingPlayer>({
        id: "adds",
        eyebrow: "Rising · most added",
        title: "Buying",
        blurb: `Live add activity across Sleeper leagues over the last ${signal.lookbackHours} hours.`,
        footnote: signal.note,
        columns: marketColumns(),
        rows: signal.adds,
        rowKey: (r) => r.playerId,
        searchAccessor: (r) => `${r.name} ${r.team} ${r.position}`,
        enumFilter: { label: "Pos", options: distinctOptions(signal.adds, (r) => r.position), accessor: (r) => r.position },
        rowTone: () => "good",
        showRank: true,
        minWidth: 520,
        emptyTitle: "No trending players in this window.",
      }),
      section<SleeperTrendingPlayer>({
        id: "drops",
        eyebrow: "Falling · most dropped",
        title: "Selling",
        blurb: `Live drop activity across Sleeper leagues over the last ${signal.lookbackHours} hours.`,
        columns: marketColumns(),
        rows: signal.drops,
        rowKey: (r) => r.playerId,
        searchAccessor: (r) => `${r.name} ${r.team} ${r.position}`,
        enumFilter: { label: "Pos", options: distinctOptions(signal.drops, (r) => r.position), accessor: (r) => r.position },
        rowTone: () => "bad",
        showRank: true,
        minWidth: 520,
        emptyTitle: "No trending players in this window.",
      }),
    ],
  };
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

async function loadDfsView(): Promise<ViewResult> {
  const dfs = await loadDfsSalaries();
  if (dfs.status !== "live" || dfs.rows.length === 0) {
    const reason =
      dfs.status === "source-error"
        ? "Feeds are configured but none returned a slate right now."
        : "No DraftKings salaries shown — no licensed feed is connected.";
    return {
      status: "source-error",
      error: (
        <>
          {reason} {dfs.gate.legalNote} Provider keys: {dfs.gate.requiredEnv.join(", ")}.
        </>
      ),
      sourceIds: [],
      sections: [],
    };
  }
  const connectedLive = dfs.providers.filter((p) => p.status === "live").length;
  return {
    status: "live",
    windowLabel: `DraftKings · ${dfs.date}`,
    sourceIds: [],
    sections: [
      section<DfsSalaryRow>({
        id: "salaries",
        eyebrow: `DraftKings salaries · ${dfs.date}`,
        title: `Reconciled across ${connectedLive} feed${connectedLive === 1 ? "" : "s"}`,
        blurb: "DK salaries via licensed DFS providers, reconciled across feeds. A salary is trusted when feeds agree; disagreement is flagged. Filter by position.",
        footnote: `${dfs.discrepancies} disagreement${dfs.discrepancies === 1 ? "" : "s"} flagged across ${dfs.rows.length} salaries.`,
        columns: dfsColumns(),
        rows: dfs.rows,
        rowKey: (r) => `${r.name}-${r.team}`,
        searchAccessor: (r) => `${r.name} ${r.team} ${r.position}`,
        enumFilter: { label: "Pos", options: distinctOptions(dfs.rows, (r) => r.position), accessor: (r) => r.position },
        rowTone: (r) => (r.agreement === "disagree" ? "bad" : null),
        showRank: true,
        minWidth: 640,
      }),
    ],
  };
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const PLAYER_VIEWS: readonly PlayerView[] = [
  {
    slug: "production",
    label: "Production",
    tabTooltip: "Season leaders, last-5 form, defense ranks",
    eyebrow: "Production Lab",
    title: "Who is producing, who is heating up, who is easy to score on.",
    description:
      "Season leaders, last-5 recent form, and positional defense ranks — all computed from real nflverse player-week rows. Settled, historical facts, not forecasts.",
    explainer: [
      { term: "PPR/G & 5g", definition: "Per-game PPR over the season, and over the last 5 games. Δ = recent form minus season pace." },
      { term: "Boom% / Bust%", definition: "Share of games at or above a startable ceiling (≥20) and at or below a floor (≤10) — the real distribution." },
      { term: "WOPR & target share", definition: "Weighted opportunity rating and share of team targets — the role behind the points." },
    ],
    jsonHref: "/api/nflverse/player-lab",
    load: loadProductionView,
  },
  {
    slug: "snaps",
    label: "Snaps",
    tabTooltip: "Offensive snap-share leaders",
    eyebrow: "Snap share",
    title: "Workload before box score.",
    description:
      "The share of his team's offensive snaps a player is on the field for, averaged across the season — the cleanest leading indicator of opportunity. Real, settled workload from nflverse.",
    explainer: [
      { term: "Snap %", definition: "Average share of team offensive snaps the player is on the field for." },
      { term: "Why it leads", definition: "Snap share moves before targets and production do — opportunity precedes the box score." },
    ],
    jsonHref: "/api/nflverse/snap-share",
    load: loadSnapsView,
  },
  {
    slug: "opportunity",
    label: "Opportunity",
    tabTooltip: "WOPR / air yards (WR) & RYOE / volume (RB)",
    eyebrow: "Receiving opportunity",
    title: "Opportunity comes before production.",
    description:
      "We read WOPR (target + air-yards share), aDOT, and RACR from real nflverse play-by-play, then flag where opportunity and production disagree — that gap is the edge. Not a pick.",
    explainer: [
      { term: "WOPR", definition: "1.5·target share + 0.7·air-yards share. The single best summary of a receiver's role; it leads fantasy points." },
      { term: "aDOT & RACR", definition: "Depth of target, and yards earned per air yard. Together they separate volume from efficiency." },
      { term: "The read", definition: "Opportunity ≫ production = buy-low (positive regression); production ≫ opportunity = sell-high." },
    ],
    jsonHref: "/api/intelligence/receiving-opportunity",
    load: loadOpportunityView,
  },
  {
    slug: "nextgen",
    label: "Next Gen",
    tabTooltip: "Separation, CPOE, RYOE (tracking data)",
    eyebrow: "Next Gen Stats",
    title: "The metrics that aren't in the box score.",
    description:
      "Player-tracking data from nflverse: how open a receiver gets (separation, YAC over expected), how accurate a QB is vs expectation (CPOE) and how fast he throws, and yards a back earns over the blocking (RYOE).",
    explainer: [
      { term: "Separation / Cushion", definition: "Yards of space at the catch point, and pre-snap cushion the defense gives." },
      { term: "CPOE", definition: "Completion percentage over expected given throw difficulty — accuracy, not just results." },
      { term: "RYOE/att", definition: "Rush yards over expected per attempt — production above what the blocking and box gave." },
    ],
    jsonHref: "/api/nflverse/next-gen-stats",
    load: loadNextGenView,
  },
  {
    slug: "trenches",
    label: "Trenches",
    tabTooltip: "Pressure & coverage (PFR advanced charting)",
    eyebrow: "Pressure & Coverage",
    title: "The trenches, charted.",
    description:
      "PFR advanced charting from nflverse: how often each quarterback is pressured and how he throws under it, and which defenders in coverage are actually throwable. Context for a read, not a pick.",
    explainer: [
      { term: "Pressure%", definition: "Share of dropbacks a quarterback is pressured (season mean). Bad-throw% and sacks show how it cashes out." },
      { term: "Rating allowed", definition: "Passer rating allowed in coverage, target-weighted. Lower = a defender you can't throw at." },
    ],
    jsonHref: "/api/nflverse/pressure-coverage",
    load: loadTrenchesView,
  },
  {
    slug: "combine",
    label: "Combine",
    tabTooltip: "Athletic testing measurements",
    eyebrow: "Combine · athletic testing",
    title: "The traits, before the tape.",
    description:
      "NFL Combine measurements from nflverse — forty, vertical, broad jump, three-cone, shuttle, bench. Scouting priors: real athletic traits to weigh against production, not proof of anything.",
    explainer: [
      { term: "40 / shuttle / 3-cone", definition: "Straight-line speed and change-of-direction tests — the core athletic battery." },
      { term: "Priors, not proof", definition: "Treat these as scouting priors to weigh against production — they don't decide anything alone." },
    ],
    jsonHref: "/api/nflverse/combine",
    load: loadCombineView,
  },
  {
    slug: "qbr",
    label: "QBR",
    tabTooltip: "ESPN Total QBR + CPOE consensus",
    eyebrow: "Total QBR",
    title: "A second opinion on the quarterback.",
    description:
      "ESPN's Total QBR (0–100), play-weighted across the season, via nflverse — one independent estimate to triangulate against CPOE (Next Gen) and pressure (PFR). When lenses agree, you trust the read more.",
    explainer: [
      { term: "Total QBR", definition: "ESPN's play-weighted 0–100 quarterback rating. Results/EPA-weighted." },
      { term: "Consensus", definition: "QBR and CPOE as within-pool percentiles. We surface disagreement (results vs accuracy) rather than averaging it away." },
    ],
    jsonHref: "/api/nflverse/qbr",
    load: loadQbrView,
  },
  {
    slug: "edge",
    label: "Edge",
    tabTooltip: "Buy-low / sell-high from tracking vs production",
    eyebrow: "Edge Signals",
    title: "Getting open, not yet getting paid.",
    description:
      "We standardize a receiver's tracking signal (separation, YAC over expected, air-yards share) and compare it to actual PPR production. Underlying hotter than the box score = buy-low; output outrunning it = sell-high.",
    explainer: [
      { term: "Underlying z", definition: "Standardized tracking signal — separation, YAC over expected, air-yards share — across the qualified pool." },
      { term: "Production z", definition: "Standardized actual PPR production across the same pool." },
      { term: "Gap", definition: "Underlying z minus production z. Positive = buy-low (regression up); negative = sell-high (regression risk)." },
    ],
    jsonHref: "/api/nflverse/edge-signals",
    load: loadEdgeView,
  },
  {
    slug: "injuries",
    label: "Injuries",
    tabTooltip: "Official injury designations",
    eyebrow: "Injury report",
    title: "Who is actually available.",
    description:
      "The official, team-submitted injury designations (Out / Doubtful / Questionable) and practice status for the latest week. Availability is the single highest-value non-market driver of outcomes — reported facts as published.",
    explainer: [
      { term: "Out / Doubtful / Questionable", definition: "The official game-status designation a team submitted for the player." },
      { term: "Practice status", definition: "Did Not Participate / Limited / Full — the practice signal behind the designation." },
    ],
    jsonHref: "/api/nflverse/injuries",
    load: loadInjuriesView,
  },
  {
    slug: "market",
    label: "Market",
    tabTooltip: "Live fantasy adds & drops (Sleeper)",
    eyebrow: "Market signal",
    title: "What the crowd is doing right now.",
    description:
      "Live add/drop activity across Sleeper fantasy leagues over a rolling window — real crowd behavior, useful as a sentiment and breaking-news tell. Not our projection or a betting pick.",
    explainer: [
      { term: "Moves", definition: "How many Sleeper leagues added or dropped the player in the window." },
      { term: "What it is", definition: "Crowd sentiment and a breaking-news tell — not a projection. The first non-nflverse feed in the registry." },
    ],
    jsonHref: "/api/sleeper/market-signal",
    load: loadMarketView,
  },
  {
    slug: "dfs",
    label: "DFS",
    tabTooltip: "DraftKings salaries (licensed, cross-checked)",
    eyebrow: "DFS salaries",
    title: "DraftKings salaries — licensed, and cross-checked.",
    description:
      "We do not scrape DraftKings (their Terms prohibit it). DK salaries flow through licensed DFS providers, pulled from multiple feeds and reconciled — trusted when feeds agree, flagged when they disagree.",
    explainer: [
      { term: "Feeds", definition: "How many licensed providers reported a salary for the player." },
      { term: "Check", definition: "agree = feeds within tolerance; single = one source; disagree = mismatch flagged with the spread." },
    ],
    jsonHref: "/api/dfs/salaries",
    load: loadDfsView,
  },
];

export const DEFAULT_VIEW_SLUG = "production";

/** Resolve a slug (possibly from searchParams) to a registered view. */
export function resolvePlayerView(slug: string | undefined): PlayerView {
  const found =
    PLAYER_VIEWS.find((v) => v.slug === slug) ??
    PLAYER_VIEWS.find((v) => v.slug === DEFAULT_VIEW_SLUG) ??
    PLAYER_VIEWS[0];
  if (!found) {
    throw new Error("PLAYER_VIEWS registry is empty");
  }
  return found;
}
