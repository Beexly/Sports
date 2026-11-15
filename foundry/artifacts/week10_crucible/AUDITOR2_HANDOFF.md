LOCAL FALLBACK — pre-GCP-sync, pending cross-audit

# AUDITOR-2 HANDOFF — NE@DET (Munich) / KC@ATL — NOT A DOSSIER
Status: Contract switched to GCP ownership (VM gse-foundry-gcp-01, branch
gcp/foundry-shard-b-2026-11-13, Beexly/agent-bus) at ~2026-11-13 12:17 local,
BEFORE auditor-2 wrote NE_DET.md / KC_ATL.md. Per Garrett's contract update,
no dossier content was generated from scratch after the switch. This note
finalizes research/audit work completed pre-switch so the GCP owner can
consume it. gcp_sync/ was empty at check time (12:18). HOU_CLE.md / SF_DAL.md
in this directory belong to other auditors and were not touched.

## 1. Verified engine-state defects (WP-8 worktree, branch hermes/week10-master-launch-2026-11-13)
Sources: C:/Users/Garrett/Sports-main-merge/data/engine/connected_workflow_dossier_{ne_det,kc_atl}_week10.json,
data/context_packets/2026_10_{NE_DET,KC_ATL}.json, ESPN scoreboard dates=20261115 (saved:
C:/Users/Garrett/AppData/Local/hermes/cache/scratch/espn_wk10.json). Coverage audit: 13/13 all_green (2026-11-13T13:41Z).

NE@DET (ESPN event 401873053, kickoff 2026-11-15T14:30Z = 9:30 ET / 15:30 CET, Fox):
- VENUE IDENTITY FAILURE: stage1a matchup_environment says "DET Home Venue", is_indoor=false,
  58F/7.5mph "standard outdoor"; context-packet L06 says "Ford Field", roof DOME, wind 0.
  Both wrong: game is at Allianz Arena (ESPN "FC Bayern Munich Stadium", venue id 11930),
  Munich, neutralSite=true, ESPN indoor=false, natural/hybrid grass (ESPN venue grass=true;
  allianz-arena.com Nov-2026 NFL-conversion article). Two layers disagree with each other AND reality.
- TRAVEL/CIRCADIAN ZEROED: L08 timezone_delta_hours=0.0, circadian_travel_fatigue_delta≈0.
  Reality: both teams eastbound +6h (NE ~3,860 mi, DET ~4,317 mi). NE flew Wed night Nov 11
  (Vrabel 11/11 presser); DET already in Munich by Thu Nov 12 (mlive/Yahoo Sheppard article).
  NE has Week 11 BYE after; DET returns westbound to host TB Week 11 (second round-trip in 7 days).
- INJURY OVERLAY CONTRADICTION: sim branches labeled "Full Starter Strength" while Stage-0 excludes
  NE RB Rhamondre Stevenson (DOUBTFUL; Vrabel: IR possible, few IR spots left), RB TreVeyon Henderson (OUT),
  FB Reggie Gilliam (IR — but Vrabel 11/11 says Gilliam "back practicing": status conflict), C Ben Brown (OUT),
  CB Carlton Davis III (OUT); DET S Kerby Joseph (OUT; 21-day window open per mlive), LB Jack Campbell (IR),
  RB Isiah Pacheco (IR). A.J. Brown (NE WR, injured) traveling but game-status uncertain (Vrabel).
- fg_make_prob_delta -0.0406 derived from phantom 7.5mph wind; actual Munich forecast (Open-Meteo,
  pulled 2026-11-13 for 11-15, stadium grid): ~45F/7C at kickoff falling to ~42F, dry, near-calm
  (0.4-3.4 mph), overcast; overnight freeze -2.6C possible morning frost. Cold-dense-air ballistics
  differ from the 58F assumption (see primitives drag book below).
- Template residue: stage2 keys jax_score/bal_score, cover probs keyed ±7.5 vs posted ±2.5,
  trench field "fagnano_ocacm_audible_failure_prob" in a NE/DET dossier. Biomech constants identical
  across both games (qb_release_time 0.3527s, ocular_latency 27.07ms) — not QB-personalized.

