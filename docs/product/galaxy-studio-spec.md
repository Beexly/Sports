# Galaxy Studio — v0 Specification

**Status:** Phase 3 product line. Ships AFTER Phase 1 homepage reposition + Phase 2 Intelligence Graph v0.
**Owner of code:** Codex.
**Owner of templates + voice:** Claude.
**Location:** `apps/web/app/cockpit/studio/`, `apps/web/lib/studio/`.
**Decision reference:** master plan Part 6 DEC-014, DEC-018, DEC-020.

---

## TL;DR

Galaxy Studio turns one unit of intelligence (one game or one slate) into multiple monetizable assets in a single workflow. No auto-posting. Every output is human-reviewed before publish. Every claim links to local evidence. Compliance scan blocks publish on unsupported claims.

Powered by the Claude API on top of the Intelligence Graph. No second LLM vendor (DEC-020).

---

## What it produces

For one game or one slate, the Studio generates:

1. **Fan explainer** — plain-English game preview, no betting language.
2. **Fantasy angle** — DFS / season-long lens on the same game.
3. **Betting education angle** — explains what the line means, why it moved, how the model reads it. Never a "take." Never a recommendation.
4. **X/Twitter thread** — 5–7 posts with citations.
5. **TikTok / Reels script** — 45–90 second script.
6. **Newsletter block** — drop-in for Substack / Beehiiv / Ghost.
7. **Sponsor-safe blurb** — compliant for sportsbook-sponsored newsletter slots.
8. **YouTube title + thumbnail ideas** — list of options for the creator to pick from.

Every asset:

- Carries citations linked to the underlying `PickSignalSnapshot` or `GameSignal` rows.
- Runs through the compliance scanner before render.
- Has an "Approved for public" indicator (red / yellow / green) the human reviewer sees before publish.

---

## Audience

Creators who would otherwise spend 90 minutes writing one game preview, one newsletter block, one Twitter thread, and one TikTok script. Studio collapses that to 10 minutes plus review.

Specifically:

- Sports newsletter writers.
- Solo podcasters and YouTubers covering sports betting.
- Fantasy DFS content shops.
- Compliant sportsbook affiliate content writers.

NOT for:

- Touts.
- Anyone producing "must profit" or guarantee-style content.
- Auto-posting agents (Studio refuses to expose an auto-post endpoint).

---

## Workflow

1. Creator selects a game or slate in the Studio UI.
2. Studio fetches the `GameIntelligenceNode` (or `SlateWeather`) from the Intelligence Graph.
3. Creator picks which asset templates to generate. Each template is independent.
4. Studio composes Claude API prompts with the node data plus the template's voice/structure rules.
5. Claude API returns the asset body. Studio attaches citations from the node.
6. Compliance scanner runs against the body. Flags anything unsupported.
7. Creator reviews. If green, they copy/export. If yellow, they review the flags. If red, the asset is non-publishable as-is.
8. **No auto-posting.** The Studio surface explicitly does not have a "Send to Twitter" button. The creator has to copy and post manually.

---

## Templates

Each template lives at `apps/web/lib/studio/templates/<template-name>.ts`. Claude owns the template files. Codex owns the runtime that consumes them.

Template structure:

```ts
type StudioTemplate = {
  kind: CreatorAssetKind;
  promptBuilder: (node: GameIntelligenceNode, context: GenerationContext) => ClaudePrompt;
  outputValidator: (output: string) => ValidationResult;
  citationExtractor: (output: string, node: GameIntelligenceNode) => CitationRef[];
  complianceRules: ComplianceRule[];  // template-specific rules on top of platform-wide rules
  voiceTone: VoiceTone;
};
```

Phase 3 ships the eight templates listed above. Each template file is a standalone export.

---

## Voice and tone rules per template

These are non-negotiable. Compliance scanner enforces them.

### Fan explainer

- Plain-English game preview.
- No betting language. No spread, line, total, edge, or pick reference.
- Treats the game as a sporting event.
- 250–400 words.
- Tone: informed sports column. Not breathless.

### Fantasy angle

- Focuses on player props, DFS implications, season-long fantasy notes.
- May reference market movement on player props if data exists.
- No betting recommendation. No "play this prop" or "fade this player."
- 200–350 words.

### Betting education angle

- Explains what the line means, why it moved, how the model reads it.
- Never a recommendation. Never "take this side."
- Cites the factor breakdown.
- Always closes with: *"Whether to bet this is your call. What it teaches you about the market is the point."*
- 300–500 words.

### X/Twitter thread

- 5–7 posts. First post hooks. Last post drives to the source (with citation).
- Mono-spaced numbers in citations (e.g. "Source: PickSignalSnapshot #abc123").
- No emoji ladders. No "🚨" prefix. No "BREAKING."
- No threadbait questions.
- Bridge each post with concrete data, not "but here's the kicker."

### TikTok / Reels script

- 45–90 seconds when read at normal pace.
- Three beats: hook (5 sec), explanation with data (30–60 sec), close (5–10 sec).
- Close includes a verbal citation: "Source: galaxy sports edge dot com slash room slash [gameId]."
- No "you won't believe this" hooks. No "here's the secret."

### Newsletter block

