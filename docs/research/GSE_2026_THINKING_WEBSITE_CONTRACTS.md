# GSE 2026 — Thinking-Website Page Contracts (Workstream K)

**Status:** Implemented + tested. Source of truth: `apps/web/lib/gse/thinking-page-contracts.ts`.
Cockpit browser: `/cockpit/page-intelligence`. Tests in `gse-contracts.test.ts`.

## Thesis

Every major surface is an *active cognitive system*, not a brochure. A page does not just present
data — it organises that data into a supported decision and shows the user what would make the
answer wrong. The metric for this is the **Page Intelligence Score**, and the heaviest term in it is
the **counter-evidence layer**, because showing the other side is the discipline most products skip.

## The Page Intelligence Contract

Each surface declares (typed in `PageContract`):

| Field | Meaning |
|---|---|
| `primaryUserQuestion` | The question the user actually arrives with |
| `decisionSupported` | The single decision the page helps make |
| `dataRequired` | The inputs the page needs |
| `hasEvidenceLayer` | Does it show the case *for*? |
| `hasCounterEvidenceLayer` | Does it show the case *against*? (heaviest weight) |
| `showsFreshness` / `showsSource` | Are timestamp + source visible? |
| `jarvisMode` | Which Jarvis mode backs it (referential-integrity tested) |
| `userMemoryUsed` | What consented memory it personalises with |
| `sourceRightsRisk` | low / medium / high |
| `conversionOpportunity` | Honest monetisation moment, if any |
| `hasNoPlayPath` | Is "do nothing / wait" a first-class outcome? |
| `autopsyPath` | Where the outcome gets graded later |
| `successMetric` / `failureMode` | What good and bad look like |

## Scoring (`scorePageIntelligence`)

```
decision named            +20
evidence layer            +15
counter-evidence layer    +20   ← the differentiator
freshness shown           +12
source shown              +12
no-play / watchlist path  +11
autopsy path              +10
```

A page that only ever confirms the user (no counter-evidence, no no-play) cannot reach the high band.
The cockpit page-intelligence view sorts every surface by this score and shows which layers are missing.

## Applied surfaces (21 contracts shipped)

Public: Landing, Pricing, Methodology, GSN Transmission, Trust Ledger.
Dashboard: Today's Board, Edge Map, Signal Courtroom, Academy, Bias Mirror, Fantasy home,
DFS Optimizer, Draft OS, Roster Coach, Trade Calculator, Waiver Pro, Player Insights.
Cockpit: Cockpit overview, Revenue Cockpit, Source Rights Cockpit, Jarvis.

### Patterns that recur

- **Decision-first surfaces** (Signal Courtroom, Roster Coach, Trade, Waiver, DFS) carry the full
  stack: evidence + counter-evidence + freshness + source + no-play + autopsy. These score highest.
- **Public credibility surfaces** (Landing, Methodology, Trust Ledger) must show source and evidence
  but lead with honest posture, never hype. Pricing's no-play path is *staying free* — a valid outcome.
- **Operator surfaces** (Cockpit, Revenue, Source Rights) trade end-user polish for honest internal
  state; their failure mode is vanity metrics or rights overreach, not "no decision".

## Referential integrity

A test asserts every `PageContract.jarvisMode` resolves to a real `JARVIS_MODES` id — so a page can
never claim Jarvis support that does not exist. (This caught Player Insights pointing at a `research`
*user* mode; it was repointed to the `source_librarian` Jarvis mode.)

## Next steps

1. Instrument the real pages to emit their contract fields, then score live rather than from the
   declared contract.
2. Add a CI check that any new page under `app/(public|dashboard)` registers a `PageContract`.
3. Surface the counter-evidence layer requirement in the design-system review checklist.
