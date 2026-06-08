import type { ReactNode } from "react";

// ── Loaders (reused verbatim — consolidation is presentation only) ────────────
import {
  loadNflversePlayerLab,
  type PlayerSeasonLine,
  type SkillPosition,
} from "@/lib/nflverse/player-lab";
import {
  loadNflverseSnapShare,
  type SnapShareRow,
  type DefenseSnapShareRow,
  type DefensePositionGroup,
} from "@/lib/nflverse/snap-share";
import { loadReceivingOpportunity } from "@/lib/intelligence/receiving-opportunity";
import { loadRushingEfficiency } from "@/lib/intelligence/rushing-efficiency";
import {
  loadNflverseNextGenStats,
  type NgsReceivingLine,
  type NgsPassingLine,
  type NgsRushingLine,
  type NgsTrailingReceiving,
  type NgsTrailingPassing,
  type NgsTrailingRushing,
  type NgsReceivingWeek,
  type NgsPassingWeek,
  type NgsRushingWeek,
} from "@/lib/nflverse/next-gen-stats";
import { loadScheduleContext } from "@/lib/nflverse/schedule-context";
import { loadNflversePressureCoverage } from "@/lib/nflverse/pressure-coverage";
import { loadNflverseCombine } from "@/lib/nflverse/combine";
import { loadNflverseQbr } from "@/lib/nflverse/qbr";
import { loadQbConsensus } from "@/lib/intelligence/qb-consensus";
import { loadNflverseEdgeSignals } from "@/lib/nflverse/edge-signals";
import { loadNflverseInjuryReport } from "@/lib/nflverse/injury-report";
import { loadSleeperMarketSignal } from "@/lib/sleeper/market-signal";
import { loadDfsSalaries } from "@/lib/dfs/salaries";

/**
 * Player Lab view registry (SERVER).
 *
 * Collapses the original /players/* board pages into one tabbed lab, then
 * consolidates that down to six primary tabs (Production, Snaps, Next Gen,
 * Trenches, Efficiency, Availability) — folding QBR into Next Gen, Combine into
 * Trenches, Edge + backfield efficiency into Efficiency, and Injuries + Market
 * into Availability — with DFS demoted to a secondary (deep-link-only) view.
 * Every consolidation is presentation only: each view reuses the EXISTING
 * loaders (no loader rewrites) and declares, as DATA,
 * exactly how to present it: the hero copy and one or more table SECTIONS (every
 * metric and column ported faithfully, no data
 * dropped). A view can render more than one table (e.g. Production has RB/WR/TE
 * leaders + defense-vs-position), so a view resolves to `sections: SectionData[]`
 * — one DataTable per section.
 *
 * RSC boundary: this module is server-only. It returns ONLY serializable data —
 * plain row objects plus a `kind` discriminator and serializable per-section
 * meta (title, blurb, footnote text, enum options, tone variant). The render(),
 * sortValue(), and row/search/enum/tone ACCESSOR functions live in the
 * 'use client' component (components/players/player-lab-table.tsx), which
 * reattaches them by `kind`. Functions never cross server→client here.
 *
 * The page (app/players/page.tsx) reads ?view=, awaits the active view's
 * `load()`, renders the hero/tabs/attribution (serializable props), and hands
 * the sections to <PlayerLabTable>. Loaders stay server-only.
 */

// ── Serializable shapes (cross the RSC boundary) ──────────────────────────────

/** A serializable enum-filter option (e.g. a position). */
export interface EnumOption {
  readonly value: string;
  readonly label: string;
}

/**
 * Identifies which client-side column set + accessors a section uses. The client
 * component owns one binding per kind; the server only names it.
 */
export type SectionKind =
  | "production-leaders"
  | "production-defense"
  | "snaps"
  | "snaps-defense"
  | "schedule-context"
  | "opportunity-receiving"
  | "opportunity-rushing"
  | "nextgen-receiving"
  | "nextgen-passing"
  | "nextgen-rushing"
  | "trenches-qb"
  | "trenches-coverage"
  | "combine"
  | "qbr"
  | "qbr-consensus"
  | "edge"
  | "injuries"
  | "market"
  | "dfs";

/**
 * One DataTable's worth of fully-serializable data + presentation meta. The
 * non-serializable parts (columns, accessors, tones) are resolved on the client
 * from `kind` (+ `enumOptions` / `variant`).
 */
