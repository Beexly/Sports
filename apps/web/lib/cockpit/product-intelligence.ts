/**
 * Owner Product-Intelligence view-model (fixtures, Prisma-free).
 *
 * The cockpit panel that lets the operator see the organism thinking about ITSELF: the FDR-disciplined
 * Conscience (which of seven intelligences are genuinely improving, post-Benjamini-Hochberg), the
 * Galileo-Week acquisition signal (what to buy / stop buying), and scar utility (a bad-process card
 * becomes a remembered ghost; an unlucky loss teaches nothing). Pure derivation over package fixtures —
 * no DB, no network, no keys, no spend. Internal engine names are allowed here (owner-only surface).
 */

import {
  buildIntelligenceLedger,
  runProductIntelligenceLoop,
  settledTrapCard,
  settledUnluckyCard,
  type IntelligenceLedgerReport,
  type LoopAction,
  type SettledCard,
} from "@sports/decision-factory";
import {
  runGalileoWeek,
  GALILEO_WEEK_FIXTURE,
  type WeekIntelligenceAtlas,
} from "@sports/galileo-week";

/** One process-over-outcome example: did this settled card teach us anything? */
export interface ScarExample {
  readonly label: string;
  readonly subject: string;
  readonly verdict: string;
  readonly emitsLesson: boolean;
  readonly loopAction: LoopAction;
  readonly note: string;
}

/** Everything the owner panel renders, derived deterministically from fixtures. */
export interface ProductIntelligenceView {
  readonly ledger: IntelligenceLedgerReport;
  readonly atlas: WeekIntelligenceAtlas;
  readonly scar: readonly ScarExample[];
}

/** Run one settled card through the learning loop and label what it taught (or didn't). */
function toScar(label: string, card: SettledCard): ScarExample {
  const outcome = runProductIntelligenceLoop(card);
  return {
    label,
    subject: card.subject,
    verdict: outcome.verdict,
    emitsLesson: outcome.emitsLesson,
    loopAction: outcome.loopAction,
    note: outcome.note,
  };
}

/**
 * Build the owner Product-Intelligence view: the Conscience ledger (FDR-disciplined improvement),
 * the Galileo-Week atlas preview (acquisition demand/supply), and two scar-utility examples. All
 * deterministic over fixtures — safe to render with no live data, no keys, and no spend.
 */
export function getProductIntelligence(): ProductIntelligenceView {
  const ledger = buildIntelligenceLedger(GALILEO_WEEK_FIXTURE.ledgerSamples);
  const atlas = runGalileoWeek({ mode: "PREVIEW_FIXTURES", week: GALILEO_WEEK_FIXTURE });
  const scar: readonly ScarExample[] = [
    toScar("Trap avoided — unsound process, bad outcome", settledTrapCard),
    toScar("Loss we did not overreact to — sound process, variance", settledUnluckyCard),
  ];
  return { ledger, atlas, scar };
}
