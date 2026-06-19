import Link from "next/link";
import { summarizeAutonomy } from "@/lib/autonomy/autonomy-map";
import { evaluateSpendGovernor } from "@/lib/spend/spend-governor";
import { loadSpendProofSignals } from "@/lib/spend/spend-proof-signals";

/**
 * Cockpit · Funding / Backer Proof Packet.
 *
 * Read-only. Assembles the HONEST proof story for a backer conversation from real
 * signals only: what's built, the autonomy posture, the zero-spend posture, and the
 * REAL traction counts (or honest zero/unknown). No fabricated MRR, users, or
 * returns — the whole point of the company is that it doesn't sell certainty, and
 * this packet holds to the same bar. Narrative doc: reports/funding/BACKER_PROOF_PACKET.md.
 */
export const dynamic = "force-dynamic";

export default async function CockpitFundingPage(): Promise<JSX.Element> {
  const autonomy = summarizeAutonomy();
  const spend = evaluateSpendGovernor();
  const proof = await loadSpendProofSignals();

  const autonomyPct = Math.round(autonomy.recurringAutonomyShare * 100);
  const fmt = (id: keyof typeof proof.counts) =>
    proof.unknown[id as string] ? "unknown" : String(proof.counts[id] ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Backer Proof Packet
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Funding</h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-ink-300 hover:bg-white/[0.03]"
          >
            Back to Jarvis
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-ink-400">
          The honest case, assembled from real signals only. No fabricated revenue,
          users, or returns — the company&apos;s whole thesis is that it doesn&apos;t sell
          certainty, and this packet holds the same bar. Traction is real or it&apos;s
          honestly zero/unknown.
        </p>
      </header>

      {/* The thesis */}
      <section className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-5">
        <h2 className="text-sm font-semibold text-white">The thesis</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-300">
          Sports intelligence for people who are done being sold certainty. We turn real
          sportsbook data into calibrated signals you can check — and the discipline to
          know when <span className="text-white">not</span> to bet. Not a sportsbook: we
          accept no wagers. The moat is <span className="text-white">proof</span> — a
          calibrated, auditable record almost nobody publishes.
        </p>
      </section>

      {/* Operating posture — real numbers */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Recurring ops self-driving" value={`${autonomyPct}%`} tone="good" />
        <Stat
          label="Spend posture"
          value={spend.zeroSpend ? "$0 / mo" : `${spend.spendingServices.length} paid`}
          tone={spend.zeroSpend ? "good" : "warn"}
        />
        <Stat label="Services governed" value={String(spend.services.length)} />
        <Stat label="Self-driving loops" value={String(autonomy.autonomous + autonomy.autonomousWithinBudget)} tone="good" />
      </section>

      {/* What's built */}
      <section className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-5">
        <h2 className="text-sm font-semibold text-white">What&apos;s built (and runs itself)</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            "Real odds/line ingestion + scoring + settlement loop",
            "Reality Engine: devig, calibration, CLV, no-bet, autopsy (inert until proven)",
            "Free multi-provider LLM pool — Jarvis + content at $0, keyless",
            "Universal Spend Governor — zero-spend by default, proof-gated upgrades",
            "Autonomy Map — self-driving loops vs. the few owner levers",
            "Server-side paywall + Stripe billing + entitlements",
            "Rights-gated scraping clearance engine (no evasion)",
            "Responsible-gaming posture on every relevant surface",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-ink-300">
              <span className="mt-0.5 text-emerald-300">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Real traction */}
      <section className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-5">
        <h2 className="text-sm font-semibold text-white">Traction (real counts only)</h2>
        <p className="mt-1 text-xs text-ink-500">
          From live records{proof.dataMode !== "live" ? ` · data ${proof.dataMode}` : ""}. A
          zero here is an honest zero — pre-launch, not hidden.
        </p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <Stat label="Paid members" value={fmt("paid_members_10")} />
          <Stat label="Email subscribers" value={fmt("emails_100")} />
          <Stat label="Ask Galaxy submissions" value={fmt("ask_galaxy_25")} />
        </dl>
      </section>

      {/* Integrity bars */}
      <section className="rounded-lg border border-violet-500/20 bg-violet-950/20 p-5">
        <h2 className="text-sm font-semibold text-white">The bars we never cross</h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-xs text-ink-300">
          <li>• No fabricated performance, revenue, users, or testimonials — ever.</li>
          <li>• Win-rate claims gated on real calibration proof (held-out reliability).</li>
          <li>• Model changes are founder-gated (MODEL_VERSION + audit), never automatic.</li>
          <li>• Zero-spend by default; paid spend is proof-gated; ads blocked until the funnel proves out.</li>
          <li>• Not a sportsbook; rights-gated data; responsible-gaming throughout.</li>
        </ul>
      </section>

      <p className="text-[11px] text-ink-600">
        This packet renders from <code className="font-mono">autonomy-map.ts</code>,{" "}
        <code className="font-mono">spend-governor.ts</code>, and real DB counts. It contains
        no projections presented as facts. Narrative:{" "}
        <code className="font-mono">reports/funding/BACKER_PROOF_PACKET.md</code>.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn";
}): JSX.Element {
  const valueClass =
    tone === "good" ? "text-emerald-200" : tone === "warn" ? "text-yellow-200" : "text-white";
  return (
    <div className="rounded-lg border border-white/[0.06] bg-obsidian/60 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}
