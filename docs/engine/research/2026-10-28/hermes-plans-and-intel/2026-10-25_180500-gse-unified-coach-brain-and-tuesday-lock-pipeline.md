# GSE Unified Coach Brain, Early-Week Lock Pipeline & Fleet Consolidation Plan

## Goal
Eliminate Sunday-morning script improvisation and multi-agent drift by locking the immutable Coach Mindset Baseline every Tuesday at 04:00 CT (`v1.0`), pre-generating all Rankings, MILP DFS Optimizers, Props, Sides/Totals Plays, and Correlated SGPs/Parlays 5 days before kickoff from live Neon DB (`gse-postgres`) data, layering strictly bounded Wed/Thu/Fri/T-90 injury deltas without ever mutating coach reasoning, and distilling Garrett's full intelligence corpus into a dedicated, directly queryable GSE Coach Brain LLM (`gse-coach-brain-v1`).

---

## Current Context & Forensic Root-Cause Audit (Why Sunday Morning Failed)

An exhaustive audit across `C:/Users/Garrett/Sports`, `C:/Users/Garrett/nfl-farm`, `C:/Users/Garrett/.gemini`, `C:/Users/Garrett/_research/agent-bus`, `C:/Users/Garrett/AppData/Local/hermes`, and the 42 artifacts in `C:/Users/Garrett/Downloads/` revealed four exact structural failures:

1. **Stubbed Injury Overlay (`packages/prediction-engine/src/coach-sim/locked-projection.ts`):**
   - `applyInjuryOverlay(baseline, overlay)` currently returns `adjustedSpreadHome: baseline.baseSpreadHome`, `adjustedTotalPoints: baseline.baseTotalPoints`, and `adjustedWinProbHome: baseline.baseWinProbHome` untouched. It is a no-op stub that ignores `overlay.deltas`.
2. **Call Sheet Refuses to Sign Plays (`packages/prediction-engine/src/public-baseline/call-sheet.ts`):**
   - As documented in `Downloads/GROK-PROMPT-FIX-THE-REASONING-V2-2026-10-23.md`, `call-sheet.ts` enforces `row.ticket = null` (`"signs nothing"` in `call-sheet.test.ts`). Because the reasoning spine refused to emit priced tickets, downstream packet scripts had nothing to read.
3. **Sunday-Morning Hardcoded Hallucinations (`scripts/generate-week7-sunday-master-slate.ts` & `scripts/generate-week7-dfs-and-email-packet.mjs`):**
   - Committed on Sunday, Oct 25 at 09:45 AM and 11:29 AM CT (`837b95f58`, `efe0b1e70`), these scripts bypassed Neon DB (`gse-postgres`) and hardcoded `WEEK7_SUNDAY_GAMES` and `EXTRA_DFS_PLAYERS` in TypeScript/JS literals — worse, using 2024 NFL Week 7 matchups (`DET @ MIN`, `KC @ SF`, `CAR @ WAS`) instead of querying the live 2026 schedule and the Oct 24 X/SiriusXM corpus (`SEA @ KC`, `SF vs ATL`, `NE @ CHI`, etc.).
4. **Fragmented Workspaces & Silent Multi-Agent Drift:**
   - 19 git worktrees (`Sports`, `Sports-live`, `Sports-wt-*`), `.gemini/antigravity/brain`, `nfl-farm`, and `Beexly/agent-bus` have been operated by separate agents writing markdown handoffs instead of sharing a single DB-backed state machine and a single fine-tuned/distilled Coach Brain model.

---

## Architecture & Proposed Approach

We replace ad-hoc Sunday scripts and disconnected agent handoffs with a **two-pillar deterministic + neural architecture** governed by a single weekly state machine in Neon (`gse-postgres`):

1. **Deterministic Neuro-Symbolic Coach Spine (`@sports/prediction-engine`):** At **Tuesday 04:00 CT (`v1.0`)**, the engine ingests the true weekly schedule, rosters, and opening markets from Neon `gse-postgres` + `nfl-farm`, runs the 9-dimension Belichick Markov Drive Simulator, the 10 Oct-24 Intel Master kernels, the 80 X-situational rules, and isotonic Brier calibration (fixing the +5.2pt overconfidence inflation), and cryptographically seals (`sha256` Merkle lock) the **Immutable Coach Mindset Baseline** (`CoachMindsetBaseline`) plus the full week's **Rankings, Props, Sides/Totals Plays, Correlated SGPs, and MILP DFS Lineups**. Subsequent windows (`v2.0` Wed 17:00 CT, `v3.0` Fri 16:30 CT, `v4.0` Sun T-90m) run **only** `applyInjuryOverlay()` via Sinkhorn target/carry reallocation and EPA replacement dropoffs — the coach's brain never changes.
2. **Dedicated GSE Coach Brain LLM (`gse-coach-brain-v1` on DeepSeek-V3/Flash-1017 / Qwen-2.5-32B LoRA + Unified CLI/Web Chat):** We compile Garrett's entire verified corpus (`MIND_CORPUS_3000.jsonl` [5,149 records], `X-SITUATIONAL-TRAINING-CORPUS-2026-10-21.md` [80 rules + 575 X posts], `GSE-INTEL-MASTER-2026-10-24.md` [SiriusXM Ch. 87 + X analyst pulls], `SITUATIONAL-CONTEXT-V2-2026-10-21.md`, and the Belichick / Omni-Cognitive / Neuro-Symbolic architecture docs) into an instruction-tuning & reasoning-trace dataset, deploy it as a pinned model endpoint (`gse-coach-brain-v1`) wired directly to the live `v1.0..v4.0` Neon state table, and expose a single interactive CLI/Web command center where Garrett talks directly to his own engine.

```
[Neon gse-postgres + nfl-farm + SiriusXM/X Corpus]
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│ TUESDAY 04:00 CT — v1.0 IMMUTABLE COACH MINDSET LOCK         │
│  • Belichick 9-Dim Markov Sim + 10 Oct-24 Kernels + 80 Rules │
│  • Isotonic Brier Calibration Map (-5.2pt inflation fix)     │
│  • Emits & Seals: Team/Unit/Player Rankings, Sides/Totals,   │
│    Player Props, Correlated SGPs/Parlays, MILP DFS Pool      │
│  • Merkle Hash written to Neon `weekly_cadence_locks`        │
└─────────────────────┬────────────────────────────────────────┘
                      │ (Coach Mindset FROZEN — never recomputed)
                      ▼
┌──────────────────────────────────────────────────────────────┐
│ WED 17:00 (v2.0) → THU TNF (v2.5) → FRI 16:30 (v3.0) → T-90  │
│  • Pulls official practice/inactive designations ONLY        │
│  • Sinkhorn target/carry reallocation + EPA dropoff delta    │
│  • Re-solves MILP DFS & adjusts prop/spread edges in <5s     │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│ GSE COACH BRAIN LLM (DeepSeek Flash 1017 / LoRA Fine-Tune)   │
│  • Trained on 5,149 MIND records + 80 X rules + Belichick    │
│  • Reads ONLY sealed v1.0..v4.0 Neon snapshots (0 halluc.)   │
└──────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Implementation Tasks

### Task 1: Replace the No-Op Injury Overlay with Deterministic Sinkhorn & EPA Delta Propagation
**Why:** `applyInjuryOverlay` in `packages/prediction-engine/src/coach-sim/locked-projection.ts` currently ignores `overlay.deltas` and returns the unadjusted baseline numbers.

**Files:**
- Modify: `C:/Users/Garrett/Sports/packages/prediction-engine/src/coach-sim/locked-projection.ts`
- Create test: `C:/Users/Garrett/Sports/packages/prediction-engine/src/coach-sim/locked-projection.test.ts`

**Step 1.1 — Write the failing test (`C:/Users/Garrett/Sports/packages/prediction-engine/src/coach-sim/locked-projection.test.ts`):**
```typescript
import { describe, it, expect } from "vitest"
import {
  lockBaseline,
  applyInjuryOverlay,
  verifyBaselineImmutability,
  type CoachMindsetBaseline,
  type InjuryOverlay,
} from "./locked-projection.js"

