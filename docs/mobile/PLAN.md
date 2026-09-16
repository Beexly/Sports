# PLAN OF ACTION — Galaxy Sports Edge iOS Application

**Program:** GSE Native (iOS-first) — Phase 6+ Item 3 from `docs/product/phase-6-plus-planning.md`
**Date opened:** 2026-09-15
**Executor:** Minis (autonomous agent, iSH/Alpine aarch64 on iOS)
**Owner:** Beexly (repo `Beexly/Sports`)

---

## 0. What already exists (reconnaissance findings — evidence, not assumption)

| Question | Finding | Evidence |
|---|---|---|
| Does an iOS app already exist in the repo? | **No.** Zero native/mobile app code. | `git ls-tree -r HEAD \| grep -iE 'ios\|expo\|react-native\|swift\|xcodeproj'` → no app artifacts; only `apps/web/public/site.webmanifest` (a PWA manifest) and a `MobileNav` web component. |
| Did prior agents plan it? | **Yes, twice — both as *planning only*, explicitly gated to the founder.** | `docs/product/phase-6-plus-planning.md` § Item 3 "Native mobile app" (Expo/React Native, iOS first); `docs/strategy/platform-gaps-triage.md` row 1 "Native mobile app (Expo) — weeks of work + a strategic platform bet → founder"; `docs/strategy/platform-gaps-triage-2.md` row 1 same. |
| Is there a prior agent workspace? | Yes, but **unrelated to the app** — `/var/minis/shared/gse-discovery/` (46 files) is the props/contextual-compounding research lab (L1/L2/L5 killed, L3 shelved). No mobile work. | Directory listing + `minis-props-lab-report-2026-09-15.md`. |
| What did the plans specify for the app? | Surefaces `/board`, `/picks`, `/calibration/me`, push alerts (Pro+), pre-show confidence prompt, Game Room, iOS Live Activities. Open decision `OPEN-P6-3`: reskin vs rebuild. Open decision: App Store policy framing. | phase-6-plus-planning.md Items 3 & 4. |
| What is the brand? | **Galaxy Sports Edge (GSE)** is the shipping brand; **Galaxy Sports Network (GSN)** is the strategy alias. "We're not AI. We're math you can read." | `apps/web/lib/brand.ts:16`, `docs/positioning.md`, `BRAND_AND_DESIGN_SYSTEM.md` naming note. |
| Design authority? | `apps/web/styles/design-tokens.css` is the declared **sole authority**. `DESIGN.md` front-matter and `design-system/` are **stale** (pre-FIELD palette). | BRAND_AND_DESIGN_SYSTEM.md §2 gap 1; tokens file comments ("Canonical values: FIELD (approved 2026-09-10)"). |
| Machine-readable API for a client? | Public JSON routes exist: `/api/board/state`, `/api/picks`, `/api/picks/[id]/explain`, `/api/calibration`, `/api/performance`, `/api/brief`, `/api/clv`, `/api/watchlist`, `/api/push/subscribe`. Versioned surface: `/api/gse/v1/*` (B2B, API-key). No mobile-specific surface. | route enumeration. |
| Auth model? | NextAuth v5 + Google OAuth, cookie sessions. **No bearer-token path for a native client.** Admin gate = `session.user.role === "ADMIN"`. | `apps/web/lib/auth.ts`, route handlers. |
| Environment capability | Node 22, npm works for small pure-JS packages; **RN package install fails** (npm rename-over-dir). Worked around by raw tarball extraction into `/opt/gstypes/node_modules`. **Typechecking against the real Expo SDK 57 / RN 0.86 / expo-router type surface works.** No Xcode → cannot compile or run a simulator here. | probe runs, this session. |

