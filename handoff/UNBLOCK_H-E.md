# UNBLOCK H-E — pick-universe export (30-second morning step)
Branch: hermes/h2-remaining-binds (HEAD a538f9b2). Source: docs/ops/AGENT_LEDGER.md row H-E (CLV census, UNPUSHED; output CSV at docs/ops/calibration/2026-08-18-clv-census.csv, 1161 rows; Neon branch deleted).

## What H-E needs (from AGENT_LEDGER H-E + scripts/export-settled-picks-for-calibration.mjs)
- Read-only SELECT over `pick` table, settled non-bootstrap non-seed picks, fields: id, gameId, pickType, selection, line, confidence, edgeScore, consensusPct, bookmakerCount, tier, pickGrade, riskLevel, modelVersion, result, settledAt, isPublished, clvLockLine/Price, factorBreakdown, clvCloseLine/Price, clvKind, clvValue, clvVerdict, game.startTime/sportId/status.
- Downstream consumers: R36 calibration/ranker ingest expects JSONL (`*.jsonl`, one JSON line per pick) with `independentTrueProb`, `marketFairProb`, `rankingP`, `rankingSource`, `exportedAt`, `purpose=calibration_ranker_labels_only`.
- No credentials beyond already-configured `DATABASE_URL` (env). No Neon branch needed (original branch deleted; this uses current DB via DATABASE_URL).

## Primary command (30 sec, read-only, explicit output path, no credential prompt)
```bash
DATABASE_URL=$(grep DATABASE_URL .env.local .env.production.local 2>/dev/null | head -1 | cut -d= -f2-) \
node scripts/export-settled-picks-for-calibration.mjs \
  --out reports/settled-picks-for-calibration.jsonl --limit 5000
```
Expected runtime: <10 s (limit 5000). Output: `reports/settled-picks-for-calibration.jsonl` (JSONL, one line per pick, count in stdout JSON). Filter applied: result!=PENDING, settledAt!=null, isBootstrap=false.

## Fallback (full census — removes --limit, uses default 5000; raises if DB unreachable)
```bash
DATABASE_URL=$(grep DATABASE_URL .env.local .env.production.local 2>/dev/null | head -1 | cut -d= -f2-) \
node scripts/export-settled-picks-for-calibration.mjs
```
Same output path; reads default 5000-row cap from script (`min(50000, max(1, Number(arg(..., "5000")))`). To exceed 5000: append `--limit 20000`.

## What to do with the output file (one line)
Pass `reports/settled-picks-for-calibration.jsonl` to R36 (calibration/ranker ingest); do NOT edit the file — it's a read-only SELECT snapshot; for the full census run, add `--limit 50000` and rename output to `docs/ops/calibration/2026-08-23-h-e-census-rebuild.jsonl` before handoff.

## Constraints respected
- Read-only SELECT (`prisma.pick.findMany` with filter, no mutation).
- No Neon branch access (branch deleted; uses current DATABASE_URL).
- No new credentials; uses existing `.env.local` / `.env.production.local`.
- No code edits; no sealed paths touched.
