import Link from "next/link";
import {
  buildRadarFeed,
  isRadarEnabled,
  type AdoptionDossier,
  type RadarPosture,
} from "@/lib/resource-intelligence/radar";

export const dynamic = "force-dynamic";

/**
 * /cockpit/sources/radar — R&D Radar (Resource Intelligence 2.0).
 *
 * Read-only. Admin-only (cockpit layout enforces the session). Flag-gated
 * behind RESOURCE_RADAR_V2_ENABLED, default off. Nothing here installs,
 * approves, or promotes anything: the radar observes innovation, the owner
 * decides. Gated items (owner review / quarantine) show their blocks —
 * they never appear as ready work.
 */

const POSTURE_TONE: Record<RadarPosture, string> = {
  ADOPT_PATTERNS: "border-emerald-500/30 bg-emerald-950/30 text-emerald-200",
  PROTOTYPE: "border-cyan-500/30 bg-cyan-950/30 text-cyan-200",
  PILOT: "border-blue-500/30 bg-blue-950/30 text-blue-200",
  REFERENCE_ONLY: "border-violet-500/30 bg-violet-950/30 text-violet-200",
  OBSERVE: "border-titanium/40 bg-eclipse/60 text-ion-1",
  OWNER_REVIEW: "border-yellow-500/30 bg-yellow-950/30 text-yellow-200",
  QUARANTINE: "border-red-600/40 bg-red-950/30 text-red-300",
  REJECT: "border-red-900/60 bg-red-950/40 text-red-400",
};

