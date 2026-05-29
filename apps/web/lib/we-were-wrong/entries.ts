/**
 * Public model-autopsy entries — what Galaxy got wrong.
 *
 * These are editorial entries reflecting on specific calls or periods
 * where the model produced wrong reads or the methodology fell short.
 * Append-only by editorial process; new entries land at the top.
 *
 * Constitution: honest retrospective is the trust deposit. The first
 * three entries below reflect bootstrap-period decisions and known
 * methodology limits — written before any canonical data accumulates.
 * As canonical history settles, future entries will reflect specific
 * settled losses and calibration drift.
 */

export type ModelAutopsyKind = "methodology" | "calibration" | "single-call" | "version-bump";

export interface ModelAutopsyEntry {
  readonly id: string;
  readonly publishedAt: string;
  readonly kind: ModelAutopsyKind;
  readonly headline: string;
  readonly whatWeSaid: string;
  readonly whatActuallyHappened: string;
  readonly whatWeChanged: string;
}

export const MODEL_AUTOPSY_ENTRIES: ReadonlyArray<ModelAutopsyEntry> = [
  {
    id: "wwr-003-publish-gate-too-loose-bootstrap",
    publishedAt: "2026-05-29",
    kind: "methodology",
    headline: "We let bootstrap mode label too much as 'evaluating.'",
    whatWeSaid:
      "During bootstrap mode (before the live odds feed connects), the board surfaced 'evaluating' for many games that the model could not meaningfully score. The framing implied the model was working in real time.",
    whatActuallyHappened:
      "Without a live feed, the model is not evaluating — it is waiting. 'Evaluating' overstated the work being done and could mislead a visitor about the system's state.",
    whatWeChanged:
      "Bootstrap mode now surfaces 'Bootstrap mode — live odds unavailable. Treat as illustrative.' on every board state. The Model Pulse surface (C69) returns honest empty counters when no live data has landed.",
  },
  {
    id: "wwr-002-calibration-gate-was-vague",
    publishedAt: "2026-05-29",
    kind: "calibration",
    headline: "Our calibration page said 'collecting' instead of showing the count.",
    whatWeSaid:
      "The /performance page returned 'Building calibration history from settled canonical picks' when the canonical history was empty. The copy was honest but vague — visitors could not tell what 'building' meant.",
    whatActuallyHappened:
      "Vague status copy is its own form of hedging. A visitor cannot decide whether to trust the system without a concrete number.",
    whatWeChanged:
      "C62 ships the accumulation report: '18 of 30 settled in 70-79 bucket — accumulating.' Concrete counts replace vague status. The methodology page also gained a 'what we publish vs. what we cannot publish yet' callout (C62).",
  },
  {
    id: "wwr-001-evidence-row-was-decorative",
    publishedAt: "2026-05-29",
    kind: "methodology",
    headline: "PickCard and FullPickCard had hard-coded 'Galaxy model' source labels.",
    whatWeSaid:
      "Pick cards displayed 'Galaxy model' as a source label that did not vary with the actual data freshness. The evidence chain standard was a document, not a primitive.",
    whatActuallyHappened:
      "Trust labels that do not move with the data are decoration, not evidence. Worse, they trained users to ignore source labels.",
    whatWeChanged:
      "C45 introduced the shared PickEvidenceSection primitive backed by SourceFreshnessLabel. The evidence row now reflects actual freshness and the failureCase is mandatory on picks. Two truth systems collapsed into one.",
  },
];
