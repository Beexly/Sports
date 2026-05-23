# Galaxy Almanac Export PRD

Status: Draft
Build gate: 25 customer-development interviews validate hardcover or digital format
Production companion: `../copy/almanac-production-pack.md`
Press companion: `../galaxy-press-kit.md`

## Problem

The Galaxy Almanac needs a repeatable, auditable export process that turns the year's model record into a publication-ready data package. It must preserve trust by making every included claim traceable.

## Product Promise

The Almanac is Galaxy's annual accountability record: settled picks, losses, autopsies, methodology, Pass List, model changes, and research lessons in one durable reference.

## V1 Scope

In scope:

- Settled picks export
- Losses and autopsies export
- Pass List export
- Methodology snapshot
- Model changelog
- Weight-evolution charts
- Supporting essay source packet
- Data QA report
- Publication manifest

Out of scope:

- Sport-specific editions
- Audiobook
- Certification bundle
- Conference distribution
- Automated layout generation, unless existing tooling makes it low-risk

Editorial exclusivity requirement:

- The headline Year-in-Review essay must be Almanac-exclusive for at least 6 months post-publish.
- 2-3 supporting research essays must also remain Almanac-exclusive for at least 6 months.
- Re-release after the exclusivity window is allowed if it drives next-year demand.

## Required Sections

| Section | Approx pages | Source |
|---|---:|---|
| Year in review essay | 5 | Garrett |
| Settled picks data | 50 | Export |
| Methodology snapshot | 40 | Model docs and year-end state |
| Losses + autopsies | 60 | Loss Room/autopsy records |
| Model changelog | 20 | Version history |
| Pass List archive | 30 | Pass List records |
| Supporting research essays | 50 | Claude draft, Garrett edit |
| Index + reference | 10 | Generated from final manuscript |

## Export Package

The export should produce:

- Output file: settled-picks.csv
- Output file: loss-autopsies.csv
- Output file: pass-list.csv
- Output file: model-changelog.csv
- Output file: methodology-snapshot.md
- `charts/`
- Output file: qa-report.md
- `manifest.json`

## QA Requirements

- Every pick has event date, sport, market, published line, closing line if available, result, and model snapshot reference.
- Every loss has an autopsy or explicit "missing autopsy" flag.
- Every Pass List entry has decision timestamp and reason code when available.
- Every model version has date, summary, and changed weights.
- QA report counts missing fields and blocks publication if critical fields are missing.

## Production Timeline

| Date/Period | Requirement |
|---|---|
| May-July 2026 | Customer dev, export design, H1 test export |
| July-September 2026 | Draft essays, test data package |
| October 15, 2026 | Content freeze |
| November 2026 | Layout and copyediting |
| December 2026 | Proofing, KDP setup |
| January 15, 2027 | Launch |

## Physical Quality Requirements

The $99 hardcover depends on the book feeling like a premium artifact, not a cheap print-on-demand pamphlet.

- Budget $5k-$8k for cover design.
- Prefer premium cover stock and heavier paper if Amazon KDP options allow.
- Treat cover quality as a conversion requirement, not decoration.
- Add a 30-day hardcover refund mechanic to the public FAQ before pre-orders open.

## Success Metrics

| Metric | Target |
|---|---:|
| Pre-orders by month 10 | 500+ |
| Launch-month total sales | 1,000+ |
| Hardcover by 6 months | 2,500+ |
| Doubling trigger hardcover by 6 months | 6,000+ |
| Buyer NPS doubling trigger | 70+ |