export interface SectionData {
  /** Stable key (also React key). */
  readonly id: string;
  /** Which client column set + accessors to use. */
  readonly kind: SectionKind;
  /** Serializable knob for kinds with variants (combine year, edge/market tone). */
  readonly variant?: "with-year" | "buy" | "sell";
  /** Section eyebrow (small mono kicker). */
  readonly eyebrow?: string;
  /** Section heading. */
  readonly title: string;
  /** One-line "what this is" blurb under the heading. */
  readonly blurb?: string;
  /** A small note rendered under the table (serializable string). */
  readonly footnote?: string;
  /** The rows to render (plain, serializable objects from the loader). */
  readonly rows: ReadonlyArray<unknown>;
  /** Serializable enum-filter options; the accessor is bound on the client. */
  readonly enumOptions?: ReadonlyArray<EnumOption>;
  /** Show the rank "#" column. */
  readonly showRank?: boolean;
  /** Min table width to keep numerics from crushing. */
  readonly minWidth?: number;
  /** Empty-state copy. */
  readonly emptyTitle?: string;
  readonly emptyHint?: string;
}

// ── NGS recent-form rows (season + 4-week trailing, fully serializable) ───────
//
// The NextGen leader sections stay season-aggregate; these augmented rows JOIN
// the player's 4-week trailing aggregate (recent form) and the weekly tracking
// series onto the existing season line BY playerId. New columns render a
// trailing value, a Δ (trailing minus season) DivergingBar, and a Sparkline of
// the real weekly series. Every added field is real nflverse data — when a
// player has no trailing row or a metric is blank for the season, the value is
// `null` and the client shows an honest dash / omits the spark line. No season
// column is dropped; the recent-form columns are additive.

/** A NextGen receiving leader line + its recent-form join. */
export interface NgsReceivingFormRow extends NgsReceivingLine {
  /** Trailing 4-week separation mean (null when no recent weeks). */
  readonly trailingSeparation: number | null;
  /** Trailing minus season separation (recent-form delta). */
  readonly separationDelta: number | null;
  /** Trailing 4-week YAC-over-expected mean. */
  readonly trailingYacAboveExpectation: number | null;
  /** Weeks counted in the trailing window (0 when none). */
  readonly trailingWeeks: number;
  /** Real per-week separation series (oldest→newest) for the spark line. */
  readonly separationSeries: readonly number[];
}

/** A NextGen passing leader line + its recent-form join. */
export interface NgsPassingFormRow extends NgsPassingLine {
  readonly trailingCpoe: number | null;
  readonly cpoeDelta: number | null;
  readonly trailingPasserRating: number | null;
  readonly trailingWeeks: number;
  /** Real per-week CPOE series (oldest→newest) for the spark line. */
  readonly cpoeSeries: readonly number[];
}

/** A NextGen rushing leader line + its recent-form join. */
export interface NgsRushingFormRow extends NgsRushingLine {
  readonly trailingRyoePerAtt: number | null;
  readonly ryoeDelta: number | null;
  readonly trailingWeeks: number;
  /** Real per-week RYOE/att series (oldest→newest) for the spark line. */
  readonly ryoeSeries: readonly number[];
}

/** What a view's load() resolves to (fully serializable). */
export interface ViewResult {
  readonly status: "live" | "source-error";
  /** Honest reason when status === "source-error". */
  readonly error?: ReactNode;
  /** Short source-window summary for the hero (e.g. "Season 2024, week 12"). */
  readonly windowLabel?: string;
  /** Source attribution ids. */
  readonly sourceIds: readonly string[];
  /** One DataTable per section. */
  readonly sections: readonly SectionData[];
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
  /** JSON export href (kept from each old page's hero). */
  readonly jsonHref: string;
  /** Resolve the view's data + presentation. */
  readonly load: () => Promise<ViewResult>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const POSITIONS: readonly SkillPosition[] = ["RB", "WR", "TE"];
const POSITION_LABEL: Record<SkillPosition, string> = {
  RB: "Running backs",
  WR: "Wide receivers",
  TE: "Tight ends",
};
const POS_OPTIONS: ReadonlyArray<EnumOption> = POSITIONS.map((p) => ({ value: p, label: p }));

/** Build distinct, sorted enum options from a row list (e.g. positions present). */
function distinctOptions<Row>(
  rows: readonly Row[],
  accessor: (row: Row) => string,
): ReadonlyArray<EnumOption> {
  const set = new Set<string>();
  for (const r of rows) {
    const v = accessor(r);
    if (v) set.add(v);
  }
  return Array.from(set)
    .sort((a, b) => a.localeCompare(b))
    .map((v) => ({ value: v, label: v }));
}

/** Round to `digits`, passing null through (so a missing metric stays a dash). */
function roundOrNull(value: number | null, digits = 2): number | null {
  if (value === null) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Build a playerId→trailing-row map for an O(1) join onto the season leaders. */
function byPlayerId<T extends { playerId: string }>(rows: readonly T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const r of rows) if (r.playerId) map.set(r.playerId, r);
  return map;
}

/**
 * Group played-week rows by playerId so the leader join can pull the real
 * weekly tracking series for a spark line. Weekly rows already arrive sorted by
 * player then week; we keep that order (oldest→newest).
 */
function weeklySeriesByPlayer<T extends { playerId: string }>(
  weekly: readonly T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of weekly) {
    if (!r.playerId) continue;
    const list = map.get(r.playerId) ?? [];
    list.push(r);
    map.set(r.playerId, list);
  }
  return map;
}