KC@ATL (kickoff 2026-11-15T18:00Z = 1 PM ET, CBS, Mercedes-Benz Stadium, ESPN indoor=true):
- ROOF/SURFACE MISMODEL: stage1a says outdoor 58F/7.5mph; MBS official gameday page lists
  "Roof Status: Closed" for this game (mercedesbenzstadium.com/falcons-gameday/kansas-city-chiefs);
  surface FieldTurf CORE. CP L06 correctly says DOME/wind 0 — stage1a contradicts it.
  fg_make_prob_delta -0.0406 again applied to a closed-roof game (should be ~0 wind effect).
- STALE STAGE-0 ENTRIES (Neon fetch 2026-11-12 vs web Nov 11-13):
  * ATL Cameron Williams: repo IR ankle → ACTIVATED from IR Wed Nov 11 (Rotowire/CBS/FalconsWire).
  * KC Mansoor Delane: repo OUT shoulder → FULL participant Wed+Thu (official chiefs.com wk10 report);
    "out" was the Week 9 designation.
  * KC Omarr Norman-Lott: repo OUT knee → PUP designated-to-return Oct 28, limited wk10, activation
    pending (window ~Nov 18).
- GOVERNANCE-vs-REALITY DIVERGENCE: Rashee Rice excluded via "MASTER-PLAN STAGE 0 BAN (owner-imposed
  2026-11-04)". Web: NFL closed investigation Apr 3 2026 with NO discipline; Rice FULL participant
  (knee) wk10; civil suit pending. Ban is internal-only; engine therefore under-states KC passing
  offense relative to real-world availability. Owner ban stands for engine purposes — flag, do not override.
- POST-INTERNATIONAL SPOT MISSED: ATL played Week 9 IN MADRID (CIN @ ATL, L 17-34, Bernabeu — the
  week9 engine DID model Madrid correctly: "Santiago Bernabeu Stadium (Madrid)", roof closed 70F).
  So the venue-resolution regression is NEW in the Week 10 pipeline for NE@DET, and the Week 10
  L08 still zeroes ATL's post-Madrid return travel. ATL is 3-6, off a 4-INT Penix game at TB (W8)
  and the Madrid loss (W9).
- Same "Full Starter Strength" overlay labels despite exclusions; same jax/bal template residue.

## 2. Verified context the GCP dossiers should carry (citations in research files)
- Records (ESPN scoreboard): NE 5-4, DET 6-2, KC 6-2, ATL 3-6.
- NE: HC Vrabel (no playcall), OC McDaniels (playcaller; LV 2022-23 scar), DC Zak Kuhr (2nd yr,
  blitz 40.1% 6th, nickel-24 77.7% 2nd, secondary EPA/pass last-4 0.35 31st), AHC Terrell Williams
  (ex-DET DL coach — tree link). Maye: 11 INT (tied league-most), TO diff -1.2/g (31st), pressure
  rate allowed 42.9% (31st) BUT comfortable vs blitz (+0.03 EPA 14th) / pressure (-0.04 4th);
  play-action EPA -0.28 (37th). NE made SB in 2025 season; Maye 2025 MVP runner-up (Yahoo preview).
- DET: HC Campbell, OC Drew Petzing (new; Goff line autonomy; run scheme mirrors Johnson era),
  DC Kelvin Sheppard (rotates ~full roster; consulted Aaron Glenn twice on trade acquisition
  Andre Cisco from NYJ — Glenn is ex-DET DC). Safety crisis: Maddox out (season), Harper ankle,
  Kerby window open; Branch back from Achilles; Cisco expected to play. Campbell: DET "stay
  aggressive on fourth down", no offensive turnovers (Vrabel corroborates). Gibbs leads league touches.
- KC: HC Reid (playcaller; 2025 was 6-11, lost SB LIX; 7 new coaches 2026), OC Bieniemy (returned,
  collaborative not playcaller), DC Spagnuolo. Butker 12-of-19 FG 2026, most misses since 2025;
  Reid sticking with him ("peaks and valleys"), Justin Tucker on PS — close-game FG tail risk.
  Mahomes 14 TD/4 INT thru W8, clean W9 vs NYJ 35-12; right elbow/knee managed; LT Josh Simmons IR,
  RT Jaylon Moore DNP — tackle protection singularity. Kenneth Walker 3 TD W9.