**Decision on `OPEN-P6-3` (reskin vs rebuild):** **Rebuild as a native client over the existing HTTP API.**
Rationale: the web app is Next.js 14 / React 18 with server components and Tailwind; shipping that inside a
WebView would violate the app's own doctrine (the design contract's motion/telemetry rules, 44px targets,
native haptics) and would not survive App Review as anything but a "repackaged website" (Guideline 4.2).
The *design language* is reskinned (tokens ported 1:1); the *implementation* is native. The server stays the
single source of truth — no business logic is duplicated client-side.

---

## 1. Non-negotiable constraints inherited from the repo

These are laws, not preferences. The app must not violate them.

1. **Rule 8 / positioning.** Never frame the engine as AI. Banned strings are machine-readable in
   `apps/web/lib/positioning-vocab.json`. The app ships its own copy of that list and a **runtime linter**.
2. **No frontend-only paywalls (CLAUDE.md rule 3).** The app must never gate content that the server already
   sent it. Tier display is presentational; enforcement is the server's. This inverts the usual mobile
   "unlock screen" pattern and is a deliberate architectural rule.
3. **Confidence is not a probability.** Per `AGENTS.md` (2026-09-13): `confidence` is a weighted factor sum,
   measured anti-predictive at the top band, and rendering it as a percent reads as a win probability.
   The app renders it as a **score out of 100**, labelled "Confidence", never `%`.
4. **Never render a row the engine withheld.** `independentEdge.decision === "PASS"` and negative
   `expectedClv` rows are suppressed at source (`adverse-edge-suppression.ts`). The client mirrors the
   predicate as a **defensive** second layer and never re-orders by `confidence`.
5. **Settlement badges are never colour-alone.** Monogram `W/L/P/V` per DESIGN.md.
6. **No casino green.** `--verify` mint only, for settlement outcome.
7. **Stale data never renders as fresh (rule 5).** Every data card carries a freshness stamp; a stale
   slate renders an honest "awaiting fresh data" state, not a cached board presented as live.
8. **No emoji. No tout language.** Enforced by the same linter as rule 1.
9. **Reduced motion honoured globally.** No animation on data values.
10. **44×44pt minimum touch target.**

---

## 2. App Store reality (this is the part most builds get wrong)

Research conducted and encoded into the app, not hand-waved:

| Issue | Guideline | Resolution in this build |
|---|---|---|
| Selling Pro/Elite *inside the app* unlocks digital content | **3.1.1 In-App Purchase** | The app ships a **StoreKit 2 subscription layer** as the primary path (via `expo-iap`-equivalent module surface). Stripe remains the web path. |
| US external purchase links | US injunction (2025) permit external link-outs | Encoded as a **region-gated** "manage on web" affordance, default-off outside the US, never auto-opening a checkout. |
| Third-party sign-in (Google) | **4.8 Sign in with Apple** | Apple sign-in is implemented as a first-class provider, not an afterthought. |
| Account deletion | **5.1.1(v)** | In-app delete-account flow with server contract. |
| Gambling adjacency | **5.3 / 1.4.3**, 17+ rating | No bet placement, no sportsbook deep links, no "bet now", no odds-to-cash path. Age gate at first launch. Rating declared **17+** with the Gambling content descriptor, justified in the review notes. |
| Tracking | **ATT** | The app does **no** cross-app tracking and therefore **does not** request ATT. Declared in `PrivacyInfo.xcprivacy`. |
| Privacy manifest | Required since 2024 | `PrivacyInfo.xcprivacy` with the exact required-reason API declarations for UserDefaults/FileTimestamp/DiskSpace. |
| Repackaged website | **4.2 Minimum functionality** | Native navigation, haptics, offline cache, Live Activity, push — substantively more than a wrapper. |

---

## 3. Build plan (phased, each phase closes to done before the next opens)

### P0 — Foundation
- `theme/` — FIELD tokens ported 1:1 from `design-tokens.css` (+ contrast metadata, confidence/risk ladders).
- `lib/voice.ts` — banned-phrase linter bound to the repo vocabulary file.
- tsconfig/babel/metro/app.json/eas.json — SDK 57, RN 0.86.3, React 19.2.3, New Architecture on.