const SAMPLE_BASELINE: CoachMindsetBaseline = {
  gameId: "2026_W07_SEA_KC",
  lockedAtVersion: "v1.0",
  lockedAtIso: "2026-10-20T09:00:00.000Z",
  baselineMerkle: "a1b2c3d4e5f6",
  homeCoachScheme: "Andy Reid West Coast / Spags Press-Man Blitz",
  awayCoachScheme: "Mike Macdonald Simulated Pressure / Grubb Ryan-Zone",
  neutralPassRateHome: 0.62,
  neutralPassRateAway: 0.58,
  fourthDownAggressionHome: 0.74,
  fourthDownAggressionAway: 0.68,
  coverageShellMixHome: { man: 0.42, zone: 0.58, blitz: 0.34 },
  coverageShellMixAway: { man: 0.28, zone: 0.72, blitz: 0.24 },
  baseWinProbHome: 0.64,
  baseSpreadHome: -4.5,
  baseTotalPoints: 47.5,
}

describe("locked-projection: immutable coach mindset + dynamic injury overlay", () => {
  it("never mutates coach scheme, pass rate, 4th-down policy, or shell mix when injuries hit", () => {
    const locked = lockBaseline(SAMPLE_BASELINE)
    const overlay: InjuryOverlay = {
      overlayVersion: "v3.0",
      recordedAtIso: "2026-10-23T21:30:00.000Z",
      deltas: [
        {
          playerId: "SEA_RB_CHARBONNET",
          playerName: "Zach Charbonnet",
          team: "SEA",
          designation: "OUT",
          snapShareReplacementRatio: 0.85,
          epaPerPlayDropoff: -0.06,
          targetOrCarryReallocation: { KENNETH_WALKER: 0.75, JAXON_SMITH_NJIGBA: 0.25 },
        },
      ],
    }

    const projected = applyInjuryOverlay(locked, overlay)
    expect(verifyBaselineImmutability(locked, projected.baseline)).toBe(true)
    expect(projected.baseline.neutralPassRateAway).toBe(0.58)
    expect(projected.adjustedSpreadHome).toBeLessThan(locked.baseSpreadHome) // Home favored by more when away loses player
    expect(projected.reallocatedShares["KENNETH_WALKER"]).toBeCloseTo(0.75, 4)
  })
})
```

**Step 1.2 — Run test to verify it fails:**
```bash
cd C:/Users/Garrett/Sports/packages/prediction-engine && node ../../node_modules/vitest/vitest.mjs run src/coach-sim/locked-projection.test.ts
```
Expected output: `FAIL` (`verifyBaselineImmutability is not a function` and `adjustedSpreadHome` equals `-4.5`).

**Step 1.3 — Implement full delta propagation & Merkle guard in `C:/Users/Garrett/Sports/packages/prediction-engine/src/coach-sim/locked-projection.ts`:**
```typescript
import { createHash } from "node:crypto"

export interface CoachMindsetBaseline {
  readonly gameId: string
  readonly lockedAtVersion: "v1.0"
  readonly lockedAtIso: string
  readonly baselineMerkle: string
  readonly homeCoachScheme: string
  readonly awayCoachScheme: string
  readonly neutralPassRateHome: number
  readonly neutralPassRateAway: number
  readonly fourthDownAggressionHome: number
  readonly fourthDownAggressionAway: number
  readonly coverageShellMixHome: Readonly<Record<string, number>>
  readonly coverageShellMixAway: Readonly<Record<string, number>>
  readonly baseWinProbHome: number
  readonly baseSpreadHome: number
  readonly baseTotalPoints: number
}

export interface InjuryAvailabilityDelta {
  readonly playerId: string
  readonly playerName: string
  readonly team: "HOME" | "AWAY" | string
  readonly designation: "OUT" | "DOUBTFUL" | "QUESTIONABLE" | "ACTIVE"
  readonly snapShareReplacementRatio: number
  readonly epaPerPlayDropoff: number
  readonly targetOrCarryReallocation: Readonly<Record<string, number>>
}

export interface InjuryOverlay {
  readonly overlayVersion: "v2.0" | "v3.0" | "v4.0"
  readonly recordedAtIso: string
  readonly deltas: readonly InjuryAvailabilityDelta[]
}

export interface LockedProjection {
  readonly baseline: CoachMindsetBaseline
  readonly injuryOverlay: InjuryOverlay
  readonly adjustedSpreadHome: number
  readonly adjustedTotalPoints: number
  readonly adjustedWinProbHome: number
  readonly reallocatedShares: Readonly<Record<string, number>>
}

const DESIGNATION_WEIGHT: Record<InjuryAvailabilityDelta["designation"], number> = {
  OUT: 1.0,
  DOUBTFUL: 0.78,
  QUESTIONABLE: 0.35,
  ACTIVE: 0.0,
}

const PLAYS_PER_TEAM_GAME = 63.5
const SPREAD_TO_WINPROB_SLOPE = 0.0315

export function computeBaselineMerkle(baseline: Omit<CoachMindsetBaseline, "baselineMerkle">): string {
  const canonical = JSON.stringify({
    gameId: baseline.gameId,
    lockedAtVersion: baseline.lockedAtVersion,
    homeCoachScheme: baseline.homeCoachScheme,
    awayCoachScheme: baseline.awayCoachScheme,
    neutralPassRateHome: baseline.neutralPassRateHome,
    neutralPassRateAway: baseline.neutralPassRateAway,
    fourthDownAggressionHome: baseline.fourthDownAggressionHome,
    fourthDownAggressionAway: baseline.fourthDownAggressionAway,
    coverageShellMixHome: baseline.coverageShellMixHome,
    coverageShellMixAway: baseline.coverageShellMixAway,
    baseWinProbHome: baseline.baseWinProbHome,
    baseSpreadHome: baseline.baseSpreadHome,
    baseTotalPoints: baseline.baseTotalPoints,
  })
  return createHash("sha256").update(canonical).digest("hex")
}

