# Launch Accounting — everything reviewed, fixed, and set (or honestly pending)

Branch `claude/compassionate-ramanujan-qqt5nb` @ `abdaa9e0` · **334 commits ahead of `main`** ·
working tree clean. This is the single accounting of what is launch-ready in code vs. what
remains, after a full whole-repo verification sweep.

## 1. Verification — the whole repo is green (proven, not asserted)
- **Typecheck:** all **10** tsconfig projects clean (apps/web + 5 packages + 4 workers).
- **Tests:** **28,306 passing / 0 failing** — apps/web 27,434 · prediction-engine 664 ·
  data-ingestion 162 · ingestion-pipeline 46.
- **Guards:** trust-gate (1,310 files, no banned phrases) + model-freeze (v5.0.0) green.
- **Build:** `next build` OK. **Runtime:** server boots and serves real content
  (`/`, `/lab`, `/board`, `/pricing`, `/the-beat`, `/clv` → 200; `/cockpit` → 307 auth).
- The sweep caught + fixed **1** real issue (a missing docstring on `runSelfAudit`); fixed and pushed.

## 2. Shipped this session (all green, all on the branch)
| Area | What |
|---|---|
| Reconciliation | Final review of the 12 earlier slices + 48h accounting (no-vig doc fix) |
| Front door | The Signal Room — code-native live pipeline instrument on `/` |
| Settlement | Keyless free-data settlement fallback → grows the calibration sample 37→100 |
| Cockpit autonomy | Scheduled dispatch loop — tasks advance NEW→ROUTED→DRAFTED→NEEDS_REVIEW, park at the human gate |
| Cockpit voice | "Jarvis — brief me out loud" reads the live status aloud on `/cockpit/live` |
| Server voice | Keyless TTS voice pool + `/api/voice/speak` (pick summaries / alerts / content) |
| Docs | DEPLOY_TONIGHT runbook · Living Signal Room creative doctrine · this accounting |

## 3. Already built (verified present on this branch — not missing)
- **Jarvis voice:** browser TTS + STT (`jarvis-chat.tsx`) + the new speak-status + the new server TTS pool.
- **Multi-provider chatbot pool:** 11 providers (`registry.ts`) — keyless Pollinations default + 10 optional keyed-free; status renders on `/cockpit/live`.
- **Free APIs / data:** ESPN, CFB, NCAA, free-stats, free-settlement adapters (`lib/data-sources/*`).
- **Live cockpit:** `/cockpit/live` (hero, gauges, agent theater, signals, fleet, model pool), nav-registered as the first Command item.
- **Links/integrations surfaces:** `/integrations`, `/stack`.

## 4. Set for launch in CODE — remaining steps are OWNER-only (not code)
Live source of truth: `/cockpit/go-live`. Detail: `reports/go-live/DEPLOY_TONIGHT.md`.
1. **Deploy** this branch (334 ahead of `main`) — the one blocker; nothing here reaches the live URL until this happens.
2. **Env:** `DATABASE_URL`/`DIRECT_URL`, `NEXTAUTH_SECRET`/`NEXTAUTH_URL`, `REDIS_URL`; Stripe key + 3 price IDs (checkout).
3. **Calibration data:** `THE_ODDS_API_KEY` + `OUTCOME_LEARNING_ENABLED=true` + `FREE_DATA_PROVIDER_ENABLED=true` → the keyless settlement accrues the sample to 100.
4. **Analytics (optional):** one `NEXT_PUBLIC_*` provider var.

## 5. Stays closed by design (correct — not a gap)
- **Hard safety stops** `autoPublish` / `autoSend` / `automatedBetting` — always blocked; legal/member protection, never "features".
- **Calibration / 70% tier** — activates at 100 eligible settled picks (now ~37) via a deliberate MODEL_VERSION step; cannot be faked without destroying the proof.

## 6. Queued / external (NOT in this container)
- **"The Sentient Interface"** commit lives in a *different clone* (`/home/user/c9ac9df5-…`) — not reachable from this session, so it can't be fixed/merged here yet.
  - **Owner action:** push that branch to `origin`; then it can be fetched, fixed, gated, and cherry-picked.
  - **Review verdict:** cherry-pick the honest/performant pieces (brand enforcement, HealthRing, SignalStatePulse, VoiceWaveform, ObservatoryBeacon); **fix before merge** — cut autoplay audio, make the montage skippable + reduced-motion, lazy-load + reduced-motion-fallback the WebGL/DreamSequence/GlitchTruth, and gate GhostJarvis through real loaders + trust-gate (no fabrication); the 10 AI assets + 3 audio tracks are an owner spend/brand decision (`OWNER_VISUAL_SPEND_APPROVED`).
- **Fragmentation:** other branches/clones hold other work; this branch is the superset for the features in §2–§3. Consolidation = merge this → `main`, then layer the cherry-picked Sentient keepers.
