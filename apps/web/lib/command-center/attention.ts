/**
 * Owner-attention ranking — pure, deterministic, I/O-free.
 *
 * Turns raw signals from the live synthesis into a single ranked queue that
 * answers one question: "What should the owner look at first, and why?"
 *
 * The score is NOT arbitrary plausible math. It is a weighted combination of
 * the five questions an owner actually asks (cost of delay, severity,
 * reversibility, effort, source confidence), and every item carries a plain
 * explanation of how it scored — the ranking is explainable, never a black box.
 */

import type {
  AttentionFactors,
  AttentionSourceInput,
  AttentionUrgency,
  OwnerAttentionItem,
  RawAttentionSignal,
} from "./types";

// Weights sum to 1.0. Cost-of-delay and severity dominate; irreversibility is
// a meaningful third; low-effort "quick wins" get a small nudge so they don't
// languish behind big-but-slow items.
const W_COST_OF_DELAY = 0.35;
const W_SEVERITY = 0.35;
const W_IRREVERSIBILITY = 0.2;
const W_QUICK_WIN = 0.1;

const URGENCY_RANK: Record<AttentionUrgency, number> = {
  CRITICAL: 3,
  HIGH: 2,
  NORMAL: 1,
  LOW: 0,
};

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/**
 * Score a single factor bundle to 0..100.
 *
 * base = costOfDelay·w + severity·w + (1−reversibility)·w + (1−ownerEffort)·w
 * score = base · sourceConfidence  (low-confidence signals are damped, never amplified)
 */
export function scoreFactors(factors: AttentionFactors): number {
  const costOfDelay = clamp01(factors.costOfDelay);
  const severity = clamp01(factors.severity);
  const irreversibility = 1 - clamp01(factors.reversibility);
  const quickWin = 1 - clamp01(factors.ownerEffort);
  const confidence = clamp01(factors.sourceConfidence);

  const base =
    costOfDelay * W_COST_OF_DELAY +
    severity * W_SEVERITY +
    irreversibility * W_IRREVERSIBILITY +
    quickWin * W_QUICK_WIN;

  return Math.round(base * confidence * 100);
}

/** Map a numeric score to an urgency band. */
export function scoreToUrgency(score: number): AttentionUrgency {
  if (score >= 75) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "NORMAL";
  return "LOW";
}

/** Take the more severe of the score-derived urgency and the source's floor. */
function applyUrgencyFloor(
  derived: AttentionUrgency,
  floor: AttentionUrgency
): AttentionUrgency {
  return URGENCY_RANK[floor] > URGENCY_RANK[derived] ? floor : derived;
}

function explain(factors: AttentionFactors, score: number): string {
  const parts: string[] = [];
  if (factors.costOfDelay >= 0.7) parts.push("degrades fast if ignored");
  if (factors.severity >= 0.7) parts.push("wide blast radius");
  if (factors.reversibility <= 0.4) parts.push("hard to reverse");
  if (factors.ownerEffort <= 0.3) parts.push("quick to resolve");
  if (factors.sourceConfidence <= 0.6) parts.push("signal confidence is moderate");
  if (parts.length === 0) parts.push("routine priority");
  return `Score ${score}: ${parts.join(", ")}.`;
}

/**
 * Rank raw signals into owner-attention items. Stable, deterministic order:
 * by score desc, then urgency-floor desc, then id asc (so equal items never
 * shuffle between renders).
 */
