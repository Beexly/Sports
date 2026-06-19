import Link from "next/link";
import {
  evaluateSpendGovernor,
  evaluateUpgrade,
  SPEND_BANDS,
  PROOF_SIGNALS,
  metProofSignals,
  type ServiceStatus,
  type SpendMode,
} from "@/lib/spend/spend-governor";
import {
  planOddsCapture,
  resolveCaptureMode,
  computeBudget,
  type OddsCaptureMode,
} from "@/lib/spend/odds-capture-governor";
import { loadSpendProofSignals } from "@/lib/spend/spend-proof-signals";

/**
 * Cockpit · Spend Governor (Workstream O).
 *
 * Read-only. Surfaces, in one glance, exactly where money could be spent, what
 * mode each governed service is in, the quota-governed Odds API capture posture,
 * and the proof-gated upgrade ladder with REAL traction counts. Nothing here
 * spends or authorizes spend — it reports the governed state. Secret values never
 * appear; only the presence of authorizing flags.
 */
export const dynamic = "force-dynamic";

const MODE_STYLES: Readonly<Record<SpendMode, string>> = {
  FREE_ONLY: "border-emerald-500/30 bg-emerald-950/40 text-emerald-200",
  OWNER_APPROVAL_REQUIRED: "border-yellow-500/30 bg-yellow-950/40 text-yellow-200",
  PAID_ENABLED: "border-sky-500/30 bg-sky-950/40 text-sky-200",
  CAP_REACHED: "border-orange-500/30 bg-orange-950/40 text-orange-200",
  DISABLED: "border-white/[0.06] bg-white/[0.04] text-ink-400",
};

const MODE_LABEL: Readonly<Record<SpendMode, string>> = {
  FREE_ONLY: "Free only",
  OWNER_APPROVAL_REQUIRED: "Owner approval req.",
  PAID_ENABLED: "Paid enabled",
  CAP_REACHED: "Cap reached",
  DISABLED: "Disabled",
};

const CAPTURE_STYLES: Readonly<Record<OddsCaptureMode, string>> = {
  OFF: "border-white/[0.06] bg-white/[0.04] text-ink-400",
  HEALTH_ONLY: "border-emerald-500/30 bg-emerald-950/40 text-emerald-200",
  WATCHLIST_ONLY: "border-sky-500/30 bg-sky-950/40 text-sky-200",
  CAPTURE_ACTIVE: "border-violet-500/30 bg-violet-950/40 text-violet-200",
  CAP_REACHED: "border-orange-500/30 bg-orange-950/40 text-orange-200",
};

