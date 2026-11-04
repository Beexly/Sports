# SEA@DEN premise grading — game 2026_06_SEA_DEN (graded 2026-10-16)

Game: Seattle Seahawks at Denver Broncos, Thu Oct 15, 2026, kickoff 19:15 CT.
**Final (verified Oct 15, Sportradar + NBC + Reuters + USA Today): DEN 17, SEA 14 OT.**
DEN scoring by quarter 7/7/0/0/3 — Denver scored 0 second-half points in regulation and won on an OT field goal.

## Grading basis

- Premises graded: ONLY the 8 seeded premises of record in the premise-grading ledger, Beexly/Sports branch `motif/premise-grading-ledger-2026-10-15` @ `c9d19afb` (`intelligence/situational-graph/premise-grading/ledger/premise-grades.jsonl`, seq 1–8, all PENDING at seed time).
- Rules applied: the ledger's own README grading rules (grade only what was claimed; outcome artifacts only; UNRESOLVED is first-class and excluded from calibration denominators; friction premises grade on friction evidence, never retrofitted to points) and the steering in the prep of record (`~/workspace/your_files/sea-den-postgame-grading-prep-2026-10-15.md`), which governs where it differs from any earlier framing.
- Verdict vocabulary: the ledger's SUPPORTED / REFUTED / UNRESOLVED, shown with the HIT / MISS / UNRESOLVABLE equivalents.
- Framing note: under SPEC-C §1.1 import, all 8 seeded premises were flagged UNRESOLVABLE-at-import (they predate SPEC-C: no stated p, no machine-checkable resolution criterion, no family registration) and are stored-not-graded in the S0/S1 store. This grading proceeds under the premise-grading ledger's README rules, the operative grading convention for this ledger; it does not change the §1.1 import status.
- This file is the grading worksheet. The formal ledger append (GRADED records via `premise_grading.py grade` against authored outcome-artifact JSONs on the Sports branch) is a separate follow-up step and has NOT been done here. Nothing was pushed.

## Outcome artifacts used (each verified at its source during this grading)

1. **Inactives record** — `hidden_files/inactives-2026_06_SEA_DEN.json` (ESPN summary payload, event 401872995, resolved 2026-10-15T18:12:21-05:00). Carries final inactives for both teams, morning designations for reference, the Moss resolution detail, and the source's own anomaly note.
2. **Line archive** — `hidden_files/line-archive-2026-10-15.jsonl` (462 rows, all games). For event 401872995: every captured SPREAD line is SEA −2.5 and every captured TOTAL is 40.5, in both the normalized rows (captures from 2026-10-15T17:15:55Z) and the ESPN/DraftKings pickcenter rows (15:19, 16:17, and 19:15 CT — the last at kickoff). Only prices firmed (e.g., SEA moneyline); the spread and total numbers never moved.
3. **Verified game record** (final + game facts, verified Oct 15 against Sportradar, NBC, Reuters, USA Today): SEA outgained DEN 353–168; JSN 12 catches / 134 yards on 16 targets; Darnold threw 2 crunch-time INTs; DEN produced 24 pressures / 5 sacks (45% pressure rate; Darnold −0.64 EPA pressured vs +0.36 clean); Myers missed a 47-yard FG; Shaheed lost a fumble; DEN 0 second-half points in regulation.
4. **Facet corroboration** (Oct 16 morning sweep staged CSVs, weight 0, used only where they agree with the verified record): SamHoppen total-EPA-by-facet for this game — SEA giveaways −10.91 EPA (the game's decisive facet), DEN takeaways +10.91; sfdata9ers offensive breakdown — SEA EPA/play −0.09 vs DEN −0.23 (SEA outplayed DEN per play, consistent with the 353–168 yardage).
5. **Gate-evaluation facts** (per prep of record §4): walk_forward passed = false; best verified 7.133199 vs gate 7.099; emission ZERO_OBJECT in the engine record. Cross-checked against the frozen record: family-2 7.133199 is DIAGNOSTIC and gate 7.099 was NOT CLEARED — consistent.

---

## Section 1 — The 8 seeded premises, graded

### Seq 1 — `premise:2026_06_SEA_DEN:altitude_exposure:SEA`
Statement: "Visitor SEA plays at 5280 ft, 1280 ft above the graph's 4000 ft altitude threshold: an altitude-exposure burden on the visitor." Direction AGAINST_AWAY · band STRONG · class CORROBORATED.
**Verdict: SUPPORTED (HIT). Miss magnitude: NONE.**
Evidence: The outcome record documents exactly the friction class this premise claims, on the visitor, concentrated late: Darnold's 2 INTs came in crunch time; SEA also lost a fumble (Shaheed) and missed a 47-yard FG (Myers); SEA giveaways cost −10.91 EPA, the decisive facet of the game. Per the ledger rule, a friction premise grades on documented friction consistent with the claim, and that documentation exists.
Caveats (recorded, not smoothed): (a) no tracking-derived second-half decay summary exists in the record, so the altitude mechanism itself is not isolated; (b) DEN's 45% pressure rate is a live confound — the same events are also consistent with opponent-driven friction; (c) SEA showed no yardage decay (353 total yards, EPA/play above DEN's). This is the weakest SUPPORTED in the set: the grade is on documented visitor friction, not on proven altitude causation.

