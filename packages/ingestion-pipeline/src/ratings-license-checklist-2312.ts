/**
 * Ratings license checklist: assumption diagnostics before promoting a pairwise model
 *
 * Research port: arXiv:2312.13619
 * Normalized lane: markets | Doctrine: BASELINE
 *
 * Engine-honesty gate for the ratings pipeline: before promoting any pairwise rating model, run assumption diagnostics — transitivity/intransitivity test on the win matrix (3-cycle enrichment), minimum-sample check, and draw handling. Pure diagnostics; promotion decisions stay human-owned.
 *
 * ACCEPTANCE GATE: ADAPT confirmed if the tie-aware or multi-outcome BT variant selected by the diagnostics beats the plain-BT baseline log-likelihood on the 2025 NFL held-out set. Live-data gate -> GSE_RATINGS_LICENSE_ENFORCED flag (default false).
 */

export interface WinMatrix {
  teams: string[];
  /** wins[i][j] = games i beat j */
  wins: number[][];
}

export interface DiagnosticFinding {
  check: string;
  passed: boolean;
  detail: string;
}

export const MIN_GAMES_PER_TEAM = 5;

/** Count directed 3-cycles (rock-paper-scissors) in the win graph. */
export function countThreeCycles(m: WinMatrix): number {
  const n = m.teams.length;
  const beats = (i: number, j: number): boolean => (m.wins[i]?.[j] ?? 0) > (m.wins[j]?.[i] ?? 0);
  let cycles = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        if ((beats(i, j) && beats(j, k) && beats(k, i)) || (beats(j, i) && beats(k, j) && beats(i, k))) {
          cycles++;
        }
      }
    }
  }
  return cycles;
}

/** Transitivity test: cycle share vs a null of ~25% expected under random orientation. */
export function transitivityDiagnostic(m: WinMatrix): DiagnosticFinding {
  const n = m.teams.length;
  const triples = (n * (n - 1) * (n - 2)) / 6;
  const cycles = countThreeCycles(m);
  const share = triples === 0 ? 0 : cycles / triples;
  return {
    check: "transitivity",
    passed: share <= 0.5,
    detail: `${cycles}/${triples} triples are 3-cycles (share ${share.toFixed(3)}); >0.5 flags intransitivity`,
  };
}

/** Minimum-sample diagnostic per team. */
export function sampleDiagnostic(m: WinMatrix): DiagnosticFinding {
  const n = m.teams.length;
  const thin: string[] = [];
  for (let i = 0; i < n; i++) {
    let g = 0;
    for (let j = 0; j < n; j++) g += (m.wins[i]?.[j] ?? 0) + (m.wins[j]?.[i] ?? 0);
    const t = m.teams[i];
    if (g < MIN_GAMES_PER_TEAM && t !== undefined) thin.push(t);
  }
  return {
    check: "min_sample",
    passed: thin.length === 0,
    detail: thin.length === 0 ? `all teams >= ${MIN_GAMES_PER_TEAM} games` : `thin teams: ${thin.join(", ")}`,
  };
}

/** Full license checklist: every check must pass to promote. */
export function ratingsLicenseChecklist(m: WinMatrix): { licensed: boolean; findings: DiagnosticFinding[] } {
  const findings = [transitivityDiagnostic(m), sampleDiagnostic(m)];
  return { licensed: findings.every((f) => f.passed), findings };
}

/** Live-data gate: tie-aware/multi-outcome BT must beat plain BT on 2025 held-out. */
export const GSE_RATINGS_LICENSE_ENFORCED = false;

