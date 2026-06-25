/**
 * EINSTEIN LAYER — Market Relativity Tensor (Invention 12).
 *
 * Same game, different observers. Every book, exchange, DFS-salary market, fantasy feed,
 * consensus, model, and attention stream is an OBSERVER FRAME with its own clock, latency,
 * liquidity, bettor base, and refresh policy. There is no single "the line" — there are frames,
 * and the interesting physics is which truths are INVARIANT across frames and which exist only
 * because of a frame's distortion.
 *
 * This computes, per market, each frame's belief vs the reliability-weighted consensus, and
 * emits FrameDistortionResiduals (frame lag, divergence, reliability, classified reason). It does
 * NOT bet — it measures relativity. Pure + deterministic; reuses the implied-probability math
 * from market-physics.
 */

import { americanToImpliedProb } from "../market-physics/market-surface.js";

export type FrameKind =
  | "book"
  | "exchange"
  | "dfs"
  | "fantasy"
  | "consensus"
  | "model"
  | "attention"
  | "reality";

export interface ObserverFrame {
  readonly id: string;
  readonly kind: FrameKind;
  /** Which market family this frame is authoritative/observed for (optional). */
  readonly marketFamily?: string;
  /** Clock skew of this frame's timestamps vs the reference clock (ms). */
  readonly clockSkewMs: number;
  /** Typical update latency after new information (ms). */
  readonly latencyMs: number;
  /** 0 (thin) → 1 (deep) liquidity proxy. */
  readonly liquidityProxy: number;
  /** 0 (noisy) → 1 (price-discovery) reliability. */
  readonly sourceReliability: number;
  /** How often the frame refreshes (ms). */
  readonly updateCadenceMs: number;
  /** Free-form distortion traits (e.g. "public-team shading", "favorite-longshot"). */
  readonly distortionTraits?: readonly string[];
}

export interface FrameBelief {
  readonly frameId: string;
  readonly marketKey: string;
  readonly outcome: string;
  /** Implied probability in (0,1). If `price` is given instead, it is converted. */
  readonly impliedProb?: number;
  readonly price?: number;
  readonly point?: number;
  readonly timestamp: string;
}

export interface FrameDistortionResidual {
  readonly frameId: string;
  readonly marketKey: string;
  readonly outcome: string;
  readonly observerProb: number;
  readonly consensusProb: number;
  /** observerProb − consensusProb. */
  readonly frameDivergence: number;
  /** Frame latency + |clock skew| (ms) — its position on the relativity clock. */
  readonly frameLagMs: number;
  readonly frameReliability: number;
  readonly magnitude: number;
  readonly distortionReason: "latency" | "liquidity" | "bettor_base" | "reliability" | "unclassified";
}

export interface FrameInvariant {
  readonly marketKey: string;
  readonly outcome: string;
  readonly consensusProb: number;
  /** Max |divergence| across frames — low = invariant truth. */
  readonly dispersion: number;
  readonly nFrames: number;
}

function probOf(b: FrameBelief): number {
  if (b.impliedProb != null && Number.isFinite(b.impliedProb)) return b.impliedProb;
  if (b.price != null) return americanToImpliedProb(b.price);
  return NaN;
}

/**
 * Reliability-weighted consensus probability for a (marketKey, outcome) across frames, plus the
 * per-frame distortion residuals and the cross-frame invariant summary.
 */
export function computeFrameDistortions(
  beliefs: readonly FrameBelief[],
  frames: readonly ObserverFrame[],
  options: { divergenceThreshold?: number } = {},
): { distortions: FrameDistortionResidual[]; invariants: FrameInvariant[] } {
  const threshold = options.divergenceThreshold ?? 0.03;
  const frameById = new Map(frames.map((f) => [f.id, f]));

  const groups = new Map<string, FrameBelief[]>();
  for (const b of beliefs) {
    if (frameById.get(b.frameId)?.kind === "attention") continue; // attention is not a probability frame
    const key = `${b.marketKey}|${b.outcome}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(b);
  }

  const distortions: FrameDistortionResidual[] = [];
  const invariants: FrameInvariant[] = [];

  for (const [key, gb] of groups) {
    const [marketKey, outcome] = key.split("|") as [string, string];
    const rows = gb
      .map((b) => ({ b, p: probOf(b), f: frameById.get(b.frameId) }))
      .filter((r): r is { b: FrameBelief; p: number; f: ObserverFrame } => !!r.f && Number.isFinite(r.p));
    if (rows.length < 2) continue;

    const wsum = rows.reduce((s, r) => s + r.f.sourceReliability, 0) || rows.length;
    const consensusProb = rows.reduce((s, r) => s + r.p * (r.f.sourceReliability || 1), 0) / wsum;

    let maxDiv = 0;
    for (const r of rows) {
      const divergence = r.p - consensusProb;
      maxDiv = Math.max(maxDiv, Math.abs(divergence));
      if (Math.abs(divergence) < threshold) continue;
      const frameLagMs = r.f.latencyMs + Math.abs(r.f.clockSkewMs);
      distortions.push({
        frameId: r.f.id,
        marketKey,
        outcome,
        observerProb: r.p,
        consensusProb,
        frameDivergence: divergence,
        frameLagMs,
        frameReliability: r.f.sourceReliability,
        magnitude: Math.abs(divergence),
        distortionReason: classifyDistortion(r.f),
      });
    }
    invariants.push({ marketKey, outcome, consensusProb, dispersion: maxDiv, nFrames: rows.length });
  }

  distortions.sort((a, b) => b.magnitude - a.magnitude);
  return { distortions, invariants };
}

function classifyDistortion(f: ObserverFrame): FrameDistortionResidual["distortionReason"] {
  if (f.latencyMs >= 5 * 60_000 || Math.abs(f.clockSkewMs) >= 60_000) return "latency";
  if (f.liquidityProxy <= 0.25) return "liquidity";
  if ((f.distortionTraits ?? []).some((t) => /public|shade|longshot|fantasy|dfs/i.test(t))) return "bettor_base";
  if (f.sourceReliability <= 0.4) return "reliability";
  return "unclassified";
}

/** Observer agreement on a market: 1 (all frames agree) → 0 (maximal divergence). */
export function observerAgreement(invariant: FrameInvariant): number {
  return Math.max(0, 1 - invariant.dispersion * 4);
}
