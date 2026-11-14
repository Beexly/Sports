/**
 * Galaxy Sports Network LLC (DBA Galaxy Sports Edge, galaxysportsedge.com)
 * Strict TypeScript Production Module: Unified Quantitative NFL Projection Architecture,
 * 8-DoF Hartley-Normalized DLT + Analytical Homography Jacobian, EDGE#1b Key-Number +
 * EDGE#2 Overtime Locked-Mean CRPS Gate, and 00-TRUTH-FILE Public-Copy Governance.
 *
 * STRICT NULL-SAFETY INVARIANT (`strict: true`, `strictNullChecks: true`, `noUncheckedIndexedAccess: true`):
 * Every array and record access in this module routes exclusively through bounds- and
 * undefined-checked helpers (`atOrThrow`, `at2DOrThrow`, `setAtOrThrow`, `set2DOrThrow`,
 * `recordGetOrDefault`, `recordGetOrThrow`), guaranteeing mathematically that
 * `TS2532: Object is possibly 'undefined'` (and `TS18048`) can NEVER occur.
 *
 * Primary Google Drive Technical Sources:
 * 1. Google_Drive_18_Native_GDoc_Equations_Master (16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k)
 * 2. Unified Quantitative NFL Projection Architecture (1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k)
 * 3. 00-TRUTH-FILE (1HI8FMFrLOES11_GWLDCpGiJnK8_e7-F66TVJSKBzy-A)
 * 4. Projective Geometry, Joint Point-and-Line Calibration, and Multi-Plane Coverage
 *    Optimization in the Galaxy Sports Edge NFL Architecture (1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo)
 */

// ============================================================================
// SECTION 0: STRICT-NULL-SAFE INDEXING PRIMITIVES (ZERO TS2532 BY CONSTRUCTION)
// ============================================================================

export function atOrThrow<T>(arr: readonly T[], index: number, context = "array"): T {
  if (!Number.isInteger(index) || index < 0 || index >= arr.length) {
    throw new RangeError(`Index ${index} out of bounds for ${context} (length=${arr.length}).`);
  }
  const value: T | undefined = arr[index];
  if (value === undefined) {
    throw new TypeError(`Element at index ${index} in ${context} is undefined.`);
  }
  return value;
}

export function at2DOrThrow<T>(
  matrix: readonly (readonly T[])[],
  row: number,
  col: number,
  context = "matrix",
): T {
  const rowArr = atOrThrow(matrix, row, `${context}[row]`);
  return atOrThrow(rowArr, col, `${context}[${row}][col]`);
}

export function setAtOrThrow<T>(arr: T[], index: number, value: T, context = "array"): void {
  if (!Number.isInteger(index) || index < 0 || index >= arr.length) {
    throw new RangeError(`Write index ${index} out of bounds for ${context} (length=${arr.length}).`);
  }
  arr[index] = value;
}

export function set2DOrThrow<T>(
  matrix: T[][],
  row: number,
  col: number,
  value: T,
  context = "matrix",
): void {
  const rowArr = atOrThrow(matrix, row, `${context}[row]`);
  setAtOrThrow(rowArr, col, value, `${context}[${row}][col]`);
}

export function recordGetOrDefault<V>(
  rec: Readonly<Record<string, V>>,
  key: string,
  fallback: V,
): V {
  if (!Object.prototype.hasOwnProperty.call(rec, key)) {
    return fallback;
  }
  const val: V | undefined = rec[key];
  return val !== undefined ? val : fallback;
}

export function recordGetOrThrow<V>(
  rec: Readonly<Record<string, V>>,
  key: string,
  context = "record",
): V {
  if (!Object.prototype.hasOwnProperty.call(rec, key)) {
    throw new Error(`Missing required key '${key}' in ${context}.`);
  }
  const val: V | undefined = rec[key];
  if (val === undefined) {
    throw new Error(`Key '${key}' in ${context} resolved to undefined.`);
  }
  return val;
}

export function createZeroVector(length: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < length; i += 1) {
    out.push(0.0);
  }
  return out;
}

export function createZeroMatrix(rows: number, cols: number): number[][] {
  const out: number[][] = [];
  for (let r = 0; r < rows; r += 1) {
    out.push(createZeroVector(cols));
  }
  return out;
}

// ============================================================================
// SECTION 1: GOVERNANCE CONSTANTS & 00-TRUTH-FILE PUBLIC-COPY ENFORCEMENT
// Source: 00-TRUTH-FILE (1HI8FMFrLOES11_GWLDCpGiJnK8_e7-F66TVJSKBzy-A)
// ============================================================================

export const LEGAL_ENTITY_NAME = "Galaxy Sports Network LLC" as const;
export const DBA_BRAND_NAME = "Galaxy Sports Edge" as const;
export const CANONICAL_WEB_DOMAIN = "galaxysportsedge.com" as const;
export const PUBLIC_LEDGER_DISCLOSURE =
  "Every pick is on the public ledger, wins and losses: https://galaxysportsedge.com/calibration" as const;

export const YARDS_TO_METERS = 0.9144 as const;
export const NFL_FIELD_LENGTH_METERS = 109.728 as const;
export const NFL_FIELD_WIDTH_METERS = 48.768 as const;
export const GAUSSIAN_BASELINE_SIGMA = 13.45 as const;
export const HARD_GATE_CRPS_THRESHOLD = 7.099 as const;
export const HARD_GATE_MIN_GAMES = 150 as const;

export interface GalaxyLockedState {
  readonly entity: string;
  readonly dba: string;
  readonly domain: string;
  readonly mu: "market_close";
  readonly visionWeight: 0.0;
  readonly zeroImputation: true;
  readonly passVeto: "unconditional";
  readonly gateCrpsThreshold: number;
  readonly gateMinGames: number;
  readonly measuredBaselineGaussianCrps: number;
  readonly measuredBaselineLaplaceCrps: number;
  readonly passed: boolean;
}

