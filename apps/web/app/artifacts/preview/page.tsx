import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { ARTIFACT_TYPES } from "@/lib/galaxy/kernel/artifacts";
import { containsForbiddenForPublic } from "@/lib/explainability/levels";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Artifact Preview — Galaxy Internal",
  robots: { index: false, follow: false },
};

// ─────────────────────────────────────────────
// Auth gate — ADMIN only
// ─────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/auth/signin?callbackUrl=/artifacts/preview");
  }
}

// ─────────────────────────────────────────────
// Compliance check
// ─────────────────────────────────────────────

function artifactComplianceCheck(text: string): {
  pass: boolean;
  violation: string | null;
} {
  const violation = containsForbiddenForPublic(text);
  return { pass: violation === null, violation };
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function ArtifactsPreviewPage() {
  await requireAdmin();

  const sampleTitles: Record<string, string> = {
    pick: "BOS -3.5",
    "no-bet": "Passed — MLK",
    autopsy: "Grade: A",
    "parlay-mri": "Corr. Risk: High",
    "market-mirage": "Divergence: 24pt",
    "roster-shock": "Impact: Moderate",
    "coaching-edge": "Edge: +1.8",
    "academy-badge": "Foundation Complete",
    "bettor-brain": "Operator",
    "discipline-recap": "Process: 8/10",
    "edge-lab": "Signal: +EV",
  };

  const sampleSubs: Record<string, string> = {
    pick: "NBA · Boston Celtics vs New York Knicks",
    "no-bet": "NBA · Confidence gate not cleared",
    autopsy: "Good process — adverse result",
    "parlay-mri": "3-leg parlay — correlated legs detected",
    "market-mirage": "Public 68% vs Market -3.5",
    "roster-shock": "Questionable starter — NBA",
    "coaching-edge": "Situational tendency analysis",
    "academy-badge": "5 modules completed",
    "bettor-brain": "Stage 3 of 5 · Disciplined",
    "discipline-recap": "Week of May 26 — 4 picks graded",
    "edge-lab": "MLB totals · Early season",
  };

  return (
    <div className="flex min-h-screen flex-col bg-carbon">
      <Nav />

      <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">

          {/* Header */}
          <div className="mb-10">
            <div className="mb-2 flex items-center gap-3">
              <span className="rounded-full bg-rose-900/40 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-rose-400">
                Internal only
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                Noindex
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Artifact Preview
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              All {ARTIFACT_TYPES.length} shareable artifact types. Each OG image
              renders from <code className="text-gray-300">/api/og/[artifact]</code>.
              Compliance check (containsForbiddenForPublic) runs on every sample label.
            </p>
          </div>

          {/* Compliance summary */}
          <section className="mb-10 rounded-xl border border-mineral bg-gray-900/50 p-5">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
              Compliance — containsForbiddenForPublic scan
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ARTIFACT_TYPES.map((artifact) => {
                const title = sampleTitles[artifact.id] ?? artifact.label;
                const sub = sampleSubs[artifact.id] ?? "";
                const checkText = `${artifact.label} ${title} ${sub}`;
                const result = artifactComplianceCheck(checkText);
                return (
                  <div
                    key={artifact.id}
                    className="flex items-center gap-2 rounded-lg border border-mineral bg-gray-950/50 px-3 py-2"
                  >
                    <span
                      className={[
                        "h-2 w-2 rounded-full shrink-0",
                        result.pass ? "bg-emerald-500" : "bg-rose-500",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                    <span className="font-mono text-[10px] text-gray-300">
                      {artifact.id}
                    </span>
                    {!result.pass && (
                      <span className="ml-auto font-mono text-[9px] text-rose-400">
                        FAIL: {result.violation}
                      </span>
                    )}
                    {result.pass && (
                      <span className="ml-auto font-mono text-[9px] text-emerald-400">
                        PASS
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Artifact grid */}
          <section>
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
              OG previews — click to open image in new tab
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {ARTIFACT_TYPES.map((artifact) => {
                const title = encodeURIComponent(sampleTitles[artifact.id] ?? artifact.label);
                const sub = encodeURIComponent(sampleSubs[artifact.id] ?? "");
                const ogUrl = `/api/og/${artifact.id}?title=${title}&sub=${sub}`;

                return (
                  <div
                    key={artifact.id}
                    className="rounded-2xl border border-mineral bg-gray-900/50 p-4"
                  >
                    {/* Metadata */}
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-white">
                          {artifact.id}
                        </span>
                        {artifact.requiresDisclaimer && (
                          <span className="rounded-full border border-amber-700/40 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-amber-500">
                            Disclaimer req.
                          </span>
                        )}
                        {artifact.requiresEvidenceChain && (
                          <span className="rounded-full border border-blue-700/40 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-blue-500">
                            Evidence req.
                          </span>
                        )}
                      </div>
                      <Link
                        href={ogUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[9px] uppercase tracking-widest text-accent-300 hover:text-accent-200 transition-colors"
                      >
                        Open →
                      </Link>
                    </div>

                    <p className="mb-3 text-xs text-gray-500">{artifact.description}</p>

                    {/* OG image preview */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ogUrl}
                      alt={`OG preview for ${artifact.id}`}
                      width={1200}
                      height={630}
                      className="w-full rounded-lg border border-mineral"
                      style={{ aspectRatio: "1200/630" }}
                    />
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
