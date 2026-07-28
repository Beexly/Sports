/**
 * Thin, deterministic Edge Lab council — the orchestrator stub promised by
 * agent-roles.ts's header comment and docs/ops/UQ_HANDOFF_2026-07-24.md §3.
 *
 * WHAT THIS IS: a rule-based reference implementation of `EdgeLabCouncil`
 * wired to REAL signals already computed elsewhere in this package (CVAP/IVAP
 * multiprobability width and lower endpoint, Mondrian taxonomy category,
 * MIN_STRATUM_CALIBRATION). It runs ONE deterministic round: every agent
 * evaluates the same context once (no simulated back-and-forth), and the
 * Decision Agent synthesizes a `DebateSummary` from their opinions.
 *
 * WHAT THIS IS NOT:
 *   - Not an LLM debate. Every agent here is a pure function of `EdgeLabContext`.
 *     A future LLM-backed agent implements the same `EdgeLabAgent` interface
 *     and can be dropped into `agents` unchanged — that is the whole point of
 *     keeping the interface behind a clear contract (handoff §3.4).
 *   - Not a production firing decision. `selective-gate.ts`'s `applySelectiveGate`
 *     remains the sole FIRE/NO_BET authority (binding law, repeated across every
 *     handoff this session received). This council's `finalDecision` is a
 *     RESEARCH/DIAGNOSTIC synthesis for Edge Lab debate review, never a bypass.
 *   - Not a ledger writer. `DebateSummary.ledgerCommitmentHint` is a free-text
 *     hint field only; this module never calls into ledger-chain.ts or
 *     pedersen-ledger.ts. Building a production persistence path for Edge Lab
 *     output is exactly the kind of bridge docs/ops/PRODUCT_CASCADE_MAP.md's
 *     "Ledger multiprob persistence is BLOCKED" item warns against inventing
 *     ahead of a real writer.
 *
 * Pure functions / a pure class with no mutable module state. Safe to call
 * repeatedly and concurrently.
 */

import {
  type AgentOpinion,
  type DebateRound,
  type DebateSummary,
  type EdgeLabAgent,
  type EdgeLabAgentRole,
  type EdgeLabContext,
  type EdgeLabCouncil,
  staticOpinion,
} from "./agent-roles.js";
import { MIN_STRATUM_CALIBRATION } from "./selective-gate.js";

/**
 * Default maximum acceptable multiprobability width before the Risk/Honesty
 * Guardian flags a context as too uncertain to debate further. This is a
 * DIAGNOSTIC default for Edge Lab review, distinct from and NOT a substitute
 * for selective-gate.ts's `maxWidthForFire`, which the caller sets explicitly
 * per production deployment. 0.15 (15 points of multiprobability spread) is
 * chosen to be conservative — roughly triple the width a well-calibrated,
 * well-populated stratum should show — not tuned against any outcome data.
 */
export const DEFAULT_MAX_GUARDIAN_WIDTH = 0.15;

/** Market Microstructure Analyst — reads the raw market-vs-model gap. */
export function marketMicrostructureAnalyst(): EdgeLabAgent {
  return {
    role: "market_microstructure",
    evaluate(ctx: EdgeLabContext): AgentOpinion {
      if (ctx.marketImpliedProb === undefined || ctx.modelScore === undefined) {
        return staticOpinion(
          "market_microstructure",
          "abstain",
          "no market-implied probability and/or model score supplied",
          0,
        );
      }
      const gap = ctx.modelScore - ctx.marketImpliedProb;
      const confidence = Math.min(1, Math.abs(gap) * 4);
      if (gap > 0.01) {
        return staticOpinion(
          "market_microstructure",
          "support",
          `model score (${ctx.modelScore.toFixed(3)}) exceeds market-implied probability ` +
            `(${ctx.marketImpliedProb.toFixed(3)}) by ${gap.toFixed(3)}`,
          confidence,
          { metrics: { gap } },
        );
      }
      if (gap < -0.01) {
        return staticOpinion(
          "market_microstructure",
          "oppose",
          `model score (${ctx.modelScore.toFixed(3)}) trails market-implied probability ` +
            `(${ctx.marketImpliedProb.toFixed(3)}) by ${Math.abs(gap).toFixed(3)}`,
          confidence,
          { metrics: { gap } },
        );
      }
      return staticOpinion(
        "market_microstructure",
        "abstain",
        "model and market are within noise of each other",
        0.1,
        { metrics: { gap } },
      );
    },
  };
}

