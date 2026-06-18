import { sharedJarvisHistory } from "@/lib/cockpit/jarvis-history";
import { loadJarvisAssessment } from "@/lib/cockpit/jarvis-data";
import { JarvisTrend } from "@/components/cockpit/jarvis-trend";

/**
 * /cockpit/jarvis/trend — admin-only.
 *
 * Renders the in-memory ring buffer of Jarvis assessments so the
 * operator can see how the launch status, ingestion, settlement, etc.
 * have moved over the recent past.
 *
 * Each page load also refreshes the buffer (best-effort) so the trend
 * advances even without an external scheduler.
 *
 * The buffer is process-local; this view is most useful as a quick
 * eyeball check, not as a durable history (use serializeJarvisAudit +
 * a log file for that).
 */

export const dynamic = "force-dynamic";

export default async function JarvisTrendPage() {
  const buf = sharedJarvisHistory();

  // Best-effort refresh.
  try {
    const { assessment } = await loadJarvisAssessment();
    buf.push(assessment);
  } catch {
    // Buffer may still hold prior entries.
  }

  const snapshots = buf.recent(96);
  const orderedOldFirst = snapshots.slice().reverse();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Jarvis trend</h1>
        <p className="mt-1 text-sm text-ink-500">
          Last {snapshots.length} assessments held in the in-memory buffer
          (capacity 96). Newest on the right.
        </p>
      </header>

      <section
        data-testid="jarvis-trend-strip"
        className="rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-4"
      >
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-500">
          Launch status (oldest → newest)
        </h2>
        <JarvisTrend snapshots={orderedOldFirst} />
      </section>

      <section
        data-testid="jarvis-trend-table"
        className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.04]/40"
      >
        <table className="w-full min-w-[900px] text-[11px]">
          <thead className="border-b border-white/[0.06] bg-obsidian/50 text-left text-[10px] uppercase tracking-widest text-ink-500">
            <tr>
              <th className="px-3 py-2">Assessed at</th>
              <th className="px-3 py-2">Launch status</th>
              <th className="px-3 py-2">Public surface</th>
              <th className="px-3 py-2">Ingestion</th>
              <th className="px-3 py-2">Settlement</th>
              <th className="px-3 py-2">Canonical</th>
              <th className="px-3 py-2">Signal</th>
              <th className="px-3 py-2">Safety</th>
              <th className="px-3 py-2">Missing phase</th>
              <th className="px-3 py-2">Missing config</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-ink-500">
                  No assessments in the buffer yet. Reload to push the current
                  assessment, or call the <code className="rounded bg-obsidian/70 px-1">/api/cockpit/jarvis/trend</code> endpoint.
                </td>
              </tr>
            ) : (
              snapshots.map((s, i) => (
                <tr
                  key={`${s.assessedAt}-${i}`}
                  className="border-b border-white/[0.06] hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-2 font-mono text-ink-400">{s.assessedAt}</td>
                  <td className="px-3 py-2 text-white">{s.launchStatus}</td>
                  <td className="px-3 py-2 text-ink-300">{s.publicSurfaceStatus}</td>
                  <td className="px-3 py-2 text-ink-300">{s.ingestionStatus}</td>
                  <td className="px-3 py-2 text-ink-300">{s.settlementStatus}</td>
                  <td className="px-3 py-2 text-ink-300">{s.canonicalHistoryStatus}</td>
                  <td className="px-3 py-2 text-ink-300">{s.signalCoverageStatus}</td>
                  <td className="px-3 py-2 font-mono text-ink-400">{s.safetyWarningCount}</td>
                  <td className="px-3 py-2 font-mono text-ink-400">{s.missingPhaseCount}</td>
                  <td className="px-3 py-2 font-mono text-ink-400">{s.externalConfigCount}</td>
                  <td className="px-3 py-2 font-mono text-ink-400">{s.recommendedActionCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <p className="text-[10px] text-ink-500">
        The buffer is process-local. After a server restart the trend starts
        empty. For long-term audit, pair with{" "}
        <code className="rounded bg-obsidian/70 px-1">serializeJarvisAudit()</code>{" "}
        and a log sink.
      </p>
    </div>
  );
}
