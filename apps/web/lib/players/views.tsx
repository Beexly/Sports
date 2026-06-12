import type { ReactNode } from "react";
import type { MetricTerm } from "@/components/ui/metric-explainer";

// ── Loaders (reused verbatim — consolidation is presentation only) ────────────
import {
  loadNflversePlayerLab,
  type PlayerSeasonLine,
  type SkillPosition,
} from "@/lib/nflverse/player-lab";
import { loadNflverseSnapShare, type SnapShareRow } from "@/lib/nflverse/snap-share";
import { loadReceivingOpportunity } from "@/lib/intelligence/receiving-opportunity";
import { loadRushingEfficiency } from "@/lib/intelligence/rushing-efficiency";
import { loadNflverseNextGenStats } from "@/lib/nflverse/next-gen-stats";
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
 * Collapses the ~11 separate /players/* board pages into one tabbed lab. Each
 * view reuses its EXISTING loader (no loader rewrites) and declares, as DATA,
 * exactly how to present it: the hero copy, the "how to read it" explainer, and
 * one or more table SECTIONS (every metric and column ported faithfully, no data
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
  /**
   * Data freshness for the rows-freshness stamp — the loader's own
   * `generatedAt` ISO timestamp. Never fabricated: omit when the loaded data
   * carries no timestamp and the stamp shows the row count only.
   */
  readonly asOf?: string;
  /** Optional source label for the stamp (e.g. "nflverse"). */
  readonly sourceLabel?: string;
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
  /** Optional "how to read it" explainer (hero aside). */
  readonly explainer?: ReadonlyArray<MetricTerm>;
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
      blurb: `Ranked by PPR per game${lab.throughWeek ? ` over the first ${lab.throughWeek} weeks` : ""}. 5g is last-5 form; Δ is recent form minus season pace. Filter by position.`,
      footnote: "Settled, historical PPR — not a projection. Boom ≥ 20 PPR, bust ≤ 10 PPR per game.",
      rows: allLeaders,
      asOf: lab.generatedAt,
      sourceLabel: "nflverse",
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
      blurb: "PPR opportunity allowed per game, ranked across qualifying defenses. Rank 1 allows the most — what actually happened on the field.",
      rows: lab.defenseVsPosition[position],
      asOf: lab.generatedAt,
      sourceLabel: "nflverse",
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
      {
        id: "snaps",
        kind: "snaps",
        eyebrow: "Snap share",
        title: "Workload before box score",
        blurb: "Share of team offensive snaps a player is on the field for, averaged across the season. Filter by position.",
        footnote: "Snap share is the cleanest leading indicator of opportunity — it moves before targets and production do.",
        rows,
        asOf: snap.generatedAt,
        sourceLabel: "nflverse",
        enumOptions: POS_OPTIONS,
        showRank: true,
        minWidth: 560,
      },
    ],
  };
}

// ── OPPORTUNITY ───────────────────────────────────────────────────────────────

async function loadOpportunityView(): Promise<ViewResult> {
  const [o, ru] = await Promise.all([loadReceivingOpportunity(), loadRushingEfficiency()]);
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
      footnote: "WOPR = 1.5·target share + 0.7·air-yards share (mean per game). The read compares opportunity vs production percentiles — weight this, not the box score.",
      rows: o.rows,
      asOf: o.generatedAt,
      sourceLabel: "nflverse",
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
      title: "RB value is a different equation",
      blurb: ru.note,
      footnote: "Volume is the floor (sticky, coach-driven); RYOE is the regression-prone ceiling. Hover a row for the read.",
      rows: ru.rows,
      asOf: ru.generatedAt,
      sourceLabel: "nflverse",
      showRank: true,
      minWidth: 820,
    });
  }
  return {
    status: "live",
    windowLabel: `Season ${o.season}${o.throughWeek ? ` through week ${o.throughWeek}` : ""}`,
    sourceIds: ["nflverse"],
    sections,
  };
}