/** Feature Analyst — flags when the context arrives with no real feature evidence. */
export function featureAnalyst(): EdgeLabAgent {
  return {
    role: "feature_analyst",
    evaluate(ctx: EdgeLabContext): AgentOpinion {
      const featureCount = ctx.features ? Object.keys(ctx.features).length : 0;
      if (featureCount === 0) {
        return staticOpinion(
          "feature_analyst",
          "flag",
          "no feature evidence attached to this context",
          0.5,
          { noBetSignal: false },
        );
      }
      return staticOpinion(
        "feature_analyst",
        "support",
        `${featureCount} feature(s) attached`,
        Math.min(1, featureCount / 10),
        { metrics: { featureCount } },
      );
    },
  };
}

/**
 * Placebo Analyst — reports what `ctx.placeboSurvived` says, and is explicit
 * that "undefined" means untested, not passed. Never fabricates a result.
 */
export function placeboAnalyst(): EdgeLabAgent {
  return {
    role: "placebo_analyst",
    evaluate(ctx: EdgeLabContext): AgentOpinion {
      if (ctx.placeboSurvived === undefined) {
        return staticOpinion(
          "placebo_analyst",
          "flag",
          "no placebo (label-shuffle) check has been run for this signal — untested, not passed",
          0.3,
        );
      }
      if (ctx.placeboSurvived) {
        return staticOpinion(
          "placebo_analyst",
          "support",
          "signal survived the placebo (label-shuffle) check",
          0.7,
        );
      }
      return staticOpinion(
        "placebo_analyst",
        "oppose",
        "signal FAILED the placebo (label-shuffle) check — indistinguishable from noise",
        1,
        { noBetSignal: true },
      );
    },
  };
}

/**
 * Calibration Analyst — the primary honesty signal. Reads the multiprobability
 * lower endpoint against the market-implied probability, exactly the quantity
 * `applySelectiveGate` uses for `lcbEdge`, so this analyst's opinion tracks
 * (without duplicating) the production firing logic's own reasoning.
 */
export function calibrationAnalyst(): EdgeLabAgent {
  return {
    role: "calibration_analyst",
    evaluate(ctx: EdgeLabContext): AgentOpinion {
      if (!ctx.multiprob) {
        return staticOpinion(
          "calibration_analyst",
          "abstain",
          "no calibrated multiprobability interval supplied",
          0,
        );
      }
      const { p0, p1, width } = ctx.multiprob;
      const lower = Math.min(p0, p1);
      const upper = Math.max(p0, p1);
      const market = ctx.marketImpliedProb;
      if (market === undefined) {
        return staticOpinion(
          "calibration_analyst",
          "abstain",
          `interval [${lower.toFixed(3)}, ${upper.toFixed(3)}] (width ${width.toFixed(3)}) ` +
            "computed but no market-implied probability to compare against",
          0,
          { metrics: { lower, upper, width } },
        );
      }
      const lcbEdge = lower - market;
      const confidence = Math.min(1, Math.max(0, lcbEdge) * 10);
      if (lcbEdge > 0) {
        return staticOpinion(
          "calibration_analyst",
          "support",
          `calibrated lower bound (${lower.toFixed(3)}) clears market-implied probability ` +
            `(${market.toFixed(3)}) by ${lcbEdge.toFixed(3)} even under the most skeptical reading`,
          confidence,
          { metrics: { lcbEdge, lower, upper, width } },
        );
      }
      return staticOpinion(
        "calibration_analyst",
        "oppose",
        `calibrated lower bound (${lower.toFixed(3)}) does not clear market-implied probability ` +
          `(${market.toFixed(3)}); edge is only real under the optimistic upper endpoint, if at all`,
        Math.min(1, Math.abs(lcbEdge) * 10),
        { metrics: { lcbEdge, lower, upper, width } },
      );
    },
  };
}