// ── PRODUCTION ────────────────────────────────────────────────────────────────

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

  const sections: SectionData[] = [
    {
      id: "leaders",
      kind: "production-leaders",
      eyebrow: "Season leaders",
      title: "Who is producing, who is heating up",
      blurb: `The season's top scorers${lab.throughWeek ? ` through ${lab.throughWeek} weeks` : ""}, with how each one is trending lately. Filter by position.`,
      footnote: "What already happened on the field, not a projection.",
      rows: allLeaders,
      enumOptions: POS_OPTIONS,
      showRank: true,
      minWidth: 1180,
    },
  ];

  for (const position of POSITIONS) {
    sections.push({
      id: `defense-${position}`,
      kind: "production-defense",
      eyebrow: `Defense vs ${position}`,
      title: `Softest matchups for ${POSITION_LABEL[position].toLowerCase()}`,
      blurb: "Defenses ranked by what they give up to the position. Rank 1 has been the easiest to score on.",
      rows: lab.defenseVsPosition[position],
      minWidth: 360,
      emptyTitle: "Not enough games in the source window.",
    });
  }

  return {
    status: "live",
    windowLabel: `Season ${lab.season}${lab.throughWeek ? `, through week ${lab.throughWeek}` : ""}`,
    sourceIds: ["nflverse"],
    sections,
  };
}

// ── SNAPS ─────────────────────────────────────────────────────────────────────

const DEFENSE_GROUPS: readonly DefensePositionGroup[] = ["DL", "LB", "CB", "S"];
const DEFENSE_GROUP_OPTIONS: ReadonlyArray<EnumOption> = [
  { value: "DL", label: "DL" },
  { value: "LB", label: "LB" },
  { value: "CB", label: "CB" },
  { value: "S", label: "S" },
];

async function loadSnapsView(): Promise<ViewResult> {
  const snap = await loadNflverseSnapShare();
  if (snap.status === "source-error") {
    return { status: "source-error", error: snap.error ?? snap.blockReason ?? "UNKNOWN", sourceIds: ["nflverse"], sections: [] };
  }
  const rows: SnapShareRow[] = [...snap.leaders.RB, ...snap.leaders.WR, ...snap.leaders.TE];
  // Flatten the four defensive groups into one list; the client's DL/LB/CB/S
  // enum filter slices it, and each group stays internally ranked by snap share.
  const defenseRows: DefenseSnapShareRow[] = DEFENSE_GROUPS.flatMap((g) => snap.defense[g]);

  const sections: SectionData[] = [
    {
      id: "snaps",
      kind: "snaps",
      eyebrow: "Snap share · offense",
      title: "Who's on the field the most",
      blurb: "The skill players logging the most of their team's offensive snaps this season. Filter by position.",
      footnote: "Playing time tends to move before the box score does.",
      rows,
      enumOptions: POS_OPTIONS,
      showRank: true,
      minWidth: 560,
    },
  ];

  if (defenseRows.length > 0) {
    sections.push({
      id: "snaps-defense",
      kind: "snaps-defense",
      eyebrow: "Snap share · defense",
      title: "Who never leaves the field on defense",
      blurb: "Defenders logging the most of their team's defensive snaps this season. Filter by group (DL / LB / CB / S).",
      footnote: "The workload signal behind tackle and pressure opportunity for IDP.",
      rows: defenseRows,
      enumOptions: DEFENSE_GROUP_OPTIONS,
      showRank: true,
      minWidth: 620,
    });
  }

  return {
    status: "live",
    windowLabel: `Season ${snap.season}`,
    sourceIds: ["nflverse"],
    sections,
  };
}

// ── OPPORTUNITY ───────────────────────────────────────────────────────────────

