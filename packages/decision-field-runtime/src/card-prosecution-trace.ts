/**
 * DECISION FIELD RUNTIME — Card Prosecution Trace.
 *
 * No card is emitted until it has been prosecuted. The five prosecutors are NOT new agents — they map
 * onto the engine's existing 10-role Scientific Discovery Council:
 *   Data        → Theorist + Statistician   (facts legal, timely, source-clean)
 *   Causality   → Theorist + Historian       (real cause vs co-movement)
 *   MarketFantasy → Economist (assessTradability) (has the market already caught up?)
 *   Ghost       → Historian (assessAgainstGhosts) (resembles a known trap?)
 *   Product     → TrustOfficer                (will the user misread it; is it too strong; rights)
 * Pure + deterministic. The canonical banned-phrase scanner (`scanForBannedPhrases`, apps/web) is
 * wired at the UI boundary in Phase 2; here the Product prosecutor uses a minimal certainty-language
 * guard so the package stays dependency-free.
 */

import { type MaxPermittedStrength, strengthMin } from "./decision-state-stat-contract.js";

export type ProsecutorName = "Data" | "Causality" | "MarketFantasy" | "Ghost" | "Product";
export type ProsecutorVerdict = "PASS" | "WARN" | "FAIL";

export interface ProsecutorResult {
  readonly prosecutor: ProsecutorName;
  readonly councilRole: string;
  readonly verdict: ProsecutorVerdict;
  readonly publicSafeNote: string;
  /** If WARN/FAIL, the strongest the card may still be after this prosecutor. */
  readonly strengthCap: MaxPermittedStrength;
  readonly downgradeReason: string | null;
}

export interface CardProsecutionTrace {
  readonly verdicts: readonly ProsecutorResult[];
  readonly anyFail: boolean;
  readonly anyWarn: boolean;
  /** The lattice meet of every prosecutor's strength cap. */
  readonly strengthCap: MaxPermittedStrength;
  readonly downgradeReasons: readonly string[];
}

export interface ProsecutionInput {
  readonly hasCreditableFacts: boolean;
  readonly anyRequiredRightsBlocked: boolean;
  /** Role signal: a real role driver (snaps/routes) vs production-only (box-score fraud). */
  readonly roleSignal: "silent_breakout" | "box_score_fraud" | "aligned" | "neutral";
  /** Tradability of the underlying edge, from assessTradability. */
  readonly tradabilityStatus: string;
  readonly marketAlreadyCaughtUp: boolean;
  /** Ghost resemblance to a prior failure, from assessAgainstGhosts. */
  readonly ghostMaxPenalty: number;
  readonly ghostSuppressed: boolean;
  readonly rightsClearedForPublic: boolean;
  readonly cardText: string;
  readonly requestedStrength: MaxPermittedStrength;
  readonly permittedStrength: MaxPermittedStrength;
}

const CERTAINTY_GUARD = ["guaranteed", "lock", "sure thing", "risk-free", "can't lose", "cannot lose", "easy money"];