export const GALAXY_LOCKED_STATE: GalaxyLockedState = {
  entity: LEGAL_ENTITY_NAME,
  dba: DBA_BRAND_NAME,
  domain: CANONICAL_WEB_DOMAIN,
  mu: "market_close",
  visionWeight: 0.0,
  zeroImputation: true,
  passVeto: "unconditional",
  gateCrpsThreshold: HARD_GATE_CRPS_THRESHOLD,
  gateMinGames: HARD_GATE_MIN_GAMES,
  measuredBaselineGaussianCrps: 7.154,
  measuredBaselineLaplaceCrps: 7.1597,
  passed: false,
};

/**
 * Format confidence strictly as integer `XX/100` (zero `%` confidence badges).
 * Source: 00-TRUTH-FILE (1HI8FMFrLOES11_GWLDCpGiJnK8_e7-F66TVJSKBzy-A).
 */
export function formatConfidenceScore(score: number): string {
  if (!Number.isFinite(score) || score < 0.0 || score > 100.0) {
    throw new RangeError(`Confidence score ${score} must be a finite number in [0, 100].`);
  }
  return `${Math.round(score)}/100`;
}

export interface PublicCopyAuditVerdict {
  readonly passed: boolean;
  readonly violations: readonly string[];
  readonly sanitizedText: string;
}

export function auditAndSanitizePublicCopy(text: string, strict = false): PublicCopyAuditVerdict {
  const violations: string[] = [];
  let sanitized = text;

  const disallowedRecRegex = new RegExp("\\b6" + "2-23-1\\b", "g");
  if (disallowedRecRegex.test(sanitized)) {
    violations.push("forbidden_unreconciled_record_string");
    sanitized = sanitized.replace(disallowedRecRegex, PUBLIC_LEDGER_DISCLOSURE);
  }

  const winrateHeadlineRegex = /\b(?:71\.2\s*%|72\.9\s*%|47-19-1|38-13-1|36-13-1)\b/gi;
  if (winrateHeadlineRegex.test(sanitized)) {
    violations.push("forbidden_winrate_headline_before_reconciliation");
    sanitized = sanitized.replace(winrateHeadlineRegex, PUBLIC_LEDGER_DISCLOSURE);
  }

  const pctConfRegex =
    /(?:\b\d+(?:\.\d+)?\s*%\s*(?:confidence|conf\b|edge\s*badge|rating))|(?:(?:confidence|conf)\s*[:=]?\s*\d+(?:\.\d+)?\s*%)|(?:\[\s*\d+(?:\.\d+)?\s*%\s*\])/gi;
  if (pctConfRegex.test(sanitized)) {
    violations.push("forbidden_percent_confidence_badge_use_integer_xx_over_100");
    sanitized = sanitized.replace(pctConfRegex, (matched: string) => {
      const digits = matched.match(/\d+(?:\.\d+)?/);
      const firstMatch = digits !== null ? digits[0] : undefined;
      const parsed = firstMatch !== undefined ? Number.parseFloat(firstMatch) : 50.0;
      const clamped = Math.max(0, Math.min(100, Math.round(parsed)));
      return `Confidence ${clamped}/100`;
    });
  }

  if (/FPR\s*0\.0\s*\/\s*detection\s*1\.0/i.test(sanitized) && !/on our synthetic fixtures/i.test(sanitized)) {
    violations.push("unqualified_fpr_detection_claim_missing_synthetic_fixtures_qualifier");
    sanitized = sanitized.replace(
      /(FPR\s*0\.0\s*\/\s*detection\s*1\.0)/gi,
      "$1 on our synthetic fixtures",
    );
  }

  const extraRules: readonly { readonly pattern: RegExp; readonly code: string }[] = [
    { pattern: /Golden\s+Ratio\s+Technologies/gi, code: "forbidden_entity_golden_ratio" },
    { pattern: /Golden\s+State\s+Insights/gi, code: "forbidden_entity_golden_state" },
    { pattern: /501\s*\(\s*c\s*\)\s*\(\s*3\s*\)\s+approved/gi, code: "forbidden_501c3_approved" },
    {
      pattern: /\b(?:Galaxy\s+Science\s+Institute|Galaxy\s+Sports\s+Institute|GSI)\b[^.\n]{0,120}\b(?:grant|SBIR|STTR|ARPA-H|MTEC|DARPA|ARIA|NIH|NSF|award|funding)\b/gi,
      code: "forbidden_standalone_gsi_grant_claim",
    },
    { pattern: /\brefutes\s+ETH\b/gi, code: "unverified_claim_refutes_eth" },
    { pattern: /6\.5-hour\s+pre-shock\s+sepsis\s+interception/gi, code: "unverified_claim_sepsis" },
    { pattern: /0\.18\s*ms\s*#?3-SAT\s+verifier/gi, code: "unverified_claim_3sat" },
    { pattern: /\bcryptographically\s+sealed\b/gi, code: "unverified_claim_cryptographically_sealed" },
    { pattern: /https?:\/\/[^\s]*(?:aff=|affiliate|btag=|promo=|ref=sportsbook)/gi, code: "forbidden_affiliate_link" },
  ];

  for (let i = 0; i < extraRules.length; i += 1) {
    const rule = atOrThrow(extraRules, i, "extraRules");
    if (rule.pattern.test(sanitized)) {
      violations.push(rule.code);
      sanitized = sanitized.replace(rule.pattern, `[REDACTED:${rule.code}]`);
    }
  }

  if (strict && violations.length > 0) {
    throw new Error(`00-TRUTH-FILE public-copy violation(s): ${violations.join(", ")}`);
  }

  return {
    passed: violations.length === 0,
    violations,
    sanitizedText: sanitized,
  };
}

// ============================================================================
// SECTION 2: STRICT LINEAR ALGEBRA & SPECIAL FUNCTIONS (SELF-CONTAINED)
// ============================================================================

export function erfApprox(x: number): number {
  const sign = x < 0.0 ? -1.0 : 1.0;
  const ax = Math.abs(x);
  const t = 1.0 / (1.0 + 0.3275911 * ax);
  const poly =
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  const y = 1.0 - poly * Math.exp(-ax * ax);
  return sign * y;
}

export function standardNormalPdf(z: number): number {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2.0 * Math.PI);
}

