# GSE Leverage Master Backlog — 2026-06-08

> Synthesized from three surveys: IA/route audit, fantasy engine audit, and NBA/MLB coverage audit.
> Owner's lens applied throughout: synthesis over information, results not method, engagement loops, money gradient.

---

## THE THESIS (3 lines)

The product has collected class-A raw materials — 14 NFL datasets, real statistical engines, premium visual scaffolding, and a legitimate trust architecture — but almost none of it is wired together into a single, unified signal the customer feels. The gap is not data depth or design polish; it is the missing synthesis layer that takes what is already ingested and produces one ranked, explainable, proprietary number per player per week that every surface — optimizer, draft board, props EV, waiver wire, trade value — reads from. That unified engine, once built, turns eight "illustrative" tools live in one move, closes the FREE→PRO→ELITE monetization gradient, and produces the defensible, un-copyable edge competitors cannot replicate because the method is hidden behind results.

---

## RANKED MASTER BACKLOG

| # | Opportunity | Impact (1–5) | Effort | Lens | Phase 5? | Notes |
|---|---|---|---|---|---|---|
| 1 | **Unified Graded Player Pool** — collapse fictional `lib/fantasy/players.PLAYERS` + `lib/intelligence/player-model.ts` + `roster-advice.ts` into ONE real graded pool all engines read | 5 | M | Value | Yes (core) | Single highest-leverage move; turns 8 tools live simultaneously |
| 2 | **Matchup-Adjusted Projection Engine** — per-player median/floor/ceiling + data-derived sigma from pbp+NGS+FTN+snaps+depth+opponent; feeds optimizer, props EV, start/sit | 5 | L | Value | Yes (core) | The proprietary synthesis competitors cannot copy; reveals RESULTS, hides METHOD |
| 3 | **GSE Rating "Why" Layer** — expose the divergence between estimators + matchup components as the per-rating reveal; Phase 5's "explain the number" | 5 | M | Value | Yes | Highest trust differentiator; converts thin one-number surfaces into defensible synthesis |
| 4 | **Merge /board → /picks** — retire stale gray `/board`, make `/picks` (PickCard) the single "Today's Board," fix nav/footer/homepage pointers | 5 | S | Consolidation | No — NEW | Worst active confusion; two surfaces, two titles, two design languages, both live |
| 5 | **ELITE-gate the Optimizer** — free = workspace + math explanation; PRO = season start/sit + draft board; ELITE = DFS multi-lineup + ownership-leverage stacking | 5 | S | Money | No — NEW | Most valuable feature in the product; currently 100% free; DFS tier founder-gated on salary feed |
| 6 | **Sprint 1 column liberation** — widen allowlists for `schedules` rest/roof/surface, `pfr_advstats` adot/drop_pct/pocket_time/on_tgt_pct, pbp success/epa situational splits (zero new fetches) | 5 | S | Value | Partial | Closes 4 of top-8 data gaps with allowlist edits only; see `docs/nfl-data-coverage-2026-06-08.md` |
| 7 | **Beat the Model — ship it** — weekly free pick'em vs model projections, persistent leaderboard, win-streak identity stat; the stated flagship loop that is currently a static marketing card | 5 | M | Engagement | No — NEW | Top-of-funnel viral engine; free tier anchor; habit loop the whole product currently lacks |
| 8 | **Wire /gsn + /today to live engine** — replace SAMPLE_TRANSMISSION and illustrative cards with real auto-generated daily slate transmission built from real matchups, line movement, roster shocks | 5 | M | Engagement | No — NEW | Stickiness/virality loop currently faked; content-as-event tied to live objects |
| 9 | **Game-Script-Projected Usage** — join closing spread/total + team PROE/pace/EPA to per-game pass-volume vs run-volume environment; re-weight player opportunity by projected script | 5 | M | Value | No — NEW | No surface today joins spread/total to usage; data coexists in separate unconnected loaders |
| 10 | **Weather-Adjusted Passing/Kicking Suppression** — NWS wind already pulled for 19 outdoor venues; multiply player/team passing + FG projection by wind penalty at >15 mph; attach to GSE Rating | 4 | S | Value | No — NEW | The copy already promises it; the computation is not done; clean proprietary edge |
| 11 | **Close the GM Ledger Loop** — pipe real optimizer start/sit + waiver proposals accepted by user into committed-before-kickoff Merkle record; auto-grade vs results; weekly personal calibration score | 4 | M | Engagement | No — NEW | Engine finished; only the data pipe is missing; most defensible/viral identity artifact |
| 12 | **Collapse record/proof trio** — fold /vault (dead placeholder) + /ledger (settled list) into /performance as tabs (Calibration | Ledger | Archive); retire /vault route | 4 | S | Consolidation | No — NEW | Three footer links competing for one "see our receipts" job; one surface reads as more proof |
| 13 | **FTN Sprint 2** — new loaders for `ftn_charting` (play-action rate, play design, stunt/twist) and `participation` (personnel groupings, defenders in box, coverage shell) | 4 | M | Value | Yes | FTN is the moat dataset in the catalog; never consumed; answers questions no free source answers |
| 14 | **Make Props the EV Flagship** — compute sigma from matchup-adjusted engine (item 2) instead of hand-authored; ingest real pick'em lines (founder-gated); surface edge + alt-line EV + parlay EV with FREE/PRO/ELITE metering | 4 | M | Money | No — NEW | Math already correct; sigma is fabricated; data-derived sigma is the moat |
| 15 | **Snap/Route-Rate Trend as Breakout Detector** — multi-week trajectory of route_rate + snap_share rising BEFORE production shows up; front-runs the market the same way opportunity-transfer does | 4 | S | Value | No — NEW | Data exists point-in-time; trending version requires windowed aggregation, not new datasets |
| 16 | **GM Academy Persistence** — save GM-IQ, drill streaks, spaced-repetition schedule, and badge to Prisma/localStorage; tie academy errors to user's real ledgered mistakes | 4 | S | Engagement | No — NEW | Deepest proprietary content in the app is stateless; zero retention scaffolding |
| 17 | **Target-Competition / Teammate-Context Score** — quantify target-share suppression by depth-chart teammates; "target monopoly" index; inverse companion to opportunity-transfer | 4 | M | Value | No — NEW | Joins depth-charts + trailing target shares; no new fetches beyond what's already loaded |
| 18 | **Defense-Adjusted Matchup Ratings** — EPA/success allowed per position vs defense from PBP participation; true matchup exploitation in the planned matchup-adjusted Rating | 4 | M | Value | Yes (core) | Powers Phase 5 matchup Rating properly; currently unbuilt |
| 19 | **MLB second sport** — build pitcher/hitter "true-talent vs outcome" engine on Retrosheet + Lahman (FIP-style ERA vs deserved, BABIP luck, park-schedule context); mirror NFL reveal-not-method pattern | 4 | M | Value | No — NEW | Legal lane already cleared; two cleared free sources already in registry; zero new vendor spend |
| 20 | **Monetization breadth pass** — gate /trends, /brief, /airwave, /observatory, /nflverse behind PRO (teaser free); restructure ELITE = optimizer + dossier export + real-time alerts + all-sports-deep | 4 | S | Money | No — NEW | 15+ high-value surfaces currently un-tiered; PRO→ELITE ladder is currently one-dimensional |
| 21 | **Studio → Personalized Weekly Digest** — once real inputs flow (item 1), route Studio output as personalized per-user weekly email/notification: their roster + their waiver targets + their ledger grade | 4 | M | Engagement | No — NEW | Best synthesis pattern in codebase; built on illustrative inputs; real inputs make it the habit loop |
| 22 | **Player Dossier Export (ELITE add-on)** — PRO views full dossier on-screen; ELITE exports branded PDF/PNG glass-box dossier; viral shareable paid artifact | 3 | M | Money | Partial | Phase 5 plans full dossier; export-as-paid-artifact is the monetization twist |
| 23 | **Extend Cipher content cadence** — commit a season of chapters, add solver leaderboard/streak, season-long meta-puzzle, cross-link shard hunts to new fantasy pages | 3 | S | Engagement | No — NEW | Engine done; bottleneck is content; Mon–Thu dead window is perfect for puzzle traffic |
| 24 | **Scheme Intel → personnel-derived cascades** — replace hand-authored delta% rules with real depth-chart + target-share + pace data; compute cascade, not author it | 3 | M | Value | No — NEW | Concept is differentiated; current implementation is hardcoded heuristics on fictional players |
| 25 | **Referee-Crew Tendency layer** — crew-specific flag rates / pace / pass-vs-run lean as total/pace nudge | 3 | S | Value | No — NEW | Genuinely proprietary, low-cost, rarely-priced edge; data derivable from PBP `referee` column |

