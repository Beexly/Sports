# Action Network book-id correction — 2026-10-13

**Status:** VERIFIED LIVE and FIXED in code. Supersedes the book-id table in
`docs/ops/ODDS-SOURCE-COVERAGE-2026-10-13.md` §1 (that audit was read-only and is left intact).

---

## 1. What was wrong

Two production modules carried a book-id → bookmaker map that was **wrong on every entry**:

| id | code said | actually is | source_name |
|----|-----------|-------------|-------------|
| 15 | DraftKings | **Consensus** | `consensus` |
| 30 | FanDuel | **Open** | `open` |
| 68 | Caesars | **DK NJ** (DraftKings) | `draftkings` |
| 69 | BetMGM | **FanDuel NJ** | `fanduel` |
| 71 | PointsBet | **BetRivers NJ** | `njsugarhouse` |
| 74 | Circa Sports | *not present in the default response* | — |
| 79 | Bovada | *not present in the default response* | — |

`source_name` is Action Network's own field, so this is not an inference — it is their label.

## 2. Evidence

```
GET https://api.actionnetwork.com/web/v1/books
-> HTTP 200, 336,006 bytes, 458 books
```
Captured at `docs/data-sources/research/2026-10-13/action-network/probe_books.json`.

```
GET https://api.actionnetwork.com/web/v1/scoreboard/nfl
-> HTTP 200, 649,846 bytes, 14 games (week 6), 6 books per game
```
Captured at `docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json`.

Book ids present on **all 14** week-6 games: `[15, 30, 68, 69, 71, 75]`.
Every game carried **≥2 two-way books** — but see §3 for why that count was misleading.

## 3. Why it mattered (three distinct harms)

1. **Mislabel.** `ActionNetworkSecondBook.bookmakerFor()` returns
   `title: "Caesars (Action Network)"` for a line that is actually DraftKings. Any UI disclosure,
   ledger row, or attribution built on that title is false. Same for "FanDuel" (really the *Open*
   line) and "BetMGM" (really FanDuel).

2. **False independence — the serious one.** The module's stated purpose is "attach a second
   **independent** real bookmaker quote to ESPN events" to "unblock MIN_BOOKMAKERS=2". The preferred
   list put `68` first, commented *"distinct from ESPN's DK relay"*. But `68` **is** DraftKings, and
   the primary ESPN path relays DraftKings via `espn_public` (see `espn-odds-client.ts`). So the
   "second independent book" was the same book as the first. **A 2-book gate satisfied by a source
   paired with itself is worse than an unmet gate** — it reports a second opinion that does not exist.

3. **Synthetic rows counted as books.** `15` (Consensus) and `30` (Open) are aggregates Action
   Network computes. Counting either toward `n_books_two_way ≥ 2` clears the gate without adding a
   real quote.

This is the failure class worth remembering: **the transport was verified, the meaning was not.**
The module header said "VERIFIED LIVE 2026-09-25" and it genuinely was — HTTP 200, byte count, game
count all correct. Nobody checked what the *ids* referred to. A live check that does not assert the
semantics is a check that can pass forever while being wrong.

## 4. The fix

`packages/data-ingestion/src/action-network-book.ts`
- `ACTION_NETWORK_BOOK_TITLES` → verified ids only: `68 DraftKings`, `69 FanDuel`,
  `71 BetRivers`, `75 BetMGM`.
- New `ACTION_NETWORK_SYNTHETIC_BOOKS = [15, 30]` + `isSyntheticActionNetworkBook(id)` so callers
  can exclude aggregates from any "how many books" count.
- `ACTION_NETWORK_PREFERRED_BOOKS` → `[71 BetRivers, 75 BetMGM, 69 FanDuel, 68 DraftKings]`.
  DraftKings demoted to **last**. This is a behavioural change and it is deliberate: the old order's
  own comment asked for a book "distinct from ESPN's DK relay", and BetRivers/BetMGM/FanDuel are that.
- The "no preferred book matched" fallback now **skips synthetics** and fails closed (returns `null`)
  rather than handing back an aggregate dressed as a bookmaker.