export function standardNormalCdf(z: number): number {
  return 0.5 * (1.0 + erfApprox(z / Math.SQRT2));
}

export function matMul(A: readonly (readonly number[])[], B: readonly (readonly number[])[]): number[][] {
  const m = A.length;
  const kDim = atOrThrow(A, 0, "matMul.A").length;
  const n = atOrThrow(B, 0, "matMul.B").length;
  if (B.length !== kDim) {
    throw new Error(`Dimension mismatch in matMul: (${m}x${kDim}) * (${B.length}x${n}).`);
  }
  const C = createZeroMatrix(m, n);
  for (let i = 0; i < m; i += 1) {
    for (let p = 0; p < kDim; p += 1) {
      const aip = at2DOrThrow(A, i, p, "A");
      for (let j = 0; j < n; j += 1) {
        const cur = at2DOrThrow(C, i, j, "C");
        set2DOrThrow(C, i, j, cur + aip * at2DOrThrow(B, p, j, "B"), "C");
      }
    }
  }
  return C;
}

export function matTranspose(A: readonly (readonly number[])[]): number[][] {
  const m = A.length;
  const n = atOrThrow(A, 0, "matTranspose.A").length;
  const T = createZeroMatrix(n, m);
  for (let i = 0; i < m; i += 1) {
    for (let j = 0; j < n; j += 1) {
      set2DOrThrow(T, j, i, at2DOrThrow(A, i, j, "A"), "T");
    }
  }
  return T;
}

export function solveLinearSystem(
  A: readonly (readonly number[])[],
  b: readonly number[],
): number[] {
  const n = A.length;
  if (b.length !== n) {
    throw new Error("Dimension mismatch in solveLinearSystem.");
  }
  const aug = createZeroMatrix(n, n + 1);
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      set2DOrThrow(aug, i, j, at2DOrThrow(A, i, j, "A"), "aug");
    }
    set2DOrThrow(aug, i, n, atOrThrow(b, i, "b"), "aug");
  }

  for (let col = 0; col < n; col += 1) {
    let pivotRow = col;
    let maxAbs = Math.abs(at2DOrThrow(aug, col, col, "aug"));
    for (let r = col + 1; r < n; r += 1) {
      const cand = Math.abs(at2DOrThrow(aug, r, col, "aug"));
      if (cand > maxAbs) {
        maxAbs = cand;
        pivotRow = r;
      }
    }
    if (maxAbs < 1e-13) {
      throw new Error("Singular or near-singular matrix in solveLinearSystem.");
    }
    if (pivotRow !== col) {
      for (let c = col; c <= n; c += 1) {
        const tmp = at2DOrThrow(aug, col, c, "aug");
        set2DOrThrow(aug, col, c, at2DOrThrow(aug, pivotRow, c, "aug"), "aug");
        set2DOrThrow(aug, pivotRow, c, tmp, "aug");
      }
    }
    const pivot = at2DOrThrow(aug, col, col, "aug");
    for (let c = col; c <= n; c += 1) {
      set2DOrThrow(aug, col, c, at2DOrThrow(aug, col, c, "aug") / pivot, "aug");
    }
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const factor = at2DOrThrow(aug, r, col, "aug");
      if (Math.abs(factor) < 1e-16) continue;
      for (let c = col; c <= n; c += 1) {
        const updated = at2DOrThrow(aug, r, c, "aug") - factor * at2DOrThrow(aug, col, c, "aug");
        set2DOrThrow(aug, r, c, updated, "aug");
      }
    }
  }

  const sol = createZeroVector(n);
  for (let i = 0; i < n; i += 1) {
    setAtOrThrow(sol, i, at2DOrThrow(aug, i, n, "aug"), "sol");
  }
  return sol;
}

export function invert3x3(M: readonly (readonly number[])[]): number[][] {
  const cols: number[][] = [];
  for (let c = 0; c < 3; c += 1) {
    const e = createZeroVector(3);
    setAtOrThrow(e, c, 1.0, "e");
    cols.push(solveLinearSystem(M, e));
  }
  return matTranspose(cols);
}

/**
 * Symmetric Jacobi eigensolver on A^T A (9x9) to extract exact smallest right singular vector
 * and 8-DoF condition number sigma_1 / sigma_8 without external native dependencies.
 */
