import Link from "next/link";
import { StatusTile } from "@/components/cockpit/status-tile";
import {
  AI_PLATFORM_OPPORTUNITIES,
  NOVA_AGENT,
  NOVA_SUBAGENTS,
  summarizeAiPlatformEcosystem,
  type AiPlatformOpportunity,
  type PlatformOpportunityState,
  type PlatformPriority,
} from "@/lib/opportunity-engine";

export const dynamic = "force-dynamic";

const PRIORITY_ORDER: Readonly<Record<PlatformPriority, number>> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
  WATCH: 4,
};

const PRIORITY_STYLE: Readonly<Record<PlatformPriority, string>> = {
  P0: "border-red-400/50 bg-red-950/60 text-red-100",
  P1: "border-amber-400/40 bg-amber-950/50 text-amber-100",
  P2: "border-cyan-400/30 bg-cyan-950/40 text-cyan-100",
  P3: "border-titanium/40 bg-eclipse/60 text-ion-2",
  WATCH: "border-titanium/30 bg-obsidian/50 text-ion-3",
};

const STATE_STYLE: Readonly<Record<PlatformOpportunityState, string>> = {
  LIVE_DIRECT_PAYOUT: "border-emerald-400/40 bg-emerald-950/50 text-emerald-100",
  LIVE_TRANSACTIONAL: "border-green-400/30 bg-green-950/40 text-green-100",
  LIVE_APPLICATION: "border-blue-400/30 bg-blue-950/40 text-blue-100",
  LIVE_DISTRIBUTION: "border-cyan-400/30 bg-cyan-950/40 text-cyan-100",
  LIVE_DEADLINE: "border-red-400/50 bg-red-950/60 text-red-100",
  NEGOTIATED_ONLY: "border-violet-400/30 bg-violet-950/40 text-violet-100",
  ANNOUNCED_LIMITED: "border-yellow-400/30 bg-yellow-950/40 text-yellow-100",
  CONDITIONAL: "border-orange-400/30 bg-orange-950/40 text-orange-100",
  BUILD_ONLY: "border-titanium/40 bg-eclipse/60 text-ion-2",
  EXPIRED: "border-titanium/30 bg-obsidian/50 text-ion-3",
  VERIFY_REQUIRED: "border-rose-400/30 bg-rose-950/40 text-rose-100",
};

