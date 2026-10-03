# Eval:prompts — per-surface cost & quality report

Generated: 2026-08-12T04:47:25.852Z

> HONESTY NOTE: this report is STATIC analysis. No live model inference was
> run to produce it. Cost figures come from the repo's vendored models.dev
> snapshot (same source model-economics uses); quality is a deterministic
> rubric over the harness prompt text. Live parity checking happens in
> promptfooconfig.yaml via `npm run eval:prompts` (requires API keys).

## Summary

- Surfaces scored: 6
- Quality pass: 6
- Quality fail: 0

## Per-surface

| Surface | Active tier | Active model | $/Mtok (act.) | $/Mtok (rec.) | Savings | Quality |
|---|---|---|---|---|---|---|
studio | sonnet | `claude-sonnet-4-6` | $6.00 | $6.00 | — | PASS
journal | sonnet | `claude-sonnet-4-6` | $6.00 | $6.00 | — | PASS
calibration-insight | haiku | `claude-haiku-4-5-20251001` | $2.00 | $2.00 | — | PASS
model-court | sonnet | `claude-sonnet-4-6` | $6.00 | $12.00 | -100% | PASS
content | sonnet | `claude-sonnet-4-6` | $6.00 | $6.00 | — | PASS
brief | haiku | `claude-haiku-4-5-20251001` | $2.00 | $2.00 | — | PASS
