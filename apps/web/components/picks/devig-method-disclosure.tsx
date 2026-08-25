/**
 * "Fair" is a modelling choice, not a fact the book hands us.
 *
 * Every scoring path de-vigs proportionally: split the overround in proportion
 * to each side's implied price. Shin's method instead models a share of insider
 * money, which corrects the favourite–longshot bias proportional leaves behind.
 * They agree exactly on a balanced book and diverge as the book tilts — around
 * 1.5 points on the underdog at −2000/+1100, wider than most edges anyone can
 * honestly claim.
 *
 * So a single "market fair" number, unlabelled, overstates what we know. This
 * shows the second method whenever the two disagree enough to matter, and stays
 * silent when they agree — no noise on the balanced books that are most picks.
 */

/** Below this the methods agree to within display rounding; showing it is noise. */
export const DEVIG_DISCLOSURE_MIN_DELTA = 0.005;

export function devigMethodDelta(
  proportional: number | null | undefined,
  shin: number | null | undefined,
): number | null {
  if (typeof proportional !== "number" || !Number.isFinite(proportional)) return null;
  if (typeof shin !== "number" || !Number.isFinite(shin)) return null;
  return shin - proportional;
}

export function DevigMethodDisclosure({
  proportional,
  shin,
}: {
  proportional: number | null | undefined;
  shin: number | null | undefined;
}) {
  const delta = devigMethodDelta(proportional, shin);
  if (delta === null || Math.abs(delta) < DEVIG_DISCLOSURE_MIN_DELTA) return null;

  return (
    <p className="mt-0.5 text-[10px] text-ion-3">
      Shin de-vig: {(shin! * 100).toFixed(1)}%{" "}
      <span className="text-ion-2">
        ({delta > 0 ? "+" : "−"}
        {Math.abs(delta * 100).toFixed(1)}pt)
      </span>{" "}
      — this price depends on de-vig method; we rank on the proportional number.
    </p>
  );
}
