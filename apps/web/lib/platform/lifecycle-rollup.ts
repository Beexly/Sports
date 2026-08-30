import type { SystemEntry } from "@/lib/platform/integrity-ledger";

/**
 * Draft → Verified → Priced → Published → Proven — the Dify-style lifecycle
 * rollup, computed honestly from the SAME ledger states the Integrity cockpit
 * renders. Each stage strictly requires the one before it (a monotonic ladder),
 * so a system counts at exactly its furthest earned stage and nothing is
 * inflated:
 *
 *   Draft     — code exists           (builtStatus = YES)
 *   Verified  — wired into runtime     (+ wiredStatus = YES)
 *   Priced    — cleared toward public  (+ publicSafeStatus ≠ NO)
 *   Published — genuinely public-live  (+ publicSafeStatus = YES, no blocking gate)
 *   Proven    — earned against evidence(+ provenStatus = YES)
 *
 * Proven stays empty unless a system is all the way through — never fabricated.
 *
 * Pure: no I/O, no side effects. Extracted from the cockpit page so it can be
 * unit-tested directly (Next forbids non-standard named exports from a page).
 */
export const LIFECYCLE_STAGES = [
  "Draft",
  "Verified",
  "Priced",
  "Published",
  "Proven",
] as const;
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

/** The furthest lifecycle stage a single system has honestly earned, or null (pre-Draft). */
export function lifecycleStageOf(s: SystemEntry): LifecycleStage | null {
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

export function rollupLifecycle(systems: readonly SystemEntry[]): {
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
