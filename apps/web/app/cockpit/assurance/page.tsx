import {
  buildAssuranceReport,
  isAssuranceEnabled,
  COVERAGE_THRESHOLD,
  type AssuranceFinding,
} from "@/lib/assurance";
import { findRepoRoot } from "@/lib/ops/repo-root";

export const dynamic = "force-dynamic";

/**
 * /cockpit/assurance — the AI setup, graded by evidence or not at all.
 *
 * Read-only, admin-only (cockpit layout), behind AI_SETUP_ASSURANCE_ENABLED.
 * The verdict is INCOMPLETE while coverage sits under the threshold — a
 * confident letter grade over unverified ground is exactly the kind of claim
 * this platform bans.
 */

const RISK_TONE: Record<AssuranceFinding["risk"], string> = {
  LOW: "border-titanium/40 bg-eclipse/60 text-ion-1",
  MEDIUM: "border-yellow-500/30 bg-yellow-950/30 text-yellow-200",
  HIGH: "border-orange-500/40 bg-orange-950/30 text-orange-200",
  CRITICAL: "border-red-600/40 bg-red-950/30 text-red-300",
};

function FindingCard({ f }: { f: AssuranceFinding }) {
  return (
    <li className="rounded-xl border border-titanium/40 bg-eclipse/40 p-4" data-testid="assurance-finding">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${RISK_TONE[f.risk]}`}>
          {f.risk}
        </span>
        <span className="text-sm font-semibold text-ion-white">{f.title}</span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-ion-3">
          {f.status}
          {f.ownerActionRequired ? " · owner" : ""}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ion-1">{f.whyItMatters}</p>
      <ul className="mt-2 flex flex-col gap-1">
        {f.evidence.map((e) => (
          <li key={`${e.path}:${e.observation}`} className="font-mono text-[10px] text-ion-2">
            {e.path} — {e.observation}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-ion-2">
        <span className="font-semibold text-ion-1">Validate:</span> {f.smallestValidation}{" "}
        <span className="font-semibold text-ion-1">Fix:</span> {f.smallestSafeFix}
      </p>
    </li>
  );
}

export default function AssurancePage() {
  if (!isAssuranceEnabled()) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-bold text-ion-white">AI Setup Assurance</h1>
        <section
          data-testid="assurance-disabled-state"
          className="mt-8 rounded-2xl border border-titanium/40 bg-eclipse/40 px-6 py-10 text-center"
        >
          <p className="text-base font-semibold text-ion-white">The report ships dark.</p>
          <p className="mt-3 text-sm leading-6 text-ion-1">
            Set <code className="font-mono text-ion-white">AI_SETUP_ASSURANCE_ENABLED=true</code> to
            build the evidence report. This is a deliberate off state, not an error.
          </p>
        </section>
      </div>
    );
  }

  const repoRoot = findRepoRoot();
  if (repoRoot === null) {
    // Serverless runtime: file evidence is uninspectable. Refusing beats a
    // report whose fs claims all invert (the deployed-runtime bug class).
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-bold text-ion-white">AI Setup Assurance</h1>
        <section
          data-testid="assurance-runtime-limited-state"
          className="mt-8 rounded-2xl border border-caution/40 bg-caution/[0.06] px-6 py-10 text-center"
        >
          <p className="text-base font-semibold text-ion-white">
            This runtime cannot inspect the repository tree.
          </p>
          <p className="mt-3 text-sm leading-6 text-ion-1">
            File-based evidence is unavailable here, so no report is shown —
            a report built on uninspectable ground would state absences as
            facts. Run it in CI or dev, where the checkout exists. This is a
            runtime limitation, not a verdict on the setup.
          </p>
        </section>
      </div>
    );
  }

  const report = buildAssuranceReport({ repoRoot });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-bold text-ion-white">AI Setup Assurance</h1>
      <p className="mt-1 text-sm text-ion-1">Built from: {report.builtFrom}.</p>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="assurance-verdict">
        <div className="rounded-xl border border-titanium/40 bg-eclipse/40 p-4 text-center">
          <p className="font-mono text-2xl font-bold text-ion-white">{report.verdict}</p>
          <p className="text-[10px] uppercase tracking-wider text-ion-2">verdict</p>
        </div>
        <div className="rounded-xl border border-titanium/40 bg-eclipse/40 p-4 text-center">
          <p className="font-mono text-2xl font-bold text-ion-white">
            {Math.round(report.overallCoverage * 100)}%
          </p>
          <p className="text-[10px] uppercase tracking-wider text-ion-2">
            coverage (grade needs {Math.round(COVERAGE_THRESHOLD * 100)}%)
          </p>
        </div>
        <div className="rounded-xl border border-titanium/40 bg-eclipse/40 p-4 text-center">
          <p className="font-mono text-2xl font-bold text-ion-white">
            {report.overallScore === null ? "—" : report.overallScore}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-ion-2">score (null until graded)</p>
        </div>
        <div className="rounded-xl border border-titanium/40 bg-eclipse/40 p-4 text-center">
          <p className="font-mono text-2xl font-bold text-ion-white">{report.openFindings}</p>
          <p className="text-[10px] uppercase tracking-wider text-ion-2">open findings</p>
        </div>
      </section>

      {report.verdict === "INCOMPLETE" && (
        <p className="mt-3 text-[11px] leading-relaxed text-ion-2" data-testid="assurance-incomplete-note">
          No grade is shown: a repo checkout cannot verify runtime behavior, production data,
          spend, or real usage. The grade unlocks when evidence collectors raise coverage —
          never by relaxing the threshold.
        </p>
      )}

      {report.topRecommendation && (
        <section className="mt-6 rounded-xl border border-orbital-cyan/30 bg-orbital-cyan/5 p-4" data-testid="assurance-top-recommendation">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-orbital-cyan">
            Highest-leverage next move (risk-adjusted, not cosmetic)
          </p>
          <p className="mt-1 text-sm font-semibold text-ion-white">{report.topRecommendation.title}</p>
          <p className="mt-1 text-xs text-ion-1">{report.topRecommendation.smallestSafeFix}</p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ion-2">Categories</h2>
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {report.categories.map((c) => (
            <li key={c.id} className="rounded-xl border border-titanium/40 bg-eclipse/40 p-4" data-testid="assurance-category">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-ion-white">{c.label}</span>
                <span className="font-mono text-[11px] text-ion-2">
                  w{c.weight} · cov {Math.round(c.coverage * 100)}% · health {Math.round(c.health * 100)}%
                </span>
              </div>
              {c.notInspected.length > 0 && (
                <ul className="mt-2 flex flex-col gap-0.5">
                  {c.notInspected.map((n) => (
                    <li key={n} className="text-[10px] text-ion-3">
                      not inspected: {n}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ion-2">
          Findings ({report.openFindings} open)
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {report.categories.flatMap((c) => c.findings).map((f) => (
            <FindingCard key={f.id} f={f} />
          ))}
        </ul>
      </section>
    </div>
  );
}