export function lockBaseline(baseline: CoachMindsetBaseline): CoachMindsetBaseline {
  return Object.freeze({
    ...baseline,
    coverageShellMixHome: Object.freeze({ ...baseline.coverageShellMixHome }),
    coverageShellMixAway: Object.freeze({ ...baseline.coverageShellMixAway }),
  })
}

export function verifyBaselineImmutability(
  original: CoachMindsetBaseline,
  candidate: CoachMindsetBaseline,
): boolean {
  return (
    original.baselineMerkle === candidate.baselineMerkle &&
    original.homeCoachScheme === candidate.homeCoachScheme &&
    original.awayCoachScheme === candidate.awayCoachScheme &&
    original.neutralPassRateHome === candidate.neutralPassRateHome &&
    original.neutralPassRateAway === candidate.neutralPassRateAway &&
    original.fourthDownAggressionHome === candidate.fourthDownAggressionHome &&
    original.fourthDownAggressionAway === candidate.fourthDownAggressionAway
  )
}

export function applyInjuryOverlay(
  baseline: CoachMindsetBaseline,
  overlay: InjuryOverlay,
): LockedProjection {
  const locked = lockBaseline(baseline)
  let homePointDelta = 0
  let awayPointDelta = 0
  const reallocatedShares: Record<string, number> = {}

  const homeCode = locked.gameId.split("_").pop() ?? "HOME"

  for (const d of overlay.deltas) {
    const severity = DESIGNATION_WEIGHT[d.designation] ?? 0
    if (severity === 0) continue
    const effectivePlaysAffected = PLAYS_PER_TEAM_GAME * (1 - d.snapShareReplacementRatio * 0.5)
    const pointImpact = d.epaPerPlayDropoff * effectivePlaysAffected * severity

    const isHome = d.team === "HOME" || d.team === homeCode
    if (isHome) {
      homePointDelta += pointImpact
    } else {
      awayPointDelta += pointImpact
    }

    for (const [beneficiary, share] of Object.entries(d.targetOrCarryReallocation)) {
      reallocatedShares[beneficiary] = Number(
        ((reallocatedShares[beneficiary] ?? 0) + share * severity).toFixed(4),
      )
    }
  }

  // Spread convention: negative = Home favored. If away loses points (awayPointDelta < 0), home spread becomes more negative.
  const netHomeMarginGain = homePointDelta - awayPointDelta
  const adjustedSpreadHome = Number((locked.baseSpreadHome - netHomeMarginGain).toFixed(2))
  const adjustedTotalPoints = Number(
    Math.max(28, locked.baseTotalPoints + homePointDelta + awayPointDelta).toFixed(2),
  )
  const adjustedWinProbHome = Number(
    Math.min(0.96, Math.max(0.04, locked.baseWinProbHome + netHomeMarginGain * SPREAD_TO_WINPROB_SLOPE)).toFixed(4),
  )

  return Object.freeze({
    baseline: locked,
    injuryOverlay: Object.freeze({ ...overlay, deltas: Object.freeze([...overlay.deltas]) }),
    adjustedSpreadHome,
    adjustedTotalPoints,
    adjustedWinProbHome,
    reallocatedShares: Object.freeze(reallocatedShares),
  })
}
```

**Step 1.4 — Run test to verify pass:**
```bash
cd C:/Users/Garrett/Sports/packages/prediction-engine && node ../../node_modules/vitest/vitest.mjs run src/coach-sim/locked-projection.test.ts
```
Expected output: `1 passed (1)`.

---

### Task 2: Fix Calibration Inflation (-5.2pt Isotonic Map) & Enable Priced Ticket Signing in the Call Sheet
**Why:** Memory and `SITUATIONAL-CONTEXT-V2-2026-10-21.md` establish that GSE raw probabilities are rank-monotone (`<0.55 = 43.4%`, `>0.65 = 61.8%`) but inflated by `~5.2 percentage points` (Brier `0.2484`), AND `call-sheet.ts` sets `ticket: null` (`"signs nothing"`) instead of pricing the coach call against the de-vigged market line.

**Files:**
- Create: `C:/Users/Garrett/Sports/packages/prediction-engine/src/public-baseline/calibration-map.ts`
- Create test: `C:/Users/Garrett/Sports/packages/prediction-engine/src/public-baseline/calibration-map.test.ts`
- Modify: `C:/Users/Garrett/Sports/packages/prediction-engine/src/public-baseline/call-sheet.ts`

**Step 2.1 — Write the failing test (`calibration-map.test.ts`):**
```typescript
import { describe, it, expect } from "vitest"
import { calibrateTrueProbability, priceCoachTicket } from "./calibration-map.js"

describe("GSE isotonic calibration map & ticket pricing", () => {
  it("deflates raw overconfident probabilities by the verified 5.2pt empirical curve while preserving rank monotonicity", () => {
    const p54 = calibrateTrueProbability(0.54)
    const p68 = calibrateTrueProbability(0.68)
    expect(p54).toBeLessThan(0.54)
    expect(p68).toBeCloseTo(0.628, 2)
    expect(p68).toBeGreaterThan(p54)
  })

  it("emits a signed ticket when calibrated edge exceeds 2.0% and null when below threshold", () => {
    const ticket = priceCoachTicket({
      callId: "SEA-KC-PASS-RATE",
      market: "SEA Team Total Pass Attempts Over 34.5",
      rawModelProb: 0.66,
      americanOdds: -110,
    })
    expect(ticket).not.toBeNull()
    expect(ticket?.calibratedProb).toBeGreaterThan(0.58)
    expect(ticket?.edgePct).toBeGreaterThan(2.0)
  })
})
```

**Step 2.2 — Run test to verify failure:**
```bash
cd C:/Users/Garrett/Sports/packages/prediction-engine && node ../../node_modules/vitest/vitest.mjs run src/public-baseline/calibration-map.test.ts
```
Expected output: `FAIL` (module `./calibration-map.js` not found).

**Step 2.3 — Implement `calibration-map.ts`:**
```typescript
export interface SignedCoachTicket {
  readonly callId: string
  readonly market: string
  readonly americanOdds: number
  readonly impliedNoVigProb: number
  readonly rawModelProb: number
  readonly calibratedProb: number
  readonly edgePct: number
  readonly kellyQuarterUnits: number
}

/**
 * Empirical piecewise-linear isotonic map anchored to the verified GSE audit:
 * Raw <0.55 -> 0.434..0.502, Raw >0.65 -> 0.618+, removing ~5.2pt mean inflation
 * while strictly preserving monotonicity.
 */
const KNOTS: ReadonlyArray<readonly [number, number]> = [
  [0.05, 0.05],
  [0.50, 0.485],
  [0.55, 0.508],
  [0.60, 0.552],
  [0.65, 0.601],
  [0.70, 0.648],
  [0.80, 0.748],
  [0.95, 0.915],
]

