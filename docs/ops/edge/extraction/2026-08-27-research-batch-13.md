# 2026-08-27 OVERNIGHT RESEARCH — BATCH 13 (§4 sweep, cont. — MDP + special-teams + framing, no stop)
# Full-text verified. Verdicts: PATTERN. Source = DATA. James Cook rule held.

## M66 — xT as Markov Decision Process / Contextual xT (CxT)
- MATH: xT is an MDP — states = pitch zones, actions = pass/dribble/shoot, reward = ΔxT; optimal policy = maximize possession value. CxT (Lamberts) adds game-state context. Semi-Markov spatio-temporal framework (Nature 2025 s41598-026-52938-1) models possession duration. MDP optimal policy independent of initial state distribution.
- SPORT/MARKET: soccer possession value. GSE: port as GSE-xt-MDP (our xT M18 as MDP). Independent p. Reconciles event-value with decision theory.
- DATA: event sequences (public ESPN). GSE holds.
- VERDICT: PATTERN — xT formalized as MDP; strengthens M18.
- LICENSE: marclamberts CxT, Nature s41598-026-52938-1, AAAI 40929 (open). CITE. Full read 2026-08-27.

## M67 — NHL special-teams xG (PP/PK beyond binary %)
- MATH: replace PP%/PK% (binary) with xG per power-play/PK opportunity; xG accounts for shot quality not just count. Berkeley (sportsanalytics) redefines special-teams via expected goals and unblocked-shot-rate.
- SPORT/MARKET: NHL special teams. GSE: port as GSE-stxG (our xG M29 on PP/PK shot events). Independent p. Pairs with M29.
- DATA: PP/PK shot events (public NHL). Proposed source entry.
- VERDICT: PATTERN — special-teams decomposition of xG.
- LICENSE: berkeley sportsanalytics, espn NHL team stats (public). CITE. Full read 2026-08-27.

## M68 — NFL defensive EPA (DEPA) framing
- MATH: DEPA = EPA allowed/created on defense = −offense EPA on opponent plays (negative = good). Split by down/distance/field. Defense evaluated via EPA-conceding (nfelo/SIS). Note: defensive EPA noisier than offensive (M46).
- SPORT/MARKET: NFL defense. GSE: port as GSE-depa (our EPA on pbp — public). Independent p. Reconciles M28/M46.
- DATA: nflverse pbp (CC-BY). GSE holds.
- VERDICT: PATTERN — defensive side of EPA; cheap given M28.
- LICENSE: nfelo EPA-tiers, SIS defense EPA, espn EPA-explained (public). CITE. Full read 2026-08-27.

## M69 — MLB catcher framing runs (RPM / mixed model)
- MATH: framing runs = runs saved/cost via called-strike probability shift. BP Regressed Probabilistic Model (RPM) uses PITCHf/x: P(call strike | loc, count, catcher) vs league baseline → runs via run-value of strike. Mixed-model (WOWY + regressed) for stability.
- SPORT/MARKET: MLB catcher value. GSE: port as GSE-framing (our-fit on Statcast/event — public). Independent p. Pairs with M5.
- DATA: pitch-level (public Statcast/Baseball-Reference). GSE holds (approved MLB).
- VERDICT: PATTERN — probabilistic framing; EB/mixed for stability (reconciles M11).
- LICENSE: baseballprospectus RPM, fangraphs framing, beanumber abdwr3e (open). CITE. Full read 2026-08-27.

## M70 — Soccer match outcome via Markov chain / HMM
- MATH: (a) Markov chain on possession states → match event summary; (b) HMM (jbaranski/mls-hmm) states = win/draw/loss, emissions = fixture features → P(outcome). (c) Bayesian dynamic GLM for league results (scribd).
- SPORT/MARKET: soccer match pred. GSE: port as GSE-soccerMC (our Poisson M7/Dixon-Coles as base; MC for in-match). Independent p.
- DATA: results + events (public). GSE holds.
- VERDICT: PATTERN — MC/HMM match model; sits atop M7.
- LICENSE: arxiv 2402.06820, github mls-hmm (MIT), medium MC (open). CITE. Full read 2026-08-27.

---
BATCH 13 SUMMARY: 5 methods (M66-M70). TOTAL sweep = 70 methods.
xT→MDP (M66) formalizes M18. NHL special-teams xG (M67), NFL DEPA (M68), MLB framing (M69), soccer MC/HMM (M70). NO fabricated numbers. Loop continues.
