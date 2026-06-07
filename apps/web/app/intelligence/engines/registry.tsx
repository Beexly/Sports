import type { ReactNode } from "react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { KpiCard } from "@/components/ui/kpi-card";
import { type MetricTerm } from "@/components/ui/metric-explainer";
import { SourceError } from "@/components/ui/source-error";
import {
  formatSigned,
  hitRateClass,
  hitRateTone,
  liftClass,
  liftTone,
  signedClass,
  toneClass,
  type SignalTone,
} from "@/lib/intelligence/colors";

// Loaders — reused UNCHANGED from each former board page.
import { loadPlayerModel, type ModelPosition, type PlayerProfile, type ProcessSignal } from "@/lib/intelligence/player-model";
import { loadExpectedPoints, type ExpectedPointsRow } from "@/lib/intelligence/expected-points";
import { loadQbForward, type QbForwardRow } from "@/lib/intelligence/qb-forward";
import { loadRushingContact, type RushingContactRow } from "@/lib/intelligence/rushing-contact";
import { loadRouteRate, type RouteRateRow, type RouteRateSignal } from "@/lib/intelligence/route-rate";
import { loadScoringZone, type ScoringZoneRow, type ScoringZoneSignal } from "@/lib/intelligence/scoring-zone";
import { loadTeamEnvironment, type TeamEnvironmentRow } from "@/lib/intelligence/team-environment";
import { loadOpportunityTransfer, type OpportunityTransferRow, type TransferConfidence } from "@/lib/intelligence/opportunity-transfer";
import { loadClvBacktest, type ClvBacktestRow } from "@/lib/intelligence/clv-calibration";
import { loadPredictiveness, type PredictivenessSplit } from "@/lib/intelligence/predictiveness";
import { loadSleeperTrending, type TrendingRow } from "@/lib/integrations/sleeper";

/**
 * Intelligence Engine Registry — the single backbone for the /intelligence/engines
 * browser. Each entry owns: discoverability metadata (group/label/title/description),
 * the loader (reused verbatim from the old standalone board), and a render(data)
 * that paints the engine on the LIGHT paper data surface using the shared kit
 * (DataTable / KpiCard / MetricExplainer / SourceError + lib/intelligence/colors).
 *
 * Most engines are a DataTable + a MetricExplainer "how to read it". A few carry
 * special shapes that we preserve rather than crush into one table:
 *   - proof           → 3 KPI cards + up to 3 stacked backtest tables
 *   - player-model    → buy/sell move cards + per-position split tables
 *   - waiver-trends   → two side-by-side momentum tables (adds / drops)
 *   - clv             → game-by-game self-grade table with a graded-count header
 *
 * Each entry pairs its own loader and renderer through `engine()`, so the union of
 * loader return types never has to collapse into one shape — every render() sees
 * exactly the type its loader returns.
 */

// ── helpers ──────────────────────────────────────────────────────────────────

function Note({ children }: { children: ReactNode }): JSX.Element {
  return <p className="px-1 font-mono text-xs leading-5 text-ink-2">{children}</p>;
}