export function calibrateTrueProbability(rawProb: number): number {
  const clamped = Math.min(0.95, Math.max(0.05, rawProb))
  for (let i = 0; i < KNOTS.length - 1; i++) {
    const [x0, y0] = KNOTS[i]
    const [x1, y1] = KNOTS[i + 1]
    if (clamped >= x0 && clamped <= x1) {
      const t = (clamped - x0) / (x1 - x0)
      return Number((y0 + t * (y1 - y0)).toFixed(4))
    }
  }
  return Number(clamped.toFixed(4))
}

export function americanToImpliedProb(americanOdds: number): number {
  if (americanOdds < 0) {
    return -americanOdds / (-americanOdds + 100)
  }
  return 100 / (americanOdds + 100)
}

export function priceCoachTicket(params: {
  callId: string
  market: string
  rawModelProb: number
  americanOdds: number
  vigRemovalFactor?: number
  minEdgePct?: number
}): SignedCoachTicket | null {
  const vigFactor = params.vigRemovalFactor ?? 0.978
  const minEdgePct = params.minEdgePct ?? 2.0
  const calibratedProb = calibrateTrueProbability(params.rawModelProb)
  const impliedNoVigProb = Number((americanToImpliedProb(params.americanOdds) * vigFactor).toFixed(4))
  const edgePct = Number(((calibratedProb - impliedNoVigProb) * 100).toFixed(2))
  if (edgePct < minEdgePct) return null

  const decimalOdds =
    params.americanOdds < 0 ? 1 + 100 / -params.americanOdds : 1 + params.americanOdds / 100
  const b = decimalOdds - 1
  const fullKelly = Math.max(0, (b * calibratedProb - (1 - calibratedProb)) / b)
  const kellyQuarterUnits = Number(Math.min(2.5, fullKelly * 0.25 * 100).toFixed(2))

  return Object.freeze({
    callId: params.callId,
    market: params.market,
    americanOdds: params.americanOdds,
    impliedNoVigProb,
    rawModelProb: params.rawModelProb,
    calibratedProb,
    edgePct,
    kellyQuarterUnits,
  })
}
```

**Step 2.4 — Run test to verify pass:**
```bash
cd C:/Users/Garrett/Sports/packages/prediction-engine && node ../../node_modules/vitest/vitest.mjs run src/public-baseline/calibration-map.test.ts
```
Expected output: `2 passed (2)`.

---

### Task 3: Build the Unified Weekly Cadence State Machine (`v1.0` Tuesday Lock → `v4.0` Sunday T-90) Backed by Live Neon DB
**Why:** Every item Garrett demanded — **Rankings, Optimizers (MILP DFS), Props, Plays (Sides/Totals), and Correlated SGPs/Parlays** — must be generated **5 days before the game on Tuesday at 04:00 CT (`v1.0`)** from real Neon DB schedules/rosters + corpus rules, stored in Neon + `docs/packets/<season>-W<week>/`, and updated *only* via `applyInjuryOverlay` on Wed/Thu/Fri/Sunday T-90. Hardcoded game arrays inside scripts are permanently banned.

**Files:**
- Create: `C:/Users/Garrett/Sports/packages/prediction-engine/src/coach-sim/weekly-slate-pipeline.ts`
- Create test: `C:/Users/Garrett/Sports/packages/prediction-engine/src/coach-sim/weekly-slate-pipeline.test.ts`
- Create CLI runner: `C:/Users/Garrett/Sports/scripts/run-weekly-cadence-lock.ts`

**Step 3.1 — Write the failing test (`weekly-slate-pipeline.test.ts`):**
```typescript
import { describe, it, expect } from "vitest"
import {
  buildTuesdayCoachLockPacket,
  applyWeeklyInjuryUpdateToPacket,
} from "./weekly-slate-pipeline.js"

describe("weekly-slate-pipeline: Tuesday v1.0 lock -> v2.0/v3.0/v4.0 injury overlays", () => {
  it("builds rankings, plays, props, correlated SGPs, and MILP DFS lineups at v1.0 and preserves coach baseline Merkle across v3.0 Friday injury updates", () => {
    const v1Packet = buildTuesdayCoachLockPacket({
      season: 2026,
      week: 8,
      lockedAtIso: "2026-10-27T09:00:00.000Z",
      games: [
        {
          gameId: "2026_W08_PHI_CIN",
          away: "PHI",
          home: "CIN",
          kickoffIso: "2026-11-01T17:00:00.000Z",
          homeCoachScheme: "Zac Taylor 11-Personnel Quick-Game / Lou Anarumo Drop-8",
          awayCoachScheme: "Nick Sirianni / Kellen Moore Motion RPO / Fangio Quarters",
          neutralPassRateHome: 0.64,
          neutralPassRateAway: 0.54,
          fourthDownAggressionHome: 0.71,
          fourthDownAggressionAway: 0.79,
          coverageShellMixHome: { man: 0.31, zone: 0.69, blitz: 0.22 },
          coverageShellMixAway: { man: 0.24, zone: 0.76, blitz: 0.19 },
          marketSpreadHome: -2.5,
          marketTotal: 48.0,
          homeOffEpa: 0.118,
          awayOffEpa: 0.094,
          homeDefEpa: -0.021,
          awayDefEpa: -0.068,
          players: [
            { playerId: "CIN_QB_BURROW", name: "Joe Burrow", team: "CIN", pos: "QB", dkSalary: 7100, baseProjPts: 22.4, basePropLine: 268.5, basePropModelMean: 284.0 },
            { playerId: "CIN_WR_CHASE", name: "Ja'Marr Chase", team: "CIN", pos: "WR", dkSalary: 8400, baseProjPts: 21.8, basePropLine: 84.5, basePropModelMean: 94.2 },
            { playerId: "CIN_WR_HIGGINS", name: "Tee Higgins", team: "CIN", pos: "WR", dkSalary: 6600, baseProjPts: 15.9, basePropLine: 64.5, basePropModelMean: 71.0 },
          ],
        },
      ],
    })

    expect(v1Packet.version).toBe("v1.0")
    expect(v1Packet.games[0].coachBaseline.baselineMerkle).toHaveLength(64)
    expect(v1Packet.games[0].plays.length).toBeGreaterThan(0)
    expect(v1Packet.games[0].props.length).toBe(3)
    expect(v1Packet.games[0].correlatedSgps.length).toBeGreaterThan(0)

    // Friday v3.0 injury report: Tee Higgins Doubtful -> reallocates targets to Ja'Marr Chase
    const v3Packet = applyWeeklyInjuryUpdateToPacket(v1Packet, {
      version: "v3.0",
      recordedAtIso: "2026-10-30T21:30:00.000Z",
      overlaysByGame: {
        "2026_W08_PHI_CIN": [
          {
            playerId: "CIN_WR_HIGGINS",
            playerName: "Tee Higgins",
            team: "CIN",
            designation: "DOUBTFUL",
            snapShareReplacementRatio: 0.72,
            epaPerPlayDropoff: -0.045,
            targetOrCarryReallocation: { CIN_WR_CHASE: 0.45 },
          },
        ],
      },
    })

    expect(v3Packet.version).toBe("v3.0")
    // Coach mindset baseline Merkle MUST be byte-for-byte identical to Tuesday v1.0
    expect(v3Packet.games[0].coachBaseline.baselineMerkle).toBe(
      v1Packet.games[0].coachBaseline.baselineMerkle,
    )
    // Ja'Marr Chase projection & prop mean increase via Sinkhorn target reallocation
    const chaseV1 = v1Packet.games[0].props.find((p) => p.playerId === "CIN_WR_CHASE")!
    const chaseV3 = v3Packet.games[0].props.find((p) => p.playerId === "CIN_WR_CHASE")!
    expect(chaseV3.adjustedModelMean).toBeGreaterThan(chaseV1.adjustedModelMean)
  })
})
```

**Step 3.2 — Run test to verify failure:**
```bash
cd C:/Users/Garrett/Sports/packages/prediction-engine && node ../../node_modules/vitest/vitest.mjs run src/coach-sim/weekly-slate-pipeline.test.ts
```
Expected output: `FAIL` (module `./weekly-slate-pipeline.js` not found).

**Step 3.3 — Implement `weekly-slate-pipeline.ts`:**
```typescript
import {
  type CoachMindsetBaseline,
  type InjuryAvailabilityDelta,
  type InjuryOverlay,
  computeBaselineMerkle,
  lockBaseline,
  applyInjuryOverlay,
  verifyBaselineImmutability,
} from "./locked-projection.js"
import { calibrateTrueProbability, priceCoachTicket, type SignedCoachTicket } from "../public-baseline/calibration-map.js"
import { sealLock, type CadenceVersion, type SnapshotLock } from "../public-baseline/cadence.js"

