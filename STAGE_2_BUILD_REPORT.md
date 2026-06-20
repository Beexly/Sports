# Galaxy Dynasty — STAGE 2 BUILD REPORT ("Signal Cup" + Deepening OS)

The weekly-retention loop, deepened into a living, interconnected sports-identity
world — built on the Rookie Season trunk, autonomously, to the Deepening OS bar.

---

## 1. What shipped (Stage 2 + Deepening)

**Ranked PvP — Signal Duel.** Engine duel scoring (outcome + calibration +
process; ties break to the better-calibrated read), Elo-on-calibration ratings,
skill-tiered Ghost matchmaking, open/join duels, a ranked ladder, a War Room prep
prompt + rematch. `/galaxy/duel`, `/galaxy/leaderboard`.

**The Depths — five bad-logic bosses.** Public Trap, Recency Wraith, Injury Fog,
Line-Move Mimic, Parlay Hydra — each a reusable teaching engine with a lesson,
difficulty, clear bonus, card/merch/GSE tie-ins, crew + hard-mode stubs, and a
compliant Higgsfield asset brief. `/galaxy/depths`.

**Season Cup.** Tier track + claimable rewards + daily/weekly/seasonal objective
cadence with a Pro track that adds depth, never outcomes. `/galaxy/season`.

**Crew Utility.** 8 lanes (Captain, Sharp, Scout, Collector, Trader, Builder,
Creator, Grinder) with weekly missions; crew XP, crew signal board, crew clash,
crew leaderboard. `/galaxy/crew`.

**Galaxy Score.** One transparent 0–1000 identity metric (calibration-first;
reckless volume capped) with a full breakdown. `/galaxy/score`.

**Cosmetics economy (revenue engine).** 23-item catalog across 10 categories —
avatar frames, outfits, kicks, emotes/dances, anthems, profile scenes, banners,
card frames, ticket stubs, titles — via earn / season-drop / Nova (Stripe TEST
mode). Cosmetics never affect outcomes. The Locker `/galaxy/wardrobe`.

**Cribs + Friends (social spine).** Visitable public profiles decorated by
equipped cosmetics (the whole identity in one place), follow/friends graph, and a
Friends circle. `/galaxy/u/[handle]`, `/galaxy/friends`.

**Collector depth.** Card detail + seeded value sparkline + momentum tags
(Breakout Watch, Rookie Heat, Slump Warning, Sharp Rated). Vault Market prototype
(watchlist + card-for-card offers, no currency). `/galaxy/vault/[slug]`,
`/galaxy/market`.

**Faction War standings** (`/galaxy/factions`) and **Creator Gauntlet** curated
boards (`/galaxy/creators`).

**Daily streak with streak-insurance** (a single missed day never resets it).

**Brand enforcement gates** (automated): no cash-out path, visual-law on every
asset brief, no sportsbook strings, no likeness/league-mark schema fields, no
pay-to-win on purchasables, no stale boss keys. **Admin observability** expanded
(duels, ratings, watchlist, brand-gate status).

Surface count: ~20 Galaxy pages + 12 API routes.

## 2. Validation

- `@sports/galaxy-engine`: **77 unit tests** pass; typecheck clean.
- Web Galaxy tests: **84 pass** (first-session, stage2, language-law over ~51
  files, schema-sync, engine-v0, brand-gates). **161 Galaxy tests total.**
- Existing **brand-safety suite: 2189 pass** — no regressions.
- Web `tsc --noEmit`: **0 errors**; ESLint: **clean**; `npm run build`:
  **succeeds**.

## 3. The vision → what's built vs. the funded endgame

The north star is **GTA-grade engagement/retention as an original, low-violence,
sports-intelligence world** — friends playing with friends, an economy, missions,
a world that reacts. Mapping (GTA pillar → Galaxy system):

| GTA pillar | Galaxy system | Status |
|---|---|---|
| Map / districts | The Campus + districts | Built (web) |
| Missions / heists | Quests, Signal Checks, PvM bosses | Built; crew raids = roadmap |
| Economy / shops | Credits + Wardrobe + Merch Foundry | Built (cosmetics, test-mode Nova) |
| Customization (fits/cars/cribs) | Wardrobe + Cribs | Built (cosmetic) |
| Radio | Anthems (cosmetic) | Built |
| Online lobbies / crews | Crews + Friends/follow | Built (async) |
| Reputation / wanted | Galaxy Score, rank, Heat | Built |
| World reacting | Galaxy Engine v0 (sports triggers → events) | Built (v0) |
| 3D open world + real-time multiplayer | The funded 3D client | **Roadmap (§4.4)** |

The web trunk is that world's **brain, identity, economy, missions, and social**;
a 3D client later renders it. Everything built is designed to extend into the 3D
layer rather than be thrown away.

## 4. Intentionally deferred (and why)

- **3D real-time sports arcades** (Rocket-League / Roller-Champions / Freestyle2 /
  Fishing-Planet style, HR Derby, *Street, BMX/scooter, paintball): the funded 3D
  endgame — hundreds of people, multi-year, engine + netcode (bible §2/§4.4). Not
  autonomously buildable; design + asset briefs carry forward.
- **Real-money marketplace, physical card custody, KYC, live wagering**:
  partner/counsel-gated; the Credit Constitution + hard-stops forbid building them
  autonomously.
- **Outcome-affecting consumables / pay-to-win** (RuneScape-style bait/cages/
  boosts): excluded by the anti-pay-to-win law. Sports IQ is the honest grind.
- **Literal violence/action tuning**: off-canon for the brand-safe trunk;
  a content-rating + counsel decision for the 3D action layer (hard-stop #3).
- **Crew co-op raids + hard-mode bosses + 2v2/3v3 real-time**: stubs in place;
  real multi-human realtime is Stage 3+.

## 5. Hard-stops

None hit. Stripe stayed TEST mode (gated in code); schema changes are additive
only (no migration executed autonomously); no likeness/league-marks/real-money;
no Higgsfield/Odds API spend (briefs + SVG placeholders).

## 6. Risks

- Migration not yet applied (additive models exist + client generated; owner runs
  `db:push`/`db:migrate`).
- Reward + follow + equip writes are read-then-write; wrap in transactions for
  high-concurrency at scale (Stage 3).
- Duels/cribs/friends are async; real-time lobbies need the 3D/networked client.

## 7. Recommended next step

**Stage 3 — "Vault Season" + Crew Raids.** Two parallel tracks: (a) deepen the
collector economy toward a real marketplace prototype with seller tools +
card-linked quests (settlement still partner-gated); (b) ship **crew co-op PvM
raids** (party-vs-boss combining members' reads) — the first true
friends-playing-together mode, built on the existing boss + crew + duel engines.
Both extend directly into the eventual 3D client.
