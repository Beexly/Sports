import Link from "next/link";
import {
  NUMERIC_TEXT_CLASS,
  STAT_PLACEHOLDER,
  formatCount,
  formatRatioAsPercent,
} from "@/lib/format/stat";
import type { CanonicalClvVerdict } from "@/lib/market/format-clv";
import type { ProofPickRow } from "@/lib/proof/load-proof-of-record";

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
          Generated {new Date(row.generatedAt).toUTCString()} · Settled {dateStr}
        </p>

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

        {row.latestMarketConsensus !== null && (
          <p className={`mt-1 text-[11px] text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
            Latest captured market consensus · captured{" "}
            {new Date(row.latestMarketConsensus.capturedAt).toUTCString()} ·{" "}
            {formatCount(row.latestMarketConsensus.read.bookCount)} books · Home{" "}
            {formatRatioAsPercent(row.latestMarketConsensus.read.fairHomeProb)} · Away{" "}
            {formatRatioAsPercent(row.latestMarketConsensus.read.fairAwayProb)}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 text-right">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-ion-3">
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
