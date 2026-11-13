import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import {
  formatUnits,
  formatVerifiedAt,
  formatWlp,
  verifiedLedger,
} from "@/lib/ledger/verified-ledger-view";

export const metadata: Metadata = {
  title: "The Sealed Record | Galaxy Sports Edge",
  description:
    "Every settled play, recomputed straight from the settlement database. Wins, losses, pushes, units, closing-line value and pre-kickoff commitment hashes. No hardcoded numbers.",
  alternates: { canonical: "/record" },
};

function ResultBadge({ result }: { result: string }): JSX.Element {
  const tone =
    result === "WIN"
      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
      : result === "LOSS"
        ? "border-rose-400/40 bg-rose-500/10 text-rose-300"
        : "border-slate-500/40 bg-slate-500/10 text-slate-300";
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold ${tone}`}>
      {result}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone = "text-ion-white",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: string;
}): JSX.Element {
  return (
    <div className="surface-card p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-2">{label}</div>
      <div className={`mt-2 font-display text-4xl tracking-tight ${tone}`}>{value}</div>
      <div className="mt-2 text-xs leading-relaxed text-ion-2">{sub}</div>
    </div>
  );
}

export default function RecordPage(): JSX.Element {
  const ledger = verifiedLedger;
  const gate = ledger.official.gate;
  const progressPct = Math.min(100, Math.round((gate.clvBackedSettled / gate.target) * 100));
  const clv = ledger.pipeline.clv;

  return (
    <div className="min-h-screen bg-obsidian text-ion-white">
      <Nav />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        {/* Header */}
        <p className="eyebrow">Public ledger · recomputed from the database</p>
        <h1 className="mt-4 font-display text-5xl uppercase tracking-tight sm:text-6xl">
          The Sealed Record
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-ion-1">
          Every number on this page is recomputed straight from the settlement database by an
          open verification script. Nothing is typed in by hand. Wins, losses, pushes, units and
          closing-line value are derived from the settled picks, their games and their settlement
          events; every pre-kickoff commitment hash is re-derived and checked against kickoff.
        </p>
        <p className="mt-3 font-mono text-[11px] text-ion-2">
          Verified {formatVerifiedAt(ledger.generatedAt)} · read-only · sources:{" "}
          {ledger.source.tables.join(", ")}
        </p>

        {/* Official record + the 200-bet law */}
        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="surface-card p-6 sm:p-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-2">
              Official record · published premium plays
            </div>
            <div className="mt-3 font-display text-5xl tracking-tight text-emerald-300">
              {formatWlp(ledger.official.wlp)}
            </div>
            <div className="mt-2 text-sm font-semibold text-ion-1">
              {formatUnits(ledger.official.units.total)} · flat 1 unit per play ·{" "}
              {ledger.official.units.coveredPicks} priced plays
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ion-2">
              {ledger.scope.officialRecord}
            </p>
          </div>
          <div className="surface-card p-6 sm:p-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-2">
              Calibration progress · the {gate.target}-bet law
            </div>
            <div className="mt-3 font-display text-5xl tracking-tight text-ion-white">
              {gate.clvBackedSettled}/{gate.target}
            </div>
            <div
              className="mt-4 h-2 w-full overflow-hidden rounded-full border border-mineral bg-eclipse"
              role="progressbar"
              aria-valuenow={gate.clvBackedSettled}
              aria-valuemin={0}
              aria-valuemax={gate.target}
              aria-label="CLV-backed settled official plays toward the calibration threshold"
            >
              <div className="h-full bg-emerald-400" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ion-2">
              {gate.unlocked
                ? "The threshold is met: the calibration page may publish observed rates."
                : "No win-rate percentage is published anywhere until at least " +
                  `${gate.target} official plays are settled AND graded against the closing line. ` +
                  "Until then you get counts, units and this progress bar. That is the whole law."}
            </p>
            {gate.unlocked && gate.winRate !== null ? (
              <p className="mt-2 font-mono text-sm text-emerald-300">
                Observed win rate (wins / decided): {(gate.winRate * 100).toFixed(1)}%
              </p>
            ) : null}
          </div>
        </section>

        {/* Pipeline ledger */}
        <section className="mt-10">
          <h2 className="font-display text-2xl uppercase tracking-tight">Full settlement pipeline</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ion-2">
            {ledger.scope.pipelineLedger}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Settled W-L-P"
              value={formatWlp(ledger.pipeline.wlp)}
              sub={`${ledger.pipeline.withSettlementEvents} picks carry an official settlement event. ${ledger.pipeline.eventResultMismatches} result mismatches between pick and event.`}
            />
            <StatCard
              label="Net units (flat 1u)"
              value={formatUnits(ledger.pipeline.units.total)}
              sub={`${ledger.pipeline.units.coveredPicks} plays with a recorded entry price. ${ledger.pipeline.units.missingPricePicks} unpriced plays are counted but excluded from units, never guessed.`}
              tone={ledger.pipeline.units.total >= 0 ? "text-emerald-300" : "text-rose-300"}
            />
            <StatCard
              label="CLV graded"
              value={String(clv.graded)}
              sub={`Beat the close: ${clv.beatClose} · lost to close: ${clv.missedClose} · matched: ${clv.flat}. ${ledger.scope.clvSign}`}
            />
            <StatCard
              label="Recomputation check"
              value={`${clv.storedValueMatches}/${clv.storedValueMatches + clv.storedValueMismatches}`}
              sub={`Stored CLV values re-derived from entry vs close fields and compared. ${clv.storedValueMismatches} rows disagree and are listed in the artifact. Mean points CLV: ${clv.meanPoints ?? "not yet graded"}.`}
            />
          </div>
        </section>

        {/* Commitment hashes */}
        <section className="mt-12 surface-card p-6 sm:p-8">
          <h2 className="font-display text-2xl uppercase tracking-tight">Pre-kickoff commitments</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ion-2">
            {ledger.scope.commitments} A verified commitment means the pick was frozen before
            kickoff and has not been altered since.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <StatCard label="Frozen receipts" value={String(ledger.commitments.receipts)} sub="One canonical payload per committed pick." />
            <StatCard label="Hash re-derived" value={String(ledger.commitments.hashVerified)} sub="SHA-256 leaf hash recomputed from the stored payload and matched." />
            <StatCard
              label="Fully verified"
              value={String(ledger.commitments.fullyVerified)}
              sub="Hash matches AND the freeze timestamp precedes kickoff."
              tone="text-emerald-300"
            />
          </div>
          {ledger.commitments.samples.length > 0 ? (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px] text-ion-1">
                <thead className="border-b border-mineral text-[10px] uppercase tracking-wider text-ion-2">
                  <tr>
                    <th className="px-3 py-2">Pick</th>
                    <th className="px-3 py-2">Commitment hash (SHA-256 leaf)</th>
                    <th className="px-3 py-2">Frozen</th>
                    <th className="px-3 py-2">Kickoff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mineral/50">
                  {ledger.commitments.samples.map((s) => (
                    <tr key={s.pickId}>
                      <td className="px-3 py-2">{s.pickId.slice(0, 12)}…</td>
                      <td className="px-3 py-2 text-emerald-300/90">{s.contentHash.slice(0, 24)}…</td>
                      <td className="px-3 py-2">{s.frozenAt ?? "n/a"}</td>
                      <td className="px-3 py-2">{s.kickoff ?? "n/a"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {ledger.commitments.slateCommitments.length > 0 ? (
            <div className="mt-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-2">
                Latest slate commitment roots
              </div>
              <ul className="mt-2 space-y-1 font-mono text-[11px] text-ion-1">
                {ledger.commitments.slateCommitments.map((s) => (
                  <li key={`${s.slateKey}-${s.committedAt}`}>
                    <span className="text-ion-white">{s.slateKey ?? "slate"}</span> · {s.count ?? 0} picks ·
                    root <span className="text-emerald-300/90">{(s.root ?? "").slice(0, 20)}…</span> ·{" "}
                    {s.committedAt ?? ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* Recent settlements */}
        <section className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl uppercase tracking-tight">
              Latest settlements · last {ledger.recentSettlements.windowHours}h
            </h2>
            <span className="font-mono text-xs text-ion-2">
              {ledger.recentSettlements.count} picks settled in the window
            </span>
          </div>
          {ledger.tnfEvidence.found ? (
            <div className="mt-4 rounded-xl border border-mineral bg-eclipse/60 p-4 text-sm leading-relaxed text-ion-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-2">
                Evidence row · Thursday night
              </span>
              <p className="mt-1">
                {ledger.tnfEvidence.matchup} · {ledger.tnfEvidence.selection} ·{" "}
                <ResultBadge result={ledger.tnfEvidence.result} /> · final{" "}
                {ledger.tnfEvidence.finalScore ?? "n/a"} · locked {ledger.tnfEvidence.clvLockLine ?? "n/a"},
                closed {ledger.tnfEvidence.clvCloseLine ?? "n/a"} · CLV{" "}
                {ledger.tnfEvidence.clvValue ?? "n/a"} ({ledger.tnfEvidence.clvVerdict ?? "ungraded"}).
                A loss is a loss: it stays in the record at full weight.
              </p>
            </div>
          ) : null}
          <div className="mt-5 overflow-x-auto surface-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-mineral font-mono text-[10px] uppercase tracking-wider text-ion-2">
                <tr>
                  <th className="px-4 py-3">Matchup</th>
                  <th className="px-4 py-3">Play</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Final</th>
                  <th className="px-4 py-3">Vs close</th>
                  <th className="px-4 py-3">Settled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mineral/50 text-ion-1">
                {ledger.recentSettlements.rows.map((r) => (
                  <tr key={r.pickId}>
                    <td className="px-4 py-3 text-ion-white">{r.matchup}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.selection}</td>
                    <td className="px-4 py-3">
                      <ResultBadge result={r.result} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{r.finalScore ?? "n/a"}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {r.clvVerdict ?? "ungraded"}
                      {r.clvValue !== null ? ` (${r.clvValue})` : ""}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{(r.settledAt ?? "").slice(0, 16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Methodology */}
        <section className="mt-12 surface-card p-6 sm:p-8">
          <h2 className="font-display text-2xl uppercase tracking-tight">Recompute it yourself</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ion-1">
            This page renders the output of one script:{" "}
            <code className="rounded bg-eclipse px-1.5 py-0.5 font-mono text-xs text-emerald-300">
              npm run verify:ledger
            </code>
            . It reads the ledger tables read-only, recomputes every aggregate, re-derives every
            commitment hash, and writes the artifact this page imports. Staking:{" "}
            {ledger.scope.staking}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/calibration" className="btn btn-primary">
              Calibration progress
            </Link>
            <Link href="/board" className="btn btn-ghost">
              Today&apos;s board
            </Link>
            <Link href="/picks" className="btn btn-ghost">
              Official picks
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}