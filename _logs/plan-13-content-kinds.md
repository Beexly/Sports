# Plan — Cycle 13 · feat(content): add 6 remaining content kinds to generator

## Goal
Cycle 8 introduced `BlogPostKind` with two values (`DAILY_PICKS`, `WEEKLY_RECAP`) and proved the `KIND_FRAMING` map shape works. This cycle adds the remaining six kinds from `apps/web/lib/content/workflow.ts`:

- `METHODOLOGY_EDUCATION` — how the model works, no specific picks required
- `MATCHUP_PREVIEW` — single-game deep dive
- `PROMOTION_ROUNDUP` — operator-curated promo content
- `PERFORMANCE_TRANSPARENCY` — performance/calibration commentary
- `RESPONSIBLE_BETTING_EDUCATION` — RG content
- `MODEL_CHANGE_NOTE` — calibration / model version note

## Files to touch
1. `packages/types/src/index.ts` — extend `BlogPostKind` union
2. `apps/web/lib/content-generator.ts` — add 6 entries to `KIND_FRAMING`
3. `apps/web/__tests__/content-generator.test.ts` — one assertion per new kind
4. `_logs/CHANGELOG.md` — append

## Design

### Framing per kind (single-line opener, picks block stays universal)

| Kind | Opener |
|---|---|
| `METHODOLOGY_EDUCATION` | Explain in plain English how this site's model arrives at the picks shown below. Educate the reader on what goes into a confidence score. |
| `MATCHUP_PREVIEW` | Write a deep matchup preview centered on the single game below. Use only the data provided. |
| `PROMOTION_ROUNDUP` | Write a roundup tying the slate below to today's responsible promotional context. Promotions are introduced separately by the operator; reference picks only. |
| `PERFORMANCE_TRANSPARENCY` | Write a transparency post about how our calls landed in the period ending on the date below. Each pick lists its reasoning at prediction time. |
| `RESPONSIBLE_BETTING_EDUCATION` | Write an educational post about responsible betting practices, anchoring the discussion in the picks slate below as an illustration of measured exposure. |
| `MODEL_CHANGE_NOTE` | Write an operator-facing model change note describing what changed and how it affects today's slate. Reference only the picks below as concrete examples. |

### Why no kind-specific input shape changes (yet)
Each kind would benefit from kind-specific data (game stats for MATCHUP_PREVIEW, settlement outcomes for PERFORMANCE_TRANSPARENCY, etc.). Adding those today couples the type to non-existent callers — same reasoning as Cycle 8's deferral. Real callers extend the input shape when they appear.

### Schema and disclaimer unchanged
Same `POST_SCHEMA`, same disclaimer, same picks block. The KIND_FRAMING map gets six new entries.

## Test plan
- Existing 13 generator specs unchanged
- 6 new specs: each asserts that the framing for that kind appears in the user prompt and the DAILY_PICKS opener does NOT
- Full sweep + guardrails

## Rollback
Single commit. Each new kind is a map entry; revert removes the entries + the union widening, no caller affected because no caller passes the new kinds yet.

## Commit message
`feat(content): add 6 remaining content kinds (METHODOLOGY / MATCHUP / PROMOTION / PERFORMANCE / RESPONSIBLE / MODEL_CHANGE)`
