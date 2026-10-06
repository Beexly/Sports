# Deep Dive: Miguel Mendez — "Image Registration in Sports Analytics" (NFL Field Mapping)

**Source:** `https://miguel-mendez-ai.com/2024/02/07/nfl-field-mapping`
**What was read:** Full post, all 202 extracted lines, end to end: intro/goal, the result
(interactive web app: upload image → click ≥4 point pairs → compute homography →
warped-template overlay), pitch-template construction (with the embedded template-drawing
code), "Recovering the homography" (theory recap + full `computeHomography()` code),
"Projecting between image and template", conclusion. Both embedded images' captions read.
The linked GitHub JS file and Iñaki Rabanillo's theory post were noted but not needed —
the post itself contains the complete method.

**License note:** personal blog post by a StatsBomb computer-vision practitioner; demo
code on GitHub. Clean-room description below — no text or code copied.

**Relevance to GSE gap (c):** MEDIUM-HIGH. Not a landmark detector — the app is
*manual* point-clicking. Its value is (1) the exact field-template construction recipe
(120 × 53.3, 1 px = 1 yard) we should mirror for our template, (2) the p_t = H·p_i /
inverse-direction discipline, and (3) the **colinearity guard** — the single most
directly implementable defense for our DLT's known yard-lines-only failure.

---

## METHOD (step by step, with the math)

### 1. The template

