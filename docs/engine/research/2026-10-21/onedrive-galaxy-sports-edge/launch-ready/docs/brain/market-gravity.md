# Sports OS — Market Gravity

**Status**: Doctrine only. Implementation requires approved change proposal.
**Source**: Prompt 1 §4.6 · Component 9
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`

---

## Purpose

Market Gravity synthesizes betting market data into a structured signal that
describes the direction, speed, and confidence of market pressure on a given
game or proposition.

It answers: *Is the market moving, how fast, and does that movement align with
or contradict the available evidence?*

Market Gravity is a supporting signal, not a standalone pick reason. It
adjusts confidence and risk scores when corroborated by Tier 1–3 evidence.
It is never a sufficient basis for a pick recommendation on its own.

---

## What Market Gravity Is Not

**Do not claim sharp money** unless supported by specific, verifiable
Tier 1 or Tier 2 data. Market movement alone is not evidence of sharp action.

The following language is **forbidden** in any Market Gravity output:
- "Sharp money is on [side]"
- "Sharps are backing [team]"
- "Professional bettors are on [side]"
- "Smart money indicates"
- "Public is on [side] so sharps are on [other side]" (this is an inference, not a fact)

Permitted language for market movement:
- "Line has moved [X] points toward [side] since open"
- "Multiple sportsbooks are showing agreement / disagreement"
- "Market pressure is toward [side] — no confirmed information source identified"
- "Line movement does not align with available official information"
- "Unusual movement speed detected — treat as market signal only"

---

## Inputs

| Input | Description | Source tier |
|---|---|---|
| `opening_line` | The line at market open | Tier 2 (licensed API) |
| `current_line` | The current line across tracked books | Tier 2 |
| `movement_size` | Total points moved from open to current | Derived from Tier 2 |
| `movement_speed` | Rate of movement (points per hour) | Derived from Tier 2 |
| `book_agreement` | Whether tracked sportsbooks agree on current line | Derived from Tier 2 |
| `book_disagreement_spread` | Range of current lines across books | Derived from Tier 2 |
| `movement_timing` | When movement occurred relative to known news events | Derived from Tier 2 + Tier 1 |
| `injury_correlation` | Whether movement coincides with an injury report | Tier 1 corroboration check |
| `news_correlation` | Whether movement coincides with any Tier 1–3 news | Tier 1–3 corroboration check |
| `public_proxy` | Volume-based estimate of public action (not verified sharp data) | Tier 4 proxy only |
| `liquidity_proxy` | Estimated market depth (size of movement relative to norm) | Tier 4 proxy only |
| `model_disagreement` | Whether Sports OS model score diverges from implied market probability | Internal |
| `historical_closing_pattern` | How this game type/market historically closes vs. open | Internal |
| `volatility` | Standard deviation of line movement over prior 48 hours | Derived |

---

## Outputs

| Output | Description | Surface |
|---|---|---|
| `market_pressure_score` | 0–100 composite score of market pressure toward one side | Premium / Cockpit |
| `pressure_direction` | Which side the market is leaning toward | Premium / Cockpit |
| `volatility_warning` | Flag if movement speed exceeds normal range | Premium / Cockpit |
| `movement_explanation` | Plain-language description of what the market is doing | Premium / Cockpit |
| `confidence_adjustment` | Additive or subtractive adjustment to overall pick confidence | Internal |
| `risk_adjustment` | Additive or subtractive adjustment to pick risk score | Internal |
| `classification` | WATCH / LEAN / PICK / AVOID | Premium / Cockpit |
| `corroboration_status` | Whether movement is corroborated by Tier 1–3 evidence | Cockpit |
| `sharp_money_flag` | Set only when Tier 1–2 data specifically supports it | Cockpit only |

### Classification Definitions

| Classification | Meaning |
|---|---|
| `WATCH` | Movement detected but below threshold for directional signal |
| `LEAN` | Moderate directional movement, not yet pick-strength |
| `PICK` | Strong directional movement corroborated by Tier 1–3 evidence |
| `AVOID` | Contradictory signals or high volatility — hold recommendation |

---

## Sharp-Money Flag Rules

The `sharp_money_flag` is only set when ALL of the following are true:

1. Movement size exceeds 2 points (or equivalent for the market type)
2. Movement occurred in a short window (under 2 hours)
3. A specific Tier 1 or Tier 2 source corroborates an information advantage
   (e.g., injury report preceded by market movement)
4. An operator has manually reviewed and confirmed the flag

The `sharp_money_flag` is:
- Never surfaced on public interfaces
- Never stated as fact without operator confirmation
- Never the sole basis for a pick recommendation

---

## Confidence and Risk Adjustment Rules

Market Gravity adjusts the pick confidence score by a bounded delta:

| Condition | Confidence adjustment |
|---|---|
| Strong corroborated market movement (PICK) | +5 to +10 points |
| Moderate movement (LEAN) | +2 to +5 points |
| Watch-level movement | 0 points |
| Contradictory market signal vs. Tier 1–3 evidence | −5 to −15 points |
| High volatility / AVOID | −10 to −20 points |

Confidence adjustments are bounded: final confidence may not exceed 85 on
market signals alone, and may not fall below 5.

---

## Market Gravity and Public Surfaces

On public surfaces, Market Gravity context may appear as:
- "Line context: moved [X] points since opening" (factual, sourced to Tier 2)
- "Market is tracking toward [side]" (descriptive, no certainty claim)

On public surfaces, Market Gravity context must NOT appear as:
- Any inference about sharp or professional bettor activity
- Any certainty claim about which side will win
- Any pressure score presented as a pick recommendation

---

## Cross-Reference

- Source Hierarchy: `docs/brain/source-hierarchy.md` — Tier 2 and Tier 4 inputs
- Evidence Vault: `docs/brain/evidence-vault.md` — market observations stored as EvidenceItems
- Signal Ledger: `docs/brain/signal-ledger.md` — `market_gravity_scored` ledger event
- Entity Graph: `docs/brain/entity-graph.md` — `market`, `line`, `sportsbook` entities
- Ask the Brain: `docs/brain/ask-the-brain.md` — Market Gravity feeds into BrainAnswer