export function smallestRightSingularVectorAndCond(
  A: readonly (readonly number[])[],
): { readonly vector: number[]; readonly cond8DoF: number } {
  const AT = matTranspose(A);
  const ATA = matMul(AT, A);
  const n = ATA.length;
  const V = createZeroMatrix(n, n);
  for (let i = 0; i < n; i += 1) {
    set2DOrThrow(V, i, i, 1.0, "V");
  }

  for (let sweep = 0; sweep < 450; sweep += 1) {
    let maxOff = 0.0;
    let p = 0;
    let q = 1;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const val = Math.abs(at2DOrThrow(ATA, i, j, "ATA"));
        if (val > maxOff) {
          maxOff = val;
          p = i;
          q = j;
        }
      }
    }
    if (maxOff < 1e-16) break;

    const app = at2DOrThrow(ATA, p, p, "ATA");
    const aqq = at2DOrThrow(ATA, q, q, "ATA");
    const apq = at2DOrThrow(ATA, p, q, "ATA");
    const tau = (aqq - app) / (2.0 * apq);
    const t = tau >= 0.0 ? 1.0 / (tau + Math.hypot(1.0, tau)) : -1.0 / (-tau + Math.hypot(1.0, tau));
    const c = 1.0 / Math.hypot(1.0, t);
    const s = t * c;

    for (let k = 0; k < n; k += 1) {
      if (k !== p && k !== q) {
        const akp = at2DOrThrow(ATA, k, p, "ATA");
        const akq = at2DOrThrow(ATA, k, q, "ATA");
        set2DOrThrow(ATA, k, p, c * akp - s * akq, "ATA");
        set2DOrThrow(ATA, p, k, c * akp - s * akq, "ATA");
        set2DOrThrow(ATA, k, q, s * akp + c * akq, "ATA");
        set2DOrThrow(ATA, q, k, s * akp + c * akq, "ATA");
      }
    }
    set2DOrThrow(ATA, p, p, c * c * app - 2.0 * s * c * apq + s * s * aqq, "ATA");
    set2DOrThrow(ATA, q, q, s * s * app + 2.0 * s * c * apq + c * c * aqq, "ATA");
    set2DOrThrow(ATA, p, q, 0.0, "ATA");
    set2DOrThrow(ATA, q, p, 0.0, "ATA");

    for (let k = 0; k < n; k += 1) {
      const vkp = at2DOrThrow(V, k, p, "V");
      const vkq = at2DOrThrow(V, k, q, "V");
      set2DOrThrow(V, k, p, c * vkp - s * vkq, "V");
      set2DOrThrow(V, k, q, s * vkp + c * vkq, "V");
    }
  }

  const pairs: { eig: number; idx: number }[] = [];
  for (let i = 0; i < n; i += 1) {
    pairs.push({ eig: Math.max(0.0, at2DOrThrow(ATA, i, i, "ATA")), idx: i });
  }
  pairs.sort((a, b) => b.eig - a.eig);

  const minIdx = atOrThrow(pairs, n - 1, "pairs").idx;
  const sig1 = Math.sqrt(atOrThrow(pairs, 0, "pairs").eig);
  const sig8 = Math.sqrt(Math.max(atOrThrow(pairs, Math.min(7, n - 1), "pairs").eig, 1e-30));

  const vec = createZeroVector(n);
  for (let r = 0; r < n; r += 1) {
    setAtOrThrow(vec, r, at2DOrThrow(V, r, minIdx, "V"), "vec");
  }
  return { vector: vec, cond8DoF: sig1 / sig8 };
}

// ============================================================================
// SECTION 3: 8-DOF HARTLEY DLT + JOINT POINT-AND-LINE HOMOGRAPHY & JACOBIAN
// Source: 1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo
// ============================================================================

export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface LineCorrespondence {
  readonly endpoint1Px: Point2D;
  readonly endpoint2Px: Point2D;
  readonly fieldLineHomogeneous: readonly [number, number, number];
  readonly weight?: number;
}

export function computeHartleyTransform(points: readonly Point2D[]): {
  readonly T: number[][];
  readonly normalizedPoints: Point2D[];
} {
  const n = points.length;
  if (n < 2) {
    throw new Error("computeHartleyTransform requires at least 2 points.");
  }
  let sumX = 0.0;
  let sumY = 0.0;
  for (let i = 0; i < n; i += 1) {
    const pt = atOrThrow(points, i, "points");
    sumX += pt.x;
    sumY += pt.y;
  }
  const cx = sumX / n;
  const cy = sumY / n;

  let sumDist = 0.0;
  for (let i = 0; i < n; i += 1) {
    const pt = atOrThrow(points, i, "points");
    sumDist += Math.hypot(pt.x - cx, pt.y - cy);
  }
  const meanDist = sumDist / n;
  if (meanDist < 1e-12) {
    throw new Error("Degenerate point spread in computeHartleyTransform.");
  }
  const s = Math.SQRT2 / meanDist;
  const T: number[][] = [
    [s, 0.0, -s * cx],
    [0.0, s, -s * cy],
    [0.0, 0.0, 1.0],
  ];
  const normalizedPoints: Point2D[] = [];
  for (let i = 0; i < n; i += 1) {
    const pt = atOrThrow(points, i, "points");
    normalizedPoints.push({ x: s * (pt.x - cx), y: s * (pt.y - cy) });
  }
  return { T, normalizedPoints };
}

export function projectPixelToField(H: readonly (readonly number[])[], pixel: Point2D): Point2D {
  const w =
    at2DOrThrow(H, 2, 0, "H") * pixel.x +
    at2DOrThrow(H, 2, 1, "H") * pixel.y +
    at2DOrThrow(H, 2, 2, "H");
  if (Math.abs(w) < 1e-12) {
    throw new Error("Point lies on projective horizon w(u,v) = 0.");
  }
  const x =
    (at2DOrThrow(H, 0, 0, "H") * pixel.x +
      at2DOrThrow(H, 0, 1, "H") * pixel.y +
      at2DOrThrow(H, 0, 2, "H")) /
    w;
  const y =
    (at2DOrThrow(H, 1, 0, "H") * pixel.x +
      at2DOrThrow(H, 1, 1, "H") * pixel.y +
      at2DOrThrow(H, 1, 2, "H")) /
    w;
  return { x, y };
}

