/**
 * The GM Ledger — process over outcome, made tamper-evident.
 *
 * Every roster decision (draft, waiver, trade, start/sit) is committed BEFORE the
 * games to a real SHA-256 Merkle record. Afterward each is graded on PROCESS —
 * was it the right call given what was knowable at commit — independent of how it
 * happened to break. The 2×2 of process × outcome separates skill from luck:
 * "good process / bad beat" is rewarded; "bad process / got lucky" is not. The
 * result is a calibrated GM Rating that can't be cherry-picked after the fact —
 * "I would've started him" becomes cryptographically impossible to fake.
 *
 * The cryptography is real; the decisions are explicitly illustrative.
 * Server-only (node:crypto).
 */

import { createHash } from "node:crypto";
import { merkleRoot, inclusionProof, hashLeaf, verifyInclusion, type HashFn, type PickRecord } from "@sports/prediction-engine";

const sha256: HashFn = (s) => createHash("sha256").update(s).digest("hex");
const short = (h: string) => `${h.slice(0, 10)}…${h.slice(-6)}`;

export type DecisionType = "Draft" | "Waiver" | "Trade" | "Start/Sit";
export type ProcessVerdict = "sound" | "thin" | "unsound";
export type Outcome = "hit" | "miss";

export type GmDecision = {
  readonly id: string;
  readonly week: number;
  readonly type: DecisionType;
  readonly decision: string;
  /** what the GM committed as their reasoning */
  readonly rationale: string;
  /** the information that was actually knowable at commit time */
  readonly infoAtCommit: string;
  /** the GM's stated confidence, 0..100 — calibration is scored against this */
  readonly confidence: number;
  readonly committedAt: string;
  /** graded AFTER: was the process sound given info at commit (not the result) */
  readonly process: ProcessVerdict;
  readonly processReason: string;
  /** what actually happened */
  readonly outcome: Outcome;
  readonly outcomeNote: string;
};

// Illustrative committed decisions — coded, never presented as live.
const DECISIONS: readonly GmDecision[] = [
  { id: "gm-1", week: 1, type: "Draft", decision: "Took Marcus Vale at the 1.04 over the consensus WR", rationale: "Bell-cow volume on a top-5 rushing scheme; positional scarcity at RB1.", infoAtCommit: "Full health, locked starter, no committee reported.", confidence: 78, committedAt: "2026-09-04T22:10:00Z", process: "sound", processReason: "Volume + scarcity read was correct with the info available.", outcome: "hit", outcomeNote: "RB5 through the first quarter of the season." },
  { id: "gm-2", week: 2, type: "Start/Sit", decision: "Benched Julian Roe in a tough shadow matchup", rationale: "Elite shadow corner, low projected target share, rain in the forecast.", infoAtCommit: "Corner confirmed active; weather 70% rain at kickoff.", confidence: 61, committedAt: "2026-09-14T16:40:00Z", process: "sound", processReason: "Matchup + weather both pointed down; defensible given the data.", outcome: "miss", outcomeNote: "Roe broke one long TD anyway — a bad beat, not a bad call." },
  { id: "gm-3", week: 3, type: "Waiver", decision: "Spent 62% FAAB on Tariq Bell after the starter's injury", rationale: "Clear lead-back path; league-winning ceiling if the role holds.", infoAtCommit: "Starter ruled out multi-week by an insider report.", confidence: 71, committedAt: "2026-09-17T13:05:00Z", process: "sound", processReason: "Right price for a confirmed standalone role.", outcome: "hit", outcomeNote: "Immediate RB2 value; the bid was the difference." },
  { id: "gm-4", week: 4, type: "Trade", decision: "Traded a WR2 + bench RB for a fading-name WR1", rationale: "Buying the dip on talent; betting on positive regression.", infoAtCommit: "Underlying targets strong; only the box score was cold.", confidence: 64, committedAt: "2026-09-24T19:30:00Z", process: "sound", processReason: "Bought low on stable underlying usage — process beat the narrative.", outcome: "hit", outcomeNote: "Regression hit; clear WR1 the rest of the way." },
  { id: "gm-5", week: 5, type: "Start/Sit", decision: "Started a boom/bust WR on a hunch over a steady floor play", rationale: "Felt like his week — wanted the upside.", infoAtCommit: "No usage or matchup edge; pure feel.", confidence: 70, committedAt: "2026-10-02T17:15:00Z", process: "unsound", processReason: "No evidentiary edge; the confidence wasn't earned by the info.", outcome: "hit", outcomeNote: "It paid — but the process was luck, and the ledger says so." },
  { id: "gm-6", week: 6, type: "Waiver", decision: "Chased last week's points, dropping a stash for a one-week spike", rationale: "He went off; grab him before the league does.", infoAtCommit: "Spike was a blowout-script outlier; role unchanged.", confidence: 66, committedAt: "2026-10-08T14:20:00Z", process: "unsound", processReason: "Recency bias — bought a non-repeatable outlier over a real role.", outcome: "miss", outcomeNote: "Back to the bench the next week; the stash broke out elsewhere." },
  { id: "gm-7", week: 7, type: "Start/Sit", decision: "Held a star through a questionable tag instead of pivoting", rationale: "Track record of playing through it; no practice-report red flag.", infoAtCommit: "Full practice Friday; beat writer expected him to play.", confidence: 69, committedAt: "2026-10-16T18:00:00Z", process: "thin", processReason: "Reasonable, but a contingency plan should have been queued.", outcome: "miss", outcomeNote: "Late scratch in warmups — a known tail risk that was under-hedged." },
];

const PROCESS_WEIGHT: Record<ProcessVerdict, number> = { sound: 1, thin: 0.55, unsound: 0 };

