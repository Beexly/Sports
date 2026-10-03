# `/cockpit/studio` — Page Specification

**Status:** Phase 3 build. Operator-only surface.
**Owner of code:** Codex.
**Owner of layout + voice:** Claude.
**Location:** `apps/web/app/cockpit/studio/page.tsx`, `apps/web/app/cockpit/studio/[gameId]/page.tsx`, supporting components in `apps/web/components/cockpit/studio/`.
**Companion specs:** `docs/product/galaxy-studio-spec.md` (the product), `docs/product/claude-api-cost-monitoring-spec.md` (cost surface).

---

## TL;DR

The operator workspace for Galaxy Studio asset generation. Operator picks a game/slate, picks templates, generates assets, reviews compliance flags, exports.

NOT a public-facing surface. NOT accessible by Pro/Elite subscribers (they consume the generated assets via creator subscriptions, not the workspace itself).

---

## Route shape

- `/cockpit/studio` — landing page, lists recent generation sessions + new-session button.
- `/cockpit/studio/[gameId]` — active session for one game. Template grid + generation panel + history.
- `/cockpit/studio/slate/[dateKey]` — active session for a slate-wide pack (multi-game).

Authentication: operator role required (existing cockpit auth pattern).

---

## Landing page layout (`/cockpit/studio`)

