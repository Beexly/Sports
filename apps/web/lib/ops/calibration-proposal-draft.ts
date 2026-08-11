/**
 * Builds a CalibrationProposal DRAFT from settled shadow signals.
 *
 * Pure: no DB, no filesystem, no clock (the caller supplies `generatedAt`). The
 * DB read and the CLI live in scripts/ops/generate-calibration-proposal.ts, the
 * same split `compare-shadow-vs-live.ts` already uses over `shadow-vs-live-report.ts`.
 *
 * WHAT THIS PRODUCES IS NOT EVIDENCE. `scripts/guardrails/model-freeze.mjs`
 * accepts a MODEL_VERSION bump only against an IMPLEMENTED CalibrationProposal —
 * a seed.ts row or a docs/calibration-proposals/*.md file. This builder only ever
 * emits `status: OPEN`, and `assertCannotSatisfyModelFreeze` (below) enforces that
 * the rendered markdown can never trip the guardrail's detector even by accident.
 * Deciding a draft has become real evidence is a human step, on purpose.
 */

import {
  buildShadowVsLiveReport,
  renderShadowVsLiveMarkdown,
  MIN_COMPARISON_SAMPLE,
  BRIER_TIE_BAND,
  type ShadowVsLiveReport,
} from "./shadow-vs-live-report";
import type { SettledShadowRow } from "./shadow-signal-store";

/**
 * A MODEL_VERSION-freeze claim is stronger than "this is not noise": it
 * retroactively re-labels every historical confidence number as having come from
 * this model. MIN_COMPARISON_SAMPLE (20) only guards against reporting noise as a
 * verdict; this matches the n>=100 bar `wouldPassBrierFloor` already applies in
 * apps/web/lib/calibration/ranking-power-control.ts.
 */
export const PROPOSAL_MIN_N = 100;

/**
 * The EXACT detector `scripts/guardrails/model-freeze.mjs` uses in hasDocProposal().
 * Duplicated here deliberately so this module can prove its own output is inert
 * against it. Must stay in sync with that script.
 *
 * It matches anywhere in the file — it does not parse front-matter — so ordinary
 * prose like "promoted to status: IMPLEMENTED" inside an OPEN draft is enough to
 * make the guardrail accept that draft as a satisfied freeze. That is precisely
 * the failure this constant exists to make unrepresentable.
 */
const MODEL_FREEZE_IMPLEMENTED_PATTERN = /status\s*:\s*["']?IMPLEMENTED["']?/i;

export interface CalibrationProposalRow extends SettledShadowRow {
  readonly settledAt?: Date | null;
}

/** Each condition is independently checkable; `meetsAutomatedFloor` is their conjunction. */
export interface CalibrationProposalValidity {
  /** comparedGames >= MIN_COMPARISON_SAMPLE — below this a verdict is noise. */
  readonly meetsComparisonFloor: boolean;
  /** comparedGames >= PROPOSAL_MIN_N — the load-bearing floor for a freeze claim. */
  readonly meetsProposalSample: boolean;
  /** verdict === "shadow-better"; live-better/tied is not evidence FOR a bump. */
  readonly shadowBetter: boolean;
  /** Brier advantage strictly outside the tie band — a real gap, not band noise. */
  readonly realAdvantage: boolean;
  /** Beating the live engine while losing to the market is not an edge. */
  readonly beatsMarket: boolean;
  /** Every compared row carries the model version under consideration. */
  readonly noCrossVersionContamination: boolean;
  /**
   * Conjunction of the six machine-checkable conditions ONLY. Human review and
   * repeat-window confirmation are deliberately excluded — they cannot be
   * automated, so a true value here never means "ready to promote".
   */
  readonly meetsAutomatedFloor: boolean;
}

export interface CalibrationProposalDraft {
  readonly modelVersion: string;
  readonly requestedN: number;
  /** Rows fetched, across all model versions. */
  readonly fetchedRows: number;
  /** Rows carrying `modelVersion` — the only ones scored. */
  readonly currentVersionRows: number;
  /** Rows dropped because they came from a different model version. */
  readonly excludedOtherVersionRows: number;
  readonly versionBreakdown: readonly { readonly version: string; readonly count: number }[];
  readonly report: ShadowVsLiveReport;
  readonly validity: CalibrationProposalValidity;
  readonly markdown: string;
}

/**
 * Throws if `markdown` would register as IMPLEMENTED evidence with the model-freeze
 * guardrail. Called on every render: a draft that can green the guardrail is worse
 * than no draft at all, so this fails loudly rather than emitting one.
 */
export function assertCannotSatisfyModelFreeze(markdown: string): void {
  const match = markdown.match(MODEL_FREEZE_IMPLEMENTED_PATTERN);
  if (match !== null) {
    throw new Error(
      "[calibration-proposal-draft] refusing to emit: the rendered draft contains " +
        `${JSON.stringify(match[0])}, which scripts/guardrails/model-freeze.mjs would ` +
        "read as IMPLEMENTED evidence. An OPEN draft that can satisfy the freeze guardrail " +
        "defeats the guardrail. Reword the offending text.",
    );
  }
}

function tallyVersions(
  rows: readonly CalibrationProposalRow[],
): readonly { readonly version: string; readonly count: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.modelVersion, (counts.get(r.modelVersion) ?? 0) + 1);
  return [...counts.entries()]
    .map(([version, count]) => ({ version, count }))
    .sort((a, b) => b.count - a.count || a.version.localeCompare(b.version));
}

