# Axe Audit Protocol

How Galaxy verifies that every public surface meets WCAG 2.1 AA at
launch and after every release.

## Targets

| Severity | Target |
|---|---|
| Critical | 0 instances across all T1 surfaces |
| Serious | 0 instances across all T1 surfaces |
| Moderate | ≤ 5 instances, must be triaged with a fix-by date |
| Minor | Tracked, not blocking |

## Surfaces required to pass before public launch

T1 (trust-critical):
- `/`
- `/today`
- `/room/[gameId]` (one demo game)
- `/picks`
- `/no-bet`
- `/api/telemetry` (POST — must not break axe by emitting non-JSON to a browser)

T2 (decision-support):
- `/autopsy`
- `/parlay-mri`
- `/command`
- `/academy`

T3 (educational / demo):
- `/methodology`
- `/galaxy-demo`
- `/responsible-play`

## Procedure

### 1. Automated axe scan

Run against the preview URL using `@axe-core/cli` or the browser extension.

```
npx @axe-core/cli https://preview.example.com/ \
  --tags wcag2a,wcag2aa,wcag21a,wcag21aa \
  --exit
```

### 2. Manual keyboard navigation

For each T1 surface:
- Tab through every interactive element. Verify focus is visible.
- Confirm focus order matches visual order.
- Confirm no focus traps (no element that can be tabbed into but not out of).
- Confirm Escape closes modals / dialogs.

### 3. Screen reader sample

For `/today` and `/room/[gameId]`:
- VoiceOver (macOS) or NVDA (Windows) read-through.
- Verify TrustStrip surfaces source + freshness audibly.
- Verify confidence scores are read with the qualifier (e.g., "67 out of 100", not just "67").
- Verify pick cards announce sport + matchup + selection + confidence + tier.

### 4. Reduced motion check

- `prefers-reduced-motion` honored: pulse dots stop, transitions reduce to opacity only.
- No autoplay video, no infinite carousels.

### 5. Contrast check

For T1 surfaces:
- Body text ≥ 4.5:1 against background.
- Large text (≥ 24px) ≥ 3:1.
- Interactive elements ≥ 3:1 against adjacent content.
- Trust labels (`SourceFreshnessLabel`) must hit 4.5:1 even at the small 8-10px sizes.

### 6. Tap target check (mobile)

- All interactive elements ≥ 44×44 CSS pixels.
- Adjacent targets have ≥ 8px gap or are explicitly grouped.

### 7. Chart / data summary check

For any surface with a chart or data viz:
- Provide a text summary or table alternative.
- Verify the chart is not the only conveyance of critical information.

## Anti-patterns

- Color as the only signal (e.g., red/green for win/loss without text)
- Icon-only buttons without aria-label
- Modals that disable scroll without restoring focus on close
- Custom dropdowns that don't support arrow keys
- Live regions that announce too frequently (every freshness tick)

## Findings log

| Date | SHA | Surface | Issue | Severity | Status | Owner |
|---|---|---|---|---|---|---|
| _Empty at RC_ — owner action: run preview audit | — | — | — | — | — | — |

## Drill cadence

Axe scan runs in CI on every PR against the public surfaces. Manual
keyboard + screen reader sample is performed before every release.
Full T1+T2+T3 audit is performed quarterly.
