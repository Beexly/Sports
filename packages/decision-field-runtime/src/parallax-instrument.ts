/**
 * PROJECT PARALLAX — the counterfactual reality instrument (fixture engine).
 *
 * One Decision Object that is time-aware (light cone), multi-observer (the arena), authority-bounded
 * (the AuthorityVector meet), forkable (a valid do(x) intervention that conserves protected quantities),
 * boundary-aware (the value where the action flips), refusable, and replayable (deterministic digest +
 * settlement autopsy hook).
 *
 * EVERYTHING HERE IS A FIXTURE. No network, no clock, no secrets, no live data. Every numeric prior is
 * an illustrative FIXTURE PRIOR (declared, not estimated) — its job is to make propagation legible and
 * conserved, not to claim accuracy. Because the data mode is FIXTURE, the authority meet caps every
 * expression at INFO_ONLY: the fork can change what we OBSERVE, never what we are PERMITTED to claim.
 *
 * Pure + deterministic. Spec: docs/frontier/05_MATHEMATICAL_SPEC.md.
 */

import type { DecisionState } from "./decision-state.js";
import { type MaxPermittedStrength, rankOf, strengthMin } from "./decision-state-stat-contract.js";
import {
  type AuthorityVectorInput,
  type AuthorityComposition,
  type AuthorityLayer,
  composeAuthority,
} from "./authority-vector.js";

// ───────────────────────── Time model (§1) ─────────────────────────
/** Discrete fixture time grid: 0 Mon · 1 Wed · 2 Fri · 3 Sun-lock. The Time Lens scrubs over these. */
export type Tick = 0 | 1 | 2 | 3;
export const TICK_LABELS: Readonly<Record<Tick, string>> = { 0: "Mon", 1: "Wed", 2: "Fri", 3: "Sun · kickoff" };

export interface PFact {
  readonly id: string;
  readonly subject: string; // e.g. "WR1"
  readonly kind: string; // e.g. "practice", "designation", "inactive"
  readonly value: string | number | boolean;
  readonly observedAt: Tick; // becomes knowable at this tick
  readonly source: string;
  readonly rights: "PUBLIC" | "PERSONALIZED" | "INTERNAL";
}

/** The light cone Λ(T): the facts knowable at or before T. A1/A2 — nothing from the future. */
export function lightCone(facts: readonly PFact[], at: Tick): readonly PFact[] {
  return facts.filter((f) => f.observedAt <= at);
}

// ───────────────────────── Observer model (§2) ─────────────────────────
export type ObserverId = "BOOK" | "FANTASY" | "CROWD" | "GSE";

export interface Belief {
  readonly observer: ObserverId;
  readonly quantity: string; // e.g. "WR2_recv_yards"
  readonly point: number;
  readonly interval: readonly [number, number];
  readonly observedAt: Tick;
  readonly source: string;
}

/** The arena B(q,T): every observer's belief on q that is knowable at T. */
export function observerArena(beliefs: readonly Belief[], quantity: string, at: Tick): readonly Belief[] {
  return beliefs.filter((b) => b.quantity === quantity && b.observedAt <= at);
}

/** Disagreement D(q,T) = spread of observer points. Never averaged into one "truth" (A3). */
export function disagreement(beliefs: readonly Belief[]): number {
  if (beliefs.length < 2) return 0;
  const pts = beliefs.map((b) => b.point);
  return Math.max(...pts) - Math.min(...pts);
}

// ───────────────────────── Conservation (§5 / A3) ─────────────────────────
export interface ShareVector {
  readonly [player: string]: number; // target share in [0,1]; Σ = 1 over the room
}

/** Sum of a share vector — the conserved quantity for the receiving room. */
export function shareTotal(s: ShareVector): number {
  return Object.values(s).reduce((a, b) => a + b, 0);
}

/**
 * Redistribute a removed player's vacated share to the remaining players by conditional weights
 * (Σ weights = 1), conserving total target share. Returns the new share vector. Pure.
 */
export function redistribute(base: ShareVector, removed: string, weights: ShareVector): ShareVector {
  const vacated = base[removed] ?? 0;
  const out: Record<string, number> = {};
  for (const [p, v] of Object.entries(base)) {
    if (p === removed) {
      out[p] = 0;
      continue;
    }
    out[p] = v + vacated * (weights[p] ?? 0);
  }
  return out;
}

/** Conservation residual: |Σ after − Σ before|. Must be ~0 for a valid fork (A3). */
export function conservationResidual(before: ShareVector, after: ShareVector): number {
  return Math.abs(shareTotal(after) - shareTotal(before));
}

// ───────────────────────── The intervention (§5) ─────────────────────────
export interface Intervention {
  readonly kind: "PLAYER_OUT" | "LINE_MOVE" | "INVALID_CONDITION_ON_OUTCOME";
  readonly subject: string;
  /** For PLAYER_OUT: the snap probability we set (0 = fully out, 1 = full go). do(snap := p). */
  readonly snapProbability?: number;
}

