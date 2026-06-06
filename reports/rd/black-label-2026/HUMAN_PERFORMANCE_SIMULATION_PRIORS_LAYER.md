# Human Performance + Simulation Priors Layer — R&D Design
**Project:** Galaxy Sports Edge · Black Label 2026
**Status:** Design / R&D (not yet built)
**Author:** Claude (Opus 4.8) · 2026-06-06
**One-line:** A confidence-band layer that turns public human-performance and game-simulation signals into *better questions about uncertainty* — never claims about a player's body, never a rating treated as truth.

---

## 0. Mission & non-negotiable guardrails

This layer does **not** predict health and does **not** assert a player's medical state. It asks: *is this player's availability, explosiveness, fatigue, role, surface, travel, equipment, training environment, or simulated skill profile changing our confidence band — and should the read become a play, a watchlist, or a no-bet?*

**ABSOLUTE RULES (enforced in code + copy, not just intent):**
1. **No private medical knowledge.** We ingest only public injury reports, public practice status, and public environment grades. No restricted medical/team systems, ever.
2. **No diagnosis, no prognosis.** We never say "he is hurt," "he will re-injure," or "he is at X% health." We say "availability uncertain per public report" and widen the band.
3. **No scraping ToS-protected medical/team systems** (Kitman, Zone7, Catapult, VALD, club internal load data). Those are licensed/admin-only or nothing.
4. **Video-game ratings are PRIORs, never truth.** Madden/2K/EA FC/The Show/FM/OOTP are structured human+model scouting judgments. They enter as low-weight priors compared against real production and market behavior — and only where the source license allows ingestion.
5. **Every signal carries provenance + a license/risk note.** Same discipline as the data-source registry (`packages/data-ingestion/src/source-registry.ts`): a signal that isn't legally clear does not ship.
6. **The layer only ever WIDENS uncertainty or downgrades to watchlist/no-bet.** It is a conservative modifier. It may reduce confidence; it may never manufacture confidence from a video-game number or an inferred injury.

> If a stat here cannot be sourced legally and described honestly, it does not render. This is the same rule that already governs `/data` and the source registry.

---

## 1. Architecture

### 1.1 Where it sits
```
        PUBLIC / LICENSED SIGNALS                 GSE ENGINE
 ┌───────────────────────────────────┐     ┌──────────────────────┐
 │ Simulation Priors (game ratings)  │     │ market-derived edge   │
 │ Performance Environment Score     │ ──▶ │ + nflverse trends     │
 │ Biomech/Movement Readiness (R&D)  │     │ + signals             │
 │ Human Availability Modifier       │     └──────────┬───────────┘
 └───────────────┬───────────────────┘                │
                 │ confidence-band deltas only         ▼
                 └────────────────────────────▶  CONFIDENCE BAND
                                                 (widen / hold)
                                                       │
                                                       ▼
                                          NO-BET / WATCHLIST / PLAY GATE
                                                       │
                                                       ▼
                                       GSE OUTPUT BEHAVIOR (what/why/confidence/
                                       what-could-break/provenance tier)
```

