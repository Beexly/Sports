<!-- Canonical Engine Research Filing: docs/engine/research/2026-11-09/INTEL-LOOP-Q52-Q54-CONSOLIDATED-2026-11-09.md
Bucket: docs/engine/research/2026-11-09/ (per AGENTS.md DOCS BUCKETS rule)
Source: /home/antigravity/INTEL-LOOP-Q52-Q54-CONSOLIDATED-2026-11-09.md
Wired into:
  - packages/prediction-engine/src/expected-metrics/defensive-field-zone-split.ts (Q52)
  - packages/prediction-engine/src/expected-metrics/qb-opponent-tier-efficiency-split.ts (Q53)
  - packages/prediction-engine/src/expected-metrics/qb-post-first-int-efficiency-split.ts (Q54)
  - intelligence/metrics/intel_loop_q52_q54_and_research_consolidation_2026_11_09.py
-->

# Intel Build Loop — Q52 / Q53 / Q54 Consolidated Record

Assembled 2026-11-09 by Motif, at Garrett's request: every document behind the loop's three reports of Nov 7 9:39 PM, Nov 8 9:36 AM, and Nov 8 9:41 PM, in one place. Source text is reproduced verbatim from the loop's own files; live GitHub states were re-verified by Motif on 2026-11-09.

## Document map (where each piece lives)

- Loop queue + dropped ledger: `~/workspace/goals/gse-engine-v5-3-0-calibration-rebuild/hidden_files/intel-build-queue.md`
- Loop run log: `~/workspace/goals/gse-engine-v5-3-0-calibration-rebuild/hidden_files/intel-build-log.md`
- Jules shepherd log: `~/workspace/goals/gse-engine-v5-3-0-calibration-rebuild/hidden_files/jules-shepherd-log.md`
- Q52 prompt: `hidden_files/run66-prompts/jules_prompt_q52-rz-def-split.txt` · Q53 prompt: `hidden_files/run68-prompts/jules_prompt_q53-qb-opp-tier.txt`
- Content briefs: `~/workspace/vendor/autonomous-revenue-engine/ops/x-drafts/IDEAS-20261107.md` (19) and `IDEAS-20261108.md` (14)
- PRs: Beexly/Sports #1262 (Q52) and #1266 (Q53)

## The three reports, as delivered

**Nov 7, 9:39 PM** — Intel loop, tonight: one build fired. Q52, defensive field-zone split (red-zone vs open-field efficiency allowed, SHADOW): Jules session 11559036333323233321, in progress, will open its PR in Beexly/Sports automatically. From today's sweep; Q53 is queued behind it pending tightening, and the budget has one slot left unused on purpose. The rest of today's intel went to 19 content briefs (filed for the draft queue, nothing posted) or was dropped with reasons in the ledger.

**Nov 8, 9:36 AM** — Q52 came back clean. PR #1262 is open, the defensive field-zone split, exactly the 6 allowed files, +608/-1, the red-zone TD fix applied and no scratch files in it. It's sitting with the merge sheriff now. Q53 (QB efficiency split by opponent defensive tier) is tightened and ready; the loop fires it tonight once Q52 ages out of the 24-hour budget.

**Nov 8, 9:41 PM** — Q53 fired as planned. QB efficiency split by opponent defensive tier is now building in Jules (session 6441804516979526590), PR will open on its own. From the late Nov 8 sweep: one new item queued as Q54 (QB before/after first interception, needs tightening first), 14 content briefs filed, the rest dropped.

---

## Q52 — defensive field-zone split (FIRED, PR open)

### Queue entry

