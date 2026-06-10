# STATE_OF_THE_LAUNCH.md — cycle digests (newest first)

---

## Digest #4 — 2026-06-10 (cycle 5)

**Readiness:** test count 2,037 → **2,106**; commits 15 → **18**; tree clean. Trend: ↑.

**Closed (evidence: director certify gate b2dsimby7 — 2,106 tests, build green; commits `6b08c8c`/`c71cb54`/`9f86fb4`):**
- **R-08** — the entire Stripe revenue lifecycle is now PROVEN without live keys: real signature verification against synthetic signed events, tier flips (PRO/ELITE) asserted server-side, unknown-price → FREE (no silent grants), idempotent replay, retryable failures. Plus lazy-init: a missing key degrades cleanly instead of crashing the module graph.
- **R-12** — public APIs are throttled (per-IP, 429 + Retry-After, fail-OPEN so a broken limiter can't take the site down) and validated (junk params → clean 400; no more fake "degraded" 503s from a malformed date). Upstash/KV activates on key presence — your env action, inert until then.
- **R-10** — observability actually dispatches now: Sentry-compatible error envelopes + PostHog events the moment keys exist (zero egress without them, contract test-pinned), and synthetic uptime monitoring runs every 30 min via GitHub Actions.
- **D-011 settlement route** (prior cycle, now logged): production settles picks inside Vercel the day GA-01/GA-02 clear.

**Note:** cycle 5's workflow critic timed out mid-verdict; the director ran the full certify gate personally before committing (doctrine held — nothing lands unverified).

**Next:** BV-02 humanizer port (your ask), R-13 odds-quota visibility, S-06 OG-image rebrand; then the Breathtaking SHOULD stack (17 tickets).

---

## Digest #3 — 2026-06-10 (cycles 3–4)

**Readiness:** ~32 🟢 / 9 🟡 / 0 🔴 — both audit REDs are dead. Trend: ↑↑. Test count 1,989 → **2,029**. Commits this run: 13 (all scoped, tree clean).

**Closed (evidence: throwaway-PG proof run, certify gates, critic-run full gates):**
- **R-02** — an empty database now bootstraps the full migration chain (proven empirically on a real scratch Postgres: 11/11 apply, zero drift, idempotent replay, control reproduces the old failure). Disaster-recovery/fresh-env risk eliminated.
- **B-04** — **the launch gate now runs itself**: `_launch/CALIBRATION_REPORT.md` regenerates after every settlement with Brier/buckets/CI/CLV and an unsoftenable verdict. Today's truth on record: *"Not yet — 0 graded picks"* + the exact unblock path.
- **R-05** — postponed/cancelled games can no longer rot PENDING: VOID sweep at +12h, excluded from the record and the calibration sample (test-pinned end-to-end).
- **R-11** — security headers byte-identical across both sources, HSTS at the edge, CSP in Report-Only; a dropped header now fails CI.
- **R-09** — legal pages no longer self-refresh their revision date; banned-pattern test prevents recurrence.

**In flight:** D-011 Option A — real settlement inside the Vercel cron envelope (shared core for worker + route, job-truth contract, 30-min odds cadence + hourly settlement). After this lands, **prod settles picks the day GA-01/GA-02 clear** — no new infrastructure.

**Decisions:** D-011 (settlement host = Vercel-only, your GA-09 plan-tier confirm can flip it). New asks added: GA-09 (5 min), GA-10 (2 min, @GalaxySportsAI handle).

**The critical path is unchanged and entirely yours now:** GA-01 (prod DB) + GA-02 (odds key) → shadow season starts → ~3–6 weeks to 150 graded picks → the report prints the verdict → GA-08 signature.

---

## Digest #2 — 2026-06-10 (cycle 2)

**Readiness:** 3 🔴 → settlement-correctness 🔴 is now 🟢; homepage trust items closed. Net: ~29 🟢 / 12 🟡 / 1 🔴 (R-02 fresh-env). Trend: ↑.

**Closed this cycle (evidence: certify gate — engine 246/246, web 1989/1989, build green; commits `4387321`, `d86af18`):**
- **R-01 (the kill-shot):** away-favorite spread picks no longer grade WIN on a loss. Conversion at the settlement boundary, live repro regression-guarded. The future calibration sample is now trustworthy — this landed *before* anything real settles, which is exactly the order that matters.
- **R-04:** CLV sign + bet-time line lock — the honesty metric can't be fabricated by line drift.
- **BA-B01/B02:** the homepage no longer fabricates settlements or calibration dots. With zero data it tells the truth ("Building ledger history" / COLLECTING).
- **BV-01 verified with evidence:** no AI-generated content can reach a public surface without an operator's hand (draft-only guardrail + compliance BLOCKER, all green in the certify run).
- **BV-03:** hero rewritten in the founder's voice — "Every stat. Known, reviewed, weighted, scored." Zero tooling foregrounded, in either direction.

**Founder directive absorbed:** the public story is Garrett — method, formulas, judgment. Tools backstage, never denied, never advertised. The 70% is claimed the day the calibration report proves it, not before. (Memory + compliance rules updated; @GalaxySportsAI handle flagged as BV-04, your 2-minute call.)

**In flight next:** R-02 (squashed baseline migration — fresh-DB bootstrap) + B-04 (the auto-regenerating calibration report with the plain-English verdict).

**Unchanged asks:** GA-01 (prod DB) + GA-02 (odds key) remain the only two things between us and the shadow season.

---

## Digest #1 — 2026-06-10 (Launch Director cycle 1)

**Readiness:** 25 🟢 / 14 🟡 / 3 🔴 (42 items, first evidence-graded board — `LAUNCH_READINESS.md`). Trend: n/a (baseline).

**Honest launch distance: ~4–8 weeks, MEDIUM confidence.** The clock is NOT code — it's the calibration sample (≥150 graded picks through the live pipeline, ~3–6 weeks of accumulation) sitting behind two 15-minute founder gates (GA-01 prod DB, GA-02 odds key). Code fixes on the critical path: ~1–2 weeks, already being eaten.

**What closed this cycle (evidence in LAUNCH_READINESS / commits):**
- **B-01** runtime audit — full evidence pass: app brought up, every route probed, lifecycle exercised. Found the launch-fatal settlement bug (below).
- **B-07** checkpoint commits — the entire verified-green tree (1,980 tests) protected in **5 scoped commits** (`0da26f2`, `588dd50`, `4b6127a`, `537268b`, `e72f057`); working tree clean.
- **Wave 8 CLV scaffold** — ClosingLine model + migration + computeClv + capture fn + settlement wiring (audit then caught a sign bug in it — being fixed now, see in-flight).
- **P-01 static pass** — Breathtaking Audit: 49 raw → 38 deduped tickets (9 BLOCKER) in `BREATHTAKING_AUDIT.md`.
- **Source-mesh research** (was dead, re-dispatched) — data-mesh docs 20–24 written, critic GO-WITH-FIXES, zero fabrication.

**In flight right now:** the double fix-wave —
- **R-01/R-04 (the kill-shot):** live-proven settlement bug — away-favorite spread picks grade **WIN on a 1–2pt loss**; plus inverted AWAY sign in computeClv + bet-time line lock. *This poisons every settled pick + the entire future calibration sample; it lands before the shadow season settles anything.* Convention decided (D-010): Pick.line keeps chosen-side semantics; conversion at the settlement boundary.
- **BA-B01/BA-B02:** the homepage **fabricates six W/L settlements** next to a hidden "no picks are fabricated" claim, and plots a hardcoded "LIVE CALIBRATION" chart beside "Sample: 0". Both being replaced with real-data/honest-empty rendering.

**Decided autonomously this cycle (full log: `_logs/DECISIONS.md` D-001..D-010):** command layer adopted; GSE branding kept pending your override (Q-01); trunk = this repo; scoped-commit strategy; Odds API stays primary; shadow season auto-starts when GA-02 clears; dead research parked then revived; stale git lock removed after verification.

**Codex lanes ready (non-overlapping, test-guarded):** LANE 1 canonical safety back-port · LANE 2 OG-image rebrand · LANE 3 seed.ts repair (R-03) · LANE 4 Stripe synthetic-event suite (R-08) · LANE 5 legal last-updated dates (R-09).

**Your queue (`GARRETT_ACTIONS.md`):** GA-01 prod DB + GA-02 odds key are the only two things between us and the shadow season starting. Both ~15 min. Everything else routes around you.

**QUESTIONS (defaults in effect — silence = consent):**
- Q-01: proceeding with **GSE** branding (repo/domain/constants all say Galaxy Sports Edge); override if "GSN — Galaxy Sports Network" is a deliberate rebrand.
- Q-02: proceeding with scoped commits on `safety/sports-wip-2026-06-04`; no push attempted yet (remote/creds unverified — will attempt, park if absent).

**Next up after the fix-wave gates green:** commit it → B-04 calibration report generator (auto-regenerating, with verdict) → R-02 baseline migration (CODEX-able) → R-06/B-06 settlement-host + cron-cadence proposal → Breathtaking SHOULD tickets.
