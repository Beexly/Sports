# Claude Handoff Queue

This file is for work that benefits from Claude running side by side: copy sharpening, assumption challenges, customer-language synthesis, and strategic critique.

## Ready for Claude

### 1. Vault Landing Page Copy Critique - Integrated

Input:

- [copy/vault-landing-page.md](copy/vault-landing-page.md)

Ask:

- Tighten language without making Galaxy sound like a tout.
- Preserve the deterministic-model stance while respecting `galaxy-ai-policy.md`.
- Flag claims that feel legally or reputationally risky.
- Suggest 3 alternate hero sections.

Status: answered by Claude audit and folded into canonical copy.

### 2. Vault Interview Pattern Synthesis

Input:

- Completed [templates/vault-interview-tracker.csv](templates/vault-interview-tracker.csv)
- Call notes

Ask:

- Identify repeated objections.
- Extract exact customer language.
- Recommend whether $200, $150, or Elite perk is the right move.
- Separate enthusiasm from buying intent.

Status: blocked until interviews exist.

### 3. Almanac Positioning Challenge - Integrated

Input:

- [copy/almanac-preorder-positioning.md](copy/almanac-preorder-positioning.md)
- [product/almanac-export-prd.md](product/almanac-export-prd.md)

Ask:

- Decide whether "annual reference book" or "public accountability record" should lead.
- Identify the top 5 sections that should appear in launch copy.
- Challenge the $99 price from the buyer's point of view.

Status: answered by Claude audit and folded into copy/product docs.

### 4. Live Partner Pitch Polish - Integrated

Input:

- [product/live-obs-prd.md](product/live-obs-prd.md)
- [03-customer-development.md](03-customer-development.md)

Ask:

- Rewrite the streamer pitch in 3 tones: warm intro, cold DM, agent/manager email.
- Make the pitch compelling without overpromising traffic or monetization.
- Identify likely objections from streamers and managers.

Status: answered by Claude audit and folded into copy/product docs.

## Needs Garrett

These cannot be solved by Codex or Claude without owner input:

| Need | Why it matters |
|---|---|
| Actual cash runway | Determines active tracks |
| Current subscriber counts and tiers | Determines interview list and launch funnel |
| Existing codebase location, if separate from this docs repo | Needed for product implementation |
| Garrett's network access to Sketch or streamer reps | Determines Live outreach path |
| Legal/compliance review preferences | Determines public-claim guardrails |

## Parking Lot

Put blocked ideas here instead of letting them contaminate active execution:

- Deferred-track ideation
- Investor-deck work before runway decision
- Vision LLC work before activation gate
- Live engineering before partner commitment

## Current Claude/Codex Coordination Notes

- Landing, Almanac, Live, Discord, retention, referral, press, quarterly review, methodology, Loss Room, Pass List, and AI-policy artifacts are now imported into `docs/monetization-v3/`.
- Future Claude/Codex passes should prioritize synthesis, validation, and contradiction detection over adding new surfaces.
- Run `tools/validate-monetization-v3.ps1` after each integration pass.
