import Link from "next/link";
import { findRepoRoot } from "@/lib/ops/repo-root";
import {
  isFoundryEnabled,
  scanAll,
  SKILL_MANIFESTS,
  canExecute,
  getOwningSeat,
  type SkillManifest,
  type ScanReport,
} from "@/lib/agent-foundry";

export const dynamic = "force-dynamic";

/**
 * /cockpit/agent-foundry — the skill supply chain, read-only.
 *
 * Every skill has identity, permissions, provenance, risk, scan state, and a
 * reason execution is blocked. Nothing here runs, approves, or promotes —
 * the scanner produces findings; the owner produces decisions.
 */

const LIFECYCLE_TONE: Record<SkillManifest["lifecycle"], string> = {
  DRAFT: "border-titanium/40 bg-eclipse/60 text-ion-1",
  SCANNED: "border-cyan-500/30 bg-cyan-950/30 text-cyan-200",
  OWNER_REVIEW: "border-yellow-500/30 bg-yellow-950/30 text-yellow-200",
  APPROVED: "border-emerald-500/30 bg-emerald-950/30 text-emerald-200",
  RETIRED: "border-red-900/60 bg-red-950/40 text-red-400",
};

function ManifestCard({ m, scan, executable }: { m: SkillManifest; scan: ScanReport; executable: boolean }) {
  const seat = getOwningSeat(m);
  const blockers = scan.findings.filter((x) => x.severity === "BLOCK");
  return (
    <li className="rounded-xl border border-titanium/40 bg-eclipse/40 p-4" data-testid="foundry-manifest">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold text-ion-white">{m.id}</span>
        <span className="font-mono text-[11px] text-ion-2">v{m.version}</span>
        <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${LIFECYCLE_TONE[m.lifecycle]}`}>
          {m.lifecycle}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-ion-2">risk {m.risk}</span>
        <span className="ml-auto font-mono text-[10px] text-ion-3" title={m.contentHash}>
          {m.contentHash.slice(0, 12)}…
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ion-1">{m.purpose}</p>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-[11px] sm:grid-cols-2">
        <div className="flex justify-between gap-3">
          <dt className="text-ion-3">Owning seat</dt>
          <dd className="text-ion-1">{seat ? `${seat.codename} (${seat.id})` : `MISSING: ${m.owningSeatId}`}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ion-3">Model route</dt>
          <dd className="font-mono text-ion-1">{m.modelRoute}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ion-3">Tools</dt>
          <dd className="font-mono text-ion-1">{m.allowedTools.join(", ")}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ion-3">Network</dt>
          <dd className="font-mono text-ion-1">
            {m.networkPolicy.mode === "none" ? "none" : m.networkPolicy.domains.join(", ")}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ion-3">Ceilings</dt>
          <dd className="font-mono text-ion-1">${m.budgetCeilingUsd} · {m.runtimeCeilingMinutes}m</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ion-3">Evals</dt>
          <dd className="font-mono text-ion-1">{m.evalSuites.join(", ") || "none"}</dd>
        </div>
      </dl>
      <div className="mt-3 rounded-lg border border-titanium/30 bg-carbon/40 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-ion-2">
          Scan: {scan.findings.length} finding{scan.findings.length === 1 ? "" : "s"} ·{" "}
          {scan.rulesRun.length} rules ran
        </p>
        {scan.findings.length > 0 ? (
          <ul className="mt-1 flex flex-col gap-1">
            {scan.findings.map((x) => (
              <li key={`${x.rule}:${x.detail}`} className="text-[11px] text-ion-1">
                <span className={x.severity === "BLOCK" ? "text-red-300" : "text-yellow-200"}>
                  [{x.severity}]
                </span>{" "}
                {x.rule}: {x.detail}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[11px] text-ion-2">
            No baseline findings. A clean baseline is not a safety proof.
          </p>
        )}
        <p className="mt-2 text-[11px] font-semibold text-ion-1" data-testid="foundry-execution-block">
          Execution: {executable ? "PERMITTED" : "BLOCKED"} ·{" "}
          {m.lifecycle !== "APPROVED"
            ? `lifecycle is ${m.lifecycle}; APPROVED requires an owner-reviewed code change`
            : m.humanApprovalRequired
              ? "human approval required on every run"
              : "blocking scan findings present"}
          {blockers.length > 0 ? ` · ${blockers.length} blocking finding(s)` : ""}
        </p>
      </div>
      <p className="mt-2 text-[10px] uppercase tracking-wider text-ion-3">
        proof: <code className="font-mono normal-case">{m.proofSource}</code>
      </p>
    </li>
  );
}

export default function AgentFoundryPage() {
  if (!isFoundryEnabled()) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-bold text-ion-white">Agent Foundry</h1>
        <section
          data-testid="foundry-disabled-state"
          className="mt-8 rounded-2xl border border-titanium/40 bg-eclipse/40 px-6 py-10 text-center"
        >
          <p className="text-base font-semibold text-ion-white">The foundry ships dark.</p>
          <p className="mt-3 text-sm leading-6 text-ion-1">
            Set <code className="font-mono text-ion-white">AGENT_FOUNDRY_ENABLED=true</code> to view
            the manifest registry and scan reports. This is a deliberate off state, not an error.
          </p>
        </section>
      </div>
    );
  }

  const repoRoot = findRepoRoot();
  const scans = scanAll(repoRoot);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ion-white">Agent Foundry</h1>
          <p className="mt-1 text-sm text-ion-1">
            Every skill has identity, permissions, provenance, risk, and eval state. Nothing here
            executes: the scanner finds, the owner decides.
          </p>
        </div>
        <Link href="/cockpit/agents" className="text-xs font-semibold text-orbital-cyan hover:text-ion-white">
          Council roster →
        </Link>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="foundry-counts">
        <div className="rounded-xl border border-titanium/40 bg-eclipse/40 p-3 text-center">
          <p className="font-mono text-xl font-bold text-ion-white">{SKILL_MANIFESTS.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-ion-2">manifests</p>
        </div>
        <div className="rounded-xl border border-titanium/40 bg-eclipse/40 p-3 text-center">
          <p className="font-mono text-xl font-bold text-ion-white">
            {scans.reduce((s, r) => s + r.findings.length, 0)}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-ion-2">scan findings</p>
        </div>
        <div className="rounded-xl border border-titanium/40 bg-eclipse/40 p-3 text-center">
          <p className="font-mono text-xl font-bold text-ion-white">0</p>
          <p className="text-[10px] uppercase tracking-wider text-ion-2">executable</p>
        </div>
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-3 text-center">
          <p className="font-mono text-xl font-bold text-yellow-200">
            {scans[0]?.externalScannersAbsent.length ?? 0}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-yellow-200/80">scanners absent</p>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-950/10 p-3" data-testid="foundry-scanner-absence">
        <p className="text-[11px] leading-relaxed text-yellow-100/90">
          External scanning not yet adopted:{" "}
          {(scans[0]?.externalScannersAbsent ?? []).join("; ")}. The baseline scanner is a floor,
          not a certification.
        </p>
      </section>

      <ul className="mt-6 flex flex-col gap-4">
        {SKILL_MANIFESTS.map((m) => (
          <ManifestCard
            key={m.id}
            m={m}
            scan={scans.find((s) => s.manifestId === m.id)!}
            executable={canExecute(m, repoRoot)}
          />
        ))}
      </ul>
    </div>
  );
}