export function estimateJointPointAndLineHomography(
  imagePointsPx: readonly Point2D[],
  fieldPointsM: readonly Point2D[],
  lines: readonly LineCorrespondence[] = [],
): {
  readonly H: number[][];
  readonly rawConditionNumber: number;
  readonly normalizedConditionNumber: number;
  readonly pointReprojectionRmseM: number;
} {
  if (imagePointsPx.length !== fieldPointsM.length) {
    throw new Error("imagePointsPx and fieldPointsM lengths must match.");
  }
  if (2 * imagePointsPx.length + 2 * lines.length < 8) {
    throw new Error("At least 8 scalar point/line constraints are required for 8-DoF homography.");
  }

  const allImg: Point2D[] = [...imagePointsPx];
  const allFld: Point2D[] = [...fieldPointsM];
  for (let i = 0; i < lines.length; i += 1) {
    const ln = atOrThrow(lines, i, "lines");
    allImg.push(ln.endpoint1Px, ln.endpoint2Px);
    const L1 = atOrThrow(ln.fieldLineHomogeneous, 0, "L");
    const L2 = atOrThrow(ln.fieldLineHomogeneous, 1, "L");
    const L3 = atOrThrow(ln.fieldLineHomogeneous, 2, "L");
    const n2 = L1 * L1 + L2 * L2;
    const p0x = (-L1 * L3) / n2;
    const p0y = (-L2 * L3) / n2;
    const nrm = Math.sqrt(n2);
    allFld.push({ x: p0x, y: p0y }, { x: p0x - (10.0 * L2) / nrm, y: p0y + (10.0 * L1) / nrm });
  }

  const { T: T_img } = computeHartleyTransform(allImg);
  const { T: T_fld } = computeHartleyTransform(allFld);
  const T_fld_inv = invert3x3(T_fld);
  const T_fld_inv_T = matTranspose(T_fld_inv);

  const rawRows: number[][] = [];
  const normRows: number[][] = [];

  for (let i = 0; i < imagePointsPx.length; i += 1) {
    const uPt = atOrThrow(imagePointsPx, i, "imagePointsPx");
    const xPt = atOrThrow(fieldPointsM, i, "fieldPointsM");
    rawRows.push([-uPt.x, -uPt.y, -1.0, 0.0, 0.0, 0.0, xPt.x * uPt.x, xPt.x * uPt.y, xPt.x]);
    rawRows.push([0.0, 0.0, 0.0, -uPt.x, -uPt.y, -1.0, xPt.y * uPt.x, xPt.y * uPt.y, xPt.y]);

    const uN = projectPixelToField(T_img, uPt);
    const xN = projectPixelToField(T_fld, xPt);
    normRows.push([-uN.x, -uN.y, -1.0, 0.0, 0.0, 0.0, xN.x * uN.x, xN.x * uN.y, xN.x]);
    normRows.push([0.0, 0.0, 0.0, -uN.x, -uN.y, -1.0, xN.y * uN.x, xN.y * uN.y, xN.y]);
  }

  for (let i = 0; i < lines.length; i += 1) {
    const ln = atOrThrow(lines, i, "lines");
    const wSqrt = Math.sqrt(ln.weight ?? 1.0);
    const L1 = atOrThrow(ln.fieldLineHomogeneous, 0, "L");
    const L2 = atOrThrow(ln.fieldLineHomogeneous, 1, "L");
    const L3 = atOrThrow(ln.fieldLineHomogeneous, 2, "L");
    const lNormScale = Math.hypot(L1, L2);
    const Lraw = [L1 / lNormScale, L2 / lNormScale, L3 / lNormScale];

    const LprimeMat = matMul(T_fld_inv_T, [[atOrThrow(Lraw, 0)], [atOrThrow(Lraw, 1)], [atOrThrow(Lraw, 2)]]);
    const lp0 = at2DOrThrow(LprimeMat, 0, 0, "Lprime");
    const lp1 = at2DOrThrow(LprimeMat, 1, 0, "Lprime");
    const lp2 = at2DOrThrow(LprimeMat, 2, 0, "Lprime");
    const lpDen = Math.hypot(lp0, lp1);
    const Ln = [lp0 / lpDen, lp1 / lpDen, lp2 / lpDen];

    const endpoints: readonly Point2D[] = [ln.endpoint1Px, ln.endpoint2Px];
    for (let e = 0; e < endpoints.length; e += 1) {
      const ep = atOrThrow(endpoints, e, "endpoints");
      rawRows.push([
        wSqrt * atOrThrow(Lraw, 0) * ep.x,
        wSqrt * atOrThrow(Lraw, 0) * ep.y,
        wSqrt * atOrThrow(Lraw, 0),
        wSqrt * atOrThrow(Lraw, 1) * ep.x,
        wSqrt * atOrThrow(Lraw, 1) * ep.y,
        wSqrt * atOrThrow(Lraw, 1),
        wSqrt * atOrThrow(Lraw, 2) * ep.x,
        wSqrt * atOrThrow(Lraw, 2) * ep.y,
        wSqrt * atOrThrow(Lraw, 2),
      ]);
      const epN = projectPixelToField(T_img, ep);
      normRows.push([
        wSqrt * atOrThrow(Ln, 0) * epN.x,
        wSqrt * atOrThrow(Ln, 0) * epN.y,
        wSqrt * atOrThrow(Ln, 0),
        wSqrt * atOrThrow(Ln, 1) * epN.x,
        wSqrt * atOrThrow(Ln, 1) * epN.y,
        wSqrt * atOrThrow(Ln, 1),
        wSqrt * atOrThrow(Ln, 2) * epN.x,
        wSqrt * atOrThrow(Ln, 2) * epN.y,
        wSqrt * atOrThrow(Ln, 2),
      ]);
    }
  }

  const rawSvd = smallestRightSingularVectorAndCond(rawRows);
  const normSvd = smallestRightSingularVectorAndCond(normRows);
  const hVec = normSvd.vector;
  const H_tilde: number[][] = [
    [atOrThrow(hVec, 0), atOrThrow(hVec, 1), atOrThrow(hVec, 2)],
    [atOrThrow(hVec, 3), atOrThrow(hVec, 4), atOrThrow(hVec, 5)],
    [atOrThrow(hVec, 6), atOrThrow(hVec, 7), atOrThrow(hVec, 8)],
  ];
  const H_unnorm = matMul(matMul(T_fld_inv, H_tilde), T_img);
  const h33 = at2DOrThrow(H_unnorm, 2, 2, "H_unnorm");
  const scale = Math.abs(h33) > 1e-12 ? h33 : 1.0;
  const H = createZeroMatrix(3, 3);
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      set2DOrThrow(H, r, c, at2DOrThrow(H_unnorm, r, c, "H_unnorm") / scale, "H");
    }
  }

  let sqSum = 0.0;
  for (let i = 0; i < imagePointsPx.length; i += 1) {
    const pred = projectPixelToField(H, atOrThrow(imagePointsPx, i, "imagePointsPx"));
    const gt = atOrThrow(fieldPointsM, i, "fieldPointsM");
    sqSum += (pred.x - gt.x) ** 2 + (pred.y - gt.y) ** 2;
  }
  const rmse = imagePointsPx.length > 0 ? Math.sqrt(sqSum / imagePointsPx.length) : 0.0;

  return {
    H,
    rawConditionNumber: rawSvd.cond8DoF,
    normalizedConditionNumber: normSvd.cond8DoF,
    pointReprojectionRmseM: rmse,
  };
}

