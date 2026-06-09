import type { Metadata } from "next";
import Link from "next/link";
import { IntelligenceSubnav } from "@/components/intelligence/intelligence-subnav";
import { Atmosphere } from "@/components/ui/atmosphere";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { PageHero } from "@/components/ui/page-hero";
import { SourceError } from "@/components/ui/source-error";
import { UpsellGate } from "@/components/ui/upsell-gate";
import { Reveal } from "@/components/motion/reveal";
import { AmbientGlow, SignatureGrid } from "@/components/motion/signature-grid";
import { clamp, DivergingBar, ShareBar, SignalChip } from "@/components/ui/dataviz";
import { canAccess, getViewerTier } from "@/lib/access";
import { loadEdgeBoard, type EdgeBoard, type EdgeRow } from "@/lib/intelligence/edge-board";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // fuses five heavy nflverse loads into one board — needs headroom

export const metadata: Metadata = {
  title: "The Edge Board — where our datasets disagree the loudest",
  description:
    "One ranked board of the strongest cross-dataset divergences in the NFL player pool: process over production (buy-low), production over process (sell-high), tracking over the box score, and vacated roles. Real, settled signals fused — not a projection.",
  alternates: { canonical: "/intelligence/edges" },
};

// FREE viewers see the strongest few edges in full; the rest of the ranked board
// is blurred behind the PRO gate. The line lives here as one constant.
const FREE_EDGE_COUNT = 5;

/**
 * One edge row, rendered as an editorial data-viz line: a SignalChip for the
 * type, a DivergingBar (buy/sell) or ShareBar (role) for magnitude, the player,
 * and the one-line real-driver reason. Pure presentational — server-safe.
 */
function EdgeLine({ edge, rank }: { edge: EdgeRow; rank: number }): JSX.Element {
  const isRole = edge.direction === "role";
  return (
    <li className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 border-b border-surface-line px-4 py-3.5 last:border-b-0 sm:grid-cols-[2rem_minmax(0,1fr)_auto]">
      {/* Rank */}
      <span className="font-mono text-sm tabular-nums text-ion-2 pt-0.5">{rank}</span>

      {/* Player + reason */}
      <div className="min-w-0 flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-ion-white">{edge.player}</span>
          <span className="font-mono text-xs text-ion-2">
            {edge.team || "—"} · {edge.position || "—"}
          </span>
          <SignalChip label={edge.label} tone={edge.tone} title={edge.source} />
        </div>
        <p className="text-sm leading-6 text-ion-1">{edge.reason}</p>
      </div>

      {/* Magnitude — diverging bar for buy/sell, share bar for a role workload. */}
      <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end sm:justify-start sm:gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ion-2">
          {isRole ? "Role" : "Edge"}
        </span>
        {edge.type === "vacated-role" ? (
          // Vacated-role `signed` is a per-game COUNT (targets+carries), not a share —
          // fill the bar against its own domain and label it with the real count, so
          // the bar never reads as a bogus "100%". (snap-surge below is a true share.)
          <ShareBar
            value={clamp(edge.signed / edge.signedDomain, 0, 1)}
            tone={edge.tone}
            widthPx={72}
            format={() => `${edge.signed.toFixed(1)} t+c/g`}
          />
        ) : isRole ? (
          <ShareBar value={edge.signed} tone={edge.tone} widthPx={64} />
        ) : (
          <DivergingBar value={edge.signed} domain={edge.signedDomain} tone={edge.tone} digits={2} />
        )}
      </div>
    </li>
  );
}

/** A bordered card wrapping a list of edge rows. */
function EdgeList({ edges, startRank = 1 }: { edges: readonly EdgeRow[]; startRank?: number }): JSX.Element {
  return (
    <ol className="overflow-hidden rounded-ds-md border border-surface-line bg-surface-raised">
      {edges.map((edge, i) => (
        <EdgeLine key={edge.key} edge={edge} rank={startRank + i} />
      ))}
    </ol>
  );
}