A canonical, hand-drawn field image at **120 × 53.3 px** — one pixel per yard. Construction
constants (from the post's code): field height `53 + 1/3` yards, field width `120` yards,
painted line width 2 (template) px. Elements drawn by hand in code: sidelines, end lines,
end zones, hash marks, yard numbers, goalposts — each placed at its true yardage.
The author notes this handcrafting "took a while to achieve a decent result": the template
is a one-time fixed cost, then reused for every frame.

GSE mapping: our template lives in **meters** (`xM` in `Correspondence`), so
`xM = x_yards × 0.9144`. Our template should carry the same elements — critically the
**hash marks at the true NFL lateral offset** (college: 40 ft apart; NFL: 18 ft 6 in
from each sideline), because Chung's intersections need template-side coordinates.

### 2. Homography recovery

The unknown is the 3×3 projective matrix H with **8 degrees of freedom** mapping image
pixels p_i to template coordinates p_t:

```
p_t = H · p_i        (homogeneous coordinates: append 1 to make the 2-vector a 3-vector)
p_i = H^{-1} · p_t   (the inverse direction, used to warp the template onto the image)
```

**Direction discipline (easy to get wrong):** the post calls OpenCV's
`findHomography(templatePoints, imagePoints)` — source=template, dest=image — producing
**H_template→image**, which is what `warpPerspective` needs for the overlay. But the
*measurement* direction GSE needs is **H_image→template** (pixels → field meters),
i.e. the inverse. Our `fitHomographyDLT(src=pixels, dst=meters)` already computes the
measurement direction; the coder must never flip the correspondence order to "match the
tutorial."

Solving: 4 point pairs minimum (8 equations, 8 unknowns); overdetermined systems go
through the library least-squares solver. The post is explicit that any linear-algebra
library can do it — the math is the standard DLT, which our `cv-homography.ts` already
implements (Hartley normalization + normal equations + Gaussian elimination).

### 3. THE COLINEARITY GUARD — the extractable kernel

The post's `computeHomography()` does two checks:

1. `pointsImage.length === pointsTemplate.length && length >= 4` — else refuse.
2. After `findHomography`: **`if (homography.empty())` → refuse with "Be sure they are
   not colinear."**

That is the exact guard condition to implement: **when the correspondences are
(colinear), the homography solver returns nothing usable, and the correct behavior is
to refuse — not to emit a matrix.** Our current DLT *throws* on a numerically singular
pivot (`< 1e-12`), which is the same instinct, but it fires deep inside the solver with
no diagnostic, and near-colinear (not exactly colinear) inputs sail through and produce
garbage H. The tutorial's lesson: check geometry *before* solving, and name the cause.

### The math of why colinearity breaks DLT (standard derivation — NOT in the post; the post only implements the guard)

For each correspondence (x_i, y_i) ↔ (u_i, v_i), the DLT stacks two rows into the
design matrix A (2n × 9):

```
[ -x_i  -y_i  -1    0     0    0    u_i·x_i  u_i·y_i  u_i ]
[   0     0    0  -x_i  -y_i  -1    v_i·x_i  v_i·y_i  v_i ]
```

and solves A·h = 0, ||h|| = 1, via the SVD of A (h = last column of V). The normal
equations AᵀA·h = λh share the eigenvectors; the solution is the eigenvector of the
*smallest* eigenvalue.

**Colinear case:** if all (x_i, y_i) lie on one line, the rows of A span a subspace of
dimension < 8. The nullspace of A has dimension ≥ 2 — the solution is not unique: any
projective map that agrees on that line and warps the orthogonal direction arbitrarily
is a "solution." In eigen-terms, the two smallest eigenvalues both collapse toward
zero, so the **condition number κ(AᵀA) = λ_max / λ_min → ∞** (equivalently
κ(A) = σ_max / σ_min → ∞). The solver either returns an arbitrary nullspace vector
(garbage H — our yard-lines-only failure) or, in OpenCV's case, an empty matrix.

**Near-colinear case (the dangerous one):** yard lines in a broadcast view are *nearly*
parallel and their intersections with a *nearby* second line give points with tiny
orthogonal spread. Then λ_min is small but nonzero: κ is large but finite, the solver
returns *a* matrix, and the reprojection error on the fitting points looks fine while
extrapolation meters away explodes. This is why a post-fit residual check alone is
insufficient — **the guard must measure geometric spread before solving.**

### The exact guard condition to implement

In `cv-homography.ts` (or a new `cv-homography-guard.ts`), before calling the solver:

```
function checkCorrespondenceGeometry(c: Correspondence[]): void {
  if (c.length < 4) throw new DegenerateCorrespondencesError("need ≥4, got " + c.length);

  // 2D spread test on BOTH point sets (src pixels and dst meters)
  for (const pts of [srcPts(c), dstPts(c)]) {
    const { centroid, cov } = covariance2x2(pts);       // 2x2 scatter matrix
    const [l1, l2] = eigenvalues(cov);                   // l1 >= l2 >= 0
    // l2/l1 measures the fraction of variance in the weakest direction.
    // Colinear points: l2 ≈ 0. Near-colinear: l2/l1 tiny.
    if (l2 / (l1 + eps) < 1e-3)
      throw new DegenerateCorrespondencesError("points are (near-)colinear: 2D spread ratio " + (l2/l1));
    // Absolute-scale backstop: the weakest direction must span real pixels/meters.
    if (sqrt(l2) < MIN_SPREAD)   // e.g. 8 px src, 0.5 m dst [DERIVED]
      throw new DegenerateCorrespondencesError("insufficient spread in weakest direction");
  }

  // Convex-hull area backstop (catches "4 points, 3 nearly identical" pathologies)
  if (convexHullArea(srcPts(c)) < MIN_AREA_PX) throw ...;
}
```

Why both sets: a degenerate dst set (e.g., labeling bug maps all intersections to one
yard value) breaks DLT just as badly as a degenerate src set. The eigenvalue-ratio test
is the continuous generalization of Mendez's binary `homography.empty()` check — it
catches the near-colinear regime his check misses.

Error type: introduce `DegenerateCorrespondencesError extends Error` with a `reason`
field (`"too-few" | "colinear-src" | "colinear-dst" | "insufficient-spread"`), so
`cv-pipeline.ts` can fall back to the hand-seed (v1) or skip the frame *with a logged
reason* instead of a bare solver throw.

---

## DATASETS

None — interactive demo app, no dataset, no labels, no evaluation. Nothing to license
or reuse; the artifact is the method.

## GSE APPLICATION (gap c)

1. **The guard is the #1 takeaway.** It slots between Chung's
   `landmarksToCorrespondences()` and `fitHomographyDLT()`: landmark detection can
   silently degrade to yard-lines-only (hash-mark line missed in a frame); the guard
   converts that into a *named refusal* instead of a garbage homography poisoning
   downstream meters. This is the exact failure the repo docstring already fears
   ("parallel yard lines give no true 2D correspondences").
2. **Template construction recipe:** build our meter-template with the same element
   inventory (sidelines, end lines, end zones, hash marks at NFL offsets, numbers).
   One-time cost; enables the next improvement.
3. **Warp-overlay validation (improvement):** after fitting H_image→template, invert
   and warp the template onto the frame (Mendez's `warpPerspective` direction) and
   score overlap between warped white paint and the frame's white mask (Dice/IoU).
   A H that scores < threshold is rejected *photometrically* — validation that needs
   no extra labels. This is the cheapest end-to-end H check available.

## IMPLEMENTATION SPEC

Files:
- MODIFY `packages/prediction-engine/src/tracking/cv-homography.ts`:
  - ADD `export class DegenerateCorrespondencesError extends Error { reason: ... }`
  - ADD `export function checkCorrespondenceGeometry(points: readonly Correspondence[]): void`
    implementing the eigenvalue-ratio + absolute-spread + hull-area tests above.
  - MODIFY `fitHomographyDLT` to call `checkCorrespondenceGeometry` FIRST (fail fast
    with diagnosis, before the normal-equations throw).
  - Keep the existing `< 1e-12` pivot throw as the last-resort backstop.
- CREATE `packages/prediction-engine/src/tracking/cv-template.ts`:
  - `export const YARDS_TO_METERS = 0.9144`
  - `export interface FieldTemplate { widthM: number; heightM: number; hashMarkOffsetM: number; ... }`
    with NFL constants (field 120 yd × 53⅓ yd; hash marks 18 ft 6 in from each sideline).
  - `export function templatePointForYardLine(yardValue: number): { xM: number }` —
    the dst-side coordinate factory Chung's `landmarksToCorrespondences` needs.
- MODIFY `packages/prediction-engine/src/tracking/cv-pipeline.ts`: catch
  `DegenerateCorrespondencesError` → log `reason` → fall back to hand-seed or skip
  frame (configurable); never let a degenerate H into the tracklet stage.

TEST ASSERTIONS (implement first):
1. **Colinear rejection:** 4 correspondences on one image line (yard-lines-only
   simulation) → `checkCorrespondenceGeometry` throws with reason
   `"colinear-src"`; `fitHomographyDLT` throws `DegenerateCorrespondencesError`,
   NOT a garbage matrix and NOT the bare pivot error.
2. **Near-colinear rejection:** 4 points with orthogonal spread of 1.5 px (hash line
   mis-detected nearly parallel to yard lines) → throws `"insufficient-spread"`.
3. **Healthy acceptance:** 6 intersections from two crossing line families (synthetic,
   known H_gt) → passes the guard; `fitHomographyDLT` recovers H with mean
   reprojection error < 1.0 px on 20 held-out points.
4. **Direction test:** fit on synthetic pairs, then assert `projectPoint` maps a
   known pixel to the correct template meters AND that applying the matrix to a
   template point does *not* land on the pixel (catches the src/dst flip — the
   Mendez direction lesson as a regression test).
5. **Dst-degeneracy:** src points healthy but all dst yard values identical
   (labeling bug) → throws `"colinear-dst"`.

"Done and verified" = guard + template module + 5 assertions green; pipeline logs
named degeneracy reasons on a real clip instead of throwing bare solver errors.

## IMPROVEMENT PATH (beyond Mendez)

1. **RANSAC wrapper:** `fitHomographyRANSAC(points, { iterations, reprojThresholdPx })`
   — minimal 4-point samples, keep the model with most inliers. Mendez uses the
   closed-form path only; broadcast landmark detection *will* produce outlier
   intersections (mis-detected lines), and RANSAC is the standard answer. (OpenCV
   exposes this as a `findHomography` method flag; we implement our own loop around
   `fitHomographyDLT` + guard.)
2. **Condition-number reporting:** return κ estimate alongside H (via the normal
   equations' pivot magnitudes or a few power-iteration steps) — log it per frame;
   it's the early-warning signal for drift into near-degeneracy across a shot.
3. **Temporal H filtering:** per-frame H estimates within a shot fused with a
   moving average on the 8 parameters (or on projected control points) — kills jitter
   without re-solving.
4. **Photometric warp check** (above) as the final gate before H is consumed.

## Confidence

- **High:** template recipe (120 × 53.3, 1 px = 1 yd, element inventory, constants);
  p_t = H·p_i and the inverse direction; 4-point minimum / 8 DOF; the
  `homography.empty()` colinearity guard and its refuse-don't-emit behavior. All read
  verbatim in the 202-line post.
- **High:** the DLT colinearity math as standard CV theory (design-matrix rank,
  nullspace dimension, κ → ∞) — derived here, consistent with the post's guard.
- **Medium:** exact eigenvalue-ratio threshold (1e-3) and absolute spread floors —
  [DERIVED] engineering choices to tune on our footage, not from the source.
