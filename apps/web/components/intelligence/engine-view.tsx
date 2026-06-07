"use client";

import type { ReactNode } from "react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { KpiCard } from "@/components/ui/kpi-card";
import { SourceError } from "@/components/ui/source-error";
import {
  DivergingBar,
  PercentileBar,
  ShareBar,
  SignalChip,
} from "@/components/ui/dataviz";
import {
  formatSigned,
  hitRateTone,
  liftTone,
  signedTone,
  toneClass,
  type SignalTone,
} from "@/lib/intelligence/colors";

// Row / payload TYPES only (no loaders) — types are erased at runtime, so importing
// them into a client component costs nothing and never drags a loader across the
// server→client boundary.
import type { ModelPosition, PlayerModel, PlayerProfile, ProcessSignal } from "@/lib/intelligence/player-model";
import type { ExpectedPoints, ExpectedPointsRow } from "@/lib/intelligence/expected-points";
import type { QbForward, QbForwardRow } from "@/lib/intelligence/qb-forward";
import type { RushingContact, RushingContactRow } from "@/lib/intelligence/rushing-contact";
import type { RouteRate, RouteRateRow, RouteRateSignal } from "@/lib/intelligence/route-rate";
import type { ScoringZone, ScoringZoneRow, ScoringZoneSignal } from "@/lib/intelligence/scoring-zone";
import type { TeamEnvironment, TeamEnvironmentRow } from "@/lib/intelligence/team-environment";
import type { OpportunityTransfer, OpportunityTransferRow, TransferConfidence } from "@/lib/intelligence/opportunity-transfer";
import type { ClvBacktest, ClvBacktestRow } from "@/lib/intelligence/clv-calibration";
import type { PredictivenessProof, PredictivenessSplit } from "@/lib/intelligence/predictiveness";
import type { SleeperTrending, TrendingRow } from "@/lib/integrations/sleeper";

