# Brand Safety Rules — v2 (Evidence Engine era)

**Status:** Input spec for the linter that already exists at
`apps/web/lib/brand-safety/*` (and the runtime guards under
`packages/prediction-engine/src/guards/`). This document extends the v1
ruleset that's already enforcing trust-claim + tout-language bans, with
the new categories introduced by Phases 2–3 of the build plan: an
Evidence Engine with shadow-mode factors, true-EV separation, and
referee/venue/player/pace signals.

**Scope:** Every rendered surface (HTML, JSON, OG image alt-text, RSS),
every API response, every commit message, every published copy file.

**Format:** Each rule has an ID (`BS-###`), a category, a rationale, the
detection pattern (regex / AST / runtime invariant), and the enforcement
action (`block` = fail the build; `warn` = log + require human approval;
`shadow` = allow internally, strip on public surface).

---

## Categories

| Code | Category |
|---|---|
| A | Banned promotional language (existing v1) |
| B | Fake or speculative data (new) |
| C | Premature math surfacing (new) |
| D | Calibration & performance claims (new) |
| E | Secrets & supply chain |
| F | Shadow-mode boundaries (new) |

---

## A. Banned promotional language (existing v1 — kept for completeness)

| ID | Pattern | Action | Notes |
|---|---|---|---|
| BS-001 | `\b(guaranteed\|lock\|sure thing\|easy money\|free money\|can't lose)\b` | block | Tout language. v1 catches this. |
| BS-002 | `\b(\d+(\.\d+)?%\s+(win rate\|ROI\|accuracy))\b` outside `docs/calibration-proposals/` or `evaluatePublicPerformancePolicy() == ACTIVATED` branch | block | Unsubstantiated performance claim. |
| BS-003 | `\b(make money\|profit guaranteed\|beat the book)\b` | block | Promissory income language. |
| BS-004 | "AI picks" / "AI-generated picks" in any public surface | block | Brand position: deterministic engine, not LLM. LLM is content-layer only. |

Reference: `docs/brand/brand-guidelines.md` §2 (Voice) and §6 (Banned claims).

---

## B. Fake or speculative data — NEW

The Evidence Engine introduces dozens of factor types. Until each factor
has a real source adapter writing to `SourceSnapshot`, that factor must
not appear in any computed score, public response, or rendered surface.

| ID | Rule | Action |
|---|---|---|
| BS-010 | A factor with `activationState !== 'activated'` MUST NOT contribute to any `confidence`, `edge`, or `trueEV` field exposed in a public API response. | block (runtime invariant) |
| BS-011 | A `PlayerSignal` row with `source = 'estimated'` or `source = 'inferred'` MUST NOT be exposed in any public response or rendered page. Shadow mode only. | block |
| BS-012 | `RefereeSignal`, `VenueSignal`, `WeatherSignal`, `PaceSignal` — each requires a registered adapter in `packages/data-ingestion/src/adapters/`. If no adapter exists, the factor type cannot be queried by public routes. | block |
| BS-013 | Any factor whose `freshnessSec > stalenessThreshold` (per-factor, defined in `evidence-engine.md`) MUST be marked `stale` and either dropped from the score or trigger a `gateState = 'blocked-stale'`. | block |
| BS-014 | No string interpolation that fabricates a stat. Forbidden patterns: ``"${player.name} has X points in his last 5"`` where `X` is computed from a non-`activated` source. | block (AST scan) |
| BS-015 | "Reasoning" strings on a published pick must cite only factors whose adapter is `activated`. Cite the factor key (e.g. `marketDepth`, `lineMovement`) — not a free-form fabricated narrative. | warn + human approval |

**Runtime invariant.** Every public response must pass through
`assertNoShadowFactorsLeaked(response)` before it's serialized. The
helper walks the response shape and throws if any field's source is
shadow.

---

## C. Premature math surfacing — NEW

Some math is correct but the *data* underneath it isn't trustworthy
enough yet to publish a number.

| ID | Rule | Action |
|---|---|---|
| BS-020 | `trueEV` (true expected value) MUST NOT appear in any public surface unless an *independent* fair-probability source is wired and `activationState === 'activated'`. The Kelly-side and Poisson-side helpers in `packages/prediction-engine` are pure math — they may be tested and computed internally, but cannot be exposed. | block |
| BS-021 | `kellyStake` / `recommendStake` output MUST NOT appear in any rendered page, API response, or email. (This is the rule that reverted the v6 attempt; preserving it.) | block |
| BS-022 | The label "edge" on public surfaces refers to `marketDerivedEdge` (the existing engine), never `trueEV`. If both exist, public copy says "edge"; internal copy distinguishes. | warn |
| BS-023 | "Sharp money" / "smart money" framing requires a real sharp-money source. Until then: forbidden. | block |
| BS-024 | "Closing line value" / "CLV" surfacing requires a closing-line snapshot job and at least 200 settled picks of history. Until then: forbidden. | block |

---

## D. Calibration & performance claims — NEW