---

## TOP 5 "DO NEXT" — EXACT FILES AND APPROACH

### 1. Merge /board → /picks (effort: S, impact: 5)

The most visually jarring live confusion. Two routes rendering the same concept, different palettes, cross-linked from different nav anchors.

**What to do:**
- Make `app/picks/page.tsx` the canonical "Today's Board." Confirm PickCard design is on the dark system.
- Add `app/board/page.tsx` → HTTP 308 redirect to `/picks` (matches the 21 existing redirect stubs pattern).
- Fix every reference to `/board` across `components/nav/`, homepage (`app/page.tsx`), and `components/footer/`.
- Update `app/picks/page.tsx` title/meta from whatever it currently says to "Today's Board" (one canonical label).

**Files to touch:** `app/board/page.tsx` (replace with redirect), `app/picks/page.tsx` (title fix), nav component, homepage, footer. Roughly 5 files, no logic changes.

---

### 2. Sprint 1 column liberation — zero new fetches, maximum data unlock (effort: S, impact: 5)

Four of the top-8 missing data points require no new API calls — only removing or widening column allowlists.

**What to do (reference `docs/nfl-data-coverage-2026-06-08.md` for exact column names):**
- `packages/data-ingestion/src/loaders/schedules-loader.ts` — add `rest_days`, `roof`, `surface` to the column select/map.
- `packages/data-ingestion/src/loaders/pfr-advstats-loader.ts` (receiving variant) — add `adot`, `drop_pct` to the select; the loader already fetches the file.
- Same file (passing variant) — add `pocket_time`, `on_tgt_pct`; already fetched, currently dropped.
- `packages/data-ingestion/src/loaders/pbp-loader.ts` — add `success`, `epa` situational split columns (down/distance/yardline); already in the raw PBP file.
- Propagate newly available fields into `lib/intelligence/player-model.ts` so they flow downstream to the Player Lab and GSE Rating.