- ATL: HC Kevin Stefanski (ex-CLE, fired Jan 5 2026), OC Tommy Rees CALLS PLAYS (ex-CLE 2025,
  took over from Stefanski W10 2025), DC Jeff Ulbrich, OL Bill Callahan; Matt Ryan president of
  football ops. Penix starter W3+ (Tua W1-2, 0-2 start; Penix 2025 ACL): 10 TD/6 INT, QBR volatility
  89.0→8.2→52.4, 5 sacks vs CHI / 3 vs BAL. Bijan Robinson carries RB load (Brian Robinson Jr IR
  hamstring Nov 7, min 4 games); Bijan extension 3yr/$75M. H2H: KC leads 8-3; last 3 all close KC
  wins (2024 SNF 22-17 roof OPEN; 2020 17-14; 2016 29-28); Reid 11-3 vs ATL (compiled).
- Travel science: Benito et al. 2026 systematic review (PMC13030464, Sports 14(3):93) — eastward
  travel → stronger circadian disruption, impaired coordination/technical performance; Dude et al.
  2026 SportRxiv.1087 (Melbourne case study: early-arrival SF 27-7 over late-arrival LAR; both teams
  won post-international next games; authors caution against causal attribution); Smith et al. 2013
  Sleep 36(12):1999 (circadian misalignment NFL). Munich crowd composition/ticket split: UNVERIFIED gap.

## 3. Foundry primitives available for cross-audit (gatekeeper: 2 COMPLETE tier-A books + 2 more)
C:/Users/Garrett/Sports/foundry/artifacts/primitives/:
- 33df04255621d53b (Aerodynamic drag of American footballs, 6pp): yaw-dependent C_D, ~4x crosswind
  cliff, Re regime gate → Munich cold-air density / FG ballistics lens; engine's generic
  aero_drag_force_n=1.0831 is not venue-conditioned.
- a84d79326cdf925d (EPL match-prediction ML paper, 9pp): temporal-split anti-leakage invariant,
  rolling form + days-since-last-match fatigue proxy → maps directly to the missing travel/fatigue
  layer and to held-out discipline; flags the paper's own 87.14%/99.00% claims as audit targets.
- 8a1ae44d89418bd2 (ML textbook, 189pp): expected-loss kernel, Bayes floor, AdaBoost fail-closed gate.
- 0414b2bd02f58929 (NFL rules/operations book, 842pp): OT stopping kernel, challenge economy as
  value-of-information, emergency-3QB predicate → situational priors for coach-mind audit.

## 4. Research artifacts (pre-switch, scratch — not committed)
- C:/Users/Garrett/AppData/Local/hermes/cache/scratch/research_KC_ATL.md (49KB, full citations)
- C:/Users/Garrett/AppData/Local/hermes/cache/scratch/espn_wk10.json (ESPN scoreboard raw)
- C:/Users/Garrett/AppData/Local/hermes/cache/scratch/cp_{NE_DET,KC_ATL}_compact.json (26-layer extracts)
- NE@DET web research returned as structured JSON (child blocked before file write): venue/weather/
  travel facts captured in §1-2 above; full child transcript:
  C:/Users/Garrett/AppData/Local/hermes/cache/delegation/live/deleg_f3841310/task-0.log
- KC@ATL full child summary: C:/Users/Garrett/AppData/Local/hermes/cache/delegation/subagent-summary-1-20261113_121623_376815.txt

## 5. Honest gaps
- No win-probability distribution or veto-gated outcome ranges were authored (contract switch).
  Engine WP for reference only: NE@DET 0.3808/0.6192, KC@ATL 0.6408/0.3592 (branch A, 10k sims) —
  both computed with the defective venue/injury state above; treat as contaminated until GCP refit.
- Munich crowd-noise asymmetry, exact team arrival times, Friday game-status designations,
  Norman-Lott activation, post-World-Cup MBS turf reinstall date: UNVERIFIED.
- No odds/lines used as inputs anywhere (line-free); market fields in engine artifacts noted as
  placeholders (identical -2.5/44.5 across both games) and excluded.