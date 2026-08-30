/**
 * gse_metric — GEPA-compatible metric for GSE skill trajectories.
 *
 * Returns { score: number in [0,1], feedback: string } matching DSPy
 * Prediction(score, feedback). GEPA reflection LM (temp 1.0) consumes feedback.
 *
 * Pure string/invariant checks against skill blobs — no LLM calls.
 */

/**
 * @param {{ domain: string, expected_pass?: boolean, failure_modes?: string[], task?: string }} example
 * @param {{ skill_text: string, trajectory?: string }} prediction
 * @returns {{ score: number, feedback: string }}
 */
export function gse_metric(example, prediction) {
  const skill = String(prediction?.skill_text ?? "").toLowerCase();
  const trajectory = String(prediction?.trajectory ?? example?.trajectory ?? "").toLowerCase();
  const domain = example?.domain ?? "settlement";
  const fails = [];

  // Free-path law
  if (domain === "settlement") {
    if (!(skill.includes("absent") && (skill.includes("free") || skill.includes("the_odds_api_key")))) {
      fails.push("skill missing free-path ABSENT gate for THE_ODDS_API_KEY");
    }
    if (!(skill.includes("idempoten") || skill.includes("stripe"))) {
      fails.push("skill missing stripe/idempotency guidance");
    }
    if (skill.includes("claimversion") || skill.includes("claim version") || skill.includes("outbox")) {
      // good
    } else if (!skill.includes("outbox") && !skill.includes("lease")) {
      fails.push("skill missing outbox lease / claimVersion reuse law");
    }
  }

  if (domain === "coding") {
    if (!(skill.includes("polymarket") && (skill.includes("compliance") || skill.includes("hold")))) {
      fails.push("coding skill missing Polymarket compliance hold");
    }
    if (!(skill.includes("minimal") || skill.includes("rewrite") || skill.includes("idempoten"))) {
      fails.push("coding skill missing minimal-diff / no-rewrite guidance");
    }
  }

  if (domain === "calibration") {
    if (!(skill.includes("hold") || skill.includes("holdout") || skill.includes("hold-out"))) {
      fails.push("calibration skill missing time hold-out law");
    }
    if (!skill.includes("cir") && !skill.includes("centered")) {
      fails.push("calibration skill missing CIR preference");
    }
    // Must encode a prohibition — "full Kelly" alone is not a fail (docs forbid it by name).
    const forbidsFull =
      skill.includes("full kelly forbidden") ||
      skill.includes("never full kelly") ||
      skill.includes("never size with full") ||
      skill.includes("full kelly") && (skill.includes("forbidden") || skill.includes("never") || skill.includes("ruin") || skill.includes("κ ≈") || skill.includes("kappa"));
    const endorsesFull =
      skill.includes("use full kelly") ||
      skill.includes("apply full kelly") ||
      skill.includes("κ=1") ||
      skill.includes("kappa=1");
    if (endorsesFull) {
      fails.push("calibration skill must not endorse full Kelly (κ=1)");
    } else if (!forbidsFull && !skill.includes("fractional")) {
      fails.push("calibration skill missing fractional Kelly / full-Kelly forbid");
    }
  }

  // Trajectory negative tests: if expected_pass is false, metric still scores the SKILL
  // (not the bad trajectory) — GEPA optimizes skill text, not attacker trajectories.
  if (example?.expected_pass === false && Array.isArray(example.failure_modes)) {
    // Skill should encode the prohibition that makes the failure_mode invalid.
    for (const fm of example.failure_modes) {
      const needle = String(fm).toLowerCase();
      if (needle.includes("polymarket") && !skill.includes("polymarket")) {
        fails.push("skill does not encode Polymarket prohibition referenced by failure mode");
      }
      if (needle.includes("free settlement") && !(skill.includes("absent") || skill.includes("deactivated"))) {
        fails.push("skill does not encode free-path prohibition for deactivated-key case");
      }
    }
  }

  // Soft: trajectory mentions for feedback richness (does not fail score alone)
  const notes = [];
  if (trajectory.includes("rewrite") && domain === "coding") {
    notes.push("trajectory rewrites — skill must forbid");
  }

  const score = fails.length ? 0 : 1;
  const feedback =
    fails.length > 0
      ? `FAIL: ${fails.join("; ")}`
      : `PASS: all invariants held${notes.length ? ` | notes: ${notes.join("; ")}` : ""}`;

  return { score, feedback };
}

/**
 * Batch-evaluate examples against a skill blob.
 * @returns {{ total: number, passed: number, failed: number, rows: Array }}
 */
export function evaluateExamples(examples, skillByDomain) {
  const rows = [];
  let failed = 0;
  for (const ex of examples) {
    const skill_text = skillByDomain[ex.domain] ?? skillByDomain.default ?? "";
    const pred = { skill_text, trajectory: ex.input?.trajectory ?? ex.trajectory };
    const example = {
      domain: ex.domain,
      expected_pass: ex.expected?.pass ?? ex.expected_pass,
      failure_modes: ex.expected?.failure_modes ?? ex.failure_modes,
      task: ex.input?.task ?? ex.task,
      trajectory: ex.input?.trajectory ?? ex.trajectory,
    };
    const { score, feedback } = gse_metric(example, pred);
    const ok = score === 1;
    if (!ok) failed++;
    rows.push({ id: ex.id, domain: ex.domain, split: ex.split ?? "train", score, feedback, ok });
  }
  return { total: rows.length, passed: rows.length - failed, failed, rows };
}
