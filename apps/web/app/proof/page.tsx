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
import { BRAND_NAME, BRAND_COLORS } from "@/lib/brand";
import { loadProofOfRecord } from "@/lib/proof/load-proof-of-record";
import type { ProofPickRow } from "@/lib/proof/load-proof-of-record";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { Reveal } from "@/components/motion/reveal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Proof of Record — ${BRAND_NAME}`,
  description:
    "Every settled pick carries a tamper-evident Merkle hash stamped at generation time. The record can't be edited after the fact without the hash changing. This page shows the verifiable trail.",
  alternates: { canonical: "/proof" },
  openGraph: {
    title: `Proof of Record — ${BRAND_NAME}`,
    description:
      "Merkle-hash trail for every settled pick. Generated-at vs settled-at, no-after-the-fact-editing guarantee, consensus/divergence read where multi-book data supports it.",
    url: "/proof",
    type: "website",
  },
};

// ── Result badge ──────────────────────────────────────────────────────────────

function resultHexColor(result: ProofPickRow["result"]): string {
  switch (result) {
    case "WIN":
      return BRAND_COLORS.orbitalCyan;
    case "LOSS":
      return "#FF6470";
    case "PUSH":
      return "rgba(255,255,255,0.50)";
    case "VOID":
      return "rgba(255,255,255,0.30)";
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

function clvHexColor(verdict: string | null): string {
  if (!verdict) return "rgba(255,255,255,0.30)";
  if (verdict === "BEAT_CLOSE") return BRAND_COLORS.orbitalCyan;
  if (verdict === "MATCHED_CLOSE") return "rgba(255,255,255,0.50)";
  return "#FFB454";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProofOfRecordPage() {
  let board: Awaited<ReturnType<typeof loadProofOfRecord>>;
  try {
    board = await loadProofOfRecord();
  } catch {
    board = {
      generatedAt: new Date().toISOString(),
      picks: [],
      merkleRoot: "",
      totalSettled: 0,
    };
  }

  const isEmpty = board.picks.length === 0;

  return (
    <div
      className="relative isolate flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack, color: "white" }}
    >
      <GeneratedPlate assetId="proof-crystal" className="absolute inset-0 -z-10 opacity-10" />
      <Nav />

      {/* ── Cinematic hero ── */}
      <section
        className="relative overflow-hidden px-4 pb-16 pt-20 sm:px-6 sm:pt-24 lg:px-8"
        style={{ borderBottom: "1px solid rgba(122,92,255,0.15)" }}
      >
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(122,92,255,0.18) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <span
              className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
              style={{
                borderColor: `${BRAND_COLORS.softUltraviolet}40`,
                background: `${BRAND_COLORS.softUltraviolet}10`,
                color: BRAND_COLORS.softUltraviolet,
              }}
            >
              Proof of Record
            </span>
            <h1
              className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.05] sm:text-5xl"
              style={{
                background: `linear-gradient(135deg, #ffffff 40%, ${BRAND_COLORS.softUltraviolet})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              The record can&apos;t be rewritten.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ink-300">
              Every pick is hashed at generation time using a Merkle tree —
              the same tamper-evident commitment scheme used in public proof-of-
              liabilities systems. Once settled, the leaf hash is fixed. Edit
              the pick and the hash changes. Anyone with the raw records can
              re-derive the root and spot the difference.
            </p>
            <p className="mt-3 text-sm text-ink-400">
              This is not a promise. It is a mechanism. The math enforces it.
            </p>
          </Reveal>
        </div>
      </section>

      <main id="main-content" className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">

          {/* ── How it works ── */}
          <Reveal>
            <section
              data-testid="proof-how-it-works"
              className="rounded-2xl p-6"
              style={{
                border: `1px solid ${BRAND_COLORS.softUltraviolet}30`,
                background: `linear-gradient(135deg, ${BRAND_COLORS.softUltraviolet}08 0%, rgba(8,6,20,0.7) 100%)`,
              }}
            >
              <div
                className="mb-4 h-0.5 w-16 rounded-full"
                style={{ background: `linear-gradient(90deg, ${BRAND_COLORS.softUltraviolet}, transparent)` }}
                aria-hidden="true"
              />
              <h2
                className="mb-4 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: BRAND_COLORS.softUltraviolet }}
              >
                How the commitment works
              </h2>
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <dt className="font-semibold text-white">Generation-time hash</dt>
                  <dd className="leading-6 text-ink-300">
                    At the moment a pick is written, the engine serializes the
                    committed fields (id, pick type, selection, line, confidence,
                    model version, generated-at) and hashes them with SHA-256.
                    That hash is the leaf.
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="font-semibold text-white">Merkle root</dt>
                  <dd className="leading-6 text-ink-300">
                    All settled pick leaves combine into a Merkle tree. The root
                    summarizes the entire committed set in a single 64-character
                    hex string. Change one pick and the root changes.
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="font-semibold text-white">Inclusion proof</dt>
                  <dd className="leading-6 text-ink-300">
                    Each pick carries a Merkle path — the minimum set of sibling
                    hashes needed to re-derive the root from just that leaf. You
                    can verify any pick was in the committed set without trusting
                    us.
                  </dd>
                </div>
              </dl>
            </section>
          </Reveal>

          {/* ── Merkle root banner ── */}
          {!isEmpty && board.merkleRoot && (
            <Reveal>
              <section
                data-testid="proof-root-banner"
                className="mt-6 rounded-2xl px-6 py-5"
                style={{
                  border: `1px solid ${BRAND_COLORS.orbitalCyan}25`,
                  background: `linear-gradient(135deg, ${BRAND_COLORS.orbitalCyan}06 0%, rgba(8,6,20,0.7) 100%)`,
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p
                      className="text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: BRAND_COLORS.orbitalCyan }}
                    >
                      Committed Merkle root
                    </p>
                    <p className="mt-1 text-[11px] text-ink-400">
                      Over{" "}
                      <span className={NUMERIC_TEXT_CLASS}>
                        {formatCount(board.totalSettled)}
                      </span>{" "}
                      settled canonical picks · computed{" "}
                      {new Date(board.generatedAt).toUTCString()}
                    </p>
                  </div>
                  <code
                    className={`break-all rounded px-3 py-2 font-mono text-[11px] text-ink-300 ${NUMERIC_TEXT_CLASS}`}
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
                  >
                    {board.merkleRoot}
                  </code>
                </div>
              </section>
            </Reveal>
          )}

          {/* ── Freshness stamp (always shown) ── */}
          <p
            data-testid="proof-freshness-stamp"
            className={`mt-4 text-[11px] text-ink-500 ${NUMERIC_TEXT_CLASS}`}
          >
            Board generated {new Date(board.generatedAt).toUTCString()}
            {!isEmpty && (
              <> · {formatCount(board.totalSettled)} settled picks in the ledger</>
            )}
          </p>

          {/* ── Empty state ── */}
          {isEmpty && (
            <Reveal>
              <section
                data-testid="proof-empty-state"
                className="mt-10 rounded-2xl px-6 py-12 text-center"
                style={{
                  border: `1px solid ${BRAND_COLORS.softUltraviolet}25`,
                  background: `linear-gradient(135deg, ${BRAND_COLORS.softUltraviolet}06 0%, rgba(8,6,20,0.5) 100%)`,
                }}
              >
                <p className="text-base font-semibold text-white">
                  The record starts when the first pick settles.
                </p>
                <p className="mt-3 text-sm leading-6 text-ink-300">
                  No canonical settled picks exist yet. This page will populate
                  automatically once picks move from pending to settled — every
                  outcome, win or loss, appears here with its hash and trail.
                  Nothing is hidden once it settles.
                </p>
                <p className="mt-4 text-[11px] text-ink-500">
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
            </Reveal>
          )}

          {/* ── Pick ledger ── */}
          {!isEmpty && (
            <Reveal>
              <section className="mt-8">
                <div
                  className="overflow-hidden rounded-2xl"
                  style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(8,6,20,0.5)",
                  }}
                >
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 px-6 py-4"
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.07)",
                      background: `${BRAND_COLORS.softUltraviolet}05`,
                    }}
                  >
                    <div>
                      <h2
                        className="text-sm font-semibold uppercase tracking-widest"
                        style={{ color: BRAND_COLORS.softUltraviolet }}
                      >
                        Settled pick ledger
                      </h2>
                      <p className="mt-1 text-[11px] text-ink-400">
                        Every outcome included — wins, losses, pushes, voids. None
                        quietly removed. Each row carries its Merkle leaf index and
                        the hashed committed payload.
                      </p>
                    </div>
                    <span
                      className={`text-[11px] uppercase tracking-widest text-ink-400 ${NUMERIC_TEXT_CLASS}`}
                    >
                      {formatCount(board.picks.length)} of{" "}
                      {formatCount(board.totalSettled)} shown
                    </span>
                  </div>

                  <ul style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    {board.picks.map((row) => (
                      <PickLedgerRow key={row.id} row={row} />
                    ))}
                  </ul>

                  <div
                    className="px-6 py-3"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <p className="text-[11px] leading-relaxed text-ink-400">
                      Leaf index is the pick&apos;s position in the committed set
                      (settled-at descending, id ascending as tiebreaker). The
                      committed payload is the SHA-256 hash of id + pick type +
                      selection + line + confidence + model version +
                      generated-at — the fields locked at creation. The consensus
                      read comes from captured multi-book H2H odds; it is market
                      description, not a model claim.
                    </p>
                  </div>
                </div>
              </section>
            </Reveal>
          )}

          {/* ── The guarantee in plain language ── */}
          <Reveal>
            <section
              className="mt-10 pt-8"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
            >
              <h2
                className="mb-3 text-sm font-semibold uppercase tracking-widest"
                style={{ color: BRAND_COLORS.softUltraviolet }}
              >
                The no-after-the-fact-editing guarantee
              </h2>
              <ul className="flex flex-col gap-2 text-sm leading-6 text-ink-300">
                {[
                  "Each pick's committed fields are hashed at generation time — before the game is played.",
                  "The hash covers id, pick type, selection, line, confidence score, model version, and the exact generated-at timestamp.",
                  "The Merkle root over all settled picks is published on this page. Anyone can re-derive it.",
                  "If any pick were altered retroactively — changing the confidence or selection — the leaf hash would change, breaking the root.",
                  "Bootstrap-era picks and seed data are excluded from the committed set by design.",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: BRAND_COLORS.orbitalCyan }}
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>

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
      className="grid gap-2 px-6 py-4 transition-colors hover:bg-white/[0.02] sm:grid-cols-[1fr_auto]"
    >
      {/* Left column: pick identity */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-white">{matchup}</span>
          <span className="text-[10px] uppercase tracking-wider text-ink-400">
            {row.sport}
          </span>
          <span
            className={`text-sm font-bold ${NUMERIC_TEXT_CLASS}`}
            style={{ color: resultHexColor(row.result) }}
          >
            {row.result}
          </span>
        </div>

        <p className={`mt-1 text-[11px] text-ink-400 ${NUMERIC_TEXT_CLASS}`}>
          {row.pickType} · {row.selection} · line {row.line > 0 ? "+" : ""}
          {row.line} · conf{" "}
          <span className="text-ink-300">{row.confidence}</span> ·{" "}
          <abbr
            title="Model version that produced this pick"
            className="no-underline"
          >
            {row.modelVersion}
          </abbr>
        </p>

        <p className={`mt-1 text-[11px] text-ink-500 ${NUMERIC_TEXT_CLASS}`}>
          Generated {new Date(row.generatedAt).toUTCString()} · Settled{" "}
          {dateStr}
        </p>

        {/* CLV verdict */}
        <p className="mt-1 text-[11px]">
          <span className="text-ink-500">CLV: </span>
          <span
            className={NUMERIC_TEXT_CLASS}
            style={{ color: clvHexColor(row.clvVerdict) }}
          >
            {clvLabel(row.clvVerdict)}
            {row.clvValue !== null && row.clvVerdict
              ? ` (${row.clvValue > 0 ? "+" : ""}${row.clvValue.toFixed(1)})`
              : ""}
          </span>
        </p>

        {/* Consensus read where available */}
        {row.consensusAtSettle !== null && (
          <p className={`mt-1 text-[11px] text-ink-400 ${NUMERIC_TEXT_CLASS}`}>
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
        <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
          Leaf {formatCount(row.leafIndex)}
        </p>
        <code
          className={`max-w-[200px] truncate rounded px-2 py-1 font-mono text-[10px] text-ink-300 ${NUMERIC_TEXT_CLASS}`}
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          title={row.leafHash}
        >
          {row.leafHash.slice(0, 12)}…
        </code>
      </div>
    </li>
  );
}