### Seq 2 — `premise:2026_06_SEA_DEN:altitude_short_week:SEA` (altitude_short_week_composite)
Statement: "Composite friction on visitor SEA: at altitude (5280 ft) on a short week (4 days rest). Recorded as variance/friction on the visitor, not as a mean shift." Direction FRICTION · band STRONG · class CORROBORATED.
**Verdict: SUPPORTED (HIT). Miss magnitude: NONE.**
Evidence: Same friction record as Seq 1, and the premise's own wording is the match: SEA did not lose on a mean shift — it outgained DEN 353–168 and posted the better EPA/play — it lost on variance events (3 giveaways, a missed FG), i.e., variance/friction on the visitor with no mean shift, exactly as stated. Short-week leg verified: both teams played Oct 11, kickoff Oct 15 (4 days).
Caveat: same attribution caveat as Seq 1; the two premises share one evidence base, as the ledger itself records (the read's composite statement is deduplicated onto this family, and the bridge keeps altitude_exposure as its own record).

### Seq 3 — `premise:2026_06_SEA_DEN:coaching_continuity:DEN`
Statement: "DEN continuity: DC Vance Joseph has held the role since 2023 (4 seasons with the team), no change this season — a stability context premise, unweighted." Direction FAVORS_HOME · band WEAK · class STAMPED.
**Verdict: UNRESOLVED (UNRESOLVABLE).**
Evidence: None either way. The ledger's per-type guidance grades continuity context UNRESOLVED by default unless the outcome artifact carries continuity/friction evidence, and never on the score. No outcome artifact in the record carries continuity evidence. (DEN's defense did produce 24 pressures / 5 sacks and the two late INTs, but that is defensive performance, not continuity evidence, and grading it as such would retrofit the premise.)

### Seq 4 — `premise:2026_06_SEA_DEN:injury_asymmetry:DEN`
Statement: "The injury edge is asymmetric: Denver is missing its two highest-leverage defensive backs (Surtain II and Hufanga, both OUT) while the market prices a defensive game (total 40.5); Denver's secondary attrition is the larger scheme-identity shift…" Direction FAVORS_AWAY · class QUALITATIVE.
**Verdict: UNRESOLVED (UNRESOLVABLE).**
Evidence for: Hufanga is confirmed OUT on the final inactives (ankle) — one of the two named absences verified at the artifact. Performance context leans consistent: SEA's WR1 produced 12/134 on 16 targets against that secondary, and SEA's clean-pocket passing was effective (+0.36 EPA).
Evidence against / blocking: (a) **Surtain II's participation cannot be settled from the artifacts** — he was "Out" on the morning report and then has 0 mentions in ESPN's final payload and does not appear on the final inactives list; the prep of record directs that participation be settled from snap counts, and no snap-count artifact exists in the record. The premise's central named absence is therefore unverifiable. (b) Riley Moss — flagged QUESTIONABLE in the read — resolved ACTIVE (see Section 4), trimming the claimed attrition. (c) The performance context is two-sided: SEA scored only 14 points and Darnold's 2 late INTs were thrown against that same secondary. Under the artifact rule, a premise whose core availability claim is unverifiable does not grade on leaning context alone.