function evaluateValidity(
  report: ShadowVsLiveReport,
  excludedOtherVersionRows: number,
): CalibrationProposalValidity {
  const meetsComparisonFloor = report.comparedGames >= MIN_COMPARISON_SAMPLE;
  const meetsProposalSample = report.comparedGames >= PROPOSAL_MIN_N;
  const shadowBetter = report.verdict === "shadow-better";
  const realAdvantage = report.brierAdvantage !== null && report.brierAdvantage > BRIER_TIE_BAND;
  const beatsMarket =
    report.shadow !== null && report.market !== null && report.shadow.brier < report.market.brier;
  const noCrossVersionContamination = excludedOtherVersionRows === 0;

  return {
    meetsComparisonFloor,
    meetsProposalSample,
    shadowBetter,
    realAdvantage,
    beatsMarket,
    noCrossVersionContamination,
    meetsAutomatedFloor:
      meetsComparisonFloor &&
      meetsProposalSample &&
      shadowBetter &&
      realAdvantage &&
      beatsMarket &&
      noCrossVersionContamination,
  };
}

function box(checked: boolean): string {
  return checked ? "- [x]" : "- [ ]";
}

function formatDate(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "n/a";
}

/**
 * Note on wording throughout the rendered markdown: the promotion target is
 * described as "an IMPLEMENTED-status record" and never as the literal
 * `status: <IMPLEMENTED>` pairing, because that substring anywhere in the file —
 * even inside prose explaining that this draft is NOT evidence — is enough for
 * the guardrail to accept it. `assertCannotSatisfyModelFreeze` enforces this.
 */
