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
  ratingTier,
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
import type { PredictivenessProof } from "@/lib/intelligence/predictiveness";
import type { SleeperTrending, TrendingRow } from "@/lib/integrations/sleeper";
import type { PlayDesign, PlayDesignQbRow, PlayDesignTeamRow } from "@/lib/intelligence/play-design";
import type {
  NflversePressureCoverage,
  QbPressureRow,
  CoverageRow,
  ReceivingAdvancedRow,
} from "@/lib/nflverse/pressure-coverage";

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
 * the matching loader type, and paints it on the unified dark surface with the
 * shared kit (DataTable / KpiCard / SourceError + lib/intelligence/colors).
 *
 * Nothing about the data, columns' meaning, or visuals changed in the move — only
 * WHERE the column/render functions live (now client).
 */

// ── helpers ──────────────────────────────────────────────────────────────────

function Note({ children }: { children: ReactNode }): JSX.Element {
  return <p className="px-1 font-mono text-xs leading-5 text-ion-2">{children}</p>;
}

function SubHead({ kicker, title, note }: { kicker: string; title: string; note?: ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-orbital-cyan">{kicker}</p>
      <h2 className="text-xl font-semibold text-ion-white">{title}</h2>
      {note ? <p className="mt-1 max-w-3xl text-sm leading-6 text-ion-1">{note}</p> : null}
    </div>
  );
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
function pctNullable(v: number | null): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
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

// The public board leads with the GSE Rating: a large numeral + a small fill
// bar (toned by the rating's own tier) + the tier chip. The component anchors
// behind the rating (EPA/WOPR/DAKOTA/PACR/production) stay hidden — we publish
// the score, not the recipe.
function RatingCell({ grade }: { grade: number }): JSX.Element {
  const { tone } = ratingTier(grade);
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`font-mono text-lg font-semibold tabular-nums ${toneClass(tone)}`}>{Math.round(grade)}</span>
      <PercentileBar pct={grade} tone={tone} widthPx={40} />
    </span>
  );
}

function TierChip({ grade }: { grade: number }): JSX.Element {
  const { label, tone } = ratingTier(grade);
  return <SignalChip label={label} tone={tone} />;
}

