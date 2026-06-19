import Link from "next/link";

import {
  loadMarketAnalysis,
  type MarketAnalysisReport,
  type GameMarketAnalysis,
  type ConsensusBlock,
  MARKET_ANALYSIS_MIN_BOOKS,
} from "@/lib/cockpit/load-market-analysis";

/**
 * Cockpit · Market & Line Intelligence (Wave A internal workbench).
 *
 * Admin-only by virtue of the cockpit layout's ADMIN gate; INTERNAL, not public.
 * This is a DISPLAY-ONLY surface that wires dormant pure analytics/math libraries
 * (the line-movement classifier, key-number proximity, consensus median, robust
 * dispersion) onto the line-movement history WE ALREADY STORE — the multi-snapshot
 * Odds table — via the never-throw loader. It scores nothing, flips no gate,
 * changes no published pick, and NEVER calls the Odds API. Every figure traces to
 * stored Odds snapshots or to an explicit honest empty state.
 */
export const dynamic = "force-dynamic";

export default async function CockpitMarketAnalysisPage(): Promise<JSX.Element> {
  const { dataMode, loadedAtIso, note, report } = await loadMarketAnalysis();
  const live = dataMode === "live";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Market &amp; Line Intelligence · Internal
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Market Analysis Workbench</h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-ink-300 hover:bg-white/[0.03]"
          >
            Back to Jarvis
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-ink-400">
          A read-only workbench that runs the pure line-movement classifier and market analytics over
          the snapshot history we already store: SHARP / STEAM classification with reverse-line-movement,
          open→current line delta, multi-book consensus with robust dispersion, and NFL key-number
          proximity.{" "}
          <span className="text-ink-200">
            It reads only the stored Odds table — the paid Odds API is never called here.
          </span>{" "}
          It is decision-support, not a pick driver.
        </p>
        <p className="text-[11px] text-ink-600">
          Data mode: <DataModeBadge live={live} /> · loaded {new Date(loadedAtIso).toLocaleString("en-US")}
        </p>
        <p className="max-w-3xl text-[11px] leading-relaxed text-ink-600">
          Caveat: a game+market with fewer than 2 stored snapshots cannot show movement, so it is
          reported as awaiting ingestion rather than a fabricated stable read. Consensus below{" "}
          {MARKET_ANALYSIS_MIN_BOOKS} distinct books is flagged as thin. Key-number proximity is an
          NFL-spread heuristic, not a guarantee.
        </p>
      </header>

      {/* ── Headline counts ──────────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Game+market rows" value={String(report.totalRows)} />
        <Metric label="Classified (≥2 snaps)" value={String(report.classifiedRows)} />
        <Metric label="Steam / Sharp" value={`${report.steamRows} / ${report.sharpRows}`} />
        <Metric label="Reverse moves" value={String(report.reverseRows)} />
      </section>

      <StatusBanner report={report} live={live} note={note} />

      {report.games.length === 0 ? (
        <EmptyState live={live} />
      ) : (
        <GameTable games={report.games} />
      )}

      <p className="text-[11px] text-ink-600">
        Internal operator surface — admin-gated, display-only. No fabricated numbers: every figure is
        read from the stored Odds snapshots or shown as an explicit empty state. Classification
        confidence is the classifier&apos;s own read on the move, not a win probability. This surface
        never re-scores a pick, never flips a gate, and never calls the Odds API.
      </p>
    </div>
  );
}

// ── Status banner ───────────────────────────────────────────────────────────────

function StatusBanner({
  report,
  live,
  note,
}: {
  readonly report: MarketAnalysisReport;
  readonly live: boolean;
  readonly note: string;
}): JSX.Element {
  return (
    <section className="rounded-lg border border-sky-700/40 bg-sky-950/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-sky-700/60 bg-sky-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sky-300">
            Coverage
          </span>
          <span className="font-mono text-sm font-semibold text-sky-100">
            {report.classifiedRows} / {report.totalRows} rows classified
          </span>
        </div>
        <span className="font-mono text-xs text-sky-200/80">
          {report.thinConsensusRows} thin-consensus
        </span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-sky-100/90">{note}</p>
      {!live && (
        <p className="mt-3 text-[11px] font-semibold text-sky-300">
          Database unreachable / stub mode — this is an honest-empty report. Restore the connection to
          populate it. The Odds API is never called from this surface.
        </p>
      )}
    </section>
  );
}

function EmptyState({ live }: { readonly live: boolean }): JSX.Element {
  return (
    <section className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-4">
      <h2 className="text-sm font-semibold text-white">No recent Odds snapshots</h2>
      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-ink-400">
        {live
          ? "The database is reachable but holds no stored Odds snapshots for recent games. Line-movement " +
            "intelligence appears here once the ingestion job has persisted ≥2 snapshots over time for a " +
            "game+market. Nothing here calls the paid Odds API."
          : "The database is unreachable or in stub mode, so no Odds snapshots could be read. This is an " +
            "honest-empty report, not an error."}
      </p>
    </section>
  );
}

// ── Game table ─────────────────────────────────────────────────────────────────────

function GameTable({ games }: { readonly games: readonly GameMarketAnalysis[] }): JSX.Element {
  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Per game + market</h2>
        <p className="mt-1 max-w-3xl text-xs text-ink-500">
          One row per game+market over the recent slate. Movement is classified from the consensus line
          series; consensus and dispersion are the median and median-absolute-deviation across the
          latest snapshot&apos;s books. Rows awaiting ingestion are shown honestly, not hidden.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-titanium/30 text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-ink-500">
            <tr>
              <th className="px-4 py-3">Matchup</th>
              <th className="px-4 py-3">Market</th>
              <th className="px-4 py-3">Snaps</th>
              <th className="px-4 py-3">Classification</th>
              <th className="px-4 py-3">Open→now</th>
              <th className="px-4 py-3">Consensus</th>
              <th className="px-4 py-3">Books (MAD)</th>
              <th className="px-4 py-3">Key #</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-titanium/30">
            {games.map((g) => (
              <tr key={`${g.gameId}-${g.market}`} className="align-top text-ink-300">
                <td className="px-4 py-3">
                  <span className="block font-mono text-xs text-white">{g.matchup}</span>
                  <span className="text-[10px] uppercase tracking-wide text-ink-600">
                    {g.sport ?? "unknown"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{g.market}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono">{g.snapshotCount}</td>
                <td className="px-4 py-3">
                  {g.classification === null ? (
                    <span className="text-[11px] text-ink-500">{g.insufficientNote}</span>
                  ) : (
                    <ClassificationCell g={g} />
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                  <OpenToNow g={g} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                  {formatLine(g.consensus.consensus)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                  <ConsensusBooks consensus={g.consensus} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                  <KeyNumberCell g={g} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ClassificationCell({ g }: { readonly g: GameMarketAnalysis }): JSX.Element {
  const c = g.classification;
  if (c === null) return <span className="text-ink-500">—</span>;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <TypeBadge type={c.type} />
        {c.isReverse && (
          <span className="rounded border border-fuchsia-500/30 bg-fuchsia-950/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-fuchsia-200">
            reverse
          </span>
        )}
        <span className="font-mono text-[10px] text-ink-500">
          conf {(c.confidence * 100).toFixed(0)}%
        </span>
      </div>
      <span className="max-w-xs text-[10px] leading-snug text-ink-600">{c.reason}</span>
    </div>
  );
}

function TypeBadge({ type }: { readonly type: string }): JSX.Element {
  const palette: Record<string, string> = {
    STEAM: "border-amber-500/40 bg-amber-950/40 text-amber-200",
    SHARP: "border-emerald-500/40 bg-emerald-950/40 text-emerald-200",
    REVERSE: "border-fuchsia-500/40 bg-fuchsia-950/40 text-fuchsia-200",
    NOISE: "border-white/10 bg-white/[0.03] text-ink-400",
    STABLE: "border-white/10 bg-white/[0.03] text-ink-400",
    UNKNOWN: "border-white/10 bg-white/[0.03] text-ink-500",
  };
  const cls = palette[type] ?? palette["UNKNOWN"];
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${cls}`}>
      {type}
    </span>
  );
}

function OpenToNow({ g }: { readonly g: GameMarketAnalysis }): JSX.Element {
  const value = g.market === "TOTALS" ? g.openToCurrentTotal : g.openToCurrentSpread;
  if (value === null) return <span className="text-ink-600">—</span>;
  return <span className={value === 0 ? "text-ink-400" : "text-white"}>{formatSigned(value)}</span>;
}

function ConsensusBooks({ consensus }: { readonly consensus: ConsensusBlock }): JSX.Element {
  if (consensus.bookCount === 0) return <span className="text-ink-600">—</span>;
  return (
    <span className={consensus.thin ? "text-amber-300/80" : "text-ink-300"}>
      {consensus.bookCount}
      {consensus.thin ? " (thin)" : ""}
      {consensus.mad !== null ? ` · MAD ${consensus.mad.toFixed(2)}` : ""}
    </span>
  );
}

function KeyNumberCell({ g }: { readonly g: GameMarketAnalysis }): JSX.Element {
  if (g.keyNumber === null) return <span className="text-ink-600">—</span>;
  const k = g.keyNumber;
  if (k.nearKeyNumber && k.keyNumber !== null) {
    return (
      <span className="text-sky-200">
        near {k.keyNumber} (Δ{k.distanceFromKey.toFixed(1)})
      </span>
    );
  }
  return (
    <span className="text-ink-500">
      {k.keyNumber !== null ? `${k.keyNumber} (Δ${k.distanceFromKey.toFixed(1)})` : "—"}
    </span>
  );
}

// ── shared primitives ───────────────────────────────────────────────────────────

function DataModeBadge({ live }: { readonly live: boolean }): JSX.Element {
  return live ? (
    <span className="rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
      live
    </span>
  ) : (
    <span className="rounded-md border border-red-500/30 bg-red-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-200">
      unavailable
    </span>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-obsidian/60 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function formatLine(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toFixed(1);
}

function formatSigned(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}