export interface ForkRejection {
  readonly ok: false;
  readonly reason: "INVALID_INTERVENTION" | "CONSERVATION_VIOLATED" | "MISSING_REQUIRED_FACT";
  readonly detail: string;
}

export interface ForkResult {
  readonly ok: true;
  readonly changedAssumptions: readonly string[];
  readonly shareBefore: ShareVector;
  readonly shareAfter: ShareVector;
  readonly conservationResidual: number;
  /** WR2 projected receiving yards, with an interval — the propagated, interval-honest output. */
  readonly projection: { readonly point: number; readonly interval: readonly [number, number] };
  readonly teamPassAttempts: { readonly before: number; readonly after: number };
}

// FIXTURE PRIORS — illustrative, not estimated. Declared here so nothing is hidden.
const FIXTURE = {
  room: { WR1: 0.28, WR2: 0.18, SLOT: 0.16, TE: 0.14, RB: 0.08, OTHER: 0.16 } as ShareVector,
  /** When WR1 sits, vacated share flows here (Σ = 1). FIXTURE PRIOR. */
  vacancyWeights: { WR2: 0.42, SLOT: 0.31, TE: 0.17, RB: 0.05, OTHER: 0.05 } as ShareVector,
  teamPassAttempts: 34, // conserved Q (illustrative)
  yardsPerTarget: 8.1, // FIXTURE PRIOR (efficiency)
  intervalHalfWidthFrac: 0.22, // ± band as a fraction of the point (illustrative)
  marketLineWR2: 52.5, // BOOK's posted WR2 receiving-yards line (fixture) — above the un-forked projection
};

/**
 * Fork the reality on WR1's availability. do(WR1.snap := p). Propagates vacated share to the room by
 * conservation, recomputes WR2's projection with an interval, and verifies conservation. Rejects an
 * invalid intervention (conditioning on an outcome) or a conservation violation or a missing fact.
 */
export function forkWR1Availability(
  snapProbability: number,
  knownFacts: readonly PFact[],
): ForkResult | ForkRejection {
  if (!Number.isFinite(snapProbability) || snapProbability < 0 || snapProbability > 1) {
    return { ok: false, reason: "INVALID_INTERVENTION", detail: "snapProbability must be in [0,1]" };
  }
  // A2/A4: to fork on WR1 being out we must actually know WR1's status fact in the light cone.
  const hasStatusFact = knownFacts.some((f) => f.subject === "WR1" && (f.kind === "designation" || f.kind === "inactive"));
  if (!hasStatusFact) {
    return {
      ok: false,
      reason: "MISSING_REQUIRED_FACT",
      detail: "No WR1 status fact is knowable yet — the fork would impute a fact we do not have.",
    };
  }
  // do(snap := p): the fraction of WR1's share that is vacated is (1 - p).
  const vacatedFrac = 1 - snapProbability;
  const base = FIXTURE.room;
  const partialRemoval: ShareVector = { ...base, WR1: (base.WR1 ?? 0) * snapProbability };
  // The vacated mass = base.WR1 * (1-p); redistribute it by the fixture weights, conserving the total.
  const vacatedMass = (base.WR1 ?? 0) * vacatedFrac;
  const after: Record<string, number> = { ...partialRemoval };
  for (const [p, w] of Object.entries(FIXTURE.vacancyWeights)) {
    after[p] = (after[p] ?? 0) + vacatedMass * w;
  }
  const residual = conservationResidual(base, after);
  if (residual > 1e-9) {
    return { ok: false, reason: "CONSERVATION_VIOLATED", detail: `share total moved by ${residual}` };
  }
  const wr2Targets = (after.WR2 ?? 0) * FIXTURE.teamPassAttempts;
  const point = round1(wr2Targets * FIXTURE.yardsPerTarget);
  const half = round1(point * FIXTURE.intervalHalfWidthFrac);
  return {
    ok: true,
    changedAssumptions: [
      `do(WR1.snap := ${snapProbability})`,
      `vacated target share ${round3(vacatedMass)} redistributed by FIXTURE PRIOR weights`,
      `team pass attempts held at ${FIXTURE.teamPassAttempts} (conserved)`,
    ],
    shareBefore: base,
    shareAfter: after,
    conservationResidual: residual,
    projection: { point, interval: [round1(point - half), round1(point + half)] },
    teamPassAttempts: { before: FIXTURE.teamPassAttempts, after: FIXTURE.teamPassAttempts },
  };
}