// ── EFFICIENCY (opportunity + backfield efficiency + edge signals) ────────────
//
// Presentation merge of three former tabs into one "where the looks go vs what
// they're worth" surface. Receiving opportunity is the spine; backfield
// efficiency and the buy-low / sell-high edge signals stack beneath it. Each
// uses its EXISTING loader and section kind — no data logic changes. The spine
// (receiving opportunity) gates the view; the trailing sections are additive and
// are quietly skipped if their feed is unavailable, so a partial source outage
// still renders the rest.

async function loadEfficiencyView(): Promise<ViewResult> {
  const [o, ru, edge] = await Promise.all([
    loadReceivingOpportunity(),
    loadRushingEfficiency(),
    loadNflverseEdgeSignals(),
  ]);
  if (o.status === "source-error") {
    return { status: "source-error", error: o.error ?? o.note ?? "UNKNOWN", sourceIds: ["nflverse"], sections: [] };
  }
  const sections: SectionData[] = [
    {
      id: "receiving",
      kind: "opportunity-receiving",
      eyebrow: `Opportunity leaders${o.throughWeek ? ` · ${o.season} through week ${o.throughWeek}` : ""}`,
      title: "Who's earning the looks",
      blurb: o.note,
      footnote: "Where the looks are going, and where that hasn't shown up in the box score yet.",
      rows: o.rows,
      enumOptions: distinctOptions(o.rows, (r) => r.position),
      showRank: true,
      minWidth: 920,
    },
  ];
  if (ru.status !== "source-error" && ru.rows.length > 0) {
    sections.push({
      id: "rushing",
      kind: "opportunity-rushing",
      eyebrow: `Backfield · efficiency vs volume${ru.season ? ` · ${ru.season}` : ""}`,
      title: "Backfields run on volume and efficiency",
      blurb: ru.note,
      footnote: "Volume is the floor; efficiency is the swing. Hover a row for the read.",
      rows: ru.rows,
      showRank: true,
      minWidth: 820,
    });
  }
  if (edge.status !== "source-error") {
    sections.push(
      {
        id: "buy-low",
        kind: "edge",
        variant: "buy",
        eyebrow: "Buy-low · regression up",
        title: "Doing the work, waiting on the payoff",
        blurb: "Players whose underlying play is running ahead of their box score, ranked by the size of the gap.",
        rows: edge.buyLow,
        showRank: true,
        minWidth: 940,
        emptyTitle: "No players cleared the gap threshold in the source window.",
      },
      {
        id: "sell-high",
        kind: "edge",
        variant: "sell",
        eyebrow: "Sell-high · regression risk",
        title: "Scoring more than the play backs up",
        blurb: "Players whose box score is outrunning their underlying play, ranked by the widest gap.",
        rows: edge.sellHigh,
        showRank: true,
        minWidth: 940,
        emptyTitle: "No players cleared the gap threshold in the source window.",
      },
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

/**
 * Join each season leader line to its 4-week trailing aggregate (recent form)
 * and real weekly tracking series. Δ = trailing minus season (positive = heating
 * up). When a player has no recent weeks (or the metric is blank for the season)
 * the trailing/Δ value is null and the series is empty — honest dash / no spark.
 */
function buildNgsReceivingForm(ngs: Awaited<ReturnType<typeof loadNflverseNextGenStats>>): NgsReceivingFormRow[] {
  const trailing = byPlayerId<NgsTrailingReceiving>(ngs.receivingTrailing);
  const series = weeklySeriesByPlayer<NgsReceivingWeek>(ngs.receivingWeekly);
  return ngs.receiving.map((line): NgsReceivingFormRow => {
    const t = trailing.get(line.playerId) ?? null;
    const ts = t?.avgSeparation ?? null;
    return {
      ...line,
      trailingSeparation: ts,
      separationDelta: roundOrNull(ts === null ? null : ts - line.avgSeparation),
      trailingYacAboveExpectation: t?.avgYacAboveExpectation ?? null,
      trailingWeeks: t?.weeks ?? 0,
      separationSeries: (series.get(line.playerId) ?? []).map((w) => w.avgSeparation),
    };
  });
}

function buildNgsPassingForm(ngs: Awaited<ReturnType<typeof loadNflverseNextGenStats>>): NgsPassingFormRow[] {
  const trailing = byPlayerId<NgsTrailingPassing>(ngs.passingTrailing);
  const series = weeklySeriesByPlayer<NgsPassingWeek>(ngs.passingWeekly);
  return ngs.passing.map((line): NgsPassingFormRow => {
    const t = trailing.get(line.playerId) ?? null;
    const tc = t?.cpoe ?? null;
    return {
      ...line,
      trailingCpoe: tc,
      cpoeDelta: roundOrNull(tc === null ? null : tc - line.cpoe),
      trailingPasserRating: t?.passerRating ?? null,
      trailingWeeks: t?.weeks ?? 0,
      cpoeSeries: (series.get(line.playerId) ?? []).map((w) => w.cpoe),
    };
  });
}

function buildNgsRushingForm(ngs: Awaited<ReturnType<typeof loadNflverseNextGenStats>>): NgsRushingFormRow[] {
  const trailing = byPlayerId<NgsTrailingRushing>(ngs.rushingTrailing);
  const series = weeklySeriesByPlayer<NgsRushingWeek>(ngs.rushingWeekly);
  return ngs.rushing.map((line): NgsRushingFormRow => {
    const t = trailing.get(line.playerId) ?? null;
    const tr = t?.ryoePerAtt ?? null;
    return {
      ...line,
      trailingRyoePerAtt: tr,
      ryoeDelta: roundOrNull(tr === null ? null : tr - line.ryoePerAtt),
      trailingWeeks: t?.weeks ?? 0,
      ryoeSeries: (series.get(line.playerId) ?? []).map((w) => w.ryoePerAtt),
    };
  });
}

/**
 * A schedule-context section (rest / roof / surface / weather + closing line for
 * the current scheduled week). Rendered as a compact header table above the NGS
 * leaders. Returns null when the schedule feed is unavailable so the rest of the
 * view still renders — schedule context is a header chip, not the view's spine.
 */
async function scheduleContextSection(): Promise<{ section: SectionData; windowLabel: string } | null> {
  const sc = await loadScheduleContext();
  if (sc.status === "source-error" || sc.rows.length === 0) return null;
  return {
    windowLabel: `season ${sc.season}, week ${sc.week}`,
    section: {
      id: "schedule-context",
      kind: "schedule-context",
      eyebrow: `Game context · season ${sc.season} week ${sc.week}`,
      title: "Rest, roof & surface this week",
      blurb:
        "The conditions behind this week's slate — rest, roof, surface, and kickoff weather. Anything not yet posted shows a dash, never a guess.",
      footnote: sc.note,
      rows: sc.rows,
      minWidth: 760,
      emptyTitle: "No scheduled games in the source window.",
    },
  };
}

// The Next Gen view also folds in the quarterback standings: ESPN's Total QBR
// and the two-read accuracy consensus. They live here because QBR + CPOE are the
// season-long companion to the play-by-play passing tracking above — one tab for
// "what the box score leaves out about the quarterback." Both QBR sections are
// additive and skipped if their feed is down, so the tracking spine still
// renders.
async function loadNextGenView(): Promise<ViewResult> {
  const [ngs, schedule, q, consensus] = await Promise.all([
    loadNflverseNextGenStats(),
    scheduleContextSection(),
    loadNflverseQbr(),
    loadQbConsensus(),
  ]);
  if (ngs.status === "source-error") {
    return { status: "source-error", error: ngs.error ?? ngs.blockReason ?? "UNKNOWN", sourceIds: ["nflverse"], sections: [] };
  }
  const formNote = `Recent form covers the last ${ngs.trailingWindow} played weeks. The trend line is week by week; a player with no recent weeks shows a dash.`;
  const sections: SectionData[] = [];
  if (schedule) sections.push(schedule.section);
  sections.push(
    {
      id: "receiving",
      kind: "nextgen-receiving",
      eyebrow: "Receiving · tracking",
      title: "Who gets open",
      blurb: "How much space receivers create and what they do with it, plus how that's trended over the last four weeks.",
      footnote: formNote,
      rows: buildNgsReceivingForm(ngs),
      showRank: true,
      minWidth: 1100,
    },
    {
      id: "passing",
      kind: "nextgen-passing",
      eyebrow: "Passing · tracking",
      title: "Who throws the most accurate ball",
      blurb: "Quarterbacks ranked by accuracy beyond what the throw asked for, plus how that's trended over the last four weeks.",
      footnote: formNote,
      rows: buildNgsPassingForm(ngs),
      showRank: true,
      minWidth: 1120,
    },
    {
      id: "rushing",
      kind: "nextgen-rushing",
      eyebrow: "Rushing · tracking",
      title: "Who beats the blocking",
      blurb: "Backs ranked by the yards they add beyond what the blocking gave them, plus how that's trended over the last four weeks.",
      footnote: formNote,
      rows: buildNgsRushingForm(ngs),
      showRank: true,
      minWidth: 980,
    },
  );
  if (q.status !== "source-error") {
    sections.push({
      id: "qbr",
      kind: "qbr",
      eyebrow: "QBR leaders",
      title: `The ${q.season} quarterback standings`,
      blurb: "ESPN's Total QBR across the season, on a 0-100 scale.",
      footnote: "Weighted by how much each play mattered; minimum six games.",
      rows: q.leaders,
      showRank: true,
      minWidth: 640,
    });
    if (consensus.status !== "source-error" && consensus.rows.length > 0) {
      sections.push({
        id: "consensus",
        kind: "qbr-consensus",
        eyebrow: "Consensus",
        title: "Where two takes on the QB agree",
        blurb: consensus.note,
        footnote: `Two independent reads, shown side by side. We flag where they disagree rather than blending them.${!consensus.sources.ngs ? " One feed is unavailable right now, so some rows are single-source." : ""}`,
        rows: consensus.rows,
        showRank: true,
        minWidth: 720,
      });
    }
  }
  return {
    status: "live",
    windowLabel: `Season ${ngs.season}${schedule ? ` · context ${schedule.windowLabel}` : ""}`,
    sourceIds: ["nflverse"],
    sections,
  };
}

// ── TRENCHES (pressure & coverage) ────────────────────────────────────────────

// Trenches now also carries the athletic measurables: the latest combine class
// and the fastest forties on record fold in as two additive sections beneath
// pressure & coverage — same loader, same kinds, just stacked here so "the line
// of scrimmage and the traits behind it" live on one tab. Combine sections are
// skipped if the feed is down so the pressure/coverage spine still renders.
async function loadTrenchesView(): Promise<ViewResult> {
  const [pc, combine] = await Promise.all([loadNflversePressureCoverage(), loadNflverseCombine()]);
  if (pc.status === "source-error") {
    return { status: "source-error", error: pc.error ?? pc.blockReason ?? "UNKNOWN", sourceIds: ["nflverse"], sections: [] };
  }
  const sections: SectionData[] = [
    {
      id: "qb-pressure",
      kind: "trenches-qb",
      eyebrow: "QB pressure",
      title: "Most pressured passers",
      blurb: "Quarterbacks who take the most heat, and how it shows up in bad throws and sacks.",
      rows: pc.qbPressure,
      showRank: true,
      minWidth: 640,
      emptyTitle: "No qualifying quarterbacks in the source window.",
    },
    {
      id: "coverage",
      kind: "trenches-coverage",
      eyebrow: "Coverage",
      title: "Lockdown defenders",
      blurb: "The defenders quarterbacks have the least success throwing at this season.",
      rows: pc.coverage,
      showRank: true,
      minWidth: 720,
      emptyTitle: "No qualifying defenders in the source window.",
    },
  ];
  if (combine.status !== "source-error") {
    sections.push(
      {
        id: "combine-latest",
        kind: "combine",
        eyebrow: `Athletic testing · class of ${combine.latestYear ?? ""}`,
        title: "Fastest 40 in the latest class",
        blurb: "The latest draft class's combine testing — speed, jumps, and agility. Traits to weigh against the tape, not proof on their own.",
        rows: combine.latestClass,
        showRank: true,
        minWidth: 760,
        emptyTitle: "No measurements in the source window.",
      },
      {
        id: "combine-fastest",
        kind: "combine",
        variant: "with-year",
        eyebrow: "Athletic testing · all-time",
        title: "Fastest 40 on record",
        blurb: "The fastest forties on record, across every class.",
        rows: combine.fastestForty,
        showRank: true,
        minWidth: 820,
        emptyTitle: "No measurements in the source window.",
      },
    );
  }
  return {
    status: "live",
    windowLabel: `Season ${pc.season}${combine.status !== "source-error" && combine.latestYear ? ` · combine ${combine.latestYear}` : ""}`,
    sourceIds: ["nflverse"],
    sections,
  };
}

// ── AVAILABILITY (injuries + market) ──────────────────────────────────────────
//
// Presentation merge of the former Injuries and Market tabs into one "who's
// actually going to play, and what the crowd already knows" surface. The
// official injury report is the spine and gates the view; Sleeper's live add /
// drop activity stacks beneath it as additive sections, skipped if Sleeper is
// unavailable so the injury report still renders. Both feeds (nflverse +
// sleeper) are attributed.
async function loadAvailabilityView(): Promise<ViewResult> {
  const [report, signal] = await Promise.all([loadNflverseInjuryReport(), loadSleeperMarketSignal()]);
  if (report.status === "source-error") {
    return { status: "source-error", error: report.error ?? report.note ?? "UNKNOWN", sourceIds: ["nflverse"], sections: [] };
  }
  const marketLive = signal.status !== "source-error";
  const sections: SectionData[] = [
    {
      id: "injuries",
      kind: "injuries",
      eyebrow: "Injury report · latest week",
      title: "Designations & practice status",
      blurb: `Out ${report.counts.out} · Doubtful ${report.counts.doubtful} · Questionable ${report.counts.questionable}. Straight from the official team reports. Filter by position.`,
      footnote: report.note,
      rows: report.rows,
      enumOptions: distinctOptions(report.rows, (r) => r.position),
      minWidth: 820,
      emptyTitle: "No designations in the latest week of the source file.",
    },
  ];
  if (marketLive) {
    sections.push(
      {
        id: "adds",
        kind: "market",
        variant: "buy",
        eyebrow: "Market · rising, most added",
        title: "What the crowd is buying",
        blurb: `The players fantasy managers are adding most across Sleeper in the last ${signal.lookbackHours} hours.`,
        footnote: signal.note,
        rows: signal.adds,
        enumOptions: distinctOptions(signal.adds, (r) => r.position),
        showRank: true,
        minWidth: 520,
        emptyTitle: "No trending players in this window.",
      },
      {
        id: "drops",
        kind: "market",
        variant: "sell",
        eyebrow: "Market · falling, most dropped",
        title: "What the crowd is selling",
        blurb: `The players fantasy managers are dropping most across Sleeper in the last ${signal.lookbackHours} hours.`,
        rows: signal.drops,
        enumOptions: distinctOptions(signal.drops, (r) => r.position),
        showRank: true,
        minWidth: 520,
        emptyTitle: "No trending players in this window.",
      },
    );
  }
  return {
    status: "live",
    windowLabel: `Season ${report.season}, week ${report.week ?? "N/A"}${marketLive ? ` · market last ${signal.lookbackHours}h` : ""}`,
    sourceIds: marketLive ? ["nflverse", "sleeper"] : ["nflverse"],
    sections,
  };
}

// ── DFS ───────────────────────────────────────────────────────────────────────

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
      {
        id: "salaries",
        kind: "dfs",
        eyebrow: `DraftKings salaries · ${dfs.date}`,
        title: `Cross-checked across ${connectedLive} feed${connectedLive === 1 ? "" : "s"}`,
        blurb: "DraftKings salaries from licensed providers, cross-checked across feeds. We flag any salary the feeds don't agree on. Filter by position.",
        footnote: `${dfs.discrepancies} disagreement${dfs.discrepancies === 1 ? "" : "s"} flagged across ${dfs.rows.length} salaries.`,
        rows: dfs.rows,
        enumOptions: distinctOptions(dfs.rows, (r) => r.position),
        showRank: true,
        minWidth: 640,
      },
    ],
  };
}

