# POSTABLE BOARD — canonical pre-post source of truth

**Read this before drafting or posting any public pick. If it is not on the postable list below, it does not go out.**

## Protocol (binding on every agent, including Motif)

1. **One writer per refresh.** Whoever runs the live check writes this file. Everyone else reads. Never two competing boards.
2. **Read-before-post.** No public pick is drafted or posted unless it appears in the current `Postable` section. A pick that was postable yesterday is not postable today unless it is still listed.
3. **Freshness.** A board expires when (a) a newer refresh supersedes it, or (b) any listed game's kickoff passes — whichever comes first. Always check `Refreshed` and the kickoff times before posting.
4. **Provenance checklist — every postable pick must pass ALL of these:**
   - `booksCount >= 1` (zero books + elo-only = do not post; see 2026-09-13 Giants ML kill)
   - `consensusPct` is not a pinned constant across the board (see MLB run-line 1.0000 caveat below)
   - `lineGeneratedAt` is fresh — `dataFreshnessAt` restamping while selection/line stay frozen is a known defect (see 2026-09-13 Chargers ML kill: line generated 2026-05-22)
   - `independentEdge.decision !== "PASS"` (see standing Steelers ML -285 regression fixture)
   - kickoff is in the future at post time — never backdate a pregame pick after kickoff
5. **Confidence-ladder rule.** When the confidence spread across the board is driven by pinned constants rather than real discrimination, post as the day's board, NOT as a confidence ladder. Do not sell "91 vs 72" as a meaningful gap when it isn't.
6. **Dissent, not unilateral action.** If your own derivation disagrees with this board, append a dated dissent note under `Dissent log` and escalate to Garrett. Do not post against the board on your own authority.

---

## Current board

- **Refreshed:** 2026-09-14 ~19:05 CT
- **Derived by:** Motif live check, DIRECT Neon DB pull (picks + games + odds_line_snapshots), credential used transiently per Garrett's paste, never stored. Full provenance verified row-by-row: `bookmakerCount`, `consensusPct`, `generatedAt`, `dataFreshnessAt`, `factorBreakdown.independentEdge`, live line snapshots.
- **Model:** v5.2.7
- **Engine slate today:** 14 picks across 9 games (13 MLB + 1 NFL), 5 premium / 9 free.

### Postable — remaining tonight (2 plays, both verified live in DB)

**Binding caveat:** both are MLB run lines with `consensusPct` pinned at exactly 1.0000 — structurally always true for a 1.5 line, zero discriminating information. Post as the day's board, NOT a confidence ladder. Both are PREMIUM tier engine picks — posting them publicly is Garrett's call. Both `independentEdge` sources are SOLO (`skellam_cover`, single source).

| # | Conf | Play | Books | IE | Line verified |
|---|------|------|-------|----|---------------|
| 1 | 85 | Diamondbacks -1.5 vs Marlins (20:40 CT) | 11 | SPEAK, raw +9.9%, shrunk +6.0% | -1.5 live at 11 books 17:47 CT (+135 to +162) |
| 2 | 82 | Padres -1.5 at Rockies (19:40 CT) | 11 | SPEAK, raw +12.0%, shrunk +7.2% | -1.5 live at 11 books 17:47 CT (-136 to -145) |

Freshness: both picks generated 2026-09-13 ~20:00Z; lines re-verified in `odds_line_snapshots` captured 2026-09-14 22:47Z. Not the stale-line defect (cf. Chargers 4-month kill).

### Do NOT post

- **Chiefs ML (MNF vs Broncos, kickoff 19:15 CT)** — KILLED, confirmed in DB: `bookmakerCount` = 0, elo-only, reasoning "not a book price." Checklist item 4. (Board edge 70 does not cure zero books.)
- **Angels ML (vs Mariners, 20:38 CT)** — KILLED: `bookmakerCount` = 0, model signal only.
- **Diamondbacks ML (vs Marlins)** — KILLED: `bookmakerCount` = 0.
- **Padres ML (@ Rockies, 19:40 CT)** — KILLED: `independentEdge.decision` = PASS (rawEdge -0.0069, CONTRADICTS, "we pass rather than fade the market"). The regression-fixture rule.
- **Cubs ML / Tigers ML (model signals)** — KILLED: zero books (and games started).
- **UNDER 8.0 — Orioles @ Mets** — KILLED twice: first pitch 18:10 CT (no backdating) + stale line (generated 9/13, restamped 9/14).
- **UNDER 7.0 — White Sox @ Guardians; UNDER 9.5 / Cubs -1.5 — Braves @ Cubs; OVER 7.5 — Tigers @ Blue Jays; OVER 8.5 — Yankees @ Twins** — all games started. Never backdate.
- **Dodgers @ Reds** — in progress (`SCORING_NOW`). Not postable.
- **2026-09-13 board** — all games completed. Expired.
- **Standing kills (unchanged):** Steelers ML -285 (IE PASS); any zero-book elo-only signal; any pick whose line predates today with only a freshness restamp.

### Coverage gap (honest)

None this run — full DB access, all 14 picks checked with provenance. The Neon credential was used transiently and not stored.

---

## Dissent log

(none)

---

## Refresh history

- 2026-09-13 ~12:13 CT — first canonical board, seeded from companion live-check session. Supersedes all ad-hoc per-agent boards (including Motif's 11:08 CT NFL-only pull).
- 2026-09-14 ~18:55 CT — Motif live check via public API. Postable: NONE remaining (superseded).
- 2026-09-14 ~19:05 CT — Motif direct Neon pull (credential transient, not stored). Postable: 2 — Diamondbacks -1.5 (85, 20:40 CT) and Padres -1.5 (82, 19:40 CT), both 11 books, IE SPEAK, lines verified live. Chiefs ML kill confirmed in DB (0 books). 2026-09-13 board expired.