/** Provenance + legend strip — which sources loaded, and how many edges each fed. */
function ProvenanceStrip({ board }: { board: EdgeBoard }): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-ion-2">
        Fused from {board.sources.filter((s) => s.status === "live").length} live sources
        {board.season ? ` · ${board.season}` : ""}
        {board.throughWeek ? ` · through Wk ${board.throughWeek}` : ""}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {board.sources.map((s) => (
          <span
            key={s.key}
            className={
              s.status === "live"
                ? "inline-flex items-center gap-1.5 rounded-full border border-surface-line bg-surface-sunken px-2.5 py-0.5 font-mono text-xs text-ion-1"
                : "inline-flex items-center gap-1.5 rounded-full border border-surface-line bg-surface-sunken px-2.5 py-0.5 font-mono text-xs text-ion-2"
            }
            title={s.status === "live" ? `${s.contributed} edges` : "source unavailable"}
          >
            <span aria-hidden className={s.status === "live" ? "text-emerald-400" : "text-rose-400"}>
              {s.status === "live" ? "●" : "○"}
            </span>
            {s.label}
            {s.status === "live" ? <span className="text-ion-2">·{s.contributed}</span> : null}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The ranked Edge Board.
 *
 * Unlocked (PRO/ELITE/ADMIN) viewers get the whole ranked list. FREE viewers see
 * the strongest FREE_EDGE_COUNT edges in full, then the remainder rendered through
 * the SAME EdgeList but wrapped in an UpsellGate — blurred shape under glass with
 * an Unlock-with-PRO CTA. Honest empty state when nothing diverged.
 */
function EdgeBoardView({ board, unlocked }: { board: EdgeBoard; unlocked: boolean }): JSX.Element {
  if (board.edges.length === 0) {
    return (
      <SourceError
        kicker="No edges"
        title="Nothing is diverging loudly right now."
        reason="Our datasets loaded, but none of them disagree enough to flag an edge. We show an empty board rather than manufacture noise — check back as the slate moves."
      >
        <ProvenanceStrip board={board} />
      </SourceError>
    );
  }

  if (unlocked) {
    return (
      <div className="flex flex-col gap-4">
        <ProvenanceStrip board={board} />
        <EdgeList edges={board.edges} />
      </div>
    );
  }

  const free = board.edges.slice(0, FREE_EDGE_COUNT);
  const gated = board.edges.slice(FREE_EDGE_COUNT);

  return (
    <div className="flex flex-col gap-6">
      <ProvenanceStrip board={board} />
      <EdgeList edges={free} />

      {gated.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-orbital-cyan">
              The full board
            </p>
            <h2 className="text-xl font-semibold text-ion-white">
              {gated.length} more edges, ranked.
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-ion-1">
              You're seeing the five loudest divergences. The complete ranked board — every cross-dataset
              edge we surface — is part of PRO.
            </p>
          </div>
          <UpsellGate locked tier="PRO" label="the full ranked edge board">
            <EdgeList edges={gated} startRank={FREE_EDGE_COUNT + 1} />
          </UpsellGate>
        </div>
      ) : null}
    </div>
  );
}

/**
 * /intelligence/edges — the Edge Board.
 *
 * The meta-surface across every dataset we ingest: one ranked list of the
 * strongest cross-dataset divergences (process vs production, expected vs actual,
 * tracking vs box score, vacated roles, elevated workloads). The board reuses the
 * canonical loaders untouched and fuses their already-honest signals; FREE sees
 * the top few edges, the full ranked board sits behind a PRO gate. Aligned to the
 * premium dark motion look (ambient glow + signature grid + scroll reveals), with
 * an honest source-error / empty state. No projections — settled reads only.
 */
export default async function EdgesPage(): Promise<JSX.Element> {
  const [tier, boardResult] = await Promise.all([
    getViewerTier(),
    loadEdgeBoard().then(
      (value) => ({ ok: true as const, value }),
      (reason) => ({ ok: false as const, reason }),
    ),
  ]);
  const unlocked = canAccess(tier, "PRO");

  let body: JSX.Element;
  if (!boardResult.ok) {
    body = (
      <SourceError
        kicker="Source error"
        title="The Edge Board isn't loading right now."
        reason={`The board fuses live nflverse data and it couldn't be reached. ${
          boardResult.reason instanceof Error ? boardResult.reason.message : "UNKNOWN"
        }`}
      />
    );
  } else if (boardResult.value.status === "source-error") {
    body = (
      <SourceError
        kicker="Source error"
        title="The Edge Board is intentionally empty."
        reason="Every underlying source is unavailable right now. We show an empty board rather than fabricate divergences — check back shortly."
      >
        <p className="font-mono text-xs leading-5 text-ion-2">{boardResult.value.error ?? "UNKNOWN"}</p>
      </SourceError>
    );
  } else {
    body = <EdgeBoardView board={boardResult.value} unlocked={unlocked} />;
  }

  return (
    <div className="min-h-screen bg-surface-base text-ion-white">
      <Atmosphere />
      <Nav />
      <IntelligenceSubnav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-ds-lg">
            <AmbientGlow className="-z-10" />
            <SignatureGrid className="-z-10" opacity={0.1} rotate />
            <div className="relative z-10">
              <PageHero
                variant="dark"
                eyebrow="The Edge Board"
                title="Where our datasets disagree the loudest."
                description={
                  <>
                    Every other read answers one question against one lens. This is the meta-board: across
                    the GSE Rating, expected points, NGS tracking, vacated roles, and snap workloads, we
                    rank the strongest divergences — process over production (buy low), production over
                    process (sell high), tracking the box score hasn't paid, and volume the market hasn't
                    repriced. Real, settled signals fused. Not a projection.
                  </>
                }
                actions={
                  <Link
                    href="/intelligence/rating"
                    className="inline-flex min-h-9 items-center justify-center rounded-ds-sm border border-surface-line px-3 py-2 text-xs font-semibold text-ion-2 hover:text-ion-white hover:border-surface-line-strong"
                  >
                    See the GSE Rating
                  </Link>
                }
              />
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <section className="flex min-w-0 flex-col gap-6" aria-label="Edge Board">
            {body}
          </section>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}