/**
 * Risk/Honesty Guardian — the only agent whose `noBetSignal: true` acts as a
 * HARD VETO on `finalDecision` in `SequentialEdgeLabCouncil.runDebate`,
 * regardless of every other agent's stance. Mirrors this product's standing
 * doctrine (No-Bet is first-class, never overridden by apparent edge).
 */
export function riskHonestyGuardian(
  options: { readonly maxWidth?: number; readonly minCalibrationSamples?: number } = {},
): EdgeLabAgent {
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_GUARDIAN_WIDTH;
  const minCalibrationSamples = options.minCalibrationSamples ?? MIN_STRATUM_CALIBRATION;
  return {
    role: "risk_honesty_guardian",
    evaluate(ctx: EdgeLabContext, prior: readonly AgentOpinion[]): AgentOpinion {
      const reasons: string[] = [];

      if (!ctx.multiprob) {
        reasons.push("no calibrated multiprobability interval");
      } else if (ctx.multiprob.width > maxWidth) {
        reasons.push(
          `multiprobability width ${ctx.multiprob.width.toFixed(3)} exceeds ${maxWidth} — ` +
            "the calibration set does not pin this probability down",
        );
      }

      if (
        ctx.calibrationSampleSize !== undefined &&
        ctx.calibrationSampleSize < minCalibrationSamples
      ) {
        reasons.push(
          `only ${ctx.calibrationSampleSize} calibration row(s) for this stratum, below the ` +
            `${minCalibrationSamples}-row floor — insufficient evidence, not a decline`,
        );
      }

      if (ctx.placeboSurvived === false) {
        reasons.push("the underlying signal failed its placebo check");
      }

      const anyOpponentFlaggedNoBet = prior.some((o) => o.noBetSignal === true);
      if (anyOpponentFlaggedNoBet) {
        reasons.push("a prior analyst already raised a no-bet signal");
      }

      if (reasons.length > 0) {
        return staticOpinion(
          "risk_honesty_guardian",
          "flag",
          reasons.join("; "),
          1,
          { noBetSignal: true },
        );
      }

      return staticOpinion(
        "risk_honesty_guardian",
        "support",
        "no honesty or calibration-sufficiency violation detected",
        0.5,
      );
    },
  };
}

/**
 * Decision Agent — synthesizes prior opinions into a single stance. Does NOT
 * itself apply the guardian veto (that happens in the orchestrator, so the
 * veto is enforced structurally rather than by trusting this agent to honor
 * it); its own opinion is a plain confidence-weighted tally.
 */
export function decisionAgent(): EdgeLabAgent {
  return {
    role: "decision_agent",
    evaluate(_ctx: EdgeLabContext, prior: readonly AgentOpinion[]): AgentOpinion {
      let supportWeight = 0;
      let opposeWeight = 0;
      for (const o of prior) {
        if (o.role === "risk_honesty_guardian") continue; // counted separately by the orchestrator veto
        if (o.stance === "support") supportWeight += o.confidence;
        if (o.stance === "oppose" || o.stance === "flag") opposeWeight += o.confidence;
      }
      const net = supportWeight - opposeWeight;
      if (net > 0.3) {
        return staticOpinion(
          "decision_agent",
          "support",
          `net support weight ${net.toFixed(2)} across ${prior.length} prior opinion(s)`,
          Math.min(1, net),
        );
      }
      if (net < -0.1) {
        return staticOpinion(
          "decision_agent",
          "oppose",
          `net oppose weight ${(-net).toFixed(2)} across ${prior.length} prior opinion(s)`,
          Math.min(1, -net),
        );
      }
      return staticOpinion(
        "decision_agent",
        "flag",
        `no clear consensus (net weight ${net.toFixed(2)}) among ${prior.length} prior opinion(s)`,
        0.3,
      );
    },
  };
}

/**
 * Glass Ledger recorder — NOT a ledger writer (see module header). Emits only
 * a free-text hint of what a future writer would need to persist, so the
 * debate summary documents the intent without inventing the write path.
 */
