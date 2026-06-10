# 12 — SiriusXM Channel 87 Source Catalog & Airwave Ingestion Design

> Data Mesh program. **Research + design doc only — nothing here flips a live
> switch, captures audio, or names a real person in a public scorecard.** Every
> ingestion mechanism described below is **PROPOSED** and remains inert behind
> `AIRWAVE_ENABLED` + `AIRWAVE_SIRIUSXM_LEGAL_ACK`, both default-off, until a
> media attorney signs the legal checklist. The proprietary GSE Rating recipe
> (weights/categories/formulas) is **never** exposed by anything in this doc;
> public surfaces prove results, not method.

## Status legend

- **EXISTS-today** — code/doctrine I verified by reading a file (path cited). The
  Airwave platform lives in the **canonical clone**
  (`C:/Users/Garrett/Sports-canonical-2026-06-03`), NOT this deploy clone — a
  repo-wide grep for `airwave|siriusxm|pundit` in `C:/Users/Garrett/Sports`
  returns **zero** files. Any "EXISTS-today" Airwave claim is grounded in the
  canonical clone and must be **ported** before it can run in deploy.
- **PROPOSED** — net-new design in this doc. Not built. Requires founder gate +
  (for SiriusXM-class satellite radio) media-attorney sign-off.

---

## Part 1 — Channel 87 show catalog (web-verified)

**Channel:** SiriusXM *Fantasy Sports Radio* — **Channel 87** (Sirius 210),
24/7 fantasy-only. Live programming runs roughly **7:00am–11:00pm ET** on
weekdays; overnights are replays. The brief framed the window as 5a–11p ET;
verified live programming is closer to **7a–11p ET**, with replays filling the
overnight/early-morning hours.

**Verification caveat (carry this into every downstream use):** the official
SiriusXM web player surfaces only relative "Next Airs Today/Tomorrow at X" times,
not a clean Mon–Fri grid. For several shows I can confirm the show exists on the
channel and a representative slot, but **cannot certify the precise current
weekday clock time**. Lineups also rotate heavily by season (FF-heavy Aug–Jan,
more MLB/NBA off-season). Treat this as an **in-season (NFL) snapshot**; re-scrape
the live player before any launch. Confidence is marked per row.

### 1a. Confirmed weekday (Mon–Fri) daytime block

| Show | Host(s) | Slot (ET) | Focus | Confidence | Source |
|---|---|---|---|---|---|
| **SiriusXM Fantasy Football Morning** (pres. by Fantasy Points) | Joe Dolan, Paul Kelly, Tom Brolley; John "The Guru" Hansen appears regularly | Mon–Fri **7:00–8:00am** | FF news, start/sit, league strategy, draft/ADP in-season | **HIGH** | FantasyPoints announcement + SXM channel page ("every weekday 7–8am ET") |
| **Elite Sports** (Elite Sports Network) | Jeff Mans (Ray Flowers per archived posts) | Mon–Fri **midday/afternoon** — snippet says ~2–5pm ET; player also showed a 9pm airing (treat exact window as ~MEDIUM) | DFS "plays of the day," seasonal start/sit, news, game theory, stat trends | **MEDIUM** on slot; HIGH it is a recurring weekday daily | SXM player + search snippets |
| **RotoWire Fantasy Sports Today** | RotoWire experts (Jeff Erickson, Chris Liss, Derek VanRiper historically) | Weekday **~11:00am–1:00/2:00pm** | Cross-sport fantasy news/analysis/advice, call-ins on lineups/trades/FA | **MEDIUM-HIGH** (length varies 2 vs 3 hrs by source) | RotoWire podcast page + SXM player |

### 1b. Weekly / single-day shows (verified on the channel)