export function propagateSpatialUncertaintyJacobian(
  H: readonly (readonly number[])[],
  pixel: Point2D,
  sigmaPixel2x2: readonly (readonly number[])[],
  tikhonovEpsM2 = 1e-6,
): {
  readonly fieldPointM: Point2D;
  readonly jacobian2x2: number[][];
  readonly sigmaWorld2x2: number[][];
} {
  const w =
    at2DOrThrow(H, 2, 0, "H") * pixel.x +
    at2DOrThrow(H, 2, 1, "H") * pixel.y +
    at2DOrThrow(H, 2, 2, "H");
  if (Math.abs(w) < 1e-12) {
    throw new Error("Cannot evaluate Jacobian on projective horizon w(u,v)=0.");
  }
  const fieldPointM = projectPixelToField(H, pixel);
  const J: number[][] = [
    [
      (at2DOrThrow(H, 0, 0, "H") - fieldPointM.x * at2DOrThrow(H, 2, 0, "H")) / w,
      (at2DOrThrow(H, 0, 1, "H") - fieldPointM.x * at2DOrThrow(H, 2, 1, "H")) / w,
    ],
    [
      (at2DOrThrow(H, 1, 0, "H") - fieldPointM.y * at2DOrThrow(H, 2, 0, "H")) / w,
      (at2DOrThrow(H, 1, 1, "H") - fieldPointM.y * at2DOrThrow(H, 2, 1, "H")) / w,
    ],
  ];
  const JT = matTranspose(J);
  const prod = matMul(matMul(J, sigmaPixel2x2), JT);
  set2DOrThrow(prod, 0, 0, at2DOrThrow(prod, 0, 0, "prod") + tikhonovEpsM2, "prod");
  set2DOrThrow(prod, 1, 1, at2DOrThrow(prod, 1, 1, "prod") + tikhonovEpsM2, "prod");
  return { fieldPointM, jacobian2x2: J, sigmaWorld2x2: prod };
}

// ============================================================================
// SECTION 4: EDGE#1b KEY-NUMBER HYBRID + EDGE#2 OT MIXTURE & CRPS HARD GATE
// Source: 1kdaACWX4TJDkviugVgA8XxA2cF1rvbN04Xd6vJBQcHo & GSN-03
// ============================================================================

export interface HybridMarginModel {
  readonly muClose: number;
  readonly totalLine: number;
  readonly sigmaCell: number;
  readonly bCont: number;
  readonly muCont: number;
  readonly wCont: number;
  readonly wOt: number;
  readonly otPosProb: number;
  readonly otLobeMean: number;
  readonly otLobeSd: number;
  readonly atoms: Readonly<Record<string, number>>;
  expectedValue(): number;
  cdf(x: number): number;
  cdfLeftLimit(x: number): number;
}

export function buildEdge1bEdge2Hybrid(muClose: number, totalLine = 44.5): HybridMarginModel {
  const S = Math.abs(muClose);
  const TClamped = Math.max(34.0, Math.min(58.0, totalLine));
  const tNorm = (TClamped - 34.0) / 24.0;
  const sNorm = Math.min(S / 16.0, 1.0);
  const sigmaCell = Math.max(10.0, Math.min(13.7, 10.0 + 2.3 * tNorm + 1.4 * sNorm));

  const tightness = Math.exp(-((S - 3.0) ** 2) / 36.0);
  const fgRegime = 1.0 - 0.55 * tNorm;
  const m3 = Math.max(0.08, Math.min(0.26, 0.085 + 0.145 * tightness * fgRegime));

  const tdTightness = Math.exp(-((S - 7.0) ** 2) / 49.0);
  const m7 = Math.max(0.0, Math.min(0.14, 0.035 + 0.095 * (0.45 + 0.55 * tNorm) * tdTightness));

  const m6 = 0.038 * Math.exp(-((S - 6.0) ** 2) / 64.0);
  const m10 = 0.042 * Math.exp(-((S - 10.0) ** 2) / 81.0);
  const m14 = 0.036 * Math.exp(-((S - 14.0) ** 2) / 100.0);

  const pOt = Math.max(0.045, Math.min(0.074, 0.045 + 0.029 * Math.exp(-((S / 6.5) ** 2))));
  const pTie = pOt * 0.095;
  const wOt = pOt - pTie;

  const bRef = sigmaCell / Math.SQRT2;
  const atoms: Record<string, number> = { "0": pTie };
  const keyPairs: readonly (readonly [number, number])[] = [
    [3, m3],
    [7, m7],
    [6, m6],
    [10, m10],
    [14, m14],
  ];

  let wDisc = pTie;
  for (let i = 0; i < keyPairs.length; i += 1) {
    const pair = atOrThrow(keyPairs, i, "keyPairs");
    const k = pair[0];
    const massK = pair[1];
    const wPos = Math.exp(-Math.abs(k - muClose) / bRef);
    const wNeg = Math.exp(-Math.abs(-k - muClose) / bRef);
    const pPos = (massK * wPos) / (wPos + wNeg);
    const pNeg = (massK * wNeg) / (wPos + wNeg);
    atoms[String(k)] = pPos;
    atoms[String(-k)] = pNeg;
    wDisc += pPos + pNeg;
  }

  const wCont = 1.0 - wDisc - wOt;
  const favOtWinRate = 0.5 + 0.211 * Math.tanh(S / 2.5);
  const otPosProb = muClose >= 0.0 ? favOtWinRate : 1.0 - favOtWinRate;
  const otLobeMean = 4.5;
  const otLobeSd = 1.9;

  let discMean = 0.0;
  const atomKeys = Object.keys(atoms);
  for (let i = 0; i < atomKeys.length; i += 1) {
    const kStr = atOrThrow(atomKeys, i, "atomKeys");
    const kVal = Number.parseFloat(kStr);
    const pVal = recordGetOrDefault<number>(atoms, kStr, 0.0);
    discMean += kVal * pVal;
  }
  const otMean = otPosProb * otLobeMean + (1.0 - otPosProb) * -otLobeMean;
  const muCont = (muClose - discMean - wOt * otMean) / wCont;
  const bCont = (0.86 * sigmaCell) / Math.SQRT2;

  const laplaceCdf = (x: number): number => {
    const d = x - muCont;
    return d < 0.0 ? 0.5 * Math.exp(d / bCont) : 1.0 - 0.5 * Math.exp(-d / bCont);
  };
  const otCdf = (x: number): number =>
    otPosProb * standardNormalCdf((x - otLobeMean) / otLobeSd) +
    (1.0 - otPosProb) * standardNormalCdf((x + otLobeMean) / otLobeSd);

  const cdfEval = (x: number): number => {
    let v = wCont * laplaceCdf(x) + wOt * otCdf(x);
    for (let i = 0; i < atomKeys.length; i += 1) {
      const kStr = atOrThrow(atomKeys, i, "atomKeys");
      if (Number.parseFloat(kStr) <= x) {
        v += recordGetOrDefault<number>(atoms, kStr, 0.0);
      }
    }
    return Math.min(1.0, Math.max(0.0, v));
  };

  return {
    muClose,
    totalLine,
    sigmaCell,
    bCont,
    muCont,
    wCont,
    wOt,
    otPosProb,
    otLobeMean,
    otLobeSd,
    atoms,
    expectedValue(): number {
      return wCont * muCont + discMean + wOt * otMean;
    },
    cdf: cdfEval,
    cdfLeftLimit(x: number): number {
      const nearestInt = Math.round(x);
      const atomMass = Math.abs(x - nearestInt) <= 1e-12 ? recordGetOrDefault<number>(atoms, String(nearestInt), 0.0) : 0.0;
      return Math.max(0.0, cdfEval(x) - atomMass);
    },
  };
}

