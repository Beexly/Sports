# Galaxy NFL House — Community & Voice Doctrine (2026-06-12)

Owner directive distilled. Sits beside `GALAXY_2026_PUBLIC_WORLD.md` (which
still governs the visual/world layer) and `docs/positioning.md`. Where the
original research (drafted externally) conflicts with platform law, this doc
records the correction — the law wins.

## Thesis

> Galaxy is not a pick site. Galaxy is a football room.
> "Understand the game. Read the market. Find your people."

People come for NFL clarity; they stay because they feel less alone, less
confused, and more connected to the game. The human layer is the translation
layer between probability and trust — not decoration.

**NFL is the flagship.** Perfect the room, language, model standard, and
weekly ritual on NFL first; expand only after the identity holds.

## What already exists (do NOT rebuild — deepen)

The external research proposed ten modules. Seven are live under Galaxy names:

| Proposed | Lives at | Status |
|---|---|---|
| Parlay MRI Lab | `/parlay-mri` + `components/parlay/parlay-genome` | live — deepen with submit-a-parlay flow |
| Hall of Misses | `/performance/losses` (Decision Autopsy) | live — this IS the accountability room |
| Calibration Panel | `/performance` + `components/performance/calibration-panel` | live, world-grade |
| CLV Tracker | `/track` (Elite) | live |
| No-Bet Gate | board gating + home chapter | live, first-class output |
| Market Disagreement | `consensus.ts` + `consensus-view.ts` | core shipped |
| Film Room (education) | `/academy` + Film Room key art | live — extend with coverage/EPA curriculum |
| Signal Card / Driver Stack | pick factor trail + evidence audit drawer | live |
| Simulation Cloud | partial (`poisson`, sim priors layer) | build target |
| Human Explainer (3 registers) | pick explainer (one register) | build target — reader modes |

Voice enforcement already exists in code: `lib/trust-claims.ts` bans
"lock"/"free money"/"guaranteed"; brand-voice tests scan public copy; the
Model Journal voice is decision-log-locked. The new analyst-voice standard is
codified in `apps/web/lib/voice/analyst-standard.ts` and injected into the
pick-explainer prompt (pinned by `__tests__/analyst-voice.test.ts`).

## The rooms — staged honestly

The rooms are emotional doorways into the same intelligence, not separate
products. **Same data. Different emotional interface.**

| Room | What it maps to | Stage |
|---|---|---|
| The War Room | Board + Observatory + consensus + No-Bet | live surfaces; needs the room *framing* |
| The Film Room | Academy curriculum (EPA, pressure, coverage, protection) | extend content |
| Fantasy 101 | Fantasy tools + plain-language explainers | extend with beginner register |
| Parlay MRI Lab | `/parlay-mri` | add user-submitted parlay analysis |
| Hall of Misses | `/performance/losses` | rename/frame; already public |
| The Sunday Couch / Brotherhood Table / No-Shame Room | live community (UGC) | **Stage 2 — gated** (see below) |

### Stage 1 — buildable now (no UGC infrastructure)

1. **Fan-type profiles** ("doorways"): user picks an identity — sharp bettor,
   film nerd, fantasy beginner, Sunday-only, learning football, here for the
   vibes — stored on the user profile.
2. **Reader modes**: every explanation renders in up to three registers —
   *teach me* (beginner), *plain read* (default), *show me the math*
   (analyst). Driven by fan type, toggleable anywhere. This is the highest
   leverage single feature in the whole directive.
3. **Weekly NFL ritual** as content cadence (below).
4. **Doorway homepage framing**: belonging + intelligence before odds —
   within the existing chapter architecture, not replacing it.

### Stage 2 — gated until prerequisites exist

Live rooms (Sunday Couch, Brotherhood Table, No-Shame Room) are real-time
UGC. Per `platform-gaps-triage.md` these are founder-scoped; the founder has
now scoped them IN, but they ship only behind:

- moderation policy + tooling (no harassment, protect beginners, no shame
  for sitting out) — written before the first message is ever posted;
- responsible-play integration (no chasing-losses dynamics; behavior signals
  trigger nudges, never upsells — standing law);
- privacy review for profiles and presence.

The culture line, everywhere: **"We do not force action. We protect decision
quality."**

## The weekly NFL ritual

The room is alive because the week has a shape. Content automation targets:

| Day | Beat |
|---|---|
| Mon | What We Learned |
| Tue | Injury Watch · Accountability Report (autopsies land here) |
| Wed | Opening Market Read |
| Thu | First Edge Board |
| Fri | The Human Read (Model Journal already drafts Sat — keep) |
| Sat | Fantasy Help + Parlay MRI |
| Sun | Live Room / The Beat game-day surface |
| Mon night | Final Slate Closeout |

## The analyst standard (now code)

Every output answers five questions (see `ANALYST_FIVE_QUESTIONS`):
signal → strength → what the market knows → what breaks the read → what
decision changes. No-Bet is intelligence, not absence.

Pipeline law (already platform law, restated): probabilities are calibrated
before EV; parlays carry correlation math; every output carries timestamp +
freshness; every pick carries "what could break this"; published results
feed calibration/CLV/drift. **Calibration beats accuracy** — the question is
never "did we guess the winner," it is "was the probability better than the
price."

## Corrections to the external research (law wins)

1. **"Perfectly on point" → calibrated.** Perfection is not the standard;
   auditable calibration is. Uncertainty stays visible.
2. **No stake/bankroll advice on public surfaces.** The research asks for
   "stake/risk guidance" on every pick. Staking tools stay gated (`/track`,
   Elite) and educational; the pick explainer remains advice-free. Required
   legal/responsible-play language is never weakened.
3. **"AI" never appears on public surfaces** (owner doctrine 10.5). The
   research's "never sound like generic AI" is enforced positively: the desk
   register, via `analyst-standard.ts`.
4. **No new dependencies for visual work**; immersive visual systems build
   on the existing three.js/canvas stack and world grammar.
5. **Demographic doors are tone registers, not segregated products** — and
   never targeting language in copy. The single dad and the beginner get
   doorways, not labels pinned on them in public.

## Next build order (after current polish queue)

1. Reader modes (three registers) on pick explainer + Academy content.
2. Fan-type profile field + doorway selector (privacy-reviewed).
3. Parlay MRI: user-submitted parlay analysis (input → correlation read).
4. Simulation cloud on game pages (distribution, not fake certainty).
5. Stage-2 rooms: moderation policy doc first, then infra.