export function rankAttention(
  signals: readonly RawAttentionSignal[]
): OwnerAttentionItem[] {
  const scored = signals.map((s): OwnerAttentionItem => {
    const score = scoreFactors(s.factors);
    const urgency = applyUrgencyFloor(scoreToUrgency(score), s.urgencyFloor);
    return {
      id: s.id,
      title: s.title,
      detail: s.detail,
      source: s.source,
      decisionType: s.decisionType,
      score,
      urgency,
      factors: s.factors,
      scoreExplanation: explain(s.factors, score),
      recommendedAction: s.recommendedAction,
      link: s.link,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (URGENCY_RANK[b.urgency] !== URGENCY_RANK[a.urgency]) {
      return URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency];
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return scored;
}

// ─── Source → signal mapping (the "meaningful" part, kept pure) ──────────────

// A short, stable slug from free text so ids are deterministic across renders.
function slug(text: string, max = 48): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

const HEALTH_DEPT_FACTORS: Record<"RED" | "AMBER", AttentionFactors> = {
  RED: { costOfDelay: 0.8, severity: 0.7, reversibility: 0.5, ownerEffort: 0.5, sourceConfidence: 0.85 },
  AMBER: { costOfDelay: 0.5, severity: 0.5, reversibility: 0.7, ownerEffort: 0.5, sourceConfidence: 0.85 },
};

const DECISION_FACTORS: Record<"CRITICAL" | "HIGH" | "NORMAL", AttentionFactors> = {
  CRITICAL: { costOfDelay: 0.9, severity: 0.85, reversibility: 0.3, ownerEffort: 0.5, sourceConfidence: 0.9 },
  HIGH: { costOfDelay: 0.65, severity: 0.6, reversibility: 0.6, ownerEffort: 0.45, sourceConfidence: 0.9 },
  NORMAL: { costOfDelay: 0.4, severity: 0.4, reversibility: 0.8, ownerEffort: 0.4, sourceConfidence: 0.9 },
};

/**
 * Collect raw signals from the live synthesis bundle. Pure: same input → same
 * signals. Safety always floors at CRITICAL; advisories floor at LOW.
 */
export function collectAttentionSignals(
  input: AttentionSourceInput
): RawAttentionSignal[] {
  const signals: RawAttentionSignal[] = [];

  // 1. Safety warnings — the highest-stakes signal. Trust breaches are costly
  //    and hard to reverse, so they sit at the top by construction.
  for (const w of input.safetyWarnings) {
    signals.push({
      id: `safety-${slug(w)}`,
      title: "Safety warning",
      detail: w,
      source: "jarvis_safety",
      decisionType: "SAFETY",
      factors: { costOfDelay: 0.95, severity: 0.95, reversibility: 0.2, ownerEffort: 0.45, sourceConfidence: 1 },
      urgencyFloor: "CRITICAL",
      recommendedAction: "Resolve before any public exposure. This gates launch safety.",
      link: "/cockpit",
    });
  }

  // 2. Owner decisions — already urgency-tagged by the Owner Summary.
  for (const d of input.decisions) {
    signals.push({
      id: `decision-${slug(d.description)}`,
      title: "Owner decision",
      detail: d.description,
      source: "owner_decision",
      decisionType: "LAUNCH_GATE",
      factors: DECISION_FACTORS[d.urgency],
      urgencyFloor: d.urgency === "NORMAL" ? "NORMAL" : d.urgency,
      recommendedAction: d.description,
      link: d.link,
    });
  }

  // 3. Departments needing action — StatKing, growth, media, etc.
  for (const dept of input.departments) {
    if (!dept.actionRequired) continue;
    if (dept.status !== "RED" && dept.status !== "AMBER") continue;
    signals.push({
      id: `dept-${slug(dept.id || dept.name)}`,
      title: dept.name,
      detail: dept.actionDescription ?? `${dept.name} needs attention.`,
      source: "department",
      decisionType: "DEPARTMENT",
      factors: HEALTH_DEPT_FACTORS[dept.status],
      urgencyFloor: dept.status === "RED" ? "HIGH" : "NORMAL",
      recommendedAction: dept.actionDescription ?? `Review ${dept.name}.`,
      link: dept.drilldownHref,
    });
  }

  // 4. External config warnings — missing env/secrets. Easy to fix, real risk.
  for (const w of input.externalConfigWarnings) {
    signals.push({
      id: `config-${slug(w)}`,
      title: "External config missing",
      detail: w,
      source: "external_config",
      decisionType: "CONFIG",
      factors: { costOfDelay: 0.6, severity: 0.5, reversibility: 0.9, ownerEffort: 0.25, sourceConfidence: 1 },
      urgencyFloor: "NORMAL",
      recommendedAction: `Set ${w} in the deployment environment.`,
      link: "/cockpit",
    });
  }

  // 5. Missing-phase warnings — incomplete build phases.
  for (const w of input.missingPhaseWarnings) {
    signals.push({
      id: `phase-${slug(w)}`,
      title: "Phase incomplete",
      detail: w,
      source: "missing_phase",
      decisionType: "ROUTINE",
      factors: { costOfDelay: 0.4, severity: 0.45, reversibility: 0.8, ownerEffort: 0.6, sourceConfidence: 0.9 },
      urgencyFloor: "NORMAL",
      recommendedAction: "Verify this phase before launch.",
      link: "/cockpit",
    });
  }

  // 6. Recommended next actions — routine operating cadence.
  for (const a of input.recommendedNextActions) {
    signals.push({
      id: `action-${slug(a)}`,
      title: "Recommended action",
      detail: a,
      source: "recommended_action",
      decisionType: "ROUTINE",
      factors: { costOfDelay: 0.35, severity: 0.3, reversibility: 0.9, ownerEffort: 0.4, sourceConfidence: 0.8 },
      urgencyFloor: "LOW",
      recommendedAction: a,
      link: "/cockpit",
    });
  }

  // 7. Advisory warnings — informational; explicitly low so they never crowd
  //    out real decisions.
  for (const w of input.advisoryWarnings) {
    signals.push({
      id: `advisory-${slug(w)}`,
      title: "Advisory",
      detail: w,
      source: "advisory",
      decisionType: "ROUTINE",
      factors: { costOfDelay: 0.2, severity: 0.25, reversibility: 0.95, ownerEffort: 0.3, sourceConfidence: 0.7 },
      urgencyFloor: "LOW",
      recommendedAction: "No action required. Informational.",
      link: null,
    });
  }

  // Safety net: collapse exact-duplicate signals (same normalized detail),
  // keeping the first — i.e. highest-priority — occurrence. The feed sources
  // each underlying signal once (it reads the assessment directly rather than
  // also passing the Owner Summary's re-derived decisions/advisories), but this
  // guards against any future re-introduction of double-feeding.
  const seen = new Set<string>();
  return signals.filter((s) => {
    const key = s.detail.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
