import {
  COMPETITOR_INTELLIGENCE,
  summarizeCompetitorCategories,
  competitorsMissingFeature,
  topCompetitorMechanics,
  gseGapSummary,
} from "@/lib/research/competitor-intelligence";

export const dynamic = "force-dynamic";

export default function CompetitorIntelligencePage(): JSX.Element {
  const categoryCounts = summarizeCompetitorCategories(COMPETITOR_INTELLIGENCE);
  const topMechanics = topCompetitorMechanics(COMPETITOR_INTELLIGENCE);
  const gapSummary = gseGapSummary(COMPETITOR_INTELLIGENCE);

  const missingCalibration = competitorsMissingFeature(COMPETITOR_INTELLIGENCE, "calibrationTracking");
  const missingProcess = competitorsMissingFeature(COMPETITOR_INTELLIGENCE, "processGrading");
  const missingVoice = competitorsMissingFeature(COMPETITOR_INTELLIGENCE, "voiceAssistant");
  const missingGenome = competitorsMissingFeature(COMPETITOR_INTELLIGENCE, "managerGenome");

  const categoryEntries = Object.entries(categoryCounts) as Array<[string, number]>;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-300">
              Competitive Intelligence
            </p>
            <h1 className="mt-1 text-2xl font-bold text-ion-white">Competitor Map</h1>
          </div>
          <span className="rounded border border-titanium/40 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-ion-2">
            {COMPETITOR_INTELLIGENCE.length} competitors tracked
          </span>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-ion-2">
          Structured competitive intelligence across fantasy, DFS, prediction, and analytics.
          Feature flags are based on public product research as of June 2026.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Competitors tracked" value={String(COMPETITOR_INTELLIGENCE.length)} detail="Fantasy, DFS, prediction, analytics" />
        <Metric label="Missing calibration tracking" value={String(missingCalibration.length)} detail="Don't publish MAE/RMSE/Brier score" />
        <Metric label="Missing process grading" value={String(missingProcess.length)} detail="Don't distinguish process vs outcome" />
        <Metric label="Missing voice assistant" value={String(missingVoice.length)} detail="No voice-first draft interface" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">Category breakdown</h2>
          <div className="mt-4 space-y-2">
            {categoryEntries.map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between rounded-lg border border-titanium/40 bg-obsidian/70 px-3 py-2">
                <p className="text-sm text-ion-1">{cat.replace(/-/g, " ")}</p>
                <span className="font-numerals text-sm font-semibold text-ion-white">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">GSE gap summary</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3">
              <p className="text-[11px] uppercase tracking-widest text-emerald-300">Missing Manager Genome</p>
              <p className="mt-1 font-numerals text-3xl font-semibold text-emerald-200">{gapSummary.missingManagerGenome}</p>
              <p className="mt-1 text-xs text-ion-3">Competitors lacking per-opponent draft DNA profiling</p>
            </div>
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-3">
              <p className="text-[11px] uppercase tracking-widest text-cyan-300">Missing calibration tracking</p>
              <p className="mt-1 font-numerals text-3xl font-semibold text-cyan-200">{gapSummary.missingCalibrationTracking}</p>
              <p className="mt-1 text-xs text-ion-3">Competitors without published MAE/RMSE/Brier scores</p>
            </div>
            <div className="rounded-lg border border-violet-500/30 bg-violet-950/20 p-3">
              <p className="text-[11px] uppercase tracking-widest text-violet-300">Top mechanics to adapt</p>
              <div className="mt-2 space-y-1">
                {topMechanics.slice(0, 3).map((m) => (
                  <div key={m.name} className="text-xs text-ion-2">
                    <span className="font-medium text-ion-white">{m.name}:</span> {m.mechanic.slice(0, 80)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-yellow-900/30 bg-yellow-950/10 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-yellow-300">First-of-kind gaps in the market</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <GapCard
            title="Manager Genome"
            count={missingGenome.length}
            description="Opponents profiled per their draft DNA"
          />
          <GapCard
            title="Process Grading"
            count={missingProcess.length}
            description="Good/bad process vs good/bad outcome"
          />
          <GapCard
            title="Calibration Tracking"
            count={missingCalibration.length}
            description="Published MAE/RMSE/Brier per pick"
          />
          <GapCard
            title="Voice Jarvis"
            count={missingVoice.length}
            description="Live voice draft co-pilot"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-titanium/40 bg-obsidian/60">
        <div className="border-b border-titanium/40 px-4 py-3">
          <h2 className="text-sm font-semibold text-ion-white">Full competitor table</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] divide-y divide-titanium/30 text-left text-sm">
            <thead className="bg-eclipse/50 text-[11px] uppercase tracking-wider text-ion-3">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Primary category</th>
                <th className="px-4 py-3">Calibration</th>
                <th className="px-4 py-3">Process</th>
                <th className="px-4 py-3">Voice</th>
                <th className="px-4 py-3">Genome</th>
                <th className="px-4 py-3">Key mechanic to learn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-titanium/30">
              {COMPETITOR_INTELLIGENCE.map((c) => (
                <tr key={c.id} className="align-top text-ion-1">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ion-white">{c.name}</p>
                    <p className="text-[10px] text-ion-3">{c.url}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-ion-3">
                    {c.categories[0]?.replace(/-/g, " ") ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Flag value={c.features.calibrationTracking} />
                  </td>
                  <td className="px-4 py-3">
                    <Flag value={c.features.processGrading} />
                  </td>
                  <td className="px-4 py-3">
                    <Flag value={c.features.voiceAssistant} />
                  </td>
                  <td className="px-4 py-3">
                    <Flag value={c.features.managerGenome} />
                  </td>
                  <td className="px-4 py-3 text-xs leading-5 text-ion-2">
                    {c.mechanicGseLearn.slice(0, 80)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

function Flag({ value }: { value: boolean }): JSX.Element {
  return value ? (
    <span className="text-xs font-semibold text-emerald-400">yes</span>
  ) : (
    <span className="text-xs text-red-400/70">no</span>
  );
}

function GapCard({ title, count, description }: { title: string; count: number; description: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-yellow-900/30 bg-obsidian/60 p-3">
      <p className="text-sm font-semibold text-ion-white">{title}</p>
      <p className="mt-1 font-numerals text-3xl font-semibold text-yellow-300">{count}</p>
      <p className="mt-1 text-xs text-ion-3">competitors missing this · {description}</p>
    </div>
  );
}