The layer is **read-only and additive**. It never overwrites the market-derived model output. It emits *band deltas* (uncertainty widening) and *provenance tags*, which the existing gate logic (`apps/web/lib/board/*`, the engine's confidence + `canPublish` gates) consumes. It is the human-uncertainty complement to the market/statistical core.

### 1.2 The four signal objects + one contract
1. **Simulation Prior** — public game-rating scouting profile (prior-only).
2. **Performance Environment Score** — team-context quality from public grades.
3. **Biomechanics / Movement Modeling Readiness** — future-facing video/pose layer; ships as a *readiness scaffold*, not live claims.
4. **Human Availability Modifier** — the conservative uncertainty multiplier that actually touches the band.
5. **GSE Output Behavior** — the mandatory disclosure contract every public output must satisfy.

### 1.3 Provenance tiers (every datum is one of)
`official` · `licensed` · `modeled` · `inferred` · `illustrative`. Public surfaces must render the tier. `inferred`/`illustrative` can never raise confidence.

### 1.4 Access tiers
- **public** — render to anyone (NWS weather, public injury report status, NFLPA report-card grades, surface/venue facts).
- **paid** — behind entitlement (licensed feeds: salaries, licensed sim ratings if ever licensed, advanced derived models).
- **admin-only / founder-gated** — anything from a licensed vendor (Kitman/Zone7/Catapult/VALD), any raw video-derived biomechanics, any conflicting-source raw detail. Never public.

---

## 2. Data sources & source-risk table

Verdict legend (mirrors the source registry): **FREE-INGEST** (open/permissive, commercial OK) · **FREE-ATTRIB** (free commercial w/ credit) · **PRIOR-MANUAL** (don't auto-scrape; ingest as a manually-entered/licensed seasonal snapshot, prior-only) · **PAID/LICENSED** · **ADMIN-ONLY** (licensed vendor, partnership only) · **FORBIDDEN**.

| Source | Layer | Access | License / ToS reality | Tier | VERDICT |
|---|---|---|---|---|---|
| **EA Madden ratings** (ea.com/.../madden-nfl/ratings) | Sim prior | web (no public API) | EA ToS bars automated/commercial reuse | paid/admin | **PRIOR-MANUAL** — snapshot for internal prior; do not auto-scrape or republish raw |
| **EA College Football 26 ratings** | Sim prior | web | EA ToS | paid/admin | **PRIOR-MANUAL** |
| **NBA 2K ratings** (nba.2k.com, 2kratings.com, 2kdb.net) | Sim prior | web | 2K ToS; fan sites unlicensed | paid/admin | **PRIOR-MANUAL** — fan aggregators are not a license |
| **EA FC ratings** (ea.com, fcratings.com, fifacm, easysbc) | Sim prior | web | EA ToS; fan sites unlicensed | paid/admin | **PRIOR-MANUAL** |
| **MLB The Show** (showzone.gg, showdd.io) | Sim prior | web | Sony/SDS ToS; fan sites unlicensed | paid/admin | **PRIOR-MANUAL** |
| **Football Manager DBs** (fminside, sortitoutsi, fmdatalab) | Sim prior | web/bulk | SI/fan-DB terms; redistribution restricted | paid/admin | **PRIOR-MANUAL** |
| **OOTP baseball** (ootpdevelopments) | Sim prior | product | proprietary | paid/admin | **PRIOR-MANUAL** |
| **NFLPA Report Cards** (nflpa.com/report-cards) | Environment | web (public report) | public-facing report; cite source | public | **FREE-ATTRIB** — environment-quality proxy |
| **NFL Player Health & Safety** (injury data, field-surface research) | Environment/avail | web (public) | NFL public data pages; cite | public | **FREE-ATTRIB** — aggregate/published only |
| **Public injury reports** (league official designations; nflverse `injuries`) | Availability | bulk/API | nflverse CC-BY (already ingested) | public | **FREE-ATTRIB** (already in `/players/injuries`) |
| **NWS weather** (api.weather.gov) | Environment | public API | US-gov public domain | public | **FREE-INGEST** (already shipped `/weather`) |
| **GSSI / BJSM / JOSPT / JSSM / ACSM / NSCA** | Methodology | research | copyrighted research; cite, don't reproduce | public | **METHODOLOGY-ONLY** — informs formulas, not player data |
| **Training Ground Guru** (profiles, staff moves) | Environment | web | editorial; cite headlines, no bulk scrape | public | **FREE-ATTRIB (manual cite)** |
| **Kitman Labs / Zone7 / Catapult / VALD** | Biomech/load | vendor API | proprietary athlete data; club-licensed | admin-only | **ADMIN-ONLY** — partnership only, never scrape, never public |
| **OpenCap / OpenSim / AddBiomechanics** | Biomech | OSS | OpenSim Apache-2.0; OpenCap research-use — verify | admin/R&D | **R&D — verify license per repo; needs rights+consent for any video** |
| **MediaPipe Pose** | Pose | OSS | Apache-2.0 | admin/R&D | **R&D-OK (Apache-2.0)** — on video we have rights to |
| **MMPose** | Pose | OSS | Apache-2.0 | admin/R&D | **R&D-OK** |
| **OpenPose (CMU)** | Pose | OSS | **non-commercial / academic license** | — | **FORBIDDEN (commercial)** — license bars commercial use |
| **SportsPose / AthletePose3D / SportsMOT / SportsLabKit / TeamTrack / OpenSTARLab / databallpy / kloppy** | Tracking | OSS/datasets | per-repo (MIT/Apache/dataset terms) — verify each | admin/R&D | **R&D — per-repo verify; dataset licenses vary** |
| **three.js / react-three-fiber / drei / deck.gl / kepler.gl / model-viewer** | 3D viz | OSS | MIT | public (viz only) | **FREE-INGEST (MIT)** — for digital-twin rendering, no data claim |
| **Babylon.js / Cesium** | 3D viz | OSS | Apache-2.0 | public (viz) | **FREE-INGEST (Apache-2.0)** |
| **Spline / Vectary / Sketchfab / CGTrader / cadmapper** | 3D assets | service | per-asset license | — | **PER-ASSET VERIFY** — only assets we license/own |

### 2.1 Licensing warnings (read before any ingestion)
- **Game-rating sites are not a data license.** EA/2K/SDS publish ratings for marketing; their ToS bar automated/commercial reuse, and fan aggregators (2kratings, sortitoutsi, fcratings, showzone) hold no redistribution rights to grant us. **Default = PRIOR-MANUAL:** a human enters or licenses a *seasonal snapshot*; we store it as a low-weight prior with a `license/risk note`, and we never republish the raw rating table or imply it's official. If we want this live + legal, pursue an actual data license or build our own scouting model.
- **OpenPose is non-commercial.** Do not use it in the product. Prefer MediaPipe / MMPose (Apache-2.0). Verify every biomechanics repo's license individually before any use.
- **Any video-derived biomechanics requires rights to the video + (for non-broadcast) consent.** Broadcast/copyrighted footage cannot be ingested wholesale. This layer ships as *readiness scaffolding* until a rights-clean video pipeline exists.
- **Vendor athlete platforms (Kitman/Zone7/Catapult/VALD) are admin-only.** They contain private athlete load/medical data licensed to clubs. We never scrape them and never surface their data publicly; integration is partnership-gated and stays admin-only.

---

## 3. The five objects

### 3.1 Simulation Prior
A public game-rating scouting profile — **prior-only**, never truth.

Fields: `source`, `sourceTier` (provenance), player identity (`playerId`, `gsisId?`, `name`), `sport`, `team`, `position`, `overall`, `speedPace`, `strengthPhysicality`, `agilityCOD`, `awarenessIQ`, `injuryDurability`, `potentialDevelopment`, `tendenciesArchetype`, `updatedAt`, `licenseRiskNote`, `confidence: "prior-only"`, `weightCap` (hard ceiling on how much it can move anything).

### 3.2 Performance Environment Score
Team-context quality from public grades (0–100, with per-factor sub-scores + source).
Factors: `facilityQuality`, `trainingRoom`, `trainingStaff`, `nutritionDietician`, `weightRoom`, `strengthCoaches`, `travelConditions`, `surfaceQuality`, `scheduleFatigue`, `climateContext`, `coachingStability`, `staffContinuity`. Each factor: `{ value, source, tier, asOf }`. Primary public input today: NFLPA report cards + venue/surface facts + NWS climate + public staff-continuity news.

### 3.3 Biomechanics / Movement Modeling Readiness
Future-facing. Ships as a **readiness object** describing *capability state*, not live player claims:
`poseEstimation`, `movementQuality`, `jumpLandingCutSprint`, `gaitCODProxies`, `videoTracking`, `playerSpacing`, `accelDecel`, `workloadProxy`, `returnToPlayUncertainty` — each `{ status: "not-built" | "r&d" | "admin-only" | "live", rightsCleared: boolean, note }`. No public player biomechanics until rights + license + validation exist.

### 3.4 Human Availability Modifier
The conservative uncertainty multiplier — the only object that touches the band.
Inputs: `confirmedInjuryStatus` (official designation only), `injuryHistoryContext` (public), `daysSinceLastGame`, `travelLoad`, `surfaceWeatherStress`, `roleVolatility`, `snapMinuteWorkload`, `publicPracticeStatus`, `marketMoveAfterNews`, `conflictingSourcePenalty`.
Output: `bandWidenPct` (≥ 0, capped), `recommendation: "play" | "watchlist" | "no-bet"`, `drivers[]`, `confidence`, `tier`.

### 3.5 GSE Output Behavior (mandatory contract)
Every public-facing output of this layer MUST emit:
`whatChanged`, `whyItMatters`, `confidence` (0–1 + label), `whatCouldBreakTheRead`, `provenanceTier` (`official|modeled|inferred|illustrative`), `verdict` (`play|watchlist|no-bet`). Missing any field → the surface renders the honest empty/uncertain state, not a number.

---

## 4. Database schema sketch (Prisma; founder-gated migration)

> All new models; requires a migration (founder-gated, per existing canonical-history gate). Until then the layer runs read-only/compute-at-request like the nflverse libs.

```prisma
model SimulationPrior {
  id              String   @id @default(cuid())
  source          String   // "madden26" | "nba2k26" | "eafc26" | ...
  sourceTier      String   // provenance tier
  playerId        String?  // internal/gsis when mapped
  name            String
  sport           String
  team            String?
  position        String?
  overall         Int?
  speedPace       Int?
  strength        Int?
  agilityCod      Int?
  awarenessIq     Int?
  injuryDurability Int?
  potential       Int?
  archetype       String?
  updatedAt       DateTime
  licenseRiskNote String
  weightCap       Float    @default(0.05) // max share of any band move
  @@index([sport, position])
  @@index([playerId])
}

model PerformanceEnvironmentScore {
  id           String  @id @default(cuid())
  team         String
  sport        String
  asOf         DateTime
  overall      Int     // 0-100
  factors      Json    // { facilityQuality:{value,source,tier,asOf}, ... }
  sourceNote   String
  @@unique([team, sport, asOf])
}

model HumanAvailabilityModifier {
  id              String   @id @default(cuid())
  playerId        String
  gameId          String?
  asOf            DateTime
  bandWidenPct    Float    // >= 0
  recommendation  String   // play | watchlist | no-bet
  drivers         Json     // [{ key, weight, tier, note }]
  confidence      Float
  tier            String
  @@index([playerId, gameId])
}

model BiomechReadiness {
  id        String  @id @default(cuid())
  capability String // "pose" | "gait" | ...
  status    String  // not-built | r&d | admin-only | live
  rightsCleared Boolean @default(false)
  note      String
}
```

---

## 5. TypeScript type sketch (`apps/web/lib/human-performance/types.ts`)

```ts
export type ProvenanceTier = "official" | "licensed" | "modeled" | "inferred" | "illustrative";
export type Verdict = "play" | "watchlist" | "no-bet";

export interface SimulationPrior {
  readonly source: string;
  readonly sourceTier: ProvenanceTier;
  readonly name: string;
  readonly playerId: string | null;
  readonly sport: string;
  readonly team: string | null;
  readonly position: string | null;
  readonly ratings: Readonly<{ overall?: number; speed?: number; strength?: number; agility?: number; awareness?: number; durability?: number; potential?: number }>;
  readonly archetype: string | null;
  readonly updatedAt: string;
  readonly licenseRiskNote: string;
  readonly confidence: "prior-only";
  readonly weightCap: number; // hard ceiling, e.g. 0.05
}

export interface EnvironmentFactor { readonly value: number; readonly source: string; readonly tier: ProvenanceTier; readonly asOf: string; }
export interface PerformanceEnvironmentScore {
  readonly team: string; readonly sport: string; readonly asOf: string;
  readonly overall: number; // 0-100
  readonly factors: Readonly<Record<string, EnvironmentFactor>>;
}

export interface AvailabilityDriver { readonly key: string; readonly weight: number; readonly tier: ProvenanceTier; readonly note: string; }
export interface HumanAvailabilityModifier {
  readonly playerId: string; readonly gameId: string | null; readonly asOf: string;
  readonly bandWidenPct: number;   // >= 0, capped
  readonly recommendation: Verdict;
  readonly drivers: readonly AvailabilityDriver[];
  readonly confidence: number; readonly tier: ProvenanceTier;
}

export interface GseOutputBehavior {
  readonly whatChanged: string; readonly whyItMatters: string;
  readonly confidence: number; readonly confidenceLabel: string;
  readonly whatCouldBreakTheRead: string;
  readonly provenanceTier: ProvenanceTier; readonly verdict: Verdict;
}
```

---

## 6. API route sketch (all `force-dynamic`, read-only, gated)

```
GET /api/human/simulation-prior?playerId=    -> { success, data: SimulationPrior | gated }   // paid/admin per source license
GET /api/human/environment?team=&sport=      -> { success, data: PerformanceEnvironmentScore } // public (NFLPA/venue/NWS-derived)
GET /api/human/availability?playerId=&gameId= -> { success, data: HumanAvailabilityModifier }   // public status; admin detail gated
GET /api/human/readiness                      -> { success, data: BiomechReadiness[] }          // public capability state
```
Each route obeys `assertIngestible(sourceId)` on its inputs and returns the honest gated/empty state when a source is paid/admin/forbidden or absent. No route ever returns a medical claim.

---

## 7. Scoring formula draft

**Performance Environment Score** (0–100): weighted mean of available public factors (re-normalized over present factors so missing data never fabricates a score).
```
PES = Σ(wᵢ · factorᵢ) / Σ(wᵢ over present factors)
default weights: surfaceQuality .15, scheduleFatigue .15, travelConditions .12, trainingStaff .12,
  trainingRoom .10, strengthCoaches .10, weightRoom .08, nutrition .08, coachingStability .06, facility .04
```

**Human Availability Modifier** — confidence-band widening, conservative & capped:
```
bandWidenPct = clamp(
   0.40·injuryStatusFactor      // OUT→n/a(no-bet), DOUBTFUL high, QUESTIONABLE med, none 0
 + 0.15·workloadFatigue          // daysSinceLastGame, snap/min load, travel
 + 0.15·surfaceWeatherStress     // from PES surface + NWS wind/precip/temp
 + 0.10·roleVolatility           // depth-chart/role change risk
 + 0.10·marketMoveAfterNews      // line moved on news = corroboration
 + 0.10·conflictingSourcePenalty // sources disagree → widen, never narrow
 , 0, 0.60)                      // never widen more than 60%; never negative

verdict:
  OUT (official)                      -> no-bet (player-dependent reads)
  bandWidenPct ≥ 0.35 OR conflict     -> watchlist
  else                                -> play (band applied)
```
**Simulation Prior** contributes only via `weightCap` (≤ ~5%) as a tie-breaker/scouting context on archetype/role — it can flag "model and game-rating disagree on this player's explosiveness" (a *watchlist* nudge), but it can never move a price or raise confidence on its own.

**Core principle:** every term can only *widen* the band or trigger watchlist/no-bet. There is no term that narrows the band from a human-performance or game-rating signal.

---

## 8. No-bet integration

This layer plugs into the existing gate (the same posture as `canPublish`/board gating):
- **Official OUT / late scratch on a player-dependent read** → **no-bet** (or auto-void the read), with `whatChanged` = the official designation.
- **bandWidenPct ≥ threshold or conflicting sources** → **watchlist** (show the read, mark it not-actionable, explain the uncertainty).
- **All clear** → **play**, with the widened band applied to confidence and the drivers shown.
- **Source conflict is a first-class downgrade:** if public reports / market / sim-prior disagree, we *widen and surface the conflict*, never average it into false precision.

---

## 9. Worked examples

- **NFL:** Star WR `Questionable` (public), Lambeau, NWS wind 22 mph, 4 days rest, line moved toward the under. Modifier: status med + surface/weather high + market corroboration → bandWidenPct ≈ 0.34 → **watchlist**; `whatCouldBreak` = "if he's a full practice Friday, wind is the real driver." Provenance: official (status) + official (NWS) + modeled (band).
- **NBA:** Guard on 2nd night of a back-to-back, 3rd game in 4 nights, no injury designation. Workload/fatigue term widens band modestly → **play** with reduced confidence; sim-prior (2K) agility tier is context only.
- **MLB:** Pitcher with public soreness note pre-start + travel; conflicting beat reports → conflict penalty → **watchlist** until lineup/roster confirms.
- **Soccer:** Rotation risk before a midweek fixture (role volatility) + public manager presser hints → widen + **watchlist**; openfootball/public sources only.
- **Fantasy:** Same availability modifier downgrades a start/sit confidence and annotates "role volatility — handcuff up" rather than asserting health.
- **DFS:** Modifier feeds the optimizer as an **uncertainty tag** (not a projection edit): high-widen players get a "volatile" badge and an exposure caution; OUT players are removed; sim-prior archetype shown as scouting context only.

---

## 10. What NOT to claim (copy + code rules)
- ❌ "He's hurt / he'll re-aggravate / he's at 80%." ✅ "Availability uncertain per public report; band widened."
- ❌ "Madden says he's a 92 so he's elite." ✅ "Game-rating prior (Madden, prior-only) and our model disagree on explosiveness — watchlist."
- ❌ Any private/club/medical data. ✅ Only public designations, public grades, public research methodology.
- ❌ Imply biomechanics on broadcast video we don't have rights to. ✅ "Movement modeling: R&D, rights-gated."
- ❌ Present a vendor's (Kitman/Zone7/Catapult/VALD) athlete data publicly. ✅ Admin-only, partnership-gated, or absent.

---

## 11. Build order

**What Claude builds first (smallest legal, highest value):**
1. `lib/human-performance/types.ts` + the **GSE Output Behavior** contract helper (so every later surface is forced to disclose).
2. **Performance Environment Score** from already-legal public inputs we hold: NWS surface/climate (live) + a manually-curated NFLPA report-card snapshot (public, attributed) + venue surface facts. `/api/human/environment` + a public `/intel/environment` surface. (No new licenses needed.)
3. **Human Availability Modifier** wired to the existing public `injuries` feed + NWS + schedule rest, emitting band deltas into the board's no-bet/watchlist gate. Read-only, conservative, capped.
4. **BiomechReadiness** scaffold (`/api/human/readiness`) honestly reporting "not-built/R&D/admin-only" — sets the frame without overclaiming.
5. **Simulation Prior** LAST and gated: ship the *model + empty gated surface* first; populate only from a licensed/manual snapshot with `weightCap` ≤ 5% and prior-only confidence. Register each rating source in `source-registry.ts` with its real verdict before any ingestion.

**What Codex should audit first:**
1. **Guardrail audit** — grep all new copy/types for any health/diagnosis claim; confirm the modifier can only widen (no narrowing path), and that `weightCap` on sim-priors is enforced.
2. **License/provenance audit** — every source rendered has a registry entry + tier; no PRIOR-MANUAL source is auto-fetched; no ADMIN-ONLY/ FORBIDDEN source is reachable from a public route.
3. **No-bet integration audit** — official OUT → no-bet path is correct and can't be overridden by a sim-prior; conflicting-source penalty always widens.
4. **PII/medical scan** — confirm no storage of medical detail beyond public designation strings.

---

## 12. R&D link stack (categorized, with verdicts)

**3D / spatial / digital-twin (viz only — safe):** three.js (MIT), react-three-fiber + drei (MIT), deck.gl / kepler.gl (MIT), model-viewer (Apache-2.0), Babylon.js / Cesium (Apache-2.0). Spline/Vectary/Sketchfab/CGTrader/cadmapper = per-asset license. → build the "League Twin / digital-twin" rendering on the MIT/Apache stack; never implies data we don't have.

**Biomechanics / pose / motion (R&D, rights-gated):** OpenCap + opensim (Stanford), AddBiomechanics, MediaPipe (Apache-2.0), MMPose (Apache-2.0), SportsPose / AthletePose3D / SportsMOT / SportsLabKit / TeamTrack / OpenSTARLab / databallpy / kloppy (verify per repo). **OpenPose = non-commercial → forbidden for us.** All require rights-clean video + consent.

**Game-rating / simulation (PRIOR-MANUAL, license-gated):** EA Madden / EA CFB 26 / EA FC, NBA 2K (+2kratings/2kdb fan sites — unlicensed), MLB The Show (showzone/showdd), Football Manager DBs (fminside/sortitoutsi/fmdatalab), OOTP. → snapshots only, prior-only, weight-capped, never republished raw.

**Sports science / training / human performance:** NFLPA report cards (public proxy ✅), NFL PH&S injury/surface pages (public ✅), GSSI/BJSM/JOSPT/JSSM/ACSM/NSCA (methodology-only), Training Ground Guru (cite). **Vendor platforms Kitman/Zone7/Catapult/VALD = admin-only/partnership.**

---

## 13. Bottom line
This layer makes GSE *more honest about uncertainty*, not more confident. It converts public human-performance and game-simulation signals into band-widening, watchlist, and no-bet decisions — each tagged with provenance, license, and "what could break the read." It never claims a body, never trusts a video-game number, and never touches a system it isn't licensed to read. Build the environment + availability pieces first (already-legal public data), scaffold biomechanics honestly, and gate simulation priors behind real licensing.