| ID | Rule | Action |
|---|---|---|
| BS-030 | `/performance` page MUST render the "collecting" empty state unless `evaluatePublicPerformancePolicy()` returns `ACTIVATED` *and* at least 200 settled picks exist in the current `modelVersion`. | block (runtime) |
| BS-031 | "Calibration" or "Brier score" can appear in copy but the *numbers* are gated. Until activation, show methodology, not metrics. | warn |
| BS-032 | Bucket accuracy claims ("our 70% confidence picks hit 70%") require: ≥30 settled picks in the bucket *and* a 95% CI rendered alongside. | block |
| BS-033 | Cherry-picked records (only winners, only last week) are not permitted. Any displayed record must be complete-history or explicitly windowed with the window labeled. | block |
| BS-034 | Drift warnings must surface in the operator dashboard but never on the public surface as a "bug" — they're an internal signal. | warn |
| BS-035 | Automatic weight adjustment is forbidden. All weight changes pass through `docs/calibration-proposals/` as a human-reviewed proposal. | block (config-level: `CALIBRATION_AUTO_APPLY=false` is the only allowed value in production env) |

---

## E. Secrets & supply chain

| ID | Rule | Action |
|---|---|---|
| BS-040 | `THE_ODDS_API_KEY`, `STRIPE_*`, `ANTHROPIC_API_KEY`, `DATABASE_URL` — never committed. `.env*` patterns in `.gitignore` enforced + `git-secrets` pre-commit hook required. | block |
| BS-041 | `.launch-secrets/` is local-only. Any reference to its content in code or docs is a violation. | block |
| BS-042 | New data sources MUST appear in `docs/data-source-options.md` with: cost, rate limit, ToS posture, integration cost. The audit log in `docs/rejected-data-sources.md` is the source of truth for what we WILL NOT integrate. Pirated/ToS-violating sources are permanently rejected (no re-evaluation). | block |
| BS-043 | LLM (Claude) output is never source-of-truth. The content-generation worker may use Claude to phrase a pick, but it may not invent a number, a player stat, or a line. Numbers in copy must come from the SourceSnapshot table. | block (AST scan on content-worker output) |

---

## F. Shadow-mode boundaries — NEW

Phase 2 introduces a "shadow mode" for new factor types. They run in
production, compute against real data, get stored — but never surface
publicly until promoted to `activated`.

| ID | Rule | Action |
|---|---|---|
| BS-050 | A factor in shadow mode MUST: write to the database, be visible in the operator dashboard, NOT appear in any `/api/picks/*` or `/picks` response, NOT influence the public `confidence` score. | block (runtime invariant) |
| BS-051 | The transition from `shadow → activated` requires: (a) ≥30 days of shadow data, (b) a calibration proposal in `docs/calibration-proposals/`, (c) a human approval recorded in the same proposal file. | block (config check on deploy) |
| BS-052 | A factor that fails calibration in shadow mode is moved to `archived`, not deleted, so historical audit is preserved. | warn |
| BS-053 | Shadow factors leak detection: a periodic test queries `/api/picks/daily-slate` as FREE and PRO tier, walks the response, and asserts no `activationState === 'shadow'` fields are present. Runs in CI on every PR. | block |

---

## Enforcement architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Source                                                     │
│  ├── apps/web/lib/brand-safety/banned-phrases.ts (A)        │
│  ├── apps/web/lib/brand-safety/factor-surface.ts (B, C, F)  │
│  ├── apps/web/lib/brand-safety/performance-policy.ts (D)    │
│  ├── packages/prediction-engine/src/guards/* (B, C)         │
│  └── .githooks/pre-commit (E)                               │
├─────────────────────────────────────────────────────────────┤
│  Tests                                                       │
│  ├── apps/web/__tests__/brand-safety.test.ts (A, B)         │
│  ├── apps/web/__tests__/performance-policy.test.ts (D)      │
│  ├── apps/web/__tests__/shadow-leak.test.ts (F)             │
│  └── packages/prediction-engine/__tests__/guards.test.ts    │
├─────────────────────────────────────────────────────────────┤
│  CI                                                          │
│  └── .github/workflows/brand-safety.yml — runs on every PR  │
├─────────────────────────────────────────────────────────────┤
│  Runtime                                                     │
│  └── Public route middleware calls                          │
│      assertNoShadowFactorsLeaked(response)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## How rules expire

A rule is removed (not relaxed) only when:

1. The underlying constraint genuinely ends (e.g., `BS-030` relaxes when
   calibration activation has shipped *and* the empty state would mislead).
2. The change is documented in `docs/calibration-proposals/` and approved.
3. The corresponding test is updated, not deleted, to assert the *new* invariant.

Rules are never silently disabled. The linter is the conscience.

---

## Codex implementation notes

When Codex extends the existing linter to cover the new rules:

- Reuse the existing scan harness in `apps/web/lib/brand-safety/`.
- Add unit tests in the same conventions Codex already established.
- For runtime invariants (BS-010, BS-011, BS-050, BS-053), wire through
  the existing middleware layer; do not add new global middleware.
- For AST scans (BS-014, BS-043), use the existing TypeScript compiler
  API setup if one exists; otherwise a simple regex pass is acceptable
  for v1, with an issue filed for AST upgrade.
- The new tests should bring total brand-safety coverage to ≥60 cases
  (v1 has ~20; this adds ~40).

---

## One-paragraph summary

The Evidence Engine introduces ten new ways to accidentally publish
something the data doesn't support. This document is the list of those
ten ways, plus the regex / runtime / config invariants that prevent
each one. The existing v1 linter already enforces the tout-language and
secret-leak rules; v2 adds shadow-mode, factor-trust, premature-math,
and calibration-gating rules. The goal is unchanged: every number we
publish has a sourced, dated, calibrated thing behind it, or it doesn't
ship.
