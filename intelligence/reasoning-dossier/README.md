# Reasoning dossier pipeline — the Layer-2 "brain" surface

Per-game reasoning dossiers: stamped inputs in, a fenced reasoning artifact
out. The dossier **reasons about the game**; it never re-prices it. No pick,
no probability, no price — enforced by a validator, not by convention.
Emission is `ZERO_OBJECT`; RVC remains `NOT_CLEARED`; `is_pick` is false
everywhere by construction.

Quality bar / template: Grok's WO-0 Layer-2 read for SEA@DEN (2026-10-15) —
situations, injury asymmetry, market context, what could matter, explicit
non-claims.

## Pipeline

```
situational graph instance (PIT-stamped edges)
  + game bundle (archived line · stamped facts · authored reads · shadow reads)
        │  src/inputs.ts — manifest build + stamp enforcement (fail-closed)
        ▼
input manifest (canonical JSON, sha256) ──► src/prompt.ts (analyst prompt)
        │                                        │
        │                              analyst call (src/analyst.ts,
        │                              mockable; live via Nous Portal)
        ▼                                        ▼
   src/dossier.ts — assembly (pipeline owns non-claims, provenance,
   inputs_not_relied_on) ──► src/fence.ts — validator ──► .md + .json twin
```

The markdown is rendered **from the JSON twin** so the two cannot drift.

## Inputs

- **Situational graph instance** (`intelligence/situational-graph/instances/…`):
  edges with `as_of` stamps. Static reference edges (venue geography,
  published schedule topology) are admitted as `static`; any other unstamped
  edge is refused, as is any fact stamped after kickoff (PIT).
- **Archived line (Layer 1)**: cited as the market's starting point, as-is.
  The dossier never adjusts it.
- **Stamped facts**: injury designations, weather, schedule — each with its
  own stamp and source. Unstamped facts are refused (the graph honest-emptied
  `injury_burden` for exactly this; the bundle supplies designations stamped
  from the report pull instead).
- **Authored reads**: Layer-2 judgments recorded by analysts (e.g. the WO-0
  injury-context read), each stamped, each with its gaps named.
- **Shadow ledger reads** (receiver tracking, film features): qualitative
  only, internal only, **never named by source** in any output — "tracking
  shadow data" / "film shadow data" only. A lane with no data for the game is
  recorded `NO_DATA_FOR_GAME` and the dossier says so.
- **The nine stamped reasoning templates** (`src/templates.ts`): weather,
  weather-scale, atmosphere, layered-revenge, logistical-disruption,
  circadian-coast-mismatch, altitude-short-week, coaching-honesty,
  injury-context-identity. Each has an input contract; unmet contracts are
  honest empties with the gap named — never filled by invention.

## The fence (`src/fence.ts`)

- Banned keys anywhere in the JSON twin: `pick`, `probability`, `odds`,
  `price`, `confidence`, `projection`, `adjusted_line`, `bet`,
  `recommendation`, … (full list in code).
- Banned prose phrases: pick language (`will cover`, `take the points`,
  `best bet`, `our pick`, …), probability language (`% chance`,
  `win probability`), and any naming of the shadow data's source family.
- Citation completeness: every claim cites ≥1 manifest entry; every cite
  resolves; every line/fact/shadow input is either cited or explicitly
  declared in `inputs_not_relied_on` with a reason.
- Standing non-claims are appended verbatim by the pipeline (the model cannot
  omit or soften them).
- Provenance completeness: mode, model id (live mode only — a
  template-filled dossier must carry none), prompt + manifest sha256,
  generation timestamp.

## Usage

```bash
# tests (hermetic; the analyst is mocked)
npm test

# print the analyst prompt for a game (no model call)
node --experimental-strip-types src/run.ts \
  --graph examples/2026_06_SEA_DEN.graph.json \
  --bundle examples/2026_06_SEA_DEN.bundle.json --prompt-only

# live dossier via the Nous Portal connector helper (Motif's lane):
#   nous-api chat --model anthropic/claude-opus-5.5 --system ... --user ... > response.json
node --experimental-strip-types src/run.ts --graph … --bundle … \
  --ingest response.json --out dossiers

# live dossier direct (repo-side; key from environment only)
NOUS_API_KEY=… node --experimental-strip-types src/run.ts --graph … --bundle … --live

# deterministic fallback (no model call; marked PROVENANCE: template-filled)
node --experimental-strip-types src/run.ts --graph … --bundle … --template-filled
```

Node ≥ 22.6 (type-stripped TypeScript, zero runtime dependencies).

## First output

`dossiers/2026_06_SEA_DEN.md` (+ `.json` twin) — SEA@DEN, Thu 2026-10-15,
generated from the graph v1 instance and the day's stamped facts via a live
analyst call (model + cost recorded in the dossier's provenance).

Named gaps for that game (all carried as honest empties in the dossier):
atmosphere, layered-revenge, logistical-disruption and coaching-honesty
templates had no stamped inputs; injury-context applied partially (no
prior-usage / snap map); weather-scale served qualitatively (feature-store
scale not computed); both shadow lanes returned no data for the game.