| Show | Host(s) | Slot (ET) | Focus | Confidence | Source |
|---|---|---|---|---|---|
| **The Fantasy Footballers** (live call-in) | Andy Holloway, Jason Moore, Mike Wright | **Thursday 5:00–7:00pm** | Flagship independent FF — start/sit, waivers, entertainment | **HIGH** it airs; live call-in Thu 5–7pm per SXM blog. A channel snapshot listed "Fantasy Footballers Podcast Tue 5pm" — that is the *podcast replay*, distinct from the live Thursday show; podcast also re-airs nightly | SXM blog + investor press release |
| **The FTN Fantasy Show / FTN Fantasy** | Dane Martinez, Mike Randle (launch lineup had Jake Ciely, Chris Meaney, Lauren Carpenter) | **UNCONFIRMED** — one listing shows Thu 1:00pm; 2023 launch release said Sat 9:00–11:00am ET | FF analysis, player evaluations, DFS | LOW-MEDIUM on slot; **HIGH** it airs on 87 | FTN/NewsDirect launch release + SXM listing |
| **Fantasy Alarm** | Howard Bender, Andrew Cooper, Jim Bowden | ~2 hrs (afternoon/early-evening) | Fantasy advice, daily contests, Bowden front-office angle | MEDIUM | SXM player |
| **Fantasy Life** | Matthew Berry, Kendall Valenzuela, Adam Ronis | **Friday 5:00pm** (1 hr); historically also a weekday ~1pm slot | FF news, guest interviews, winning strategy | MEDIUM (Berry's involvement may be seasonal/variable) | SXM player + archived schedules |
| **The Jeff Ratcliffe Show** | Jeff Ratcliffe | ~1:00am replay window | FF analysis with breaking news | MEDIUM | SXM player |
| **The Dynasty Hour** (pres. by RotoWire) | Alan Seslowsky + co-hosts | ~12:00am (1 hr) | Dynasty FF: rookies, trades, re-draft strategy | MEDIUM | SXM player |
| **RotoBaller Radio** | Raph, Josh Hayes, Scott Engel, Anthony Aniano, Michael Florio | ~7:00am (1 hr) | Daily + season-long fantasy strategy | MEDIUM | RotoBaller + SXM player |
| **The RotoBaller Baseball Hour** | Marcas Grant, Michael Florio | ~5:00pm (1 hr) | Fantasy baseball waivers/lineups | MEDIUM | SXM player |
| **The High Stakes Fantasy Advantage** | Jeff Erickson, Tom Kessenich | ~8:00pm (2 hrs) | High-stakes contest strategy, winner interviews | MEDIUM | SXM player |
| **Fantasy House Calls** | "Dr. Roto" | Saturday 9:00am (2 hrs) | Multi-sport fantasy strategy | MEDIUM | SXM player |
| **Rosterwatch** | Byron Lambert, Alex Dunlap, "the Trashman" | Sunday 3:00pm (1 hr) | NFL projections, championship advice | MEDIUM | SXM player |
| **DFS, Dunks & Dimes** | Justin Fensterman | Monday 1:00pm (1 hr) | DFS NBA lineup prep | MEDIUM | SXM player |
| **Smart Fantasy** (pres. by RT Sports) | Kyle Elfrink, Glenn Colton | Monday 8:00pm (2 hrs) | Fantasy football + baseball strategy | MEDIUM | SXM player |

### 1c. Founder's named brands — corrections

- **The Fantasy Footballers** → REAL on Ch 87, but as a **weekly Thursday
  5–7pm ET live call-in** (Holloway/Moore/Wright) plus nightly podcast replays —
  not a generic daily slot.
- **FTN** → REAL on Ch 87 ("FTN Fantasy Show," Martinez/Randle). Exact day/time
  genuinely **unconfirmed** (Thu-1pm listing vs Sat-9am launch). Do not state a
  precise slot without re-checking the live player.
- **"Fantasy Guru / Establish the Run / Elite"** → SPLIT. (a) John "The Guru"
  Hansen / FantasyGuru.com — YES, regular on the 7–8am morning show. (b) "Elite" —
  YES, Jeff Mans' **Elite Sports** (Elite Sports Network), recurring weekday daily.
  (c) **"Establish the Run" — NOT VERIFIED on Ch 87.** ETR (Evan Silva / Adam
  Levitan) was acquired by FanDuel; zero evidence it airs on 87. Likely a
  conflation — **do not list it**.

### 1d. Honest gaps (re-verify at launch)

1. Precise Mon–Fri clock times for the midday/afternoon block (Elite Sports
   window, RotoWire length).
2. Whether Matthew Berry / "Fantasy Life" is a current every-week fixture vs
   seasonal.
3. The current FTN slot (day + time).
4. Which weekly shows are NFL-in-season-only vs year-round.

### Sources

- https://www.siriusxm.com/channels/siriusxm-fantasy-sports-radio
- https://www.siriusxm.ca/channels/siriusxm-fantasy-sports-radio/
- https://www.siriusxm.com/blog/siriusxm-the-fantasy-footballers-podcast-team-up-for-live-call-in-show/
- https://www.siriusxm.com/blog/fantasy-footballers-fantasy-sports-radio
- https://investor.siriusxm.com/news-events/press-releases/detail/2143/the-fantasy-footballers-and-siriusxm-ink-exclusive-podcast
- https://newsletter.fantasypoints.com/p/fantasy-points-back-on-sirius-xm
- https://newsdirect.com/news/ftn-network-launches-the-ftn-fantasy-show-on-siriusxm-250822348
- https://www.yogonet.com/international/news/2023/06/26/67649-ftn-launches-new-fantasy-sports-show-on-sirius-xm-partners-with-spotlight-sports-to-relaunch-its-websites
- https://www.siriusxm.com/player/show/entity/4df04f95-343d-1a03-7f6c-0914f8161c08
- https://www.rotowire.com/podcast/
- https://thefsga.org/best-fantasy-sports-live-radio-program/

---

## Part 2 — What each show contributes to the Rating, and proposed Signal-layer weights

### 2.0 Framing — three distinct qualitative layers (keep them separate)

The brief asks the SiriusXM layer to be **distinct from** (a) the Beat-report
layer and (b) the Reddit/web-aggregate layer. The canonical Airwave control plane
already models these as separate lanes — `siriusxm-context`, `beat-reporter-mesh`,
and a social/crowd lane described in `fantasy/competitive-baseline.ts` — so the
separation is structural, not just conceptual (EXISTS-today, canonical):

| Layer | Lane key (canonical) | Rights posture | Reliability character | Distinct value |
|---|---|---|---|---|
| **L1 — SiriusXM Ch 87 Signal** | `siriusxm-context` (legal-gated) | Licensed/satellite — **media-attorney sign-off required** | Named experts, on-record, emphatic-language graded | Early ADP/usage/start-sit reads + *accountability-weighted* expert lean |
| **L2 — Beat-report** | `beat-reporter-mesh` (manual-review) | Licensed, manual review | Local-market injury/usage/practice ground truth | Fastest *factual* status (snaps, practice participation, designations) |
| **L3 — Reddit/web aggregate** | social/crowd lane (descriptive only; **no implemented adapter**) | Public web | Noisy crowd sentiment; **no social score is live today** | Wisdom-of-crowd contrarian / consensus-drift detection |

**Hard rule the Rating must honor:** these never collapse into one blended number
at ingest. Each lane carries its **own** rights status, reliability tier, and
weight, and each enters the Rating as an **independent estimator** (consistent
with the edge-engine "independent estimators + CLV" direction). L1 is the subject
of this doc.

### 2.1 Where this layer attaches to the actual engine (grounded)

In **this deploy clone**, the proprietary "GSE Rating" is the per-pick
`confidence` (0–100), summed and clamped in
`packages/prediction-engine/src/scoring.ts:340-348` (SPREAD), with proprietary
caps in `packages/prediction-engine/src/constants.ts:23-66`. Today it is
**market-derived**: ~75 of 100 points come from market structure
(Consensus 30 + Depth 20 + Edge 25) plus thin schedule/rest/ATS context and a
+10 baseline. **No qualitative Airwave/beat/pundit signal feeds it** — eight
richer context categories (PLAYER_AVAILABILITY, OFFICIALS, VENUE_ENVIRONMENT,
PACE, TEAM_RATES, STANDINGS, DIVISION_CONTEXT, MILESTONES) are scaffolded
**shadow-only** with `trustLevel: 0` / `activationStatus:
"BLOCKED_MISSING_SOURCE"` and contribute `weight: 0`
(`process-sport.ts:70-96`, `scoring.ts:79-96`). **EXISTS-today.**

The canonical clone's player-facing Rating (`processGrade`) is also pundit-free:
`intelligence/rating-why.ts:24-42` reads only player fields. So in **both** trees
the SiriusXM layer is a **net-new estimator**, not a re-weighting of an existing
input. **PROPOSED** for everything below.

**Critical design constraint:** the SiriusXM layer is a **subordinate,
shadow-first, low-ceiling qualitative estimator** — never a primary driver, never
allowed to override market structure. The whole L1 layer caps at a small bounded
contribution so a loud radio take can nudge but not flip a pick. This protects
calibration (the radio lane is unproven against settled outcomes) and the
proprietary recipe (a tiny, opaque, accountability-gated input).

### 2.2 Per-show contribution + proposed L1 sub-weight

The unit fed to the Rating is **not** raw takes. It is, per subject/entity, the
show lane's *settled, falsifiable* claims weighted by each pundit's
**accountability index** (reuse the canonical `grade.ts` weights: EMPHATIC 1.5 /
LEAN 1.0 / HEDGED 0.6; UNFALSIFIABLE posts a non-recoverable 0.5). A loud pundit
with a low index contributes near-zero **by design** — that integrity property is
what makes a radio input defensible.

Proposed weights below are **relative shares inside the bounded L1 budget**
(they sum to ~100% of L1, they are NOT points on the 0–100 Rating). They are a
**starting prior for shadow mode**, to be re-calibrated from realized
accountability before any blend. All **PROPOSED**.

| Show | Primary Rating contribution | Signal type | Proposed L1 share | Rationale |
|---|---|---|---|---|
| SiriusXM Fantasy Football Morning | Daily start/sit + ADP/draft drift + early injury reads | Start-sit / ADP / usage | **18%** | Daily, named experts (Dolan/Kelly/Brolley/Hansen), Fantasy-Points-backed; broadest reliable daily surface |
| Elite Sports (Mans) | DFS plays-of-day, game theory, stat-trend leans → **betting-structure** read | Betting structure / DFS | **14%** | Daily DFS framing maps closest to the pick engine's market lane; Mans is on-record/gradeable |
| RotoWire Fantasy Sports Today | Cross-sport usage/news, trade/FA value → **usage/availability** | Usage / availability | **12%** | RotoWire data pedigree; daily cadence; cross-sport coverage |
| The Fantasy Footballers (Thu live) | Pre-weekend start/sit + waiver/usage consolidation | Start-sit / waiver | **12%** | Highest-trust independent brand; but weekly, so capped below the daily dailies |
| The FTN Fantasy Show | Player evaluation + DFS structure | DFS / evaluation | **7%** (slot-unconfirmed → discount) | Real on 87 but slot unconfirmed; discount until verified |
| Fantasy Alarm | Daily-contest structure + Bowden front-office/transaction read | Betting structure / front-office | **7%** | Bowden adds a rare exec-transaction lens |
| Fantasy Life (Berry) | Headline news + sentiment-shaping start/sit | Start-sit / sentiment | **6%** | High reach; involvement may be seasonal → modest weight |
| Rosterwatch (Sun) | Final pre-kick NFL projection/championship calls | Late projection | **5%** | Latest-window NFL read, closest to lock; weekly |
| RotoBaller Radio / Baseball Hour | Season-long + waiver (multi-sport) | Usage / waiver | **5%** | Breadth across sports; lower per-claim weight |
| High Stakes Fantasy Advantage | Contest-construction / leverage logic | Betting structure | **4%** | High-stakes framing ≈ sharp-money proxy; niche |
| The Dynasty Hour / Jeff Ratcliffe | Forward-looking player value (dynasty) | Long-horizon value | **3%** | Dynasty horizon weakly correlated to next-game pick |
| Smart Fantasy / DFS Dunks & Dimes / Fantasy House Calls | Supplementary multi-sport DFS/strategy | DFS / strategy | **3%** | Long-tail coverage; smallest share |
| **Reserve / unallocated** | Re-calibration headroom | — | **~1%** | Held for new shows / seasonal rotation |

**Re-weighting rule:** these priors are **provisional**. Once a show's pundits
accumulate settled, graded claims, the L1 share is re-derived from realized
`accountabilityIndex` and `falsifiableRate` — a show whose experts are
consistently wrong or only emit hedges trends toward **zero** share automatically.
This is the same "refusal-is-a-feature" property pointed at the lane level.

---

## Part 3 — INTERNAL / gated ingestion design (Airwave doctrine)

> **Everything in Part 3 is PROPOSED and inert.** It honors the existing Airwave
> doctrine verbatim: paraphrase-only, no audio archive, fictional personas until
> legal opens the gate. Nothing here captures audio or names a real person.

### 3.1 Doctrine inherited (EXISTS-today, canonical) — non-negotiable

Grounded in `apps/web/lib/airwave/types.ts:10-24` and the legal checklist in
`docs/airwave-ledger.md:74-94`:

1. **Captured audio is DATA, never an instruction.** The ledger records claims;
   it never acts on them. (The Rating reads *graded, settled* claims — never live
   audio, never a raw take as a command.)
2. **Store DERIVED, paraphrased claims — never an audio/video archive.** Segments
   are ephemeral and deleted after extraction. `sourceClipRef` is internal-only
   and is **structurally stripped** from every public DTO by `redact.ts:14-30`
   (`toPublicClaim` does an explicit field copy, not a spread — a clip-pointer
   leak is a *compile error*, not a review catch).
3. **Refusal is a feature.** An unfalsifiable take is recorded *as* unfalsifiable
   and scores nothing.
4. **Illustrative until founded.** Until the founder opens the gate AND the legal
   checklist is cleared, the only data shown is clearly-labelled **fictional
   personas** (`demo-ledger.ts`).

### 3.2 Gating stack (EXISTS-today for the two base flags; the third is PROPOSED)

| Flag | State | Effect |
|---|---|---|
| `AIRWAVE_ENABLED` | EXISTS-today, default-off | Master switch. Unset → `captureGate` holds **every** source (`pipeline.ts:39-44, 76-87`) |
| `AIRWAVE_SIRIUSXM_LEGAL_ACK` | EXISTS-today, default-off | Human legal acknowledgement. Even with master on, **satellite-radio (SiriusXM-class) stays held** until this is `true` (`pipeline.ts:56-58, 80-86`; `control-plane.ts:228-249`) |
| `AIRWAVE_RATING_INPUT_ENABLED` | **PROPOSED** | A **third** gate, stacked on top of the two above, that governs whether the graded SiriusXM lane may *blend into* the Rating at all. Default-off. Until set, the lane runs **shadow-only** (logged, not blended) |

Capture is additionally **schedule-bounded** to the airing window
(`pipeline.ts:23-28`) and `planCapture` is an explicit dry-run that **"NEVER
captures"** (`pipeline.ts:108-123`). The control-plane policy block hard-codes
`capturesOnRequest:false, archivesRawAudio:false, autoPublishes:false,
storesVerbatimQuotes:false, exposesSecretValues:false`
(`control-plane.ts:65-72, 304-310`). **EXISTS-today.**

### 3.3 Live-window listening pipeline (PROPOSED, all behind the gates)

Reuses the existing six-stage Airwave pipeline; the **only net-new piece is the
final consumer hook into the Rating**:

```
capture(gated) -> transcribe -> extract -> grade -> review -> [shadow-log] -> blend(gated)
   worker         worker        worker      lib      cockpit    NEW lane       NEW consumer
                                                                 (PROPOSED)     (PROPOSED)
```

1. **Capture (gated, schedule-bounded).** During a Ch 87 show's live window
   (per Part 1's grid, re-verified at launch), rolling ~10-minute segments to a
   temp store, **deleted after extraction**. No audio archive — nothing to
   redistribute. Held entirely unless `AIRWAVE_ENABLED` **and**
   `AIRWAVE_SIRIUSXM_LEGAL_ACK` are both set. **PROPOSED** to point capture at
   Ch 87; the gate machinery EXISTS-today.
2. **Transcribe.** Whisper-class transcription + speaker diarization to attribute
   lines to a host. Transcript reduced to claims, then discarded.
3. **Extract.** Cost-routed model pass turns prose into structured `PunditClaim`
   rows. Assertions are **paraphrased, never verbatim** (paraphrase-by-contract,
   `types.ts:76`, `redact.ts:8`). Each row carries: subject entity (player/team),
   claim type (start-sit / ADP / usage / injury / betting-structure), emphasis
   (EMPHATIC/LEAN/HEDGED), show + host, and an **internal-only timestamp +
   `sourceClipRef`** (never public).
4. **Grade.** On settlement, each claim → `HIT / MISS / PUSH / UNFALSIFIABLE`,
   rolled into a per-pundit `PunditScorecard` via `grade.ts` (pure, deterministic,
   stake-weighted). **EXISTS-today.**
5. **Review.** Operators approve claims in `/cockpit/airwave` before anything is
   graded in public. Draft-only; no auto-publish. **EXISTS-today.**
6. **Shadow-log (PROPOSED).** Derive the per-entity **broadcast signal** — that
   lane's settled, falsifiable claims weighted by each pundit's
   `accountabilityIndex` and `confidence` — into a small **bounded directional
   lean + confidence**. Log it next to the pick; **do not blend**. Run this for as
   long as it takes to measure realized contribution against settled outcomes.
7. **Blend (gated, PROPOSED).** Only when `AIRWAVE_RATING_INPUT_ENABLED` is set
   does the shadow lane become a live, low-ceiling additive estimator at the model
   layer, capped at the bounded L1 budget. Turning shadow → live is a **founder
   decision that also requires a `MODEL_VERSION` bump** (founder-gated), so the
   realized contribution is reviewed before it ever moves a published number.

### 3.4 How a graded claim feeds the score (timestamped, graded, paraphrased)

The Rating consumes **only** the output of stage 4/6 — never raw audio, never a
verbatim quote:

- **Timestamped:** each `PunditClaim` carries an internal capture timestamp so the
  blend can decay stale takes (a Tuesday usage read is worth less by Sunday) and
  so a claim is attributable to a specific live window. The timestamp is
  **internal-only**; the public ledger shows the paraphrased claim + objective
  outcome, never the clip pointer.
- **Graded:** only `SETTLED` claims with a definite `HIT/MISS/PUSH` contribute;
  `UNFALSIFIABLE` posts its non-recoverable 0.5 stake and contributes nothing to
  the lean. Pending claims are excluded.
- **Paraphrased:** the claim text that ever leaves the private store is a
  paraphrase by contract; the Rating reads the *structured fields* (subject, type,
  emphasis, grade), not prose.
- **Accountability-weighted:** the per-entity lean = Σ(claim stake ×
  pundit `accountabilityIndex`) normalized — a low-index host's emphatic call is
  down-weighted toward zero automatically. The lane's total contribution is then
  scaled into the bounded L1 budget (Part 2.1).

### 3.5 Legal gate — media-attorney sign-off required (EXISTS-today as doctrine)

This is the load-bearing constraint. Per `docs/airwave-ledger.md:74-94`, these are
**real-world decisions a human signs**, encoded as gates, not flags a script
flips for itself. **Live SiriusXM capture stays illustrative until all are
cleared:**

- [ ] **Source terms** — capturing satellite radio (SiriusXM-class) against
      account terms is a legal call. Build on freely-published YouTube / podcast
      feeds **first**; treat satellite radio as opt-in, **not** the foundation.
- [ ] **Copyright posture** — segments are ephemeral and deleted after extraction;
      only derived, paraphrased claims persist. Confirm this posture with counsel
      before enabling any capture.
- [ ] **Right of publicity / defamation** — a public scorecard tied to a *named
      real person* (e.g. a Ch 87 host) needs sign-off. Every public row must carry
      a paraphrased claim **and** an objective, sourced outcome — never
      editorializing.
- [ ] **Paraphrase-only** — verbatim quotes never leave the private store;
      enforced at the type level by `redact.ts`.

Until every box is checked **and** the founder opens `AIRWAVE_ENABLED` +
`AIRWAVE_SIRIUSXM_LEGAL_ACK`, the only data any public surface renders is the
**clearly-illustrative demo ledger of fictional personas**. The recommended path
to live (per the canonical doc): prove the product on **free YouTube/podcast
feeds** first; satellite-radio capture and named-scorecard publishing are the two
genuinely gated parts and go last.

### 3.6 Reveal-less public posture

Public Airwave shows the **pundit ledger** (record/calibration of named takes,
once legal opens it). The **Rating** shows the number + tier + the human read —
**never** that Ch 87 is a weighted input, never the L1 weights, never the lane
existence as a recipe component. The fact that a SiriusXM lane influences the
score at all is **internal**. This honors the proprietary-recipe constraint:
public surfaces prove **results**, not method.

### 3.7 Prerequisite for the deploy clone

**MAJOR caveat:** Airwave does **not** exist in this deploy clone
(`C:/Users/Garrett/Sports`) — it is canonical-only. Before any of Part 3 can run
where the product ships, the Airwave module (`lib/airwave/*`, routes, control
plane) must be **ported** from canonical to deploy. That port is a prerequisite,
not yet done, and is itself out of scope for this docs-only wave.

---

## Verification ledger (what is grounded vs assumed)

- **Ch 87 lineup** — web-verified with sources (Part 1); slots marked by
  confidence; founder's three named brands corrected (FTN slot unconfirmed,
  "Establish the Run" not verified on 87).
- **Airwave doctrine, gates, redaction, grading** — EXISTS-today, read in the
  **canonical** clone (`docs/airwave-ledger.md`, `lib/airwave/*`); cited by line.
- **Rating implementation** — EXISTS-today, grounded in this deploy clone's
  `scoring.ts` / `constants.ts` / `process-sport.ts`; confirmed **no** pundit
  signal feeds it.
- **All ingestion mechanics, weights, the `AIRWAVE_RATING_INPUT_ENABLED` flag,
  and the per-entity blend** — **PROPOSED**, not built.
- **Unverified / open:** exact weekday clock times for several shows; current FTN
  slot; whether Fantasy Life is current/seasonal; in-season-only vs year-round
  status. Re-scrape the live player at launch.
</content>
</invoke>