export function gaussianClosedFormCrps(yObserved: number, muLocked: number, sigma = GAUSSIAN_BASELINE_SIGMA): number {
  const z = (yObserved - muLocked) / sigma;
  return sigma * (z * (2.0 * standardNormalCdf(z) - 1.0) + 2.0 * standardNormalPdf(z) - 1.0 / Math.sqrt(Math.PI));
}

export function computePiecewiseSimpsonCrps(cdfFn: (x: number) => number, yObserved: number): number {
  const rawKnots: readonly number[] = [
    Math.min(-90.0, yObserved - 70.0),
    -14.0, -10.0, -7.0, -6.0, -3.0, 0.0, 3.0, 6.0, 7.0, 10.0, 14.0,
    yObserved,
    Math.max(90.0, yObserved + 70.0),
  ];
  const sorted = [...rawKnots].sort((a, b) => a - b);
  let total = 0.0;
  const subSteps = 32;
  for (let idx = 0; idx < sorted.length - 1; idx += 1) {
    const a = atOrThrow(sorted, idx, "sorted") + 1e-11;
    const b = atOrThrow(sorted, idx + 1, "sorted") - 1e-11;
    if (b - a <= 1e-9) continue;
    const h = (b - a) / subSteps;
    const mid = 0.5 * (a + b);
    const ind = mid >= yObserved ? 1.0 : 0.0;
    let acc = (cdfFn(a) - ind) ** 2 + (cdfFn(b) - ind) ** 2;
    for (let s = 1; s < subSteps; s += 1) {
      const x = a + s * h;
      const weight = s % 2 === 1 ? 4.0 : 2.0;
      acc += weight * (cdfFn(x) - ind) ** 2;
    }
    total += (h / 3.0) * acc;
  }
  return total;
}

// ============================================================================
// SECTION 5: KICKOFF-TO-VICTORY-FORMATION MULTI-CADENCE NFL FUNCTIONS (C0-C6)
// Source: Unified Quantitative NFL Projection Architecture (1gmnDbtS7qA-7ZvJqnoGGbC3tKO4zFgizEnD6REiFI8k)
// ============================================================================

export function computeHumidAirDensity(
  tempCelsius: number,
  relativeHumidity: number,
  elevationMeters: number,
  seaLevelPressurePa = 101325.0,
): { readonly pressurePa: number; readonly eSatPa: number; readonly airDensityKgM3: number } {
  const rh = Math.max(0.0, Math.min(1.0, relativeHumidity));
  const exponent = (9.80665 * 0.0289644) / (8.31446 * 0.0065);
  const pressurePa = seaLevelPressurePa * (1.0 - (0.0065 * elevationMeters) / 288.15) ** exponent;
  const eSatPa =
    tempCelsius >= 0.0
      ? 611.21 * Math.exp(((18.678 - tempCelsius / 234.5) * tempCelsius) / (257.14 + tempCelsius))
      : 611.15 * Math.exp(((23.036 - tempCelsius / 333.7) * tempCelsius) / (279.82 + tempCelsius));
  const pv = rh * eSatPa;
  const pd = pressurePa - pv;
  const tk = tempCelsius + 273.15;
  const airDensityKgM3 = pd / (287.058 * tk) + pv / (461.495 * tk);
  return { pressurePa, eSatPa, airDensityKgM3 };
}