// ── NEXT GEN ──────────────────────────────────────────────────────────────────

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
      {
        id: "receiving",
        kind: "nextgen-receiving",
        eyebrow: "Receiving · tracking",
        title: "Who gets open",
        blurb: "Separation (space at the catch point), cushion (pre-snap space), and YAC over expected.",
        rows: ngs.receiving,
        asOf: ngs.generatedAt,
        sourceLabel: "nflverse",
        showRank: true,
        minWidth: 860,
      },
      {
        id: "passing",
        kind: "nextgen-passing",
        eyebrow: "Passing · tracking",
        title: "Who is accurate beyond expectation",
        blurb: "CPOE (completion % over expected, given throw difficulty), time-to-throw, aggressiveness.",
        rows: ngs.passing,
        asOf: ngs.generatedAt,
        sourceLabel: "nflverse",
        showRank: true,
        minWidth: 860,
      },
      {
        id: "rushing",
        kind: "nextgen-rushing",
        eyebrow: "Rushing · tracking",
        title: "Who beats the blocking",
        blurb: "Rush yards over expected per attempt — production above what the blocking and box gave them.",
        rows: ngs.rushing,
        asOf: ngs.generatedAt,
        sourceLabel: "nflverse",
        showRank: true,
        minWidth: 760,
      },
    ],
  };
}

// ── TRENCHES (pressure & coverage) ────────────────────────────────────────────

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
      {
        id: "qb-pressure",
        kind: "trenches-qb",
        eyebrow: "QB pressure",
        title: "Most pressured passers",
        blurb: "Share of dropbacks pressured (season mean). Bad-throw% and sacks show how it cashes out.",
        rows: pc.qbPressure,
        asOf: pc.generatedAt,
        sourceLabel: "nflverse",
        showRank: true,
        minWidth: 640,
        emptyTitle: "No qualifying quarterbacks in the source window.",
      },
      {
        id: "coverage",
        kind: "trenches-coverage",
        eyebrow: "Coverage",
        title: "Lockdown defenders",
        blurb: "Lowest passer rating allowed in coverage (target-weighted), min 25 targets. Who you can't throw at.",
        rows: pc.coverage,
        asOf: pc.generatedAt,
        sourceLabel: "nflverse",
        showRank: true,
        minWidth: 720,
        emptyTitle: "No qualifying defenders in the source window.",
      },
    ],
  };
}

// ── COMBINE ───────────────────────────────────────────────────────────────────

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
      {
        id: "latest",
        kind: "combine",
        eyebrow: `Class of ${c.latestYear ?? ""}`,
        title: "Fastest 40 in the latest class",
        blurb: "Athletic-trait scouting priors — forty, vertical, broad jump, three-cone, shuttle. Filter by position.",
        rows: c.latestClass,
        asOf: c.generatedAt,
        sourceLabel: "nflverse",
        showRank: true,
        minWidth: 760,
        emptyTitle: "No measurements in the source window.",
      },
      {
        id: "fastest",
        kind: "combine",
        variant: "with-year",
        eyebrow: "All-time",
        title: "Fastest 40 on record",
        blurb: "The fastest forties in the source file, all classes.",
        rows: c.fastestForty,
        asOf: c.generatedAt,
        sourceLabel: "nflverse",
        showRank: true,
        minWidth: 820,
        emptyTitle: "No measurements in the source window.",
      },
    ],
  };
}

// ── QBR ───────────────────────────────────────────────────────────────────────

async function loadQbrView(): Promise<ViewResult> {
  const [q, consensus] = await Promise.all([loadNflverseQbr(), loadQbConsensus()]);
  if (q.status === "source-error") {
    return { status: "source-error", error: q.error ?? q.blockReason ?? "UNKNOWN", sourceIds: ["nflverse"], sections: [] };
  }
  const sections: SectionData[] = [
    {
      id: "qbr",
      kind: "qbr",
      eyebrow: "QBR leaders",
      title: `Play-weighted, ${q.season} regular season`,
      blurb: "ESPN Total QBR (0-100), play-weighted across the season. One independent QB-quality estimate.",
      footnote: "QBR is play-weighted across the season; min 6 games. EPA = total expected points added.",
      rows: q.leaders,
      asOf: q.generatedAt,
      sourceLabel: "nflverse",
      showRank: true,
      minWidth: 640,
    },
  ];
  if (consensus.status !== "source-error" && consensus.rows.length > 0) {
    sections.push({
      id: "consensus",
      kind: "qbr-consensus",
      eyebrow: "Consensus · two independent lenses",
      title: "Where the estimators agree — and where they don't",
      blurb: consensus.note,
      footnote: `Two independent estimators, each as a within-pool percentile. We surface disagreement (results vs accuracy) instead of averaging it into false precision.${!consensus.sources.ngs ? " CPOE feed unavailable — single-source reads only." : ""}`,
      rows: consensus.rows,
      asOf: consensus.generatedAt,
      sourceLabel: "nflverse",
      showRank: true,
      minWidth: 720,
    });
  }
  return { status: "live", windowLabel: `Season ${q.season}`, sourceIds: ["nflverse"], sections };
}

