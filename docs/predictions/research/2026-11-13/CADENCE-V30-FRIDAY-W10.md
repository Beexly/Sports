# Cadence v3.0 — Friday final pre-kickoff overlay, Week 10

Generated 2026-11-13T22:42:15.048633+00:00 by `scripts/ops/run_cadence_v30_friday_overlay.py`.
Machine report: `cadence_v30_friday_overlay_w10.json`.

## 1. Seal unchanged (read-only)

All six checks `True`: sealed-center merkle `23245bcbba04f147…`,
coach-mind tau 0.42, canonical digest `354b4c132e200657…`,
EPA dropoff table `9b8c701c162efa85…`. tau, costMatrixC, teamRatings, and epaDropoffTable were read from the sealed object; nothing was re-estimated, re-simulated, or resealed.

## 2. Injury refresh

`data/nflverse/injuries_2026.csv` — downloaded=True, rows 3097 → 3121, Week-10 rows 300.
Prior file kept as `data/nflverse/injuries_2026.csv.bak-pre-v30-20261113`.

## 3. Slate

ESPN scoreboard `20261115` returned 12 events; windows {'SUN_EARLY': 8, 'SUN_LATE': 3, 'SNF': 1}.

| Slot | Game | Kickoff UTC | Venue | Total Δ (pts) | Home margin Δ (pts) | Weather flags |
|---|---|---|---|---|---|---|
| SUN_EARLY | NE @ DET | 2026-11-15T14:30Z | FC Bayern Munich Stadium | -0.0441 | -0.0441 | — |
| SUN_EARLY | KC @ ATL | 2026-11-15T18:00Z | Mercedes-Benz Stadium | +0.0000 | +0.0000 | roofed |
| SUN_EARLY | HOU @ CLE | 2026-11-15T18:00Z | Huntington Bank Field | +0.0153 | +0.0153 | PRECIP |
| SUN_EARLY | MIN @ GB | 2026-11-15T18:00Z | Lambeau Field | +7.2215 | -7.2395 | — |
| SUN_EARLY | JAX @ TEN | 2026-11-15T18:00Z | Nissan Stadium | +0.0093 | +0.0093 | — |
| SUN_EARLY | MIA @ IND | 2026-11-15T18:00Z | Lucas Oil Stadium | +0.0000 | +0.0000 | roofed |
| SUN_EARLY | CAR @ NO | 2026-11-15T18:00Z | Caesars Superdome | +0.0000 | +0.0000 | roofed |
| SUN_EARLY | BUF @ NYJ | 2026-11-15T18:00Z | MetLife Stadium | +0.0407 | +0.0407 | — |
| SUN_LATE | SEA @ LV | 2026-11-15T21:05Z | Allegiant Stadium | +0.0077 | +0.0077 | roofed |
| SUN_LATE | LAR @ ARI | 2026-11-15T21:05Z | State Farm Stadium | +0.0000 | +0.0000 | roofed |
| SUN_LATE | SF @ DAL | 2026-11-15T21:25Z | AT&T Stadium | +0.0000 | +0.0000 | roofed |
| SNF | PIT @ CIN | 2026-11-16T01:20Z | Paycor Stadium | +0.0000 | +0.0000 | — |

12 games, 99 designations applied, 43 of them on role keys the sealed `epaDropoffTable` cannot price (LT/CB1/EDGE1 — known v2.5 defect, reported not repaired). Max |total Δ| = 7.2215 points.

## 4. Ticket minting

**BLOCKED_NO_SEALED_BUILD** — 0 tickets minted.

no sealed call build for this week: the only writeup package on disk is the Week-8 build (generatedAt 2026-10-29T23:30:08Z) and its gameIds do not cover any Week 10 game

Overlay deltas are reported per game; no ticket is created, no call is priced, and no pass/play disposition is invented without sealed call rows.

## 5. Findings

- The seal is still 2026-W44 (sealed 2026-10-25): the Tuesday v1.0 seal for Week 10 never
  produced a Sunday slate build, so this phase had no sealed call rows to mint from.
  Upstream gap: no `week10_full_slate_connected_dossiers` artifact exists; the only
  Week-10 cadence artifacts are the Thursday TNF (WAS @ NYG) overlay receipts.
- Designations are Friday practice-report status. Final game designations land Saturday;
  the v4.0 Sunday 10:30 CT diagnostic is flag-only by contract and will not re-price them.

## Provenance

- Seal: `candidates/sealed-center.json` + `candidates/2026-10-25-week7-candidate.json` (quarantined per D1).
- Designations: ESPN game summary endpoint per event id.
- Weather: Open-Meteo hourly, kickoff hour, CC-BY-4.0; flags are advisory, zero points coefficient.