```
┌──────────────────────────────────────────────────────────────┐
│ Galaxy Studio                                                │
│ Operator workspace · Model v6.0.5                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ START A NEW SESSION                                          │
│                                                              │
│ ┌─ Game ─────────────────────────────────┐  ┌─ Slate ─────┐ │
│ │ [search: type matchup or sport]        │  │ [date picker]│ │
│ │ → BOS @ NYK · NBA · tonight 7:30pm ET │  │ → 2026-05-22 │ │
│ │ → CLE @ MIA · NFL · Sunday 1:00pm ET   │  │              │ │
│ └────────────────────────────────────────┘  └──────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ RECENT SESSIONS                                              │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ BOS @ NYK (NBA, 2026-05-22)                            │  │
│ │ 6 assets generated · 5 green · 1 yellow                │  │
│ │ Last active: 2 hours ago · Operator: g@galaxy...       │  │
│ └────────────────────────────────────────────────────────┘  │
│ ...                                                          │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ COST DASHBOARD                                               │
│ Studio month-to-date: $147 / $500 budget (29%) — yellow     │
│ → drill into /cockpit/api-costs                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Active session layout (`/cockpit/studio/[gameId]`)

```
┌────────┬──────────────────────────────────────┬──────────────┐
│ LEFT   │  CENTER                              │ RIGHT        │
│ RAIL   │                                      │ RAIL         │
│        │  GAME CONTEXT (read from IG)         │              │
│ Game   │  BOS @ NYK · NBA · 7:30pm ET         │ Generation   │
│ select │  Edge Index 2.7 · 73% conf SOLID    │ history      │
│        │  Evidence A · 12/14 books reporting  │              │
│ Lens   │                                      │ Citations    │
│ toggle │  ┌─ Template grid (8 cards) ──────┐  │              │
│        │  │ Fan Explainer                  │  │ Compliance   │
│ Recent │  │ Fantasy Angle                  │  │ flags        │
│ assets │  │ Betting Education              │  │              │
│        │  │ X Thread                       │  │ Export       │
│ Cost   │  │ TikTok / Reels Script          │  │ panel        │
│ status │  │ Newsletter Block               │  │              │
│        │  │ Sponsor-Safe Blurb             │  │              │
│        │  │ YouTube Title Ideas            │  │              │
│        │  └────────────────────────────────┘  │              │
│        │                                      │              │
│        │  Generate selected (3) ▸             │              │
│        │                                      │              │
└────────┴──────────────────────────────────────┴──────────────┘
```

---

## Template grid behavior

Each of the 8 template cards shows:

- Template name (e.g., "Fan Explainer").
- Last-generated timestamp for this game, if any.
- Status badge: `not generated` / `green` / `yellow` / `red`.
- Click to select for batch generation.

Operator can:

- **Select one or more templates** and click "Generate selected." Triggers Claude API calls in parallel (subject to cost budget).
- **Click a template card** to open the existing-asset detail (if previously generated).
- **Regenerate** an existing asset (overwrites prior with new attempt, history preserved).

---

## Compliance flags panel (right rail)

When an asset is generated:

- Compliance scanner result rendered with the offending spans highlighted.
- Click a flag to expand: shows the rule that triggered, the suggested fix, the regenerate-with-stronger-instruction button.

When ALL templates are green:

- Right rail shows: "All assets passed compliance. Ready to export."

When any template is red:

- Right rail shows: "N template(s) blocked by compliance. Export buttons disabled until cleared."

---

## Export panel

Once compliance is green:

- **Copy to clipboard** — per-template, copies the markdown/text.
- **Download as markdown** — bundle of all green assets into a single `.md` or per-template files.
- **Citations file** — separate `citations.json` with the EvidenceRef list per asset.

NO direct publish to external platforms. Phase 4+ may add Slack/Gmail draft routing as integrations; Phase 3 is copy-paste only.

---

## Generation history (right rail, when present)

For each generated asset, a row:

- Template name + timestamp.
- Status badge.
- "Restore" button to roll back to a prior version.
- "Diff" button to compare two versions side-by-side.

History entries are immutable. Regenerating creates a new entry, doesn't overwrite.

---

## Lens toggle

The 5 lenses from the Intelligence Graph (FANTASY / FAN / BETTOR / CREATOR / ANALYST). Setting the lens influences which templates emphasize during generation:

- FANTASY lens emphasizes the Fantasy Angle template + fantasy data in the citations.
- BETTOR lens (default for operator workspace) emphasizes the Betting Education template.
- CREATOR lens groups all 8 templates as the creator pack.
- ANALYST lens exposes raw signal data alongside the rendered assets.
- FAN lens — operator uses this when generating consumer-facing copy that hides betting context.

The lens is per-session, not persistent.

---

## Cost surface integration

Cost monitoring (`docs/product/claude-api-cost-monitoring-spec.md`) is visible on the left rail throughout the session:

- Current month studio spend.
- Per-template estimated cost-per-generation.
- Yellow alert at 50% budget, orange at 80%, red at 100%, hard cap at 150%.

When budget is exhausted, the "Generate selected" button disables with the surface-specific fallback message rendered inline.

---

## Slate-wide pack mode (`/cockpit/studio/slate/[dateKey]`)

For the daily slate, the operator can generate creator-packs across multiple games at once:

- Left rail: lists all games on the slate with checkboxes.
- Center: template grid (same 8 templates) — apply selected templates to selected games.
- Generation queue at the bottom shows progress (X of Y games generated).

Slate-wide mode respects cost budget aggressively — checks current spend against budget BEFORE starting the batch, refuses to start if the batch would exceed the budget mid-flight.

---

## Hard refusals (enforced by UI, not Claude API)

The cockpit UI MUST NOT:

1. Provide a "publish to Twitter" or "publish to Discord" button. Generated assets are operator-copy-only.
2. Provide a "post all" or "publish all" bulk action.
3. Auto-export assets to any third-party platform.
4. Allow override of compliance red flags. Operator can regenerate, can edit manually + re-scan, but cannot publish red-flagged content.

These are platform-restraint invariants. Violating them undermines the master plan's compliance posture.

---

## Acceptance criteria (Phase 3 cockpit/studio v0 → green)

1. Operator authentication enforced.
2. Game selector + slate selector functional.
3. Template grid renders 8 cards with correct status badges.
4. Batch generation triggers parallel Claude API calls (respecting cost budget).
5. Compliance flags render inline with offending spans highlighted.
6. Export panel: copy / download / citations all work.
7. Generation history immutable; regeneration creates new entries.
8. Lens toggle affects which templates emphasize.
9. Cost surface visible on left rail; warnings trigger at 50/80/100% budget.
10. NO publish-to-platform endpoints exist in the route handlers.
11. Slate-wide pack mode checks budget before starting batch.

When all 11 hold, cockpit/studio v0 is shippable.

---

## Open items

- **OPEN-CKP-STUDIO-1:** Should operators be able to share a session URL with other operators for review? Default: yes — slate-wide pack URL is shareable; operator must be in cockpit role to view. Codex confirms.
- **OPEN-CKP-STUDIO-2:** Should there be an "approve all green assets and queue for distribution" button? Default: NO — generation is operator-pull, not push. Distribution is manual copy-paste. Reconsider in Phase 5 if Studio matures into a creator subscription product with active distribution flow.

---

*Spec authored by Claude. Codex implements. Hard refusals locked.*