// ── EDGE ──────────────────────────────────────────────────────────────────────

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
      {
        id: "buy-low",
        kind: "edge",
        variant: "buy",
        eyebrow: "Buy-low · regression up",
        title: "Underlying ahead of the box score",
        blurb: "Tracking signal runs hotter than production. Ranked by the gap (underlying z minus production z).",
        rows: edge.buyLow,
        asOf: edge.generatedAt,
        sourceLabel: "nflverse",
        showRank: true,
        minWidth: 940,
        emptyTitle: "No players cleared the gap threshold in the source window.",
      },
      {
        id: "sell-high",
        kind: "edge",
        variant: "sell",
        eyebrow: "Sell-high · regression risk",
        title: "Production ahead of the underlying",
        blurb: "Output is outrunning the tracking signal. Ranked by the most negative gap.",
        rows: edge.sellHigh,
        asOf: edge.generatedAt,
        sourceLabel: "nflverse",
        showRank: true,
        minWidth: 940,
        emptyTitle: "No players cleared the gap threshold in the source window.",
      },
    ],
  };
}

// ── INJURIES ──────────────────────────────────────────────────────────────────

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
      {
        id: "injuries",
        kind: "injuries",
        eyebrow: "Latest week",
        title: "Designations & practice status",
        blurb: `Out ${report.counts.out} · Doubtful ${report.counts.doubtful} · Questionable ${report.counts.questionable}. Official team-submitted designations. Filter by position.`,
        footnote: report.note,
        rows: report.rows,
        asOf: report.generatedAt,
        sourceLabel: "nflverse",
        enumOptions: distinctOptions(report.rows, (r) => r.position),
        minWidth: 820,
        emptyTitle: "No designations in the latest week of the source file.",
      },
    ],
  };
}

// ── MARKET (Sleeper) ──────────────────────────────────────────────────────────

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
      {
        id: "adds",
        kind: "market",
        variant: "buy",
        eyebrow: "Rising · most added",
        title: "Buying",
        blurb: `Live add activity across Sleeper leagues over the last ${signal.lookbackHours} hours.`,
        footnote: signal.note,
        rows: signal.adds,
        asOf: signal.generatedAt,
        sourceLabel: "Sleeper",
        enumOptions: distinctOptions(signal.adds, (r) => r.position),
        showRank: true,
        minWidth: 520,
        emptyTitle: "No trending players in this window.",
      },
      {
        id: "drops",
        kind: "market",
        variant: "sell",
        eyebrow: "Falling · most dropped",
        title: "Selling",
        blurb: `Live drop activity across Sleeper leagues over the last ${signal.lookbackHours} hours.`,
        rows: signal.drops,
        asOf: signal.generatedAt,
        sourceLabel: "Sleeper",
        enumOptions: distinctOptions(signal.drops, (r) => r.position),
        showRank: true,
        minWidth: 520,
        emptyTitle: "No trending players in this window.",
      },
    ],
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
        title: `Reconciled across ${connectedLive} feed${connectedLive === 1 ? "" : "s"}`,
        blurb: "DK salaries via licensed DFS providers, reconciled across feeds. A salary is trusted when feeds agree; disagreement is flagged. Filter by position.",
        footnote: `${dfs.discrepancies} disagreement${dfs.discrepancies === 1 ? "" : "s"} flagged across ${dfs.rows.length} salaries.`,
        rows: dfs.rows,
        asOf: dfs.generatedAt,
        sourceLabel: "licensed DFS feeds",
        enumOptions: distinctOptions(dfs.rows, (r) => r.position),
        showRank: true,
        minWidth: 640,
      },
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
