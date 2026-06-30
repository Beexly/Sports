import type { Metadata } from "next";
import {
  ledgerByCategory,
  auditLedger,
  isPublicSafeAllowed,
  type StageStatus,
  type SystemEntry,
} from "@/lib/platform/integrity-ledger";

/**
 * Draft → Verified → Priced → Published → Proven — the Dify-style lifecycle
 * rollup, computed honestly from the SAME ledger states already on the page.
 * Each stage strictly requires the one before it (a monotonic ladder), so a
 * system counts at exactly its furthest earned stage and nothing is inflated:
 *
 *   Draft     — code exists           (builtStatus = YES)
 *   Verified  — wired into runtime     (+ wiredStatus = YES)
 *   Priced    — cleared toward public  (+ publicSafeStatus ≠ NO)
 *   Published — genuinely public-live  (+ publicSafeStatus = YES, no blocking gate)
 *   Proven    — earned against evidence(+ provenStatus = YES)
 *
 * Proven stays empty unless a system is all the way through — never fabricated.
 */
const LIFECYCLE_STAGES = [
  "Draft",
  "Verified",
  "Priced",
  "Published",
  "Proven",
] as const;
type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

/** The furthest lifecycle stage a single system has honestly earned, or null (pre-Draft). */
function lifecycleStageOf(s: SystemEntry): LifecycleStage | null {
  if (s.builtStatus !== "YES") return null;
  if (s.wiredStatus !== "YES") return "Draft";
  if (s.publicSafeStatus === "NO") return "Verified";
  // Public-safe is at least PARTIAL → "Priced" (cleared toward a public/commercial
  // surface). It is only "Published" when fully public-safe with no owner gate
  // still holding it back — a staged gate means it is not actually live.
  const published = s.publicSafeStatus === "YES" && (s.ownerGate == null || s.ownerGate.trim() === "");
  if (!published) return "Priced";
  if (s.provenStatus !== "YES") return "Published";
  return "Proven";
}

function rollupLifecycle(systems: readonly SystemEntry[]): {
  counts: Record<LifecycleStage, number>;
  preDraft: number;
  total: number;
  dominant: LifecycleStage | null;
} {
  const counts: Record<LifecycleStage, number> = {
    Draft: 0,
    Verified: 0,
    Priced: 0,
    Published: 0,
    Proven: 0,
  };
  let preDraft = 0;
  for (const s of systems) {
    const stage = lifecycleStageOf(s);
    if (stage == null) preDraft += 1;
    else counts[stage] += 1;
  }
  let dominant: LifecycleStage | null = null;
  let max = 0;
  for (const stage of LIFECYCLE_STAGES) {
    if (counts[stage] > max) {
      max = counts[stage];
      dominant = stage;
    }
  }
  return { counts, preDraft, total: systems.length, dominant };
}

