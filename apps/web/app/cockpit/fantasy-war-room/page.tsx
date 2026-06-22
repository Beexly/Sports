import {
  DRAFT_INTELLIGENCE_PHASES,
  STANDARD_ROSTER_CONFIGS,
  urgencyLabel,
  valueOverAdpLabel,
} from "@/lib/fantasy/draft-intelligence-roadmap";
import {
  IMPORT_FORMAT_SPECS,
  automatedImportFormats,
  manualImportFormats,
  archetypeLabel,
} from "@/lib/fantasy/league-memory-roadmap";
import {
  JARVIS_COMMAND_TEMPLATES,
  DRAFT_PLATFORM_POSTURES,
  JARVIS_PRIVACY_REQUIREMENTS,
  DEFAULT_JARVIS_CONFIG,
  permittedPlatforms,
  blockedPlatforms,
} from "@/lib/fantasy/voice-jarvis-roadmap";
import {
  DRAFT_ARCHETYPE_PROFILES,
  HISTORICAL_DATA_SOURCES,
  approvedHistoricalSources,
} from "@/lib/fantasy/historical-draft-intelligence";
import type { GseReadiness } from "@/lib/research/first-of-kind-systems";
import type { SyncPermission } from "@/lib/fantasy/voice-jarvis-roadmap";

export const dynamic = "force-dynamic";

const READINESS_TONE: Record<GseReadiness, string> = {
  live: "border-emerald-500/30 bg-emerald-950/30 text-emerald-200",
  in_sprint: "border-cyan-500/30 bg-cyan-950/30 text-cyan-200",
  designed_not_built: "border-blue-500/30 bg-blue-950/30 text-blue-200",
  roadmap_q3_2026: "border-violet-500/30 bg-violet-950/30 text-violet-200",
  roadmap_2027: "border-titanium/40 bg-eclipse/60 text-ion-2",
  concept: "border-titanium/30 bg-eclipse/30 text-ion-3",
};

const SYNC_TONE: Record<SyncPermission, string> = {
  PERMITTED: "border-emerald-500/30 bg-emerald-950/30 text-emerald-200",
  CONDITIONAL_PERMISSION: "border-cyan-500/30 bg-cyan-950/30 text-cyan-200",
  NOT_PERMITTED: "border-red-500/30 bg-red-950/30 text-red-300",
  UNKNOWN: "border-titanium/40 bg-eclipse/60 text-ion-2",
  UNDER_REVIEW: "border-yellow-500/30 bg-yellow-950/30 text-yellow-200",
};

