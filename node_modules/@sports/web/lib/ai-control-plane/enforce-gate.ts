/**
 * `canRampEnforce` — a PURE safety predicate for a FUTURE ENFORCE ramp.
 *
 * ██ THIS FUNCTION IS CURRENTLY UNCONSUMED BY PRODUCTION CODE. ██
 *
 * There is no surface registry, no "% traffic in ENFORCE" mechanism, and no
 * live admission path that reads ENFORCE mode from anything other than the
 * `SRQC_ENFORCE=1` lab opt-in flag consumed by
 * `evaluateSrqcAdmissionForLab` (srqc-projection.ts). That registry + kill
 * switch is separate, not-yet-dispatched work.
 *
 * This function exists so that FUTURE work has a ready-made, independently
 * tested safety predicate to consult before flipping any surface further
 * along a ramp (0% -> canary 1% -> 10% -> 50% -> 100%, see
 * docs/ops/ENFORCE_RAMP.md). It is intentionally:
 *   - pure (no I/O, no ambient env reads, no clock reads unless `now` is
 *     explicitly passed),
 *   - not imported by any route, worker, cron, or the ai-control-plane
 *     executor,
 *   - not exported from any sealed module — it lives in this directory only
 *     because it is a control-plane-shaped safety primitive, not because it
 *     is wired into the control plane's admission path.
 *
 * Guard clauses, each independently fail-closed (any one failing returns
 * `false`):
 *   1. At least 14 days of SHADOW observation (`shadowDays >= 14`).
 *   2. If a false-refuse rate is known, it must be <= 5%. `null` (unknown)
 *      does NOT block — the caller is expected to require a real
 *      measurement before actually ramping in practice, but this predicate
 *      only encodes "a known-bad rate blocks," not "an unknown rate blocks."
 *   3. A drill must have passed at all (`drillPassedAt` non-null).
 *   4. That drill must be recent — within the last 90 days.
 */
export function canRampEnforce(args: {
  shadowDays: number;
  falseRefuseRate: number | null;
  drillPassedAt: Date | null;
  now?: Date;
}): boolean {
  const now = args.now ?? new Date();
  if (args.shadowDays < 14) return false;
  if (args.falseRefuseRate != null && args.falseRefuseRate > 0.05) return false;
  if (!args.drillPassedAt) return false;
  if (now.getTime() - args.drillPassedAt.getTime() > 90 * 864e5) return false;
  return true;
}
