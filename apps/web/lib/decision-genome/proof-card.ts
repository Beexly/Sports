/**
 * ProofCardEngine — turn resolved decisions into DRAFT, human-gated proof cards.
 *
 * Decision Genome build step H. Proof outcomes (beat-close CLV, a graded saved-loss, a
 * correct refusal) are the only honest marketing GSE has. This engine renders them as
 * proof cards — but every card is born `status: "draft"` and `publishable: false`, scanned
 * for banned/overclaiming language via the single source of truth (`scanForBannedPhrases`),
 * and only a human gate can move it toward publish. No card auto-publishes. No fabricated
 * numbers: a card can only be built from a settled genome.
 *
 * Composition: banned-phrase enforcement reuses `@/lib/trust-claims`. Pure, no I/O.
 */

import { scanForBannedPhrases } from "@/lib/trust-claims";
import type { DecisionGenome } from "./decision-genome";

export type ProofCardKind = "beat-close" | "saved-loss" | "correct-refusal" | "calibration";

export type ProofCardStatus = "draft";

export interface ProofCardDraft {
  readonly genomeId: string;
  readonly kind: ProofCardKind;
  readonly headline: string;
  readonly body: string;
  /** Always "draft" — there is no publishable status in this module by design. */
  readonly status: ProofCardStatus;
  /** Always false here; only an explicit human gate downstream may flip publishability. */
  readonly publishable: false;
  /** Banned-phrase hits found in the rendered copy (must be empty before any human gate). */
  readonly languageFlags: readonly string[];
  /** Why the card could not be built, when applicable. */
  readonly blockedReason?: string;
}

export interface ProofCardResult {
  readonly ok: boolean;
  readonly card: ProofCardDraft | null;
  readonly reason: string;
}

/**
 * Build a draft proof card from a SETTLED genome. Returns ok=false (no card) when the
 * decision has not settled, when there is no proof-worthy outcome, or when the copy trips
 * the banned-phrase scanner. Never returns a publishable card.
 */
export function buildProofCard(genome: DecisionGenome): ProofCardResult {
  if (!genome.proof.proofCardEligible) {
    return { ok: false, card: null, reason: "Genome is not marked proof-card eligible." };
  }
  const settled = genome.proof.clv != null || genome.proof.brier != null || genome.proof.savedLoss != null;
  if (!settled) {
    return { ok: false, card: null, reason: "Decision has not settled, so there is no proof to show (no fabricated numbers)." };
  }

  const drafted = draftCopy(genome);
  if (!drafted) {
    return { ok: false, card: null, reason: "No proof-worthy outcome on this genome." };
  }

  const hits = scanForBannedPhrases(`${drafted.headline}\n${drafted.body}`);
  const languageFlags = [...new Set(hits.map((h) => h.phrase))];

  const card: ProofCardDraft = {
    genomeId: genome.id,
    kind: drafted.kind,
    headline: drafted.headline,
    body: drafted.body,
    status: "draft",
    publishable: false,
    languageFlags,
    ...(languageFlags.length > 0 ? { blockedReason: `Banned phrase(s): ${languageFlags.join(", ")}.` } : {}),
  };

  return {
    ok: languageFlags.length === 0,
    card,
    reason: languageFlags.length === 0 ? "Draft proof card ready for human review." : "Copy tripped the banned-phrase scanner.",
  };
}

interface DraftedCopy {
  readonly kind: ProofCardKind;
  readonly headline: string;
  readonly body: string;
}

/** Choose the most defensible proof story for the genome. Numbers come only from `proof`. */
function draftCopy(g: DecisionGenome): DraftedCopy | null {
  const p = g.proof;
  if (p.clv != null && p.clv > 0) {
    return {
      kind: "beat-close",
      headline: "Beat the closing line",
      body: `On a model-version ${g.model.modelVersion} decision, the price moved our way by ${(p.clv * 100).toFixed(1)}% vs the close. Measured, not claimed.`,
    };
  }
  if (p.savedLoss != null && p.savedLoss > 0 && (g.decisionType === "pass" || g.decisionType === "suppress" || g.aperture === "pass")) {
    return {
      kind: "saved-loss",
      headline: "The pass that protected the bankroll",
      body: `We declined this one. After it resolved, acting would have cost ${p.savedLoss.toFixed(2)} units. Restraint, graded.`,
    };
  }
  if (g.model.refused && p.savedLoss != null && p.savedLoss >= 0) {
    return {
      kind: "correct-refusal",
      headline: "We refused, and that was right",
      body: `Uncertainty was too wide to act (calibration health ${g.model.calibrationHealth.toFixed(2)}). The refusal held up after the outcome.`,
    };
  }
  return null;
}