`packages/data-ingestion/src/action-network-scoreboard-intake.ts`
- `ACTION_NETWORK_BOOK_IDS` → `DRAFTKINGS: 68, FANDUEL: 69, BETRIVERS: 71, BETMGM: 75`.
  `CAESARS` **removed** — there is no Caesars id in the default response, so the honest move is to
  not claim one rather than map it to DraftKings.
- New `ACTION_NETWORK_SYNTHETIC_BOOK_IDS = { CONSENSUS: 15, OPEN: 30 }`.

Tests: `action-network-book.test.ts` (4 new regression tests) and
`action-network-scoreboard-intake.test.ts` updated. **Verified: 17/17 pass, `tsc --noEmit` exit 0.**

## 5. What the correction cost before it was caught

None in production — the module has no production caller yet (it is reachable only via
`galaxy-kalshi-book.ts` as a factory return). **That is the reason to fix it now rather than later.**
The audit's #1 build recommendation is "wire Action Network scoreboard intake into the refresh loop";
executed against the old map, it would have wired the mislabelling and the false-independence
satisfaction into production at the same moment, and the 2-book gate would have gone green while
adding no second book.

## 6. Caveat — these ids are region-specific and the served set varies

DraftKings appears as `68 DK NJ`, `1633 DK NH`, `1539 DK VA`, `1535 DK IN`, … with **different ids**.
The corrected tables describe the **default (no-params) response only**. The `?bookIds=` request the
intake's own comment documents (`bookIds=15,30`) asks for **Consensus and Open** — the two synthetic
rows — which is the opposite of the comment's intent. If you start passing `bookIds` or a
state/region selector, **re-derive the map**; do not assume these constants travel.

### The served set is not stable — and that is how bet365 slipped past the audit

Three separate default probes returned `[15, 30, 68, 69, 71, 75]`, but an earlier capture
(`live_scoreboard_2026-10-14T01-25-40Z.json`, produced by `scripts/ops/gse_live_multi_fetch.py`)
returned `[15, 30, 68, 69, 71, 74, 79]` — **74 and 79 instead of 75**.

Look up those two ids in `/web/v1/books` and they are not what the repo called them:

| id | repo called it | actually is | source_name |
|----|----------------|-------------|-------------|
| 74 | Circa Sports | **Parx** | `paparx` |
| 79 | Bovada | **bet365 NJ** | `njbet365` |

**bet365 — the one book the coverage audit called "zero coverage" and "speculative, no free public
feed" — was already arriving keylessly, carrying live lines** (verified on game 290917: ml `-146/123`,
total `40.5`, plus 1H/2H/1Q/2Q/3Q/4Q, `inserted` 2026-10-14T00:37:07Z). The repo simply had it labelled
"Bovada", so nobody looked.

Availability is **intermittent**, not guaranteed: `79` appeared in one capture and in none of three
subsequent probes. So this does not mean "bet365 is solved" — it means the audit's *unavailability*
claim is too strong. Treat `79` as opportunistic: capture it when the edge serves the NJ variant set,
and do not build a hard dependency on it. This also reframes audit build items #6 and #7 (registry
entry + HAR-capture workflow for bet365): **before building a capture workflow, first check whether
the free path already works.**

### The mislabelling had already leaked into the corpus

`scripts/ops/gse_live_multi_fetch.py` wrote its own summary line —
`"14 games, books=[15, 30, 68, 69, 71, 75] (15=DraftKings, 68=Caesars)"` — into the day's feed and
summary JSON. That false attribution is sitting in `brain/feeds/2026-10-13/trainer_feed.jsonl`. Fixed
at source in the script; **the already-appended feed row is not rewritten** (the feed is append-only
and gitignored), so treat any earlier feed row making that claim as wrong.

## 7. Follow-ups this opens

- `ACTION_NETWORK_PREFERRED_BOOKS` now needs a decision on *which* independent book is canonical
  (BetRivers vs BetMGM vs FanDuel) — I chose BetRivers first for no better reason than it is listed
  first among independents. Not evidence-based; flag for the owner.
- BetRivers and BetMGM were **not** on the founder's target list. They are free and already arriving —
  worth adding rather than treating as out of scope.
- `book-dispersion.ts` (audit build item #4) must count only non-synthetic books, or it will report a
  dispersion that includes an aggregate of itself.