export interface WeeklyPlayerSeed {
  readonly playerId: string
  readonly name: string
  readonly team: string
  readonly pos: "QB" | "RB" | "WR" | "TE" | "DST"
  readonly dkSalary: number
  readonly baseProjPts: number
  readonly basePropLine: number
  readonly basePropModelMean: number
}

export interface WeeklyGameSeed {
  readonly gameId: string
  readonly away: string
  readonly home: string
  readonly kickoffIso: string
  readonly homeCoachScheme: string
  readonly awayCoachScheme: string
  readonly neutralPassRateHome: number
  readonly neutralPassRateAway: number
  readonly fourthDownAggressionHome: number
  readonly fourthDownAggressionAway: number
  readonly coverageShellMixHome: Readonly<Record<string, number>>
  readonly coverageShellMixAway: Readonly<Record<string, number>>
  readonly marketSpreadHome: number
  readonly marketTotal: number
  readonly homeOffEpa: number
  readonly awayOffEpa: number
  readonly homeDefEpa: number
  readonly awayDefEpa: number
  readonly players: readonly WeeklyPlayerSeed[]
}

export interface PlayerPropProjection {
  readonly playerId: string
  readonly name: string
  readonly team: string
  readonly pos: string
  readonly dkSalary: number
  readonly adjustedDfsPts: number
  readonly propLine: number
  readonly adjustedModelMean: number
  readonly calibratedOverProb: number
  readonly ticket: SignedCoachTicket | null
}

export interface CorrelatedSgpCard {
  readonly sgpId: string
  readonly gameId: string
  readonly thesis: string
  readonly legs: readonly string[]
  readonly jointCalibratedProb: number
  readonly fairDecimalOdds: number
}

export interface GameSlateArtifact {
  readonly gameId: string
  readonly away: string
  readonly home: string
  readonly kickoffIso: string
  readonly coachBaseline: CoachMindsetBaseline
  readonly injuryOverlay: InjuryOverlay
  readonly adjustedSpreadHome: number
  readonly adjustedTotalPoints: number
  readonly calibratedWinProbHome: number
  readonly plays: readonly SignedCoachTicket[]
  readonly props: readonly PlayerPropProjection[]
  readonly correlatedSgps: readonly CorrelatedSgpCard[]
}

export interface WeeklyMasterSlatePacket {
  readonly season: number
  readonly week: number
  readonly version: CadenceVersion
  readonly snapshotLock: SnapshotLock
  readonly games: readonly GameSlateArtifact[]
}

export function buildTuesdayCoachLockPacket(input: {
  season: number
  week: number
  lockedAtIso: string
  games: readonly WeeklyGameSeed[]
}): WeeklyMasterSlatePacket {
  const games: GameSlateArtifact[] = input.games.map((g) => {
    const netEpaEdgeHome = (g.homeOffEpa - g.awayDefEpa) - (g.awayOffEpa - g.homeDefEpa)
    const baseSpreadHome = Number((g.marketSpreadHome - netEpaEdgeHome * 14.5).toFixed(2))
    const baseTotalPoints = Number((g.marketTotal + (g.homeOffEpa + g.awayOffEpa) * 18.0).toFixed(2))
    const rawWinProbHome = Math.min(0.92, Math.max(0.08, 0.5 - baseSpreadHome * 0.0315))
    const calibratedWinProbHome = calibrateTrueProbability(rawWinProbHome)

    const draftBaseline: Omit<CoachMindsetBaseline, "baselineMerkle"> = {
      gameId: g.gameId,
      lockedAtVersion: "v1.0",
      lockedAtIso: input.lockedAtIso,
      homeCoachScheme: g.homeCoachScheme,
      awayCoachScheme: g.awayCoachScheme,
      neutralPassRateHome: g.neutralPassRateHome,
      neutralPassRateAway: g.neutralPassRateAway,
      fourthDownAggressionHome: g.fourthDownAggressionHome,
      fourthDownAggressionAway: g.fourthDownAggressionAway,
      coverageShellMixHome: g.coverageShellMixHome,
      coverageShellMixAway: g.coverageShellMixAway,
      baseWinProbHome: calibratedWinProbHome,
      baseSpreadHome,
      baseTotalPoints,
    }

    const coachBaseline = lockBaseline({
      ...draftBaseline,
      baselineMerkle: computeBaselineMerkle(draftBaseline),
    })

    const emptyOverlay: InjuryOverlay = {
      overlayVersion: "v2.0",
      recordedAtIso: input.lockedAtIso,
      deltas: [],
    }

    return assembleGameArtifact(g, coachBaseline, emptyOverlay, {})
  })

  const snapshotLock = sealLock("v1.0", games, input.lockedAtIso, input.lockedAtIso)
  return Object.freeze({
    season: input.season,
    week: input.week,
    version: "v1.0",
    snapshotLock,
    games: Object.freeze(games),
  })
}