/**
 * EngineView — the CLIENT render layer for the /intelligence/engines browser.
 *
 * The data LOADERS stay on the server (registry.tsx). This component owns every
 * render() that builds a <DataTable> with column render()/sortValue() functions,
 * plus the special per-engine layouts (proof KPI cards + tables, player-model
 * move cards + position splits, waiver dual tables, clv self-grade). Those
 * functions cannot cross the RSC boundary, so they live here, in the client.
 *
 * The server page passes ONLY serializable data: the active engine `slug` and
 * the plain `data` object its loader returned (rows are plain string/number/enum
 * records — no functions). This component switches on `slug`, casts the data to
 * the matching loader type, and paints it on the LIGHT paper surface with the
 * shared kit (DataTable / KpiCard / SourceError + lib/intelligence/colors).
 *
 * Nothing about the data, columns' meaning, or visuals changed in the move — only
 * WHERE the column/render functions live (now client).
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
                <span className="flex items-center gap-2 font-mono text-xs text-ink-2">
                  <span>{p.position} · {p.team}</span>
                  <PercentileBar pct={p.processGrade} tone={gradeTone(p.processGrade)} widthPx={36} />
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
      sortValue: (r) => r.processGrade,
      render: (r) => <PercentileBar pct={r.processGrade} tone={gradeTone(r.processGrade)} />,
    },
    {
      key: "productionPct",
      label: "Prod %ile",
      align: "right",
      numeric: true,
      tooltip: "PPR production percentile in position",
      sortValue: (r) => r.productionPct,
      render: (r) => <PercentileBar pct={r.productionPct} />,
    },
    {
      key: "epaPerPlay",
      label: "EPA/play",
      align: "right",
      numeric: true,
      tooltip: "combined EPA per play",
      sortValue: (r) => r.epaPerPlay,
      render: (r) => <DivergingBar value={r.epaPerPlay} domain={0.5} digits={2} />,
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
    render: (r) => <SignalChip label={PROCESS_SIGNAL_LABEL[r.signal]} tone={processTone(r.signal)} title="process vs production" />,
  });
  return cols;
}

function PlayerModelView({ model }: { model: PlayerModel }): JSX.Element {
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
}

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

function ExpectedPointsView({ f }: { f: ExpectedPoints }): JSX.Element {
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
      // actual over expected = hot (bad / sell), under = cold/coming (good / buy);
      // tone follows the read so color matches the call, not the raw sign.
      render: (r) => <DivergingBar value={r.diff} domain={6} digits={1} tone={xfpReadTone(r)} />,
    },
    { key: "xfpPct", label: "xFP%", align: "right", numeric: true, tooltip: "expected-points percentile within position", sortValue: (r) => r.xfpPct, render: (r) => <PercentileBar pct={r.xfpPct} /> },
    { key: "prodPct", label: "Prod%", align: "right", numeric: true, tooltip: "actual-points percentile within position", sortValue: (r) => r.prodPct, render: (r) => <PercentileBar pct={r.prodPct} /> },
    {
      key: "signal",
      label: "The read",
      sortValue: (r) => r.signal,
      render: (r) => <SignalChip label={xfpReadLabel(r)} tone={xfpReadTone(r)} />,
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
}

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

function QbForwardView({ f }: { f: QbForward }): JSX.Element {
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
    { key: "dakotaPct", label: "DAK%", align: "right", numeric: true, tooltip: "DAKOTA percentile within QB pool", sortValue: (r) => r.dakotaPct, render: (r) => <PercentileBar pct={r.dakotaPct} /> },
    { key: "anyaPct", label: "ANY/A%", align: "right", numeric: true, tooltip: "ANY/A percentile within QB pool", sortValue: (r) => r.anyaPct, render: (r) => <PercentileBar pct={r.anyaPct} /> },
    { key: "forwardGrade", label: "Grade", align: "right", numeric: true, tooltip: "mean of the two percentiles", sortValue: (r) => r.forwardGrade, render: (r) => <PercentileBar pct={r.forwardGrade} /> },
    { key: "agreement", label: "Agmt", align: "right", numeric: true, tooltip: "how closely the two priors agree", sortValue: (r) => r.agreement, render: (r) => <ShareBar value={r.agreement} format={(v) => v.toFixed(2)} /> },
    {
      key: "read",
      label: "The read",
      sortable: false,
      render: (r) => <SignalChip label={qbReadLabel(r)} tone={qbReadTone(r)} />,
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
}

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

function RushingContactView({ f }: { f: RushingContact }): JSX.Element {
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
    { key: "yacPct", label: "YAC%", align: "right", numeric: true, tooltip: "YAC/att percentile within the qualified pool", sortValue: (r) => r.yacPct, render: (r) => <PercentileBar pct={r.yacPct} tone={rcYacTone(r)} /> },
    {
      key: "read",
      label: "The read",
      sortable: false,
      render: (r) => <SignalChip label={rcReadLabel(r)} tone={rcReadTone(r)} />,
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
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE RATE (TPRR)
// ─────────────────────────────────────────────────────────────────────────────

const ROUTE_SIGNAL_LABEL: Record<RouteRateSignal, string> = { breakout: "Breakout", fade: "Fade", steady: "Steady" };
function routeTone(s: RouteRateSignal): SignalTone {
  if (s === "breakout") return "good";
  if (s === "fade") return "bad";
  return "neutral";
}

function RouteRateView({ rr }: { rr: RouteRate }): JSX.Element {
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
    { key: "tprrPct", label: "TPRR%", align: "right", numeric: true, tooltip: "within-pool TPRR percentile", sortValue: (r) => r.tprrPct, render: (r) => <PercentileBar pct={r.tprrPct} /> },
    {
      key: "signal",
      label: "The read",
      sortValue: (r) => r.signal,
      render: (r) => <SignalChip label={ROUTE_SIGNAL_LABEL[r.signal]} tone={routeTone(r.signal)} />,
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
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING-ZONE EQUITY
// ─────────────────────────────────────────────────────────────────────────────

const SCORING_SIGNAL_LABEL: Record<ScoringZoneSignal, string> = { buy: "Buy", sell: "Sell", "in-line": "In-line" };
function scoringTone(s: ScoringZoneSignal): SignalTone {
  if (s === "buy") return "good";
  if (s === "sell") return "bad";
  return "neutral";
}

function ScoringZoneView({ z }: { z: ScoringZone }): JSX.Element {
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
    { key: "rzShare", label: "RZ Share", align: "right", numeric: true, tooltip: "player's share of his team's scoring-zone opportunities", sortValue: (r) => r.rzShare, render: (r) => <ShareBar value={r.rzShare} /> },
    { key: "rzTds", label: "RZ TD", align: "right", numeric: true, tooltip: "scoring-zone touchdowns", render: (r) => r.rzTds },
    { key: "tdRate", label: "TD Rate", align: "right", numeric: true, tooltip: "raw TD per scoring-zone opportunity", sortValue: (r) => r.tdRate, render: (r) => <ShareBar value={r.tdRate} /> },
    { key: "expectedTdRate", label: "xTD Rate", align: "right", numeric: true, tooltip: "TD rate regressed toward the positional mean", sortValue: (r) => r.expectedTdRate, render: (r) => <ShareBar value={r.expectedTdRate} /> },
    {
      key: "signal",
      label: "The read",
      sortValue: (r) => r.signal,
      render: (r) => <SignalChip label={SCORING_SIGNAL_LABEL[r.signal]} tone={scoringTone(r.signal)} />,
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
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM ENVIRONMENT
// ─────────────────────────────────────────────────────────────────────────────

function TeamEnvironmentView({ t }: { t: TeamEnvironment }): JSX.Element {
  if (t.status === "source-error") {
    return <SourceError reason={t.error ?? "UNKNOWN"} />;
  }
  const columns: Column<TeamEnvironmentRow>[] = [
    { key: "team", label: "Tm", render: (r) => <span className="font-mono font-semibold text-ink">{r.team}</span> },
    { key: "offEpaPerPlay", label: "Off EPA", align: "right", numeric: true, tooltip: "offensive EPA per play (neutral script, early down)", sortValue: (r) => r.offEpaPerPlay, render: (r) => <DivergingBar value={r.offEpaPerPlay} domain={0.3} digits={3} /> },
    { key: "offEpaPct", label: "Off%ile", align: "right", numeric: true, tooltip: "within-league offensive EPA percentile", sortValue: (r) => r.offEpaPct, render: (r) => <PercentileBar pct={r.offEpaPct} /> },
    { key: "offSuccessRate", label: "Off SR", align: "right", numeric: true, tooltip: "offensive success rate", sortValue: (r) => r.offSuccessRate, render: (r) => <ShareBar value={r.offSuccessRate} /> },
    { key: "defEpaPerPlay", label: "Def EPA", align: "right", numeric: true, tooltip: "defensive EPA per play (lower is better)", sortValue: (r) => r.defEpaPerPlay, render: (r) => <DivergingBar value={r.defEpaPerPlay} domain={0.3} digits={3} tone={signedTone(-r.defEpaPerPlay)} /> },
    { key: "defEpaPct", label: "Def%ile", align: "right", numeric: true, tooltip: "within-league defensive EPA percentile (EPA inverted)", sortValue: (r) => r.defEpaPct, render: (r) => <PercentileBar pct={r.defEpaPct} /> },
    { key: "defSuccessRate", label: "Def SR", align: "right", numeric: true, tooltip: "defensive success rate (lower is better)", sortValue: (r) => r.defSuccessRate, render: (r) => <ShareBar value={r.defSuccessRate} /> },
    { key: "proe", label: "PROE", align: "right", numeric: true, tooltip: "PROE — pass rate over expected", sortValue: (r) => r.proe, render: (r) => <DivergingBar value={r.proe} domain={10} digits={1} /> },
    { key: "noHuddleRate", label: "Pace", align: "right", numeric: true, tooltip: "no-huddle rate — pace proxy", sortValue: (r) => r.noHuddleRate, render: (r) => pct(r.noHuddleRate) },
    {
      key: "read",
      label: "The read",
      sortable: false,
      render: (r) => (
        <SignalChip
          label={r.offEpaPerPlay > 0 ? "Buy offense" : r.offEpaPerPlay < 0 ? "Fade offense" : "Neutral"}
          tone={r.offEpaPerPlay > 0 ? "good" : r.offEpaPerPlay < 0 ? "bad" : "neutral"}
        />
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
}

// ─────────────────────────────────────────────────────────────────────────────
// OPPORTUNITY TRANSFER
// ─────────────────────────────────────────────────────────────────────────────

const TRANSFER_CONFIDENCE_LABEL: Record<TransferConfidence, string> = { high: "High", medium: "Medium", low: "Low" };
function transferTone(c: TransferConfidence): SignalTone {
  if (c === "high") return "good";
  if (c === "low") return "bad";
  return "neutral";
}

function OpportunityTransferView({ transfer }: { transfer: OpportunityTransfer }): JSX.Element {
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
      render: (r) => <SignalChip label={TRANSFER_CONFIDENCE_LABEL[r.confidence]} tone={transferTone(r.confidence)} />,
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
}

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

function ClvView({ c }: { c: ClvBacktest }): JSX.Element {
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
    { key: "clv", label: "CLV", align: "right", numeric: true, tooltip: "probability points beaten vs the close", sortValue: (r) => r.clv, render: (r) => <DivergingBar value={r.clv} domain={0.05} digits={4} tone={clvTone(r.clv)} /> },
    { key: "covered", label: "Covered", align: "center", tooltip: "did the side actually cover/win?", sortValue: (r) => (r.covered ? 1 : 0), render: (r) => <span className="font-mono text-ink-1">{r.covered ? "Yes" : "—"}</span> },
    {
      key: "read",
      label: "The read",
      sortable: false,
      render: (r) => <SignalChip label={clvRead(r.clv)} tone={clvTone(r.clv)} />,
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
}

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

function WaiverTrendsView({ t }: { t: SleeperTrending }): JSX.Element {
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
}

// ─────────────────────────────────────────────────────────────────────────────
// PROOF / PREDICTIVENESS — 3 KPI cards + up to 3 stacked backtest tables (special)
// ─────────────────────────────────────────────────────────────────────────────

function proofColumns(): Column<PredictivenessSplit & { label: string }>[] {
  return [
    { key: "label", label: "Group", render: (r) => <span className="font-semibold text-ink">{r.label}</span> },
    { key: "n", label: "N", align: "right", numeric: true, tooltip: "paired players", render: (r) => r.n },
    { key: "gradeCorr", label: "Grade ρ", align: "right", numeric: true, tooltip: "rank corr: grade → future production (signed, −1…1)", sortValue: (r) => r.gradeCorr, render: (r) => <DivergingBar value={r.gradeCorr} domain={1} digits={2} /> },
    { key: "baselineCorr", label: "Baseline ρ", align: "right", numeric: true, tooltip: "rank corr: past production → future production (signed, −1…1)", sortValue: (r) => r.baselineCorr, render: (r) => <DivergingBar value={r.baselineCorr} domain={1} digits={2} /> },
    {
      key: "lift",
      label: "Lift",
      align: "right",
      numeric: true,
      tooltip: "grade rho minus baseline rho",
      sortValue: (r) => r.lift,
      render: (r) => <DivergingBar value={r.lift} domain={0.3} digits={2} tone={liftTone(r.lift)} />,
    },
    {
      key: "buyLowHitRate",
      label: "Buy-low ✓",
      align: "right",
      numeric: true,
      tooltip: "fraction of buy-low calls whose per-game rose",
      sortValue: (r) => r.buyLowHitRate,
      render: (r) => (
        <span className="inline-flex items-center gap-1">
          <ShareBar value={r.buyLowHitRate} tone={hitRateTone(r.buyLowHitRate)} />
          <span className="text-xs text-ink-2">n={r.buyLowN}</span>
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
        <span className="inline-flex items-center gap-1">
          <ShareBar value={r.sellHighHitRate} tone={hitRateTone(r.sellHighHitRate)} />
          <span className="text-xs text-ink-2">n={r.sellHighN}</span>
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

function ProofView({ p }: { p: PredictivenessProof }): JSX.Element {
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
          sublabel={
            <span className="inline-flex items-center gap-2">
              <DivergingBar value={p.overall.lift} domain={0.3} digits={2} tone={liftTone(p.overall.lift)} />
              <span>{p.sampleSize} players · {p.season}</span>
            </span>
          }
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
            note={p.yearOverYearVerdict ?? undefined}
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
            note={p.stackedVerdict ?? undefined}
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
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPATCH — slug → render. The server page passes only { engine, data }, both
// serializable; this client component owns every render fn the columns need.
// ─────────────────────────────────────────────────────────────────────────────

export interface EngineViewProps {
  /** Active engine slug (serializable). */
  readonly engine: string;
  /** The serializable payload the engine's loader returned (plain data, no fns). */
  readonly data: unknown;
}

export function EngineView({ engine, data }: EngineViewProps): JSX.Element {
  switch (engine) {
    case "player-model":
      return <PlayerModelView model={data as PlayerModel} />;
    case "expected-points":
      return <ExpectedPointsView f={data as ExpectedPoints} />;
    case "qb-forward":
      return <QbForwardView f={data as QbForward} />;
    case "rushing-contact":
      return <RushingContactView f={data as RushingContact} />;
    case "route-rate":
      return <RouteRateView rr={data as RouteRate} />;
    case "scoring-zone":
      return <ScoringZoneView z={data as ScoringZone} />;
    case "team":
      return <TeamEnvironmentView t={data as TeamEnvironment} />;
    case "opportunity-transfer":
      return <OpportunityTransferView transfer={data as OpportunityTransfer} />;
    case "clv":
      return <ClvView c={data as ClvBacktest} />;
    case "waiver-trends":
      return <WaiverTrendsView t={data as SleeperTrending} />;
    case "proof":
      return <ProofView p={data as PredictivenessProof} />;
    default:
      return <SourceError reason={`Unknown engine "${engine}".`} />;
  }
}

export default EngineView;
