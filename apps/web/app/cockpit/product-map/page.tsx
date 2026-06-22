import {
  FIRST_OF_KIND_SYSTEMS,
  GSE_SCORING_MODELS,
  confirmedUniqueCount,
  systemsByCategory,
  liveOrInSprintSystems,
  criticalTrustImpactSystems,
  type SystemCategory,
  type GseReadiness,
} from "@/lib/research/first-of-kind-systems";

export const dynamic = "force-dynamic";

const READINESS_TONE: Record<GseReadiness, string> = {
  live: "border-emerald-500/30 bg-emerald-950/30 text-emerald-200",
  in_sprint: "border-cyan-500/30 bg-cyan-950/30 text-cyan-200",
  designed_not_built: "border-blue-500/30 bg-blue-950/30 text-blue-200",
  roadmap_q3_2026: "border-violet-500/30 bg-violet-950/30 text-violet-200",
  roadmap_2027: "border-titanium/40 bg-eclipse/60 text-ion-2",
  concept: "border-titanium/30 bg-eclipse/30 text-ion-3",
};

const READINESS_LABEL: Record<GseReadiness, string> = {
  live: "Live",
  in_sprint: "In sprint",
  designed_not_built: "Designed",
  roadmap_q3_2026: "Q3 2026",
  roadmap_2027: "2027",
  concept: "Concept",
};

const IMPACT_TONE: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-ion-3",
};

const CATEGORIES: SystemCategory[] = [
  "draft_intelligence",
  "league_memory",
  "decision_os",
  "calibration_accountability",
  "dfs_portfolio",
  "voice_assistant",
  "prediction_analytics",
  "integrity",
  "revenue_readiness",
];

export default function ProductMapPage(): JSX.Element {
  const confirmedUnique = confirmedUniqueCount();
  const liveOrSprint = liveOrInSprintSystems();
  const criticalTrust = criticalTrustImpactSystems();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-300">
            Product Intelligence
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ion-white">First-of-Kind Product Map</h1>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-ion-2">
          {FIRST_OF_KIND_SYSTEMS.length} first-of-kind systems documented. {confirmedUnique} confirmed unique in the market.
          Feature claims based on public research as of June 2026 — source gaps noted per system.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total systems" value={String(FIRST_OF_KIND_SYSTEMS.length)} detail="First-of-kind or differentiated" />
        <Metric label="Confirmed unique" value={String(confirmedUnique)} detail="No competitor offers this" />
        <Metric label="Live or in sprint" value={String(liveOrSprint.length)} detail="Built or actively building" />
        <Metric label="Critical trust impact" value={String(criticalTrust.length)} detail="Core to GSE trust thesis" />
      </section>

      <section className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">Live &amp; in-sprint systems</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {liveOrSprint.map((s) => (
            <div key={s.id} className="rounded-lg border border-titanium/40 bg-obsidian/70 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-ion-white">{s.name}</p>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] ${READINESS_TONE[s.gseReadiness]}`}>
                  {READINESS_LABEL[s.gseReadiness]}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-ion-2">{s.oneLiner}</p>
              <p className={`mt-2 text-[10px] font-semibold uppercase ${IMPACT_TONE[s.trustImpact]}`}>
                trust: {s.trustImpact}
              </p>
            </div>
          ))}
        </div>
      </section>

      {CATEGORIES.map((category) => {
        const systems = systemsByCategory(category);
        if (systems.length === 0) return null;
        return (
          <section key={category}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">
                {category.replace(/_/g, " ")}
              </h2>
              <span className="rounded border border-titanium/40 px-1.5 py-0.5 font-mono text-[10px] text-ion-3">
                {systems.length}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {systems.map((s) => (
                <SystemCard key={s.id} system={s} />
              ))}
            </div>
          </section>
        );
      })}

      <section className="overflow-hidden rounded-2xl border border-titanium/40 bg-obsidian/60">
        <div className="border-b border-titanium/40 px-4 py-3">
          <h2 className="text-sm font-semibold text-ion-white">GSE scoring models</h2>
          <p className="mt-1 text-xs text-ion-3">
            The 7 composite scores powering GSE recommendations and calibration.
          </p>
        </div>
        <div className="divide-y divide-titanium/30">
          {GSE_SCORING_MODELS.map((m) => (
            <div key={m.id} className="px-4 py-3">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1">
                  <p className="font-medium text-ion-white">{m.name}</p>
                  <p className="mt-1 text-xs leading-5 text-ion-2">{m.description}</p>
                </div>
                <span className="font-mono text-[10px] text-cyan-300">{m.outputRange}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {m.usedIn.map((u) => (
                  <span key={u} className="rounded bg-obsidian px-1.5 py-0.5 font-mono text-[9px] text-ion-3">
                    {u}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SystemCard({ system }: { system: typeof FIRST_OF_KIND_SYSTEMS[number] }): JSX.Element {
  return (
    <div className="rounded-lg border border-titanium/40 bg-obsidian/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-ion-white">{system.name}</p>
        <span className={`rounded border px-1.5 py-0.5 text-[10px] ${READINESS_TONE[system.gseReadiness]}`}>
          {READINESS_LABEL[system.gseReadiness]}
        </span>
      </div>
      <p className="mt-1 text-xs leading-5 text-ion-2">{system.oneLiner}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
        <span className={`font-semibold ${IMPACT_TONE[system.revenueImpact]}`}>
          rev: {system.revenueImpact}
        </span>
        <span className={`font-semibold ${IMPACT_TONE[system.trustImpact]}`}>
          trust: {system.trustImpact}
        </span>
        <span className="text-ion-3">ph {system.buildPhase}</span>
      </div>
      {system.sourceGapNote && (
        <p className="mt-2 text-[10px] text-yellow-400/80">
          Source gap: {system.sourceGapNote.slice(0, 80)}
        </p>
      )}
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-titanium/40 bg-obsidian/60 p-4">
      <p className="text-[11px] uppercase tracking-wider text-ion-3">{label}</p>
      <p className="mt-2 font-numerals text-2xl font-semibold text-ion-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-ion-3">{detail}</p>
    </div>
  );
}
