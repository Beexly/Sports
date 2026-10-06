# Challenges — c05 Trust-Signal Deep Research

**Coordinator:** c05 Phase 2+ (trust-signals module)
**Date:** 2026-10-02
**Purpose:** every weak, hand-set, or contradictory claim the build must not launder into "research says."

---

## C1. The beat-desk proposal is a design doc, not validated research
The entire Layer 3 spec (classify → resolve → polarity×magnitude → decay → trust weight) is a **2026-09-13 PROPOSAL**, explicitly NOT implemented as of the 2026-10-01 audit note. None of its parameters were fitted or backtested. Building it faithfully is correct (it's the best spec the corpus has), but the code must label every hand-set parameter as `SPEC`/`INFERENCE`, not as a research finding. Nothing in the slice validates that this pipeline predicts anything.

## C2. Freshness half-lives are vibes
"Half-life ~24–48h; injury decays slower, motivational quotes faster" — no data behind these numbers. The build implements them as **configurable defaults** (`decay.py` `HALF_LIVES`), clearly marked tunable, with per-type overrides. Do not present 24–48h as a finding.

## C3. The tipster-leaderboard update rule has no formula
"Trust is earned, not assigned" is stated as a principle: weights update on a rolling window by correlation of the source's signals with realized outcomes. **No update equation, window length, or correlation method is specified.** The build implements an exponential-moving-average accuracy → weight-multiplier rule (documented in `tipster.py` as SPEC, not research). Any claim that this specific rule is "from the corpus" would be fabrication.

## C4. X intake rests on a fragile mirror chain
X direct fetch is blocked from this environment; the intake subagent recovered content via twstalker/xstalk/instalker mirrors, some crawls 45–273 days old. Mirror availability is not guaranteed and mirror content is unverified third-party scraping. The pipeline therefore:
- treats every mirror-fetched item as `SINGLE_SOURCE` at best (never CORPUS) until corroborated;
- logs PROVENANCE-GAP and moves on when a mirror fails (registry rule);
- requires an X-accessible execution environment (X API key, or Garrett's browser session) for production — the code ships with a `fetch` seam, not a working X client.

## C5. @matt_barlowe is not an intelligence source
The registry explicitly marks his football lane as PROVENANCE-GAP (hockey-analytics builder). The build **excludes him from active intake** and encodes him as `status: PENDING_VERIFICATION`. Promoting him before live-browser verification would be inventing a source.

## C6. @the_waldman's exact TNF post is inference, not data
Post 2105678944465027107 (the one Garrett sent) returned 403 on the mirror; its content was inferred from the surrounding timeline. The account file marks this correctly. The build must not cite that post's content as verified — only the timeline-recovered projection numbers, which carry `SINGLE_SOURCE` (twstalker mirror) verification.

## C7. "Fastest wire" is unbenchmarked
The claim that @mysportsupdate is the fastest of the seven wires is the intake author's judgment; "speed-of-reporting vs Schefter/Rapoport not benchmarked." The build treats him as a **high-priority news source**, not a measured-fastest one. News-wire priority in code comes from the registry's tier assignment, not a speed claim.

## C8. News-wire → profile re-run triggers need a materiality definition
No corpus file defines what makes a news event "material" enough to re-run a QB/coaching/OL profile. The build defines materiality tiers explicitly (starter injury = HIGH, depth-chart transaction = MEDIUM, quote/narrative = LOW) as SPEC defaults with the rationale documented in `news_wire.py`. This is a design choice awaiting Garrett's calibration, not a research result.

## C9. Entity resolution has no corpus method
The beat-desk spec says "entity-resolve to team/player/game" but gives no method. The build ships a deterministic alias-table resolver (32 teams + supplied roster names), marks unresolved entities with `data_gap`, and never guesses. Fuzzy/LLM resolution is a future lane, not shipped.

## C10. Classification is heuristic, not trained
The six beat-desk classes (injury/lineup/scheme/motivation/weather/off-field) plus the trust-quote class have no trained classifier in the corpus. The build ships a **keyword-rule classifier** whose every output carries `verification=INFERENCE`. This is honest: the corpus gives us the taxonomy, not the model. A trained classifier is a future improvement gated on labeled data.

## C11. T4 (Reddit) is volume-gated by spec — single posts never count
The beat-desk spec is explicit: T4 = volume + polarity, never single posts. The build enforces this: Reddit-class items only produce signals when aggregated (minimum item count per window). A single viral Reddit post is stored as an item but emits no TrustSignal. This is a deliberate anti-noise rule from the spec.

## C12. Contradiction: founder killed the shadow period, but the spec demands one
The beat-desk rollout note says the founder overrode the 4–8 week shadow period ("we're way too far behind"), while the spec's own honesty design (and the reasoning-depth spec) requires shadow-first validation. The build resolves this by **defaulting to shadow mode**: signals are computed, stored, and scored, but the provider exposes a `live` flag that defaults to `False`. Promotion to live is a deliberate, logged decision — the fail-safe direction per the conjunction-gate design ("failure = fewer Premium picks, not bad ones").