- 400–700 words.
- H2 → paragraph → optional pull-quote → paragraph → close.
- Drops cleanly into Substack / Beehiiv / Ghost.
- Includes one inline link to a Galaxy surface (the relevant Game Room).

### Sponsor-safe blurb

- 100–200 words.
- Designed to live next to a sportsbook ad without conflicting with the operator's claims.
- No competitive claims about the sportsbook. No "best book." No "sharpest lines."
- The compliance scanner has an extra-strict pass for sponsor-safe content.

### YouTube title + thumbnail ideas

- List of 8–12 title options, ranked by length appropriateness.
- 3–5 thumbnail concepts described in one line each.
- No clickbait patterns ("YOU WON'T BELIEVE," "I CAN'T BELIEVE," ALL CAPS NUMBERS).
- Conforms to the platform-wide banned vocabulary list.

---

## Compliance scanner

Runs after every generation. Three pass-fail layers:

### Layer 1 — Platform-wide bans

Cross-checks every output against the `docs/positioning.md` banned vocabulary list. Hard fail on any match.

### Layer 2 — Unsupported claims

Every assertion in the output must trace to a citation. If the output says *"BOS has won 7 of their last 8 at home,"* a citation must back it. The scanner flags claims without citations.

Implementation: regex-tagged claim patterns (e.g. statistics, win streaks, performance percentages) trigger a citation requirement check.

### Layer 3 — Template-specific rules

Each template ships its own compliance rules. The sponsor-safe blurb template forbids competitive claims about sportsbooks. The betting education template forbids recommendation language. Etc.

### Output

The scanner returns:

```ts
type ComplianceScanResult = {
  status: 'green' | 'yellow' | 'red';
  flags: ComplianceFlag[];
  publicReady: boolean;
};

type ComplianceFlag = {
  layer: 1 | 2 | 3;
  severity: 'block' | 'warn' | 'info';
  span: { start: number; end: number };
  message: string;
  suggestion: string | null;
};
```

`publicReady` is true only when status is green. Yellow status surfaces flags to the human reviewer but does not block publish — the reviewer makes the call. Red status hides the export buttons until the asset is regenerated or manually edited to clear the flags.

---

## What Studio refuses to do

Hard refusals, no override:

1. **Auto-post.** No endpoint exposes a publish-to-platform action.
2. **Generate without citations.** Every output must have at least one citation. If the input game has no `PickSignalSnapshot` or `GameSignal` data, Studio refuses with "Evidence is thin — no asset generated."
3. **Generate against a bootstrap-only game.** Until at least one canonical signal is on the game, Studio refuses.
4. **Generate recommendations.** Even when the input game has a published pick, Studio's betting education template explains the math; it does not recommend the bet.
5. **Generate against a gated game without flagging the gate.** If `gateDecision.outcome === 'GATED'`, the generated asset opens with "We considered this game and did not publish — here's why" rather than treating it as a published pick.

---

## Eval coverage

Every template has at least:

- One eval at `docs/ops/evals/studio-<template>-happy.md` for a typical input.
- One eval at `docs/ops/evals/studio-<template>-thin-evidence.md` confirming refusal.
- One eval at `docs/ops/evals/studio-<template>-banned-term.md` confirming the compliance scanner catches a planted banned term.

Claude writes the eval files. Codex builds the runner. Eval runner blocks PR merge on red status.

---

## UI shape (Codex's call)

Studio lives at `/cockpit/studio`. Suggested layout, Codex confirms:

- Left rail: game/slate selector.
- Center: template grid (one card per template).
- Right rail: generation history, citations, compliance flags.
- Bottom: export panel (copy to clipboard, download as markdown, future: Slack/Gmail/Canva integrations).

No public route. Studio is operator-only.

---

## Integration roadmap (post v0)

These are deferred. Phase 4+.

- **Canva integration** — push generated graphic concepts as Canva designs.
- **HyperFrames or similar** — push generated TikTok scripts as video drafts.
- **Slack draft routing** — send a draft to a Slack channel for team review.
- **Gmail draft routing** — send a newsletter block as a Gmail draft.
- **Beehiiv API** — push newsletter blocks as draft posts.

Each integration is its own ticket once Studio v0 is live.

---

## Open items

- **OPEN-STUDIO-1:** Should Studio support batch generation across all eight templates for one game in a single click? Default: yes. Codex confirms.
- **OPEN-STUDIO-2:** Should generated assets persist as `CreatorAsset` rows for audit trail, or be ephemeral? Default: persist, with a TTL of 90 days. Codex confirms during schema design.
- **OPEN-STUDIO-3:** Should the compliance scanner be re-runnable on user-edited content (post-generation edit by the creator)? Default: yes, with a "re-scan" button. Codex confirms.

---

## Acceptance criteria (Phase 3 Studio v0 → green)

1. `/cockpit/studio` route live, operator-only.
2. Eight templates implemented and shipped.
3. Compliance scanner runs against every output.
4. No auto-post endpoint exists.
5. Every template's three evals pass.
6. Generated assets carry citations.
7. Thin-evidence games are refused with the expected message.
8. Gated games carry the gate flag in generated content.
9. Banned-vocabulary scan against generated content returns zero hits across a 50-game sample.

When all nine hold, Studio v0 is green.

---

*Spec authored by Claude. Codex implements. Voice rules locked. Refusals are non-negotiable.*
