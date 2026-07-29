/**
 * CI hooks against claim / partner / rights / crypto surfaces.
 * Exit non-zero if ship-blocking CRITICAL/HIGH remain on live product corpus.
 */

import { LIVE_PRODUCT_CORPUS } from "./corpus";
import { runDestroyPass } from "./destroy";
import type { DestroyReport } from "./types";

export interface CouncilCiResult {
  readonly ok: boolean;
  readonly report: DestroyReport;
  readonly exitCode: number;
  readonly summary: string;
}

/** Surfaces CI must protect — live product only (attack corpus is for unit tests). */
export function runCouncilCi(
  surfaces = LIVE_PRODUCT_CORPUS,
): CouncilCiResult {
  const report = runDestroyPass(surfaces);
  const blockers = report.criticalHigh.filter((f) => f.shipBlock);
  const ok = blockers.length === 0;
  return {
    ok,
    report,
    exitCode: ok ? 0 : 1,
    summary: ok
      ? `AI Council CI PASS — 0 ship-blockers on ${surfaces.length} surfaces`
      : `AI Council CI FAIL — ${blockers.length} ship-blockers (C=${report.counts.CRITICAL} H=${report.counts.HIGH})`,
  };
}

export const COUNCIL_CI = {
  surfaces: ["claim", "partner", "rights", "crypto", "gate", "marketing"] as const,
  command: "npx vitest run packages/ai-council",
  rule: "Any shipBlock CRITICAL|HIGH on LIVE_PRODUCT_CORPUS fails CI",
} as const;