**Files to touch:** 3 loader files + `player-model.ts`. Changes are additive column selects — no schema migrations, no new fetches.

---

### 3. ELITE-gate the Optimizer (effort: S, impact: 5)

The DFS optimizer is the single most classic ELITE feature in this category. It currently has zero tier gating.

**What to do:**
- `app/optimizer/page.tsx` — wrap the DFS multi-lineup section in `<UpsellGate feature="dfs_optimizer" tier="ELITE">`. The `UpsellGate` component and `canAccess` pattern already exist in `components/ui/upsell-gate.tsx` and `lib/access.ts`.
- Add `dfs_optimizer` to the `ACCESS` object in `lib/access.ts` with `free: false, pro: false, elite: true`.
- Add `start_sit` and `draft_board` features with `free: false, pro: true, elite: true` so the PRO tier unlocks the season workspace while ELITE unlocks DFS.
- The DFS output itself stays founder-gated on the salary feed decision (`lib/dfs/salaries.ts`) — the gate should show "ELITE feature — connect salary feed to unlock" so the gate is visible but not misleading about the salary dependency.

**Files to touch:** `app/optimizer/page.tsx`, `lib/access.ts`, `components/ui/upsell-gate.tsx` (possibly, if a new variant is needed for the salary-gated state).

---

### 4. GSE Rating "Why" Layer — the trust payoff (effort: M, impact: 5)

The single highest-trust differentiator. Every component already exists; they are not connected to the rating output.

**What to do:**
- `lib/intelligence/edge-engine.ts` — the rating already runs independent estimators. Expose the estimator array (not the weights) as a structured `components: EstimatorResult[]` field on the rating output, including each estimator's name, direction, and magnitude (not its formula).
- `app/intelligence/rating/page.tsx` — add a `<RatingWhy>` component below the rating card. Free tier: "3 factors moved this rating" (count only, no names). PRO: estimator directions + magnitude bars (results, no method). ELITE: full component breakdown with matchup context.
- The matchup-adjusted extension (Phase 5 core item 2 above) wires into this same output shape — build the shape now with current estimators, Phase 5 fills in the matchup layer.
- Gate with `canAccess('rating_why', tier)` in `lib/access.ts`.

**Files to touch:** `lib/intelligence/edge-engine.ts`, `app/intelligence/rating/page.tsx`, new `components/intelligence/rating-why.tsx`, `lib/access.ts`.

---

### 5. Beat the Model — ship the engagement flagship (effort: M, impact: 5)

The stated free-tier flagship is a static marketing card with no engine. This is the habit loop the product currently lacks and the top-of-funnel conversion driver.

**What to do:**
- Create `app/fantasy/contests/beat-the-model/page.tsx` — weekly pick'em UI. User picks over/under the model's public projection for each slate game. Free (5 picks/week), PRO (full slate).
- Create `lib/contests/beat-the-model.ts` — week management, pick submission, outcome resolution (reads from ESPN results already ingestible), EV grading, leaderboard query.
- Persistence: `prisma/schema.prisma` — add `Contest`, `ContestPick`, `ContestLeaderboard` models. This is the minimum Prisma addition that also enables GM Ledger (item 11) and Academy streaks (item 16) — one schema migration unlocks three engagement loops.
- Leaderboard: simple ranked table by correct picks + running CLV over model. The "you beat the model X times" identity stat is the viral hook.
- Wire projections from `lib/intelligence/player-model.ts` as the model's public number (reveal results, hide method).

**Files to touch:** `app/fantasy/contests/beat-the-model/page.tsx` (new), `lib/contests/beat-the-model.ts` (new), `prisma/schema.prisma` (additive models), `app/fantasy/contests/page.tsx` (update to link live, not "in build").