## Q52 (added 2026-11-07 PM run 66): defensive field-zone split — red-zone vs open-field efficiency allowed (SHADOW)
- From @suuma810 6:58 AM Nov 7 (ID 2119051742780256477; data: nflfastR + FTN, creator credit FourthDown): Seattle defense 1st DVOA / 2nd success rate / 3rd EPA/play between the 20s, 32nd in all three inside the 20; 15 of 17 opponent RZ trips ended in a TD (88%, NFL avg 60%); historical profile note (71% -> 55% RZ TD rate allowed rest-of-season since 2006).
- Bounded shape: per-defense (defteam) EPA/play allowed (own EPA via attachOwnEpa) + success rate allowed (isSuccessfulPlay, reused) split by field zone (yardline_100 <= 20 = red zone, > 20 = open field) + zone differentials + per-play RZ TD rate allowed; season / last-4 / last-8 distinct-week windows, week < targetWeek PIT; floors RZ plays >= 30, open-field plays >= 100, RZ epaPlays >= 30; NO shrinkage, NO composite, DVOA excluded (FTN proprietary) — named honestly as an EPA/SR profile.
- Distinctness verified at fire time: Q30 (PR #1192) is pass-only multi-axis with no zone axis; Q40 (PR #1208) splits by down; Q15 (PR #1179) is FPTS allowed by position; Q25/Q33 (PRs #1185/#1194) are offensive RZ carry share. Mapper already carries defteam + yardline_100; week additive-only per precedent.
- FIRED 2026-11-07 ~21:35 CST as session `11559036333323233321` ("INTEL: defensive field-zone split - red-zone vs open-field efficiency allowed (SHADOW)") — AUTO_CREATE_PR, main, requirePlanApproval=FALSE, doctrines prepended verbatim (18,668 chars assembled), verified IN_PROGRESS (createTime 2026-11-08T03:35:14Z). Prompt backup: hidden_files/run66-prompts/.

## Q53 (added 2026-11-07 PM run 66): QB efficiency split by opponent defensive tier — matchup sensitivity (SHADOW) — QUEUED, tightening owed, NOT fired
- From @ScottBarrettDFB (ID 2118732388620701738; source @FantasyPtsData; CSV barrett-maye-vs-top10-defenses-2026.csv): Maye EPA/DB -0.12 vs top-10 EPA/DB defenses vs +0.30 vs the rest; the drop ranks 1st of 26 QBs on ANY/A, EPA/DB and sacks/game.
- Bounded shape (draft): per-QB EPA/dropback split by opponent tier (top-10 vs rest) + sensitivity delta, own EPA, PIT. Distinct from Q47 (team-facing trailing opponent-QB quality, changeset stranded) and Q27 (ANY/A level, PR #1186).
- TIGHTENING OWED before any fire: (1) the tier basis is unstated in the source — pin a PIT definition (opponent's season-to-date defensive EPA/dropback rank entering the game week, computed from the same pbp population) or do not fire; (2) v1 scope = EPA/DB split + delta ONLY (ANY/A is Q27's surface; sacks/game is a counting slice); (3) min-dropback floors per tier per QB. Held this run: definition not airtight — never fire speculatively.


### Run 66 record (fired 2026-11-07 ~21:30 CST)

- 2026-11-07 ~21:30 CST run (PM run 66): 1 FIRED — Q52 session `11559036333323233321` (createTime 2026-11-08T03:35:14Z = 21:35 CST), verified IN_PROGRESS via synchronous Jules API GET, prompt head verified (fleet standards verbatim). Slot 2 NOT spent: Q53 queued with tightening owed (tier basis unstated — not airtight), carried queue holds no other fireable items. Never fire speculatively.
- Triage: 1 BUILD -> QUEUED + FIRED same run (Q52, PM run 58 Q51 precedent), 1 BUILD -> QUEUED held (Q53), 19 CONTENT briefs -> IDEAS-20261107.md (new file), rest DROP (rationales above).
- Dedup: git log -20 tip 1984cfaf6 unchanged (local checkout only; the sweep's Nov 7 push 7716f1f is remote-verified in its own run-log); 85 open PRs (foreground list pull) cover every fired kernel and none carries a field-zone defensive split; synchronous Jules list (30 most recent) shows no INTEL session since Q51 and no session on any Nov 7 item.
- Status watch: 85 open PRs, net +1 vs AM run 65 — the addition is #1261 (non-loop SkeleTrackV2 refactor). Loop PRs #1212-#1217 OPEN; Q49 -> #1226, Q50 -> #1227, Q51 -> #1232 OPEN, unchanged, awaiting merge-sheriff review. Q47/Q48 stranded-PR flag stands (COMPLETED, changesets only, no PR in open list; shepherd/sheriff lane owns recovery; loop does not re-fire).
- VERIFY slot not burned: no new loop PR state — #1232 verified by AM run 59 (as corrected), #1226/#1227 by PM run 52; #1261 is non-loop.
- Queue depth after run: 4 pending (Q26 [input-blocked], Q35 [tightening failed], Q53 [tightening owed], plus Q52 fired/awaiting PR). Next window: trailing-24h holds 1/2 (Q52) until 2026-11-08 ~21:35 CST.
- Budget used: 1/2 this run.


### The Jules prompt as fired (run66-prompts, full text)

```text
# INTEL BUILD — Q52: Defensive field-zone split — red-zone vs open-field efficiency allowed (SHADOW expected metric)

## The intel item
From @suuma810 (2026-11-07 sweep, staging-2026-11-07-09/section-09.md,
"Seattle red-zone split inversion", ID 2119051742780256477, 6:58 AM
Nov 7; data: nflfastR + FTN, creator credit FourthDown; the sweep is
COMPLETE and remote-verified, run-log 2026-11-07-09, commit 7716f1f):
Seattle's defense ranks 1st in DVOA, 2nd in success rate and 3rd in
EPA/play BETWEEN the 20s — and 32nd in all three INSIDE the 20; 15 of
17 opponent red-zone trips ended in a touchdown (88%, NFL avg 60%),
including 11 in a row since Week 4. A reply adds the historical note:
since 2006, 20 defenses with that profile through Week 8 saw their
rest-of-season red-zone TD rate allowed move 71% -> 55% (league
average 56%). Full splits filed in the sweep CSV
suuma-seattle-red-zone-splits-2026.csv. Queued as Q52 in the
intel-build queue on 2026-11-07 (PM run 66).
Why it matters: every defensive surface the engine has is a single
whole-field number (or, for Q30, a pass-only multi-axis profile). No
surface splits defensive efficiency by FIELD ZONE, yet the Seattle
case shows a defense can be elite for 80 yards and last for 20 — the
split itself, and the size of the gap between the zones, is the
signal: it separates genuinely good defenses from bend-don't-break
profiles and flags red-zone units priced off their open-field ranks.
The framing innovation in the source is the between-the-20s vs
red-zone split of the same metrics; this module is GSE's own
implementation of that split from public play-by-play.
Distinctness, verified at fire time (2026-11-07, direct repo + PR
reads): Q30 (PR #1192 OPEN) is a PASS-ONLY multi-axis fragility
profile with no field-position axis; Q40 (PR #1208 OPEN) splits
defensive success by DOWN, not by zone; Q15/Q17R (PR #1179 OPEN) is
fantasy points allowed by position; Q25/Q33 (PRs #1185/#1194 OPEN)
are OFFENSIVE red-zone CARRY SHARE (rushing volume), not defensive
efficiency. No module or open PR emits a defensive EPA/success split
by field zone. DVOA is FTN-proprietary and is NOT part of this
module — v1 is EPA + success rate + red-zone TD rate only, named
honestly.

## Fire-time verification (done by Motif 2026-11-07, direct repo reads — trust these, do not re-derive differently)
- VERIFY CURRENT MAIN FIRST: the local reference checkout is stale
  (October). Your session clones current origin/main — re-check the
  expected-metrics directory there before writing anything. On the
  reference main, packages/prediction-engine/src/expected-metrics/
  holds the landed modules (drives, expected-completion,
  expected-points, expected-rush-yards, expected-yac, linear,
  logistic, numeric, rollup, success-rate, types, validation,
  win-probability, the mapper, index). Sibling SHADOW modules live on
  open PR branches and show the current pattern: the module defines
  its own Play interface carrying `epa: number | null` ("our EPA for
  the play, attached via attachOwnEpa; null means unratable"), and
  the mapper gains an additive mapped series. Compose with that
  pattern — do NOT import from any PR branch; this module is
  self-contained on main. If a field-zone defensive module already
  exists on current main, STOP and say so in the PR body.
- The mapper allowlist (NFLVERSE_PBP_EXPECTED_METRICS_COLUMNS in
  nflverse-pbp-mapper.ts) ALREADY carries defteam, posteam,
  yardline_100, play_type, down, ydstogo, yards_gained, touchdown.
  It does NOT yet carry week on the reference main — if still missing
  on your branch, add it ADDITIVELY (below). week is a core nflverse
  pbp column recorded in the play record itself, NOT an FTN-charting
  or participation column (the Q38/Q49/Q50/Q51 handoffs pinned the
  same addition) — verify from the core record before wiring, per
  the Q18 precedent; if you cannot verify it is core pbp, STOP and
  say so in the PR body.
- EPA axis: the engine's OWN EPA via attachOwnEpa, from the DEFENSE's
  perspective the value allowed is the offense's own EPA on the play
  (positive = bad for the defense). The nflverse `epa` column is a
  calibration REFEREE ONLY (mapper contract) — never emit it, never
  substitute it. Plays whose own EPA is null are excluded from the
  EPA means in BOTH zones and COUNTED in the output's exclusion
  diagnostics (the Q38/Q51 precedent). Success rate does NOT depend
  on EPA: it reuses isSuccessfulPlay from success-rate.ts (the
  down-conditioned yardage rule) exactly — do not re-implement it;
  plays where it returns null are excluded from success counts in
  both zones and counted.
- Zone definition: yardline_100 is distance from the DEFENDED end
  zone from the possessing team's frame in nflverse pbp. A play is
  RED ZONE when yardline_100 <= 20, OPEN FIELD when
  yardline_100 > 20. Plays with a non-finite yardline_100 are
  excluded from both zones and counted. The module header MUST state
  this definition plainly.

## Definition pins (follow exactly; do not invent alternatives)
- Population: scrimmage plays faced by the defense — play_type is
  "pass" or "run". Exclude penalties-only / no-play rows, QB kneels,
  spikes, kick/punt/FG/XP plays (they are not pass/run scrimmage
  rows; if a kneel is encoded as a run row on your data path,
  exclude qb_kneel == 1 rows the way sibling modules do and say so).
- Grain: per DEFENSE (defteam) per window. For each zone emit:
  plays, epaPlays (non-null own EPA), meanEpaAllowed (mean of own
  EPA over epaPlays), successPlays (isSuccessfulPlay non-null),
  successesAllowed, successRateAllowed = successesAllowed /
  successPlays.
- Red-zone extras: redZoneTrips is NOT derivable play-by-play
  without a drive join — do NOT invent a trips count. Instead emit
  redZoneTdRateAllowed = defensive touchdowns allowed on red-zone
  scrimmage plays / red-zone scrimmage plays, where a defensive TD
  allowed is a red-zone play with touchdown == 1 scored by posteam
  (the possessing team). Name it exactly that (a per-play rate),
  never a per-trip rate.
- Differentials (the headline outputs): epaSplit = meanEpaAllowed
  in the red zone MINUS meanEpaAllowed in open field;
  successSplit = successRateAllowed in the red zone MINUS
  successRateAllowed in open field. Positive = the defense gets
  WORSE inside the 20 (Seattle's direction). Emit raw zone values
  alongside every differential — the split is auditable, never only
  the gap.
- NO shrinkage in v1 and NO composite score: the source prints raw
  splits; do not average EPA and success into one number and do not
  shrink toward a league mean. League context is emitted as plain
  league zone means over floor-qualifying defenses in the window.
- Floors (a defense is emitted in a window only if ALL hold in that
  window): red-zone plays >= 30, open-field plays >= 100, and
  red-zone epaPlays >= 30. A defense below any floor is absent from
  that window, never emitted as 0, and counted in diagnostics with
  the reason.
- Windows and point-in-time: entry point mirrors the sibling
  modules — compute function over the module's mapped plays with
  targetSeason + targetWeek; only rows with week < targetWeek are
  used. Windows: season-to-date, last-4 distinct weeks, last-8
  distinct weeks.
- SHADOW only: deterministic-rule method, provenance
  (modelVersion, featureSchemaHash, sampleSize = total scrimmage
  plays faced in the window) per the ExpectedMetricProvenance
  contract in types.ts. No consumer wiring, no UI, no gate changes.

## Allowed set (exactly these files; anything else is a scope violation)
1. packages/prediction-engine/src/expected-metrics/defensive-field-zone-split.ts (new)
2. packages/prediction-engine/src/expected-metrics/__tests__/defensive-field-zone-split.test.ts (new)
3. packages/prediction-engine/src/expected-metrics/nflverse-pbp-mapper.ts — ADDITIVE ONLY: add "week" to NFLVERSE_PBP_EXPECTED_METRICS_COLUMNS if still missing on your branch, and add the mapped series for this module following the existing series pattern; never remove or rename anything existing.
4. packages/prediction-engine/src/expected-metrics/index.ts (additive export only)
5. packages/prediction-engine/src/metrics/core/metric-birth-certificate-registry.ts (one additive registry entry, following the existing entries' shape, status SHADOW)
6. AGENTS.md (one note, per the closing instruction below)
packages/prediction-engine/src/index.ts may be touched ONLY if mechanically
required for the export to compile — say so in the PR body if you touch it.
HARD BAN, learned from PRs #1193/#1200/#1201: do NOT touch
scripts/guardrails/dependency-audit.mjs, any package.json, or
package-lock.json, and do not add audit waivers or upgrade dependencies for
any reason — if CI complains about dependencies, leave it failing and say
so in the PR body; the merge sheriff owns dependency state. Nothing else:
no new ingestion, no schema changes, no other packages, no research CSVs
or docs files in the PR.

## Tests must assert
- Hand-computed fixture (at least 2 defenses): per-zone plays,
  epaPlays, meanEpaAllowed, successRateAllowed, redZoneTdRateAllowed,
  epaSplit and successSplit match hand arithmetic exactly.
- Zone boundary: a play at yardline_100 == 20 is RED ZONE; at 21 is
  OPEN FIELD; a play with a non-finite yardline_100 is excluded from
  both zones and counted.
- Sign convention: a fixture defense that allows HIGHER EPA in the
  red zone produces a POSITIVE epaSplit (Seattle's direction); the
  mirror fixture produces a negative split.
- Success judged by isSuccessfulPlay exactly: a fixture play whose
  yardage rule returns null (unratable down) is excluded from success
  counts in both zones and counted; a turnover play is a success for
  the OFFENSE = a success ALLOWED (turnover forced-failure semantics
  in success-rate.ts are from the possessing team's frame — verify
  the frame and pin the test to it: isSuccessfulPlay false means the
  offense failed, so it is NOT a success allowed).
- A null-own-EPA play is excluded from the EPA means in both zones
  and counted, but STILL counts in plays and in the success
  population (success does not depend on EPA).
- The EPA judged is the attached OWN EPA: a fixture whose referee
  `epa` values disagree with own EPA produces output from own EPA
  only.
- Population: kneel / spike / kick rows never enter either zone.
- Floors: a defense at 29 red-zone plays in a window is absent from
  that window and counted; at 30, present — including the last-4
  window.
- Point-in-time and windows: results for a targetWeek are unchanged
  when rows from weeks >= targetWeek are appended; the last-4 window
  aggregates only plays in the 4 most recent distinct weeks below
  targetWeek.

## Done means
Module + tests land in one PR from main, tests pass, the metric is
registered in the birth-certificate registry, and the PR description states
the zone definition (yardline_100 <= 20), the own-EPA rule, the success
frame, the per-play (not per-trip) TD rate naming, the floors, and the
no-DVOA / no-composite v1 scope plainly. If any pin cannot be followed with
the inputs on main, STOP and say so in the PR body rather than inventing a
substitute input.

When your PR is up: (1) note what you built and where in the repo's AGENTS.md per its existing conventions; (2) drop a note in the agent bus at ~/workspace/vendor/agent-bus/outbox/from-jules/q52-defensive-field-zone-split-2026-11-07.md so the fleet sees it.
```

### Shepherd record (steer + completion, excerpts)

Shepherd log line 1509 (the steer):

> - `11559036333323233321` "INTEL: defensive field-zone split — red-zone vs open-field efficiency allowed (SHADOW)" (Q52, new, created 2026-11-08T03:35Z) — STEERED. Activities read in full (66: 50 + 16, no token left): its plan was already approved at fire time (planApproved 03:49Z) and the module was built; the session stopped to ASK before fixing two reviewer findings: (1) scratch files left in the workspace (patch.js, test_merge.py, plan.md — scope violation), (2) red-zone TD-allowed logic counting `touchdown === 1` alone, which wrongly includes defensive TDs (pick-six) — reviewer fix: `touchdown === 1 && turnover === 0`. Shepherd message (POST :sendMessage returned {}): fix both yourself, delete ALL scratch files so the diff is only the original allowed set, add a fixture test proving a pick-six is NOT a TD allowed while an offensive red-zone TD IS, re-run the module suite (pre-existing out-of-lane failures stay failing, noted in PR body), then finalize and open the PR; ended with the full-autonomy line. Delivery verified: session updateTime advanced 04:20:37Z → 06:45:49Z after the message. State still reads AWAITING in the API (same lag pattern documented for session 16277821836884253266 at the 2026-11-07 12:40 run) — NEXT RUN must verify pickup and the PR; if still AWAITING with no new agent activity, treat as stuck and re-fire.

Shepherd log lines 1530-1533 (completion census):

- Inventory: 175 sessions across 4 pages serially (pageSize=50), 175 unique IDs, no token left. States at census: 141 COMPLETED, 33 FAILED, 1 AWAITING_USER_FEEDBACK, 0 IN_PROGRESS. Changes vs the 2026-11-08 00:40 run (174 at census, 175 at end): BOTH of that run's open items resolved COMPLETED — its steered Q52 session and its GameSignal re-fire (below); no other new sessions.

- **Follow-up verification (both flags from last run, RESOLVED):**
  - `11559036333323233321` "INTEL: defensive field-zone split — red-zone vs open-field efficiency allowed (SHADOW)" (Q52) — COMPLETED 2026-11-08T08:31Z with PR #1262 (https://github.com/Beexly/Sports/pull/1262). Outputs verified from the listing: patch touches ONLY AGENTS.md + the 5 in-scope files (defensive-field-zone-split.ts, its test, index.ts, nflverse-pbp-mapper.ts, metric-birth-certificate-registry.ts) — NO scratch files (patch.js / test_merge.py / plan.md all absent; the 00:40 steer held). PR body confirms the reviewer fix was applied (red-zone TD allowed counts touchdown===1 only with turnover===0, i.e. defensive TDs excluded) and floors/tests pass. The AWAITING-after-steer flag is closed: the session picked up the steer and finished.

### PR #1262 — live state, re-verified by Motif 2026-11-09

- **OPEN**, not merged. Title: "Implement Q52 Defensive Field-Zone Split". Head `jules-q52-defensive-field-zone-11559036333323233321` @ bd0f4e8e82. **6 files, +608/-1**, exactly the allowed set:
- `AGENTS.md` (+2/-0, modified)
- `packages/prediction-engine/src/expected-metrics/defensive-field-zone-split.ts` (+290, new)
- `packages/prediction-engine/src/expected-metrics/__tests__/defensive-field-zone-split.test.ts` (+267, new)
- `packages/prediction-engine/src/expected-metrics/index.ts` (+2/-0)
- `packages/prediction-engine/src/expected-metrics/nflverse-pbp-mapper.ts` (+27/-1 — the single deleted line is the one the loop flagged for the merge sheriff)
- `packages/prediction-engine/src/metrics/core/metric-birth-certificate-registry.ts` (+20/-0)
- Status: awaiting merge-sheriff review. Nothing about this PR has been merged.

---

## Q53 — QB efficiency split by opponent defensive tier (FIRED, PR now open)

### Queue entry as first queued (tightening owed)

## Q53 (added 2026-11-07 PM run 66): QB efficiency split by opponent defensive tier — matchup sensitivity (SHADOW) — QUEUED, tightening owed, NOT fired
- From @ScottBarrettDFB (ID 2118732388620701738; source @FantasyPtsData; CSV barrett-maye-vs-top10-defenses-2026.csv): Maye EPA/DB -0.12 vs top-10 EPA/DB defenses vs +0.30 vs the rest; the drop ranks 1st of 26 QBs on ANY/A, EPA/DB and sacks/game.
- Bounded shape (draft): per-QB EPA/dropback split by opponent tier (top-10 vs rest) + sensitivity delta, own EPA, PIT. Distinct from Q47 (team-facing trailing opponent-QB quality, changeset stranded) and Q27 (ANY/A level, PR #1186).
- TIGHTENING OWED before any fire: (1) the tier basis is unstated in the source — pin a PIT definition (opponent's season-to-date defensive EPA/dropback rank entering the game week, computed from the same pbp population) or do not fire; (2) v1 scope = EPA/DB split + delta ONLY (ANY/A is Q27's surface; sacks/game is a counting slice); (3) min-dropback floors per tier per QB. Held this run: definition not airtight — never fire speculatively.


### AM run 67 fire-time tightening verdict: READY, definition pinned

## Q53 — FIRE-TIME TIGHTENING VERDICT (2026-11-08 AM run 67): READY — pinned definition below; PM run fires

Performed by direct repo reads against the Q42 (PR #1212) and Q52 (PR #1262) SHADOW patterns plus the mapper contract on the reference main. All three owed items from the queueing entry are now pinned:

- (1) TIER BASIS (PIT, pinned): a dropback's opponent tier is the DEFTEAM's rank by defensive EPA/dropback ALLOWED entering THAT PLAY'S OWN week — mean own EPA (attachOwnEpa) allowed per ratable dropback over all dropbacks that defense faced in weeks strictly before the play's week, ranked ascending (lowest allowed = rank 1 = best defense) across defenses with >= 100 ratable dropbacks faced entering the week. TOP-10 = ordinal ranks 1–10 with deterministic tie-break (EPA asc, then defteam asc) — exactly 10 teams, no tie expansion. A defense below the 100-dropback prior floor is UNRANKED that week; dropbacks against an unranked defense are excluded from both arms and COUNTED. Week 1 has no prior weeks: every defense is unranked and every Week-1 dropback is unclassified + counted — never backfilled from full-season ranks (that would leak the future into the tier).
- (2) V1 SCOPE (pinned): EPA/dropback split + sensitivity delta ONLY. ANY/A is Q27's fired surface (PR #1186) and sacks/game is a counting slice — both OUT, named in the module header as exclusions.
- (3) DROPBACK POPULATION (pinned, mirrors Q42): play_type == "pass" rows; qb_spike == 1 excluded from both arms + counted; sacks stay IN (pass rows); scrambles never enter (run rows in pbp). Own EPA null → excluded from that arm's mean + counted; the dropback still counts in the arm's dropback total. Tier and QB metric share this one population.
- (4) OUTPUTS + SHRINKAGE (pinned): per QB (passer_player_id non-empty; empty excluded + counted, never guessed), per window (season-to-date / last-4 / last-8 distinct weeks, week < targetWeek), per tier arm: dropbacks, ratableDropbacks, rawEpaPerDropback (mean own EPA), shrunkEpaPerDropback = leagueTierMean + (n/(n+20)) × (raw − leagueTierMean), n = arm ratable dropbacks, leagueTierMean = dropback-weighted mean own EPA over ALL QBs' ratable dropbacks in that tier + window. sensitivityDelta = shrunk vs TOP-10 MINUS shrunk vs REST (negative = worse against top defenses; Maye's printed direction: −0.12 vs +0.30 → delta ≈ −0.42). Raw values emitted alongside every shrunk value.
- (5) FLOORS (pinned): an arm is emitted in a window only with >= 30 ratable dropbacks in that tier; the delta is emitted only when BOTH arms are emitted. Below-floor arms are absent (never 0) and counted in diagnostics with the reason.
- (6) INPUTS (verified): defteam + posteam already in the mapper allowlist; week, passer_player_id, qb_spike are additive-only core pbp columns per the Q42 handoff precedent (verify core-record presence at fire time per the Q18 rule; stop-and-say-so if unverifiable). EPA axis is own EPA via attachOwnEpa only; the nflverse epa column is referee-only, never emitted. Distinctness stands: Q47 (team-facing trailing opponent-QB quality, stranded changeset, no PR) is the mirror image, not this metric; Q27 is ANY/A level, not a tier split.
- Q53 is READY. PM run tonight fires it (window: Q52 ages out 2026-11-08 ~21:35 CST; PM slot ~21:30 CST fires after the window clears, per the run 16/18/20/22/24/26 hold-until-clear pattern).

### Budget ledger (continued)

- 2026-11-08 ~09:30 CST run (AM run 67): 0 FIRED. Intel: NONE new filed — newest findings file remains x-intel-2026-11-07-09.md (triaged in full by PM run 66); no x-intel-2026-11-08 file, no run-log-2026-11-08, and no staging-2026-11-08 directory exists — directory listing verified this run; the Nov 8 09:08 sweep has not filed as of ~09:35 CST. Absence inspected explicitly, not a read/transport error. Nothing triaged, no CONTENT briefs this run.
- Status watch (synchronous foreground reads + shepherd-log census): Q52 session 11559036333323233321 COMPLETED 2026-11-08T08:31Z -> PR #1262 OPEN (created 2026-11-08T07:10:35Z, head bd0f4e8e827). DIFF VERIFIED BY THIS LOOP via the GitHub files endpoint: exactly the 6 allowed files, +608/−1 (defensive-field-zone-split.ts + test new; index.ts; nflverse-pbp-mapper.ts +27/−1 — the single deleted mapper line is noted for the sheriff, Q51 precedent; metric-birth-certificate-registry.ts; AGENTS.md). Shepherd verification agrees: no scratch files (the 00:40 steer held), reviewer fix applied (red-zone TD allowed = touchdown===1 && turnover===0, pick-six excluded). Awaiting merge-sheriff review. 88 open PRs, net +3 vs PM run 66 — additions #1262 (Q52, loop), #1263 + #1264 (non-loop duplicate-merge fixes). Loop PRs #1212–#1217, #1226 (Q49), #1227 (Q50), #1232 (Q51) still OPEN, unchanged. Q47/Q48 stranded-changeset flag stands (shepherd/sheriff lane owns recovery; loop does not re-fire). Git local tip 1984cfaf6 unchanged (local checkout only).
- Tightening performed: Q53 is now READY with the pinned PIT tier definition above (AM-tighten → PM-fire cadence, runs 10/15 precedent). Fire held for tonight's PM run per that cadence — NOT a budget block: trailing-24h loop fires = 1 (Q52, createTime 2026-11-08T03:35:14Z), 1 slot remains in-window until ~21:35 CST.
- VERIFY slot not burned: #1262's diff was verified directly by this loop and independently by the shepherd — a Jules VERIFY would duplicate two completed verifications; no other genuinely review-worthy new loop PR state.
- Queue depth after run: 3 pending (Q26 [input-blocked], Q35 [tightening failed], Q53 [READY — PM run fires]). Budget used: 0/2 this run; trailing 24h holds PM run 66's 1/2 (Q52).


### The Jules prompt as fired (run68-prompts, full text)

```text
# INTEL BUILD — Q53: QB efficiency split by opponent defensive tier — matchup sensitivity (SHADOW expected metric)

## The intel item
From @ScottBarrettDFB (2026-11-07 sweep, x-intel-2026-11-07-09.md +
staging-2026-11-07-09/section-09.md; source data @FantasyPtsData; CSV
barrett-maye-vs-top10-defenses-2026.csv; the sweep is COMPLETE and
remote-verified, run-log 2026-11-07-09, commit 7716f1f): Drake Maye's
EPA/dropback is -0.12 against top-10 EPA/DB defenses and +0.30
against the rest — a drop that ranks 1st of 26 QBs on ANY/A, EPA/DB
and sacks/game. Queued as Q53 in the intel-build queue on 2026-11-07
(PM run 66); fire-time tightening pinned 2026-11-08 (AM run 67) and
re-verified at fire time below.
Why it matters: every QB efficiency surface the engine has is a
single whole-schedule number. No surface asks whether a QB's
efficiency SURVIVES good defenses — yet matchup sensitivity is
exactly what separates a schedule-inflated line from a real one when
the brain prices next week's opponent. The split itself, and the
size of the drop against top defenses, is the signal. The framing
innovation in the source is the top-10-vs-rest split of the same QB
metric; this module is GSE's own point-in-time implementation of
that split from public play-by-play, with the tier earned entering
each week — never backfilled from full-season ranks.
Distinctness, verified at fire time (2026-11-08, direct repo + PR
reads): Q27 (PR #1186 OPEN) is the ANY/A LEVEL — no tier split, and
ANY/A is explicitly OUT of this module. Q47 (session COMPLETED,
changeset stranded, NO PR) is the mirror image — a TEAM-facing
trailing opponent-QB-quality number, not a per-QB split of the QB's
own efficiency by the defense he faced. Q42 (PR #1212 OPEN) splits a
QB's EPA by play-action, not by opponent. No module or open PR
splits QB EPA/dropback by a point-in-time opponent defensive tier.

## Fire-time verification (done by Motif 2026-11-08, direct repo + API reads — trust these, do not re-derive differently)
- VERIFY CURRENT MAIN FIRST: the local reference checkout is stale
  (October). Your session clones current origin/main — re-check the
  expected-metrics directory there before writing anything. On the
  reference main, packages/prediction-engine/src/expected-metrics/
  holds the landed modules (drives, expected-completion,
  expected-points, expected-rush-yards, expected-yac, linear,
  logistic, numeric, rollup, success-rate, types, validation,
  win-probability, the mapper, index). Sibling SHADOW modules live
  on open PR branches and show the current pattern: the module
  defines its own Play interface carrying `epa: number | null` ("our
  EPA for the play, attached via attachOwnEpa; null means
  unratable"), and the mapper gains an additive mapped series.
  Compose with that pattern — do NOT import from any PR branch; this
  module is self-contained on main. If a QB-by-opponent-tier module
  already exists on current main, STOP and say so in the PR body.
- The mapper allowlist (NFLVERSE_PBP_EXPECTED_METRICS_COLUMNS in
  nflverse-pbp-mapper.ts) ALREADY carries defteam, posteam,
  play_type on the reference main. It does NOT yet carry week,
  passer_player_id, or qb_spike there — if still missing on your
  branch, add them ADDITIVELY (below). week, passer_player_id and
  qb_spike are core nflverse pbp columns recorded in the play record
  itself, NOT FTN-charting or participation columns (the Q38/Q42/
  Q49/Q50/Q51/Q52 handoffs pinned the same additions) — verify from
  the core record before wiring, per the Q18 precedent; if you
  cannot verify a column is core pbp, STOP and say so in the PR
  body rather than reaching for a charting source.
- EPA axis: the engine's OWN EPA via attachOwnEpa — for the QB's
  efficiency it is the offense's own EPA on the dropback; for the
  tier ranking it is the own EPA the DEFENSE allowed on the
  dropbacks it faced (the offense's own EPA on those plays). The
  nflverse `epa` column is a calibration REFEREE ONLY (mapper
  contract) — never emit it, never substitute it. Dropbacks whose
  own EPA is null are excluded from every mean and COUNTED in the
  output's exclusion diagnostics (they still count in the arm's
  dropback total; see pins).

## Definition pins (follow exactly; do not invent alternatives — pinned at tightening, AM run 67, 2026-11-08)
- Dropback population (ONE population shared by the tier ranking and
  the QB metric): rows with play_type == "pass". Rows with
  qb_spike == 1 are excluded from both arms and from the tier
  population, and COUNTED (a spike is a clock play, not a designed
  dropback). Sacks stay IN (they are pass rows). Scrambles never
  enter (they are run rows in pbp).
- Tier basis (POINT-IN-TIME, the heart of the module): a dropback in
  week W is classified by its DEFTEAM's rank by defensive
  EPA/dropback ALLOWED entering week W — the mean own EPA allowed
  per ratable dropback over all dropbacks that defense faced in
  weeks strictly before W (within the input the entry point hands
  the module; the entry point itself only ever receives rows with
  week < targetWeek, so no future information exists in the input).
  A dropback is RATABLE for tier purposes when its own EPA is
  non-null. A defense is RANKED entering week W only with >= 100
  ratable dropbacks faced in weeks before W. Ranks are ordinal,
  ascending by mean EPA allowed (lowest allowed = rank 1 = best
  defense), ties broken by mean EPA allowed ascending then defteam
  ascending — deterministic, exactly one defense per rank. TOP-10 =
  ordinal ranks 1-10 — exactly 10 teams, no tie expansion. REST =
  every other RANKED defense. A defense below the 100-dropback prior
  floor is UNRANKED that week: dropbacks against it are excluded
  from both arms and COUNTED as unclassified. Week 1 has no prior
  weeks: every defense is unranked and every Week-1 dropback is
  unclassified + counted — NEVER backfilled from full-season ranks
  (that would leak the future into the tier). Tier classification
  depends only on the play's own week, never on the output window:
  a dropback in a last-4 window still carries the tier its defense
  had earned entering that dropback's week, computed from ALL prior
  weeks in the input, not only weeks inside the window.
- Per QB (passer_player_id non-empty; rows with an empty
  passer_player_id are excluded from QB grain and COUNTED, never
  guessed), per window, per tier arm (TOP-10 / REST): dropbacks
  (all classified dropbacks in the arm), ratableDropbacks (own EPA
  non-null), rawEpaPerDropback = mean own EPA over the arm's ratable
  dropbacks, and shrunkEpaPerDropback = leagueTierMean +
  (n / (n + 20)) x (raw - leagueTierMean), where n = the arm's
  ratable dropbacks and leagueTierMean = the dropback-weighted mean
  own EPA over ALL QBs' ratable dropbacks in that tier and window.
  Raw values are emitted alongside every shrunk value.
- sensitivityDelta (the headline output) = shrunkEpaPerDropback vs
  TOP-10 MINUS shrunkEpaPerDropback vs REST. Negative = worse
  against top defenses (Maye's printed direction: -0.12 vs +0.30,
  delta approx -0.42).
- Floors: an arm is emitted in a window only with >= 30 ratable
  dropbacks in that tier. The delta is emitted only when BOTH arms
  are emitted. Below-floor arms are ABSENT from emission (never
  emitted as 0) and counted in diagnostics with the reason.
- Windows and point-in-time: entry point mirrors the sibling
  modules — compute function over the module's mapped plays with
  targetSeason + targetWeek; only rows with week < targetWeek are
  used. Windows: season-to-date, last-4 distinct weeks, last-8
  distinct weeks ("distinct weeks" = the 4 / 8 largest distinct
  week values present in the data below targetWeek). Window
  membership decides which classified dropbacks aggregate into a
  QB's arms; it never changes a dropback's tier (see tier pin).
- V1 SCOPE: EPA/dropback split + sensitivity delta ONLY. ANY/A is
  Q27's fired surface (PR #1186) and sacks/game is a counting slice
  — both are OUT and must be named as exclusions in the module
  header. No composite score, no team grain in v1.
- SHADOW only: deterministic-rule method, provenance
  (modelVersion, featureSchemaHash, sampleSize per the
  ExpectedMetricProvenance contract in types.ts — sampleSize = the
  QB's total classified ratable dropbacks in the window). No
  consumer wiring, no UI, no gate changes.

## Allowed set (exactly these files; anything else is a scope violation)
1. packages/prediction-engine/src/expected-metrics/qb-opponent-tier-efficiency-split.ts (new)
2. packages/prediction-engine/src/expected-metrics/__tests__/qb-opponent-tier-efficiency-split.test.ts (new)
3. packages/prediction-engine/src/expected-metrics/nflverse-pbp-mapper.ts — ADDITIVE ONLY: add "week", "passer_player_id", and "qb_spike" to NFLVERSE_PBP_EXPECTED_METRICS_COLUMNS if still missing on your branch, and add the mapped series for this module following the existing series pattern (the series must carry, per play: week, passer_player_id, defteam, play_type, qb_spike, and the attached own EPA); never remove or rename anything existing.
4. packages/prediction-engine/src/expected-metrics/index.ts (additive export only)
5. packages/prediction-engine/src/metrics/core/metric-birth-certificate-registry.ts (one additive registry entry, following the existing entries' shape, status SHADOW)
6. AGENTS.md (one note, per the closing instruction below)
packages/prediction-engine/src/index.ts may be touched ONLY if mechanically
required for the export to compile — say so in the PR body if you touch it.
HARD BAN, learned from PRs #1193/#1200/#1201: do NOT touch
scripts/guardrails/dependency-audit.mjs, any package.json, or
package-lock.json, and do not add audit waivers or upgrade dependencies for
any reason — if CI complains about dependencies, leave it failing and say
so in the PR body; the merge sheriff owns dependency state. Nothing else:
no new ingestion, no schema changes, no other packages, no research CSVs
or docs files in the PR.

## Tests must assert
- Hand-computed fixture (at least 2 QBs, at least 11 defenses so a
  rank-11 defense exists): per-arm dropbacks, ratableDropbacks,
  rawEpaPerDropback, leagueTierMean for each tier, the n/(n+20)
  shrinkage, and sensitivityDelta match hand arithmetic exactly —
  including the tier ranks the fixture defenses earn from the
  fixture's own prior weeks.
- Tier boundary: the defense ranked exactly 10 entering a week is
  TOP-10 for that week's dropbacks; the defense ranked 11 is REST.
  A tie on mean EPA allowed is broken by defteam ascending and
  still yields exactly 10 top-10 defenses.
- Point-in-time tier discipline: a defense that is terrible in weeks
  1-3 and elite from week 4 on is ranked by its weeks-before-W
  record only — its week-3 dropbacks carry the bad early rank, and
  appending later-week rows (still below targetWeek) does not
  change any earlier week's classification. Week-1 dropbacks are
  all unclassified and counted.
- Unranked floor: a defense with 99 prior ratable dropbacks faced
  entering week W is UNRANKED for week W (its dropbacks excluded
  from both arms and counted); at 100 prior ratable dropbacks it is
  ranked.
- Population: a qb_spike == 1 row is in neither arm, does not count
  toward any defense's tier record, and is counted as
  spike-excluded; a sack row (play_type "pass") IS in its arm and
  its defense's tier record; a run row never enters even with a
  passer id set.
- The EPA averaged is the attached OWN EPA on both axes: a fixture
  whose referee `epa` column disagrees with own EPA produces tier
  ranks and QB output from own EPA only; a null-own-EPA dropback is
  excluded from its arm's mean and from the tier record's ratable
  count, counted in diagnostics, but still counts in its arm's
  dropback total.
- Floors: a QB arm at 29 ratable dropbacks in a window is absent
  from that window, at 30 present — including the last-4 window;
  sensitivityDelta is absent when either arm is absent, and present
  with the pinned sign when both are present (a fixture QB worse
  vs TOP-10 produces a NEGATIVE delta).
- Attribution: a row with an empty passer_player_id is excluded
  from QB grain and counted, but STILL counts toward its defense's
  tier record (the defense faced the dropback); no QB is ever
  guessed.
- Windows: results for a targetWeek are unchanged when rows from
  weeks >= targetWeek are appended; the last-4 window aggregates
  only dropbacks in the 4 most recent distinct weeks below
  targetWeek, while those dropbacks' tiers still derive from ALL
  prior weeks in the input (a week-9 dropback in a last-4 window
  spanning weeks 6-9 carries the tier earned entering week 9, not a
  tier computed from weeks 6-8 only).

## Done means
Module + tests land in one PR from main, tests pass, the metric is
registered in the birth-certificate registry, and the PR description states
the point-in-time tier definition (prior-weeks defensive EPA/dropback
allowed, >= 100 ratable dropbacks faced to be ranked, ordinal ranks 1-10
with the defteam tie-break), the shared dropback population with the spike
exclusion, the shrinkage and floors, the own-EPA rule on both axes, and
the v1 exclusions (no ANY/A, no sacks/game, no team grain, no composite)
plainly. If any pin cannot be followed with the inputs on main, STOP and
say so in the PR body rather than inventing a substitute input.

When your PR is up: (1) note what you built and where in the repo's AGENTS.md per its existing conventions; (2) drop a note in the agent bus at ~/workspace/vendor/agent-bus/outbox/from-jules/q53-qb-opponent-tier-split-2026-11-08.md so the fleet sees it.
```

### Run 68 record (fired 2026-11-08 21:37 CST)

## Q53 — FIRED (2026-11-08 PM run 68)

- Session `6441804516979526590` "INTEL: QB efficiency split by opponent defensive tier - matchup sensitivity (SHADOW)" — createTime 2026-11-09T03:37:43Z = 21:37 CST, verified IN_PROGRESS via synchronous Jules API GET this run (prompt 20,861 chars in the live session; fleet-standards + reasoning-doctrine prepended verbatim, 7,233 chars; Q53 header, HARD BAN and bus slug all present in the live prompt). AUTO_CREATE_PR, main, requirePlanApproval=FALSE. Prompt backup: hidden_files/run68-prompts/jules_prompt_q53-qb-opp-tier.txt.
- Fire-time verification performed by THIS loop against REMOTE main via the GitHub contents API (local checkout tip 1984cfaf6 is stale/local-only): mapper allowlist on remote main (40 cols) carries defteam, posteam, play_type, yardline_100, interception, game_id, play_id; week, passer_player_id, qb_spike are MISSING -> the handoff's additive-only pin is exactly scoped. attachOwnEpa present in the remote mapper. Dedup: synchronous Jules list (30 most recent) shows no INTEL session since Q52 and no session on Q53; 89 open PRs carry no QB-by-opponent-tier split.
- Timing: Q52 (createTime 2026-11-08T03:35:14Z) aged out of the trailing-24h window at 2026-11-09T03:35:14Z, ~2.5 minutes before this fire — trailing-24h loop fires at fire time = 0; this fire uses 1/2 of a fresh window. Slot 2 NOT spent (Q54 below is queued with tightening owed — never fire speculatively).
- Q53 pins as fired: PIT tier = defteam rank by defensive EPA/dropback allowed entering the play's own week (>= 100 prior ratable dropbacks faced to be ranked; ordinal ranks 1-10, EPA-asc then defteam-asc tie-break, exactly 10; unranked-opponent dropbacks excluded + counted; Week 1 fully unclassified); shared dropback population (pass rows, spikes out + counted, sacks in, scrambles never); own EPA via attachOwnEpa on BOTH axes (QB efficiency + tier record), referee never emitted; shrinkage n/(n+20) toward the window's league tier mean; arm floor 30 ratable dropbacks, delta only when both arms emit; windows season / last-4 / last-8 distinct weeks (week < targetWeek), tier never window-limited; v1 = EPA/DB split + delta ONLY (ANY/A = Q27/PR #1186 OUT; sacks/game OUT; no team grain, no composite); allowed set = the standard 6 files with the HARD BAN on dependency-audit/package files.
- Status: FIRED, awaiting PR. Q53 leaves the pending queue.


### PR #1266 — opened after the last report; live state re-verified by Motif 2026-11-09

- **OPEN**, not merged. Title: "feat: add QB Opponent Tier Efficiency Split (SHADOW)". Created 2026-11-09T07:16:32Z (01:16 AM CST). Head @ 3e0e3a6d27. **6 files, +555/-0**, exactly the allowed set, purely additive (the mapper change is +18/-0, matching the additive-only pin for week / passer_player_id / qb_spike):
- `AGENTS.md` (+2/-0)
- `packages/prediction-engine/src/expected-metrics/qb-opponent-tier-efficiency-split.ts` (+277, new)
- `packages/prediction-engine/src/expected-metrics/__tests__/qb-opponent-tier-efficiency-split.test.ts` (+226, new)
- `packages/prediction-engine/src/expected-metrics/index.ts` (+13/-0)
- `packages/prediction-engine/src/expected-metrics/nflverse-pbp-mapper.ts` (+18/-0)
- `packages/prediction-engine/src/metrics/core/metric-birth-certificate-registry.ts` (+19/-0)
- Status: awaiting merge-sheriff review, same as #1262. The Nov 8 9:41 PM report said the PR "will open on its own" — it did, about three and a half hours later.

---

## Q54 — QB before/after first interception (QUEUED, tightening owed, NOT fired)

## Q54 (added 2026-11-08 PM run 68): QB efficiency split before vs after first interception — in-game tilt response (SHADOW) — QUEUED, tightening owed, NOT fired

- From @sfdata9ers (ID 2119145611366986195, Nov 7; data: Fantasy Points Data, Weeks 1-8) + methodology self-reply (ID 2119370715019284527, Nov 8): EPA/play before the first INT plotted against EPA/play after it, quadrants for bounce-back vs downward-spiral; minimum 25 plays before and after the first INT, the INT play itself and INT-less games excluded; the methodology reply pins the after-side floor as at least 25 relevant QB plays after the first INT ACROSS ALL GAMES (Goff and Williams do not appear for failing it). PARTIAL scatter — no per-QB numbers printed; the build rests on the printed methodology, not the chart values.
- Bounded shape (draft): per-QB own-EPA split over his dropbacks strictly before vs strictly after his own first interception within each game, aggregated across games; the INT play itself excluded; games where the QB throws no INT contribute nothing. Distinct from every fired surface: no module splits a QB's efficiency by an in-game event boundary (Q14/Q29 family splits on pressure environment, not turnovers).
- Inputs verified at queue time (this run, remote-main mapper read): interception, game_id, play_id are ALREADY in the remote allowlist (40 cols) — within-game ordering and the INT flag are carried inputs. week + passer_player_id are the same additive-only pair Q53's fire adds if its PR lands first (additive-only either way).
- TIGHTENING OWED before any fire: (1) the play unit — the source says "QB plays" / "relevant QB plays" without defining them; pin the dropback population at fire time (Q42 precedent: pass rows, spikes out + counted, sacks in) or do not fire; (2) floors — the before-side 25 is ambiguous between per-game and aggregate readings while the after-side is pinned aggregate by the methodology reply; pin both arms explicitly (aggregate reading for both is the draft); (3) multi-QB games — a relief QB's "first INT" is his own (per QB-game grain), and his pre-INT dropbacks count even when a teammate already threw one; confirm or re-pin at fire time; (4) shrinkage/floors shape for the two arms + the delta, following the Q53 pattern. Held this run: definition not airtight — never fire speculatively.


---

## Content briefs filed (nothing posted)

### IDEAS-20261107.md — 19 briefs from the Nov 7 sweep (full file)

# Content ideas — 2026-11-07 (from the intel-to-build loop, PM run 66)

One line each: angle + underlying fact + source. Never post from this file — the x-poster flow and Garrett's APPROVE gate own publishing. Facts are from the COMPLETE Nov 7 sweep (x-intel-2026-11-07-09.md + staging-2026-11-07-09/section-09.md in full + run-log-2026-11-07-09.md; pushed to Beexly/Sports main, commit 7716f1f, 35 CSVs, final watermark 2119084579504144663). PARTIAL / approximate items are flagged as printed.

## PM run (Nov 7 sweep triage — window after status 2118721479298990591 – 9:08 AM Nov 7 CT)

- Help is not production: the QB Supporting Cast Score separates what surrounds a QB from what he does — San Francisco's cast tops the 32 at 72.9, the Chargers' is last at 20.3, and the weights are printed on the chart (Route Win Rate 0.25, Pressure Over Expected 0.20, Quick Pressure 0.15) (data: Fantasy Points Data) (@sfdata9ers).
- Pass protection as value, not vibes: wPP prices an offensive lineman's pass pro in EPA above expectation — Amarius Mims leads tackles at +1.68, Tate Ratledge leads the interior at +0.90, Weeks 1–8, min. 141 snaps (charting: SumerSports) (@realjoespinosa7).
- The riser is a coordinator, not a player: Frank Reich's PCVR jumped 39.0 to 58.6, rank 25 to 14, the biggest move on the board — and his own 90% range still spans rank 3 to 23 (PCVR 2.0; data: nflverse + FTN) (@connor_long15).
- Two defenses wearing one jersey: Seattle is 1st in DVOA, 2nd in success rate and 3rd in EPA/play between the 20s — and 32nd in all three inside the 20, where 15 of 17 trips (88%) ended in touchdowns (data: nflfastR + FTN) (@suuma810).
- Regression has a receipt: defenses with Seattle's exact open-field-elite / red-zone-last profile through Week 8 since 2006 saw their rest-of-season red-zone TD rate allowed fall from 71% to 55%, right at the 56% league average (@suuma810).
- The funnel is the matchup: FunnelReport+ ranks pass funnels Bills, Jaguars, Lions, Commanders, Ravens and run funnels Panthers, Chargers, Titans, Saints, Falcons — 46 stats and 16 factors, ranks free, grades paid (PARTIAL: top 5s only) (@MagicSportsGuy / @StatRankings).
- Alone on the edge: Trent Williams owns the highest pass block win rate "on an island" among active tackles at 96.4%, ahead of Latham 96.1% and Mims 95.9% — the post never defines "on an island" (@PFF).
- No quarterback falls further against real defenses: Drake Maye's drop against top-10 EPA/DB defenses (−0.12 vs +0.30 against the rest) ranks 1st of 26 QBs on ANY/A, EPA/DB and sacks per game (source: Fantasy Points Data) (@ScottBarrettDFB).
- Beating the number, not the box: Jaylen Warren leads rushing yards over expected per attempt at +1.54 (min. 50 carries), ahead of Walker +1.41, Cook +0.99 and Robinson +0.97 (@FantasyPtsData).
- One receiver IS the offense: Jaxon Smith-Njigba's 3.84 yards per team pass attempt is 2nd since 1957, and his 51.5% receiving yardage market share leads the league (Fantasy Points Data for the share) (@ScottBarrettDFB).
- Accuracy over expectation: Joe Burrow tops CPOE entering Week 9 at +9.0, with Geno Smith (Jets, per the standing ruling) at +6.0 in the same top 10 (source: PFN NFL Impact, nflimpact.app) (@PFN365).
- Aggression is a coaching stat: 4th-and-1-to-5 go rate inside field-goal range — LaFleur goes 80% of the time, Schottenheimer 0%, league average 45%, Weeks 1–8 (data: nflverse; chart via @DhananiZain, quoted) (Lane C aggressiveness search).
- Field position is a hidden offense: Buffalo's average drive start (34.79-yard line) leads a full 32-team table — the best starting field position in football, before a snap is taken (data: Fantasy Points Data) (@sfdata9ers).
- Throw at him at your own risk: quarterbacks targeting Trent McDuffie post a 30.2 passer rating, the lowest allowed among defenders with 24+ targets (full 94 filed) (data: Fantasy Points Data) (@sfdata9ers).
- Same route tree, opposite answers: Matthew Golden posts 3.11 YPRR vs man and 0.65 vs zone; Christian Watson is the mirror — 2.15 vs man, 3.21 vs zone (source: Statyx) (@statyxio).
- Count the verb before you count the stat: Jordan Love "threw" 52 passes of 20+ yards per one board and "completed" 33 per another — both filed, different measures, not a conflict (@PFF vs @NFL_Researcher).
- Holding it longest: Caleb Williams' 3.24-second average time to throw tops the full 32-team table through Week 8 (data: nflverse) (@GridironInfo_).
- Survivor is a Kansas City week until it isn't: the Week 9 survivor card tops out at Kansas City 84.4% (@cmain7).
- The rookie at the top of the efficiency board: Omar Cooper Jr.'s 1.44 EPA/play leads 113 wide receivers (median 0.25) (@DynatyzeFF).

### IDEAS-20261108.md — 14 briefs from the Nov 8 sweep (full file)

# Content ideas — 2026-11-08 (from the intel-to-build loop, PM run 68)

One line each: angle + underlying fact + source. Never post from this file — the x-poster flow and Garrett's APPROVE gate own publishing. Facts are from the COMPLETE Nov 8 sweep (run-log-2026-11-08-09.md + staging-2026-11-08-09/section-09.md in full; pushed to Beexly/Sports main, commit d333e747, 39 CSVs, final watermark 2119446706597052809). No x-intel-2026-11-08 summary file was filed by the sweep — triage ran off the section file directly. PARTIAL / approximate items are flagged as printed.

## PM run (Nov 8 sweep triage — window after status 2119084579504144663 – 9:08 AM Nov 8 CT)

- A dual-threat index you can audit on one line: (PassEPA/p × 50) + (RushEPA/p × 50) + (CPOE × 2) + ANY/DB + (Rush Success % × 20) + (Broken Tackle % × 20) − (Turnover % × 5) — formula printed in full, built by the author's own LLM, no player values posted (@evduzit).
- The dome edge is real and tiny: Tyler Bass is 21/22 (95.5%) in domes vs 126/149 (84.6%) everywhere else since 2020 — on only 22 dome attempts — and the league-wide split since 2015 is 85.4% dome vs 84.4% outdoor across 11,593 kicks, about one point (@MagicSportsGuy, Splits+ tool).
- Shadow coverage, defined: a shadow is man coverage above 65% — Christian Gonzalez is expected (not measured) to shadow Christian Watson on ~73% of routes, and Gonzalez has defended only 12 slot routes all season against Watson's 27% slot rate (@MagicSportsGuy, ShadowCoverage+).
- Two different pass rushes in one defense: the Giants grade worst (15) when they don't send pressure and double to 30 when they blitz, with the 4th-best EPA/play allowed (−0.172) in the blitz split — the rating itself is never defined in the post (@The_Coach_A).
- Required vs observed: the cleanest prop framing in the feed — Sengun needs a 51.6% conversion of his potential assists to clear 6.5; he is converting at 60.0% (NBA tool at launch; the framing transfers) (@statyxio, CounterPlay).
- Scripted starts don't predict adjustments: EPA/play above expectation on a game's first 15 plays correlates only +0.25 with second-half EPA/play above what the first half predicted — single-season samples are noisy by the author's own note (data: nflverse + FTN) (@connor_long15).
- The first interception is a fork in the game: QB EPA/play before the first INT plotted against EPA/play after it splits quarterbacks into bounce-back and downward-spiral quadrants — minimum 25 QB plays on each side, INT-less games excluded (PARTIAL scatter, no per-QB numbers printed) (data: Fantasy Points Data) (@sfdata9ers).
- Coaching as a pass-rate number: Cincinnati projects at a 63.3% pass rate against a 59.2% expectation (+4.7 pts of coaching effect); Atlanta projects 56.3% against 61.4% (−6.2 pts) (@statyxio projections).
- Pressure allowed is a team stat with a 13-point spread: the Rams allow pressure on 15.8% of dropbacks, the Panthers on 28.5% — full 32 filed (data: PFR, via @GridironInfo_).
- Throwing at the top of the board: quarterbacks targeting Jaxon Smith-Njigba's coverage post a 141.9 passer rating when targeted, highest of the top-30 table; Mike Evans (49ers, per the standing ruling) is second at 137.5 (data: Fantasy Points Data) (@sfdata9ers).
- Man coverage is a choice with a range: team man-coverage rates run from 46.2% down to 7.2% across the full 32 (team labels PARTIAL — logos only) (data: Fantasy Points Data) (@sfdata9ers).
- The edge board: Chop Robinson leads a 12-man edge pass-rush-win-rate table at 36% (@omardouk).
- Age, weighted by snaps: offenses span 25.14 to 30.12 snap-weighted years (San Francisco oldest), defenses 25.57 to 28.82 (team labels PARTIAL — logos only) (data: Fantasy Points Data) (@sfdata9ers).
- Aggression, updated (POST-WINDOW capture, 9:30 AM Nov 8 — first item for the next sweep): Brissett throws into tight coverage 24% of the time, Mahomes 7% — full 32 filed (data: Next Gen Stats, via @GridironInfo_).

---

## Dropped with reasons (the ledger the reports refer to)

### Dropped, 2026-11-07 PM run 66

## Dropped (2026-11-07 PM run 66, with rationale)

Source: x-intel-2026-11-07-09.md (COMPLETE Nov 7 09:08 sweep, window after status 2118721479298990591 - 9:08 AM Nov 7 CT) + staging-2026-11-07-09/section-09.md in full + run-log-2026-11-07-09.md. Sweep pushed to Beexly/Sports main, commit 7716f1f, 35 CSVs, final watermark 2119084579504144663. AM run 65 did not triage this file (unfiled at its 09:30 slot; filed 11:26 CST) — first triage is this run. NEWS/MARKET skipped per loop spec.

- @sfdata9ers QB Supporting Cast Score (Fantasy Points Data) as build — 8-metric composite with printed percentile weights (Route Win Rate 0.25, Pressure O/E 0.20, Quick Pressure 0.15, YAC/Rec 0.10, Rush SR 0.10, Avg. Start 0.10, Drop % 0.05, Expl. Run % 0.05), but 3 of 8 components (Route Win Rate, Pressure Over Expected, Quick Pressure %) are FantasyPts charting with no engine input, and the score is a weighted average of HISTORICAL percentiles whose percentile population is unstated — not faithfully implementable (standing composite drops: PCVR PM run 64, SIM/wEPA/Dynatyze family). The pbp-computable residue (Drop %, YAC/Rec, non-QB rush success/explosiveness, drive start) is fragments, not the metric. -> DROP as build; CONTENT brief written (SF 72.9 top / LAC 20.3 bottom).
- @realjoespinosa7 wPP / xwPP (OL pass-pro value) as build — wPP is EPA-based but per-lineman pass-pro snaps and the xwPP lost-rep expectation are @SumerSports charting; the engine carries no per-lineman snap/rep input (standing per-lineman drops: rookie iOL pressure 2026-10-08 AM, PRWR/quick-pressure family). -> DROP as build; CONTENT brief written (Mims +1.68 tackles / Ratledge +0.90 interior).
- @connor_long15 PCVR update (Reich 39.0 -> 58.6, #25 -> #14) as build — RE-SIGHTING of the PM run 64 drop: proprietary composite, sub-score formulas never published, weights unstable between posts, formation disguise is FTN charting, definable grain covered by fired Q12 (PR #1168) + Q20 (PR #1176). The Nov 7 item changes no element of that verdict. -> DROP as build; CONTENT brief written for the Reich riser + range note.
- @MagicSportsGuy FunnelReport+ (@StatRankings; 46 stats / 16 factors) as build — proprietary subscriber tool, factor definitions unstated, filing is PARTIAL (top-5 funnels only, video/image-only); the Funnel Report was already dropped as build earlier in this queue's record on the same unstated-definition ground. -> DROP as build; CONTENT brief written (Pass: BUF/JAX/DET/WAS/BAL; Run: CAR/LAC/TEN/NO/ATL).
- @PFF pass block win rate "on an island" as build — PFF proprietary win-rate input and the "on an island" qualifier is never defined in the post ("do not guess" precedent: SUPLEX, Route IQ EDGE). -> DROP as build; CONTENT brief written (Williams 96.4%).
- @FantasyPtsData RYOE per attempt as build — RYOE already ingested (nflverse-ngs.ts, covariate-bus; standing drops 2026-10-06 AM/PM, 2026-10-07 PM). -> Covered; CONTENT brief written (Warren +1.54).
- @DynatyzeFF FPTS/DB leaders table as build — proprietary Dynatyze composite columns (FPTS/DB, EPA/TGT) with NO definitions given in any post this run; 2025-labeled QB table is a presentation. -> DROP as build; no separate brief (covered by the EPA/play WR brief family in IDEAS-20261107.md where noted).
- @PattonAnalytics Explosive Rate + Deep Rate scatters as build — both PARTIAL (image-only, no per-team/per-QB numbers legible); the explosive slice (pass 20+ / run 10+) is derivable from the FIRED Q23 play-size buckets (PR #1182 OPEN) and the deep-throw split is the FIRED Q37 depth-band family (PR #1207 OPEN). -> DROP as build (covered + PARTIAL).
- @cmain7 Week 9 Survivor card as build — survivor-pool game theory, standing drop (2026-10-07, 2026-10-14 PM, 2026-10-16 PM, PM run 64). -> DROP as build; CONTENT brief written (KC 84.4% top).
- Remaining Nov 7 section items as build -> DROP, briefs where noted: @GridironInfo_ leaderboards + odds (counting stats and on-main surfaces — TTT, aDOT, EPA/play; Kalshi odds are MARKET, skipped per loop spec; matchup cards are presentations with values in the Lane A2 report only; two PARTIAL stacked bars are the Q11 drive-outcome [PR #1171] and Q10 chain-moving [PR #1167] families — briefs written for TTT Williams 3.24); @sfdata9ers Lane C bundle (Average Drive Start — a derivable field-position mean, presentation slice, brief written for Buffalo 34.79; Passer Rating Allowed when Targeted — a derivable rating slice over covered coverage surfaces, brief written for McDuffie 30.2; Number of Punts PARTIAL; 15 further chart topics listed by ID only, NOT read at content level per the sweep's own gap audit — nothing to build from); @statyxio Golden/Watson YPRR by coverage (coverage charting + routes denominator, standing drops — brief written), Maye vs Love EPA/CPOE (on-main surfaces), Rush IQ LT split + Route IQ video PARTIAL (proprietary, definition unstated); @ScottBarrettDFB JSN yards-per-team-pass-attempt + market share (derivable volume-share presentations in the fired Q2 family, PR #1145 — brief written); @PFN365 CPOE top 10 (CPOE is an on-main surface — brief written, Burrow +9.0 / Geno Smith NYJ +6.0 ruling-consistent); @NFL_Researcher NGS slices (receptions past the sticks, yards vs 2-high — NGS tracking presentations; the 2-high split needs coverage charting); @PFF bundle (proprietary grades/counting leaderboards, all prior drops); @DynatyzeFF thread EPA/play cards (the per-play EPA mean is the Q38 family surface, PR #1205 — brief written for Cooper Jr. 1.44); @DhananiZain 4th-down go-rate chart via Lane C (decision-model presentation, Paganetti-precedent drops — brief written); Lane C EPA/TPRR search captures (drop-adjusted EPA with no model named; TPRR/YPRR route denominators + blitz/coverage charting throughout — briefs written where noted); @jmthrivept injury posts (injury-intake lane, standing precedent) and @hawkblogger NBA table (non-NFL) skipped as build work.

### Budget ledger (continued)


### Dropped, 2026-11-08 PM run 68

## Dropped (2026-11-08 PM run 68, with rationale)

Source: the Nov 8 09:08 sweep as filed late morning (run-log-2026-11-08-09.md + staging-2026-11-08-09/section-09.md in full; pushed to Beexly/Sports main, commit d333e747, 39 CSVs, final watermark 2119446706597052809). NOTE: no x-intel-2026-11-08-09.md summary file was filed by the sweep (AM run 67 at ~09:35 CST correctly found the sweep unfiled; it completed 09:52 CST) — this run triaged the section file directly, the PM run 66 precedent. NEWS/MARKET skipped per loop spec (Kalshi season odds are MARKET). 1 BUILD -> QUEUED (Q54 above), 14 CONTENT briefs -> IDEAS-20261108.md (new file), rest DROP as build:

- @evduzit Unified Dual-Threat Index as build — the formula IS printed in full, but the source is the author's own LLM with no underlying data source stated and no player values posted; Broken Tackle % is a tracking input with no engine source and Turnover % is never defined (per play? per game?) — not faithfully implementable (standing composite discipline: Supporting Cast PM run 66, PCVR PM run 64). -> DROP as build; CONTENT brief written (formula as printed).
- @MagicSportsGuy Splits+ kicker roof/weather splits as build — roof/temp/wind are NOT fields in any engine pbp input (verified this run: remote-main mapper allowlist carries no roof; the ingestion trend-plan names roof as schedule context to attach, not a landed pbp field), the source itself flags retractable-roof coding as unconfirmed, and per-kicker FG% splits are counting presentations on the fired Q36 special-teams family (PR #1201 OPEN; cf. opponent kick miss luck PR #1151). Firing would force invented ingestion — barred by the do-not-guess precedent (Q26 verdict pattern). Re-queue only if a roof field is verified in-engine. -> DROP as build; CONTENT brief written (Bass 95.5% dome / 84.6% else; league 85.4% / 84.4% since 2015).
- @MagicSportsGuy ShadowCoverage+ as build — shadow = man coverage above 65% is charting (every man/zone drop since 2026-10-06), and the headline Gonzalez ~73% figure is printed as an EXPECTATION, not a measured value. -> DROP as build; CONTENT brief written.
- @The_Coach_A Pass Rush Performance rating as build — no definition of the rating and no data source stated, attached image did not load (PARTIAL), and the blitz/no-blitz split needs charted pressure data. -> DROP as build; CONTENT brief written (NYG 15 no pressure / 30 blitzing, EPA/play -.172 4th when blitzing).
- @statyxio CounterPlay as build — a proprietary Statyx tool at NBA launch; the required-vs-observed conversion framing is a transferable CONTENT kernel, not a bounded NFL engine surface. -> DROP as build; CONTENT brief written (Sengun 51.6% required vs 60.0% observed).
- @connor_long15 Scripted Starts vs Halftime Adjustments as build — the scripted-plays split family is already fired (scripted-epa-split, PR #1213 OPEN; play-caller family Q12 PR #1168 / Q20 PR #1176), and this item's axes are EPA ABOVE EXPECTATION / above what the first half PREDICTED with the expectation model never stated — the definable residue is covered and the novel residue is undefined; scatter is PARTIAL with no per-team numbers. -> DROP as build; CONTENT brief written (corr +0.25).
- @statyxio team projections with coaching effect as build — proprietary projection model; the "expected" pass rate the coaching effect is measured against is never defined. -> DROP as build; CONTENT brief written (CIN +4.7 pts / ATL -6.2 pts).
- @sfdata9ers remaining PARTIAL scatters (short vs mid catchable-throw rate, man vs zone EPA/dropback, pressure faced vs EPA when pressured, contested catches) as build — Fantasy Points Data charting inputs (coverage/pressure/contested are charted) and every scatter is PARTIAL with no per-player numbers printed. -> DROP as build, no briefs. (The sibling before/after-first-INT scatter IS queued as Q54: its methodology is printed in text and its inputs are pbp-carried — see the Q54 entry.)
- @statyxio Route IQ man split (Golden 140 yds / 45 routes vs Watson 28 / 43 vs man) as build — charted man coverage plus a routes denominator (standing drops). -> DROP as build, no brief.
- @GridironInfo_ bundle as build — Week 9 matchup cards are presentations over nflreadr counting surfaces (values in the sweep CSVs); Pressure Rate Allowed is PFR charting; WR separation leaders/by-team are the already-ingested NGS surface in the fired Q31 family (PR #1191 OPEN); international players, last pick-six, OL combinations (@NFL_Researcher, NGS), rookie/different starters are counting presentations whose starter/snap inputs are not pbp fields. -> DROP as build; CONTENT brief written for Pressure Rate Allowed only (LAR 15.8% / CAR 28.5%).
- @PFF 11 leaderboards (30+ yd TD catches, rushing yards 10-yr, yards per punt, TE routes, yards per rush, defensive snaps, WR run-block grade, deep accuracy, 20+ yd targets, TE catches) as build — proprietary PFF grades and counting presentations, all prior drops. -> DROP as build, no briefs.
- @Race4thePrize DFS Signal and @UDLRsports TD Model as build — no definition, no data source, PARTIAL image (DFS Signal); the TD Model's +EV parlay is MARKET content with no per-leg values. -> DROP as build, no briefs.
- Search-capture bundle as build (@SGAtop1 CPOE/EPA era comparison, @nflmcp rookie-game EPA/CPOE pair, @jcl2323 Caleb Williams accuracy set, @blockheadai EPA scatter PARTIAL, @EdgeOfSunday model spotlight) — EPA and CPOE are on-main surfaces; no sources stated; presentations, not kernels. -> DROP as build, no briefs.
- @hawkblogger bundle (VOR free agents — proprietary HB evaluator, 100k sims, PARTIAL with the safety column cut off; Seahawks snaps-per-pick and offseason-addition snaps — snap-count presentations) and @RyanPaganetti FBS bundle (FG by distance FBS+FCS; shift/motion % FBS) and @DevyEusuf college bundle (Carr weekly pressure, P4 TE receiving grades) as build — proprietary/PARTIAL or college scope (the engine is NFL); Devy's pressure-to-sack kernel is a single college QB with no source stated. -> DROP as build, no briefs.
- @GridironInfo_ Aggressiveness full-32 (ID 2119452438834868398, 9:30 AM Nov 8) — POST-WINDOW capture per the sweep's own filing; NOT triaged this run (it is the next sweep's first in-window item, and the metric is in any case the fired Q34, PR #1200 OPEN). CONTENT brief written and flagged post-window in IDEAS-20261108.md (Brissett 24% top / Mahomes 7% bottom).

### Budget ledger (continued)

- 2026-11-08 ~21:37 CST run (PM run 68): 1 FIRED — Q53 session `6441804516979526590` (createTime 2026-11-09T03:37:43Z = 21:37 CST), verified IN_PROGRESS via synchronous Jules API GET, prompt head + pins verified in the live session (20,861 chars assembled; doctrines verbatim). Slot 2 NOT spent: Q54 queued this run with tightening owed (play unit + floor readings unpinned — not airtight), carried queue holds no other fireable items. Never fire speculatively.
- Triage: the Nov 8 sweep (filed 09:52 CST, after AM run 67's check; no x-intel summary file — triaged from run-log + section-09.md in full): 1 BUILD -> QUEUED (Q54 QB before/after-first-INT split — inputs verified carried on remote main: interception/game_id/play_id already in the allowlist), 14 CONTENT briefs -> IDEAS-20261108.md (new file), rest DROP as build (rationales in the Dropped 2026-11-08 PM section above: Dual-Threat Index [LLM source + tracking component + undefined turnover %], Splits+ kicker [roof not an engine input — verified], ShadowCoverage+ [charting + expectation value], Pass Rush Performance [undefined + PARTIAL], CounterPlay [NBA proprietary tool], Scripted Starts [PR #1213 family + undefined expectation model], Statyx coaching effect [undefined expectation], sfdata PARTIAL charting scatters, Route IQ [charting + routes], Gridiron/NFL_Researcher counting bundle, PFF bundle, DFS Signal / TD Model [undefined / MARKET], search captures [on-main surfaces], hawkblogger/Paganetti/Devy [proprietary/PARTIAL/college], Aggressiveness carry-forward [post-window, Q34 fired]).
- Dedup: git log -20 tip 1984cfaf6 unchanged (local checkout only); remote main read directly via the GitHub API this run (mapper allowlist 40 cols verified; sweep push d333e747 is the remote tip lineage for AGENTS.md appends); synchronous Jules list (30 most recent) shows no INTEL session since Q52 (11559036333323233321, COMPLETED -> PR #1262) and no session on Q53/Q54 or any Nov 8 item; 89 open PRs cover every fired kernel and none carries a QB tier split or an INT-boundary split.

---

## Run log entries, runs 66-68 (intel-build-log.md)

## 2026-11-07 ~21:30-21:40 CST (PM run 66)
- Intel: x-intel-2026-11-07-09.md (COMPLETE Nov 7 09:08 sweep, window after status 2118721479298990591 - 9:08 AM Nov 7 CT; 7 ENGINE IDEAS in the summary) + staging-2026-11-07-09/section-09.md in full + run-log-2026-11-07-09.md — first triage is this run (AM run 65 found the file unfiled at 09:30; it filed 11:26 CST). Sweep pushed to Beexly/Sports main, commit 7716f1f, 35 CSVs, FINAL watermark 2119084579504144663. NEWS/MARKET skipped per loop spec.
- Triage: 1 BUILD -> QUEUED + FIRED same run (Q52 defensive field-zone split — per-defense own-EPA + success-rate allowed split RZ (yardline_100 <= 20) vs open field + differentials + per-play RZ TD rate; DVOA excluded as FTN-proprietary; distinct from Q30 pass-only fragility PR #1192, Q40 by-down PR #1208, Q15 PR #1179, Q25/Q33 offensive RZ carry share), 1 BUILD -> QUEUED held (Q53 QB efficiency split by opponent defensive tier — Maye sensitivity; tier basis unstated, tightening owed, NOT fired), 19 CONTENT briefs -> IDEAS-20261107.md (new file), rest DROP (Supporting Cast composite [3/8 components FantasyPts charting + unstated percentile population], wPP/xwPP [SumerSports per-lineman charting], PCVR update [re-sighting of PM run 64 drop], FunnelReport+ [proprietary, PARTIAL], PBWR on an island [PFF + qualifier undefined], RYOE [already ingested], Dynatyze FPTS/DB [no definitions], Patton scatters [PARTIAL + Q23/Q37-covered], Survivor [standing drop], plus the remaining-section bundle — full rationales in queue file).
- Fired: 1 — sessions/11559036333323233321 "INTEL: defensive field-zone split - red-zone vs open-field efficiency allowed (SHADOW)" (Q52, createTime 2026-11-08T03:35:14Z = 21:35 CST) — AUTO_CREATE_PR, main, requirePlanApproval=FALSE, doctrines prepended verbatim (18,668 chars assembled; prompt head verified in the live session), verified IN_PROGRESS via synchronous Jules API GET. Prompt backup: hidden_files/run66-prompts/. Q52 pins: defteam grain; pass/run scrimmage population (kneels/spikes/kicks excluded); zone = yardline_100 <= 20; own EPA via attachOwnEpa (referee never emitted; null-EPA excluded from means + counted, still in success population); success via isSuccessfulPlay reused exactly; per-play RZ TD rate (never per-trip); differentials RZ minus open-field (positive = worse inside the 20); NO shrinkage, NO composite; floors RZ plays >= 30 / open-field >= 100 / RZ epaPlays >= 30; season/last-4/last-8 distinct-week PIT windows; mapper additive-only (week); HARD BAN on dependency-audit/package files.
- TIMING / BUDGET: budget AVAILABLE — trailing-24h loop fires 0 before this run (newest loop session Q51 5216559442798478116, createTime 2026-11-04T03:36:07Z, ~3.7 days old, COMPLETED; synchronous Jules list verified this run — 30 most recent, no INTEL sessions since). Slot 2 NOT spent — Q53 not airtight, carried queue holds no other fireable items. Never fire speculatively.
- Dedup: git log -20 tip 1984cfaf6 unchanged (local checkout only); mapper read directly on the reference main (defteam + yardline_100 already in the allowlist; week missing, additive-only pinned); 85 open PRs cover no queued item; no open Jules sessions on Q52/Q53.
- Status watch (synchronous foreground reads only): 85 open PRs, net +1 vs AM run 65 — the addition is #1261 (non-loop SkeleTrackV2 refactor). Loop PRs #1212-#1217 OPEN; Q49 -> #1226, Q50 -> #1227, Q51 -> #1232 OPEN, unchanged, awaiting merge-sheriff review. Q47/Q48 stranded-PR flag stands (COMPLETED, changesets only, no PR in open list; shepherd/sheriff lane owns recovery; loop does not re-fire).
- VERIFY slot not burned: no new loop PR state; #1232 verified AM run 59 (as corrected), #1226/#1227 PM run 52; #1261 is non-loop.
- Queue depth: 4 pending entries (Q26 [input-blocked], Q35 [tightening failed], Q53 [tightening owed]; Q52 fired, awaiting PR). Bus note: agent-bus/outbox/from-motif/intel-build-2026-11-07-2.md.
- Budget used: 1/2 in the new window (next window opens 2026-11-08 ~21:35 CST for the second slot's trailing count; Q52 ages out 2026-11-08 21:35 CST).

## 2026-11-08 ~09:30 CST (AM run 67)
- Intel: NONE new filed. Newest findings file remains x-intel-2026-11-07-09.md (triaged in full by PM run 66). No x-intel-2026-11-08 file, no run-log-2026-11-08, and no staging-2026-11-08 directory exists — directory listing verified this run; the Nov 8 09:08 sweep has not filed as of ~09:35 CST. Absence inspected explicitly, not a read/transport error. Nothing triaged, nothing queued, no CONTENT briefs this run.
- Fired: 0 — fire held for tonight's PM run per the AM-tighten → PM-fire cadence (runs 10/15 precedent), NOT a budget block: trailing-24h loop fires = 1 (Q52 session 11559036333323233321, createTime 2026-11-08T03:35:14Z); 1 slot remains in-window until ~21:35 CST, when Q52 ages out and the PM run fires Q53 after the window clears.
- TIGHTENING PERFORMED: Q53 (QB efficiency split by opponent defensive tier — Maye sensitivity) is now READY. Pinned: PIT tier = defteam's rank by defensive EPA/dropback allowed entering the play's own week (>= 100 prior ratable dropbacks faced to be ranked; ordinal ranks 1–10 with defteam tie-break; unranked-opponent dropbacks excluded + counted; Week 1 fully unclassified); v1 scope = EPA/DB split + delta ONLY (ANY/A = Q27/PR #1186, sacks/game = counting slice, both OUT); dropback population mirrors Q42 (pass rows, spikes out + counted, sacks in, scrambles never); shrinkage n/(n+20) toward the window's league tier mean; arm floor 30 ratable dropbacks, delta only when both arms emit. Full verdict in the queue file.
- Status watch (synchronous foreground reads + shepherd-log census): Q52 session COMPLETED 2026-11-08T08:31Z -> PR #1262 OPEN (head bd0f4e8e827) — DIFF VERIFIED CLEAN BY THIS LOOP via the GitHub files endpoint: exactly the 6 allowed files, +608/−1; mapper +27/−1 (single deleted line noted for the sheriff, Q51 precedent). Shepherd verification agrees (no scratch files; pick-six TD-allowed fix applied). Awaiting merge-sheriff review. 88 open PRs, net +3 vs PM run 66 (#1262 loop; #1263/#1264 non-loop). Loop PRs #1212–#1217, #1226 (Q49), #1227 (Q50), #1232 (Q51) still OPEN. Q47/Q48 stranded-changeset flag stands. Git tip 1984cfaf6 unchanged (local only).
- VERIFY slot not burned: #1262 already verified directly by this loop and independently by the shepherd; no other genuinely review-worthy new loop PR state.
- Queue depth: 3 pending (Q26 [input-blocked], Q35 [tightening failed], Q53 [READY — PM run fires tonight]). Bus note: agent-bus/outbox/from-motif/intel-build-2026-11-08-1.md.
- Budget used: 0/2 this run; trailing 24h holds PM run 66's 1/2 (Q52).

## 2026-11-08 ~21:37 CST (PM run 68)
- Intel: the Nov 8 09:08 sweep, filed 09:52 CST — after AM run 67's ~09:35 check (which correctly recorded it unfiled). No x-intel-2026-11-08-09.md summary file was filed; triaged from run-log-2026-11-08-09.md + staging-2026-11-08-09/section-09.md in full (PM run 66 precedent). Sweep pushed to Beexly/Sports main, commit d333e747, 39 CSVs, watermark 2119446706597052809.
- Triage: 1 BUILD -> QUEUED (Q54 QB efficiency split before vs after first INT, @sfdata9ers + methodology self-reply — pbp-definable; inputs verified carried on remote main this run: interception/game_id/play_id already in the 40-col allowlist; tightening owed: play unit, before-side floor reading [after-side pinned aggregate by the methodology reply], multi-QB games), 14 CONTENT briefs -> IDEAS-20261108.md (new file), rest DROP as build (Dual-Threat Index [author-LLM source, broken-tackle tracking, turnover % undefined], Splits+ kicker roof splits [roof NOT an engine input — verified; retractable coding unconfirmed per source; Q36 family], ShadowCoverage+ [charting + expectation value], Pass Rush Performance [undefined + PARTIAL], CounterPlay [NBA proprietary tool], Scripted Starts [PR #1213 scripted-epa-split family + expectation model unstated + PARTIAL], Statyx coaching effect [expectation undefined], sfdata PARTIAL charting scatters, Route IQ [charting + routes], Gridiron/NFL_Researcher counting bundle, PFF bundle, DFS Signal / TD Model [undefined / MARKET], search captures [on-main EPA/CPOE], hawkblogger/Paganetti/Devy [proprietary/PARTIAL/college]; Aggressiveness full-32 post-window, not triaged — next sweep's item, metric is fired Q34 anyway).
- Fired: 1 — sessions/6441804516979526590 "INTEL: QB efficiency split by opponent defensive tier - matchup sensitivity (SHADOW)" (Q53, createTime 2026-11-09T03:37:43Z = 21:37 CST) — AUTO_CREATE_PR, main, requirePlanApproval=FALSE, doctrines prepended verbatim (20,861 chars in the live session; header/HARD BAN/bus slug verified in the live prompt), verified IN_PROGRESS via synchronous Jules API GET. Prompt backup: hidden_files/run68-prompts/. Q53 pins as fired per the AM run 67 tightening (PIT tier, >=100 prior ratable dropbacks, ordinal 1-10 defteam tie-break, Week 1 unclassified; shared dropback population; own EPA on both axes; n/(n+20) shrinkage to the window league tier mean; arm floor 30; delta only when both arms emit; ANY/A + sacks/game OUT; no team grain/composite). Fire-time remote-main verification (GitHub contents API): mapper allowlist carries defteam/posteam/play_type; week/passer_player_id/qb_spike missing -> additive-only pin exactly scoped; attachOwnEpa present.
- TIMING / BUDGET: Q52 (2026-11-08T03:35:14Z) aged out at 2026-11-09T03:35:14Z, ~2.5 min before this fire — trailing-24h loop fires at fire time = 0 (synchronous Jules list, 30 most recent: newest INTEL session is Q52, COMPLETED; no session on Q53/Q54). Slot 2 NOT spent — Q54 not airtight. Never fire speculatively.
- Dedup: git log -20 tip 1984cfaf6 unchanged (local checkout only); remote main read directly via API this run; 89 open PRs cover every fired kernel and none carries a QB tier split or an INT-boundary split; no open Jules sessions on Q53/Q54.
- Status watch (synchronous foreground reads only): 89 open PRs, net +1 vs AM run 67 — the addition is #1265 (non-loop Week 9 pack content). Loop PRs #1212-#1217 OPEN; Q49 -> #1226, Q50 -> #1227, Q51 -> #1232, Q52 -> #1262 OPEN, unchanged, awaiting merge-sheriff review. Q47/Q48 stranded-PR flag stands (COMPLETED, changesets only, no PR in open list; shepherd/sheriff lane owns recovery; loop does not re-fire). Shepherd log through 2026-11-09T00:47Z confirms Q52 completion and shows no Q53 activity before this fire.
- VERIFY slot not burned: #1262 verified directly by AM run 67 and independently by the shepherd; #1265 is non-loop; no other genuinely review-worthy new loop PR state.
- Queue depth: 3 pending (Q26 [input-blocked], Q35 [tightening failed], Q54 [tightening owed]); Q53 fired, awaiting PR. Bus note: agent-bus/outbox/from-motif/intel-build-2026-11-08-2.md.
- Budget used: 1/2 in the new window (Q53 ages out 2026-11-09 ~21:37 CST).

## 2026-11-09 ~09:30 CST (AM run 69)
- Intel: NONE new filed. Newest findings file remains x-intel-2026-11-07-09.md (triaged PM run 66); the Nov 8 sweep was triaged PM run 68 from run-log + section-09.md. No x-intel-2026-11-09 file, no run-log-2026-11-09, and no staging-2026-11-09 directory exists — directory listing verified this run; the Nov 9 09:08 sweep has not filed as of ~09:35 CST. Absence inspected explicitly, not a read/transport error. Nothing triaged, nothing queued, no CONTENT briefs this run.
- Fired: 0 — fire held for tonight's PM run per the AM-tighten -> PM-fire cadence (runs 10/15/67 precedent), NOT a budget block alone: trailing-24h loop fires = 1 (Q53 session 6441804516979526590, createTime 2026-11-09T03:37:43Z). Next window opens 2026-11-09 ~21:37 CST; tonight's PM run fires Q54 after it clears.
- TIGHTENING PERFORMED: Q54 (QB efficiency split before vs after first INT — in-game tilt response) is now READY. Pinned: dropback population mirrors Q42/Q53 (pass rows, spikes out + counted, sacks in, scrambles never); boundary = per (game_id, passer) first INT dropback by play_id order, boundary play excluded from both arms, later INT dropbacks stay in the after arm; multi-QB = each QB's own first INT; floors = aggregate >= 25 ratable dropbacks BOTH arms (methodology reply's aggregate reading); shrinkage n/(n+20) toward the window league arm mean (Q53 pattern); delta only when both arms emit; PIT windows season/last-4/last-8 distinct weeks. Inputs re-verified on remote main this run (GitHub contents API): 40-col allowlist carries interception/game_id/play_id/play_type; week/passer_player_id/qb_spike missing -> additive-only trio (PR #1266 adds them if merged first). Full verdict in the queue file.
- Status watch: Q53 session COMPLETED (Jules evidence this run; shepherd log agrees, COMPLETED 2026-11-09T07:31Z) -> PR #1266 OPEN (created 2026-11-09T07:16:32Z, head 3e0e3a6d275) — DIFF VERIFIED CLEAN BY THIS LOOP via the GitHub files endpoint: exactly the 6 allowed files, +555/-0, purely additive (mapper +18/-0), mergeable=true/unstable. Awaiting merge-sheriff review. 90 open PRs, net +1 loop PR vs PM run 68 (#1266; plus non-loop #1267/#1268 dep bumps). Loop PRs #1212-#1217, #1226 (Q49), #1227 (Q50), #1232 (Q51), #1262 (Q52) still OPEN. Q47/Q48 stranded-changeset flag stands. Git tip 1984cfaf6 unchanged (local only). Jules note: the first list attempt this run timed out at the 30s server limit (read-only GET, nothing created); follow-up evidence confirmed Q53 COMPLETED with no session on Q54.
- VERIFY slot not burned: #1266 verified directly by this loop (allowed set exact, purely additive); no other genuinely review-worthy new loop PR state.
- Queue depth: 3 pending (Q26 [input-blocked], Q35 [tightening failed], Q54 [READY — PM run fires tonight]). Bus note: agent-bus/outbox/from-motif/intel-build-2026-11-09-1.md.

---

## Gap audit

- **Source sweeps not reproduced here:** the Nov 7 findings file (x-intel-2026-11-07-09.md) and the Nov 8 09:08 sweep records (run-log-2026-11-08-09.md + staging-2026-11-08-09/section-09.md, pushed to Beexly/Sports in commit d333e747 with 39 CSVs). The loop triaged them in full; their triage outcome is what this document contains. The sweep files themselves live with the analytics-sweep lane.
- **Merge-sheriff review:** not a document the loop holds. PRs #1262 and #1266 sit open awaiting it; as of this assembly neither has a review verdict recorded in the loop files or on GitHub that Motif read.
- **Q53 session record:** the fired record and prompt are included; the session's own completion record is the PR (#1266) — the loop has not yet written a run-69 status watch, so no loop-side diff verification of #1266 exists yet. Motif's file list above is a GitHub read, not a diff read.
- **Q54** has no prompt file and no session — it is a queue entry with four tightening items owed, nothing more exists.
- **The 19 + 14 briefs** are one-line draft-queue entries by design (the IDEAS files above are complete at 25 and 20 lines); no drafted posts exist for them, and nothing was posted.
- **Shepherd log** is excerpted to the Q52/Q53-relevant lines (1509, 1530-1533, 1552); the full log (1,618 lines) covers the whole Jules census and stays at its path in the document map.
