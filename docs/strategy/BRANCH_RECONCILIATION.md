# Branch Reconciliation — one page, no blind merge

**Status:** living plan. **Date:** 2026-06-22. **Author:** proven-edge session.

Branch fragmentation is now the #1 program risk: complementary work is spread across
five+ branches that will silently drift. This page names the trunk, what each branch
holds, and exactly how the pieces land — concept by concept, never a blind merge.

---

## 1. Production reality (read first)

- **`main` is the production deploy source** (Vercel `sports-web`). It currently sits
  at `d52b62a` ("#51 launch hardening").
- A separate session is running a **DB-credential rotation + build fix**: `main`'s
  cold-cache build fails because it predates a `postinstall: prisma generate` fix.
  That fix (and the de-paywall/"honest confidence" pivot) lives on
  **`claude/blissful-hamilton-d7edx1`**, being merged to `main` to restore prod.
- **Nothing in this reconciliation touches `main` or that firefight.** The moat work
  lands on `main` only via a deliberate, reviewed merge after prod is healthy.

---

## 2. Trunk decision

**Trunk for the moat = `research/proven-edge`.** Rationale: it is built on the
**real `packages/prediction-engine` + `apps/web/lib/performance` primitives that
actually ship in production** (CLV grading, calibration, devig, Merkle proof-of-record),
not on a parallel pure/typed layer. Everything else lands *on top of* it.

Eventual flow: `research/proven-edge` → (review) → `main`. The pivot branch reaches
`main` first (prod firefight); proven-edge rebases onto the post-firefight `main`
before its own merge.

---

## 3. Branch inventory & disposition

| Branch | Holds | Built on | Disposition |
|---|---|---|---|
| `main` | Production (`#51` hardening) | real stack | **Deploy target.** Receives merges after review. |
| `claude/blissful-hamilton-d7edx1` | De-paywall pivot, honest confidence, `postinstall: prisma generate` fix | real stack | **Merges to `main` first** (prod firefight). proven-edge rebases onto the result. |
| **`research/proven-edge`** (this) | CLV coverage invariant, settlement-health probe, tamper-evident pre-result receipt + Prisma model, segmented CLV, Wilson intervals, RESEARCH_MAP, PATH_TO_PROVEN_EDGE charter | **real prediction-engine** | **Trunk for the moat.** |
| `claude/laughing-wozniak-gyryjx` | OOS split harness + champion/challenger promoter (`oos-split.ts`, `model-promoter.ts`, 14 tests); the 6 cockpit "intelligence/fantasy" pages; DFS optimizer | real prediction-engine | **Cherry-pick the OOS promoter onto trunk** (it's the genuinely-missing piece and is built on the same primitives). Evaluate the cockpit/DFS pages separately. |
| `claude/happy-goodall-8lkxrb` | `apps/web/lib/gse/` decision-intelligence layer (~25 pure/typed, DB-free modules, 118 tests: trust-loop, drift, promotion-readiness, Black-Litterman, Glicko2, Dixon-Coles, etc.); the Revenue Activation Plan doc | **pure/typed, NOT wired to live data** | **Lands on top later** as the decision/UX/scoring-math layer — adapter by adapter onto the real pipeline, never a blind merge (see §5). |

---

## 4. Duplicate concepts — name the canonical one

Two branches independently built overlapping ideas. Canonical choice favors the
version wired to real data.

| Concept | `research/proven-edge` (real) | `happy-goodall` / `laughing-wozniak` | Canonical |
|---|---|---|---|
| **Pre-result receipt** | `prediction-engine/pick-proof-receipt.ts` (+ Merkle `proof-of-record.ts`, + Prisma model) | `lib/gse` `freezeReceipt` / `runTrustLoop` (pure, DB-free) | **proven-edge** (it persists + is built on the shipping Merkle primitive). Fold gse's trust-loop *verdict* fields in as added receipt content later. |
| **CLV** | `prediction-engine/clv.ts` + `clv-capture.ts` + `lib/performance/clv-*` (graded at settlement, coverage-measured, segmented) | `lib/gse` `gradeClv` (pure) | **proven-edge** (wired through settlement). |
| **Calibration** | `prediction-engine/probability-calibration.ts` (isotonic/Murphy/ECE) + `calibration-apply.ts` | `lib/gse` calibration scorers | **proven-edge** primitives; gse scorers may add display/segment views on top. |
| **Model promotion** | (none yet) | `laughing-wozniak` `model-promoter.ts` + `oos-split.ts`; `happy-goodall` `scoreModelPromotionReadiness` | **Cherry-pick `laughing-wozniak`'s promoter** as the base; reconcile gse's readiness scorer into its gate. |
| **Drift / coverage alarms** | `lib/performance/settlement-health.ts` (real) | `lib/gse` `scoreDriftRisk` / PSI (pure) | **proven-edge** for the live signal; gse PSI adds input-drift on top. |

Rule: **one receipt, one CLV, one calibration source of truth** — the wired one. The
`lib/gse` layer contributes *new* math (Black-Litterman blend, Glicko2, Dixon-Coles,
portfolio) and decision/UX surfaces, not second copies of what already ships.

---

## 5. How `lib/gse` lands (concept-by-concept, not a merge)

`lib/gse` is pure and DB-free *by necessity* — proven by unit tests but never wired.
It lands as **adapters onto the real pipeline**, one capability at a time, each gated
by: (a) it consumes real persisted data, (b) it doesn't duplicate a canonical concept
from §4, (c) green suite stays green, (d) no fabricated/illustrative value renders
publicly. Suggested order: new modeling math (Dixon-Coles soccer, Glicko2 ratings,
Black-Litterman blend) → drift/PSI on real inputs → promotion-readiness into the
promoter gate → decision/UX surfaces (Finder, injury cards) last.

---

## 6. Owner-gated vs agent-doable

- **Owner-only:** prod env/DB/Redis, Stripe live prices, **rotate leaked API keys**,
  the `main` merge decisions, brand/price ratification (done: GSE + `pricing-phases.ts`).
- **Agent-doable on trunk:** cherry-pick the OOS promoter; build the public proof
  experience; land `lib/gse` adapters per §5; scrub leaked keys *from the repo* (owner
  still rotates the live values).

---

*Keep this current as branches merge or retire. The discipline is: trunk is what
ships on real data; everything else earns its way onto trunk by wiring to reality.*