function MovesCard({ title, tone, rows }: { title: string; tone: SignalTone; rows: readonly PlayerProfile[] }): JSX.Element {
  return (
    <section className="rounded-ds-md border border-surface-line bg-surface-raised p-5">
      <p className={`font-mono text-xs font-semibold uppercase tracking-[0.16em] ${toneClass(tone)}`}>{title}</p>
      <div className="mt-3 space-y-2.5">
        {rows.length === 0 ? (
          <p className="text-sm text-ion-2">None flagged this week.</p>
        ) : (
          rows.map((p) => (
            <div key={p.playerId} className="flex items-center justify-between gap-3 border-l border-surface-line pl-3">
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-ion-white">{p.name}</span>
                <span className="font-mono text-xs text-ion-2">{p.position} · {p.team}</span>
              </span>
              <span className="flex items-center gap-2">
                <RatingCell grade={p.processGrade} />
                <TierChip grade={p.processGrade} />
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// Public table: Player, Tm, GSE Rating, Tier, The read. The anchor columns
// (EPA/play, WOPR, DAKOTA, PACR, production %ile, touches) are deliberately
// gone — the rating already carries them.
function playerColumns(): Column<PlayerProfile>[] {
  return [
    { key: "name", label: "Player", render: (r) => <span className="font-semibold text-ion-white">{r.name}</span> },
    { key: "team", label: "Tm", render: (r) => <span className="font-mono text-ion-1">{r.team}</span> },
    {
      key: "processGrade",
      label: "GSE Rating",
      align: "right",
      numeric: true,
      sortValue: (r) => r.processGrade,
      render: (r) => <RatingCell grade={r.processGrade} />,
    },
    {
      key: "tier",
      label: "Tier",
      sortValue: (r) => r.processGrade,
      render: (r) => <TierChip grade={r.processGrade} />,
    },
    {
      key: "signal",
      label: "The read",
      sortValue: (r) => r.signal,
      render: (r) => <SignalChip label={PROCESS_SIGNAL_LABEL[r.signal]} tone={processTone(r.signal)} />,
    },
  ];
}

function PlayerModelView({ model }: { model: PlayerModel }): JSX.Element {
  if (model.status === "source-error") {
    return <SourceError reason={model.error ?? "UNKNOWN"} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <MovesCard title="This week's buy-low adds" tone="good" rows={model.profiles.filter((p) => p.signal === "buy-low").slice(0, 8)} />
        <MovesCard title="Sell-high / move off" tone="bad" rows={model.profiles.filter((p) => p.signal === "sell-high").slice(0, 6)} />
      </div>
      {PLAYER_POSITIONS.map((pos) => {
        const rows = model.profiles.filter((p) => p.position === pos);
        if (rows.length === 0) return null;
        return (
          <div key={pos} className="flex flex-col gap-3">
            <SubHead kicker={pos} title={`${pos} ratings`} />
            <DataTable
              rows={rows}
              columns={playerColumns()}
              rowKey={(r) => r.playerId}
              showRank
              searchable
              searchAccessor={(r) => `${r.name} ${r.team}`}
              rowTone={(r) => processTone(r.signal)}
              initialSort={{ key: "processGrade", dir: "desc" }}
              minWidth={560}
            />
          </div>
        );
      })}
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
    { key: "name", label: "Player", render: (r) => <span className="font-semibold text-ion-white">{r.name}</span> },
    { key: "team", label: "Tm", render: (r) => <span className="font-mono text-ion-1">{r.team}</span> },
    { key: "position", label: "Pos", render: (r) => <span className="font-mono text-ion-1">{r.position}</span> },
    { key: "games", label: "G", align: "right", numeric: true, tooltip: "games", render: (r) => r.games },
    { key: "xfpTotal", label: "xFP", align: "right", numeric: true, tooltip: "expected PPR points, total", render: (r) => r.xfpTotal.toFixed(1) },
    { key: "xfpPerGame", label: "xFP/g", align: "right", numeric: true, tooltip: "expected PPR points per game", render: (r) => r.xfpPerGame.toFixed(1) },
    { key: "actualTotal", label: "Actual", align: "right", numeric: true, tooltip: "actual PPR points, total", render: (r) => r.actualTotal.toFixed(1) },
    {
      key: "diff",
      label: "Diff",
      align: "right",
      numeric: true,
      tooltip: "over vs under what the usage should have produced",
      sortValue: (r) => r.diff,
      // actual over expected = hot (bad / sell), under = cold/coming (good / buy);
      // tone follows the read so color matches the call, not the raw sign.
      render: (r) => <DivergingBar value={r.diff} domain={6} digits={1} tone={xfpReadTone(r)} />,
    },
    { key: "xfpPct", label: "xFP%", align: "right", numeric: true, sortValue: (r) => r.xfpPct, render: (r) => <PercentileBar pct={r.xfpPct} /> },
    { key: "prodPct", label: "Prod%", align: "right", numeric: true, sortValue: (r) => r.prodPct, render: (r) => <PercentileBar pct={r.prodPct} /> },
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
      />
      <DataTable
        rows={f.rows}
        columns={columns}
        rowKey={(r) => r.playerId}
        showRank
        searchable
        searchAccessor={(r) => `${r.name} ${r.team}`}
        enumFilter={{ label: "Pos", options: [{ value: "QB", label: "QB" }, { value: "RB", label: "RB" }, { value: "WR", label: "WR" }, { value: "TE", label: "TE" }], accessor: (r) => r.position }}
        rowTone={(r) => xfpReadTone(r)}
        initialSort={{ key: "xfpTotal", dir: "desc" }}
        minWidth={920}
      />
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
    { key: "name", label: "Player", render: (r) => <span className="font-semibold text-ion-white">{r.name}</span> },
    { key: "team", label: "Tm", render: (r) => <span className="font-mono text-ion-1">{r.team}</span> },
    { key: "games", label: "G", align: "right", numeric: true, tooltip: "games", render: (r) => r.games },
    { key: "attempts", label: "Att", align: "right", numeric: true, tooltip: "pass attempts", render: (r) => r.attempts },
    { key: "dakota", label: "DAKOTA", align: "right", numeric: true, render: (r) => r.dakota.toFixed(3) },
    { key: "anyA", label: "ANY/A", align: "right", numeric: true, tooltip: "adjusted net yards per attempt", render: (r) => r.anyA.toFixed(2) },
    { key: "dakotaPct", label: "DAK%", align: "right", numeric: true, sortValue: (r) => r.dakotaPct, render: (r) => <PercentileBar pct={r.dakotaPct} /> },
    { key: "anyaPct", label: "ANY/A%", align: "right", numeric: true, sortValue: (r) => r.anyaPct, render: (r) => <PercentileBar pct={r.anyaPct} /> },
    { key: "forwardGrade", label: "Grade", align: "right", numeric: true, sortValue: (r) => r.forwardGrade, render: (r) => <PercentileBar pct={r.forwardGrade} /> },
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
      />
      <DataTable
        rows={f.rows}
        columns={columns}
        rowKey={(r) => r.playerId}
        showRank
        searchable
        searchAccessor={(r) => `${r.name} ${r.team}`}
        rowTone={(r) => qbReadTone(r)}
        initialSort={{ key: "forwardGrade", dir: "desc" }}
        minWidth={920}
      />
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
    { key: "name", label: "Player", render: (r) => <span className="font-semibold text-ion-white">{r.name}</span> },
    { key: "team", label: "Tm", render: (r) => <span className="font-mono text-ion-1">{r.team}</span> },
    { key: "attempts", label: "Att", align: "right", numeric: true, tooltip: "rushing attempts", render: (r) => r.attempts },
    {
      key: "yacPerAtt",
      label: "YAC/att",
      align: "right",
      numeric: true,
      tooltip: "yards after contact per attempt",
      render: (r) => <span className={toneClass(rcYacTone(r))}>{r.yacPerAtt.toFixed(2)}</span>,
    },
    { key: "ybcPerAtt", label: "YBC/att", align: "right", numeric: true, tooltip: "yards before contact per attempt", render: (r) => r.ybcPerAtt.toFixed(2) },
    { key: "brokenTackles", label: "Brk", align: "right", numeric: true, tooltip: "broken tackles, total", render: (r) => r.brokenTackles },
    { key: "brokenPerAtt", label: "Brk/att", align: "right", numeric: true, tooltip: "broken tackles per attempt", render: (r) => r.brokenPerAtt.toFixed(3) },
    { key: "yacPct", label: "YAC%", align: "right", numeric: true, sortValue: (r) => r.yacPct, render: (r) => <PercentileBar pct={r.yacPct} tone={rcYacTone(r)} /> },
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
    { key: "name", label: "Player", render: (r) => <span className="font-semibold text-ion-white">{r.name}</span> },
    { key: "team", label: "Tm", render: (r) => <span className="font-mono text-ion-1">{r.team}</span> },
    { key: "position", label: "Pos", render: (r) => <span className="font-mono text-ion-1">{r.position}</span> },
    { key: "routes", label: "Routes", align: "right", numeric: true, tooltip: "approximate routes run", render: (r) => r.routes },
    { key: "targets", label: "Tgt", align: "right", numeric: true, render: (r) => r.targets },
    { key: "tprr", label: "TPRR", align: "right", numeric: true, tooltip: "targets per route run", render: (r) => r.tprr.toFixed(3) },
    { key: "tprrPct", label: "TPRR%", align: "right", numeric: true, sortValue: (r) => r.tprrPct, render: (r) => <PercentileBar pct={r.tprrPct} /> },
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
        title="Who earns a target every time they run"
      />
      <DataTable
        rows={rr.rows}
        columns={columns}
        rowKey={(r) => r.playerId}
        showRank
        searchable
        searchAccessor={(r) => `${r.name} ${r.team}`}
        enumFilter={{ label: "Pos", options: [{ value: "WR", label: "WR" }, { value: "TE", label: "TE" }, { value: "RB", label: "RB" }], accessor: (r) => r.position }}
        rowTone={(r) => routeTone(r.signal)}
        initialSort={{ key: "tprr", dir: "desc" }}
        minWidth={820}
      />
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
    { key: "name", label: "Player", render: (r) => <span className="font-semibold text-ion-white">{r.name}</span> },
    { key: "team", label: "Tm", render: (r) => <span className="font-mono text-ion-1">{r.team}</span> },
    { key: "position", label: "Pos", render: (r) => <span className="font-mono text-ion-1">{r.position}</span> },
    { key: "rzCarries", label: "RZ Car", align: "right", numeric: true, tooltip: "red-zone carries (inside the 20)", render: (r) => r.rzCarries },
    { key: "rzTargets", label: "RZ Tgt", align: "right", numeric: true, tooltip: "red-zone targets (inside the 20)", render: (r) => r.rzTargets },
    { key: "inside5", label: "In-5", align: "right", numeric: true, tooltip: "carries + targets inside the 5", render: (r) => r.inside5 },
    { key: "rzShare", label: "RZ Share", align: "right", numeric: true, tooltip: "player's share of his team's scoring-zone looks", sortValue: (r) => r.rzShare, render: (r) => <ShareBar value={r.rzShare} /> },
    { key: "rzTds", label: "RZ TD", align: "right", numeric: true, tooltip: "scoring-zone touchdowns", render: (r) => r.rzTds },
    { key: "tdRate", label: "TD Rate", align: "right", numeric: true, sortValue: (r) => r.tdRate, render: (r) => <ShareBar value={r.tdRate} /> },
    { key: "expectedTdRate", label: "xTD Rate", align: "right", numeric: true, tooltip: "expected scoring-zone TD rate", sortValue: (r) => r.expectedTdRate, render: (r) => <ShareBar value={r.expectedTdRate} /> },
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
      />
      <DataTable
        rows={z.rows}
        columns={columns}
        rowKey={(r) => r.playerId}
        showRank
        searchable
        searchAccessor={(r) => `${r.name} ${r.team}`}
        enumFilter={{ label: "Pos", options: [{ value: "RB", label: "RB" }, { value: "WR", label: "WR" }, { value: "TE", label: "TE" }], accessor: (r) => r.position }}
        rowTone={(r) => scoringTone(r.signal)}
        initialSort={{ key: "rzShare", dir: "desc" }}
        minWidth={960}
      />
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
    { key: "team", label: "Tm", render: (r) => <span className="font-mono font-semibold text-ion-white">{r.team}</span> },
    { key: "offEpaPerPlay", label: "Off EPA", align: "right", numeric: true, tooltip: "offensive EPA per play", sortValue: (r) => r.offEpaPerPlay, render: (r) => <DivergingBar value={r.offEpaPerPlay} domain={0.3} digits={3} /> },
    { key: "offEpaPct", label: "Off%ile", align: "right", numeric: true, tooltip: "offensive EPA, ranked across the league", sortValue: (r) => r.offEpaPct, render: (r) => <PercentileBar pct={r.offEpaPct} /> },
    { key: "offSuccessRate", label: "Off SR", align: "right", numeric: true, tooltip: "offensive success rate", sortValue: (r) => r.offSuccessRate, render: (r) => <ShareBar value={r.offSuccessRate} /> },
    { key: "successRate", label: "SR (all)", align: "right", numeric: true, tooltip: "success rate over all offensive plays", sortValue: (r) => r.successRate ?? -1, render: (r) => <ShareBar value={r.successRate} /> },
    { key: "explosiveRate", label: "Explosive", align: "right", numeric: true, tooltip: "explosive-play rate", sortValue: (r) => r.explosiveRate ?? -1, render: (r) => <ShareBar value={r.explosiveRate} /> },
    { key: "thirdDownConvRate", label: "3rd Dn", align: "right", numeric: true, tooltip: "3rd-down conversion rate", sortValue: (r) => r.thirdDownConvRate ?? -1, render: (r) => <ShareBar value={r.thirdDownConvRate} /> },
    { key: "redZoneEpaPerPlay", label: "RZ EPA", align: "right", numeric: true, tooltip: "EPA per play inside the 20", sortValue: (r) => r.redZoneEpaPerPlay ?? Number.NEGATIVE_INFINITY, render: (r) => <DivergingBar value={r.redZoneEpaPerPlay} domain={0.5} digits={3} /> },
    { key: "defEpaPerPlay", label: "Def EPA", align: "right", numeric: true, tooltip: "defensive EPA per play (lower is better)", sortValue: (r) => r.defEpaPerPlay, render: (r) => <DivergingBar value={r.defEpaPerPlay} domain={0.3} digits={3} tone={signedTone(-r.defEpaPerPlay)} /> },
    { key: "defEpaPct", label: "Def%ile", align: "right", numeric: true, tooltip: "defensive EPA, ranked across the league", sortValue: (r) => r.defEpaPct, render: (r) => <PercentileBar pct={r.defEpaPct} /> },
    { key: "defSuccessRate", label: "Def SR", align: "right", numeric: true, tooltip: "defensive success rate (lower is better)", sortValue: (r) => r.defSuccessRate, render: (r) => <ShareBar value={r.defSuccessRate} /> },
    { key: "proe", label: "PROE", align: "right", numeric: true, tooltip: "pass rate over expected", sortValue: (r) => r.proe, render: (r) => <DivergingBar value={r.proe} domain={10} digits={1} /> },
    { key: "noHuddleRate", label: "Pace", align: "right", numeric: true, tooltip: "no-huddle rate", sortValue: (r) => r.noHuddleRate, render: (r) => pct(r.noHuddleRate) },
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
        title="The top-down team read"
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
        minWidth={1180}
      />
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
    { key: "team", label: "Tm", render: (r) => <span className="font-mono text-ion-1">{r.team}</span> },
    { key: "position", label: "Pos", render: (r) => <span className="font-mono text-ion-1">{r.position}</span> },
    { key: "outPlayer", label: "Out (vacating)", render: (r) => <span className="font-semibold text-ion-white">{r.outPlayer}</span> },
    { key: "vacatedTargets", label: "Vac Tgt", align: "right", numeric: true, tooltip: "trailing per-game targets the role vacates", render: (r) => r.vacatedTargets.toFixed(1) },
    { key: "vacatedCarries", label: "Vac Car", align: "right", numeric: true, tooltip: "trailing per-game carries the role vacates", render: (r) => r.vacatedCarries.toFixed(1) },
    { key: "beneficiary", label: "Beneficiary", render: (r) => <span className="text-ion-white">{r.beneficiary ?? "—"}</span> },
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
      />
      <DataTable
        rows={transfer.rows}
        columns={columns}
        rowKey={(r) => `${r.team}-${r.position}-${r.outPlayer}`}
        showRank
        searchable
        searchAccessor={(r) => `${r.team} ${r.outPlayer} ${r.beneficiary ?? ""}`}
        rowTone={(r) => transferTone(r.confidence)}
        minWidth={820}
      />
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
        <p className="font-mono text-xs leading-5 text-ion-2">{c.error ?? "UNKNOWN"}</p>
      </SourceError>
    );
  }
  const columns: Column<ClvBacktestRow>[] = [
    { key: "season", label: "Season", align: "right", numeric: true, render: (r) => r.season },
    { key: "week", label: "Wk", align: "right", numeric: true, render: (r) => r.week },
    { key: "game", label: "Game", render: (r) => <span className="font-semibold text-ion-white">{r.game}</span> },
    { key: "market", label: "Market", render: (r) => <span className="font-mono text-ion-1">{r.market}</span> },
    { key: "side", label: "Side", render: (r) => <span className="font-mono text-ion-white">{r.side}</span> },
    { key: "modelProb", label: "Model", align: "right", numeric: true, tooltip: "the model's probability for the side taken", sortValue: (r) => r.modelProb, render: (r) => prob(r.modelProb) },
    { key: "closingProb", label: "Close", align: "right", numeric: true, tooltip: "the closing line's probability", sortValue: (r) => r.closingProb, render: (r) => prob(r.closingProb) },
    { key: "clv", label: "CLV", align: "right", numeric: true, tooltip: "how much the model beat the close", sortValue: (r) => r.clv, render: (r) => <DivergingBar value={r.clv} domain={0.05} digits={4} tone={clvTone(r.clv)} /> },
    { key: "covered", label: "Covered", align: "center", tooltip: "did the side actually cover/win?", sortValue: (r) => (r.covered ? 1 : 0), render: (r) => <span className="font-mono text-ion-1">{r.covered ? "Yes" : "—"}</span> },
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WAIVER TRENDS (SLEEPER) — two side-by-side momentum tables (special)
// ─────────────────────────────────────────────────────────────────────────────

function trendColumns(kind: "adds" | "drops"): Column<TrendingRow>[] {
  const isAdds = kind === "adds";
  return [
    { key: "name", label: "Player", render: (r) => <span className="font-semibold text-ion-white">{r.name}</span> },
    { key: "position", label: "Pos", render: (r) => <span className="font-mono text-ion-1">{r.position}</span> },
    { key: "team", label: "Tm", render: (r) => <span className="font-mono text-ion-1">{r.team}</span> },
    {
      key: "count",
      label: isAdds ? "Adds" : "Drops",
      align: "right",
      numeric: true,
      tooltip: isAdds ? "leagues adding over the window" : "leagues dropping over the window",
      render: (r) => <span className={isAdds ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>{r.count.toLocaleString()}</span>,
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROOF / PREDICTIVENESS — 3 KPI cards + up to 3 stacked backtest tables (special)
// ─────────────────────────────────────────────────────────────────────────────

function ProofView({ p }: { p: PredictivenessProof }): JSX.Element {
  if (p.status === "source-error") {
    return <SourceError reason={p.error ?? "UNKNOWN"} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <SubHead kicker="Track record" title="Our record on the GSE Rating" />
      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Lift over the field"
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
          label="Buy-low hit-rate"
          value={pctNullable(p.overall.buyLowHitRate)}
          tone={hitRateTone(p.overall.buyLowHitRate)}
          sublabel="how often our buy-low calls rose"
        />
        <KpiCard
          label="Sell-high hit-rate"
          value={pctNullable(p.overall.sellHighHitRate)}
          tone={hitRateTone(p.overall.sellHighHitRate)}
          sublabel="how often our sell-high calls fell"
        />
      </section>
      {p.verdict ? <p className="max-w-3xl text-sm leading-6 text-ion-1">{p.verdict}</p> : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRENCHES — PFR advanced charting (pressure faced, coverage allowed, receiver
// depth/drops). Three stacked tables on one engine: QB pressure, coverage, and
// receiving charting. All new L2 fields are real PFR columns; absent ones read
// as an honest dash (the loader emits null / 0).
// ─────────────────────────────────────────────────────────────────────────────

// On-target rate is "accuracy is good"; a high pressure share is the QB under
// duress (neutral context, not a value call). RPO + play-action lean is scheme,
// shown as a tendency chip, not a buy/sell.
function paLeanLabel(r: QbPressureRow): string {
  const designed = r.rpoPlays + r.paPassAtt;
  if (designed >= 80) return "Scheme-heavy";
  if (designed >= 30) return "Some design";
  return "Pure dropback";
}

function qbPressureColumns(): Column<QbPressureRow>[] {
  return [
    { key: "name", label: "Player", render: (r) => <span className="font-semibold text-ion-white">{r.name}</span> },
    { key: "team", label: "Tm", render: (r) => <span className="font-mono text-ion-1">{r.team}</span> },
    { key: "games", label: "G", align: "right", numeric: true, tooltip: "games", render: (r) => r.games },
    {
      key: "pressurePct",
      label: "Press%",
      align: "right",
      numeric: true,
      tooltip: "share of dropbacks under pressure",
      sortValue: (r) => r.pressurePct,
      render: (r) => <ShareBar value={r.pressurePct} tone="bad" />,
    },
    {
      key: "pocketTime",
      label: "Pocket",
      align: "right",
      numeric: true,
      tooltip: "average time to throw or sack, in seconds",
      sortValue: (r) => r.pocketTime ?? -1,
      render: (r) => (r.pocketTime == null ? <span className="font-mono text-ion-2">—</span> : <span className="font-mono tabular-nums text-ion-white">{r.pocketTime.toFixed(2)}s</span>),
    },
    {
      key: "onTgtPct",
      label: "On-tgt%",
      align: "right",
      numeric: true,
      tooltip: "on-target throw rate",
      sortValue: (r) => r.onTgtPct ?? -1,
      render: (r) => <ShareBar value={r.onTgtPct} tone="good" />,
    },
    {
      key: "badThrowPct",
      label: "Bad%",
      align: "right",
      numeric: true,
      tooltip: "bad-throw rate",
      sortValue: (r) => r.badThrowPct,
      render: (r) => <ShareBar value={r.badThrowPct} tone="bad" />,
    },
    {
      key: "paPassAtt",
      label: "PA att",
      align: "right",
      numeric: true,
      tooltip: "play-action pass attempts",
      render: (r) => r.paPassAtt,
    },
    {
      key: "rpoPlays",
      label: "RPO",
      align: "right",
      numeric: true,
      tooltip: "run-pass-option plays",
      render: (r) => r.rpoPlays,
    },
    {
      key: "sacks",
      label: "Sk",
      align: "right",
      numeric: true,
      tooltip: "times sacked",
      render: (r) => r.sacks,
    },
    {
      key: "read",
      label: "The read",
      sortable: false,
      render: (r) => <SignalChip label={paLeanLabel(r)} tone="neutral" title="designed-play lean" />,
    },
  ];
}

function coverageColumns(): Column<CoverageRow>[] {
  return [
    { key: "name", label: "Player", render: (r) => <span className="font-semibold text-ion-white">{r.name}</span> },
    { key: "team", label: "Tm", render: (r) => <span className="font-mono text-ion-1">{r.team}</span> },
    { key: "targets", label: "Tgt", align: "right", numeric: true, tooltip: "targets into this defender's coverage", render: (r) => r.targets },
    {
      key: "passerRatingAllowed",
      label: "Rate allowed",
      align: "right",
      numeric: true,
      tooltip: "passer rating allowed when targeted (lower = lockdown)",
      sortValue: (r) => r.passerRatingAllowed,
      render: (r) => <span className="font-mono tabular-nums text-ion-white">{r.passerRatingAllowed.toFixed(1)}</span>,
    },
    {
      key: "adotAllowed",
      label: "ADOT",
      align: "right",
      numeric: true,
      tooltip: "average depth of target conceded",
      sortValue: (r) => r.adotAllowed ?? -1,
      render: (r) => (r.adotAllowed == null ? <span className="font-mono text-ion-2">—</span> : <span className="font-mono tabular-nums text-ion-1">{r.adotAllowed.toFixed(1)}</span>),
    },
    { key: "pressures", label: "Press", align: "right", numeric: true, tooltip: "pass-rush pressures", render: (r) => r.pressures },
    { key: "blitzes", label: "Blitz", align: "right", numeric: true, tooltip: "times blitzed", render: (r) => r.blitzes },
    { key: "hurries", label: "Hur", align: "right", numeric: true, tooltip: "hurries", render: (r) => r.hurries },
    { key: "qbKnockdowns", label: "QBKD", align: "right", numeric: true, tooltip: "QB knockdowns", render: (r) => r.qbKnockdowns },
    { key: "sacks", label: "Sk", align: "right", numeric: true, tooltip: "individual sacks", render: (r) => r.sacks },
    {
      key: "missedTacklePct",
      label: "MT%",
      align: "right",
      numeric: true,
      tooltip: "missed-tackle rate (lower is better)",
      sortValue: (r) => r.missedTacklePct,
      render: (r) => <ShareBar value={r.missedTacklePct} tone="bad" />,
    },
  ];
}

function receivingAdvancedColumns(): Column<ReceivingAdvancedRow>[] {
  return [
    { key: "name", label: "Player", render: (r) => <span className="font-semibold text-ion-white">{r.name}</span> },
    { key: "team", label: "Tm", render: (r) => <span className="font-mono text-ion-1">{r.team}</span> },
    { key: "targets", label: "Tgt", align: "right", numeric: true, tooltip: "targets", render: (r) => r.targets },
    { key: "receptions", label: "Rec", align: "right", numeric: true, tooltip: "receptions", render: (r) => r.receptions },
    {
      key: "adot",
      label: "ADOT",
      align: "right",
      numeric: true,
      tooltip: "average depth of target",
      sortValue: (r) => r.adot ?? -1,
      render: (r) => (r.adot == null ? <span className="font-mono text-ion-2">—</span> : <span className="font-mono tabular-nums text-ion-white">{r.adot.toFixed(1)}</span>),
    },
    { key: "drops", label: "Drops", align: "right", numeric: true, tooltip: "charted drops", render: (r) => r.drops },
    {
      key: "dropPct",
      label: "Drop%",
      align: "right",
      numeric: true,
      tooltip: "drop rate",
      sortValue: (r) => r.dropPct ?? -1,
      render: (r) => <ShareBar value={r.dropPct} tone="bad" />,
    },
    { key: "brokenTackles", label: "Brk", align: "right", numeric: true, tooltip: "broken tackles after the catch", render: (r) => r.brokenTackles },
    { key: "ybcPerRec", label: "YBC/rec", align: "right", numeric: true, tooltip: "yards before catch per reception", render: (r) => r.ybcPerRec.toFixed(2) },
    { key: "yacPerRec", label: "YAC/rec", align: "right", numeric: true, tooltip: "yards after catch per reception", render: (r) => r.yacPerRec.toFixed(2) },
    {
      key: "passerRatingWhenTargeted",
      label: "Rate tgt",
      align: "right",
      numeric: true,
      tooltip: "passer rating when this receiver is targeted",
      sortValue: (r) => r.passerRatingWhenTargeted ?? -1,
      render: (r) => (r.passerRatingWhenTargeted == null ? <span className="font-mono text-ion-2">—</span> : <span className="font-mono tabular-nums text-ion-1">{r.passerRatingWhenTargeted.toFixed(1)}</span>),
    },
  ];
}

function TrenchesView({ pc }: { pc: NflversePressureCoverage }): JSX.Element {
  if (pc.status === "source-error") {
    return <SourceError reason={pc.error ?? "UNKNOWN"} />;
  }
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <SubHead
          kicker={`QB pressure & pocket${pc.season ? ` · ${pc.season}` : ""}`}
          title="How much heat each QB takes — and how he handles it"
        />
        <DataTable
          rows={pc.qbPressure}
          columns={qbPressureColumns()}
          rowKey={(r) => r.playerId}
          showRank
          searchable
          searchAccessor={(r) => `${r.name} ${r.team}`}
          emptyTitle="No qualifying QB pressure rows for this season."
          initialSort={{ key: "pressurePct", dir: "desc" }}
          minWidth={1040}
        />
      </div>

      <div className="flex flex-col gap-3">
        <SubHead
          kicker="Coverage & pass rush"
          title="Who is throwable — and who gets home"
        />
        <DataTable
          rows={pc.coverage}
          columns={coverageColumns()}
          rowKey={(r) => r.playerId}
          showRank
          searchable
          searchAccessor={(r) => `${r.name} ${r.team}`}
          emptyTitle="No qualifying coverage rows for this season."
          initialSort={{ key: "passerRatingAllowed", dir: "asc" }}
          minWidth={1000}
        />
      </div>

      {pc.receivingAdvanced.length > 0 ? (
        <div className="flex flex-col gap-3">
          <SubHead
            kicker="Receiver charting"
            title="Average depth of target, drops, and YAC quality"
          />
          <DataTable
            rows={pc.receivingAdvanced}
            columns={receivingAdvancedColumns()}
            rowKey={(r) => r.playerId}
            showRank
            searchable
            searchAccessor={(r) => `${r.name} ${r.team}`}
            initialSort={{ key: "adot", dir: "desc" }}
            minWidth={1040}
          />
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAY DESIGN — FTN charting (2022+) joined to pbp identity. Per-QB and per-team
// play-call DNA: play-action / RPO / screen / motion / no-huddle / out-of-pocket
// rates + average blitzers faced. All rates are real charted ratios; a tendency
// chip flags the headline lean (no buy/sell — this is design context).
// ─────────────────────────────────────────────────────────────────────────────

const PA_HEAVY = 0.28; // a play-action rate at/above this is a heavy lean
const RPO_HEAVY = 0.12;
function playDesignLeanLabel(paRate: number, rpoRate: number): string {
  if (paRate >= PA_HEAVY && rpoRate >= RPO_HEAVY) return "PA + RPO heavy";
  if (paRate >= PA_HEAVY) return "Play-action heavy";
  if (rpoRate >= RPO_HEAVY) return "RPO heavy";
  return "Dropback-leaning";
}

function playDesignQbColumns(): Column<PlayDesignQbRow>[] {
  return [
    { key: "name", label: "Player", render: (r) => <span className="font-semibold text-ion-white">{r.name}</span> },
    { key: "team", label: "Tm", render: (r) => <span className="font-mono text-ion-1">{r.team}</span> },
    { key: "plays", label: "Plays", align: "right", numeric: true, tooltip: "charted dropbacks attributed to this QB", render: (r) => r.plays },
    { key: "playActionRate", label: "PA%", align: "right", numeric: true, tooltip: "play-action rate", sortValue: (r) => r.playActionRate, render: (r) => <ShareBar value={r.playActionRate} /> },
    { key: "rpoRate", label: "RPO%", align: "right", numeric: true, tooltip: "run-pass-option rate", sortValue: (r) => r.rpoRate, render: (r) => <ShareBar value={r.rpoRate} /> },
    { key: "screenRate", label: "Screen%", align: "right", numeric: true, tooltip: "screen-pass rate", sortValue: (r) => r.screenRate, render: (r) => <ShareBar value={r.screenRate} /> },
    { key: "motionRate", label: "Motion%", align: "right", numeric: true, tooltip: "pre-snap motion rate", sortValue: (r) => r.motionRate, render: (r) => <ShareBar value={r.motionRate} /> },
    { key: "outOfPocketRate", label: "OOP%", align: "right", numeric: true, tooltip: "QB out-of-pocket rate", sortValue: (r) => r.outOfPocketRate, render: (r) => <ShareBar value={r.outOfPocketRate} /> },
    {
      key: "avgBlitzersFaced",
      label: "Blitzers",
      align: "right",
      numeric: true,
      tooltip: "average blitzers faced per play",
      sortValue: (r) => r.avgBlitzersFaced ?? -1,
      render: (r) => (r.avgBlitzersFaced == null ? <span className="font-mono text-ion-2">—</span> : <span className="font-mono tabular-nums text-ion-white">{r.avgBlitzersFaced.toFixed(2)}</span>),
    },
    {
      key: "read",
      label: "The read",
      sortable: false,
      render: (r) => <SignalChip label={playDesignLeanLabel(r.playActionRate, r.rpoRate)} tone="neutral" title="play-design lean" />,
    },
  ];
}

function playDesignTeamColumns(): Column<PlayDesignTeamRow>[] {
  return [
    { key: "team", label: "Tm", render: (r) => <span className="font-mono font-semibold text-ion-white">{r.team}</span> },
    { key: "plays", label: "Plays", align: "right", numeric: true, tooltip: "charted offensive plays for this team", render: (r) => r.plays },
    { key: "playActionRate", label: "PA%", align: "right", numeric: true, tooltip: "team play-action rate", sortValue: (r) => r.playActionRate, render: (r) => <ShareBar value={r.playActionRate} /> },
    { key: "rpoRate", label: "RPO%", align: "right", numeric: true, tooltip: "team RPO rate", sortValue: (r) => r.rpoRate, render: (r) => <ShareBar value={r.rpoRate} /> },
    { key: "screenRate", label: "Screen%", align: "right", numeric: true, tooltip: "team screen rate", sortValue: (r) => r.screenRate, render: (r) => <ShareBar value={r.screenRate} /> },
    { key: "motionRate", label: "Motion%", align: "right", numeric: true, tooltip: "team pre-snap motion rate", sortValue: (r) => r.motionRate, render: (r) => <ShareBar value={r.motionRate} /> },
    { key: "noHuddleRate", label: "No-huddle%", align: "right", numeric: true, tooltip: "team no-huddle rate", sortValue: (r) => r.noHuddleRate, render: (r) => <ShareBar value={r.noHuddleRate} /> },
    { key: "outOfPocketRate", label: "OOP%", align: "right", numeric: true, tooltip: "team out-of-pocket rate", sortValue: (r) => r.outOfPocketRate, render: (r) => <ShareBar value={r.outOfPocketRate} /> },
    {
      key: "avgBlitzersFaced",
      label: "Blitz faced",
      align: "right",
      numeric: true,
      tooltip: "average blitzers the offense faced per play",
      sortValue: (r) => r.avgBlitzersFaced ?? -1,
      render: (r) => (r.avgBlitzersFaced == null ? <span className="font-mono text-ion-2">—</span> : <span className="font-mono tabular-nums text-ion-white">{r.avgBlitzersFaced.toFixed(2)}</span>),
    },
  ];
}

function PlayDesignView({ d }: { d: PlayDesign }): JSX.Element {
  if (d.status === "source-error") {
    return <SourceError reason={d.error ?? "UNKNOWN"} />;
  }
  if (d.qbs.length === 0 && d.teams.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <SubHead kicker={`Play design${d.season ? ` · ${d.season}` : ""}`} title="No charted play-design data for this season yet" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <SubHead
          kicker={`QB play design${d.season ? ` · ${d.season}` : ""}`}
          title="The play-call DNA behind every QB"
        />
        <DataTable
          rows={d.qbs}
          columns={playDesignQbColumns()}
          rowKey={(r) => r.playerId}
          showRank
          searchable
          searchAccessor={(r) => `${r.name} ${r.team}`}
          emptyTitle="No QB cleared the charted-play sample floor."
          initialSort={{ key: "playActionRate", dir: "desc" }}
          minWidth={980}
        />
      </div>

      {d.teams.length > 0 ? (
        <div className="flex flex-col gap-3">
          <SubHead
            kicker="Team play-design environment"
            title="Scheme tendencies, team by team"
          />
          <DataTable
            rows={d.teams}
            columns={playDesignTeamColumns()}
            rowKey={(r) => r.team}
            showRank
            searchable
            searchPlaceholder="Filter teams…"
            searchAccessor={(r) => r.team}
            initialSort={{ key: "playActionRate", dir: "desc" }}
            minWidth={980}
          />
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
    case "trenches":
      return <TrenchesView pc={data as NflversePressureCoverage} />;
    case "play-design":
      return <PlayDesignView d={data as PlayDesign} />;
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
