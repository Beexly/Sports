# Coding agent prompt — stadium weather signal + GSE agent skill

Two missions. Same standing rules as always: repo's own rules govern, wire first then weight/calibrate/test, nothing lives only locally — push everything to the branch.

## Mission 1: Stadium weather as a first-class engine signal (free sources only)

**Why:** The total-signal doctrine says the engine ingests every signal. Game-day weather moves NFL passing, kicking, and totals — wind, rain, extreme cold/heat are documented effects. This is a real, backtestable signal, not a vibe.

**Build:**
1. A weather provider: given (stadium, game datetime), return the kickoff-window forecast — temperature, wind speed/gusts, precipitation probability and amount, humidity — plus derived flags (wind >15mph, heavy rain, extreme cold <20°F, extreme heat >95°F, dome/roof = weather irrelevant).
2. Sources: NWS api.weather.gov and/or Open-Meteo — both free, no API key. Pick whichever gives cleaner stadium-point forecasts; document the choice.
3. Historical backfill: Open-Meteo's ERA5 historical API is free — use it so the signal backtests, not just live. Every rule gets backtested.
4. Wire it into the total-signal program (spec: `motif/total-signal-wiring-2026-09-27`) as an adjustment-layer input. Encode the known directional effects (wind hurts passing/kicking, rain depresses totals) as priors, clearly marked as priors — weights and calibration come later, per the standing order.
5. Compose with the existing provider patterns in the repo. Cache aggressively; forecasts move slowly. API outage = graceful degrade per repo conventions, never a silent zero.

**Done when:** provider returns sane data for a known past game (spot-check one windy game and one dome game), dome handling verified, backtest path demonstrated on at least one season of historical weather, tests green, pushed.

**Hard constraints:** $0 — no paid APIs, no keys, no accounts. Weather is public data; no privacy concerns.

## Mission 2: Sketch the GSE agent skill

**Why:** Vaisala just shipped their weather API as provider-neutral agent skills (agentskills.io standard, Linux Foundation) so every coding agent can build on it without reading docs. That's a distribution pattern worth stealing: a GSE skill puts our projections inside every AI assistant's workflow.

**Design (prototype, don't publish yet):**
1. Study the reference: `vaisala-xweather/xweather-agent-skills` on GitHub — SKILL.md + `references/` progressive disclosure, one canonical `skills/` layout, validated with `skills-ref`. Mirror that structure.
2. Scope is the public surface ONLY: projections, rankings, published picks, outcomes. Never raw metrics, signals, methods, NGS, or anything internal. The public/private doctrine is absolute here.
3. First inventory what public endpoints/pages exist on the GSE site today that a skill could read — the skill can only expose what the public surface already serves.
4. Deliverable: a `skills/gse/` directory with SKILL.md (what it is, when an agent should use it, how to fetch each public data type), `references/` for detail, and a short distribution note (GitHub repo + marketplace entries, mirroring Vaisala's layout) for later.

**Done when:** the skill directory exists, validates against the agent-skills spec, works against the real public site (no mocks), and the distribution note names the concrete publish steps. Pushed to the branch.
