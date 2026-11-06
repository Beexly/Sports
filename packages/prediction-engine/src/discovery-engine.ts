/**
 * Nightly discovery engine — the "smarter every night" organ, kept honest.
 *
 * Each night the system re-tests its bounded, pre-registered candidate family
 * (candidate-registry.ts) on newly settled data and decides what — if anything — to
 * PROPOSE to the owner. It never decides anything itself. Two layers of discipline
 * stand between a lucky result and a proposal:
 *   1. Benjamini-Hochberg FDR control across the night's family (multiple-testing.ts).
 *   2. Cross-night confirmation — K consecutive independent discovery nights past a
 *      Bonferroni-over-nights bar (meetsCrossNightConfirmation) — so one lucky night
 *      can never promote noise, and a decayed signal is symmetrically demoted.
 *
 * STRUCTURALLY UNABLE TO FLIP A GATE — this is the load-bearing property:
 *   • The only status a DiscoveryProposal can hold is the LITERAL "PROPOSED". There is
 *     no "IMPLEMENTED"/"APPLIED" value in the type, so an applied artifact is not even
 *     constructible here.
 *   • This module exports proposal PRODUCERS only. There is no apply()/implement()/
 *     write() function, and it imports no gate-writer. The owner is the sole actor who
 *     can act on a proposal, downstream, by hand.
 *   • assertAllProposed() is a runtime backstop the worker and CI guardrail call.
 *
 * Pure and deterministic — no I/O, no Date, no RNG — so every night's proposals are
 * replayable from the same inputs.
 */

import { benjaminiHochberg, meetsCrossNightConfirmation } from "./multiple-testing.js";
import type {
  BenjaminiHochbergSummary,
  NightlyObservation,
  CrossNightOptions,
} from "./multiple-testing.js";

/** A single candidate's test result from THIS night's settled-data backtest. */
export interface CandidateNightResult {
  /** Candidate id (must exist in the registry). */
  readonly id: string;
  /** Two-sided p-value from the leakage-safe walk-forward + Clark-West test, in [0,1]. */
  readonly pValue: number;
  /** Signed effect size (e.g. cover rate − break-even, or Δ-MAE). Sign = direction. */
  readonly effectSize: number;
  /** Out-of-sample observations behind this result. Under-sampled candidates are excluded. */
  readonly sampleSize: number;
}

/** The ONLY status a proposal can carry. A literal type — applied artifacts are unconstructible. */
export type DiscoveryProposalStatus = "PROPOSED";

export type DiscoveryProposalKind = "PROMOTE" | "DEMOTE" | "RECALIBRATE";

export interface DiscoveryProposalEvidence {
  readonly pValue: number;
  readonly qValue: number | null;
  readonly effectSize: number;
  readonly sampleSize: number;
  readonly consecutiveDiscoveryNights: number;
  readonly nightsTested: number;
  readonly bonferroniBar: number;
}

export interface DiscoveryProposal {
  readonly candidateId: string;
  readonly kind: DiscoveryProposalKind;
  /** Always the literal "PROPOSED" — see module header. */
  readonly status: DiscoveryProposalStatus;
  readonly rationale: string;
  readonly evidence: DiscoveryProposalEvidence;
}

/** Construct a proposal. The status is fixed at "PROPOSED" — callers cannot override it. */
function proposed(
  candidateId: string,
  kind: DiscoveryProposalKind,
  rationale: string,
  evidence: DiscoveryProposalEvidence,
): DiscoveryProposal {
  return { candidateId, kind, status: "PROPOSED", rationale, evidence };
}

export interface DiscoveryNightInput {
  /** This night's per-candidate results. */
  readonly results: readonly CandidateNightResult[];
  /** Each candidate's prior nightly observations, oldest→newest (excludes tonight). */
  readonly history: Readonly<Record<string, readonly NightlyObservation[]>>;
  /** Candidates currently promoted/live — eligible for DEMOTE on decay. */
  readonly currentlyPromoted?: readonly string[];
  /** Target FDR for the night's family. Default 0.10. */
  readonly q?: number;
  /** Minimum OOS sample to be admitted to the FDR family. Default 100. */
  readonly minSample?: number;
  /** Cross-night confirmation options (consecutive nights, alpha). */
  readonly crossNight?: CrossNightOptions;
  /** Consecutive non-discovery nights that trigger a DEMOTE proposal. Default 3. */
  readonly demoteAfterMisses?: number;
  /** Optional drift signal → emits a single RECALIBRATE proposal (never applies it). */
  readonly recalibration?: { readonly drifted: boolean; readonly note: string };
}

export interface DiscoveryNightReport {
  /** Candidates admitted to tonight's FDR family (sample-adequate). */
  readonly familyTested: number;
  /** Candidates excluded for thin sample. */
  readonly underSampled: number;
  /** Tonight's BH-FDR summary over the tested family. */
  readonly fdr: BenjaminiHochbergSummary;
  /** Proposals to surface to the owner — ALL status "PROPOSED". */
  readonly proposals: readonly DiscoveryProposal[];
  /** Each candidate's history with tonight appended (for the next night's run). */
  readonly updatedHistory: Readonly<Record<string, NightlyObservation[]>>;
}