function render(input: {
  readonly modelVersion: string;
  readonly requestedN: number;
  readonly fetchedRows: number;
  readonly currentVersionRows: number;
  readonly excludedOtherVersionRows: number;
  readonly versionBreakdown: readonly { readonly version: string; readonly count: number }[];
  readonly report: ShadowVsLiveReport;
  readonly validity: CalibrationProposalValidity;
  readonly generatedAt: string;
  readonly earliest: Date | null | undefined;
  readonly latest: Date | null | undefined;
}): string {
  const v = input.validity;

  const versionLines =
    input.versionBreakdown.map((e) => `  - ${e.version}: ${e.count} row(s)`).join("\n") ||
    "  - (none — no settled ShadowSignal rows found)";

  const checklist = [
    `${box(v.meetsComparisonFloor)} comparedGames >= ${MIN_COMPARISON_SAMPLE} (statistical floor — below this a verdict is noise, not evidence)`,
    `${box(v.meetsProposalSample)} comparedGames >= ${PROPOSAL_MIN_N} (load-bearing floor for a MODEL_VERSION-freeze claim)`,
    `${box(v.shadowBetter)} verdict is shadow-better (live-better or tied is not evidence FOR the bump)`,
    `${box(v.realAdvantage)} Brier advantage > ${BRIER_TIE_BAND} tie band (a real improvement, not noise inside the band)`,
    `${box(v.beatsMarket)} shadow Brier < market Brier (beats the market baseline — beating the live engine alone is not an edge)`,
    `${box(v.noCrossVersionContamination)} every compared row carries model version ${input.modelVersion} (${input.excludedOtherVersionRows} row(s) from a different version were excluded, not counted)`,
    `- [ ] holds across >= 2 independent weekly compare-shadow-vs-live runs, not just this one snapshot (one window is one observation)`,
    `- [ ] reviewed by a human and promoted into an IMPLEMENTED-status record — in packages/db/prisma/seed.ts or a docs/calibration-proposals entry. This generator never performs that step.`,
  ].join("\n");

  return `---
modelVersion: ${input.modelVersion}
status: OPEN
generatedAt: ${input.generatedAt}
generatedBy: scripts/ops/generate-calibration-proposal.ts (auto-generated DRAFT — not reviewed)
---

# CalibrationProposal (DRAFT) — shadow vs live evidence for ${input.modelVersion}

**This draft is OPEN, not evidence.** \`scripts/guardrails/model-freeze.mjs\` accepts a
MODEL_VERSION bump only against a proposal whose status field reads IMPLEMENTED. This
file is deliberately rendered so it can never register as one: the generator asserts its
own output is inert against the guardrail's detector before emitting it, and refuses to
write into docs/calibration-proposals/ at all. Promotion is a human decision.

## Sample

- Requested last ${input.requestedN} settled ShadowSignal row(s); fetched ${input.fetchedRows}.
- Model versions present in the fetch window:
${versionLines}
- Rows matching model version ${input.modelVersion}: ${input.currentVersionRows}
- Rows excluded as a different model version: ${input.excludedOtherVersionRows} (a different version's shadow performance is not evidence for this version's freeze)
- Date range (scored rows): ${formatDate(input.earliest)} to ${formatDate(input.latest)}

## Evidence

${renderShadowVsLiveMarkdown(input.report)}

## Validity checklist (every box must be checked before this is real evidence)

${checklist}

## Verdict

${
  v.meetsAutomatedFloor
    ? "MEETS the automated validity floor above. Still requires the two unchecked human-review items before promotion — those are not automatable, so a met floor is not approval."
    : "DOES NOT yet meet the automated validity floor above. Accumulate more settled shadow signals on this model version and re-run before proposing a freeze."
}
`;
}

export function buildCalibrationProposalDraft(input: {
  readonly rows: readonly CalibrationProposalRow[];
  readonly modelVersion: string;
  readonly requestedN: number;
  readonly generatedAt: string;
}): CalibrationProposalDraft {
  const scored = input.rows.filter((r) => r.modelVersion === input.modelVersion);
  const excludedOtherVersionRows = input.rows.length - scored.length;
  const report = buildShadowVsLiveReport(scored);
  const validity = evaluateValidity(report, excludedOtherVersionRows);
  const versionBreakdown = tallyVersions(input.rows);

  const markdown = render({
    modelVersion: input.modelVersion,
    requestedN: input.requestedN,
    fetchedRows: input.rows.length,
    currentVersionRows: scored.length,
    excludedOtherVersionRows,
    versionBreakdown,
    report,
    validity,
    generatedAt: input.generatedAt,
    earliest: scored[0]?.settledAt ?? null,
    latest: scored[scored.length - 1]?.settledAt ?? null,
  });

  // Structural, not editorial: a draft that can green the freeze guardrail is a
  // defect regardless of how carefully the prose above was worded.
  assertCannotSatisfyModelFreeze(markdown);

  return {
    modelVersion: input.modelVersion,
    requestedN: input.requestedN,
    fetchedRows: input.rows.length,
    currentVersionRows: scored.length,
    excludedOtherVersionRows,
    versionBreakdown,
    report,
    validity,
    markdown,
  };
}
