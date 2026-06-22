# GSE 2026 — Red-Team Review (Workstream N)

Adversarial review of everything produced this sprint. The goal is to cut weak ideas, flag overreach,
and tell the next agent the truth about what is real vs aspirational.

## What is real vs what is conceptual

**Real and verified (shipped this sprint):**
- 12 typed contract modules under `apps/web/lib/gse/*` — they compile under `strict` +
  `noUncheckedIndexedAccess` (full app `tsc --noEmit` exits 0), pass ESLint `--max-warnings=0`, and
  are exercised by 51 passing unit tests.
- 10 internal cockpit pages that render the contracts. They are admin-gated by the existing layout,
  DB-free (safe in stub mode), and pass every cockpit invariant test (nav coverage, routes, stub
  safety, link usage).
- The scorers are executable pure functions with deterministic outputs.

**Conceptual (docs describe intent, not shipped runtime):**
- The narrative docs (`GSE_2026_*`) describe modes, agents, and flows that mostly do **not** have
  live runtime behind them yet. The contracts are the shape; the wiring to live data, settled
  outcomes, observed agent runs, and real funnel data is future work.
- "Jarvis modes," "agent council," and "memory policies" are contracts/policies, not deployed agents.
  The existing repo already has partial implementations (`lib/jarvis`, `lib/agents`, `lib/memory`)
  that these formalize — reconciliation is required before claiming any of it is live.

## What is overbuilt / should be cut from V1

- **23 agents and 53 ontology entities** are more than V1 needs. Cut the ontology to the ~15 entities
  that have a live Prisma model today; treat the rest as a target. Stand up ~5 agents first
  (Data Reliability, Source Rights, Evidence/Red-Team, Calibration, Jarvis Orchestrator) — the rest
  are scaffolding until there is data to feed them.
- **The full 20-score battery** is comprehensive but not all are equally urgent. The high-leverage
  five for V1: Data Quality, Public Claim Safety, Source-Rights Risk, Recommendation Confidence,
  Launch Readiness. The behavioural/UX scores (Cognitive Load, User Bias Risk) need real user data to
  be more than illustrative — keep them internal until then.
- **Some cockpit pages are read-only browsers.** That is intentional (low risk) but means they are
  documentation-as-UI, not operational tools yet. Do not oversell them.

## Highest trust / safety risks

1. **"Passes the scanner" ≠ "safe."** `scorePublicClaimSafety` catches banned tokens and soft
   certainty, but tone-level overconfidence still needs human review. Do not let it become an excuse
   to ship copy unread.
2. **Risk-oriented scores with the wrong palette.** A high `decision_fragility` or `source_rights_risk`
   is *bad*. The cockpit `ScoreBadge` flips the palette via `riskOriented`, but any future surface that
   renders these must pass that flag or it will green-light danger. (Audit item.)
3. **Illustrative numbers leaking as real.** Every worked number in the cockpit pages and the Product
   OS doc is computed from example inputs and labeled illustrative/modeled. If these are ever screenshot
   for marketing, they must not be presented as live metrics. The pages label this; stay disciplined.
4. **Calibration publishing.** `scoreCalibrationHealth` hard-caps below 100 settled outcomes, matching
   the existing `PERFORMANCE_STATS_ENABLED` gate. Do not bypass either.

## Source-rights / privacy risks

- The claim-safety module only ever down-ranks or hard-stops; it adds **no** evasion capability. Keep
  it that way — no contract here should ever *unlock* a source.
- Memory policy marks consent as a hard gate and forbids storing protected/inferred attributes. The
  risk is implementation drift: when the real memory store is wired, the policy must be enforced at
  write time, not just documented here.

## Data-assumption weaknesses

- **Free-tier drift (flagged during research):** `lib/pricing/value-architecture.ts` reportedly
  describes Free as "two free picks a day with confidence scores," while CLAUDE.md / the pricing
  ladder say "1 pick/day, no confidence scores." The docs followed CLAUDE.md. **This is a real
  inconsistency in the codebase that predates this sprint** — reconcile it in the pricing/entitlements
  modules deliberately, not by guessing.
- `scoreEvidenceStrength`'s independence flag is only as good as the upstream tagging of whether two
  pieces of evidence are correlated. If everything is tagged `independent: true`, the echo-chamber
  discount does nothing. The hard part is detecting correlation, which is not solved here.

## What could overwhelm users

- The cognitive-load doctrine is sound, but the product already has 200+ routes. Adding more surfaces
  (even good ones) fights the doctrine. The Decision OS cockpit pages are *internal*, so they do not
  add public load — keep them internal.

## What should stay internal

- The entire `/cockpit/*` Decision OS surface, all scoring internals, the agent council, the revenue
  intelligence, and the product OS. These are operator tools. Nothing here should appear on a public
  page without passing the claim-safety gate and a human review.

## What should be built first (next sprint)

1. Wire `scoreDataQuality` + `scoreSourceRightsRisk` into the real ingestion path (highest leverage,
   lowest risk — they only ever add safety).
2. Reconcile the Free-tier drift in pricing/entitlements.
3. Stand up the 5 core agents against real `AgentRun`/`AgentVerdict` records.
4. Add the Page Intelligence CI check (new public/dashboard page ⇒ must register a `PageContract`).

## Most defensible moat

Not any single tool — competitors can copy a DFS optimizer. The moat is the **connected decision
graph + trust receipts + calibration**: the discipline of showing the counter-case, freezing claims
before the result, and grading the process. That compounds with use (memory) and is hard to fake
because it requires being honest when you are wrong. `scoreMoat` rates this highly *only* because of
the compounding-memory and trust-advantage terms — strip those and it is a head start, not a moat.