/** Count trailing non-discovery nights (most recent first). */
function trailingMisses(history: readonly NightlyObservation[]): number {
  let misses = 0;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i]!.discovery) break;
    misses += 1;
  }
  return misses;
}

/**
 * Run one discovery night: FDR over tonight's adequately-sampled family, then per
 * candidate decide whether to PROPOSE a promotion (cross-night confirmed), a demotion
 * (a live candidate that has decayed), or nothing. Optionally append one RECALIBRATE
 * proposal from a drift signal. Returns proposals (all "PROPOSED") and the updated
 * cross-night history. Applies NOTHING.
 */
export function runDiscoveryNight(input: DiscoveryNightInput): DiscoveryNightReport {
  const q = input.q ?? 0.1;
  const minSample = input.minSample ?? 100;
  const demoteAfterMisses = input.demoteAfterMisses ?? 3;
  const promotedSet = new Set(input.currentlyPromoted ?? []);

  const tested = input.results.filter((r) => r.sampleSize >= minSample);
  const underSampled = input.results.length - tested.length;

  const fdr = benjaminiHochberg(
    tested.map((r) => ({ key: r.id, pValue: r.pValue })),
    q,
  );
  const fdrByKey = new Map(fdr.results.map((r) => [r.key, r]));

  const proposals: DiscoveryProposal[] = [];
  const updatedHistory: Record<string, NightlyObservation[]> = {};

  // Seed updatedHistory from prior history for ALL candidates we know about.
  const allIds = new Set<string>([
    ...input.results.map((r) => r.id),
    ...Object.keys(input.history),
  ]);
  for (const id of allIds) updatedHistory[id] = [...(input.history[id] ?? [])];

  for (const r of input.results) {
    const disc = fdrByKey.get(r.id);
    const isDiscovery = disc?.discovery ?? false; // under-sampled ⇒ not a discovery tonight
    // Append tonight's observation to this candidate's history.
    updatedHistory[r.id] = [
      ...(updatedHistory[r.id] ?? []),
      { pValue: r.pValue, discovery: isDiscovery },
    ];

    const conf = meetsCrossNightConfirmation(updatedHistory[r.id]!, input.crossNight);
    const evidence: DiscoveryProposalEvidence = {
      pValue: r.pValue,
      qValue: disc?.qValue ?? null,
      effectSize: r.effectSize,
      sampleSize: r.sampleSize,
      consecutiveDiscoveryNights: conf.consecutiveDiscoveries,
      nightsTested: conf.nightsTested,
      bonferroniBar: conf.bonferroniBar,
    };

    // PROMOTE: cross-night confirmed, a real effect, and not already promoted.
    if (conf.confirmed && r.effectSize > 0 && !promotedSet.has(r.id)) {
      proposals.push(
        proposed(
          r.id,
          "PROMOTE",
          `Confirmed across ${conf.consecutiveDiscoveries} consecutive discovery nights ` +
            `(best streak p=${conf.bestStreakPValue.toExponential(2)} ≤ Bonferroni bar ` +
            `${conf.bonferroniBar.toExponential(2)}); effect ${r.effectSize.toFixed(4)}, n=${r.sampleSize}.`,
          evidence,
        ),
      );
      continue;
    }

    // DEMOTE: a live candidate whose signal has decayed (consecutive misses).
    if (promotedSet.has(r.id) && trailingMisses(updatedHistory[r.id]!) >= demoteAfterMisses) {
      proposals.push(
        proposed(
          r.id,
          "DEMOTE",
          `Live signal decayed: ${trailingMisses(updatedHistory[r.id]!)} consecutive non-discovery ` +
            `nights (≥ ${demoteAfterMisses}). Propose demotion to shadow.`,
          evidence,
        ),
      );
    }
  }

  if (input.recalibration?.drifted) {
    proposals.push(
      proposed(
        "__calibration__",
        "RECALIBRATE",
        `Calibration drift detected: ${input.recalibration.note}. Propose an out-of-fold isotonic refit (owner-applied).`,
        {
          pValue: 1,
          qValue: null,
          effectSize: 0,
          sampleSize: 0,
          consecutiveDiscoveryNights: 0,
          nightsTested: 0,
          bonferroniBar: 0,
        },
      ),
    );
  }

  return {
    familyTested: tested.length,
    underSampled,
    fdr,
    proposals,
    updatedHistory,
  };
}

/**
 * Runtime backstop: assert every proposal is "PROPOSED". The type already makes any
 * other value unconstructible inside this module; this catches a proposal that was
 * tampered with after the fact (e.g. hand-edited JSON) before it reaches the owner or CI.
 */
export function assertAllProposed(proposals: readonly DiscoveryProposal[]): void {
  for (const p of proposals) {
    if (p.status !== "PROPOSED") {
      throw new Error(
        `Discovery emitted a non-PROPOSED artifact (candidate "${p.candidateId}", status "${String(
          p.status,
        )}"). The discovery loop may never apply a change — the owner alone flips a gate.`,
      );
    }
  }
}