export default function FantasyWarRoomPage(): JSX.Element {
  const permitted = permittedPlatforms();
  const blocked = blockedPlatforms();
  const autoImports = automatedImportFormats();
  const manualImports = manualImportFormats();
  const approvedSources = approvedHistoricalSources();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
            Fantasy Intelligence
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ion-white">Fantasy War Room</h1>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-ion-2">
          Draft intelligence, league memory, Voice Jarvis, and historical regret engine.
          Build phases, platform sync posture, and privacy requirements documented here.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Build phases" value={String(DRAFT_INTELLIGENCE_PHASES.length)} detail="From ADP engine to Roster Destiny Simulator" />
        <Metric label="Jarvis commands" value={String(JARVIS_COMMAND_TEMPLATES.length)} detail="Intent-based voice command templates" />
        <Metric label="Permitted platforms" value={String(permitted.length)} detail="Sleeper, Yahoo — conditional permission" />
        <Metric label="Approved data sources" value={String(approvedSources.length)} detail="For historical draft intelligence" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">Draft intelligence build phases</h2>
          <div className="mt-4 space-y-3">
            {DRAFT_INTELLIGENCE_PHASES.map((phase) => (
              <div key={phase.phase} className="rounded-lg border border-titanium/40 bg-obsidian/70 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ion-white">Phase {phase.phase}: {phase.name}</p>
                    <p className="mt-1 text-xs text-ion-2">{phase.description.slice(0, 100)}…</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] ${READINESS_TONE[phase.gseReadiness]}`}>
                      {phase.gseReadiness.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-ion-3">{phase.estimatedDays}d</span>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-[10px] uppercase tracking-widest text-ion-3">Deliverables</p>
                  {phase.deliverables.slice(0, 2).map((d, i) => (
                    <p key={i} className="font-mono text-[10px] text-ion-2">{d}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">Voice Jarvis config</h2>
            <div className="mt-4 space-y-2">
              {(Object.entries(DEFAULT_JARVIS_CONFIG) as Array<[string, string]>).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-3 rounded border border-titanium/40 bg-obsidian/70 px-3 py-2">
                  <p className="font-mono text-[10px] text-ion-3">{key}</p>
                  <p className="font-mono text-[10px] text-cyan-300">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">Privacy requirements</h2>
            <div className="mt-4 space-y-2">
              {JARVIS_PRIVACY_REQUIREMENTS.map((req, i) => (
                <div key={i} className="rounded-lg border border-titanium/40 bg-obsidian/70 p-2">
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 text-[10px] font-semibold ${req.mandatory ? "text-red-400" : "text-ion-3"}`}>
                      {req.mandatory ? "REQUIRED" : "opt"}
                    </span>
                    <p className="text-xs leading-5 text-ion-1">{req.requirement}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-titanium/40 bg-obsidian/60">
        <div className="border-b border-titanium/40 px-4 py-3">
          <h2 className="text-sm font-semibold text-ion-white">Draft platform sync posture</h2>
          <p className="mt-1 text-xs text-ion-3">
            {permitted.length} conditionally permitted · {blocked.length} not permitted. No automated pick submission on any platform.
          </p>
        </div>
        <div className="divide-y divide-titanium/30">
          {DRAFT_PLATFORM_POSTURES.map((p) => (
            <div key={p.platform} className="flex flex-wrap items-start gap-4 px-4 py-3">
              <div className="min-w-[8rem] flex-1">
                <p className="font-medium text-ion-white">{p.platform}</p>
                <p className="mt-1 text-xs text-ion-2">{p.method}</p>
              </div>
              <span className={`rounded border px-2 py-0.5 text-[10px] ${SYNC_TONE[p.syncPermission]}`}>
                {p.syncPermission.replace(/_/g, " ")}
              </span>
              <div className="w-full">
                <p className="text-[11px] text-ion-3">{p.legalNote}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-titanium/40 bg-obsidian/60">
          <div className="border-b border-titanium/40 px-4 py-3">
            <h2 className="text-sm font-semibold text-ion-white">League memory import formats</h2>
          </div>
          <div className="divide-y divide-titanium/30">
            {IMPORT_FORMAT_SPECS.map((f) => (
              <div key={f.format} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-ion-white">{f.name}</p>
                  <div className="flex gap-1">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] ${f.automatable ? "border-emerald-500/30 text-emerald-200" : "border-titanium/40 text-ion-3"}`}>
                      {f.automatable ? "auto" : "manual"}
                    </span>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] ${f.dataQuality === "high" ? "border-cyan-500/30 text-cyan-200" : "border-titanium/40 text-ion-3"}`}>
                      {f.dataQuality}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-ion-3">{f.legalPosture.slice(0, 80)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">Voice Jarvis commands</h2>
          <div className="mt-4 space-y-2">
            {JARVIS_COMMAND_TEMPLATES.map((t) => (
              <div key={t.intent} className="rounded-lg border border-titanium/40 bg-obsidian/70 p-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-violet-300">{t.intent.replace(/_/g, " ")}</p>
                <p className="mt-1 text-[11px] italic text-ion-3">
                  &ldquo;{t.examplePhrases[0]}&rdquo;
                </p>
                <p className="mt-1 text-[10px] text-ion-3">max {t.maxResponseWords} words</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">Historical data sources</h2>
        <p className="mt-2 text-xs text-ion-2">
          {approvedSources.length}/{HISTORICAL_DATA_SOURCES.length} approved for use in Historical Regret Engine.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HISTORICAL_DATA_SOURCES.map((src) => (
            <div key={src.sourceId} className="rounded-lg border border-titanium/40 bg-obsidian/70 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-ion-white">{src.name}</p>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] ${src.rightsStatus === "approved_open_license" || src.rightsStatus === "approved_api" ? "border-emerald-500/30 text-emerald-200" : "border-yellow-500/30 text-yellow-200"}`}>
                  {src.rightsStatus.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-1 text-xs text-ion-2">{src.description}</p>
              <p className="mt-1 font-mono text-[10px] text-ion-3">{src.seasons}</p>
            </div>
          ))}
        </div>
      </section>
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