/**
 * Integrity Ledger cockpit — the command-truth surface. Every critical system, by
 * category, with its honest Built / Wired / Proven / Public-Safe state, owner gate,
 * evidence, failure mode, and next action. No simulated green: badges render exactly
 * what the typed ledger declares, and the ledger is unit-tested to obey its own
 * public-safe rule (PUBLIC_SAFE requires PROVEN or an explaining owner gate).
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

const STAGE_TONE: Record<StageStatus, string> = {
  YES: "border-green-900 bg-green-950/40 text-green-300",
  PARTIAL: "border-amber-900 bg-amber-950/40 text-amber-300",
  NO: "border-titanium bg-carbon/60 text-ion-3",
};

function StageBadge({ label, status }: { label: string; status: StageStatus }) {
  return (
    <span
      className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STAGE_TONE[status]}`}
      title={`${label}: ${status}`}
    >
      {label} {status === "YES" ? "✓" : status === "PARTIAL" ? "~" : "—"}
    </span>
  );
}

function SystemRow({ s }: { s: SystemEntry }) {
  const publicSafeOk = isPublicSafeAllowed(s);
  return (
    <div className="rounded-xl border border-titanium bg-carbon/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ion-1">{s.name}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <StageBadge label="Built" status={s.builtStatus} />
          <StageBadge label="Wired" status={s.wiredStatus} />
          <StageBadge label="Proven" status={s.provenStatus} />
          <StageBadge label="Public-safe" status={s.publicSafeStatus} />
          {!publicSafeOk && (
            <span className="rounded-md border border-red-900 bg-red-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300">
              rule violation
            </span>
          )}
        </div>
      </div>

      {s.ownerGate && (
        <p className="mt-2 text-[11px] text-amber-300/90">
          <span className="font-semibold uppercase tracking-wider">Owner gate:</span> {s.ownerGate}
        </p>
      )}

      <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-ion-3 sm:grid-cols-2">
        <p>
          <span className="text-ion-2">Failure mode:</span> {s.failureMode}
        </p>
        <p>
          <span className="text-ion-2">Next:</span> {s.nextAction}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-ion-3">
        <span>{s.lastVerifiedAt ? `Verified ${s.lastVerifiedAt}` : "Not verified yet"}</span>
        {s.evidenceRefs.length > 0 && (
          <span className="truncate">· evidence: {s.evidenceRefs.join(", ")}</span>
        )}
      </div>
    </div>
  );
}

function LifecycleRollupTile({ systems }: { systems: readonly SystemEntry[] }) {
  const { counts, preDraft, total, dominant } = rollupLifecycle(systems);

  const STAGE_TONE: Record<LifecycleStage, string> = {
    Draft: "border-titanium bg-carbon/60 text-ion-2",
    Verified: "border-ultraviolet/30 bg-obsidian/50 text-ion-1",
    Priced: "border-amber-900 bg-amber-950/30 text-amber-300",
    Published: "border-orbital-cyan/40 bg-accent-950/20 text-accent-400",
    Proven: "border-green-900 bg-green-950/40 text-green-300",
  };

  return (
    <section
      data-testid="lifecycle-rollup"
      aria-label="Draft to Proven lifecycle rollup"
      className="rounded-xl border border-titanium bg-carbon/40 p-4"
    >
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-2">
          Lifecycle · Draft → Proven
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-widest text-ion-3">
          {dominant ? `Most systems: ${dominant}` : "No systems drafted"}
        </span>
      </div>
      <p className="mb-3 text-[11px] text-ion-3">
        Each system counts at its furthest earned stage. Proven stays empty unless a
        system is wired, public-safe, gate-free, and proven against evidence — no simulation.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {LIFECYCLE_STAGES.map((stage) => (
          <div
            key={stage}
            data-testid={`lifecycle-stage-${stage}`}
            className={`rounded-lg border px-3 py-2 ${STAGE_TONE[stage]}`}
          >
            <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] opacity-80">
              {stage}
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums leading-none">
              {counts[stage]}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-ion-3">
        {total} systems · {counts.Proven} proven · {preDraft} pre-draft (code not yet built).
      </p>
    </section>
  );
}

export default function CockpitIntegrityPage() {
  const groups = ledgerByCategory();
  const violations = auditLedger();
  const allSystems = groups.flatMap((g) => g.systems);
  const total = allSystems.length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-ion-white">Integrity Ledger</h1>
        <p className="mt-1 text-sm text-ion-2">
          The command-truth of what is real. {total} systems across {groups.length} categories.
          Built means code exists; Wired means connected; Proven means verified;
          Public-safe means legal/claim/gate-safe. Nothing here renders green by simulation.
        </p>
      </div>

      <div
        className={`rounded-lg border px-4 py-2 text-xs ${
          violations.length === 0
            ? "border-green-900 bg-green-950/30 text-green-200"
            : "border-red-900 bg-red-950/30 text-red-200"
        }`}
      >
        {violations.length === 0
          ? "Public-safe rule holds across every system: nothing claims public-safe without proof or an explaining owner gate."
          : `${violations.length} public-safe rule violation(s): ${violations.map((v) => v.id).join(", ")}`}
      </div>

      <LifecycleRollupTile systems={allSystems} />

      {groups.map((g) => (
        <section key={g.category} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">
            {g.category.replace(/-/g, " ")} · {g.systems.length}
          </h2>
          <div className="flex flex-col gap-2">
            {g.systems.map((s) => (
              <SystemRow key={s.id} s={s} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
