import {
  CAPABILITY_REGISTRY,
  computeWiringScore,
  getWiringLabel,
  type CapabilityCategory,
  type CapabilityStatus,
  type JarvisCapability,
} from "@/lib/jarvis/capability-registry";
import { getOperatingLoop, type PhaseStatus } from "@/lib/jarvis/intelligence-state";

/**
 * Capability System Map — the operating brain of the company, rendered honestly.
 * Server component over static architecture truth: no DB, no model calls.
 * Every status badge reflects the capability registry verbatim.
 */

const CATEGORY_ORDER: readonly CapabilityCategory[] = [
  "INTELLIGENCE_CORE",
  "PLATFORM_OPERATIONS",
  "GROWTH_REVENUE",
  "AI_INFRASTRUCTURE",
];

const CATEGORY_LABELS: Readonly<Record<CapabilityCategory, string>> = {
  INTELLIGENCE_CORE: "Intelligence Core",
  PLATFORM_OPERATIONS: "Platform Operations",
  GROWTH_REVENUE: "Growth & Revenue",
  AI_INFRASTRUCTURE: "AI Infrastructure",
};

const STATUS_STYLES: Readonly<Record<CapabilityStatus, string>> = {
  ACTIVE: "border-accent-800/50 bg-accent-950/30 text-accent-400",
  DRAFT_ONLY: "border-plasma/40 bg-plasma/10 text-plasma",
  MANUAL: "border-yellow-900/40 bg-yellow-950/20 text-yellow-300",
  DESIGNED: "border-ultraviolet/30 bg-ultraviolet/10 text-ultraviolet",
  NOT_WIRED: "border-titanium/40 bg-obsidian/60 text-ion-3",
};

const PHASE_DOT: Readonly<Record<PhaseStatus, string>> = {
  WIRED: "bg-accent-500",
  PARTIAL: "bg-yellow-300",
  NOT_WIRED: "bg-ion-3/30",
};

export function CapabilitySystemMap() {
  const score = computeWiringScore();
  const loop = getOperatingLoop();
  const statusCount = (s: CapabilityStatus): number =>
    CAPABILITY_REGISTRY.filter((c) => c.status === s).length;

  return (
    <section
      data-testid="capability-map-zone"
      className="overflow-hidden rounded-2xl border border-titanium/40 bg-carbon/80"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-titanium/30 px-5 py-3">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-ion-2">
            Capability System Map
          </h2>
          <p className="mt-0.5 text-[9px] text-ion-3">
            {CAPABILITY_REGISTRY.length} capabilities · honest status only — nothing is marked
            active unless it truly runs autonomously
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-mono text-[8px] uppercase tracking-widest text-ion-3">
              Wiring Score
            </p>
            <p
              data-testid="wiring-score"
              className="text-2xl font-black tabular-nums leading-none text-ion-white"
            >
              {score}
              <span className="text-xs font-medium text-ion-3">/100</span>
            </p>
            <p className="text-[8px] uppercase tracking-widest text-ion-3">
              {getWiringLabel(score)}
            </p>
          </div>
        </div>
      </div>

      {/* Operating loop strip */}
      <div
        data-testid="operating-loop"
        className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-titanium/30 bg-obsidian/40 px-5 py-2.5"
      >
        <span className="font-mono text-[8px] uppercase tracking-widest text-ion-3">
          Operating Loop
        </span>
        {loop.map((p) => (
          <span
            key={p.phase}
            className="flex items-center gap-1.5"
            title={p.truth}
          >
            <span
              className={["h-1.5 w-1.5 rounded-full", PHASE_DOT[p.status]].join(" ")}
              aria-hidden="true"
            />
            <span
              className={[
                "font-mono text-[9px] uppercase tracking-wider",
                p.status === "WIRED"
                  ? "text-ion-white"
                  : p.status === "PARTIAL"
                    ? "text-ion-2"
                    : "text-ion-3",
              ].join(" ")}
            >
              {p.phase.replace("_", " ")}
            </span>
          </span>
        ))}
      </div>

      {/* Status distribution */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-titanium/30 px-5 py-2">
        {(
          [
            ["ACTIVE", "autonomous"],
            ["DRAFT_ONLY", "drafts await approval"],
            ["MANUAL", "human-run"],
            ["DESIGNED", "architecture only"],
            ["NOT_WIRED", "concept only"],
          ] as ReadonlyArray<[CapabilityStatus, string]>
        ).map(([status, desc]) => (
          <span key={status} className="font-mono text-[9px] text-ion-3">
            <span className="font-bold tabular-nums text-ion-2">{statusCount(status)}</span>{" "}
            {status.replace("_", " ").toLowerCase()}{" "}
            <span className="text-ion-3">({desc})</span>
          </span>
        ))}
      </div>

      {/* Category groups */}
      <div className="grid gap-px bg-titanium/20 sm:grid-cols-2">
        {CATEGORY_ORDER.map((cat) => (
          <div key={cat} className="bg-carbon/90 p-4">
            <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-widest text-ion-3">
              {CATEGORY_LABELS[cat]}
            </p>
            <div className="space-y-2">
              {CAPABILITY_REGISTRY.filter((c) => c.category === cat).map((c) => (
                <CapabilityRow key={c.id} capability={c} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CapabilityRow({ capability }: { capability: JarvisCapability }) {
  return (
    <div
      data-testid={`capability-${capability.id}`}
      className="rounded-lg border border-titanium/30 bg-obsidian/40 px-3 py-2"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-ion-white">{capability.name}</p>
        <span
          className={[
            "flex-shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest",
            STATUS_STYLES[capability.status],
          ].join(" ")}
        >
          {capability.status.replace("_", " ")}
        </span>
      </div>
      <p className="mt-1 text-[9px] leading-snug text-ion-3">{capability.currentTruth}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <span className="font-mono text-[8px] uppercase tracking-wider text-ion-3">
          risk: {capability.riskLevel.toLowerCase()}
        </span>
        {capability.requiresHumanApproval && (
          <span className="font-mono text-[8px] uppercase tracking-wider text-yellow-300/70">
            approval required
          </span>
        )}
        {capability.proofSource && (
          <span className="font-mono text-[8px] text-ion-3">
            proof: {capability.proofSource}
          </span>
        )}
      </div>
      <p className="mt-1 text-[9px] text-ion-2">
        <span className="font-mono text-[8px] uppercase tracking-wider text-ion-3">
          next →{" "}
        </span>
        {capability.nextAction}
      </p>
    </div>
  );
}