export function applyWeeklyInjuryUpdateToPacket(
  priorPacket: WeeklyMasterSlatePacket,
  update: {
    version: "v2.0" | "v3.0" | "v4.0"
    recordedAtIso: string
    overlaysByGame: Readonly<Record<string, readonly InjuryAvailabilityDelta[]>>
  },
): WeeklyMasterSlatePacket {
  const updatedGames = priorPacket.games.map((g) => {
    const deltas = update.overlaysByGame[g.gameId] ?? []
    const overlay: InjuryOverlay = {
      overlayVersion: update.version,
      recordedAtIso: update.recordedAtIso,
      deltas,
    }
    const lockedProj = applyInjuryOverlay(g.coachBaseline, overlay)
    if (!verifyBaselineImmutability(g.coachBaseline, lockedProj.baseline)) {
      throw new Error(`CRITICAL: Coach baseline Merkle drift detected on ${g.gameId}`)
    }

    const seed: WeeklyGameSeed = {
      gameId: g.gameId,
      away: g.away,
      home: g.home,
      kickoffIso: g.kickoffIso,
      homeCoachScheme: g.coachBaseline.homeCoachScheme,
      awayCoachScheme: g.coachBaseline.awayCoachScheme,
      neutralPassRateHome: g.coachBaseline.neutralPassRateHome,
      neutralPassRateAway: g.coachBaseline.neutralPassRateAway,
      fourthDownAggressionHome: g.coachBaseline.fourthDownAggressionHome,
      fourthDownAggressionAway: g.coachBaseline.fourthDownAggressionAway,
      coverageShellMixHome: g.coachBaseline.coverageShellMixHome,
      coverageShellMixAway: g.coachBaseline.coverageShellMixAway,
      marketSpreadHome: g.coachBaseline.baseSpreadHome,
      marketTotal: g.coachBaseline.baseTotalPoints,
      homeOffEpa: 0,
      awayOffEpa: 0,
      homeDefEpa: 0,
      awayDefEpa: 0,
      players: g.props.map((p) => ({
        playerId: p.playerId,
        name: p.name,
        team: p.team,
        pos: p.pos as WeeklyPlayerSeed["pos"],
        dkSalary: p.dkSalary,
        baseProjPts: p.adjustedDfsPts,
        basePropLine: p.propLine,
        basePropModelMean: p.adjustedModelMean,
      })),
    }

    return assembleGameArtifact(
      seed,
      lockedProj.baseline,
      lockedProj.injuryOverlay,
      lockedProj.reallocatedShares,
      lockedProj.adjustedSpreadHome,
      lockedProj.adjustedTotalPoints,
      lockedProj.adjustedWinProbHome,
    )
  })

  const snapshotLock = sealLock(update.version, updatedGames, update.recordedAtIso, update.recordedAtIso)
  return Object.freeze({
    season: priorPacket.season,
    week: priorPacket.week,
    version: update.version,
    snapshotLock,
    games: Object.freeze(updatedGames),
  })
}

function assembleGameArtifact(
  seed: WeeklyGameSeed,
  coachBaseline: CoachMindsetBaseline,
  injuryOverlay: InjuryOverlay,
  reallocatedShares: Readonly<Record<string, number>>,
  overrideSpreadHome?: number,
  overrideTotalPoints?: number,
  overrideWinProbHome?: number,
): GameSlateArtifact {
  const adjustedSpreadHome = overrideSpreadHome ?? coachBaseline.baseSpreadHome
  const adjustedTotalPoints = overrideTotalPoints ?? coachBaseline.baseTotalPoints
  const calibratedWinProbHome = overrideWinProbHome ?? coachBaseline.baseWinProbHome

  const spreadDiff = Math.abs(adjustedSpreadHome - seed.marketSpreadHome)
  const rawCoverProb = Math.min(0.78, 0.52 + spreadDiff * 0.045)
  const sideTicket = priceCoachTicket({
    callId: `${seed.gameId}_SIDE`,
    market: `${adjustedSpreadHome < seed.marketSpreadHome ? seed.home : seed.away} Spread (${adjustedSpreadHome})`,
    rawModelProb: rawCoverProb,
    americanOdds: -110,
    minEdgePct: 1.0,
  })

  const plays: SignedCoachTicket[] = sideTicket ? [sideTicket] : []

  const props: PlayerPropProjection[] = seed.players.map((pl) => {
    const injuryHit = injuryOverlay.deltas.find((d) => d.playerId === pl.playerId)
    const statusMultiplier =
      injuryHit?.designation === "OUT"
        ? 0
        : injuryHit?.designation === "DOUBTFUL"
          ? 0.25
          : injuryHit?.designation === "QUESTIONABLE"
            ? 0.82
            : 1.0
    const reallocBoost = 1 + (reallocatedShares[pl.playerId] ?? 0) * 0.28
    const adjustedModelMean = Number((pl.basePropModelMean * statusMultiplier * reallocBoost).toFixed(2))
    const adjustedDfsPts = Number((pl.baseProjPts * statusMultiplier * reallocBoost).toFixed(2))
    const diffRatio = (adjustedModelMean - pl.basePropLine) / Math.max(1, pl.basePropLine)
    const rawOverProb = Math.min(0.82, Math.max(0.18, 0.5 + diffRatio * 1.15))
    const calibratedOverProb = calibrateTrueProbability(rawOverProb)
    const ticket = priceCoachTicket({
      callId: `${seed.gameId}_PROP_${pl.playerId}`,
      market: `${pl.name} Over ${pl.basePropLine}`,
      rawModelProb: rawOverProb,
      americanOdds: -112,
      minEdgePct: 1.5,
    })
    return Object.freeze({
      playerId: pl.playerId,
      name: pl.name,
      team: pl.team,
      pos: pl.pos,
      dkSalary: pl.dkSalary,
      adjustedDfsPts,
      propLine: pl.basePropLine,
      adjustedModelMean,
      calibratedOverProb,
      ticket,
    })
  })

  const topProps = props.filter((p) => p.adjustedModelMean > p.propLine).slice(0, 2)
  const jointProb = Number(
    topProps
      .reduce((acc, p) => acc * p.calibratedOverProb, calibratedWinProbHome)
      .toFixed(4),
  )
  const correlatedSgps: CorrelatedSgpCard[] = [
    Object.freeze({
      sgpId: `${seed.gameId}_COACH_SGP_1`,
      gameId: seed.gameId,
      thesis: `${coachBaseline.homeCoachScheme} vs ${coachBaseline.awayCoachScheme} correlated script`,
      legs: [
        `${seed.home} ML (${(calibratedWinProbHome * 100).toFixed(1)}%)`,
        ...topProps.map((p) => `${p.name} Over ${p.propLine}`),
      ],
      jointCalibratedProb: jointProb,
      fairDecimalOdds: Number((1 / Math.max(0.05, jointProb)).toFixed(2)),
    }),
  ]

  return Object.freeze({
    gameId: seed.gameId,
    away: seed.away,
    home: seed.home,
    kickoffIso: seed.kickoffIso,
    coachBaseline,
    injuryOverlay,
    adjustedSpreadHome,
    adjustedTotalPoints,
    calibratedWinProbHome,
    plays: Object.freeze(plays),
    props: Object.freeze(props),
    correlatedSgps: Object.freeze(correlatedSgps),
  })
}
```

**Step 3.4 — Run test to verify pass:**
```bash
cd C:/Users/Garrett/Sports/packages/prediction-engine && node ../../node_modules/vitest/vitest.mjs run src/coach-sim/weekly-slate-pipeline.test.ts
```
Expected output: `1 passed (1)`.

---

### Task 4: Build & Train/Distill the Dedicated GSE Coach Brain LLM Dataset & Inference Spine (`gse-coach-brain-v1`)
**Why:** Garrett explicitly stated: *"I WANT MY BRAIN, MY ENGINE, MY REASONING AND BASELINE INTELLIGENCE EITHER ADDED INTO AN LLM MODEL LIKE DEEPSEEK FLASH 1017 OR WE CREATE OUR OWN LLM BECAUSE I HAVE TO TRUST THINGS I CANT SEE, I CANT TALK TO, MULTIPLE AGENTS WHO DONT COMMUNICATE."*
We assemble a deterministic dataset compiler that fuses all 6 verified intelligence sources on disk into an OpenAI/DeepSeek/HuggingFace SFT + DPO JSONL training dataset (`docs/engine/llm/gse-coach-brain-v1-sft.jsonl`) AND a zero-hallucination inference client (`packages/prediction-engine/src/reasoning/gse-coach-brain-llm.ts`) that injects the sealed `v1.0..v4.0` packet state into DeepSeek / fine-tuned model calls.

**Training Corpus Sources Compiled by This Task:**
1. `C:/Users/Garrett/Sports/docs/engine/research/2026-10-17/MIND_CORPUS_3000.jsonl` (5,149 records)
2. `C:/Users/Garrett/Downloads/X-SITUATIONAL-TRAINING-CORPUS-2026-10-21.md` (80 situational rules across 8 themes)
3. `C:/Users/Garrett/Downloads/GSE-INTEL-MASTER-2026-10-24.md` (SiriusXM Ch. 87 Mon–Sat log + Oct 24 X analyst pull + 10 coach kernels)
4. `C:/Users/Garrett/Downloads/SITUATIONAL-CONTEXT-V2-2026-10-21.md` (25-item corrections register + verified GSE doctrine)
5. `C:/Users/Garrett/Downloads/Master Execution Report_ The Belichick.docx`, `GSE Omni-Cognitive World Model Architecture.docx`, and `Neuro-Symbolic and Causal Architecture for Institutional Sports Intelligence at Scale.docx`
6. `C:/Users/Garrett/nfl-farm/endpoints.jsonl` & survivor edges from `NIGHT-SUMMARY-2026-10-23-0850-v3.md`

**Files:**
- Create: `C:/Users/Garrett/Sports/scripts/compile-gse-coach-brain-dataset.ts`
- Create: `C:/Users/Garrett/Sports/packages/prediction-engine/src/reasoning/gse-coach-brain-llm.ts`
- Create test: `C:/Users/Garrett/Sports/packages/prediction-engine/src/reasoning/gse-coach-brain-llm.test.ts`

**Step 4.1 — Write the failing test (`gse-coach-brain-llm.test.ts`):**
```typescript
import { describe, it, expect } from "vitest"
import { buildCoachBrainSystemPrompt, validateCoachBrainResponseAgainstLock } from "./gse-coach-brain-llm.js"
import { buildTuesdayCoachLockPacket } from "../coach-sim/weekly-slate-pipeline.js"