// ── Registry ──────────────────────────────────────────────────────────────────
//
// PLAYER_VIEWS is the PRIMARY tab row (the page maps it 1:1 into <Tabs/>). The
// Player Lab was consolidated from ~11 board tabs down to six here:
//   Production · Snaps · Next Gen · Trenches · Efficiency · Availability
// Three former tabs were folded into these as additive sections (QBR → Next Gen,
// Combine → Trenches, Edge + backfield efficiency → Efficiency), and two became
// the merged Efficiency / Availability views. DFS is DEMOTED to SECONDARY_VIEWS:
// it is intentionally absent from the tab row, but stays reachable at
// /players?view=dfs so existing deep links keep working. Old, now-merged slugs
// alias forward via VIEW_ALIASES so no /players?view= deep link 404s.

export const PLAYER_VIEWS: readonly PlayerView[] = [
  {
    slug: "production",
    label: "Production",
    tabTooltip: "Season leaders, last-5 form, defense ranks",
    eyebrow: "Production Lab",
    title: "Who's producing, and who's heating up.",
    description:
      "The season's leaders, how each one is trending, and which defenses have been easiest to score on. Real results, not forecasts.",
    jsonHref: "/api/nflverse/player-lab",
    load: loadProductionView,
  },
  {
    slug: "snaps",
    label: "Snaps",
    tabTooltip: "Offensive & defensive snap-share leaders",
    eyebrow: "Snap share",
    title: "Who's on the field the most.",
    description:
      "How much of his team's snaps each player is logging this season, on both sides of the ball. Playing time tends to move before the box score does.",
    jsonHref: "/api/nflverse/snap-share",
    load: loadSnapsView,
  },
  {
    slug: "nextgen",
    label: "Next Gen",
    tabTooltip: "Separation, CPOE, RYOE + recent form, plus QBR standings",
    eyebrow: "Next Gen Stats",
    title: "What the box score leaves out.",
    description:
      "Player-tracking data: how open receivers get, how accurate quarterbacks throw, and how much backs add beyond their blocking — each with a four-week trend — plus the season's QBR standings and a second accuracy read on the quarterback.",
    jsonHref: "/api/nflverse/next-gen-stats",
    load: loadNextGenView,
  },
  {
    slug: "trenches",
    label: "Trenches",
    tabTooltip: "Pressure & coverage (PFR charting) + combine measurables",
    eyebrow: "Pressure, Coverage & Traits",
    title: "The trenches, charted.",
    description:
      "Which quarterbacks take the most heat and how they hold up under it, which coverage defenders quarterbacks can't beat, and the athletic testing behind the prospects.",
    jsonHref: "/api/nflverse/pressure-coverage",
    load: loadTrenchesView,
  },
  {
    slug: "efficiency",
    label: "Efficiency",
    tabTooltip: "Opportunity, backfield efficiency & buy-low / sell-high edges",
    eyebrow: "Opportunity & Edge",
    title: "Where the looks go, and what they're worth.",
    description:
      "Where the targets and carries are going, how efficiently each player turns them into yards, and where underlying play and box score have drifted far enough apart to be a buy or a sell.",
    jsonHref: "/api/intelligence/receiving-opportunity",
    load: loadEfficiencyView,
  },
  {
    slug: "availability",
    label: "Availability",
    tabTooltip: "Official injury designations + live fantasy adds / drops",
    eyebrow: "Injuries & Market",
    title: "Who's actually available — and what the crowd already knows.",
    description:
      "The official team injury designations and practice status for the latest week, set next to where fantasy managers are piling in and bailing out across Sleeper. Availability swings outcomes; the market is a fast tell on breaking news.",
    jsonHref: "/api/nflverse/injuries",
    load: loadAvailabilityView,
  },
];

