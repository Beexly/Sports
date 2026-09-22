/**
 * Homography field-registration contract: broadcast frame -> top-down field
 *
 * Research port: arXiv:2405.13397
 * Normalized lane: tracking | Doctrine: INFRA
 *
 * Adapts the homography+MPN tracking architecture to football: defines the field-registration contract mapping broadcast frames to a top-down NFL field template, with a pure 3x3 homography point transform. Model training/licensing is out of scope; this is the interface the tracker consumes.
 *
 * ACCEPTANCE GATE: ADOPT the football adaptation only if ALL hold: (a) legal review clears broadcast-footage processing for the target league, (b) registration error <= 1 yard on the calibration set, (c) no regression on the hockey baseline. Interface only; no footage is processed here.
 */

export type Homography = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
];

export interface FieldPoint {
  x: number; // yards, 0..120 (incl. end zones)
  y: number; // yards, 0..53.3
}

export interface FramePoint {
  px: number;
  py: number;
}

/** Apply a 3x3 homography to a frame point -> field point (pure). */
export function homographyTransform(H: Homography, p: FramePoint): FieldPoint {
  const w = H[2][0] * p.px + H[2][1] * p.py + H[2][2];
  if (w === 0) return { x: NaN, y: NaN };
  return {
    x: (H[0][0] * p.px + H[0][1] * p.py + H[0][2]) / w,
    y: (H[1][0] * p.px + H[1][1] * p.py + H[1][2]) / w,
  };
}

/** Registration error: mean Euclidean distance vs surveyed control points. */
export function registrationError(
  H: Homography,
  controls: { frame: FramePoint; field: FieldPoint }[],
): number {
  if (controls.length === 0) return Infinity;
  const errs = controls.map((c) => {
    const t = homographyTransform(H, c.frame);
    return Math.sqrt((t.x - c.field.x) ** 2 + (t.y - c.field.y) ** 2);
  });
  return errs.reduce((a, b) => a + b, 0) / errs.length;
}

/** Gate helper: registration error must be <= 1 yard. */
export function registrationGatePasses(errorYards: number): boolean {
  return errorYards <= 1;
}


/** Live-data gate: stays off until field registration error below the gate on NFL frames. */
export const GSE_FIELD_REGISTRATION_ENABLED = false;
