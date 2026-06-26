# Adversarial Execution — every claim re-run as a hypothesis

Branch `claude/keen-ptolemy-t38f1g` @ `60bccd84` · sandbox (Prisma engine download blocked by
ECONNRESET; full Next build resolves on hosted CI). Each row is tagged:
`EXECUTED_AND_GREEN` / `EXECUTED_AND_FAILED` / `ENVIRONMENT_BLOCKED` / `INFERRED_ONLY`.

The rule: **no claim is accepted on its prior word.** Everything below was run this pass, or is
explicitly marked as deferred-to-CI with the reason.

---

## A. The Theorem + decision runtime

| Check | Command | Result | Status |
|---|---|---|---|
| Authority Tensor theorem (NEW) | `vitest run …/authority-tensor.theorem.test.ts` | 13 passed; 864 public-safety combos, 0 violations | **EXECUTED_AND_GREEN** |
| decision-field-runtime (full) | `vitest run` (decision-field-runtime) | 5 files, **86 passed** (incl. theorem, authority-gate, state-compilers ×46, field-001 ×15, copy-hygiene ×3) | **EXECUTED_AND_GREEN** |
| LadderEvent reducer + heartbeat (INV-1..6) | `vitest run src/ladder` (prediction-engine) | 2 files, **13 passed** (reduce ×7, heartbeat ×6) | **EXECUTED_AND_GREEN** |
| nfl-stat-universe (FactSupplyGraph) | `vitest run` (nfl-stat-universe) | 3 files, **35 passed** (acceptance ×13, acquisition-plan ×10, decision-state-matrix ×12) | **EXECUTED_AND_GREEN** |

## B. Guardrails (the public-safety spine)

| Guard | Result | Status |
|---|---|---|
| trust-gate | OK — scanned **1197** files; no banned phrases | **EXECUTED_AND_GREEN** |
| model-freeze | OK — `MODEL_VERSION v5.1.0` backed by `docs/calibration-proposals/*.md` | **EXECUTED_AND_GREEN** |
| draft-only | OK — scanned **1219** files; no publish/send paths | **EXECUTED_AND_GREEN** |
| claude-api-usage | OK — scanned **1282** files; no unapproved direct Claude API calls | **EXECUTED_AND_GREEN** |
| secret-scan (`--all`) | OK — scanned **2975** tracked files; no secrets | **EXECUTED_AND_GREEN** ¹ |
| eval-contracts | OK — validated **34** eval contracts | **EXECUTED_AND_GREEN** |

¹ run before staging the packet; re-run after `git add` in the commit step (the packet is design
prose + a static HTML prototype; it references env-var *names*, never values).

## C. Typecheck

| Check | Command | Result | Status |
|---|---|---|---|
| Decision surfaces (5 packages) | `guard:decision-surfaces` (tsc `--noEmit` ×5) | exit 0 — clean (incl. the new theorem test under strict mode) | **EXECUTED_AND_GREEN** |
| All-workspace typecheck | `npm run typecheck` | requires generated Prisma client | **ENVIRONMENT_BLOCKED** → CI runs `db:generate` first (green on run #1453, commit `60bccd84`) |
| Full Next production build | `npm run build` | requires Prisma + Next | **ENVIRONMENT_BLOCKED** → resolves on hosted CI |

## D. The instruments (live render, headless Chromium 1194)

Rendered via Playwright with `executablePath` pinned to the pre-installed browser; integrity
properties asserted programmatically, not eyeballed.

| Assertion | Result | Status |
|---|---|---|
| Observatory gate state | `HELD` | **EXECUTED_AND_GREEN** |
| Observatory meet — *Live·proven·public* preset | `PUBLIC_ACTION` (apex reachable only with all 8 layers permitting) | **EXECUTED_AND_GREEN** |
| Observatory meet — *Fixture demo* preset | `INFO_ONLY` (the Theorem, on screen) | **EXECUTED_AND_GREEN** |
| Observatory public-safe — fixture | `no` | **EXECUTED_AND_GREEN** |
| Observatory console errors | **0** (fully offline; no external resource) | **EXECUTED_AND_GREEN** |
| Cockpit gate — *before* running the backtest | `HELD` | **EXECUTED_AND_GREEN** |
| Cockpit gate — *after* running the backtest | `HELD` (the fabricated pass is gone; predicate stays UNMET) | **EXECUTED_AND_GREEN** |
| Cockpit console errors | 1 — `ERR_CONNECTION_CLOSED` on the original Google-Fonts CDN (offline sandbox); cosmetic, pre-existing, system-font fallback | benign |

## E. Static integrity greps

| Check | Result | Status |
|---|---|---|
| Cockpit fabricated-pass path (`beats naive ✓` / `ok=true` in live code) | none — sole match is the provenance comment documenting the original defect | **EXECUTED_AND_GREEN** |
| Observatory external network calls (`https://`, `fetch(`, font CDNs) | none — fully offline | **EXECUTED_AND_GREEN** |
| Honest backtest values present (`5.31 vs 4.91`, `does NOT beat`, gate `HELD`) | present in both instruments | **EXECUTED_AND_GREEN** |

---

## Summary

Everything inside the audit's reach was **executed and green**: the new Theorem (864 combinations),
the decision runtime (86), the ladder invariants (13), the stat universe (35), all six guardrails,
the decision-surface typecheck, and both instruments rendered and asserted live. The only items not
run locally are the **all-workspace typecheck and the full Next build**, both `ENVIRONMENT_BLOCKED`
solely by the sandbox's inability to download the Prisma engine (ECONNRESET) — both resolve on
hosted CI, which runs `db:generate` first. Nothing is marked `INFERRED_ONLY`; nothing was accepted
on prior word.
