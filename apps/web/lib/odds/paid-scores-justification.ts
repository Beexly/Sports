/**
 * C-109: which sports may spend a paid The Odds API scores call this cycle.
 *
 * The free settlement pass runs first and classifies every PENDING pick it
 * could not grade (apps/web/lib/settlement/root-cause-analysis.ts). A paid
 * scores fetch is justified only where that pass left an OVERDUE pick with no
 * final: RCA code OVERDUE_NO_SCORE, or NO_TRUSTED_FINAL on an overdue row.
 * Everything else (within grace, orientation or matching holds, disputes) is
 * not a missing score and the paid feed would not help. Pure; tolerates a
 * missing report.
 */

export interface JustificationFinding {
  readonly sportKey: string;
  readonly code: string;
  readonly overdue: boolean;
}

export const PAID_SCORES_JUSTIFYING_CODES: ReadonlySet<string> = new Set([
  "OVERDUE_NO_SCORE",
  "NO_TRUSTED_FINAL",
]);

export function paidScoresJustifiedSports(
  rca: { readonly findings: readonly JustificationFinding[] } | null | undefined,
): ReadonlySet<string> {
  const out = new Set<string>();
  for (const f of rca?.findings ?? []) {
    if (f.overdue && PAID_SCORES_JUSTIFYING_CODES.has(f.code)) out.add(f.sportKey);
  }
  return out;
}