/** Canonical, stable serialization of the COMMITTED fields (pre-outcome). */
function canonicalDecision(d: GmDecision): string {
  return JSON.stringify({ id: d.id, week: d.week, type: d.type, decision: d.decision, rationale: d.rationale, infoAtCommit: d.infoAtCommit, confidence: d.confidence, committedAt: d.committedAt });
}

function toRecord(d: GmDecision): PickRecord {
  return { id: d.id, payload: canonicalDecision(d) };
}

export type GmQuadrant = "earned" | "bad-beat" | "got-lucky" | "deserved";

/** The process × outcome 2×2 — the separation of skill from luck. */
export function quadrant(d: GmDecision): { key: GmQuadrant; label: string } {
  const goodProcess = d.process !== "unsound";
  if (goodProcess && d.outcome === "hit") return { key: "earned", label: "Earned it" };
  if (goodProcess && d.outcome === "miss") return { key: "bad-beat", label: "Bad beat" };
  if (!goodProcess && d.outcome === "hit") return { key: "got-lucky", label: "Got lucky" };
  return { key: "deserved", label: "Deserved miss" };
}

export type GmRating = {
  readonly processScore: number; // 0..100 — share of sound process, weighted
  readonly calibration: number; // 0..100 — how well confidence tracked hit rate (100 = perfect)
  readonly luckAdjusted: number; // hit rate minus the luck the ledger exposes
  readonly composite: number; // 0..100
  readonly grade: string; // letter
  readonly counts: Record<GmQuadrant, number>;
};

function letter(score: number): string {
  if (score >= 90) return "A";
  if (score >= 82) return "A−";
  if (score >= 74) return "B+";
  if (score >= 66) return "B";
  if (score >= 58) return "B−";
  if (score >= 50) return "C+";
  return "C";
}

export function gmRating(decisions: readonly GmDecision[] = DECISIONS): GmRating {
  const n = decisions.length;
  const processScore = (decisions.reduce((s, d) => s + PROCESS_WEIGHT[d.process], 0) / n) * 100;

  // Calibration: mean |confidence − outcome| (Brier-like, lower is better) → 100-scale.
  const brier = decisions.reduce((s, d) => s + Math.pow(d.confidence / 100 - (d.outcome === "hit" ? 1 : 0), 2), 0) / n;
  const calibration = (1 - brier) * 100;

  // Luck-adjusted: reward bad-beats (good process), discount got-lucky (bad process).
  const counts: Record<GmQuadrant, number> = { earned: 0, "bad-beat": 0, "got-lucky": 0, deserved: 0 };
  for (const d of decisions) counts[quadrant(d).key]++;
  const rawHit = decisions.filter((d) => d.outcome === "hit").length / n;
  const luckAdjusted = (rawHit - (counts["got-lucky"] / n) * 0.5 + (counts["bad-beat"] / n) * 0.5) * 100;

  const composite = Math.round(processScore * 0.5 + calibration * 0.3 + luckAdjusted * 0.2);
  return {
    processScore: Math.round(processScore),
    calibration: Math.round(calibration),
    luckAdjusted: Math.round(luckAdjusted),
    composite,
    grade: letter(composite),
    counts,
  };
}

export type GmLedger = {
  readonly illustrative: true;
  readonly decisions: readonly GmDecision[];
  readonly rating: GmRating;
  readonly publishedRoot: string;
  readonly publishedRootShort: string;
  readonly proof: { recordId: string; recordLabel: string; leafShort: string; siblings: ReadonlyArray<{ hashShort: string; right: boolean }>; verified: boolean };
  readonly tamper: { changedId: string; field: string; from: string; to: string; recomputedRootShort: string; matches: boolean };
};

export function buildGmLedger(): GmLedger {
  const records = DECISIONS.map(toRecord);
  const publishedRoot = merkleRoot(records, sha256);

  // Inclusion proof for the bad-beat decision (gm-2) against the published root.
  const PROOF_INDEX = 1;
  const proof = inclusionProof(records, PROOF_INDEX, sha256);
  const verified = verifyInclusion(proof, publishedRoot, sha256);
  const leaf = hashLeaf(sha256, records[PROOF_INDEX]!);

  // Tamper: retroactively rewrite a rationale to fake a better call → root breaks.
  const TAMPER_INDEX = 4; // the "got lucky" decision
  const tampered = DECISIONS.map((d, i) => (i === TAMPER_INDEX ? { ...d, rationale: "Identified a clear usage edge (rewritten after the fact)." } : d));
  const tamperedRoot = merkleRoot(tampered.map(toRecord), sha256);

  return {
    illustrative: true,
    decisions: DECISIONS,
    rating: gmRating(),
    publishedRoot,
    publishedRootShort: short(publishedRoot),
    proof: {
      recordId: DECISIONS[PROOF_INDEX]!.id,
      recordLabel: DECISIONS[PROOF_INDEX]!.decision,
      leafShort: short(leaf),
      siblings: proof.siblings.map((s) => ({ hashShort: short(s.hash), right: s.right })),
      verified,
    },
    tamper: {
      changedId: DECISIONS[TAMPER_INDEX]!.id,
      field: "rationale",
      from: "(original committed reasoning)",
      to: "rewritten after the fact",
      recomputedRootShort: short(tamperedRoot),
      matches: tamperedRoot === publishedRoot,
    },
  };
}

export const GM_LEDGER_DISCLAIMER =
  "Illustrative committed decisions — the SHA-256 Merkle commitment, inclusion proof, calibration, and tamper detection are computed live; the decisions themselves are a demonstration.";
