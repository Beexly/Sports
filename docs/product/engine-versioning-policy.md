# Engine Versioning Policy

**Status:** Operational policy. Updated as the model evolves.
**Owner:** Claude (policy + changelog discipline) + Codex (implementation + migration).
**Location:** `packages/prediction-engine/`, `apps/web/app/changelog/`.

---

## TL;DR

Every published pick carries a `modelVersion` stamp. Every settled pick contributes to a calibration record under its version. Versions follow `vMAJOR.MINOR.PATCH` semantic-versioning conventions with explicit triggers for when to bump.

Discipline matters: a model version change retroactively affects how settled picks are compared (was a pick correct under the OLD model or the NEW one?). Get this wrong and the Ledger becomes ambiguous.

---

## Version stamps everywhere

Every output that touches the engine includes the model version. Specifically:

- `Pick.modelVersion` — captured at publish.
- `PickSignalSnapshot.modelVersion` — captured per snapshot.
- `GateDecision.modelVersion` — captured when gate is decided.
- `LossAutopsy.modelVersion` — captured at autopsy author time (which model version produced the pick being autopsied).
- `ModelJournalEntry.modelVersion` — captured at draft.
- `AntiGalaxyPick.modelVersion` — captured at anti-pick publish (typically `anti-vX.Y.Z` paired to the production version).
- `ModelCourtCase.modelVersion` — captured at answer time.
- Twitter / Discord bot post embeds — model version in the footer.
- Galaxy Studio creator assets — model version in citation footer.

Stamping is non-negotiable. Any output without a model version is an integrity bug.

---

## When to bump the version

### PATCH bump (v6.0.4 → v6.0.5)

Triggered by:

- **Factor weight tuning that doesn't change behavior dramatically.** E.g., adjusting consensus weight from 0.18 to 0.20.
- **Bug fix in scoring logic with backward-compatible behavior.** E.g., the cross-market factor wasn't properly normalizing on the visiting team's recent away record.
- **Performance optimization.** E.g., the depth factor computation now runs in O(n) instead of O(n²).
- **Hotfix for a production issue.** E.g., a NaN was sneaking into volatility computation under a specific edge case.

Patch bumps don't require a publish freeze. The new version starts stamping picks immediately. Settled picks under the prior patch version remain valid history.

### MINOR bump (v6.0.x → v6.1.0)

Triggered by:

- **New factor introduced.** E.g., adding a "weather sensitivity" factor.
- **Factor removed.** E.g., retiring the "venue form" factor.
- **Material rebalancing of weights** that changes the model's behavior in a way that's visible to users. E.g., shifting from a consensus-heavy model to a depth-heavy model.
- **Gating threshold change.** E.g., raising the publish threshold from Edge Index 2.5 to 3.0.

Minor bumps DO require a brief publish freeze. The old model finishes settling its outstanding picks; the new model starts publishing fresh.

A minor bump triggers a Model Journal entry explaining what changed and why.

### MAJOR bump (v6.x.x → v7.0.0)

Triggered by:

- **Architectural change.** E.g., moving from a linear factor-sum to a non-linear model.
- **Sport added.** E.g., adding boxing as a tracked sport with its own factor set.
- **Settlement logic change.** E.g., changing how soccer 3-way settles are computed.
- **Fundamental scoring methodology revision.**

Major bumps require:

- A formal owner sign-off in `docs/ops/decision-log.md`.
- A 1-week publish freeze (no new picks published) while the new model warms up.
- A re-baseline of calibration data — the new major version starts a new calibration history.
- A featured Model Journal post explaining the change.

---

## Changelog discipline

`apps/web/app/changelog/` is the public-facing model changelog at `/changelog`. Every version bump (patch, minor, major) appears here within 24 hours of the bump.

Entry format:

```markdown
## v6.0.5 (2026-05-22)

### What changed
- Consensus factor weight adjusted from 0.18 to 0.20.
- Rest advantage factor normalization fixed for NHL back-to-backs.

### Why
- Calibration analysis on the last 200 settled picks showed the model was 7% under-confident on high-consensus games. Reweighting brings calibration into the target band.
- NHL back-to-back rest advantage was previously double-counted in the schedule-stress factor; fix removes the duplication.

### Settled-pick history
This is a PATCH bump. Settled picks under v6.0.4 remain in the same calibration history as v6.0.5 picks; the change is small enough that comparing performance across the boundary is meaningful.
```

For MINOR and MAJOR bumps, the entry also includes a link to the Model Journal essay explaining the change in research-blog voice.

---

## Settled-pick comparison across versions