---

## NBA / MLB — IS IT WORTH IT NOW?

**NBA: Not yet. Do not build a fake surface.**

The NBA legal lane is unexplored in code — no source declared in `source-registry.ts` (neither cleared nor forbidden). The only viable free API is `balldontlie`, whose free tier is non-commercial; the paid tier is $9.99/mo + redistribution reputation risk. `basketball-reference` and `stats.nba.com` are ToS-hostile and correctly absent. For a trust-first brand, a one-metric NBA table (equivalent to the current `/nhl` state) would be worse than no NBA page. When NBA is wanted: add `nba-balldontlie` to the source-registry marked `paid-required / founder-gated`, create `/nba` behind a connected-key gate, and build the same results-not-method engine as NFL. Do not ship a faked NBA surface.

**MLB: Yes — the leanest real second sport, ready now.**

Two cleared free sources already declared in the registry and partially loaded: Lahman (team season table already live at `/mlb`) and Retrosheet (play-by-play history, declared but never loaded — the highest-value unused MLB asset). The expansion is a three-step add with no new vendor spend and no legal risk:

1. Build a `retrosheet-loader.ts` in `packages/data-ingestion/src/loaders/` using the existing `assertIngestible + fetchWithFailover + parseCsv` plumbing.
2. Compute FIP-style "deserved ERA vs outcome ERA" per pitcher + BABIP luck per hitter from Retrosheet PBP — the exact "skill vs luck, results not method" pattern the app already executes for NFL.
3. Add park-schedule context from the already-loaded Lahman team table (park factors from run-differential splits across home/away).

This makes GSE genuinely 2-deep-sports with the same proprietary synthesis framing, zero new keys, and zero Statcast dependency. Statcast redistribution is NOT cleared in the registry — keep it out until a written grant exists; Retrosheet is the open substitute.

**Recommended sequencing:** MLB after Sprint 1 column liberation (item 6 in backlog). Sprint 1 unlocks NFL depth; MLB is the parallel "prove the framework generalizes" win that also makes the "All 7 sports" pricing copy partially honest for PRO/ELITE.

---

## MONETIZATION MAP

**What becomes paid — by surface:**

| Surface | Today | Should Be |
|---|---|---|
| `/optimizer` — DFS multi-lineup | FREE (no gate) | ELITE |
| `/optimizer` — start/sit + draft board | FREE (no gate) | PRO |
| `/trends` — full cohort board | FREE | PRO (1 teaser row free) |
| `/nflverse` — full WOPR/target-share board | FREE | PRO |
| `/parlay-mri` — full survivability / EV | FREE | PRO |
| `/airwave` — pundit accountability | FREE | PRO |
| `/observatory` — Edge Map | FREE | PRO |
| `/the-beat` — full reliability-tiered newsroom | FREE | PRO (headline free) |
| GSE Rating "why" layer | Not built | PRO (directions) + ELITE (full breakdown) |
| Player dossier export | Not built | ELITE add-on |
| Real-time alerts (line movement, opportunity-transfer) | Not built | ELITE |
| Props EV full board + alt-line optimizer | Not built | PRO (1 edge/day free) + ELITE (full) |
| Beat the Model — full slate picks | Free (5/week) | PRO (full slate) |
| Beat the Model — leaderboard + CLV score | Free | Free (viral hook) |
| Edge Index board (Phase 5 cross-dataset signal) | Not built | FREE (1/day) → PRO (full) → ELITE (factor trail) |

**PRO→ELITE ladder redesign:**
Today the only ELITE differentiator over PRO is notifications. That is not a reason to climb. The correct ladder:
- **FREE:** Board, 1 daily edge, 5 Beat-the-Model picks/week, limited Player Lab, teaser Rating
- **PRO:** Full Player Lab, full trend/signal boards, start/sit + draft optimizer, props edge board, full Beat-the-Model slate, Rating why layer (directions)
- **ELITE:** DFS optimizer (salary-feed dependent), Rating full breakdown + factor trail, dossier exports, real-time alerts, all-sports-deep access, B2B API key

The current "All 7 sports" promise is partially false for PRO/ELITE. Fix: gate as "NFL deep + MLB synthesis" until NBA is genuinely built, or retitle as "multi-sport" until 7 sports are real.

---

## WHAT THIS MEANS

The next 30 days have a clear priority stack: fix the navigation confusion (item 4, one day), unlock the data that is already fetched (item 6, two days), gate the optimizer correctly (item 3, half day), expose the rating's reasoning (item 3 on the top-5 list), and ship the engagement anchor that makes the whole thing sticky (Beat the Model). Everything else — matchup engine, MLB, props EV, GM Ledger — builds on the unified graded pool (item 1 on the backlog). That is the trunk. Build the trunk first.