function SubHead({ kicker, title, note }: { kicker: string; title: string; note?: ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-orbital-cyan-on-light">{kicker}</p>
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      {note ? <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-1">{note}</p> : null}
    </div>
  );
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
function pctNullable(v: number | null): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}
function corr(v: number | null): string {
  return v == null ? "—" : v.toFixed(2);
}

// ── Engine entry type ────────────────────────────────────────────────────────

export type EngineGroup =
  | "Cross-position core"
  | "Quarterback"
  | "Running back"
  | "Receiver"
  | "Team & market"
  | "Proof & calibration";

export interface EngineEntry {
  readonly slug: string;
  readonly group: EngineGroup;
  /** Short tab label. */
  readonly label: string;
  /** Page eyebrow / hero title. */
  readonly title: string;
  /** Hero description. */
  readonly description: ReactNode;
  /** API endpoint (JSON export link). */
  readonly api: string;
  /** Data source ids for attribution. */
  readonly sourceIds: readonly string[];
  /** Per-engine "How we read it" term/definition pairs (rendered via MetricExplainer). */
  readonly explainer?: readonly MetricTerm[];
  /** Load the engine data (reused loader, unchanged). */
  readonly load: () => Promise<unknown>;
  /** Render the loaded data on the paper surface. */
  readonly render: (data: unknown) => ReactNode;
}

/** Tie a loader and its strongly-typed renderer together into one entry. */
function engine<T>(spec: {
  slug: string;
  group: EngineGroup;
  label: string;
  title: string;
  description: ReactNode;
  api: string;
  sourceIds: readonly string[];
  explainer?: readonly MetricTerm[];
  load: () => Promise<T>;
  render: (data: T) => ReactNode;
}): EngineEntry {
  return {
    slug: spec.slug,
    group: spec.group,
    label: spec.label,
    title: spec.title,
    description: spec.description,
    api: spec.api,
    sourceIds: spec.sourceIds,
    explainer: spec.explainer,
    load: spec.load as () => Promise<unknown>,
    render: (data: unknown) => spec.render(data as T),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER MODEL — buy/sell move cards + per-position split tables (special)
// ─────────────────────────────────────────────────────────────────────────────

const PLAYER_POSITIONS: readonly ModelPosition[] = ["QB", "RB", "WR", "TE"];
const PROCESS_SIGNAL_LABEL: Record<ProcessSignal, string> = {
  "buy-low": "Buy-low",
  "sell-high": "Sell-high",
  "in-line": "In-line",
};
function processTone(s: ProcessSignal): SignalTone {
  if (s === "buy-low") return "good";
  if (s === "sell-high") return "bad";
  return "neutral";
}
function gradeTone(g: number): SignalTone {
  if (g >= 70) return "good";
  if (g >= 45) return "neutral";
  return "neutral";
}

function MovesCard({ title, tone, rows }: { title: string; tone: SignalTone; rows: readonly PlayerProfile[] }): JSX.Element {
  return (
    <section className="rounded-ds-md border border-paper-border bg-paper-raised p-5">
      <p className={`font-mono text-xs font-semibold uppercase tracking-[0.16em] ${toneClass(tone)}`}>{title}</p>
      <div className="mt-3 space-y-2.5">
        {rows.length === 0 ? (
          <p className="text-sm text-ink-2">None flagged this week.</p>
        ) : (
          rows.map((p) => (
            <div key={p.playerId} className="border-l border-paper-border pl-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{p.name}</span>
                <span className="font-mono text-xs text-ink-2">
                  {p.position} · {p.team} · grade {p.processGrade}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-5 text-ink-1">{p.note}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function playerColumns(pos: ModelPosition): Column<PlayerProfile>[] {
  const isQb = pos === "QB";
  const cols: Column<PlayerProfile>[] = [
    { key: "name", label: "Player", render: (r) => <span className="font-semibold text-ink">{r.name}</span> },
    { key: "team", label: "Tm", render: (r) => <span className="font-mono text-ink-1">{r.team}</span> },
    {
      key: "processGrade",
      label: "Process",
      align: "right",
      numeric: true,
      tooltip: "position-aware composite of the predictive anchors",
      render: (r) => <span className={`font-semibold ${toneClass(gradeTone(r.processGrade))}`}>{r.processGrade}</span>,
    },
    {
      key: "productionPct",
      label: "Prod %ile",
      align: "right",
      numeric: true,
      tooltip: "PPR production percentile in position",
      render: (r) => r.productionPct,
    },
    {
      key: "epaPerPlay",
      label: "EPA/play",
      align: "right",
      numeric: true,
      tooltip: "combined EPA per play",
      sortValue: (r) => r.epaPerPlay,
      render: (r) => <span className={signedClass(r.epaPerPlay)}>{formatSigned(r.epaPerPlay, 2)}</span>,
    },
  ];
  if (isQb) {
    cols.push(
      { key: "dakota", label: "DAKOTA", align: "right", numeric: true, tooltip: "DAKOTA (EPA+CPOE composite)", sortValue: (r) => r.dakota, render: (r) => (r.dakota == null ? "—" : r.dakota.toFixed(2)) },
      { key: "pacr", label: "PACR", align: "right", numeric: true, tooltip: "passing air conversion ratio", sortValue: (r) => r.pacr, render: (r) => (r.pacr == null ? "—" : r.pacr.toFixed(2)) },
    );
  } else {
    cols.push(
      { key: "wopr", label: "WOPR", align: "right", numeric: true, tooltip: "weighted opportunity rating", sortValue: (r) => r.wopr, render: (r) => (r.wopr == null ? "—" : r.wopr.toFixed(2)) },
      { key: "touches", label: "Touch", align: "right", numeric: true, tooltip: "touches: carries + targets", render: (r) => r.touches },
    );
  }
  cols.push({
    key: "signal",
    label: "The read",
    tooltip: "process vs production",
    sortValue: (r) => r.signal,
    render: (r) => <span className={`font-mono text-xs ${toneClass(processTone(r.signal))}`}>{PROCESS_SIGNAL_LABEL[r.signal]}</span>,
  });
  return cols;
}

const PLAYER_MODEL_ENGINE = engine({
  slug: "player-model",
  group: "Cross-position core",
  label: "Player Intelligence",
  title: "The process grade behind every player.",
  description: (
    <>
      One canonical profile per player, mined from the full nflverse advanced field set — EPA efficiency, opportunity
      (WOPR, target share), and volume — combined into a position-aware <em>process grade</em>. We compare it to actual
      production and surface the gap: where the inputs say more is coming (<span className="text-emerald-700 font-semibold">buy-low</span>)
      or running hot (<span className="text-rose-700 font-semibold">sell-high</span>). The data layer that drives the tools. Not a pick.
    </>
  ),
  api: "/api/intelligence/player-model",
  sourceIds: ["nflverse"],
  explainer: [
    {
      term: "Process grade — the composite",
      definition: (
        <>
          The within-position percentile of each predictive anchor, averaged. QBs are graded on EPA/play + DAKOTA +
          PACR; receivers on WOPR + target share + EPA; backs on volume + EPA. Anchors persist and forecast;
          production is the noisy output. The gap is the edge.
        </>
      ),
    },
    {
      term: "Buy-low — inputs say more is coming",
      definition: (
        <>
          When the <span className="text-emerald-700 font-semibold">process</span> grade sits well above the actual
          production percentile, the opportunity says the points are coming. Buy-low before it corrects.
        </>
      ),
    },
    {
      term: "Sell-high — running hot",
      definition: (
        <>
          When <span className="text-rose-700 font-semibold">production</span> outruns the process grade, the player
          is converting above his usage. Sell-high before it regresses. In-line means the points are earned by the
          opportunity. Not a pick.
        </>
      ),
    },
  ],
  load: loadPlayerModel,
  render: (model) => {
    if (model.status === "source-error") {
      return <SourceError reason={model.error ?? "UNKNOWN"} />;
    }
    return (
      <div className="flex flex-col gap-6">
        <Note>
          {model.season}
          {model.throughWeek ? ` · through week ${model.throughWeek}` : ""} · {model.profiles.length} profiles
        </Note>
        <div className="grid gap-4 lg:grid-cols-2">
          <MovesCard title="This week's buy-low adds" tone="good" rows={model.profiles.filter((p) => p.signal === "buy-low").slice(0, 8)} />
          <MovesCard title="Sell-high / move off" tone="bad" rows={model.profiles.filter((p) => p.signal === "sell-high").slice(0, 6)} />
        </div>
        {PLAYER_POSITIONS.map((pos) => {
          const rows = model.profiles.filter((p) => p.position === pos);
          if (rows.length === 0) return null;
          return (
            <div key={pos} className="flex flex-col gap-3">
              <SubHead kicker={pos} title={`${pos} process grades`} />
              <DataTable
                rows={rows}
                columns={playerColumns(pos)}
                rowKey={(r) => r.playerId}
                showRank
                searchable
                searchAccessor={(r) => `${r.name} ${r.team}`}
                rowTitle={(r) => r.note}
                rowTone={(r) => processTone(r.signal)}
                initialSort={{ key: "processGrade", dir: "desc" }}
                minWidth={820}
              />
            </div>
          );
        })}
        <Note>{model.note}</Note>
      </div>
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPECTED POINTS (xFP)
// ─────────────────────────────────────────────────────────────────────────────

function xfpReadLabel(r: ExpectedPointsRow): string {
  return r.signal === "buy-low" ? "Buy-low" : r.signal === "sell-high" ? "Sell-high" : "In-line";
}
function xfpReadTone(r: ExpectedPointsRow): SignalTone {
  if (r.signal === "buy-low") return "good";
  if (r.signal === "sell-high") return "bad";
  return "neutral";
}

const EXPECTED_POINTS_ENGINE = engine({
  slug: "expected-points",
  group: "Cross-position core",
  label: "Expected Points (xFP)",
  title: "Expected Fantasy Points — the opportunity backbone",
  description: (
    <>
      What a player&apos;s real usage <em>should</em> have produced — expected points from the carries, targets, air
      yards, and field position he actually saw, independent of whether the ball bounced his way.
    </>
  ),
  api: "/api/intelligence/expected-points",
  sourceIds: ["nflverse"],
  explainer: [
    {
      term: "xFP — expected, not actual",
      definition:
        "ffverse's ff_opportunity models the fantasy points a usage profile should yield. Expected points persist far better than actual points, which swing on touchdown luck.",
    },
    {
      term: "Buy-low — expected outruns actual",
      definition: (
        <>
          When the <span className="text-emerald-700 font-semibold">expected</span> percentile sits well above the
          actual percentile, the usage says the production is coming. Buy-low before it corrects.
        </>
      ),
    },
    {
      term: "Sell-high — actual outruns expected",
      definition: (
        <>
          When <span className="text-rose-700 font-semibold">actual</span> outruns expected, the player is running hot
          on conversion luck. Sell-high before it regresses. In-line means the points are earned by the opportunity.
        </>
      ),
    },
  ],
  load: loadExpectedPoints,
  render: (f) => {
    if (f.status === "source-error") {
      return <SourceError reason={f.error ?? "UNKNOWN"} />;
    }
    const columns: Column<ExpectedPointsRow>[] = [
      { key: "name", label: "Player", render: (r) => <span className="font-semibold text-ink">{r.name}</span> },
      { key: "team", label: "Tm", render: (r) => <span className="font-mono text-ink-1">{r.team}</span> },
      { key: "position", label: "Pos", render: (r) => <span className="font-mono text-ink-1">{r.position}</span> },
      { key: "games", label: "G", align: "right", numeric: true, tooltip: "games", render: (r) => r.games },
      { key: "xfpTotal", label: "xFP", align: "right", numeric: true, tooltip: "expected PPR points, total", render: (r) => r.xfpTotal.toFixed(1) },
      { key: "xfpPerGame", label: "xFP/g", align: "right", numeric: true, tooltip: "expected PPR points per game", render: (r) => r.xfpPerGame.toFixed(1) },
      { key: "actualTotal", label: "Actual", align: "right", numeric: true, tooltip: "actual PPR points, total", render: (r) => r.actualTotal.toFixed(1) },
      {
        key: "diff",
        label: "Diff",
        align: "right",
        numeric: true,
        tooltip: "actual minus expected (luck/efficiency)",
        sortValue: (r) => r.diff,
        // actual over expected = hot (bad / sell), under = cold/coming (good / buy)
        render: (r) => <span className={signedClass(r.diff)}>{formatSigned(r.diff, 1)}</span>,
      },
      { key: "xfpPct", label: "xFP%", align: "right", numeric: true, tooltip: "expected-points percentile within position", render: (r) => r.xfpPct.toFixed(0) },
      { key: "prodPct", label: "Prod%", align: "right", numeric: true, tooltip: "actual-points percentile within position", render: (r) => r.prodPct.toFixed(0) },
      {
        key: "signal",
        label: "The read",
        sortValue: (r) => r.signal,
        render: (r) => <span className={`font-mono text-xs ${toneClass(xfpReadTone(r))}`}>{xfpReadLabel(r)}</span>,
      },
    ];
    return (
      <div className="flex flex-col gap-4">
        <SubHead
          kicker={`Expected-points leaders${f.throughWeek ? ` · ${f.season} through week ${f.throughWeek}` : f.season ? ` · ${f.season}` : ""}`}
          title="What the usage should have produced"
          note={f.note}
        />
        <DataTable
          rows={f.rows}
          columns={columns}
          rowKey={(r) => r.playerId}
          showRank
          searchable
          searchAccessor={(r) => `${r.name} ${r.team}`}
          enumFilter={{ label: "Pos", options: [{ value: "QB", label: "QB" }, { value: "RB", label: "RB" }, { value: "WR", label: "WR" }, { value: "TE", label: "TE" }], accessor: (r) => r.position }}
          rowTitle={(r) => r.note}
          rowTone={(r) => xfpReadTone(r)}
          initialSort={{ key: "xfpTotal", dir: "desc" }}
          minWidth={920}
        />
        <Note>{f.note}</Note>
      </div>
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QB FORWARD PRIOR
// ─────────────────────────────────────────────────────────────────────────────

const QB_AGREE_THRESHOLD = 0.8;
function qbReadLabel(r: QbForwardRow): string {
  return r.agreement >= QB_AGREE_THRESHOLD ? "Agree" : "Diverge";
}
function qbReadTone(r: QbForwardRow): SignalTone {
  if (r.agreement >= QB_AGREE_THRESHOLD) return "good";
  if (r.dakotaPct < 50 && r.anyaPct < 50) return "bad";
  return "neutral";
}

const QB_FORWARD_ENGINE = engine({
  slug: "qb-forward",
  group: "Quarterback",
  label: "QB Forward Prior",
  title: "QB Forward Prior — DAKOTA & ANY/A",
  description: (
    <>
      The most forward-looking QB reads: DAKOTA (EPA+CPOE composite) and Adjusted Net Yards per Attempt, with the
      agreement between them surfaced — not averaged away.
    </>
  ),
  api: "/api/intelligence/qb-forward",
  sourceIds: ["nflverse"],
  explainer: [
    {
      term: "DAKOTA — EPA + CPOE composite",
      definition:
        "nflverse's adjusted EPA + accuracy composite, tuned to predict next-year adjusted EPA/play. The closest public “forward” QB number.",
    },
    {
      term: "ANY/A — adjusted net yards per attempt",
      definition:
        "The classic efficiency yardstick, built transparently from raw box columns. A genuinely different forward lens than the composite.",
    },
    {
      term: "The edge — agreement, not an average",
      definition: (
        <>
          When both priors land in the same tier we read a <span className="text-orbital-cyan-on-light">clean</span>{" "}
          forward signal; when they diverge it&apos;s a second look. We surface the disagreement, we don&apos;t average
          it away.
        </>
      ),
    },
  ],
  load: loadQbForward,
  render: (f) => {
    if (f.status === "source-error") {
      return <SourceError reason={f.error ?? "UNKNOWN"} />;
    }
    const columns: Column<QbForwardRow>[] = [
      { key: "name", label: "Player", render: (r) => <span className="font-semibold text-ink">{r.name}</span> },
      { key: "team", label: "Tm", render: (r) => <span className="font-mono text-ink-1">{r.team}</span> },
      { key: "games", label: "G", align: "right", numeric: true, tooltip: "games", render: (r) => r.games },
      { key: "attempts", label: "Att", align: "right", numeric: true, tooltip: "pass attempts", render: (r) => r.attempts },
      { key: "dakota", label: "DAKOTA", align: "right", numeric: true, tooltip: "DAKOTA EPA + CPOE composite", render: (r) => r.dakota.toFixed(3) },
      { key: "anyA", label: "ANY/A", align: "right", numeric: true, tooltip: "adjusted net yards per attempt", render: (r) => r.anyA.toFixed(2) },
      { key: "dakotaPct", label: "DAK%", align: "right", numeric: true, tooltip: "DAKOTA percentile within QB pool", render: (r) => r.dakotaPct.toFixed(0) },
      { key: "anyaPct", label: "ANY/A%", align: "right", numeric: true, tooltip: "ANY/A percentile within QB pool", render: (r) => r.anyaPct.toFixed(0) },
      { key: "forwardGrade", label: "Grade", align: "right", numeric: true, tooltip: "mean of the two percentiles", render: (r) => r.forwardGrade },
      { key: "agreement", label: "Agmt", align: "right", numeric: true, tooltip: "how closely the two priors agree", render: (r) => r.agreement.toFixed(2) },
      {
        key: "read",
        label: "The read",
        sortable: false,
        render: (r) => <span className={`font-mono text-xs ${toneClass(qbReadTone(r))}`}>{qbReadLabel(r)}</span>,
      },
    ];
    return (
      <div className="flex flex-col gap-4">
        <SubHead
          kicker={`Forward prior leaders${f.throughWeek ? ` · ${f.season} through week ${f.throughWeek}` : f.season ? ` · ${f.season}` : ""}`}
          title="Who the forward lenses like"
          note={f.note}
        />
        <DataTable
          rows={f.rows}
          columns={columns}
          rowKey={(r) => r.playerId}
          showRank
          searchable
          searchAccessor={(r) => `${r.name} ${r.team}`}
          rowTitle={(r) => r.note}
          rowTone={(r) => qbReadTone(r)}
          initialSort={{ key: "forwardGrade", dir: "desc" }}
          minWidth={920}
        />
        <Note>{f.note}</Note>
      </div>
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// RUSHING CONTACT
// ─────────────────────────────────────────────────────────────────────────────

const TALENT_PCT = 70;
function rcReadLabel(r: RushingContactRow): string {
  if (r.yacPerAtt > r.ybcPerAtt) return "Wins after contact";
  if (r.ybcPerAtt > r.yacPerAtt * 1.5) return "Line-aided";
  return "Balanced";
}
function rcReadTone(r: RushingContactRow): SignalTone {
  if (r.yacPct >= TALENT_PCT) return "good";
  if (r.ybcPerAtt > r.yacPerAtt * 1.5) return "neutral";
  return "neutral";
}
function rcYacTone(r: RushingContactRow): SignalTone {
  if (r.yacPct >= TALENT_PCT) return "good";
  if (r.yacPct < 40) return "bad";
  return "neutral";
}

const RUSHING_CONTACT_ENGINE = engine({
  slug: "rushing-contact",
  group: "Running back",
  label: "Rushing Contact",
  title: "Rushing Contact — YAC vs YBC per carry",
  description: (
    <>
      PFR advanced charting splits each carry into yards <em>after</em> contact — the back&apos;s own elusiveness and
      power — and yards <em>before</em> contact, the line and scheme term. An independent estimator to triangulate
      against Next Gen RYOE.
    </>
  ),
  api: "/api/intelligence/rushing-contact",
  sourceIds: ["nflverse"],
  explainer: [
    {
      term: "YAC/att — the back's own talent",
      definition: (
        <>
          Yards after contact per carry isolates elusiveness and power. It&apos;s blocking-independent, so a{" "}
          <span className="text-orbital-cyan-on-light">high</span> figure is the back doing the work himself.
        </>
      ),
    },
    {
      term: "YBC/att — the line and scheme",
      definition:
        "Yards before contact per carry is the room the offensive line and design hand him. High YBC with modest YAC reads as a line-aided profile.",
    },
    {
      term: "The divergence — who's driving the yards",
      definition: (
        <>
          Elite <span className="text-orbital-cyan-on-light">YAC</span> behind thin YBC is a back winning on his own —
          a second, independent estimator to triangulate against Next Gen RYOE. We surface the split, we don&apos;t
          average it away.
        </>
      ),
    },
  ],
  load: loadRushingContact,
  render: (f) => {
    if (f.status === "source-error") {
      return <SourceError reason={f.error ?? "UNKNOWN"} />;
    }
    const columns: Column<RushingContactRow>[] = [
      { key: "name", label: "Player", render: (r) => <span className="font-semibold text-ink">{r.name}</span> },
      { key: "team", label: "Tm", render: (r) => <span className="font-mono text-ink-1">{r.team}</span> },
      { key: "attempts", label: "Att", align: "right", numeric: true, tooltip: "rushing attempts", render: (r) => r.attempts },
      {
        key: "yacPerAtt",
        label: "YAC/att",
        align: "right",
        numeric: true,
        tooltip: "yards after contact per attempt — the back's own talent",
        render: (r) => <span className={toneClass(rcYacTone(r))}>{r.yacPerAtt.toFixed(2)}</span>,
      },
      { key: "ybcPerAtt", label: "YBC/att", align: "right", numeric: true, tooltip: "yards before contact per attempt — the line/scheme", render: (r) => r.ybcPerAtt.toFixed(2) },
      { key: "brokenTackles", label: "Brk", align: "right", numeric: true, tooltip: "broken tackles, total", render: (r) => r.brokenTackles },
      { key: "brokenPerAtt", label: "Brk/att", align: "right", numeric: true, tooltip: "broken tackles per attempt", render: (r) => r.brokenPerAtt.toFixed(3) },
      { key: "yacPct", label: "YAC%", align: "right", numeric: true, tooltip: "YAC/att percentile within the qualified pool", render: (r) => r.yacPct.toFixed(0) },
      {
        key: "read",
        label: "The read",
        sortable: false,
        render: (r) => <span className={`font-mono text-xs ${toneClass(rcReadTone(r))}`}>{rcReadLabel(r)}</span>,
      },
    ];
    return (
      <div className="flex flex-col gap-4">
        <SubHead
          kicker={`Yards after contact leaders${f.season ? ` · ${f.season}` : ""}`}
          title="Who creates yards on their own"
          note={f.note}
        />
        <DataTable
          rows={f.rows}
          columns={columns}
          rowKey={(r) => r.playerId}
          showRank
          searchable
          searchAccessor={(r) => `${r.name} ${r.team}`}
          rowTone={(r) => rcReadTone(r)}
          initialSort={{ key: "yacPerAtt", dir: "desc" }}
          minWidth={820}
        />
        <Note>{f.note}</Note>
      </div>
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE RATE (TPRR)
// ─────────────────────────────────────────────────────────────────────────────

const ROUTE_SIGNAL_LABEL: Record<RouteRateSignal, string> = { breakout: "Breakout", fade: "Fade", steady: "Steady" };
function routeTone(s: RouteRateSignal): SignalTone {
  if (s === "breakout") return "good";
  if (s === "fade") return "bad";
  return "neutral";
}

const ROUTE_RATE_ENGINE = engine({
  slug: "route-rate",
  group: "Receiver",
  label: "Route Rate (TPRR)",
  title: "Route Rate — targets per route run (proxy)",
  description: (
    <>
      A snaps&times;dropbacks proxy for targets per route run — high TPRR on low routes is the breakout signal; empty
      volume is the fade. Labelled a proxy (true routes are PFF-gated).
    </>
  ),
  api: "/api/intelligence/route-rate",
  sourceIds: ["nflverse"],
  explainer: [
    {
      term: "TPRR — targets per route run (proxy)",
      definition:
        "A snaps × dropbacks proxy for how often a receiver is targeted on the routes he runs. Labelled a proxy — true routes are PFF-gated.",
    },
    {
      term: "Breakout — high TPRR on low routes",
      definition: (
        <>
          A <span className="text-orbital-cyan-on-light">high</span> target rate on a small route sample is the
          breakout signal: efficient when used, with room for the volume to follow.
        </>
      ),
    },
    {
      term: "Fade — empty volume",
      definition:
        "Plenty of routes but a thin target rate is the fade — on the field without earning looks. Steady sits in between.",
    },
  ],
  load: loadRouteRate,
  render: (rr) => {
    if (rr.status === "source-error") {
      return <SourceError reason={rr.error ?? "UNKNOWN"} />;
    }
    const columns: Column<RouteRateRow>[] = [
      { key: "name", label: "Player", render: (r) => <span className="font-semibold text-ink">{r.name}</span> },
      { key: "team", label: "Tm", render: (r) => <span className="font-mono text-ink-1">{r.team}</span> },
      { key: "position", label: "Pos", render: (r) => <span className="font-mono text-ink-1">{r.position}</span> },
      { key: "routes", label: "Routes", align: "right", numeric: true, tooltip: "approximate routes run (proxy)", render: (r) => r.routes },
      { key: "targets", label: "Tgt", align: "right", numeric: true, render: (r) => r.targets },
      { key: "tprr", label: "TPRR", align: "right", numeric: true, tooltip: "targets per route run (proxy)", render: (r) => r.tprr.toFixed(3) },
      { key: "tprrPct", label: "TPRR%", align: "right", numeric: true, tooltip: "within-pool TPRR percentile", render: (r) => r.tprrPct },
      {
        key: "signal",
        label: "The read",
        sortValue: (r) => r.signal,
        render: (r) => <span className={`font-mono text-xs ${toneClass(routeTone(r.signal))}`}>{ROUTE_SIGNAL_LABEL[r.signal]}</span>,
      },
    ];
    return (
      <div className="flex flex-col gap-4">
        <SubHead
          kicker={`Route-rate leaders${rr.throughWeek ? ` · ${rr.season} through week ${rr.throughWeek}` : ""}`}
          title="Targets per route run (proxy)"
          note={rr.note}
        />
        <DataTable
          rows={rr.rows}
          columns={columns}
          rowKey={(r) => r.playerId}
          showRank
          searchable
          searchAccessor={(r) => `${r.name} ${r.team}`}
          enumFilter={{ label: "Pos", options: [{ value: "WR", label: "WR" }, { value: "TE", label: "TE" }, { value: "RB", label: "RB" }], accessor: (r) => r.position }}
          rowTitle={(r) => r.note}
          rowTone={(r) => routeTone(r.signal)}
          initialSort={{ key: "tprr", dir: "desc" }}
          minWidth={820}
        />
        <Note>{rr.note}</Note>
      </div>
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// SCORING-ZONE EQUITY
// ─────────────────────────────────────────────────────────────────────────────

const SCORING_SIGNAL_LABEL: Record<ScoringZoneSignal, string> = { buy: "Buy", sell: "Sell", "in-line": "In-line" };
function scoringTone(s: ScoringZoneSignal): SignalTone {
  if (s === "buy") return "good";
  if (s === "sell") return "bad";
  return "neutral";
}

const SCORING_ZONE_ENGINE = engine({
  slug: "scoring-zone",
  group: "Running back",
  label: "Scoring-Zone Equity",
  title: "Scoring-Zone Equity — TD equity from opportunity",
  description: (
    <>
      Red-zone and goal-line opportunity share, with the TD rate regressed toward the positional mean — TD equity from
      sticky opportunity, not noisy past touchdowns.
    </>
  ),
  api: "/api/intelligence/scoring-zone",
  sourceIds: ["nflverse"],
  explainer: [
    {
      term: "RZ share — sticky opportunity",
      definition:
        "The player's share of his team's red-zone and goal-line carries and targets. Scoring-zone opportunity is sticky and predictive; past touchdowns are noisy.",
    },
    {
      term: "xTD rate — regressed to the mean",
      definition:
        "TD rate per scoring-zone opportunity, regressed toward the positional mean — TD equity from the looks he owns, not the touchdowns that already bounced his way.",
    },
    {
      term: "Buy / Sell — equity vs results",
      definition: (
        <>
          Heavy <span className="text-emerald-700 font-semibold">scoring-zone share</span> with light actual TDs is a
          buy; a hot TD rate above the opportunity is a{" "}
          <span className="text-rose-700 font-semibold">sell</span>. In-line means the scores match the looks.
        </>
      ),
    },
  ],
  load: loadScoringZone,
  render: (z) => {
    if (z.status === "source-error") {
      return <SourceError reason={z.error ?? "UNKNOWN"} />;
    }
    const columns: Column<ScoringZoneRow>[] = [
      { key: "name", label: "Player", render: (r) => <span className="font-semibold text-ink">{r.name}</span> },
      { key: "team", label: "Tm", render: (r) => <span className="font-mono text-ink-1">{r.team}</span> },
      { key: "position", label: "Pos", render: (r) => <span className="font-mono text-ink-1">{r.position}</span> },
      { key: "rzCarries", label: "RZ Car", align: "right", numeric: true, tooltip: "red-zone carries (inside the 20)", render: (r) => r.rzCarries },
      { key: "rzTargets", label: "RZ Tgt", align: "right", numeric: true, tooltip: "red-zone targets (inside the 20)", render: (r) => r.rzTargets },
      { key: "inside5", label: "In-5", align: "right", numeric: true, tooltip: "carries + targets inside the 5", render: (r) => r.inside5 },
      { key: "rzShare", label: "RZ Share", align: "right", numeric: true, tooltip: "player's share of his team's scoring-zone opportunities", sortValue: (r) => r.rzShare, render: (r) => pct(r.rzShare) },
      { key: "rzTds", label: "RZ TD", align: "right", numeric: true, tooltip: "scoring-zone touchdowns", render: (r) => r.rzTds },
      { key: "tdRate", label: "TD Rate", align: "right", numeric: true, tooltip: "raw TD per scoring-zone opportunity", sortValue: (r) => r.tdRate, render: (r) => pct(r.tdRate) },
      { key: "expectedTdRate", label: "xTD Rate", align: "right", numeric: true, tooltip: "TD rate regressed toward the positional mean", sortValue: (r) => r.expectedTdRate, render: (r) => pct(r.expectedTdRate) },
      {
        key: "signal",
        label: "The read",
        sortValue: (r) => r.signal,
        render: (r) => <span className={`font-mono text-xs ${toneClass(scoringTone(r.signal))}`}>{SCORING_SIGNAL_LABEL[r.signal]}</span>,
      },
    ];
    return (
      <div className="flex flex-col gap-4">
        <SubHead
          kicker={`Scoring-zone leaders${z.throughWeek ? ` · ${z.season} through week ${z.throughWeek}` : ""}`}
          title="Who owns the looks inside the 20"
          note={z.note}
        />
        <DataTable
          rows={z.rows}
          columns={columns}
          rowKey={(r) => r.playerId}
          showRank
          searchable
          searchAccessor={(r) => `${r.name} ${r.team}`}
          enumFilter={{ label: "Pos", options: [{ value: "RB", label: "RB" }, { value: "WR", label: "WR" }, { value: "TE", label: "TE" }], accessor: (r) => r.position }}
          rowTitle={(r) => r.note}
          rowTone={(r) => scoringTone(r.signal)}
          initialSort={{ key: "rzShare", dir: "desc" }}
          minWidth={960}
        />
        <Note>{z.note}</Note>
      </div>
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// TEAM ENVIRONMENT
// ─────────────────────────────────────────────────────────────────────────────

const TEAM_ENVIRONMENT_ENGINE = engine({
  slug: "team",
  group: "Team & market",
  label: "Team Environment",
  title: "Team Environment — EPA, PROE & pace",
  description: (
    <>
      Neutral-script offensive and defensive EPA per play, success rate, PROE (pass rate over expected), and pace — the
      top-down team prior every player share sits in front of.
    </>
  ),
  api: "/api/intelligence/team-environment",
  sourceIds: ["nflverse"],
  explainer: [
    {
      term: "EPA/play — neutral-script efficiency",
      definition:
        "Offensive and defensive expected points added per play, taken on early downs in neutral game scripts to strip out garbage time and score effects. The cleanest top-down efficiency read.",
    },
    {
      term: "PROE — pass rate over expected",
      definition:
        "How much more (or less) a team passes than the down-distance-score situation expects. Positive PROE is a pass-leaning environment that lifts receivers and the passing game.",
    },
    {
      term: "Pace — the volume multiplier",
      definition:
        "No-huddle rate as a pace proxy. A fast, pass-leaning, efficient offense is the environment every player share sits in front of — buy the offense it points to.",
    },
  ],
  load: loadTeamEnvironment,
  render: (t) => {
    if (t.status === "source-error") {
      return <SourceError reason={t.error ?? "UNKNOWN"} />;
    }
    const columns: Column<TeamEnvironmentRow>[] = [
      { key: "team", label: "Tm", render: (r) => <span className="font-mono font-semibold text-ink">{r.team}</span> },
      { key: "offEpaPerPlay", label: "Off EPA", align: "right", numeric: true, tooltip: "offensive EPA per play (neutral script, early down)", sortValue: (r) => r.offEpaPerPlay, render: (r) => <span className={signedClass(r.offEpaPerPlay)}>{formatSigned(r.offEpaPerPlay, 3)}</span> },
      { key: "offEpaPct", label: "Off%ile", align: "right", numeric: true, tooltip: "within-league offensive EPA percentile", sortValue: (r) => r.offEpaPct, render: (r) => pct(r.offEpaPct) },
      { key: "offSuccessRate", label: "Off SR", align: "right", numeric: true, tooltip: "offensive success rate", sortValue: (r) => r.offSuccessRate, render: (r) => pct(r.offSuccessRate) },
      { key: "defEpaPerPlay", label: "Def EPA", align: "right", numeric: true, tooltip: "defensive EPA per play (lower is better)", sortValue: (r) => r.defEpaPerPlay, render: (r) => <span className={signedClass(-r.defEpaPerPlay)}>{formatSigned(r.defEpaPerPlay, 3)}</span> },
      { key: "defEpaPct", label: "Def%ile", align: "right", numeric: true, tooltip: "within-league defensive EPA percentile (EPA inverted)", sortValue: (r) => r.defEpaPct, render: (r) => pct(r.defEpaPct) },
      { key: "defSuccessRate", label: "Def SR", align: "right", numeric: true, tooltip: "defensive success rate (lower is better)", sortValue: (r) => r.defSuccessRate, render: (r) => pct(r.defSuccessRate) },
      { key: "proe", label: "PROE", align: "right", numeric: true, tooltip: "PROE — pass rate over expected", sortValue: (r) => r.proe, render: (r) => <span className={signedClass(r.proe)}>{formatSigned(r.proe, 1)}%</span> },
      { key: "noHuddleRate", label: "Pace", align: "right", numeric: true, tooltip: "no-huddle rate — pace proxy", sortValue: (r) => r.noHuddleRate, render: (r) => pct(r.noHuddleRate) },
      {
        key: "read",
        label: "The read",
        sortable: false,
        render: (r) => (
          <span className={`font-mono text-xs ${signedClass(r.offEpaPerPlay)}`}>
            {r.offEpaPerPlay > 0 ? "Buy offense" : r.offEpaPerPlay < 0 ? "Fade offense" : "Neutral"}
          </span>
        ),
      },
    ];
    return (
      <div className="flex flex-col gap-4">
        <SubHead
          kicker={`Team scoring environment${t.season ? ` · ${t.season}` : ""}`}
          title="The top-down team prior"
          note={t.note}
        />
        <DataTable
          rows={t.rows}
          columns={columns}
          rowKey={(r) => r.team}
          showRank
          searchable
          searchPlaceholder="Filter teams…"
          searchAccessor={(r) => r.team}
          rowTone={(r) => (r.offEpaPerPlay > 0 ? "good" : r.offEpaPerPlay < 0 ? "bad" : null)}
          initialSort={{ key: "offEpaPerPlay", dir: "desc" }}
          minWidth={920}
        />
        <Note>{t.note}</Note>
      </div>
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// OPPORTUNITY TRANSFER
// ─────────────────────────────────────────────────────────────────────────────

const TRANSFER_CONFIDENCE_LABEL: Record<TransferConfidence, string> = { high: "High", medium: "Medium", low: "Low" };
function transferTone(c: TransferConfidence): SignalTone {
  if (c === "high") return "good";
  if (c === "low") return "bad";
  return "neutral";
}

const OPPORTUNITY_TRANSFER_ENGINE = engine({
  slug: "opportunity-transfer",
  group: "Team & market",
  label: "Opportunity Transfer",
  title: "Opportunity Transfer — who inherits the vacated role",
  description: (
    <>
      When a player is OUT, we quantify the targets and carries his role vacates and rank the most likely beneficiary —
      the waiver predictive core.
    </>
  ),
  api: "/api/intelligence/opportunity-transfer",
  sourceIds: ["nflverse"],
  explainer: [
    {
      term: "Vacated touches — what the role leaves behind",
      definition:
        "When a player is OUT, his trailing per-game targets and carries become available volume. We quantify exactly how much opportunity the role vacates.",
    },
    {
      term: "Beneficiary — who inherits it",
      definition:
        "From the depth chart and trailing usage, the player most likely to absorb the vacated touches — the waiver predictive core, before the box score confirms it.",
    },
    {
      term: "Confidence — how clean the read is",
      definition: (
        <>
          <span className="text-emerald-700 font-semibold">High</span> when the depth chart and usage agree on one
          beneficiary; <span className="text-rose-700 font-semibold">low</span> when the touches scatter across a
          committee.
        </>
      ),
    },
  ],
  load: loadOpportunityTransfer,
  render: (transfer) => {
    if (transfer.status === "source-error") {
      return <SourceError reason={transfer.error ?? "UNKNOWN"} />;
    }
    const columns: Column<OpportunityTransferRow>[] = [
      { key: "team", label: "Tm", render: (r) => <span className="font-mono text-ink-1">{r.team}</span> },
      { key: "position", label: "Pos", render: (r) => <span className="font-mono text-ink-1">{r.position}</span> },
      { key: "outPlayer", label: "Out (vacating)", render: (r) => <span className="font-semibold text-ink">{r.outPlayer}</span> },
      { key: "vacatedTargets", label: "Vac Tgt", align: "right", numeric: true, tooltip: "trailing per-game targets the role vacates", render: (r) => r.vacatedTargets.toFixed(1) },
      { key: "vacatedCarries", label: "Vac Car", align: "right", numeric: true, tooltip: "trailing per-game carries the role vacates", render: (r) => r.vacatedCarries.toFixed(1) },
      { key: "beneficiary", label: "Beneficiary", render: (r) => <span className="text-ink">{r.beneficiary ?? "—"}</span> },
      {
        key: "confidence",
        label: "Confidence",
        sortValue: (r) => r.confidence,
        render: (r) => <span className={`font-mono text-xs ${toneClass(transferTone(r.confidence))}`}>{TRANSFER_CONFIDENCE_LABEL[r.confidence]}</span>,
      },
    ];
    return (
      <div className="flex flex-col gap-4">
        <SubHead
          kicker={`Vacated-role transfers${transfer.week ? ` · ${transfer.season} week ${transfer.week}` : ` · ${transfer.season}`}`}
          title="Where the volume goes next"
          note={transfer.note}
        />
        <DataTable
          rows={transfer.rows}
          columns={columns}
          rowKey={(r) => `${r.team}-${r.position}-${r.outPlayer}`}
          showRank
          searchable
          searchAccessor={(r) => `${r.team} ${r.outPlayer} ${r.beneficiary ?? ""}`}
          rowTitle={(r) => r.note}
          rowTone={(r) => transferTone(r.confidence)}
          minWidth={820}
        />
        <Note>{transfer.note}</Note>
      </div>
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// CLV CALIBRATION — game-by-game self-grade (special header: games graded)
// ─────────────────────────────────────────────────────────────────────────────

function clvTone(clv: number): SignalTone {
  if (clv > 0) return "good";
  if (clv < 0) return "bad";
  return "neutral";
}
function clvRead(clv: number): string {
  if (clv > 0) return "Beat close";
  if (clv < 0) return "Trailed";
  return "At close";
}
function prob(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

const CLV_ENGINE = engine({
  slug: "clv",
  group: "Team & market",
  label: "CLV Calibration",
  title: "CLV Calibration — the engine grades itself",
  description: (
    <>
      Closing-line-value backtest against nflverse schedules — does the model beat the closing line? Self-grading,
      never a bet; forward odds stay gated.
    </>
  ),
  api: "/api/intelligence/clv-calibration",
  sourceIds: ["nflverse"],
  explainer: [
    {
      term: "CLV — closing line value",
      definition:
        "The probability points the model's number beats the closing line on the side it took. Beating the close is the single best leading indicator of a sound process.",
    },
    {
      term: "Model vs Close",
      definition:
        "Model implied probability for the side, compared to the implied probability of the closing line. The gap between them is the CLV.",
    },
    {
      term: "Self-grading, never a bet",
      definition: (
        <>
          A backtest against nflverse schedules: did the model <span className="text-emerald-700 font-semibold">beat
          the close</span> or <span className="text-rose-700 font-semibold">trail</span> it? Forward odds stay gated —
          this grades the engine, it does not place a wager.
        </>
      ),
    },
  ],
  load: loadClvBacktest,
  render: (c) => {
    if (c.status === "source-error") {
      return (
        <SourceError reason={c.note}>
          <p className="font-mono text-xs leading-5 text-ink-2">{c.error ?? "UNKNOWN"}</p>
        </SourceError>
      );
    }
    const columns: Column<ClvBacktestRow>[] = [
      { key: "season", label: "Season", align: "right", numeric: true, render: (r) => r.season },
      { key: "week", label: "Wk", align: "right", numeric: true, render: (r) => r.week },
      { key: "game", label: "Game", render: (r) => <span className="font-semibold text-ink">{r.game}</span> },
      { key: "market", label: "Market", render: (r) => <span className="font-mono text-ink-1">{r.market}</span> },
      { key: "side", label: "Side", render: (r) => <span className="font-mono text-ink">{r.side}</span> },
      { key: "modelProb", label: "Model", align: "right", numeric: true, tooltip: "model implied probability for the side taken", sortValue: (r) => r.modelProb, render: (r) => prob(r.modelProb) },
      { key: "closingProb", label: "Close", align: "right", numeric: true, tooltip: "implied probability from the closing line", sortValue: (r) => r.closingProb, render: (r) => prob(r.closingProb) },
      { key: "clv", label: "CLV", align: "right", numeric: true, tooltip: "probability points beaten vs the close", sortValue: (r) => r.clv, render: (r) => <span className={toneClass(clvTone(r.clv))}>{formatSigned(r.clv, 4)}</span> },
      { key: "covered", label: "Covered", align: "center", tooltip: "did the side actually cover/win?", sortValue: (r) => (r.covered ? 1 : 0), render: (r) => <span className="font-mono text-ink-1">{r.covered ? "Yes" : "—"}</span> },
      {
        key: "read",
        label: "The read",
        sortable: false,
        render: (r) => <span className={`font-mono text-xs ${toneClass(clvTone(r.clv))}`}>{clvRead(r.clv)}</span>,
      },
    ];
    return (
      <div className="flex flex-col gap-4">
        <SubHead
          kicker={`CLV self-grade${c.seasonTo ? ` · ${c.seasonFrom}–${c.seasonTo}` : ""} · ${c.gamesGraded} games graded`}
          title="Did the model beat the close?"
          note={c.note}
        />
        <DataTable
          rows={c.rows}
          columns={columns}
          rowKey={(r) => `${r.season}-${r.week}-${r.game}-${r.market}`}
          showRank
          searchable
          searchAccessor={(r) => `${r.game} ${r.market} ${r.side}`}
          rowTone={(r) => clvTone(r.clv)}
          initialSort={{ key: "clv", dir: "desc" }}
          minWidth={920}
        />
        <Note>{c.note}</Note>
      </div>
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// WAIVER TRENDS (SLEEPER) — two side-by-side momentum tables (special)
// ─────────────────────────────────────────────────────────────────────────────

function trendColumns(kind: "adds" | "drops"): Column<TrendingRow>[] {
  const isAdds = kind === "adds";
  return [
    { key: "name", label: "Player", render: (r) => <span className="font-semibold text-ink">{r.name}</span> },
    { key: "position", label: "Pos", render: (r) => <span className="font-mono text-ink-1">{r.position}</span> },
    { key: "team", label: "Tm", render: (r) => <span className="font-mono text-ink-1">{r.team}</span> },
    {
      key: "count",
      label: isAdds ? "Adds" : "Drops",
      align: "right",
      numeric: true,
      tooltip: isAdds ? "leagues adding over the window" : "leagues dropping over the window",
      render: (r) => <span className={isAdds ? "text-emerald-700 font-semibold" : "text-rose-700 font-semibold"}>{r.count.toLocaleString()}</span>,
    },
  ];
}

const WAIVER_TRENDS_ENGINE = engine({
  slug: "waiver-trends",
  group: "Team & market",
  label: "Waiver Trends",
  title: "Waiver Trends — what the market is doing",
  description: (
    <>
      League-wide waiver MOMENTUM from the Sleeper API — how many fantasy leagues are adding and dropping each NFL player
      over the lookback window. Ownership velocity: <span className="font-semibold text-ink">what the market is doing, not advice.</span>
    </>
  ),
  api: "/api/intelligence/sleeper-trending",
  sourceIds: ["sleeper"],
  explainer: [
    {
      term: "Adds — ownership rising",
      definition: (
        <>
          The count of Sleeper leagues that <span className="text-emerald-700 font-semibold">added</span> the player
          over the window. Rising ownership velocity, not a buy call.
        </>
      ),
    },
    {
      term: "Drops — ownership falling",
      definition: (
        <>
          The count of leagues that <span className="text-rose-700 font-semibold">dropped</span> the player. Falling
          ownership velocity, not a sell call.
        </>
      ),
    },
    {
      term: "Descriptive, not advice",
      definition:
        "This is the crowd's behavior measured directly — market sentiment. We surface it; we don't turn it into a pick or a projection.",
    },
  ],
  load: loadSleeperTrending,
  render: (t) => {
    if (t.status === "source-error") {
      return <SourceError reason={t.error ?? "UNKNOWN"} />;
    }
    return (
      <div className="flex flex-col gap-6">
        <Note>Last {t.lookbackHours} hours · ownership velocity across fantasy leagues.</Note>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <SubHead kicker="Trending adds" title="Who the market is buying" />
            <DataTable
              rows={t.adds}
              columns={trendColumns("adds")}
              rowKey={(r) => r.playerId}
              showRank
              emptyTitle="No qualifying adds returned for this window."
              initialSort={{ key: "count", dir: "desc" }}
              minWidth={460}
            />
          </div>
          <div className="flex flex-col gap-3">
            <SubHead kicker="Trending drops" title="Who the market is dumping" />
            <DataTable
              rows={t.drops}
              columns={trendColumns("drops")}
              rowKey={(r) => r.playerId}
              showRank
              emptyTitle="No qualifying drops returned for this window."
              initialSort={{ key: "count", dir: "desc" }}
              minWidth={460}
            />
          </div>
        </div>
        <Note>{t.note}</Note>
      </div>
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// PROOF / PREDICTIVENESS — 3 KPI cards + up to 3 stacked backtest tables (special)
// ─────────────────────────────────────────────────────────────────────────────

function proofColumns(): Column<PredictivenessSplit & { label: string }>[] {
  return [
    { key: "label", label: "Group", render: (r) => <span className="font-semibold text-ink">{r.label}</span> },
    { key: "n", label: "N", align: "right", numeric: true, tooltip: "paired players", render: (r) => r.n },
    { key: "gradeCorr", label: "Grade ρ", align: "right", numeric: true, tooltip: "rank corr: grade → future production", sortValue: (r) => r.gradeCorr, render: (r) => corr(r.gradeCorr) },
    { key: "baselineCorr", label: "Baseline ρ", align: "right", numeric: true, tooltip: "rank corr: past production → future production", sortValue: (r) => r.baselineCorr, render: (r) => corr(r.baselineCorr) },
    {
      key: "lift",
      label: "Lift",
      align: "right",
      numeric: true,
      tooltip: "grade rho minus baseline rho",
      sortValue: (r) => r.lift,
      render: (r) => <span className={liftClass(r.lift)}>{r.lift == null ? "—" : formatSigned(r.lift, 2)}</span>,
    },
    {
      key: "buyLowHitRate",
      label: "Buy-low ✓",
      align: "right",
      numeric: true,
      tooltip: "fraction of buy-low calls whose per-game rose",
      sortValue: (r) => r.buyLowHitRate,
      render: (r) => (
        <span className={hitRateClass(r.buyLowHitRate)}>
          {pctNullable(r.buyLowHitRate)}
          <span className="ml-1 text-xs text-ink-2">n={r.buyLowN}</span>
        </span>
      ),
    },
    {
      key: "sellHighHitRate",
      label: "Sell-high ✓",
      align: "right",
      numeric: true,
      tooltip: "fraction of sell-high calls whose per-game fell",
      sortValue: (r) => r.sellHighHitRate,
      render: (r) => (
        <span className={hitRateClass(r.sellHighHitRate)}>
          {pctNullable(r.sellHighHitRate)}
          <span className="ml-1 text-xs text-ink-2">n={r.sellHighN}</span>
        </span>
      ),
    },
  ];
}

function ProofTable({
  overall,
  byPosition,
}: {
  overall: PredictivenessSplit;
  byPosition: readonly PredictivenessSplit[];
}): JSX.Element {
  const rows: Array<PredictivenessSplit & { label: string }> = [
    { ...overall, label: "Overall" },
    ...byPosition.map((s) => ({ ...s, label: s.position })),
  ];
  return (
    <DataTable
      rows={rows}
      columns={proofColumns()}
      rowKey={(r) => r.label}
      minWidth={760}
    />
  );
}

const PROOF_ENGINE = engine({
  slug: "proof",
  group: "Proof & calibration",
  label: "Does It Predict?",
  title: "Does the grade actually predict?",
  description: (
    <>
      Anyone can publish a rating. We backtest ours. Build the process grade on the first half of the season, then
      measure how well it ranks <em>second-half</em> production — against the obvious baseline, past production predicting
      future production. If the grade adds lift, it carries forward signal.
    </>
  ),
  api: "/api/intelligence/predictiveness",
  sourceIds: ["nflverse"],
  explainer: [
    {
      term: "Grade ρ — does the grade rank the future?",
      definition:
        "Spearman rank correlation between the first-half process grade and second-half production, within position. Higher is better.",
    },
    {
      term: "Lift — does it beat the past?",
      definition: (
        <>
          Grade ρ minus baseline ρ (past production → future production).{" "}
          <span className="text-emerald-700 font-semibold">Positive</span> means the grade adds signal the box score
          didn&apos;t already have.
        </>
      ),
    },
    {
      term: "Call hit-rate — were buy/sell right?",
      definition: (
        <>
          Of first-half buy-lows, how many <span className="text-emerald-700 font-semibold">rose</span>; of
          sell-highs, how many <span className="text-rose-700 font-semibold">fell</span>. Read against the 50% coin
          flip.
        </>
      ),
    },
  ],
  load: loadPredictiveness,
  render: (p) => {
    if (p.status === "source-error") {
      return <SourceError reason={p.error ?? "UNKNOWN"} />;
    }
    return (
      <div className="flex flex-col gap-6">
        <section className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            label="Grade ρ (overall)"
            value={corr(p.overall.gradeCorr)}
            sublabel={`vs ${corr(p.overall.baselineCorr)} past-production baseline`}
          />
          <KpiCard
            label="Lift over the past"
            value={p.overall.lift == null ? "—" : formatSigned(p.overall.lift, 2)}
            tone={liftTone(p.overall.lift)}
            sublabel={`${p.sampleSize} players · ${p.season}`}
          />
          <KpiCard
            label="Sell-high hit-rate"
            value={pctNullable(p.overall.sellHighHitRate)}
            tone={hitRateTone(p.overall.sellHighHitRate)}
            sublabel={`buy-low ${pctNullable(p.overall.buyLowHitRate)} · vs 50% coin flip`}
          />
        </section>

        <div className="flex flex-col gap-3">
          <SubHead
            kicker={`${p.season} · trained on weeks ${p.trainWeeks[0]}–${p.trainWeeks[p.trainWeeks.length - 1]} · tested on weeks ${p.testWeeks[0]}–${p.testWeeks[p.testWeeks.length - 1]}`}
            title="The backtest, by position"
            note={p.verdict}
          />
          <ProofTable overall={p.overall} byPosition={p.byPosition} />
          <Note>{p.note}</Note>
        </div>

        {p.yearOverYear && p.priorSeason ? (
          <div className="flex flex-col gap-3">
            <SubHead
              kicker={`Out-of-sample · trained on ${p.priorSeason} · tested on ${p.season}`}
              title="The draft test: does last year's grade predict this year?"
              note={p.yearOverYearVerdict}
            />
            <ProofTable overall={p.yearOverYear} byPosition={p.yearOverYearByPosition} />
            <Note>
              Year-over-year is the harder, more honest test: players change teams, age, and get hurt. Where the grade
              beats raw prior-season production (positive lift), it carries signal the box score didn&apos;t.
            </Note>
          </div>
        ) : null}

        {p.stacked && p.stackedPairs.length > 0 ? (
          <div className="flex flex-col gap-3">
            <SubHead
              kicker={`Multi-year stacked · out-of-sample · pooled pairs ${p.stackedPairs.map(([train, test]) => `${train}→${test}`).join("  ·  ")}`}
              title="The multi-year test: pool several seasons for real statistical power."
              note={p.stackedVerdict}
            />
            <ProofTable overall={p.stacked} byPosition={p.stackedByPosition} />
            <Note>
              Each train→test pair is normalized within its own seasons (percentiles per pair), then the pairs are
              pooled — never re-ranked across seasons. Out-of-sample throughout; where it beats the baseline (positive
              lift), that is the strongest evidence the grade carries forward signal.
            </Note>
          </div>
        ) : null}
      </div>
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

export const ENGINES: readonly EngineEntry[] = [
  PLAYER_MODEL_ENGINE,
  EXPECTED_POINTS_ENGINE,
  QB_FORWARD_ENGINE,
  RUSHING_CONTACT_ENGINE,
  ROUTE_RATE_ENGINE,
  SCORING_ZONE_ENGINE,
  TEAM_ENVIRONMENT_ENGINE,
  OPPORTUNITY_TRANSFER_ENGINE,
  CLV_ENGINE,
  WAIVER_TRENDS_ENGINE,
  PROOF_ENGINE,
];

export const ENGINE_GROUP_ORDER: readonly EngineGroup[] = [
  "Cross-position core",
  "Quarterback",
  "Running back",
  "Receiver",
  "Team & market",
  "Proof & calibration",
];

export const DEFAULT_ENGINE = "proof";

export function getEngine(slug: string | undefined): EngineEntry {
  const match = ENGINES.find((e) => e.slug === slug);
  if (match) return match;
  const fallback = ENGINES.find((e) => e.slug === DEFAULT_ENGINE);
  if (fallback) return fallback;
  // ENGINES is a non-empty literal; the first entry is always present.
  return PLAYER_MODEL_ENGINE;
}

/** Engines grouped, in canonical group order, for the directory rail / tab list. */
export function groupedEngines(): ReadonlyArray<{ group: EngineGroup; engines: readonly EngineEntry[] }> {
  return ENGINE_GROUP_ORDER.map((group) => ({
    group,
    engines: ENGINES.filter((e) => e.group === group),
  })).filter((g) => g.engines.length > 0);
}