export function prosecuteCard(i: ProsecutionInput): CardProsecutionTrace {
  const results: ProsecutorResult[] = [];

  // Data prosecutor.
  results.push(
    !i.hasCreditableFacts
      ? r("Data", "Theorist+Statistician", "FAIL", "No facts were knowable in time — nothing to stand on.", "INFO_ONLY", "no creditable facts")
      : i.anyRequiredRightsBlocked
        ? r("Data", "Theorist+Statistician", "WARN", "A required fact is rights-blocked — we can watch but not assert it publicly.", "WATCH", "required fact rights-blocked")
        : r("Data", "Theorist+Statistician", "PASS", "Facts are legal, timely, and source-clean.", "PUBLIC_ACTION", null),
  );

  // Causality prosecutor.
  results.push(
    i.roleSignal === "box_score_fraud"
      ? r("Causality", "Theorist+Historian", "FAIL", "The box score popped but the underlying role did not — likely variance, not cause.", "INFO_ONLY", "production without role (box-score fraud)")
      : i.roleSignal === "silent_breakout" || i.roleSignal === "aligned"
        ? r("Causality", "Theorist+Historian", "PASS", "A real role driver underlies the change — cause, not co-movement.", "PUBLIC_ACTION", null)
        : r("Causality", "Theorist+Historian", "WARN", "The causal link is mild — monitor before leaning on it.", "WAIT", "weak causal link"),
  );

  // Market/Fantasy prosecutor.
  results.push(
    i.tradabilityStatus === "FRICTION_KILLED" || i.tradabilityStatus === "DATA_QUALITY_FAIL"
      ? r("MarketFantasy", "Economist", "FAIL", "After real-world friction there is nothing left to act on.", "INFO_ONLY", `tradability ${i.tradabilityStatus}`)
      : i.marketAlreadyCaughtUp
        ? r("MarketFantasy", "Economist", "WARN", "The market is already catching up — the best number may be gone.", "WATCH", "market partially caught up")
        : r("MarketFantasy", "Economist", "PASS", "The market has not fully absorbed this yet.", "PUBLIC_ACTION", null),
  );

  // Ghost prosecutor.
  results.push(
    i.ghostSuppressed
      ? r("Ghost", "Historian", "FAIL", "This strongly resembles a trap we've been burned by before.", "INFO_ONLY", "ghost-suppressed (resembles a known trap)")
      : i.ghostMaxPenalty >= 0.25
        ? r("Ghost", "Historian", "WARN", "This rhymes with a past trap — treat with extra care.", "WATCH", `ghost resemblance ${i.ghostMaxPenalty}`)
        : r("Ghost", "Historian", "PASS", "No disqualifying resemblance to a known dead edge.", "PUBLIC_ACTION", null),
  );

  // Product prosecutor.
  const text = i.cardText.toLowerCase();
  const certaintyHit = CERTAINTY_GUARD.find((p) => new RegExp(`\\b${p}\\b`).test(text)) ?? null;
  results.push(
    certaintyHit
      ? r("Product", "TrustOfficer", "FAIL", "Copy implies certainty — never permitted.", "INFO_ONLY", `certainty language: "${certaintyHit}"`)
      : !i.rightsClearedForPublic
        ? r("Product", "TrustOfficer", "WARN", "Rights aren't cleared for a public claim — keep it personalized/watch.", "PERSONALIZED", "rights not cleared for public")
        : rankGt(i.requestedStrength, i.permittedStrength)
          ? r("Product", "TrustOfficer", "WARN", "The headline is stronger than the evidence licenses — downgrade.", i.permittedStrength, "requested strength exceeds permitted")
          : r("Product", "TrustOfficer", "PASS", "Clear, honest, and within what the evidence licenses.", "PUBLIC_ACTION", null),
  );

  const strengthCap = results.reduce<MaxPermittedStrength>((acc, x) => strengthMin(acc, x.strengthCap), "PUBLIC_ACTION");
  return {
    verdicts: results,
    anyFail: results.some((x) => x.verdict === "FAIL"),
    anyWarn: results.some((x) => x.verdict === "WARN"),
    strengthCap,
    downgradeReasons: results.map((x) => x.downgradeReason).filter((x): x is string => x !== null),
  };
}

function r(
  prosecutor: ProsecutorName,
  councilRole: string,
  verdict: ProsecutorVerdict,
  publicSafeNote: string,
  strengthCap: MaxPermittedStrength,
  downgradeReason: string | null,
): ProsecutorResult {
  return { prosecutor, councilRole, verdict, publicSafeNote, strengthCap, downgradeReason };
}

const ORDER: Record<MaxPermittedStrength, number> = {
  INFO_ONLY: 0, WATCH: 1, WAIT: 2, PERSONALIZED: 3, ACTION: 4, PUBLIC_ACTION: 5,
};
function rankGt(a: MaxPermittedStrength, b: MaxPermittedStrength): boolean {
  return ORDER[a] > ORDER[b];
}
