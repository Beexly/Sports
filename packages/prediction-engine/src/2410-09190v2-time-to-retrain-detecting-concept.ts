/**
 * arXiv:2410.09190v2 — Time to Retrain? Detecting Concept Drifts in Machine Learning Systems
 *
 * GSE concept-drift monitor: tracks rolling Brier/log-loss per component, fires a retrain alert when
 * degradation exceeds the threshold for k consecutive weeks, with a cooldown between alerts.
 *
 * Improvement: Deploy a two-stage concept-drift detector in the weekly cron: stage 1 pre-game inspector-disagreement PHT on the upcoming slate as a cheap early filter, stage 2 post-game PUDD chi-square on the resolved PU-index, trading weak precision for combination specificity on retrain decisions.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the inspector monitor if on 2020–2025 nflverse: (i) PHT disagreement alarms precede ≥50% of labeled regime-change episodes by ≥1 week, (ii) ≤2 false alarms per season, (iii) refit-on-alarm does not degrade Brier by more than 0.002 vs frozen baseline on non-alarm weeks, and (iv) the pipeline runs end-to-end in the weekly cron in <5 minutes.
 */

/** Rolling mean of a loss stream (window w). */
export function rollingMean(losses: readonly number[], w: number): number[] {
  if (w <= 0) throw new Error("rollingMean: w > 0");
  return losses.map((_, i) => {
    const seg = losses.slice(Math.max(0, i - w + 1), i + 1);
    return seg.reduce((s, v) => s + v, 0) / seg.length;
  });
}

/**
 * Drift alert: degradation = rollingMean - baseline; alert fires when
 * degradation > threshold for k consecutive weeks (with cooldown weeks
 * after an alert before the next can fire).
 */
export function driftAlerts(
  losses: readonly number[],
  baseline: number,
  threshold: number,
  k: number,
  window: number,
  cooldown: number,
): number[] {
  if (k <= 0 || cooldown < 0) throw new Error("driftAlerts: k > 0, cooldown >= 0");
  const rm = rollingMean(losses, window);
  const alerts: number[] = [];
  let bad = 0;
  let cool = 0;
  for (let t = 0; t < rm.length; t++) {
    if (cool > 0) { cool--; bad = 0; continue; }
    if ((rm[t] ?? 0) - baseline > threshold) {
      bad++;
      if (bad >= k) {
        alerts.push(t);
        bad = 0;
        cool = cooldown;
      }
    } else {
      bad = 0;
    }
  }
  return alerts;
}