export default async function CockpitSpendPage(): Promise<JSX.Element> {
  const report = evaluateSpendGovernor();
  const proof = await loadSpendProofSignals();
  const met = metProofSignals(proof.counts);

  const captureMode = resolveCaptureMode();
  const budget = computeBudget();
  const capturePlan = planOddsCapture({ primarySportKey: null });

  const spendingCount = report.spendingServices.length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Workstream O · Zero-Cost Activation
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Spend Governor</h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-ink-300 hover:bg-white/[0.03]"
          >
            Back to Jarvis
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-ink-400">
          Every paid-capable service, its governed mode, and what unlocks it. This is a read-only
          report — <span className="text-ink-200">nothing here spends or authorizes spend.</span>{" "}
          Secret values never appear; only the presence of an authorizing flag. Policy:{" "}
          <code className="font-mono text-ink-300">reports/finance/SPEND_GOVERNOR_POLICY.md</code>.
        </p>
      </header>

      {/* Headline posture */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Spend posture"
          value={report.zeroSpend ? "$0 — zero-spend" : `${spendingCount} spending`}
          tone={report.zeroSpend ? "good" : "warn"}
        />
        <Metric label="Services governed" value={String(report.services.length)} />
        <Metric label="Free & active" value={String(report.freeActiveCount)} tone="good" />
        <Metric
          label="Proof signals met"
          value={`${met.length} / ${PROOF_SIGNALS.length}`}
        />
      </section>

      {/* Governed services */}
      <section className="rounded-lg border border-white/[0.06] bg-obsidian/60">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Governed services</h2>
          <p className="mt-1 text-xs text-ink-500">
            Mode resolved from env presence only · generated {report.generatedAt}
          </p>
        </div>
        <div className="divide-y divide-titanium/30">
          {report.services.map((svc) => (
            <ServiceRow key={svc.id} svc={svc} />
          ))}
        </div>
      </section>

      {/* Odds API quota-governed capture */}
      <section className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">
            Odds API · quota-governed evidence capture
          </h2>
          <span
            className={`rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${CAPTURE_STYLES[captureMode]}`}
          >
            {captureMode}
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-xs text-ink-400">
          One sport · one region (<code className="font-mono text-ink-300">us</code>) ·
          h2h/spreads/totals only · internal evidence only (CLV / replay / calibration). No broad
          fan-out, no props, no historical. The key is present but never displayed; capture is
          budgeted against a conservative slice of the free monthly quota.
        </p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Plannable credits" value={String(budget.plannableCredits)} />
          <MiniStat label="Used this period" value={String(budget.usedCredits)} />
          <MiniStat label="Days remaining" value={String(budget.daysRemaining)} />
          <MiniStat label="Daily glide" value={`${budget.dailyCreditAllowance}/day`} />
        </dl>
        <p className="mt-3 text-[11px] text-ink-500">{capturePlan.reason}</p>
      </section>

      {/* Upgrade ladder */}
      <section className="rounded-lg border border-white/[0.06] bg-obsidian/60">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Proof-gated upgrade ladder</h2>
          <p className="mt-1 text-xs text-ink-500">
            Spend is earned by verified traction. Counts are real DB reads
            {proof.dataMode !== "live" ? ` · data ${proof.dataMode}` : ""}.
          </p>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {SPEND_BANDS.map((band) => {
            const decision = evaluateUpgrade(band.band, proof.counts);
            return (
              <div
                key={band.band}
                className={`rounded-lg border p-3 ${
                  decision.allowed
                    ? "border-emerald-500/30 bg-emerald-950/30"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white">{band.label}</span>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      decision.allowed
                        ? "border-emerald-500/30 text-emerald-200"
                        : "border-white/[0.06] text-ink-400"
                    }`}
                  >
                    {decision.allowed ? "Unlocked" : "Locked"}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-ink-400">{band.rule}</p>
                <p className="mt-1 text-[11px] text-ink-500">{decision.reason}</p>
              </div>
            );
          })}
        </div>
        <div className="border-t border-white/[0.06] px-4 py-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
            Proof signals
          </h3>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {PROOF_SIGNALS.map((sig) => {
              const isMet = met.includes(sig.id);
              const count = proof.counts[sig.id] ?? 0;
              const isUnknown = proof.unknown[sig.id] === true;
              return (
                <li key={sig.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className={isMet ? "text-emerald-200" : "text-ink-400"}>
                    {isMet ? "✓" : "○"} {sig.label}
                  </span>
                  <span className="font-mono text-[11px] text-ink-500">
                    {isUnknown ? "unknown" : `${count}/${sig.threshold}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <p className="text-[11px] text-ink-600">
        Counts are read live from real records. &ldquo;unknown&rdquo; means a count was unavailable
        (e.g. DB unreachable) — never silently treated as a met signal. No fabricated traction.
      </p>
    </div>
  );
}

function ServiceRow({ svc }: { svc: ServiceStatus }): JSX.Element {
  return (
    <div className="px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-white">{svc.name}</span>
            <span className="rounded-md border border-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink-400">
              {svc.category}
            </span>
            <span className="rounded-md border border-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink-500">
              {svc.costClass}
            </span>
          </div>
          <p className="mt-1.5 max-w-3xl text-xs text-ink-400">{svc.unlocks}</p>
          <p className="mt-1 max-w-3xl text-[11px] text-ink-600">{svc.freePathBlocks}</p>
          {svc.enabledFlagsPresent.length > 0 ? (
            <p className="mt-1 font-mono text-[10px] text-sky-300/80">
              flags present: {svc.enabledFlagsPresent.join(", ")}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${MODE_STYLES[svc.mode]}`}
          >
            {MODE_LABEL[svc.mode]}
          </span>
          {svc.spends ? (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-300">
              spends $
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-wider text-ink-600">no spend</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({
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

function MiniStat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-bold text-white">{value}</p>
    </div>
  );
}
