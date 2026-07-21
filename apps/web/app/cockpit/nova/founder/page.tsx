import Link from "next/link";

import { StatusTile } from "@/components/cockpit/status-tile";
import {
  FOUNDER_OPERATING_POLICY,
  FOUNDER_WORK_SEED,
  PERSONAL_AI_INCOME_OPPORTUNITIES,
  buildFounderDailyBrief,
  summarizeCapabilityInventory,
  summarizeUserSuppliedSourceIntake,
  type FounderQueueDecision,
} from "@/lib/opportunity-engine";

export const dynamic = "force-dynamic";

export default function NovaFounderCommandPage(): JSX.Element {
  const brief = buildFounderDailyBrief(FOUNDER_WORK_SEED);
  const capabilities = summarizeCapabilityInventory();
  const sourceIntake = summarizeUserSuppliedSourceIntake();
  const incomeQueue = PERSONAL_AI_INCOME_OPPORTUNITIES.filter(
    (item) => item.priority === "P0" || item.priority === "P1",
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-300">
              NOVA · Founder Operating System
            </p>
            <h1 className="mt-1 text-2xl font-bold text-ion-white">What to do, why, when, and how</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-ion-2">
              A bounded decision surface for GSE, GSN, NOVA, first-cash work, coding continuity,
              source review, credits, applications, and personal operating leverage. Agents prepare
              and verify; the owner retains external, financial, publication, and contractual authority.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/cockpit/nova"
              className="rounded-lg border border-cyan-400/30 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-950/30"
            >
              NOVA platform map
            </Link>
            <Link
              href="/cockpit"
              className="rounded-lg border border-titanium/40 px-3 py-1.5 text-xs text-ion-1 hover:bg-carbon/60"
            >
              Jarvis command
            </Link>
          </div>
        </div>
      </header>

      <section className="rounded-lg border border-amber-400/35 bg-amber-950/25 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-200">Current truth</p>
        <p className="mt-2 text-sm leading-6 text-ion-1">
          This page is a deterministic internal plan generated from versioned contracts. It can rank,
          explain, and prepare work. It cannot send, submit, purchase, install, publish, deploy, accept
          terms, connect payout accounts, or mutate production systems.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatusTile label="Today's bounded decisions" value={String(brief.decisions.length)} tone="info" />
        <StatusTile label="Owner minutes requested" value={String(brief.ownerMinutesRequested)} tone="warn" />
        <StatusTile label="Captured AI capabilities" value={String(capabilities.total)} tone="neutral" />
        <StatusTile label="Discovery links awaiting review" value={String(sourceIntake.ownerReviewRequired)} tone="neutral" />
      </section>

      <section className="overflow-hidden rounded-lg border border-red-400/30 bg-obsidian/60">
        <div className="border-b border-red-400/20 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-red-200">Daily command</p>
          <h2 className="mt-1 text-lg font-semibold text-ion-white">Highest-value bounded work</h2>
          <p className="mt-1 text-xs leading-5 text-ion-3">
            Maximum one revenue implementation, two experiments, one urgent risk response, and five
            daily decisions. Research remains append-only; active execution remains capacity-bounded.
          </p>
        </div>
        <div className="grid gap-4 p-4 xl:grid-cols-2">
          {brief.decisions.map((decision, index) => (
            <FounderDecisionCard key={decision.item.id} decision={decision} rank={index + 1} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-titanium/40 bg-obsidian/60 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-200">Personal efficiency</p>
          <h2 className="mt-1 text-lg font-semibold text-ion-white">Founder operating contract</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <PolicyRow label="Command" value="Human in command; AI in bounded execution" />
            <PolicyRow label="Cash posture" value="Zero-cash model and infrastructure path by default" />
            <PolicyRow label="Local model lane" value={FOUNDER_OPERATING_POLICY.localModelRole} />
            <PolicyRow label="Premium model lane" value={FOUNDER_OPERATING_POLICY.premiumModelRole} />
            <PolicyRow label="Memory" value={FOUNDER_OPERATING_POLICY.memoryLayers.join(" → ")} />
            <PolicyRow label="Learning" value="Nightly autopsy; measured outcomes; reviewed policy changes" />
          </dl>
        </article>

        <article className="rounded-lg border border-titanium/40 bg-obsidian/60 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-200">Context efficiency</p>
          <h2 className="mt-1 text-lg font-semibold text-ion-white">Feed agents governed context, not the whole repo</h2>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-ion-2">
            <li>1. Load the mission, current truth, acceptance criteria, and authority boundary.</li>
            <li>2. Load architecture and source-of-truth documents before implementation files.</li>
            <li>3. Retrieve only task-relevant code, tests, schemas, and prior decisions.</li>
            <li>4. Run the narrowest validation first, then repository gates.</li>
            <li>5. Record evidence and a compact handoff instead of replaying the entire conversation.</li>
          </ul>
          <p className="mt-3 text-xs leading-5 text-ion-3">
            Vendor-reported context-efficiency experiments are research signals, not universal proof.
            NOVA must benchmark this pattern on GSE before changing model-routing policy.
          </p>
        </article>
      </section>

      <section className="overflow-hidden rounded-lg border border-emerald-400/25 bg-obsidian/60">
        <div className="border-b border-emerald-400/20 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-200">Personal income lane</p>
          <h2 className="mt-1 text-lg font-semibold text-ion-white">Agent-preparable, owner-executed opportunities</h2>
          <p className="mt-1 text-xs text-ion-3">
            These are individual earned-income paths, not GSN revenue, MRR, or product-market proof.
          </p>
        </div>
        <div className="grid gap-3 p-4 lg:grid-cols-2">
          {incomeQueue.map((item) => (
            <article key={item.id} className="rounded-md border border-titanium/35 bg-eclipse/45 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-ion-white">{item.platform}</p>
                  <h3 className="mt-0.5 text-sm text-ion-1">{item.program}</h3>
                </div>
                <span className="rounded-full border border-emerald-400/30 px-2 py-0.5 text-[10px] text-emerald-100">
                  {item.priority} · {item.state}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-ion-2">{item.currentTruth}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <MiniList label="Agent prepares" values={item.agentCanPrepare} />
                <MiniList label="Owner performs" values={item.ownerMustDo} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-titanium/40 bg-obsidian/60 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ion-3">Capability inventory</p>
          <h2 className="mt-1 text-lg font-semibold text-ion-white">Claude and ChatGPT surfaces accounted for</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Claude plugins" value={capabilities.claudePlugins} />
            <Metric label="Claude connectors" value={capabilities.claudeConnectors} />
            <Metric label="Claude skills" value={capabilities.claudeSkills} />
            <Metric label="ChatGPT apps" value={capabilities.chatgptApps} />
            <Metric label="ChatGPT skills" value={capabilities.chatgptSkills} />
            <Metric label="Reconnect required" value={capabilities.reconnectRequired} />
          </dl>
          <p className="mt-3 text-xs leading-5 text-ion-3">
            Inventory is not approval. Availability and permissions can change. NOVA selects tools by
            job fit, evidence, rights, cash cost, context overhead, maintenance, and measured outcome.
          </p>
        </article>

        <article className="rounded-lg border border-titanium/40 bg-obsidian/60 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ion-3">Source intake</p>
          <h2 className="mt-1 text-lg font-semibold text-ion-white">Founder discoveries preserved safely</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Instagram discoveries" value={sourceIntake.instagram} />
            <Metric label="Newsletter redirects" value={sourceIntake.hubspotTrackingRedirects} />
            <Metric label="Verified claims" value={sourceIntake.verifiedClaims} />
            <Metric label="Raw tracking URLs retained" value={sourceIntake.rawTrackingUrlsRetained ? 1 : 0} />
          </dl>
          <p className="mt-3 text-xs leading-5 text-ion-3">
            Social content remains discovery-only. Recipient-specific redirect tokens are not stored.
            Useful claims must be replaced by current primary evidence before promotion.
          </p>
        </article>
      </section>
    </div>
  );
}

function FounderDecisionCard({
  decision,
  rank,
}: {
  readonly decision: FounderQueueDecision;
  readonly rank: number;
}): JSX.Element {
  const { item } = decision;
  return (
    <article className="rounded-md border border-titanium/40 bg-eclipse/45 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-cyan-200">
            #{rank} · {item.project} · {item.lane}
          </p>
          <h3 className="mt-1 text-base font-semibold text-ion-white">{item.title}</h3>
        </div>
        <span className="rounded-full border border-titanium/40 px-2 py-0.5 text-[10px] text-ion-2">
          Score {decision.score} · {item.state}
        </span>
      </div>

      <div className="mt-4 space-y-3 text-xs leading-5">
        <Statement label="What" value={item.what} />
        <Statement label="Why" value={item.why} />
        <Statement label="When" value={item.when} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MiniList label="How" values={item.how} />
        <MiniList label="Done when" values={item.acceptanceCriteria} />
        <MiniList label="Agent owns" values={item.agentCanDo} />
        <MiniList label="Owner only" values={item.ownerOnly.length > 0 ? item.ownerOnly : ["No owner action required for this internal slice"]} />
      </div>

      <div className="mt-4 flex flex-wrap gap-3 border-t border-titanium/30 pt-3 text-[10px] text-ion-3">
        <span>Founder: {item.founderMinutes}m</span>
        <span>Engineering: {item.estimatedEngineeringHours}h</span>
        <span>Revenue: {item.revenueImpact}/5</span>
        <span>Cash avoidance: {item.cashAvoidance}/5</span>
      </div>
    </article>
  );
}

function Statement({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <p className="text-ion-2">
      <span className="font-semibold uppercase tracking-wider text-ion-3">{label}: </span>
      {value}
    </p>
  );
}

function MiniList({ label, values }: { readonly label: string; readonly values: readonly string[] }): JSX.Element {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ion-3">{label}</p>
      <ul className="mt-1.5 space-y-1 text-xs leading-5 text-ion-2">
        {values.map((value) => (
          <li key={value}>• {value}</li>
        ))}
      </ul>
    </div>
  );
}

function PolicyRow({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-titanium/25 pb-2 last:border-0">
      <dt className="text-ion-3">{label}</dt>
      <dd className="max-w-[65%] text-right text-ion-1">{value.replaceAll("_", " ")}</dd>
    </div>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: number }): JSX.Element {
  return (
    <div className="rounded-md border border-titanium/30 bg-eclipse/40 p-3">
      <dt className="text-[10px] uppercase tracking-wider text-ion-3">{label}</dt>
      <dd className="mt-1 font-mono text-lg font-semibold text-ion-white">{value}</dd>
    </div>
  );
}