export function glassLedgerRecorder(): EdgeLabAgent {
  return {
    role: "glass_ledger",
    evaluate(ctx: EdgeLabContext): AgentOpinion {
      return staticOpinion(
        "glass_ledger",
        "abstain",
        "no production ledger writer exists for Edge Lab debate output " +
          "(see docs/ops/PRODUCT_CASCADE_MAP.md, ledger multiprob persistence is BLOCKED " +
          "on a missing writer) — this is a diagnostic record only",
        0,
        {
          metrics: ctx.multiprob
            ? { p0: ctx.multiprob.p0, p1: ctx.multiprob.p1, width: ctx.multiprob.width }
            : {},
        },
      );
    },
  };
}

/** The full reference roster, in the debate order agent-roles.ts documents. */
export function defaultAgents(
  guardianOptions?: Parameters<typeof riskHonestyGuardian>[0],
): readonly EdgeLabAgent[] {
  return [
    marketMicrostructureAnalyst(),
    featureAnalyst(),
    placeboAnalyst(),
    calibrationAnalyst(),
    riskHonestyGuardian(guardianOptions),
    decisionAgent(),
    glassLedgerRecorder(),
  ];
}

function roleOrder(role: EdgeLabAgentRole): number {
  const order: readonly EdgeLabAgentRole[] = [
    "market_microstructure",
    "feature_analyst",
    "placebo_analyst",
    "calibration_analyst",
    "risk_honesty_guardian",
    "decision_agent",
    "glass_ledger",
  ];
  const idx = order.indexOf(role);
  return idx === -1 ? order.length : idx;
}

/**
 * Sequential, single-round council: every agent evaluates the SAME context
 * once, each seeing the opinions of every agent that ran before it (in
 * `defaultAgents()`/roster order). `maxRounds` is accepted for interface
 * compatibility with `EdgeLabCouncil` but this reference implementation
 * always runs exactly one round — agents here are pure functions of
 * (ctx, prior opinions) with no state that a second identical round would
 * change. A future stateful or LLM-backed council can use more.
 */
export class SequentialEdgeLabCouncil implements EdgeLabCouncil {
  readonly agents: readonly EdgeLabAgent[];

  constructor(agents?: readonly EdgeLabAgent[]) {
    this.agents = agents ?? defaultAgents();
  }

  async runDebate(ctx: EdgeLabContext, _maxRounds = 1): Promise<DebateSummary> {
    const opinions: AgentOpinion[] = [];
    for (const agent of [...this.agents].sort((a, b) => roleOrder(a.role) - roleOrder(b.role))) {
      const opinion = await agent.evaluate(ctx, opinions);
      opinions.push(opinion);
    }

    const round: DebateRound = {
      round: 1,
      opinions,
      summary: `${opinions.length} agent(s) evaluated slate ${ctx.slateId}`,
    };

    const guardianOpinion = opinions.find((o) => o.role === "risk_honesty_guardian");
    const guardianVeto = guardianOpinion?.noBetSignal === true;
    const decisionOpinion = opinions.find((o) => o.role === "decision_agent");

    const honestyFlags = opinions
      .filter((o) => o.stance === "flag" || o.noBetSignal === true)
      .map((o) => `${o.role}: ${o.rationale}`);

    let finalDecision: DebateSummary["finalDecision"];
    let primaryReason: string;

    if (guardianVeto) {
      finalDecision = "no_bet";
      primaryReason = guardianOpinion!.rationale;
    } else if (decisionOpinion?.stance === "support") {
      finalDecision = decisionOpinion.confidence >= 0.6 ? "bet" : "reduce_size";
      primaryReason = decisionOpinion.rationale;
    } else if (decisionOpinion?.stance === "oppose") {
      finalDecision = "no_bet";
      primaryReason = decisionOpinion.rationale;
    } else {
      finalDecision = "review";
      primaryReason = decisionOpinion?.rationale ?? "no decision agent opinion produced";
    }

    return {
      slateId: ctx.slateId,
      asOf: ctx.asOf,
      rounds: [round],
      finalDecision,
      primaryReason,
      honestyFlags,
      ledgerCommitmentHint:
        "diagnostic only — no production ledger writer for Edge Lab debate output " +
        "(docs/ops/PRODUCT_CASCADE_MAP.md)",
    };
  }
}