// ───────────────────────── Decision boundary (§6) ─────────────────────────
/** The recommended read for WR2 given a projection vs the market line. Kinematics only (not advice). */
export function wr2Read(projectionPoint: number): DecisionState {
  // FIXTURE logic: clearly above the line → role-up read; near → watch; below → pass.
  const edge = projectionPoint - FIXTURE.marketLineWR2;
  if (edge >= 4) return "ROLE_UP_FANTASY_LATE";
  if (edge >= 1) return "WATCHLIST";
  return "PASS";
}

export interface BoundarySpec {
  readonly axis: "WR1_snap_probability";
  readonly flipsAt: number | null; // p* where the read changes vs the un-forked read; null if it never flips
  readonly fromRead: DecisionState;
  readonly toRead: DecisionState;
}

/**
 * The Possibility Surface: sweep WR1 snap probability and find p* where WR2's read flips. We sell the
 * boundary, not the point. Deterministic grid sweep.
 */
export function wr2Boundary(knownFacts: readonly PFact[]): BoundarySpec {
  const full = forkWR1Availability(1, knownFacts); // p=1 baseline (WR1 plays)
  const baselineRead: DecisionState = full.ok ? wr2Read(full.projection.point) : "NEEDS_LIVE_DATA";
  let flipsAt: number | null = null;
  let toRead: DecisionState = baselineRead;
  // Sweep WR1 snap probability DOWN from 1.0 and record the FIRST p where WR2's read leaves baseline —
  // i.e. "the action flips once WR1's snap probability crosses x*." Deterministic grid, first crossing.
  for (let i = 100; i >= 0; i--) {
    const p = i / 100;
    const f = forkWR1Availability(p, knownFacts);
    if (!f.ok) continue;
    const read = wr2Read(f.projection.point);
    if (read !== baselineRead) {
      flipsAt = p;
      toRead = read;
      break;
    }
  }
  return { axis: "WR1_snap_probability", flipsAt, fromRead: baselineRead, toRead };
}

// ───────────────────────── The Decision Object (§4) ─────────────────────────
export interface DecisionObject {
  readonly id: string;
  readonly atTick: Tick;
  readonly atLabel: string;
  readonly state: DecisionState;
  readonly lightCone: readonly PFact[];
  readonly arena: readonly Belief[];
  readonly disagreement: number;
  readonly authority: AuthorityComposition;
  /** The bounded claim strength — provably ≤ authority.ceiling (the claim bound). */
  readonly claimStrength: MaxPermittedStrength;
  readonly bindingLayers: readonly AuthorityLayer[];
  readonly fork?: ForkResult | ForkRejection;
  readonly boundary?: BoundarySpec;
  readonly refusal?: { readonly refused: boolean; readonly why: string };
  readonly autopsyHook: { readonly settlesAtTick: Tick; readonly protocol: string };
  readonly replayDigest: string;
}

/**
 * Build a Decision Object at time `at` under authority `v`, optionally applying a fork. The claim
 * strength is the local read's natural strength MET with the authority ceiling — so it can NEVER
 * exceed what the eight layers permit (the claim bound). Deterministic; the digest makes it replayable.
 */
export function buildDecisionObject(args: {
  readonly id: string;
  readonly at: Tick;
  readonly facts: readonly PFact[];
  readonly beliefs: readonly Belief[];
  readonly quantity: string;
  readonly authority: AuthorityVectorInput;
  readonly intervention?: Intervention;
  readonly desiredStrength?: MaxPermittedStrength;
}): DecisionObject {
  const cone = lightCone(args.facts, args.at);
  const arena = observerArena(args.beliefs, args.quantity, args.at);
  const authority = composeAuthority(args.authority);

  let fork: ForkResult | ForkRejection | undefined;
  let boundary: BoundarySpec | undefined;
  let state: DecisionState = "WATCHLIST";
  let refusal: DecisionObject["refusal"];

  if (args.intervention?.kind === "INVALID_CONDITION_ON_OUTCOME") {
    fork = { ok: false, reason: "INVALID_INTERVENTION", detail: "conditioning on a realized outcome is not a do() intervention" };
    state = "DATA_CONFLICT";
    refusal = { refused: true, why: "Invalid counterfactual: cannot condition on a future/realized outcome." };
  } else if (args.intervention?.kind === "PLAYER_OUT") {
    fork = forkWR1Availability(args.intervention.snapProbability ?? 0, cone);
    if (fork.ok) {
      boundary = wr2Boundary(cone);
      state = wr2Read(fork.projection.point);
    } else {
      state = fork.reason === "MISSING_REQUIRED_FACT" ? "NEEDS_LIVE_DATA" : "DATA_CONFLICT";
      refusal = { refused: true, why: fork.detail };
    }
  } else {
    // No fork: read from the baseline if WR1 status is known, else refuse.
    const base = forkWR1Availability(1, cone);
    if (base.ok) {
      state = wr2Read(base.projection.point);
      boundary = wr2Boundary(cone);
    } else {
      state = "NEEDS_LIVE_DATA";
      refusal = { refused: true, why: base.detail };
    }
  }

  // The claim bound: desired strength MET with the authority ceiling — never above it.
  const desired = args.desiredStrength ?? "ACTION";
  const claimStrength = strengthMin(desired, authority.ceiling);

  const obj: Omit<DecisionObject, "replayDigest"> = {
    id: args.id,
    atTick: args.at,
    atLabel: TICK_LABELS[args.at],
    state,
    lightCone: cone,
    arena,
    disagreement: disagreement(arena),
    authority,
    claimStrength,
    bindingLayers: authority.bindingLayers,
    fork,
    boundary,
    refusal,
    autopsyHook: { settlesAtTick: 3, protocol: "compare realized vs forked branches; credit per §7 (no single-result weight move)" },
  };
  return { ...obj, replayDigest: replayDigest(obj) };
}

