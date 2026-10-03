# Twitter / X Autonomous Bot — Voice Specification

**Status:** Phase 3 build. Codex implements bot + scheduler + rate limiting + error handling. Claude owns voice, post templates, what gets posted vs muted, refusal rules.
**Account:** @GalaxySportsAI (per memory `sports-brand-galaxy-sports-edge`).
**Location:** `workers/twitter-bot/`, `apps/web/lib/twitter-bot/templates/`.
**Decision reference:** master plan Part 6 DEC-022 (Phase 1 first), radical #3 in Part 2.C.

---

## TL;DR

The model has its own Twitter account. It posts every operational cycle. **Free picks only** — paid picks stay behind the paywall. The bot is a content engine that funnels people back to galaxysportsedge.com.

No editorial voice. No takes. No reactions to outcomes beyond what the model itself thinks. The bot reports the model's state. It does not perform.

---

## What the bot posts

Four event types. Every post links back to a Galaxy surface.

### 1. Slate state updates

**Trigger:** Major scoring runs or gate decisions on tracked games. Rate-limited (see below).

**Format:**

```
Just gated [matchup] — [one-sentence reason from gateDecision.reason]

[edge_index or factor highlight]
[link to /room/[gameId]]
```

**Examples:**

```
Just gated MIA @ NYY — spread balanced at 51% consensus across 8 books.

Edge Index: 0.4 (below publish threshold).
https://galaxysportsedge.com/room/mia-nyy-2026-05-22
```

```
Just gated TOR @ BOS — depth too thin to publish. 2 of 14 books reporting.

Evidence health: D. Coverage flag.
https://galaxysportsedge.com/room/tor-bos-2026-05-22
```

**Voice rules:**
- Past tense: "Just gated" not "We just gated."
- One-line reason, lifted from `gateDecision.reason` enum mapped to friendly text.
- Always a metric line.
- Always a link.
- No commentary. No "interesting situation here" or "could go either way."

### 2. Free pick publications

**Trigger:** Every new free-tier pick (one a day per `Subscription.tier === 'FREE'` policy).

**Format:**

```
Published [pick] at [confidence]% confidence ([pickGrade]).

Factor breakdown: [link to /room/[gameId]]
```

**Examples:**

```
Published BOS -3.5 at 73% confidence (SOLID_PLAY).

Factor breakdown: https://galaxysportsedge.com/room/bos-2026-05-22
```

**Voice rules:**
- Verb: "Published."
- Number formatting: integer percent. Confidence below 60 does not publish (the engine gates first).
- Pick grade in parens, mapped from the `PICK_GRADE_LABELS` enum.
- "Factor breakdown" link, never "see the pick" or "tail this."

### 3. Free pick settlements

**Trigger:** A free-tier pick settles. One post per settlement.

**Format (WIN):**

```
Settled [pick] ✅ WIN — [biggest contributing signal] was the heaviest contributor.

Full snapshot: [link to /room/[gameId]]
```

**Format (LOSS):**

```
Settled [pick] ❌ LOSS — [biggest miss] [one-line cause].

Post-mortem: [link to /room/[gameId]]
```

**Examples:**

```
Settled CLE -7 ✅ WIN — schedule stress signal was the heaviest contributor.

Full snapshot: https://galaxysportsedge.com/room/cle-2026-05-22
```

```
Settled MIN +6 ❌ LOSS — rest advantage signal misread. MIN was more fatigued than projected.

Post-mortem: https://galaxysportsedge.com/room/min-2026-05-22
```

**Voice rules:**
- Past tense, "Settled."
- Outcome emoji: ✅ for WIN, ❌ for LOSS, ⚖️ for PUSH. These are the only emojis the bot uses.
- Biggest contributor / biggest miss comes from the factor that moved the score most relative to the others (Codex defines the computation).
- Losses get a one-line cause. Wins get the heaviest contributor. Pushes get a one-line note.
- No "tough one" or "we'll get 'em next time." No editorializing the outcome.

### 4. Free pick post-mortems (extended thread)

**Trigger:** Once per losing free pick, posted within 24 hours of settlement. Threaded — 4-6 posts.

**Format:**

```
Post 1: Settled [pick] ❌ LOSS. Here's what the model saw and what it missed.

Post 2: At publish, the heaviest signals were:
- [factor 1]: [score]
- [factor 2]: [score]
- [factor 3]: [score]

Post 3: What changed: [one specific event or signal that moved between publish and settlement].

Post 4: What we got wrong: [the factor that misread, in one sentence].

Post 5: What this updates: [whether this changes a factor weight for the next model version, or whether this is variance — be honest about which].

Post 6: Full breakdown + autopsy: [link to /room/[gameId]]
```

**Voice rules:**
- Numbered or implicit-numbered posts. The thread reads as a self-contained autopsy.
- "What we got wrong" is required when status is LOSS. It is NOT "what went wrong" — that phrasing implies external bad luck. We own the miss.
- "What this updates" honors the model-versioning ethic. Sometimes the answer is "this is variance, not a signal drift" — say that.
- No emoji ladders. The lead post gets the ❌. Other posts get none.

---

## What the bot does NOT post

Hard refusals, no override:

