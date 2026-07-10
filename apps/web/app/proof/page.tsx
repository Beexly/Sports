/**
 * /proof — Proof of Record
 *
 * Every settled pick's verifiable trail: the engine's generation-time hash,
 * the Merkle leaf and root, the no-after-the-fact-editing guarantee in plain
 * language, and the consensus/divergence read where captured multi-book
 * data supports it.
 *
 * Voice: the desk — direct, no marketing. See lib/voice/analyst-standard.ts.
 * Design idiom: matches /performance and /accountability (surface-card,
 * eyebrow, NUMERIC_TEXT_CLASS, honest empty state).
 *
 * Source commitment: docs/strategy/repo-firehose-review.md build-queue #6.
 * Engine primitive: packages/prediction-engine/src/proof-of-record.ts.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import {
  NUMERIC_TEXT_CLASS,
  STAT_PLACEHOLDER,
  formatCount,
  formatRatioAsPercent,
} from "@/lib/format/stat";
import { BRAND_NAME } from "@/lib/brand";
import { loadProofOfRecord } from "@/lib/proof/load-proof-of-record";
import type { ProofPickRow } from "@/lib/proof/load-proof-of-record";
import { GeneratedPlate } from "@/components/immersive/generated-plate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Proof of Record · ${BRAND_NAME}`,
  description:
    "Every settled pick carries a tamper-evident Merkle hash stamped at generation time. The record can't be edited after the fact without the hash changing. This page shows the verifiable trail.",
  alternates: { canonical: "/proof" },
  openGraph: {
    title: `Proof of Record · ${BRAND_NAME}`,
    description:
      "Merkle-hash trail for every settled pick. Generated-at vs settled-at, no-after-the-fact-editing guarantee, consensus/divergence read where multi-book data supports it.",
    url: "/proof",
    type: "website",
  },
};

// ── Result badge ──────────────────────────────────────────────────────────────

function resultClass(result: ProofPickRow["result"]): string {
  switch (result) {
    case "WIN":
      return "text-orbital-cyan";
    case "LOSS":
      return "text-alert";
    case "PUSH":
      return "text-ion-2";
    case "VOID":
      return "text-ion-3";
  }
}

// ── CLV verdict display ───────────────────────────────────────────────────────

function clvLabel(verdict: string | null): string {
  if (!verdict) return STAT_PLACEHOLDER;
  switch (verdict) {
    case "BEAT_CLOSE":
      return "Beat close";
    case "MATCHED_CLOSE":
      return "Matched close";
    case "LOST_TO_CLOSE":
      return "Lost to close";
    default:
      return verdict;
  }
}

function clvClass(verdict: string | null): string {
  if (!verdict) return "text-ion-3";
  if (verdict === "BEAT_CLOSE") return "text-orbital-cyan";
  if (verdict === "MATCHED_CLOSE") return "text-ion-2";
  return "text-caution";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProofOfRecordPage() {
  let board: Awaited<ReturnType<typeof loadProofOfRecord>>;
  try {
    board = await loadProofOfRecord();
  } catch {
    // Surface a safe error state rather than throwing to Next.js error boundary.
    board = {
      generatedAt: new Date().toISOString(),
      picks: [],
      merkleRoot: "",
      totalSettled: 0,
    };
  }

  const isEmpty = board.picks.length === 0;

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-carbon">
      <GeneratedPlate assetId="proof-crystal" className="-z-10 opacity-20" />
      <Nav />

      <main id="main-content" className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">

          {/* ── Header ── */}
          <header className="border-b border-mineral pb-10">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-orbital-cyan">
              Proof of Record
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-ion-white sm:text-5xl">
              The record can&apos;t be rewritten.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              Every pick is hashed at generation time using a Merkle tree,
              the same tamper-evident commitment scheme used in public proof-of-
              liabilities systems. Once settled, the leaf hash is fixed. Edit
              the pick and the hash changes. Anyone with the raw records can
              re-derive the root and spot the difference.
            </p>
            <p className="mt-3 text-sm text-ion-2">
              This is not a promise. It is a mechanism. The math enforces it.
            </p>
          </header>

          {/* ── How it works ── */}
          <section
            data-testid="proof-how-it-works"
            className="mt-10 rounded-2xl border border-mineral bg-eclipse/50 p-6"
          >
            <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-ion-2">
              How the commitment works
            </h2>
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <dt className="font-semibold text-ion-white">Generation-time hash</dt>
                <dd className="text-ion-1 leading-6">
                  At the moment a pick is written, the engine serializes the
                  committed fields (id, pick type, selection, line, confidence,
                  model version, generated-at) and hashes them with SHA-256.
                  That hash is the leaf.
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="font-semibold text-ion-white">Merkle root</dt>
                <dd className="text-ion-1 leading-6">
                  All settled pick leaves combine into a Merkle tree. The root
                  summarizes the entire committed set in a single 64-character
                  hex string. Change one pick and the root changes.
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="font-semibold text-ion-white">Inclusion proof</dt>
                <dd className="text-ion-1 leading-6">
                  Each pick carries a Merkle path: the minimum set of sibling
                  hashes needed to re-derive the root from just that leaf. You
                  can verify any pick was in the committed set without trusting
                  us.
                </dd>
              </div>
            </dl>
          </section>

          {/* ── Merkle root banner ── */}
          {!isEmpty && board.merkleRoot && (
            <section
              data-testid="proof-root-banner"
              className="mt-6 rounded-2xl border border-titanium bg-eclipse/60 px-6 py-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-ion-2">
                    Committed Merkle root
                  </p>
                  <p className="mt-1 text-[11px] text-ion-3">
                    Over{" "}
                    <span className={NUMERIC_TEXT_CLASS}>
                      {formatCount(board.totalSettled)}
                    </span>{" "}
                    settled canonical picks · computed{" "}
                    {new Date(board.generatedAt).toUTCString()}
                  </p>
                </div>
                <code
                  className={`break-all rounded bg-titanium px-3 py-2 font-mono text-[11px] text-ion-1 ${NUMERIC_TEXT_CLASS}`}
                >
                  {board.merkleRoot}
                </code>
              </div>
            </section>
          )}

          {/* ── Freshness stamp (always shown) ── */}
          <p
            data-testid="proof-freshness-stamp"
            className={`mt-4 text-[11px] text-ion-3 ${NUMERIC_TEXT_CLASS}`}
          >
            Board generated {new Date(board.generatedAt).toUTCString()}
            {!isEmpty && (
              <> · {formatCount(board.totalSettled)} settled picks in the ledger</>
            )}
          </p>

          {/* ── Empty state ── */}
          {isEmpty && (
            <section
              data-testid="proof-empty-state"
              className="mt-10 rounded-2xl border border-mineral bg-eclipse/30 px-6 py-12 text-center"
            >
              <p className="text-base font-semibold text-ion-white">
                The record starts when the first pick settles.
              </p>
              <p className="mt-3 text-sm leading-6 text-ion-1">
                No canonical settled picks exist yet. This page will populate
                automatically once picks move from pending to settled. Every
                outcome, win or loss, appears here with its hash and trail.
                Nothing is hidden once it settles.
              </p>
              <p className="mt-4 text-[11px] text-ion-3">
                Bootstrap-era picks are excluded by design. They do not get to
                inflate the ledger.
              </p>
              <Link
                href="/accountability"
                className="mt-6 inline-block rounded-lg border border-orbital-cyan/40 px-4 py-2 text-sm font-semibold text-orbital-cyan hover:bg-orbital-cyan/10"
              >
                Back to accountability
              </Link>
            </section>
          )}

          {/* ── Pick ledger ── */}
          {!isEmpty && (
            <section className="mt-8">
              <div className="overflow-hidden rounded-2xl border border-mineral bg-gradient-to-br from-eclipse to-carbon">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mineral px-6 py-4">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-ion-2">
                      Settled pick ledger
                    </h2>
                    <p className="mt-1 text-[11px] text-ion-2">
                      Every outcome included: wins, losses, pushes, voids. None
                      quietly removed. Each row carries its Merkle leaf index and
                      the hashed committed payload.
                    </p>
                  </div>
                  <span
                    className={`text-[11px] uppercase tracking-widest text-ion-2 ${NUMERIC_TEXT_CLASS}`}
                  >
                    {formatCount(board.picks.length)} of{" "}
                    {formatCount(board.totalSettled)} shown
                  </span>
                </div>

                <ul className="divide-y divide-titanium/60">
                  {board.picks.map((row) => (
                    <PickLedgerRow key={row.id} row={row} />
                  ))}
                </ul>

                <div className="border-t border-mineral px-6 py-3">
                  <p className="text-[11px] leading-relaxed text-ion-2">
                    Leaf index is the pick&apos;s position in the committed set
                    (settled-at descending, id ascending as tiebreaker). The
                    committed payload is the SHA-256 hash of id + pick type +
                    selection + line + confidence + model version +
                    generated-at: the fields locked at creation. The consensus
                    read comes from captured multi-book H2H odds; it is market
                    description, not a model claim.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ── The guarantee in plain language ── */}
          <section className="mt-10 border-t border-mineral pt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-ion-2">
              The no-after-the-fact-editing guarantee
            </h2>
            <ul className="flex flex-col gap-2 text-sm leading-6 text-ion-1">
              {[
                "Each pick's committed fields are hashed at generation time, before the game is played.",
                "The hash covers id, pick type, selection, line, confidence score, model version, and the exact generated-at timestamp.",
                "The Merkle root over all settled picks is published on this page. Anyone can re-derive it.",
                "If any pick were altered retroactively, changing the confidence or selection, the leaf hash would change, breaking the root.",
                "Bootstrap-era picks and seed data are excluded from the committed set by design.",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-orbital-cyan"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ── Funnel close: the record IS the product demo ── */}
          <section
            data-testid="proof-funnel-close"
            className="mt-10 rounded-2xl border border-plasma/30 bg-plasma/[0.06] px-6 py-8"
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-plasma">
              The same receipts run the live board
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ion-white">
              Everything on this page was sealed before kickoff. Today&apos;s
              picks carry the same seal.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ion-1">
              Free shows two picks a day with the public Edge Index. Pro opens
              the full board — every sealed pick, its confidence score, and the
              factor trail behind it. The record above is what you&apos;re
              buying: not louder claims, more receipts.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href="/pricing" className="btn btn-primary whitespace-nowrap">
                See plans
              </Link>
              <Link
                href="/picks"
                className="text-sm font-semibold text-orbital-cyan hover:text-ion-white"
              >
                Today&apos;s board →
              </Link>
              <Link
                href="/verify"
                className="text-sm font-semibold text-orbital-cyan hover:text-ion-white"
              >
                Check a receipt →
              </Link>
            </div>
          </section>

          <div className="mt-8">
            <RiskDisclosure variant="compact" className="text-center" />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ── Sub-component: single ledger row ─────────────────────────────────────────

function PickLedgerRow({ row }: { row: ProofPickRow }) {
  const matchup = `${row.awayTeamName} @ ${row.homeTeamName}`;
  const dateStr = row.settledAt
    ? new Date(row.settledAt).toISOString().slice(0, 10)
    : "—";

  return (
    <li
      data-testid="proof-ledger-row"
      className="grid gap-2 px-6 py-4 sm:grid-cols-[1fr_auto]"
    >
      {/* Left column: pick identity */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ion-white">{matchup}</span>
          <span className="text-[10px] uppercase tracking-wider text-ion-2">
            {row.sport}
          </span>
          <span
            className={`text-sm font-bold ${NUMERIC_TEXT_CLASS} ${resultClass(row.result)}`}
          >
            {row.result}
          </span>
        </div>

        <p className={`mt-1 text-[11px] text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
          {row.pickType} · {row.selection} · line {row.line > 0 ? "+" : ""}
          {row.line} · conf{" "}
          <span className="text-ion-1">{row.confidence}</span> ·{" "}
          <abbr
            title="Model version that produced this pick"
            className="no-underline"
          >
            {row.modelVersion}
          </abbr>
        </p>

        <p className={`mt-1 text-[11px] text-ion-3 ${NUMERIC_TEXT_CLASS}`}>
          Generated {new Date(row.generatedAt).toUTCString()} · Settled{" "}
          {dateStr}
        </p>

        {/* CLV verdict */}
        <p className="mt-1 text-[11px]">
          <span className="text-ion-3">CLV: </span>
          <span className={`${clvClass(row.clvVerdict)} ${NUMERIC_TEXT_CLASS}`}>
            {clvLabel(row.clvVerdict)}
            {row.clvValue !== null && row.clvVerdict
              ? ` (${row.clvValue > 0 ? "+" : ""}${row.clvValue.toFixed(1)})`
              : ""}
          </span>
        </p>

        {/* Consensus read where available */}
        {row.consensusAtSettle !== null && (
          <p className={`mt-1 text-[11px] text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
            Market consensus at settle ·{" "}
            {formatCount(row.consensusAtSettle.bookCount)} books ·{" "}
            Home {formatRatioAsPercent(row.consensusAtSettle.fairHomeProb)} ·
            Away {formatRatioAsPercent(row.consensusAtSettle.fairAwayProb)}
            {row.modelVsMarketPp !== null && (
              <span className="ml-1">
                · model vs market{" "}
                <span
                  className={
                    row.modelVsMarketPp >= 0 ? "text-orbital-cyan" : "text-caution"
                  }
                >
                  {row.modelVsMarketPp > 0 ? "+" : ""}
                  {row.modelVsMarketPp}pp
                </span>
              </span>
            )}
          </p>
        )}
      </div>

      {/* Right column: leaf hash + index */}
      <div className="flex flex-col items-end gap-1 text-right">
        <p className={`text-[10px] font-semibold uppercase tracking-widest text-ion-3`}>
          Leaf {formatCount(row.leafIndex)}
        </p>
        <code
          className={`max-w-[200px] truncate rounded bg-titanium px-2 py-1 font-mono text-[10px] text-ion-1 ${NUMERIC_TEXT_CLASS}`}
          title={row.leafHash}
        >
          {row.leafHash.slice(0, 12)}…
        </code>
      </div>
    </li>
  );
}
