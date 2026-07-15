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
import type { CanonicalClvVerdict } from "@/lib/market/format-clv";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Proof of Record · ${BRAND_NAME}`,
  description:
    "Deterministic Merkle leaves over persisted pick fields, current inclusion proofs, and frozen mint-time receipts where available.",
  alternates: { canonical: "/proof" },
  openGraph: {
    title: `Proof of Record · ${BRAND_NAME}`,
    description:
      "Merkle-hash trail for settled picks, exact receipt verification where available, and timestamped latest captured market snapshots.",
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

function clvLabel(verdict: CanonicalClvVerdict | null): string | null {
  if (!verdict) return null;
  switch (verdict) {
    case "BEAT_CLOSE":
      return "Beat close";
    case "MATCHED_CLOSE":
      return "Matched close";
    case "LOST_TO_CLOSE":
      return "Lost to close";
  }
}

function clvClass(verdict: CanonicalClvVerdict | null): string {
  if (!verdict) return "text-ion-3";
  if (verdict === "BEAT_CLOSE") return "text-orbital-cyan";
  if (verdict === "MATCHED_CLOSE") return "text-ion-2";
  return "text-caution";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProofOfRecordPage() {
  // An outage must NOT read as "no record was ever committed" on an honesty
  // surface (same doctrine as /api/verify/slate: outage -> unavailable,
  // absence -> honest empty state). The loader is fail-safe: on a ledger DB
  // outage it RESOLVES an explicit `ledgerUnreachable` flag (with no synthesized
  // generatedAt) rather than throwing, so we read the two states apart from its
  // REAL signal instead of guessing. The try/catch is defense-in-depth for any
  // unexpected throw — never an error boundary on an honesty page — and maps to
  // the same unreachable state.
  let board: Awaited<ReturnType<typeof loadProofOfRecord>>;
  try {
    board = await loadProofOfRecord();
  } catch {
    board = {
      generatedAt: "",
      picks: [],
      merkleRoot: "",
      totalSettled: 0,
      ledgerUnreachable: true,
    };
  }
  const ledgerUnreachable = board.ledgerUnreachable;

  const isEmpty = board.picks.length === 0 && !ledgerUnreachable;
  // Ledger-bearing sections (root banner, table, funnel) key off rows actually
  // present, NOT !isEmpty: during an outage isEmpty is false, and gating on it
  // would render a "0 settled picks" stamp, an empty table shell, and the paid
  // funnel alongside the outage card.
  const hasLedger = board.picks.length > 0;

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
              The record leaves fingerprints.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              This ledger derives a deterministic fingerprint from each settled
              pick&apos;s persisted committed fields, then folds those leaves into
              the current Merkle root. Changing a committed field changes the
              leaf and the root. When a frozen receipt exists, the verifier also
              exposes the exact payload sealed at mint time.
            </p>
            <p className="mt-3 text-sm text-ion-2">
              Canonical market text is presentation. It is never represented as
              the literal hash preimage.
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
                <dt className="font-semibold text-ion-white">Committed-field leaf</dt>
                <dd className="text-ion-1 leading-6">
                  The ledger serializes the original persisted values for id,
                  pick type, selection, line, confidence, model version,
                  generated-at, and tier, then hashes that exact payload with
                  SHA-256. The formatted market label shown below is separate.
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="font-semibold text-ion-white">Merkle root</dt>
                <dd className="text-ion-1 leading-6">
                  All settled pick leaves combine into a Merkle tree. The current
                  root summarizes the entire loaded set in one 64-character hex
                  string. Change one committed value and the recomputed root changes.
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="font-semibold text-ion-white">Inclusion proof</dt>
                <dd className="text-ion-1 leading-6">
                  Each pick carries a Merkle path: the minimum set of sibling
                  hashes needed to re-derive the root from just that leaf. It
                  lets you verify that the displayed leaf folds to the current
                  root shown on this page.
                </dd>
              </div>
            </dl>
          </section>

          {/* ── Merkle root banner ── */}
          {hasLedger && board.merkleRoot && (
            <section
              data-testid="proof-root-banner"
              className="mt-6 rounded-2xl border border-titanium bg-eclipse/60 px-6 py-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-ion-2">
                    Current Merkle root
                  </p>
                  <p className="mt-1 text-[11px] text-ion-3">
                    Over{" "}
                    <span className={NUMERIC_TEXT_CLASS}>
                      {formatCount(board.totalSettled)}
                    </span>{" "}
                    settled live-engine picks · computed{" "}
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

          {/* ── Freshness stamp ── Shown only when the board actually loaded.
                 During an outage generatedAt is empty and this stamp is
                 suppressed, so we never assert a generation time for a board
                 that never loaded — the unreachable card below carries that
                 state instead. ── */}
          {!ledgerUnreachable && (
            <p
              data-testid="proof-freshness-stamp"
              className={`mt-4 text-[11px] text-ion-3 ${NUMERIC_TEXT_CLASS}`}
            >
              Board generated {new Date(board.generatedAt).toUTCString()}
              {hasLedger && (
                <> · {formatCount(board.totalSettled)} settled picks in the ledger</>
              )}
            </p>
          )}

          {/* ── Outage state: distinct from empty. The record exists; we
                 just can't reach it right now. Saying "no picks exist yet"
                 here would be false. ── */}
          {ledgerUnreachable && (
            <section
              data-testid="proof-unreachable-state"
              className="mt-10 rounded-2xl border border-caution/40 bg-caution/[0.06] px-6 py-10 text-center"
            >
              <p className="text-base font-semibold text-ion-white">
                The ledger is temporarily unreachable.
              </p>
              <p className="mt-3 text-sm leading-6 text-ion-1">
                This is a connection problem, not a verdict on the record. The
                page cannot verify or display a current root while its source is
                unavailable. Frozen receipts already held outside this request
                are not rewritten by this page.
              </p>
            </section>
          )}

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
                No finished live-engine picks exist yet. This page will populate
                automatically once picks move from pending to settled. Settled
                canonical outcomes contribute to the root; the page displays the
                newest bounded set with their hashes and available receipt links.
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
          {hasLedger && (
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
                      a validated market display when the stored values support one.
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
                    leaf covers the original persisted committed values. The
                    canonical market label in a row is a validated presentation,
                    not the literal hash preimage. Use the receipt verifier for
                    the exact frozen mint-time payload when a receipt link exists.
                    Market consensus is a timestamped latest captured H2H snapshot,
                    not a generation-time, settlement-time, or model claim.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ── The guarantee in plain language ── */}
          <section className="mt-10 border-t border-mineral pt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-ion-2">
              What the mechanism proves
            </h2>
            <ul className="flex flex-col gap-2 text-sm leading-6 text-ion-1">
              {[
                "Each current leaf deterministically covers the original persisted id, pick type, selection, line, confidence, model version, generated-at timestamp, and tier.",
                "The canonical market label displayed in the row is a presentation projection, not the exact serialized hash preimage.",
                "The current Merkle root and inclusion path prove that a displayed leaf belongs to the currently loaded settled set.",
                "Where a receipt link exists, the verifier exposes the frozen mint-time payload and rechecks its hash. Rows without a receipt do not claim that historical anchor.",
                "Changing a committed field changes its leaf and the recomputed root; comparison with a prior root or frozen receipt reveals the drift.",
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

          {/* ── Funnel close: the record IS the product demo. Gated on rows
                 actually present — selling against an empty (or DB-failed)
                 record would contradict the states two sections up. ── */}
          {hasLedger && (
            <section
              data-testid="proof-funnel-close"
              className="mt-10 rounded-2xl border border-plasma/30 bg-plasma/[0.06] px-6 py-8"
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest text-plasma">
                The same receipts run the live board
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-ion-white">
                Receipt-linked rows were sealed at mint time. Today&apos;s board
                publishes with the same verifier path.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ion-1">
                Free shows two picks a day with the public Edge Index. Pro opens
                the full board — the sealed picks, their confidence scores, and
                the factor trail behind them. The ledger includes every settled
                canonical result; receipt links identify which rows also carry a
                frozen mint-time payload.
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
          )}

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

export function PickLedgerRow({ row }: { row: ProofPickRow }) {
  const matchup = `${row.awayTeamName} @ ${row.homeTeamName}`;
  const dateStr = row.settledAt
    ? new Date(row.settledAt).toISOString().slice(0, 10)
    : "—";
  const clvVerdictLabel = clvLabel(row.clv?.verdict ?? null);

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
            {row.sport ?? STAT_PLACEHOLDER}
          </span>
          <span
            className={`text-sm font-bold ${NUMERIC_TEXT_CLASS} ${resultClass(row.result)}`}
          >
            {row.result}
          </span>
        </div>

        <p className={`mt-1 text-[11px] text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
          {row.pickType} · Canonical market display: {row.publicMarket
            ? row.publicMarket.selection
            : "unavailable"} ·{" "}
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
          <span className="text-ion-3">
            {row.clv
              ? `CLV · close captured ${new Date(row.clv.capturedAt).toUTCString()}: `
              : "CLV: "}
          </span>
          <span className={`${clvClass(row.clv?.verdict ?? null)} ${NUMERIC_TEXT_CLASS}`}>
            {row.clv && clvVerdictLabel
              ? `${clvVerdictLabel} (${row.clv.display})`
              : STAT_PLACEHOLDER}
          </span>
        </p>

        {/* Consensus read where available */}
        {row.latestMarketConsensus !== null && (
          <p className={`mt-1 text-[11px] text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
            Latest captured market consensus ·{" "}
            captured {new Date(row.latestMarketConsensus.capturedAt).toUTCString()} ·{" "}
            {formatCount(row.latestMarketConsensus.read.bookCount)} books ·{" "}
            Home {formatRatioAsPercent(row.latestMarketConsensus.read.fairHomeProb)} ·
            Away {formatRatioAsPercent(row.latestMarketConsensus.read.fairAwayProb)}
          </p>
        )}
      </div>

      {/* Right column: leaf hash + index, plus the RECEIPT hash where one
          exists. The two are different fingerprints: the leaf belongs to this
          page's Merkle ledger; the receipt hash is what /verify looks up.
          Routing a leaf hash to the verifier would produce a false
          "no receipt matches" — so only receipt-carrying rows link out. */}
      <div className="flex flex-col items-end gap-1 text-right">
        <p className={`text-[10px] font-semibold uppercase tracking-widest text-ion-3`}>
          Leaf {formatCount(row.leafIndex)}
        </p>
        <code
          className={`max-w-[200px] truncate rounded bg-titanium px-2 py-1 font-mono text-[10px] text-ion-1 ${NUMERIC_TEXT_CLASS}`}
          title={`Merkle leaf hash (this page's ledger): ${row.leafHash}`}
        >
          {row.leafHash.slice(0, 12)}…
        </code>
        {row.receiptHash && (
          <Link
            href={`/verify?hash=${row.receiptHash}`}
            className="text-[10px] font-semibold text-orbital-cyan hover:text-ion-white"
            title="Open this pick's frozen receipt in the public verifier"
          >
            Verify receipt →
          </Link>
        )}
      </div>
    </li>
  );
}