/**
 * Secondary views — resolvable via /players?view=<slug> but deliberately kept
 * OFF the primary tab row. DFS lives here: a niche, licensed-feed-gated surface
 * that doesn't earn a permanent tab, but whose deep links must still resolve.
 */
export const SECONDARY_VIEWS: readonly PlayerView[] = [
  {
    slug: "dfs",
    label: "DFS",
    tabTooltip: "DraftKings salaries (licensed, cross-checked)",
    eyebrow: "DFS salaries",
    title: "DraftKings salaries, licensed and cross-checked.",
    description:
      "DraftKings salaries from licensed providers, pulled from multiple feeds and cross-checked. Trusted when the feeds agree, flagged when they don't.",
    jsonHref: "/api/dfs/salaries",
    load: loadDfsView,
  },
];

/**
 * Forward-aliases for the former (pre-consolidation) slugs so existing
 * /players?view=<old> deep links don't 404. Each maps to the merged view that
 * now carries its sections.
 */
export const VIEW_ALIASES: Readonly<Record<string, string>> = {
  opportunity: "efficiency", // receiving opportunity → Efficiency spine
  edge: "efficiency", // buy-low / sell-high → Efficiency section
  combine: "trenches", // athletic measurables → Trenches section
  qbr: "nextgen", // QBR standings + consensus → Next Gen section
  injuries: "availability", // injury report → Availability spine
  market: "availability", // Sleeper adds / drops → Availability section
};

export const DEFAULT_VIEW_SLUG = "production";

/** Every resolvable view (primary tab row + secondary). */
const ALL_VIEWS: readonly PlayerView[] = [...PLAYER_VIEWS, ...SECONDARY_VIEWS];

/**
 * Resolve a slug (possibly from searchParams) to a registered view. Tries the
 * primary + secondary registries directly, then forwards a former/merged slug
 * through VIEW_ALIASES, and finally falls back to the default view.
 */
export function resolvePlayerView(slug: string | undefined): PlayerView {
  const aliased = slug && VIEW_ALIASES[slug] ? VIEW_ALIASES[slug] : slug;
  const found =
    ALL_VIEWS.find((v) => v.slug === aliased) ??
    ALL_VIEWS.find((v) => v.slug === DEFAULT_VIEW_SLUG) ??
    PLAYER_VIEWS[0];
  if (!found) {
    throw new Error("PLAYER_VIEWS registry is empty");
  }
  return found;
}