When `/ledger`, `/anti-galaxy`, or any calibration surface aggregates settled picks across version boundaries, the rules are:

- **Within the same MAJOR.MINOR series:** picks aggregate freely. Different patch versions are treated as equivalent for calibration purposes.
- **Across MINOR boundary:** picks are reported but with a visible "model version delta" notation. Comparing v6.0 picks to v6.1 picks is shown as a yellow flag (interpret carefully).
- **Across MAJOR boundary:** picks aggregate separately. The Ledger surfaces v6.x.x picks and v7.x.x picks as separate cohorts with explicit "different model" labels.

Calibration charts respect this. The Live Calibration chart on `/board` and `/ledger` shows a version watermark in the corner; users can filter by version.

---

## Version stamping in published artifacts

External artifacts (Twitter posts, Discord embeds, blog posts, Model Journal entries) include the model version in footer-style position. The text format is consistent:

- Twitter: `Model v6.0.5 · galaxysportsedge.com`
- Discord embed footer: `Model v6.0.5 · galaxysportsedge.com`
- Blog post: ends with `Methodology: /methodology · Model v6.0.5 at publish · Updated: <ISO>`
- Model Journal entry: top-of-post indicates which model version was active for the data being discussed.

---

## Model Journal cross-references

When a Model Journal essay references a factor weight change shipping in the next model version, the essay's `modelVersion` stamp reflects the version that WROTE the essay, not the version being announced. The essay body references the upcoming version by name.

Example:

> "v6.0.4 (current) has been over-weighting schedule stress in soccer. v6.0.5 (shipping next week) reduces the soccer weight from 0.24 to 0.18."

The essay's `modelVersion` = v6.0.4.

---

## Anti-Galaxy version pairing

Anti-Galaxy picks tag as `anti-vX.Y.Z` matching the production version they're inverting (DEC per `anti-galaxy-spec.md`):

- When production publishes v6.0.5, anti-Galaxy publishes `anti-v6.0.5`.
- A minor bump on production (v6.0.x → v6.1.0) implies a minor bump on anti-Galaxy.
- Anti-Galaxy calibration aggregates separately from production calibration always — they're different models by design.

---

## Versioning procedure (operational checklist)

When the engine team (Codex + owner) is ready to bump a version:

### For PATCH bumps:
1. Code change merged via PR.
2. Bump version constant in `packages/prediction-engine/src/version.ts`.
3. Append to `apps/web/app/changelog/page.tsx` content.
4. Deploy. New version starts stamping on next scoring run.
5. Smoke test confirms model version reflects on a fresh pick within 30 minutes.

### For MINOR bumps:
1-5 from PATCH plus:
6. Owner approves in `docs/ops/decision-log.md`.
7. Publish freeze begins 24 hours before deploy.
8. Outstanding picks under the prior version finish settling.
9. Model Journal entry drafted explaining the change.
10. New version takes over publishing.

### For MAJOR bumps:
1-10 from MINOR plus:
11. 1-week publish freeze.
12. Calibration history starts fresh under the new MAJOR.
13. Featured Model Journal post.
14. Decision-log entry with full rationale + alternatives considered.

---

## Version sunset

Old major versions remain in the Ledger forever (per the Galaxy Memory append-only persistence policy). But the changelog page at `/changelog` paginates older entries to the archive after 2 years.

Settled picks under sunsetted major versions stay accessible at `/room/[gameId]` and `/ledger` indefinitely.

---

## Acceptance criteria for this policy

The policy is "passing" when:

1. Every output that touches the engine includes a model version stamp (auditable via synthetic monitoring `CHECK-V-STAMP-*`).
2. `/changelog` has an entry within 24 hours of every version bump.
3. Major bumps have decision-log entries with owner sign-off.
4. Minor + major bumps have associated Model Journal essays.
5. Calibration surfaces respect cross-version comparison rules.

---

## Open items

- **OPEN-VER-1:** Should patch bumps also get Model Journal mentions? Default: no — too noisy. Only minor + major get Journal essays. Patch bumps live in the changelog only.
- **OPEN-VER-2:** Should the changelog be RSS-syndicated? Default: yes, at `/changelog/rss.xml`. Phase 4 add alongside the journal RSS feed.
- **OPEN-VER-3:** Should we publish a "deprecation timeline" — e.g., "v6.x picks compare directly to v6.y picks within 18 months; after that they're in archive only"? Default: no in v0. Galaxy Memory is permanent; old versions stay queryable. Reconsider in Phase 6+ if the data set becomes unwieldy.

---

*Policy authored by Claude. Owner approves major bumps. Patches and minors run through Codex + Claude.*