function DossierRow({ d }: { d: AdoptionDossier }) {
  return (
    <li className="rounded-xl border border-titanium/40 bg-eclipse/40 p-4" data-testid="radar-dossier">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold text-ion-white">{d.displayName}</span>
        <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${POSTURE_TONE[d.posture]}`}>
          {d.posture.replace(/_/g, " ")}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-ion-2">risk {d.risk}</span>
        <span className="text-[10px] uppercase tracking-wider text-ion-2">
          {d.license ?? "license unknown"}
          {d.licenseUnverified ? " (unverified)" : ""}
        </span>
        {d.stale && (
          <span className="rounded border border-orange-500/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-orange-300">
            stale
          </span>
        )}
        <span className="ml-auto font-mono text-[11px] text-ion-2">
          {d.score.blockedOverride ? "score void (blocked)" : `score ${d.score.total}/55`}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ion-1">{d.whyRelevant}</p>
      <ul className="mt-2 flex flex-col gap-1">
        {d.whyNotReady.map((r) => (
          <li key={r} className="text-[11px] leading-relaxed text-ion-2">
            · {r}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] uppercase tracking-wider text-ion-3">
        seen: {d.windows.join(", ")} · source: {d.sourceKinds.join(", ")} · maps to{" "}
        <span className="font-semibold">{d.effectiveDisposition}</span>
      </p>
    </li>
  );
}

export default function RadarPage() {
  if (!isRadarEnabled()) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-bold text-ion-white">R&amp;D Radar</h1>
        <section
          data-testid="radar-disabled-state"
          className="mt-8 rounded-2xl border border-titanium/40 bg-eclipse/40 px-6 py-10 text-center"
        >
          <p className="text-base font-semibold text-ion-white">The radar ships dark.</p>
          <p className="mt-3 text-sm leading-6 text-ion-1">
            Set <code className="font-mono text-ion-white">RESOURCE_RADAR_V2_ENABLED=true</code> to
            surface the committed snapshot. This is a deliberate off state, not an error.
          </p>
        </section>
      </div>
    );
  }

  const feed = buildRadarFeed(new Date().toISOString().slice(0, 10));

  if (feed.totalObservations === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-bold text-ion-white">R&amp;D Radar</h1>
        <section
          data-testid="radar-empty-state"
          className="mt-8 rounded-2xl border border-titanium/40 bg-eclipse/40 px-6 py-10 text-center"
        >
          <p className="text-base font-semibold text-ion-white">No observations imported yet.</p>
          <p className="mt-3 text-sm leading-6 text-ion-1">
            Import a founder-verified snapshot with{" "}
            <code className="font-mono">scripts/resource-radar-import.mjs</code>. An empty radar is
            an honest state — nothing is invented to fill it.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ion-white">R&amp;D Radar</h1>
          <p className="mt-1 text-sm text-ion-1">
            Innovation observed, never auto-trusted. Snapshot {feed.snapshotDate} ·{" "}
            {feed.totalObservations} observations → {feed.totalDossiers} dossiers.
          </p>
        </div>
        <Link href="/cockpit/sources" className="text-xs font-semibold text-orbital-cyan hover:text-ion-white">
          ← Sources
        </Link>
      </div>

      {/* Counts strip — gated items are counts here, never action rows. */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="radar-counts">
        {(["daily", "weekly", "monthly", "targeted"] as const).map((w) => (
          <div key={w} className="rounded-xl border border-titanium/40 bg-eclipse/40 p-3 text-center">
            <p className="font-mono text-xl font-bold text-ion-white">{feed.byWindow[w]}</p>
            <p className="text-[10px] uppercase tracking-wider text-ion-2">{w}</p>
          </div>
        ))}
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-3 text-center">
          <p className="font-mono text-xl font-bold text-yellow-200">{feed.gatedCounts.ownerReview}</p>
          <p className="text-[10px] uppercase tracking-wider text-yellow-200/80">owner review</p>
        </div>
        <div className="rounded-xl border border-red-600/40 bg-red-950/20 p-3 text-center">
          <p className="font-mono text-xl font-bold text-red-300">{feed.gatedCounts.quarantine}</p>
          <p className="text-[10px] uppercase tracking-wider text-red-300/80">quarantine</p>
        </div>
        <div className="rounded-xl border border-titanium/40 bg-eclipse/40 p-3 text-center">
          <p className="font-mono text-xl font-bold text-ion-white">{feed.staleDossiers.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-ion-2">stale</p>
        </div>
        <div className="rounded-xl border border-titanium/40 bg-eclipse/40 p-3 text-center">
          <p className="font-mono text-xl font-bold text-ion-white">{feed.recommendedExperiments.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-ion-2">experiments</p>
        </div>
      </section>

      {/* Recommended experiments — bounded, no-install actions only. */}
      <section className="mt-8" data-testid="radar-experiments">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ion-2">
          Recommended experiments
        </h2>
        <p className="mt-1 text-[11px] text-ion-2">
          Nothing below is approved to install. Every experiment ends at an owner decision.
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {feed.recommendedExperiments.map((e) => (
            <li key={e.normalizedRepository} className="rounded-xl border border-titanium/40 bg-eclipse/40 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-ion-white">{e.displayName}</span>
                <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${POSTURE_TONE[e.posture]}`}>
                  {e.posture.replace(/_/g, " ")}
                </span>
                <span className="ml-auto font-mono text-[11px] text-ion-2">score {e.scoreTotal}/55</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-ion-1">{e.experiment}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Full dossier table — read-only, blocks spelled out. */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ion-2">
          Adoption dossiers ({feed.totalDossiers})
        </h2>
        <p className="mt-1 text-[11px] text-ion-2">
          Numbers from trending snapshots are popularity facts; every capability description is a
          claim until GSE reproduces it. Scores are advisory — a blocked condition voids them.
        </p>
        <ul className="mt-3 flex flex-col gap-3">
          {feed.dossiers.map((d) => (
            <DossierRow key={d.normalizedRepository} d={d} />
          ))}
        </ul>
      </section>

      <p className="mt-8 text-[11px] leading-relaxed text-ion-3">
        Source snapshot sha256 <code className="font-mono">{feed.sourceSha256.slice(0, 16)}…</code>{" "}
        · imported from docs/rnd/radar-snapshots/ · policy:{" "}
        <Link href="/cockpit/sources" className="text-orbital-cyan hover:text-ion-white">
          docs/rnd/RADAR_POLICY.md
        </Link>
      </p>
    </div>
  );
}