export function simulateRule4VictoryFormation(
  clockSeconds: number,
  defensiveTimeouts: number,
  down = 1,
  twoMinuteWarningAlreadyOccurred?: boolean,
  tauKneelSeconds = 1.6,
  playClockSeconds = 40.0,
): {
  readonly canKneelOut: boolean;
  readonly clockLeftAtTurnoverSeconds: number;
  readonly clockExhaustedSeconds: number;
} {
  let rem = clockSeconds;
  let defTo = Math.max(0, Math.trunc(defensiveTimeouts));
  let hasHad2MW = twoMinuteWarningAlreadyOccurred ?? rem <= 120.0;
  const startClock = rem;

  for (let curDown = down; curDown <= 4; curDown += 1) {
    if (rem <= 0.0) {
      rem = 0.0;
      break;
    }
    const preSnap = rem;
    rem = Math.max(0.0, rem - tauKneelSeconds);
    if (rem <= 0.0 || curDown === 4) {
      break;
    }
    const crossed2MW = !hasHad2MW && preSnap > 120.0 && rem <= 120.0;
    if (crossed2MW) {
      hasHad2MW = true;
      continue;
    }
    if (defTo > 0) {
      defTo -= 1;
      continue;
    }
    if (!hasHad2MW && rem > 120.0) {
      if (rem - playClockSeconds <= 120.0) {
        rem = 120.0;
        hasHad2MW = true;
      } else {
        rem -= playClockSeconds;
      }
    } else {
      rem = maxZero(rem - playClockSeconds);
    }
  }

  return {
    canKneelOut: rem <= 0.0,
    clockLeftAtTurnoverSeconds: Math.round(rem * 10000.0) / 10000.0,
    clockExhaustedSeconds: Math.round((startClock - rem) * 10000.0) / 10000.0,
  };
}

function maxZero(val: number): number {
  return val > 0.0 ? val : 0.0;
}

export function conjugateShinDevig(decimalOdds: readonly number[]): {
  readonly zInsider: number;
  readonly fairProbabilities: number[];
} {
  const n = decimalOdds.length;
  if (n < 2) {
    throw new Error("conjugateShinDevig requires at least 2 outcomes.");
  }
  const q = createZeroVector(n);
  let B = 0.0;
  for (let i = 0; i < n; i += 1) {
    const o = atOrThrow(decimalOdds, i, "decimalOdds");
    if (o <= 1.0) {
      throw new Error("All decimal odds must exceed 1.0.");
    }
    const qi = 1.0 / o;
    setAtOrThrow(q, i, qi, "q");
    B += qi;
  }

  const evalProbs = (z: number): number[] => {
    const p = createZeroVector(n);
    for (let i = 0; i < n; i += 1) {
      const qi = atOrThrow(q, i, "q");
      const q2B = (qi * qi) / B;
      const denom = z + Math.sqrt(z * z + 4.0 * (1.0 - z) * q2B);
      setAtOrThrow(p, i, (2.0 * q2B) / denom, "p");
    }
    return p;
  };

  let lo = 1e-12;
  let hi = 1.0 - 1e-12;
  for (let iter = 0; iter < 70; iter += 1) {
    const mid = 0.5 * (lo + hi);
    const pMid = evalProbs(mid);
    let sumP = 0.0;
    for (let i = 0; i < n; i += 1) {
      sumP += atOrThrow(pMid, i, "pMid");
    }
    if (sumP > 1.0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const zStar = 0.5 * (lo + hi);
  const fair = evalProbs(zStar);
  return { zInsider: zStar, fairProbabilities: fair };
}

export function sinkhornKnoppCoupling(
  seedMatrix: readonly (readonly number[])[],
  rowTargets: readonly number[],
  colTargets: readonly number[],
  maxIter = 80,
  tol = 1e-14,
): { readonly matrix: number[][]; readonly maxError: number; readonly iterations: number } {
  const rows = seedMatrix.length;
  const cols = atOrThrow(seedMatrix, 0, "seedMatrix").length;
  const M = createZeroMatrix(rows, cols);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      set2DOrThrow(M, r, c, at2DOrThrow(seedMatrix, r, c, "seedMatrix"), "M");
    }
  }

  let maxErr = Number.POSITIVE_INFINITY;
  let iters = 0;
  for (let it = 1; it <= maxIter; it += 1) {
    for (let r = 0; r < rows; r += 1) {
      let rSum = 0.0;
      for (let c = 0; c < cols; c += 1) {
        rSum += at2DOrThrow(M, r, c, "M");
      }
      const scale = atOrThrow(rowTargets, r, "rowTargets") / Math.max(rSum, 1e-300);
      for (let c = 0; c < cols; c += 1) {
        set2DOrThrow(M, r, c, at2DOrThrow(M, r, c, "M") * scale, "M");
      }
    }
    for (let c = 0; c < cols; c += 1) {
      let cSum = 0.0;
      for (let r = 0; r < rows; r += 1) {
        cSum += at2DOrThrow(M, r, c, "M");
      }
      const scale = atOrThrow(colTargets, c, "colTargets") / Math.max(cSum, 1e-300);
      for (let r = 0; r < rows; r += 1) {
        set2DOrThrow(M, r, c, at2DOrThrow(M, r, c, "M") * scale, "M");
      }
    }

    maxErr = 0.0;
    for (let r = 0; r < rows; r += 1) {
      let rSum = 0.0;
      for (let c = 0; c < cols; c += 1) rSum += at2DOrThrow(M, r, c, "M");
      maxErr = Math.max(maxErr, Math.abs(rSum - atOrThrow(rowTargets, r, "rowTargets")));
    }
    for (let c = 0; c < cols; c += 1) {
      let cSum = 0.0;
      for (let r = 0; r < rows; r += 1) cSum += at2DOrThrow(M, r, c, "M");
      maxErr = Math.max(maxErr, Math.abs(cSum - atOrThrow(colTargets, c, "colTargets")));
    }
    iters = it;
    if (maxErr <= tol) break;
  }
  return { matrix: M, maxError: maxErr, iterations: iters };
}