export default function CockpitNovaPage(): JSX.Element {
  const now = new Date();
  const summary = summarizeAiPlatformEcosystem(AI_PLATFORM_OPPORTUNITIES, now);
  const ranked = [...AI_PLATFORM_OPPORTUNITIES].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.platformName.localeCompare(b.platformName),
  );
  const ownerQueue = ranked.filter((item) => item.priority === "P0" || item.priority === "P1");
  const directPayment = ranked.filter((item) => item.nativePaymentAvailable);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-300">
              NOVA · AI Opportunity Intelligence
            </p>
            <h1 className="mt-1 text-2xl font-bold text-ion-white">Platform Economy Command</h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-titanium/40 px-3 py-1.5 text-xs text-ion-1 hover:bg-carbon/60"
          >
            Back to Jarvis
          </Link>
        </div>
        <p className="max-w-4xl text-sm text-ion-2">
          Tracks AI models, coding systems, marketplaces, creator programs, partner networks,
          credits, data channels, and product opportunities. Every item separates build leverage,
          distribution, native payment, qualification, coding work, and owner authority.
        </p>
      </header>

      <section className="rounded-lg border border-amber-500/35 bg-amber-950/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">Current truth</p>
            <p className="mt-1 text-sm text-ion-1">
              The deterministic NOVA core and platform registry are implemented. Production persistence,
              scheduled monitoring, candidate synthesis, and external execution remain unwired.
            </p>
          </div>
          <span className="rounded-full border border-amber-400/40 px-2.5 py-1 font-mono text-[10px] text-amber-100">
            {NOVA_AGENT.mode}
          </span>
        </div>
        <p className="mt-3 text-xs text-ion-3">
          Automatic installs, spending, applications, outreach, publication, deployment, data sharing,
          model training, and payment activation remain disabled.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatusTile label="Mapped opportunities" value={String(summary.total)} tone="neutral" />
        <StatusTile label="Native payment routes" value={String(summary.directPayout + summary.transactional)} tone="good" />
        <StatusTile label="Open applications" value={String(summary.applications)} tone="info" />
        <StatusTile label="Urgent deadlines" value={String(summary.urgent)} tone={summary.urgent > 0 ? "warn" : "neutral"} />
      </section>

      <section className="overflow-hidden rounded-lg border border-red-400/30 bg-obsidian/60">
        <div className="border-b border-red-400/20 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-red-200">Owner attention</p>
          <h2 className="mt-1 text-lg font-semibold text-ion-white">P0 and P1 decision queue</h2>
          <p className="mt-1 text-xs text-ion-3">
            Code and evidence preparation may proceed internally. Only the owner can submit, accept terms,
            connect payout accounts, publish, or authorize spend.
          </p>
        </div>
        <div className="grid gap-3 p-4 lg:grid-cols-2">
          {ownerQueue.map((item) => (
            <OpportunityCard key={item.id} opportunity={item} compact />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-titanium/40 bg-obsidian/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-200">Payment reality</p>
            <h2 className="mt-1 text-lg font-semibold text-ion-white">Verified native-payment surfaces</h2>
          </div>
          <span className="rounded-full border border-emerald-400/30 px-2.5 py-1 text-[10px] text-emerald-100">
            {directPayment.length} mapped
          </span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-titanium/30 text-sm">
            <thead className="bg-eclipse/50 text-left text-[10px] uppercase tracking-wider text-ion-3">
              <tr>
                <th scope="col" className="px-3 py-2.5">Platform</th>
                <th scope="col" className="px-3 py-2.5">Program</th>
                <th scope="col" className="px-3 py-2.5">State</th>
                <th scope="col" className="px-3 py-2.5">GSE route</th>
                <th scope="col" className="px-3 py-2.5">Primary constraint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-titanium/30">
              {directPayment.map((item) => (
                <tr key={item.id} className="align-top text-ion-1">
                  <td className="whitespace-nowrap px-3 py-3 font-medium text-ion-white">{item.platformName}</td>
                  <td className="min-w-[220px] px-3 py-3">{item.productOrProgram}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <StateBadge state={item.state} />
                  </td>
                  <td className="min-w-[360px] px-3 py-3 text-xs leading-5 text-ion-2">{item.gsePlay}</td>
                  <td className="min-w-[260px] px-3 py-3 text-xs leading-5 text-ion-3">{item.blockers[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-titanium/40 bg-obsidian/60 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-200">Operating lanes</p>
        <h2 className="mt-1 text-lg font-semibold text-ion-white">NOVA subagent organization</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {NOVA_SUBAGENTS.map((subagent) => (
            <div key={subagent.id} className="rounded-md border border-titanium/35 bg-eclipse/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs font-semibold text-cyan-100">{subagent.codename}</p>
                <span className="text-[10px] uppercase tracking-wider text-ion-3">Draft and evidence only</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-ion-2">{subagent.purpose}</p>
              <p className="mt-2 text-[11px] text-ion-3">Review: {subagent.reviewedBy.join(" · ")}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-titanium/40 bg-obsidian/60">
        <div className="border-b border-titanium/40 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ion-3">Complete registry</p>
          <h2 className="mt-1 text-lg font-semibold text-ion-white">AI platform opportunities</h2>
        </div>
        <div className="grid gap-3 p-4 xl:grid-cols-2">
          {ranked.map((item) => (
            <OpportunityCard key={item.id} opportunity={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

function OpportunityCard({
  opportunity,
  compact = false,
}: {
  readonly opportunity: AiPlatformOpportunity;
  readonly compact?: boolean;
}): JSX.Element {
  return (
    <article className="rounded-md border border-titanium/40 bg-eclipse/45 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-ion-white">{opportunity.platformName}</p>
          <h3 className="mt-0.5 text-sm font-medium text-ion-1">{opportunity.productOrProgram}</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${PRIORITY_STYLE[opportunity.priority]}`}>
            {opportunity.priority}
          </span>
          <StateBadge state={opportunity.state} />
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-ion-2">{opportunity.currentTruth}</p>
      <div className="mt-3 rounded-md border border-cyan-500/20 bg-cyan-950/20 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-200">GSE play</p>
        <p className="mt-1 text-xs leading-5 text-ion-1">{opportunity.gsePlay}</p>
      </div>

      <div className={`mt-3 grid gap-3 ${compact ? "sm:grid-cols-2" : "md:grid-cols-2"}`}>
        <DetailList label="Code next" values={opportunity.codingDeliverables} />
        <DetailList label="Owner only" values={opportunity.ownerActions} />
      </div>
      {!compact && <DetailList label="Blockers" values={opportunity.blockers} tone="muted" />}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-titanium/30 pt-3">
        <p className="text-[10px] text-ion-3">
          Value: {opportunity.valueTypes.join(" · ")}
        </p>
        <a
          href={opportunity.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-medium text-cyan-200 hover:text-cyan-100"
        >
          Primary source ↗
        </a>
      </div>
    </article>
  );
}

function DetailList({
  label,
  values,
  tone = "normal",
}: {
  readonly label: string;
  readonly values: readonly string[];
  readonly tone?: "normal" | "muted";
}): JSX.Element {
  return (
    <div className="mt-3">
      <p className={`text-[10px] font-semibold uppercase tracking-wider ${tone === "muted" ? "text-rose-200" : "text-ion-3"}`}>
        {label}
      </p>
      <ul className="mt-1.5 grid gap-1 text-[11px] leading-4 text-ion-2">
        {values.map((value) => (
          <li key={value} className="flex gap-1.5">
            <span aria-hidden="true" className="mt-1 text-ion-3">•</span>
            <span>{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StateBadge({ state }: { readonly state: PlatformOpportunityState }): JSX.Element {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATE_STYLE[state]}`}>
      {state.replaceAll("_", " ")}
    </span>
  );
}