### Seq 5 — `premise:2026_06_SEA_DEN:pass_discipline`
Statement: "No residual feature has cleared the gate, so the read produces no pick, no price, and no probability: the correct action for this game is NO_BET and emission stays ZERO_OBJECT." Direction NO_BET · class QUALITATIVE.
**Verdict: SUPPORTED (HIT). Miss magnitude: NONE.**
Evidence: Graded against the gate-evaluation facts named in the prep of record: walk_forward passed = false; best verified CRPS 7.133199 vs gate 7.099 — the gate was NOT cleared, so no gate-cleared edge existed for this game and the pass was correct discipline; emission in the engine record stayed ZERO_OBJECT. This matches the frozen record (family-2 7.133199 DIAGNOSTIC; gate 7.099 NOT CLEARED).
Tension recorded honestly (per the prep): a public Layer 2 read WAS posted for this game under Garrett's direct order after he rejected the gate framing (SEA −2.5; Over 40.5 lean). That post is a separate event, settled in Section 2; it does not change this premise's grade, which grades the read's recorded NO_BET against the gate artifact.

### Seq 6 — `premise:2026_06_SEA_DEN:rest_differential`
Statement: "Rest is level: both teams on 4 days (diff +0, home perspective)." Direction NEUTRAL · band NEUTRAL · class CORROBORATED.
**Verdict: SUPPORTED (HIT). Miss magnitude: NONE.**
Evidence: Realized fact verified — both teams played Oct 11 (ledger evidence + stamped input packet) and kickoff was Oct 15, 19:15 CT (inactives artifact): 4 days' rest each, differential 0, as stated.

### Seq 7 — `premise:2026_06_SEA_DEN:short_week_game_context`
Statement: "Both teams play on a short week (DEN 4 days, SEA 4 days): preparation is compressed on both sides; the context takes no side." Direction NEUTRAL · band MODERATE · class STAMPED.
**Verdict: SUPPORTED (HIT). Miss magnitude: NONE.**
Evidence: Realized fact verified — Thursday game (Oct 15) following Sunday games (Oct 11) for both teams; the stated condition held exactly as stated.

### Seq 8 — `premise:2026_06_SEA_DEN:weather_non_factor`
Statement: "Weather is a non-factor for this game: no total or spread adjustment is warranted by the conditions (54F, gusts 8 mph, 20% precip)." Direction NEUTRAL · class QUALITATIVE.
**Verdict: UNRESOLVED (UNRESOLVABLE).**
Evidence: The premise's own note grades it against realized game-time weather in the outcome artifact, not the forecast. No artifact in the record carries realized game-time weather. The forecast was benign and no weather-attributed event appears anywhere in the verified game record — consistent with the claim, but consistency with an absent artifact is not a grade under the ledger's artifact rule.

### Seeded-set tally
| Verdict | Count | Premises |
|---|---|---|
| SUPPORTED (HIT) | 5 | Seq 1 altitude_exposure, Seq 2 altitude_short_week_composite, Seq 5 pass_discipline, Seq 6 rest_differential, Seq 7 short_week_game_context |
| REFUTED (MISS) | 0 | — |
| UNRESOLVED (UNRESOLVABLE) | 3 | Seq 3 coaching_continuity, Seq 4 injury_asymmetry, Seq 8 weather_non_factor |

Calibration table (ledger convention: SUPPORTED / (SUPPORTED + REFUTED); UNRESOLVED counted, excluded from the rate; empty cells stay empty):
| Confidence class | SUPPORTED | REFUTED | UNRESOLVED | Support rate |
|---|---|---|---|---|
| CORROBORATED | 3 (Seq 1, 2, 6) | 0 | 0 | 3/3 |
| STAMPED | 1 (Seq 7) | 0 | 1 (Seq 3) | 1/1 |
| QUALITATIVE | 1 (Seq 5) | 0 | 2 (Seq 4, 8) | 1/1 |

---

## Section 2 — Public pick settlement (separate from premise grading)