### P1 — Data core
- `api/client.ts` — timeout, retry w/ jitter, 429 `Retry-After` respect, 503 gate-body surfacing, ETag/If-None-Match, abort.
- `api/contracts.ts` — hand-written response types mirroring the server's real shapes (from the route source).
- `api/endpoints.ts` — one function per endpoint, all typed.
- `lib/freshness.ts`, `lib/entitlements.ts`, `lib/calibration.ts`, `lib/format.ts` — pure, unit-tested.

### P2 — Offline + state
- `lib/cache.ts` (stale-while-revalidate, per-key TTL, honest staleness surfacing), `lib/queue.ts` (offline mutation queue), TanStack Query wiring.

### P3 — Design system (native)
- Primitives: `Surface`, `Eyebrow`, `Numeral`, `Card`, `Divider`, `Pill`, `Button`, `GhostButton`.
- Signature components: `PickCard`, `ConfidenceMeter`, `EdgeBar`, `FactorTrail`, `SettlementBadge`, `FreshnessStamp`, `TierBadge`, `SourceTierBadge`, `CalibrationCurve` (SVG), `DiscriminationPanel`, `RiskDisclosure`, `EmptyState`, `HonestGate`.

### P4 — Screens
Board · Picks · Pick detail (+evidence drawer) · Calibration · Calibration/me · Brief · Performance · Watchlist · Game Room · Settings · Onboarding/age-gate · Paywall · Responsible play · Account deletion.

### P5 — Platform integration
- Push (expo-notifications + server registration), Live Activity scaffold (expo-widgets), haptics, deep links, share, App Review prompt, background refresh.

### P6 — Server contract (PR-ready, in-repo)
- `POST /api/mobile/v1/auth/exchange`, `POST /api/mobile/v1/devices`, `GET /api/mobile/v1/bootstrap`, `GET /api/mobile/v1/me`, `POST /api/mobile/v1/account/delete`, plus a bearer-auth middleware that reuses `getUserEntitlements`.

### P7 — Store packaging
- `app.json`/`eas.json`/`store.config.json`, App Privacy answers, review notes, ASO copy, `PrivacyInfo.xcprivacy`, entitlements, export-compliance answer.

### P8 — Verification
- `tsc --noEmit` clean against the **real** SDK 57 type surface; pure-logic test suite run under Node; design-preview HTML harness rendered + screenshotted for visual verification.

### P9 — Review → improve → audit → polish
- Adversarial self-review, audit against doctrine + the 10 reference repos, then polish.

### P10 — Iterate
- Round 2: 10 more repositories; repeat P9–P10 until the marginal return goes to zero.

---

## 3b. Minis skills folded into this program

The Minis skill library is part of the toolchain for this build, not an aside. Explicit mapping:

