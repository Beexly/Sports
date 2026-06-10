# GSE Agent Build Doctrine

The operating methodology for GSE's AI-agent build program — the rules every autonomous wave follows so the launch tree is never broken and every change is honest. This is the codification of what worked across the 2026-06-09→10 overnight campaign, with the best patterns adapted from the R&D sweep (`00-rnd-report.md`).

> **Provenance.** Patterns adapted (not copied) from MIT-licensed skill repos studied read-only: `santifer/career-ops` (orchestrator/worker split, recommend-never-execute gate, legible A–F rubric), `obra/superpowers` (design→plan→implement→test→review, systematic debugging), `mattpocock/skills` (verify-not-assume, grill-with-docs), `addyosmani/agent-skills` (rationalizations rebuttal, verification evidence), `phuryn/pm-skills` (intended-vs-implemented audit), `Leonxlnx/taste-skill` (design dials). GSE's own trust-first brand + the hard lines below override anything borrowed. AGPL/Noncommercial repos were NOT used as code.

## 1. The hard lines (never crossed autonomously)
Production deploy · moving money / creating Stripe prices · reading/creating secrets · publishing or posting publicly on the founder's behalf · flipping live picks / `MODEL_VERSION` · scraping behind login walls or bypassing TOS/robots/rate limits · installing or running untrusted third-party code. These stay armed-but-unpulled for the founder; agents build the gated/inert form and stop.

## 2. The wave loop (every build wave)
**Recon-first → Build → Critic → Gate → keep-if-green / revert-if-not → Log.**
- **Recon-first.** An agent reads the real code before any edit and returns the exact, grounded plan (file:line). No edit on assumption.
- **Build additive/inert/gated.** New capability ships behind a default-OFF flag or as a no-op-without-keys module; the launch path is byte-identical until the founder flips it. Never change the published number / tier / `MODEL_VERSION` in a "shadow" wave.
- **Adversarial critic.** A separate agent re-verifies the change against the criteria and re-runs the gate — verify, don't trust the builder's self-report.
- **Gate = the whole truth.** typecheck · lint (max-warnings=0) · vitest · `next build`. Green or it reverts. The tree is never left red.
- **Log every wave** (what, why, verification, any switch it arms) to the command-center.

## 3. Recommend-never-execute
Agents are roles, not automations (`externalActions: "NONE"`). For anything on the hard-line list, an agent produces the artifact and the recommendation; a human gates the live action. Surface the decision; don't take it.

## 4. Verify-not-assume (grill-with-docs)
Before trusting a finding or a plan, reconcile it against the source of truth: `ARCHITECTURE.md` / ADRs / the actual file:line. Spot-check the load-bearing claims. An audit of your own audit catches the off-by-one and the clone-confusion before they ship. (Used all night: every workflow ended with an independent critic re-reading citations.)

## 5. Intended-vs-implemented audit
After a build, ask: does the rendered/served behavior match the intent — or just the description? Two of this session's critics flagged "the build report says X but the working tree is Y." Pin the claim to the diff.

## 6. The legible rubric (for the GSE Rating)
The proprietary Rating stays reveal-less in public, but internally it must be a *legible* weighted/categorized rubric — every input has a weight, a category, and a stated reason (see `data-mesh/10-gse-rating-proprietary-architecture.md`). A rubric you can read is a rubric you can calibrate; calibrate tiers against outcomes so "Elite" is earned, not relative.

## 7. Design dials (taste, parameterized)
Design decisions are made on explicit dials, not vibes — **Variance** (how much a surface deviates from the system), **Motion** (entrance/scroll choreography, reduced-motion-safe), **Density** (information per screen; lead with the number + the read, detail on demand). Hold the dials consistent across surfaces so the product reads as one brand.

## 8. Two tools to pilot (founder-set-up, not auto-installed)
- **`alibaba/open-code-review`** (Apache-2.0) — advisory line-level LLM PR review in CI alongside the existing gates. Pilot on the **canonical** (non-deploy) clone first; approved Anthropic-compatible endpoint only; **never** auto-merge; confirm no proprietary engine code egresses to a non-approved endpoint.
- **`colbymchenry/codegraph`** (MIT, local/no-key) — MCP code-intelligence over the monorepo to cut agent tool-calls/tokens. Pilot on a throwaway local index, pin the version, diff releases, prove the savings before promoting. Pick this **or** one code-graph skill, not several.

## 9. Standing safety rules from the R&D
- No proprietary engine code leaves to any non-approved endpoint (covers code-review, code-graph LLM steps, any proxy).
- Pin a commit hash + verify the canonical repo for every pilot (impostor-clone risk is live).
- Treat inflated star counts as marketing, not safety or quality.
- Never run a pipe-to-shell installer or an auto-firing global hook on a credentialed box — read and port the pattern instead.