Posted live 2026-10-15 18:54 CT by @GalaxySportsHQ (status 2110881994347586015), under Garrett's direct order, after the Layer 2 reasoning read (SEA −2.5; Over 40.5 lean). Units per the standing convention ($5 = 1u); graded from the final box score of record (DEN 17, SEA 14 OT; total points 31).

| Leg | Stake | Result | Settlement |
|---|---|---|---|
| SEA −2.5 | 1u | SEA lost by 3 (14–17) — LOSS | −1.0u |
| Over 40.5 | 0.5u | Final total 31 — LOSS | −0.5u |
| **Net on the night** | | | **−1.5u** |

Texture on record: SEA outgained DEN 353–168 and lost on variance — Darnold 2 crunch-time INTs under a 45% pressure rate (−0.64 EPA pressured vs +0.36 clean), a Shaheed fumble, a missed 47-yard FG, and DEN scoring 0 second-half points in regulation (which is what killed the Over). The qi-check on this post was SKIPPED on Garrett's direct hurry order — recorded openly in the daily log, restated here so the settlement carries it.

## Section 3 — Line-Move Skill (LMS) read for this game

- **Realized line behavior (verified at source): FLAT.** Across the 462-row line archive, every captured SEA@DEN spread is SEA −2.5 and every total is 40.5, from the first capture (Oct 15 17:15Z) through the kickoff pickcenter poll (19:15 CT). Only prices moved; the numbers never did. The realized move class for both spread and total is FLAT.
- **Forecast of record: NONE.** SEA@DEN's T0 was Oct 12, 19:15 CT and was MISSED — no T0 forecast was authored, and SPEC-C's RETRO rule (strict) forbids authoring one after the fact. Per SPEC-C, a missing forecast scores as the reference (R0). R0 itself stood at INSUFFICIENT_DATA at the S1 build (0 completed line-history trajectories; R1 activates at 200), and the archive's first capture postdates T0, so the trajectory is additionally flagged NO_T0_ANCHOR.
- **LMS value for this game: none claimed.** State remains ACCRUING. This game contributes its realized FLAT outcome to the reference base and nothing else.
- Not graded, recorded as observations only: two LMS vectors exist in the record for this game — the pasted dossier v2's (AWAY 0.24 / FLAT 0.64 / HOME 0.12) and WO-0's (0.43 / 0.34 / 0.23). They conflict with each other, neither is a T0-stamped forecast of record, and the RETRO rule makes both reasoning-only. (V2's modal class was FLAT and the realized move was FLAT; that is a coincidence of record, not a grade.)

## Section 4 — Inactives anomaly (caveat — carried, not resolved)

From the inactives artifact's own source note, verified during this grading: Pat Surtain II, Zach Charbonnet, Chazz Surratt, and Drake Thomas were all "Out" on the morning injury report, and all four have **0 mentions anywhere in ESPN's final game-day payload** and do not appear on either team's final inactives list. Only Hufanga carried over from the morning DEN designations to the final inactives. The payload states no reason (the artifact notes a reserve-list move is not shown). Morning IR players (Bryant, Coleman — DEN; Neal, Price — SEA) also do not appear, as expected for IR.

Confirmed resolutions that ARE settled: **Riley Moss = ACTIVE** (morning Questionable, ribs; absent from the official inactives published 18:06 CT and confirmed stable 18:12 CT; artifact records `moss_status: ACTIVE - not listed on official inactives`). **Hufanga = OUT** (final inactives, ankle). SEA's five final inactives (Milroe, Pili, Smith, Foster Jr., Henry Jr.) were healthy scratches per the prep of record.

Participation of Surtain II, Charbonnet, Surratt, and Thomas is **UNRESOLVED**: the prep of record directs settling participation from snap counts, and no snap-count artifact exists in the record. (One staged social recap CSV — @GridironInfo_ player stats — lists Charbonnet with 10 carries / 45 yards, which would imply he played; that CSV is internally inconsistent — its team passing line (21/37) contradicts its own Darnold line (18/28), and its JSN line (5/66) contradicts the verified record (12/134) — so it cannot settle participation. See the coverage note.)

## Section 5 — Pasted dossier v2: reconciliation and conflict notes (NOT graded)

The "Situational Force Execution and Layer 2 Introspection Dossier" v2 was pasted by Garrett on 2026-10-15 ~18:40 CT. Status in the record: **UNVERIFIED adjudication input only, never endorsed, never treated as landed.** Per the prep of record: do NOT grade from it. Its claims are reconciled here, not graded.

1. **Premise count (16 claimed vs 8 of record) — count reconciles; the 8 extra are enumerated in the paste, and are ungraded by rule, not by absence.** V2's premise table is preserved in the record — in the pasted dossier text carried in the Oct 15 conversation transcript (`~/workspace/proactivity/hidden_files/1792168239957-065f85caba81857abbfdd17c32e44525/conversation.md`). Its P-SEA-DEN-001…008 restate the seeded 8 (same type_ids) in SPEC-C §1.1 grammar with stated probabilities and machine resolution criteria (resolve_by 2026-10-16T06:00:00Z); its 8 new premises are: P-SEA-DEN-009 `hypoxic_age_recovery_deficit.v1`, P-010 `two_high_shell_clock_bleed.v1`, P-011 `short_week_vertical_suppression.v1`, P-012 `market_microstructure_contradiction.v1`, P-013 `trench_pressure_turnover_cascade.v1` (the "fifth distinct layer" the dossier text calls out as absent from v1), P-014 `coaching_playcaller_transition_asymmetry.v1`, P-015 `secondary_weak_side_seam_reallocation.v1`, P-016 `late_window_clearing_and_age_altitude_tax.v1`. They are **not graded here** because the prep of record bars grading from this dossier ("Do NOT grade from it, do NOT treat its resolve_by times or its CC-2026-06-SEA-DEN-001 as operative") and its status is UNVERIFIED: the claimed server SHA-256 (`e4b89f2c…`, full value in the paste) has never been checked against a produced `v2.json` artifact, several values in the paste are $$-redacted (including magnitudes in its own premise table), and it carries the factual conflicts in items 2 and 6 below. Reconciliation: 8 (of record, graded in Section 1) + 8 (enumerated in the unverified paste, ungraded by rule).
2. **CRPS citation — CONFLICT, frozen record wins.** V2 cites `best_measured_crps` 7.1540. The frozen record is: Gaussian baseline **7.154021** (frozen filter REG 2017 W1–2026 W5, n=2,462, μ = spread line LOCKED); verified best measured = family-2 **7.133199** (DIAGNOSTIC); gate 7.099 NOT CLEARED. V2's 7.1540 is the **baseline mislabeled as the best** — its citation is wrong as stated.
3. **"Fused T-1 7.132636" — CONFLICTED-UNRESOLVED.** This figure appears in the Oct 15 daily log asserted as artifact-verified, but no artifact in the record establishes it as a frozen-filter result, and it is not part of the frozen record (baseline 7.154021 / family-2 7.133199 / gate 7.099 not cleared; the synthetic ~7.025 / ~7.094 figures are explicitly NOT frozen-filter results and must never be cited as such). No outcome artifact from this game can adjudicate a CRPS figure. It stays CONFLICTED-UNRESOLVED.
4. **Conditional commitment CC-2026-06-SEA-DEN-001 — trigger resolved FALSE; did not fire.** The commitment was keyed to Riley Moss being INACTIVE. Moss resolved ACTIVE (Section 4, verified at the inactives artifact). The condition was checkable and checked: it did not fire. (This is a trigger evaluation, not a premise grade; the prep of record likewise states the CC is not operative.)
5. **LMS vector conflict — unresolved provenance.** V2's q (0.24 / 0.64 / 0.12) differs from WO-0's (0.43 / 0.34 / 0.23). Flagged in the Oct 15 record as unresolved provenance; not adjudicated there or here. Neither is graded (Section 3).
6. **Roster error.** V2 names Emanuel Wilson as a Seattle RB. The record places Wilson with Green Bay (Week 4 materials list Emanuel Wilson, GB). A factual error inside v2, noted as part of its unverified status.
7. **Unverified structural claims, noted only.** Server SHA-256 `e4b89f2c…`, a `/reasoning/2026-06-sea-den` route claimed LIVE with 16 edges, and $$-redacted figures throughout — none verified at artifact level in this record. The S0/S1 store's v1 (the 8 seeded premises) remains the dossier of record until artifact-level verification says otherwise.

Also recorded for completeness (not part of either graded set): the bridge injury-rule v1.1 build (`motif/bridge-injury-rule-2026-10-15` @ `396b6562`) minted a separate `injury_burden_differential` premise for this game that came out **NEUTRAL** at the fixture facts (burden scalar tied DEN 3.00 – SEA 3.00), its statement naming positional concentration (Denver's losses in the secondary) as the scalar's blind spot. It is not one of the ledger's seeded 8 and is not graded here; it is the artifact the posted read's basis leaned on, so it belongs in the reconciliation picture.

## Section 6 — Coverage note

**Verified at source during this grading:**
- The 8 seeded premise records, verbatim, from the ledger JSONL at branch `motif/premise-grading-ledger-2026-10-15` @ `c9d19afb`, plus the ledger README's grading rules.
- Final score and quarter splits (DEN 17, SEA 14 OT; DEN scoreless in the 2nd half of regulation) — four-outlet verified record, corroborated by the staged score-by-quarter CSV.
- Line behavior (FLAT) — directly from the 462-row line archive and the pickcenter polls.
- Inactives: Moss ACTIVE, Hufanga OUT, both final inactive lists, and the anomaly — directly from the inactives artifact.
- Gate facts for Seq 5 — prep of record §4, cross-checked against the frozen record (7.133199 vs 7.099 NOT CLEARED).
- Rest/short-week facts — Oct 11 games + Oct 15 kickoff, from ledger evidence and the inactives artifact.
- Pick settlement arithmetic — from the final score and the posted stakes of record (−1.5u total).

**UNRESOLVED list (what stayed open, and what would close it):**
1. **Seq 3 coaching_continuity** — no continuity-evidence artifact exists. Closes only if an outcome artifact carrying continuity/friction evidence is authored; by the ledger's design it may legitimately stay UNRESOLVED.
2. **Seq 4 injury_asymmetry** — blocked on Surtain II's participation. Closes with a snap-count artifact for this game (prep of record directs snap counts, not the ESPN inactive list).
3. **Seq 8 weather_non_factor** — no realized game-time weather in any artifact. Closes with a realized-weather entry in an outcome artifact.
4. **Participation of Charbonnet, Surratt, Thomas** (and Surtain II) — the morning-Out/final-payload-absent anomaly. Closes with snap counts.
5. **V2's 8 extra premises** — enumerated in the pasted dossier preserved in the Oct 15 conversation transcript (Section 5.1), but the dossier is UNVERIFIED and the prep of record bars grading from it. Closes only with artifact-level verification of the claimed `v2.json` (server SHA-256 `e4b89f2c…`) against the S0/S1 store, or a ruling superseding the prep of record.
6. **"Fused T-1 7.132636"** — CONFLICTED-UNRESOLVED (Section 5.3). Closes only with the fused-run artifact itself, checked against the frozen filter.
7. **Altitude mechanism for Seq 1–2** — friction is documented; altitude causation is not isolated (no tracking-derived decay summary; DEN pressure confound). The SUPPORTED grades stand on the ledger's friction-evidence rule; the mechanism question stays open.
8. **Realized LMS** — structurally ungradable for this game (MISSED-T0, NO_T0_ANCHOR, R0 INSUFFICIENT_DATA). Permanently lost evidence for this game by the RETRO rule; not closable.

**Conflict found during verification (recorded, not used):** the staged @GridironInfo_ SEA@DEN recap CSVs (Oct 16 morning sweep) conflict with the four-outlet verified record on total yards (291/174 vs 353/168), the JSN line (5/66 vs 12/134), Darnold's line and INTs (18/28, 132 yds, team INT-thrown 1 vs 2 INTs and 24 pressures / 5 sacks taken — the CSV also shows SEA sacked 6 times), and are internally inconsistent (team completions 21/37 vs Darnold 18/28). Where they agree with the verified record (final score, quarter splits) they corroborate; where they conflict, the verified record governs and the CSVs were not used.