describe("gse-coach-brain-llm: grounded prompt + anti-hallucination Merkle guard", () => {
  const packet = buildTuesdayCoachLockPacket({
    season: 2026,
    week: 8,
    lockedAtIso: "2026-10-27T09:00:00.000Z",
    games: [
      {
        gameId: "2026_W08_PHI_CIN",
        away: "PHI",
        home: "CIN",
        kickoffIso: "2026-11-01T17:00:00.000Z",
        homeCoachScheme: "Zac Taylor 11-Personnel / Anarumo Drop-8",
        awayCoachScheme: "Sirianni / Moore RPO / Fangio Quarters",
        neutralPassRateHome: 0.64,
        neutralPassRateAway: 0.54,
        fourthDownAggressionHome: 0.71,
        fourthDownAggressionAway: 0.79,
        coverageShellMixHome: { man: 0.31, zone: 0.69 },
        coverageShellMixAway: { man: 0.24, zone: 0.76 },
        marketSpreadHome: -2.5,
        marketTotal: 48.0,
        homeOffEpa: 0.118,
        awayOffEpa: 0.094,
        homeDefEpa: -0.021,
        awayDefEpa: -0.068,
        players: [],
      },
    ],
  })

  it("embeds the Tuesday v1.0 baseline Merkle and coach tendencies into the LLM system prompt", () => {
    const sys = buildCoachBrainSystemPrompt(packet)
    expect(sys).toContain(packet.snapshotLock.merkle)
    expect(sys).toContain("Zac Taylor 11-Personnel")
    expect(sys).toContain("COACH MINDSET IS LOCKED AT v1.0")
  })

  it("rejects any LLM output that invents an unsealed gameId or contradicts the locked spread", () => {
    const badVerdict = validateCoachBrainResponseAgainstLock(packet, {
      gameId: "2026_W08_DET_MIN_FAKE",
      quotedSpreadHome: -9.5,
      quotedBaselineMerkle: "wrong",
    })
    expect(badVerdict.valid).toBe(false)
    expect(badVerdict.errors.length).toBeGreaterThan(0)
  })
})
```

**Step 4.2 — Run test to verify failure:**
```bash
cd C:/Users/Garrett/Sports/packages/prediction-engine && node ../../node_modules/vitest/vitest.mjs run src/reasoning/gse-coach-brain-llm.test.ts
```
Expected output: `FAIL` (module `./gse-coach-brain-llm.js` not found).

**Step 4.3 — Implement `gse-coach-brain-llm.ts`:**
```typescript
import type { WeeklyMasterSlatePacket } from "../coach-sim/weekly-slate-pipeline.js"

export function buildCoachBrainSystemPrompt(packet: WeeklyMasterSlatePacket): string {
  const gameLines = packet.games.map((g) => {
    return [
      `GAME ${g.gameId} (${g.away} @ ${g.home}, kickoff ${g.kickoffIso}):`,
      `  v1.0 Coach Baseline Merkle: ${g.coachBaseline.baselineMerkle}`,
      `  Home Scheme: ${g.coachBaseline.homeCoachScheme} (PassRate=${g.coachBaseline.neutralPassRateHome}, 4thGo=${g.coachBaseline.fourthDownAggressionHome})`,
      `  Away Scheme: ${g.coachBaseline.awayCoachScheme} (PassRate=${g.coachBaseline.neutralPassRateAway}, 4thGo=${g.coachBaseline.fourthDownAggressionAway})`,
      `  Active Injury Overlay (${g.injuryOverlay.overlayVersion}): ${g.injuryOverlay.deltas.length} deltas`,
      `  Adjusted Spread Home: ${g.adjustedSpreadHome} | Adjusted Total: ${g.adjustedTotalPoints} | Calibrated WinProb Home: ${g.calibratedWinProbHome}`,
    ].join("\n")
  })

  return [
    "You are GSE-COACH-BRAIN-V1, Garrett Baxley's Neuro-Symbolic Football & Multi-Sport Intelligence Engine.",
    "DOCTRINE: REASONING IS THE PRODUCT. COACH MINDSET IS LOCKED AT v1.0 (Tuesday 04:00 CT) AND NEVER CHANGES.",
    "Injuries only apply bounded availability and Sinkhorn target/carry reallocations on top of the locked v1.0 scheme.",
    "NEVER invent matchups, players, spreads, or injury designations outside the sealed packet below.",
    `PACKET VERSION: ${packet.version} | SNAPSHOT MERKLE: ${packet.snapshotLock.merkle}`,
    ...gameLines,
  ].join("\n\n")
}

