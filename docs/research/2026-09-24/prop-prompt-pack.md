# GSE prop-prompt pack: anytime-TD + home-run hitters (drafted 2026-09-24)

Source saves: @thelocktalk 2026-09-03 "8 AI prompts for NFL anytime-TD props" (Start Here #1) and 2026-06-28 "3 AI prompts for likely home-run hitters". Both originals are comment-gated ("comment NFL"/"HOME RUN" to receive) — prompts not recoverable from captions. This pack is drafted fresh for GSE rather than chasing the gate.

## Constraint (from the engine itself)
The `picks` table holds SPREAD/MONEYLINE/TOTAL only — **no prop market**. So these prompts serve two purposes: (a) validation/alpha research against public prop lines, (b) GSE content (the prop lane feeds the faceless/Shorts pipeline). They never enter the pick path until a prop market exists in the engine.

## Anytime-TD prompt (template)
```
You are an NFL prop analyst. For the player below, estimate the probability of scoring an anytime touchdown in the upcoming game. Use ONLY the data provided; do not invent stats.

PLAYER: {name} | TEAM: {team} | OPP: {opp} | SPREAD: {spread} | TOTAL: {total}
ROLE DATA: routes/run {rr}, target share {ts}, red-zone targets last 4 {rzt}, snaps {snaps}, goal-line carries {glc}
MATCHUP: opp red-zone TD allowed rate {rzd}, opp DVOA vs position {dvoa}, game total {total}
WEATHER: {temp}F, wind {wind} mph
INJURIES: {relevant inactives}

Return JSON ONLY:
{"p_anytime_td": 0.00-1.00, "fair_odds": "+/-NNN", "edge_vs_line": "+/-NNN",
 "top_factors": ["...", "...", "..."], "kill_factors": ["..."]}
Calibration rule: your probabilities must be honest, not confident-sounding. A 0.15 with a reason beats a 0.4 with vibes.
```
Fill `{...}` from engine factorBreakdown + public injury/weather feeds. Run the same prompt across two models (cheap router for volume, frontier for the shortlist) — the 56%-cheaper local-router pattern from the action board applies directly.

## Home-run hitter prompt (template, mirrors the post's power/pitcher/park/wind frame)
```
You are an MLB prop analyst. For the batter below, estimate the probability of hitting a home run today. Use ONLY the data provided.

BATTER: {name} | TEAM vs {opp_pitcher} ({throws}) | PARK: {park} (HR factor {parkf})
POWER: barrels/PA {brl}, hard-hit% {hh}, avg EV {ev}, launch angle sweet-spot% {ss}
PITCHER VULN: HR/9 {hr9}, FB% {fb}, HR allowed to {L/R}HB {hr_split}
CONDITIONS: wind {dir} {mph}, temp {temp}F, humidity {hum}
LINEUP: batting {order}, OBP of hitters ahead {obp}

Return JSON ONLY:
{"p_hr": 0.00-1.00, "fair_odds": "+/-NNN", "edge_vs_line": "+/-NNN",
 "top_factors": ["...", "...", "..."], "kill_factors": ["..."]}
```

## Preregistered validation protocol (measurement-first — see the eval template)
1. Log every prompt output + the public line at kickoff/first pitch (commit the log; no editing after).
2. Success criterion written BEFORE the first run: e.g. "TD prompt achieves positive CLV vs closing lines over n=100 graded props" — not win rate, CLV (the engine's own auxiliary target).
3. Exact binomial/McNemar on the CLV sign, not vibes. Publish the failures anyway.
4. Cut rule: if no edge after the preregistered n, the prompt pack dies — no tuning the threshold after seeing the answer.
