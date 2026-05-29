# Award-Level Presentation Standard — Galaxy Sports Edge

## Posture

> Breathtaking at the entrance. Calm inside the workflow.

Each major surface is allowed **one** signature presentation moment.
Hierarchy, evidence, and restraint must never be compromised in service
of the moment.

## Architecture

```
apps/web/lib/presentation/
└── moments.ts   # one MomentKind per major surface
```

## Five permitted moment kinds

1. **orbital-rings** — static CSS orbital ring decorations.
2. **evidence-card-reveal** — gentle 120ms fade-in of the evidence row.
3. **calibration-gate-pulse** — single pulse dot on the calibration banner.
4. **section-eyebrow-fade** — eyebrow fade on viewport entry.
5. **static** — restraint is the moment; layout alone carries the read.
6. **marquee-tier-band** — slow horizontal marquee of source attributions
   (reserved for press / about; reduced-motion silent).

## Hard rules

- **One** moment per surface, maximum.
- Every moment respects `prefers-reduced-motion`. The render path is the
  reduced render path; the moment is the additive layer.
- No moment may delay LCP beyond 2.5s on the 75th percentile.
- No moment may obscure evidence (source, freshness, model version),
  restraint (responsible play, no-bet), or methodology cues.
- No moment uses sound or autoplay video.

## Performance budget

- LCP ≤ 2.5s at 75th percentile, both mobile and desktop.
- INP ≤ 200ms at 75th percentile.
- CLS ≤ 0.1.
- JS for presentation moments ≤ 5kb gzipped per surface.

## Accessibility

- Every interactive element keyboard-reachable.
- Focus-visible rings preserved during the moment.
- Reduced-motion variant tested per surface.

## Authority

- Constitution #11 (clarity is the default)
- Design QA Rubric
- Taste Critic Rubric

## Review

- Per-surface on creation.
- Quarterly retroactive sweep.
- Performance regression sweep before any major release.