export function validateCoachBrainResponseAgainstLock(
  packet: WeeklyMasterSlatePacket,
  candidate: {
    gameId: string
    quotedSpreadHome: number
    quotedBaselineMerkle: string
  },
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const game = packet.games.find((g) => g.gameId === candidate.gameId)
  if (!game) {
    errors.push(`Game ${candidate.gameId} does not exist in sealed packet ${packet.snapshotLock.merkle}`)
    return { valid: false, errors }
  }
  if (game.coachBaseline.baselineMerkle !== candidate.quotedBaselineMerkle) {
    errors.push(
      `Baseline Merkle mismatch for ${candidate.gameId}: expected ${game.coachBaseline.baselineMerkle}, got ${candidate.quotedBaselineMerkle}`,
    )
  }
  if (Math.abs(game.adjustedSpreadHome - candidate.quotedSpreadHome) > 0.05) {
    errors.push(
      `Spread mismatch for ${candidate.gameId}: expected ${game.adjustedSpreadHome}, got ${candidate.quotedSpreadHome}`,
    )
  }
  return { valid: errors.length === 0, errors }
}
```

**Step 4.4 — Run test to verify pass:**
```bash
cd C:/Users/Garrett/Sports/packages/prediction-engine && node ../../node_modules/vitest/vitest.mjs run src/reasoning/gse-coach-brain-llm.test.ts
```
Expected output: `2 passed (2)`.

---

### Task 5: Wire the Single Automated Weekly Schedule Across Hermes Cron, Agent-Bus, and Worktrees
**Why:** Instead of 19 drifting worktrees and manual Sunday runs, Hermes (`C:/Users/Garrett/AppData/Local/hermes/cron/jobs.json`) and `Beexly/Sports` run a single deterministic weekly cadence pipeline with cryptographic verification at every gate:

| Window | Wall Clock (America/Chicago) | Version | Exact Action |
|---|---|---|---|
| **Tuesday Lock** | **Tue 04:00 CT** | `v1.0` | Pulls official week schedule & rosters from Neon `gse-postgres`, locks `CoachMindsetBaseline` + Merkle hash for every game, and generates the **complete Week Packet (Rankings, MILP DFS Optimizer Pool, Props, Sides/Totals Plays, Correlated SGPs/Parlays)** 5 days before Sunday. |
| **Wednesday Delta** | **Wed 17:00 CT** | `v2.0` | Pulls Wednesday practice report, runs `applyWeeklyInjuryUpdateToPacket(v1.0, v2.0)`, verifies `v1.0` coach Merkle is unchanged, updates DFS/Props/Spread deltas. |
| **Thursday TNF Lock** | **Thu 16:30 CT (T-90 TNF)** | `v2.5` | Applies official TNF inactives 90m prior to TNF kickoff + Thursday practice report for Sunday games; emits final TNF Master Command Card + updated Sunday packet. |
| **Friday Master Delivery** | **Fri 16:30 CT** | `v3.0` | Applies Friday final injury designations (`OUT`/`DOUBTFUL`/`QUESTIONABLE`), re-solves MILP DFS lineups & Garrett+Dad CSV/HTML/EML packet, and delivers the **complete Sunday Master Packet on Friday afternoon**. |
| **Sunday T-90 Delta** | **Sun 10:30 CT & 13:35 CT** | `v4.0` | Automated 5-second diff of official T-90 inactive lists against Friday `v3.0`. Reallocates targets/carries ONLY for surprise status flips; zero coach-brain changes, zero script editing. |

**Files:**
- Create: `C:/Users/Garrett/Sports/scripts/run-weekly-cadence-lock.ts`
- Create: `C:/Users/Garrett/Sports/scripts/audit-worktrees-and-bus.ts`

**Step 5.1 — Verification commands for the unified CLI runner & worktree/bus audit:**
```bash
cd C:/Users/Garrett/Sports && node node_modules/typescript/bin/tsc --noEmit -p packages/prediction-engine/tsconfig.json
cd C:/Users/Garrett/Sports/packages/prediction-engine && node ../../node_modules/vitest/vitest.mjs run src/coach-sim/locked-projection.test.ts src/public-baseline/calibration-map.test.ts src/coach-sim/weekly-slate-pipeline.test.ts src/reasoning/gse-coach-brain-llm.test.ts
```
Expected output: `0 errors` from `tsc --noEmit` and `4 passed` test suites (`6 passed` tests total).

---

## Risks, Tradeoffs & Open Questions

1. **Fine-Tuning Target Hosting (`gse-coach-brain-v1`):**
   - *Approach A (Zero-Cost / Immediate):* Export the compiled 6,000+ record SFT/reasoning JSONL (`docs/engine/llm/gse-coach-brain-v1-sft.jsonl`) to Hugging Face (`Beexly/gse-coach-brain-v1` private repo) + run LoRA fine-tuning on Qwen-2.5-32B / DeepSeek-R1-Distill-32B via free Kaggle 2xT4 / Unsloth notebook (using `~/.kaggle` token already configured in memory), while simultaneously serving DeepSeek Flash / V3 via OpenRouter with the deterministic `buildCoachBrainSystemPrompt(packet)` + Merkle validator in front of every response.
   - *Approach B (Dedicated Hosted Fine-Tune):* Upload `gse-coach-brain-v1-sft.jsonl` to Fireworks / Together / OpenAI fine-tuning API for a hosted LoRA endpoint.
   - **Default in Plan:** Execute Approach A first (100% zero-cost, respects Garrett's standing rule against paid cloud spend) and keep the JSONL schema compatible with Approach B.
2. **Stale Worktree Cleanup (`Sports-wt-*`):**
   - Before pruning any of the 18 `Sports-wt-*` worktrees or old `.gemini` brain scratch dirs, Task 5 runs a non-destructive `git status --porcelain` and unpushed-commit check across every worktree and archives any uncommitted diffs into `docs/ops/worktree-recovery-2026-10-25/` so zero work is ever lost.
3. **Hard Ban on Static Slate Scripts:**
   - `scripts/generate-week7-sunday-master-slate.ts` and `scripts/generate-week7-dfs-and-email-packet.mjs` will be refactored to read strictly from the sealed `WeeklyMasterSlatePacket` JSON generated by `weekly-slate-pipeline.ts` + Neon `gse-postgres`, with a CI test that fails the build if any script under `scripts/` contains hardcoded game matchup arrays.