1. **Paid picks.** Never. Paid picks stay behind the paywall.
2. **Reactions to game-state events.** No "ouch" posts when a covered team blows a late lead. No celebratory posts on wins. The bot is not a fan account.
3. **Replies to user mentions.** Phase 3 build. Reply functionality comes in Phase 5+ if at all.
4. **Engagement bait.** No "Who do you have tonight?" No "Comment your locks below." No "RT if you're on this."
5. **Comparisons to other services.** Never name a competitor. Never claim "we hit 73% this month" or any win-rate-style claim.
6. **Outcome predictions about games not yet scored.** The bot does not say "I think MIA wins by 3." Either the model has published a pick (then the pick is the statement), or it hasn't (then nothing to post).
7. **Editorial sports commentary.** No injury news commentary, no player drama commentary, no league-rule debate. Off-mission.
8. **Anything during a model retraining or new-version rollout.** A `MUTE_BOT=true` env flag pauses all posts.

---

## Rate limiting

Codex implements. Recommended defaults:

- **Slate state updates:** Max 12 per day. Bot picks the highest-signal gates to surface (largest factor scores, biggest line moves, biggest evidence health drops). Configurable.
- **Pick publications:** No rate limit beyond "one free pick per day" upstream.
- **Pick settlements:** No rate limit — every settled free pick gets one post.
- **Post-mortems:** No rate limit — every losing free pick gets one thread within 24h.
- **Total daily ceiling:** 20 posts per 24-hour window. Bot refuses to post beyond this and queues overflow for the next day.

If the bot is rate-limited by X itself, it logs the failure to `AgentRunLog` and retries with exponential backoff up to 3 attempts. After 3 failures, mute for the day and surface to the cockpit.

---

## Scheduling

Codex picks the runner — GitHub Actions cron, BullMQ, or Vercel cron. Recommended: BullMQ since Redis is already in the tree, with a 5-minute heartbeat that checks for new events to post.

The bot reads from:

- `Pick` table for new free-tier publications.
- `Pick.settledAt` watcher for settlements.
- `IngestionRun` + `GameSignal` for gate-decision events.
- `LossAutopsy` (Phase 2+ schema) for post-mortem content.

Posts are constructed via the template module at `apps/web/lib/twitter-bot/templates/<event-kind>.ts`. Claude owns the template files. Codex owns the runtime.

---

## Compliance scanner integration

Every generated post runs through the platform-wide compliance scanner before posting. Hard refuse on:

- Any banned vocabulary from `docs/positioning.md`.
- Any unsupported claim (statistic without citation).
- Any "best book," "sharpest lines," "guaranteed cover" pattern.
- Any first-person algorithm voice.
- Any reference to a competitor product or service.

A red scan result halts the post, logs to `AgentRunLog`, and surfaces in the cockpit. Yellow scan results post with the warning logged but not blocking. Green scan posts immediately.

---

## Account hygiene

- Profile bio matches `docs/positioning.md`: *"We're not AI. We're math you can read. Most days, fewer than five picks. Some days, none. galaxysportsedge.com"*
- Profile pic and header are the brand assets from memory `sports-brand-galaxy-sports-edge`.
- No follows. The bot follows zero accounts. (Avoids signal/noise of who-it-follows being read as endorsement.)
- No likes. The bot likes zero posts. Same reason.
- No retweets. The bot retweets zero posts. Same reason.
- No quote-tweets except as a reply to a settled pick post, which is allowed for threading.

Account is a broadcast surface only. Phase 5+ may revisit interactivity.

---

## Eval coverage

Required evals at `docs/ops/evals/twitter-bot-*.md`:

- One eval per event kind (slate state, publication, settlement-win, settlement-loss, post-mortem-thread).
- One eval per banned-pattern: paid-pick-leak, competitor-mention, engagement-bait, outcome-prediction, first-person-voice.
- One eval per refusal: thin-evidence-event, no-canonical-signals, mute-flag-active.

Eval runner blocks deploy on red status.

---

## Acceptance criteria (Phase 3 bot v0 → green)

1. Bot posts every event kind with correct template.
2. Compliance scanner runs on every post before send.
3. Rate limits enforced.
4. `AgentRunLog` rows capture every attempt with success/failure metadata.
5. `MUTE_BOT=true` env flag halts all posts.
6. Account hygiene rules honored.
7. All eval files pass.
8. Posts contain working links to the correct `/room/[gameId]` URLs.
9. No paid pick leakage — every post is verifiably about a free-tier pick or operational state.

When all nine hold, bot v0 is live.

---

## Open items

- **OPEN-BOT-1:** Should the bot tag the sport in each post (e.g. "#NFL")? Default: yes, one hashtag, sport name only. No "#sportsbettingtwitter," "#degens," etc. Codex confirms.
- **OPEN-BOT-2:** Should slate-state updates include a screenshot/image of the factor breakdown? Default: no for v0, image generation is Phase 5+. Confirm.
- **OPEN-BOT-3:** What's the source-of-truth handle for cross-posting? Default: post to X (@GalaxySportsAI) only in v0. Threads/IG/FB sync is Phase 5+.

---

*Spec authored by Claude. Codex builds the bot. Voice rules locked. Refusal semantics non-negotiable.*
