/**
 * Workstream 6 Hop 3 (`GSI & GSE 11_5 (1).docx`):
 * Customer-Facing Jargon Firewall & Football-Film Copy Sanitizer (`packages/verifier/src/jargon-firewall.ts`).
 *
 * Ensures zero internal math-dump or pipeline jargon ever leaks onto customer-facing
 * surfaces (`apps/web`, `apps/mobile`, X/IG), while translating quantitative edge
 * signals into natural football-film and matchup language.
 */

export interface JargonScanResult {
  readonly passed: boolean;
  readonly violations: readonly string[];
  readonly sanitizedText: string;
}

const INTERNAL_JARGON_REPLACEMENTS: ReadonlyArray<{
  readonly label: string;
  readonly pattern: RegExp;
  readonly replacement: string;
}> = [
  {
    label: "internal_snap_eval_count",
    pattern: /22,750,000\s+snap\s+evaluations/gi,
    replacement: "full-game snap-by-snap film and tendency synthesis",
  },
  {
    label: "internal_autonomous_layer_label",
    pattern: /10-Layer\s+Autonomous\s+Engine/gi,
    replacement: "matchup film and situational analysis",
  },
  {
    label: "internal_cqr_label",
    pattern: /\bRomano\s+CQR\b/gi,
    replacement: "calibrated range bounds",
  },
  {
    label: "internal_ot_label",
    pattern: /\bOptimal\s+Transport\b/gi,
    replacement: "target-share reallocation",
  },
  {
    label: "internal_sinkhorn_label",
    pattern: /\bSinkhorn(?:-Knopp)?\b/gi,
    replacement: "usage redistribution",
  },
  {
    label: "internal_cholesky_label",
    pattern: /\bCholesky\b/gi,
    replacement: "correlated game-script",
  },
  {
    label: "internal_tau_hat_label",
    pattern: /\btau_hat\b/gi,
    replacement: "line-value threshold",
  },
];

export function scanAndSanitizeCustomerCopy(text: string): JargonScanResult {
  let sanitized = text;
  const violations: string[] = [];

  for (const rule of INTERNAL_JARGON_REPLACEMENTS) {
    if (rule.pattern.test(sanitized)) {
      violations.push(rule.label);
      sanitized = sanitized.replace(rule.pattern, rule.replacement);
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    sanitizedText: sanitized,
  };
}
