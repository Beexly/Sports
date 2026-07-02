/**
 * Model Court — a model change is prosecuted before it ships.
 *
 * "Fix the model, not the benchmark." Every scoring/factor/metric change must survive
 * a court: a prosecution case (what it might break), a defense (why it improves
 * DECISION QUALITY, not just fit), a falsifier (what evidence would kill it), shadow/OOS
 * evidence, a sufficient out-of-sample sample, no calibration regression, a rollback
 * plan, and explicit owner approval. Any missing element → HOLD. This is the process
 * discipline around the statistical promoter (champion/challenger): the promoter
 * measures, the court governs. Pure, no I/O.
 */

export interface ModelChangeProposal {
  readonly id: string;
  readonly fromVersion: string;
  readonly toVersion: string;
  /** The strongest case AGAINST the change (what could break / regress). */
  readonly prosecution: string;
  /** The case FOR — must be about decision quality, not in-sample fit. */
  readonly defense: string;
  /** What evidence would falsify / kill this change. */
  readonly falsifier: string;
  readonly expectedLift: string;
  /** Refs to shadow / out-of-sample evidence (non-empty required). */
  readonly evidence: readonly string[];
  readonly rollbackPlan: string;
  readonly ownerApproved: boolean;
  readonly oosSampleSize: number;
  readonly minOosSample?: number; // default 100
  /** True if calibration got WORSE in shadow — an automatic hold. */
  readonly calibrationRegressed: boolean;
}

export type CourtVerdict = "PROMOTE" | "HOLD";

export interface CourtRuling {
  readonly verdict: CourtVerdict;
  readonly blockers: readonly string[];
  readonly fromVersion: string;
  readonly toVersion: string;
}

const DEFAULT_MIN_OOS = 100;

function blank(s: string): boolean {
  return typeof s !== "string" || s.trim() === "";
}

/** Try a model change in court. PROMOTE only when every element of due process holds. */
export function tryModelChange(p: ModelChangeProposal): CourtRuling {
  const blockers: string[] = [];
  const minOos = p.minOosSample ?? DEFAULT_MIN_OOS;

  if (blank(p.prosecution)) blockers.push("missing prosecution case (what could break)");
  if (blank(p.defense)) blockers.push("missing defense (decision-quality improvement)");
  if (blank(p.falsifier)) blockers.push("missing falsifier (what evidence would kill it)");
  if (blank(p.rollbackPlan)) blockers.push("missing rollback plan");
  if (p.evidence.length === 0) blockers.push("no shadow/out-of-sample evidence");
  if (!Number.isFinite(p.oosSampleSize) || p.oosSampleSize < minOos) {
    blockers.push(`out-of-sample sample too small (${p.oosSampleSize} < ${minOos})`);
  }
  if (p.calibrationRegressed) blockers.push("calibration regressed in shadow: automatic hold");
  if (!p.ownerApproved) blockers.push("owner approval required for a model-version change");

  return {
    verdict: blockers.length === 0 ? "PROMOTE" : "HOLD",
    blockers,
    fromVersion: p.fromVersion,
    toVersion: p.toVersion,
  };
}