| Skill | Use in this program | Status |
|---|---|---|
| `asc-cli` | **App Store Connect operations**: install the `linux_arm64` `asc` binary, stage the version, push metadata/localisations, TestFlight distribution, submit for review. Produces the exact owner-run command sequence. | Installed; awaiting the owner's `.p8` API key (cannot be created autonomously — Apple-account-bound). |
| `generative-ui-minis` | **Visual verification harness.** The app is React Native and this host has no simulator, so a generated HTML artifact renders the same tokens/components so screens can actually be *looked at* and iterated. Not a substitute for the app — a review instrument. | In use. |
| `nano-banana` | App icon / splash / marketing imagery generation. | **Blocked** — `GEMINI_API_KEY` unset. Fallback taken: the icon is drawn from the brand's own mark geometry (orbit + vector + core + ping) as SVG → PNG, which is more brand-true than a generated image anyway. |
| `pdf-converter` | Rendering App Review notes and the submission packet to PDF for the owner. | Queued. |
| `exa-search` / `web-search` | The reference-repository research rounds (P10) and App Store policy research. | In use. |
| `github-sync-helper` | Branch + PR mechanics for the in-repo server patch and any app-repo creation. Branch-and-PR by default, never direct-to-main. | Queued. |
| `self-improving-agent` | Closed-loop logging of every failure/correction in this build (`ERRORS.md` / `LEARNINGS.md`), which is also what feeds the polish pass. | In use. |
| `hyperframes-cli` | App Store **preview video** (30s, required for the listing's better-converting variant). | Queued (P7). |
| `skill-creator` | At programme close, package the repeatable parts of this build as a `gse-ios-release` skill so the next release is a one-command operation. | Queued (P10). |
| `apple-reminders` / `whenpeak` | Owner-facing review checkpoints. | Optional. |

---

## 3c. Workstream P11 — X (Twitter) community, distribution and revenue

**Requested by the owner, 2026-09-15.** Not a side quest: it is the distribution half of the same
product bet. Reconnaissance first, because the repo is further along here than expected.

### What already exists (evidence)

| Asset | Path | State |
|---|---|---|
| Voice spec — what the bot posts, refuses, and never says | `docs/product/twitter-bot-voice-spec.md` | Written, detailed, 8 hard refusals |
| Templates — 4 event kinds | `apps/web/lib/twitter-bot/templates/{pick-publication,settlement,slate-state-gated,post-mortem-thread}.ts` | Built |
| Planner — idempotency keys, blocked reasons, compliance gate | `apps/web/lib/bot-outbox/plan.ts` | Built |
| Adapters — DB record → template input | `apps/web/lib/bot-outbox/records.ts` | Built |
| Operator UI — review drafts before send | `apps/web/app/cockpit/bot-outbox/page.tsx` + preview route | Built |
| Eval cases — happy path, banned vocab, paid-pick refusal, loss | `docs/ops/evals/twitter-bot-*.md` | Written |
| **Transport — auth, rate limit, send, retry, log** | `workers/twitter-bot/` | **ABSENT — this is the gap** |
| **Community / engagement / partnership layer** | — | **ABSENT — the owner's actual ask** |

So the honest finding is: **GSE has a fully specified, compliance-gated, operator-reviewable X bot that
cannot post.** Everything up to the HTTP call exists. The workstream is therefore unusually well-defined.

### Two doctrine conflicts found during reconnaissance (both must be fixed, not worked around)

1. **The spec renders confidence as a percent.** Its example is *"Published BOS -3.5 at 73% confidence"*.
   That spec predates the 2026-09-13 finding (`AGENTS.md`) that `confidence` is a weighted factor sum
   whose top band claims 0.8663 and realizes 0.5191 (z = −10.7). A percent on a public post asserts a
   win probability the number demonstrably is not — on the surface with the widest reach. The template
   must render `72/100` and say "score", never "%".
2. **The spec permits ✅/❌/⚖️.** `DESIGN.md` says settlement badges are monograms W/L/P/V and that
   "emoji ≈ zero". These cannot both be right. Resolution: the *settlement glyph* is a documented
   exception on X (where a monogram is invisible at timeline scale and where the platform's own
   convention carries meaning), but it may only appear on the settlement lead post and nowhere else.
   Every other post uses the sanctioned data glyphs. This gets written down and tested.

### P11 deliverables

| # | Deliverable | Why it is the right shape |
|---|---|---|
| 1 | `x-transport/` — OAuth 1.0a signer, API v2 client, rate limiter, idempotent sender, `MUTE_BOT` honouring, structured attempt log | The missing piece. Pure logic, unit-testable here (HMAC-SHA1 signing is deterministic). |
| 2 | Template corrections + tests for the two doctrine conflicts above | The templates are the voice; leaving them stale would ship the error. |
| 3 | `docs/product/x-community-strategy.md` — the community/engagement lane | The owner's ask. Growth mechanics that survive the no-engagement-bait rule. |
| 4 | Revenue/partnership framework — and an honest read on what is founder-gated | `docs/strategy/platform-gaps-triage.md` gates the affiliate/creator model on the founder. Say so. |
| 5 | Research lane — X as a *signal* source, wired through the existing `decision-genome/rumor-quarantine.ts` | X is a fast news surface. It is also a rumour surface. The repo already has the quarantine primitive; the lane must use it or not exist. |
| 6 | Eval files for the new surfaces, matching the spec's own required set | The spec names the evals; they should exist. |

**Sequencing:** P11 runs after the P8/P9 verification and audit of the app, so the app is closed out
before a second workstream opens. It is recorded here now so it is not lost.

---

## 3d. Cycle 1 status (2026-09-15) and the cycle 2 queue

### Closed this cycle

P0–P8 executed. Verification: **8/8 linter self-test · 41 files lint-clean · 105/105 logic tests ·
18/18 OAuth tests (including the RFC 5849 vector) · full typecheck clean across all 42 files
against the real Expo SDK 57 type surface (twice consecutively).**

| Phase | State | Evidence |
|---|---|---|
| P0 Foundation | Done | Tokens ported from the sole-authority file; voice linter bound to the repo vocabulary |
| P1 Data core | Done | 27 client tests incl. gate bodies, 429 `Retry-After`, no silent cache |
| P2 Offline + state | Done | Labelled cache; `fromCache` never dressed as fresh |
| P3 Design system | Done | Primitives + 8 signature components |
| P4 Screens | Done | 13 routes incl. age gate, paywall, account deletion, responsible play |
| P5 Platform integration | Partial | Push + notification routing done; Live Activity declared, target not written |
| P6 Server contract | Done | 4 routes + bearer auth, PR-ready |
| P7 Store packaging | Done | `docs/store/SUBMISSION.md`, complete |
| P8 Verification | Done | Full typecheck clean (42 files); see the audit §2 for why it must still be re-run rather than trusted |
| P9 Review/audit | Done | 13 defects found and fixed; 8 upstream findings |
| P10 Research round 1 | Done | 10 repositories, each tied to a decision it changed |
| P11 X community | Started | Strategy + verified OAuth signer; sender not written |

### Cycle 2 queue, in priority order

1. **Build and run on a Mac** — `npx expo start --ios`, then `tsc --noEmit`. Nothing else is
   meaningful until the app has actually launched. Expect a handful of the class in audit §4
   F7/F8.
2. **Component tests** — `@testing-library/react-native` over the four states that matter most:
   stale gate, bootstrap gate, redacted confidence, emptied board.
3. **X sender** — the signer is verified; what remains is the sender, the idempotency ledger, the
   scheduler wiring, and the two template-doctrine fixes.
4. **Wire `auth/exchange`** into the web sign-in callback (one line) and apply the Prisma
   migration.
5. **Live Activity target**, via `expo-apple-targets`.
6. **Research round 2** — StoreKit 2 state machines, offline sync conflict resolution,
   accessibility-first charting, privacy-preserving analytics, E2E on a simulator.

### The definition-of-done clause that is not met, and cannot be met here

> "It has been rendered and looked at."

The app has never been rendered. The **harness** has — `preview/screens.html`, six frames, reviewed
and fixed three times — and that is a mirror, not the app. This clause stays open until the first
simulator run, and it is written here rather than quietly dropped because it is the difference
between a design that has been seen and one that has only been described.

---

## 4. Definition of done for the whole program

A section is closed only when all of the following are true:
1. It typechecks.
2. Its pure logic has a passing test.
3. It has no banned vocabulary, no emoji, no casino green, no colour-alone signal.
4. It carries a freshness stamp if it shows data.
5. It has an honest empty/error/stale state.
6. It has been rendered and looked at.
7. It is listed in the audit ledger with an explicit remaining-gap note (or "none").