// ───────────────────────── Counterfactual memory (§7) ─────────────────────────
export type CreditVerdict = "EARNED" | "LUCKY" | "UNLUCKY" | "CORRECTLY_REFUSED" | "WRONGLY_REFUSED";

/**
 * Settlement credit: compares the claim against the realized outcome AND the forked branch — never the
 * outcome alone (A5). A correct refusal is a WIN, not a blank. One result moves no weight (caller must
 * route survivors through the FDR-disciplined Intelligence Ledger).
 */
export function creditVerdict(args: {
  readonly refused: boolean;
  readonly claimedAbove: boolean; // did we claim WR2 beats the line?
  readonly realizedYards: number;
  readonly lineWasBeaten: boolean; // realized vs market line
  readonly forkSupportedClaim: boolean; // did the counterfactual branch support the claim?
}): CreditVerdict {
  if (args.refused) return args.lineWasBeaten === args.claimedAbove ? "CORRECTLY_REFUSED" : "CORRECTLY_REFUSED";
  if (args.claimedAbove && args.lineWasBeaten) return args.forkSupportedClaim ? "EARNED" : "LUCKY";
  if (args.claimedAbove && !args.lineWasBeaten) return args.forkSupportedClaim ? "UNLUCKY" : "UNLUCKY";
  return args.lineWasBeaten ? "WRONGLY_REFUSED" : "CORRECTLY_REFUSED";
}

// ───────────────────────── helpers ─────────────────────────
function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

/** Deterministic content digest (FNV-1a, 32-bit) for replay-determinism — NOT a cryptographic hash. */
export function replayDigest(obj: unknown): string {
  const json = stableStringify(obj);
  let h = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return "fnv1a:" + (h >>> 0).toString(16).padStart(8, "0");
}

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify((v as Record<string, unknown>)[k])).join(",") + "}";
}

// ───────────────────────── The fixture scenario ─────────────────────────
/** The canonical fixture: WR1 questionable, the room, and the four-observer arena over time. */
export const PARALLAX_FIXTURE = {
  game: "Fixture · Team OFF vs DEF · Week X",
  quantity: "WR2_recv_yards",
  facts: [
    { id: "f1", subject: "WR1", kind: "practice", value: "LP", observedAt: 1, source: "team-report", rights: "PUBLIC" },
    { id: "f2", subject: "WR1", kind: "designation", value: "Questionable", observedAt: 2, source: "team-report", rights: "PUBLIC" },
    { id: "f3", subject: "WR1", kind: "inactive", value: true, observedAt: 3, source: "inactives", rights: "PUBLIC" },
    { id: "f4", subject: "WR2", kind: "route_rate", value: 0.86, observedAt: 1, source: "nflverse", rights: "PUBLIC" },
  ] as PFact[],
  beliefs: [
    { observer: "BOOK", quantity: "WR2_recv_yards", point: 52.5, interval: [44, 61], observedAt: 0, source: "odds-api(fixture)" },
    { observer: "FANTASY", quantity: "WR2_recv_yards", point: 49.0, interval: [34, 64], observedAt: 0, source: "projection(fixture)" },
    { observer: "CROWD", quantity: "WR2_recv_yards", point: 44.0, interval: [26, 62], observedAt: 0, source: "roster%(fixture)" },
    { observer: "GSE", quantity: "WR2_recv_yards", point: 56.0, interval: [46, 66], observedAt: 2, source: "role-model(fixture)" },
  ] as Belief[],
} as const;

/** The fixture authority context: FIXTURE data mode → the meet caps everything at INFO_ONLY. */
export const FIXTURE_AUTHORITY: AuthorityVectorInput = {
  rights: "PUBLIC",
  temporal: "PRE_LOCK",
  sourceReality: "FIXTURE",
  evidence: "THIN",
  localExpression: "ACTION",
  modelMaturity: "PROCESS_ONLY",
  entitlement: "PUBLIC",
  ownerAction: "HELD",
};
