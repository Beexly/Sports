# In-depth summary for Claude (and every cloud agent)

**Read this first if you were asked to continue Sports / Galaxy / odds / launch work.**

| | |
|---|---|
| Branch | `hermes/galaxy-keyless-odds` |
| PR | https://github.com/Beexly/Sports/pull/680 |
| Tip (as of this write-up) | `b0f2cf2e1` family — always `git log -1` |
| Main | **Do not merge.** `origin/main` is `bb0e7dfc0`. |
| Gates | Do **not** flip `LIVE_BOARD`, `PUBLIC_PICKS`, `PERFORMANCE_STATS`, `STATS_PUBLIC`. |

Ledger: `docs/ops/AGENT_LEDGER.md`. Laws: `AGENTS.md` (this file’s top half) + `CLAUDE.md`. Ops SoT if docs conflict: `docs/ops/CANONICAL.md`.

---

## 1. Founder intent (2026-08-27 morning — do not reverse)

The founder cannot pay another API bill (The Odds API ~$30/mo, invoice ~Sep 22). They said, in substance:

> We **become** the API provider because we are **not** relying on another company’s API. **Name this API key the Galaxy Sports API.**

Hermes later told them TheRundown free-tier signup was the kill switch and Galaxy was a “supplement.” **That was wrong.** The founder rejected Rundown. Grok repeated Rundown in PR #679’s founder list; that list is **stale**. Galaxy is the path.

Local Python proof (not in git): `C:/Users/Garrett/galaxy-sports-api/odds_feed.py` on `127.0.0.1:8731`. Cloud agents **cannot** `cd` there. The **same formula is now in this PR** (TypeScript).

---

## 2. The Galaxy formula (what “keyless” actually means)

Not “point Odds API base URL at localhost.” That does not work:

- `OddsApiClient` still **requires** `THE_ODDS_API_KEY`
- It calls `/v4/sports/{sport}/odds?apiKey=…`
- Galaxy Python only served `/odds?sport=nfl`
- `ODDS_API_BASE_URL` is **ignored in production** (`packages/data-ingestion/src/config.ts`)

The formula that **does** work (verified from this IP 2026-08-27):

1. `GET https://site.web.api.espn.com/apis/site/v2/sports/{path}/scoreboard`
2. Read **inline** `competitions[].odds[]` (prefer DraftKings). One request. No key.
3. `site.api.espn.com` and `sports.core.api.espn.com` are **Akamai-blocked** here. The old `espn-odds-client` used those and looked “empty.” That is why Galaxy Python worked and the repo client did not.
4. Moneyline prices are real American numbers. Spread **point** is real; spread **price** is often missing → **never invent -110**.
5. De-vig: `p_i = (1/O_i) / Σ_j (1/O_j)` with `O` = decimal from American. Bills −159/+132 → **0.5875 / 0.4125** (sums to 1). Code: `galaxy-devig.ts`. Also exists as Shin/etc. in the engine; this is the Galaxy multiplicative path on the feed.

### Wired in this PR

| Piece | File |
|---|---|
| Inline ESPN + `site.web.api` first | `packages/data-ingestion/src/espn-odds-client.ts` |
| De-vig `fair_prob` | `packages/data-ingestion/src/galaxy-devig.ts` |
| No paid key → Galaxy provider (not offline, not Rundown) | `packages/data-ingestion/src/odds-provider-adapter.ts` `GalaxySportsApiOddsProvider` |
| Ingestion tries Galaxy/ESPN **before** Rundown | `packages/ingestion-pipeline/src/process-sport.ts` |
| Optional `price?` / `fair_prob?` on outcomes | `packages/types/src/index.ts` `OddsApiOutcome` |

`GalaxySportsApiOddsProvider.capabilities.certifiableForLiveGate === false`. Unsetting the paid key does **not** make LIVE_BOARD honest. LIVE_BOARD stays off.

---

## 3. 2018–2025 history is not missing

Prior agents claimed slieb74 CSV (1968–2017) was all we had. **False.**

nflverse `schedules` asset = `games.csv` (CC-BY-4.0, already `NFLVERSE_CATALOG.schedules`). Measured locally 2026-08-27 from `data/nflverse/games.csv` (gitignored dump, not committed):

- Seasons through **2025** (and 2026 rows exist)
- **Every 2018–2025 game** has `spread_line`, `total_line`, **and** moneylines (267–285 games/season)

Code on this branch:

- `parseNflverseGameLines` / `linesInSeasons`
- `fetchNflverseGameLines({ fetchText?, from?, to? })` — default 2018–2025; injectable fetch (tests never hit network)

**Not done:** wiring those rows into CLV/backtest/settlement. Parser+fetch exist; the job that **consumes** them for CLV does not yet.

---

## 4. Polymarket — held off (not 100% legal)

`docs/agent-skills/polymarket-hold`: compliance hold, not tech debt. No public product, no `/api/cron/gamma`, no CLOB.

Founder later: hold off if not 100% legal. **We held.**

- `galaxy-polymarket.ts` parser exists (research). **Not called** from `GalaxySportsApiOddsProvider`.
- `INDEPENDENT_POLYMARKET` stays default **OFF**.
- Do not treat “add Polymarket” as an open ticket.

---

## 5. Live player props

The morning “live prop line” is **already in the repo**, not in Downloads JSON.

`packages/ingestion-pipeline/src/event-odds-ingest.ts`

- Odds API: `/v4/sports/{sport}/events/{eventId}/odds`
- NFL markets now: `player_pass_tds`, `player_pass_yds`, `player_receptions`, `player_reception_yds`, `player_rush_yds`
- Default **OFF**: `EVENT_ODDS_INGEST_ENABLED`
- Cap 8 events (`EVENT_ODDS_CREDIT_CAP`) so it cannot torch the plan
- Books: DK/FD/BetMGM on the **existing paid** Odds API plan

Downloads `extract-data-2026-08-27*.json` + the Odds API zip are a **lakehouse / joint-prop / v4 endpoint map**. They are not a keyless DK prop tape.

There is **no** legal keyless live book prop feed from this IP (DK/FD JSON Akamai/Cloudflare blocked; scrape = `draftkings-unofficial` **forbidden**). Options: (a) cap-on remaining Odds API credits then cancel, or (b) game lines only via Galaxy.

nflverse `player_stats` = **performance**, not prop **lines**.

---

## 6. Tests and CI (measured — do not invent)

**Local (this machine, Galaxy branch):**

| Suite | Result |
|---|---|
| `packages/prediction-engine` vitest | **282 files / 3125 passed** (edge-lab, calibration, CLV properties, leak-gate, props-HB, Venn–Abers, Brier certificate modules) |
| Galaxy de-vig independent Python check | −159/+132 → 0.5875/0.4125 |
| data-ingestion Galaxy/espn/history units | passed |
| ingestion-pipeline `process-sport` + `event-odds-ingest` | passed (added mock `isPolymarketIndependentEnabled: false`) |

**GitHub Actions on PR #680:** `Test, type-check, lint, Prisma` **pass** (~10m). Trust-gate, secret-scan, all guardrails, build, Vercel preview **pass**. Local “web vitest NOT RUN” was a **timeout**, not “untested.”

**Still missing tests (honest):**

- No unit test that `GalaxySportsApiOddsProvider.fetchNormalized` returns rows (only `createOddsQuoteProvider().id`)
- No `processSport` test with a **non-empty** ESPN/Galaxy board on the unpaid path (mock ESPN is `[]`)
- PG integration suites SKIPPED-GREEN without env URLs
- **Production** Brier/CLV on settled picks **not** re-queried here. Engine tests ≠ dashboard green.

Edges are **alive in tests**. They are **not** a public fire.

---

## 7. Related PRs (none of these are main)

| PR | What |
|---|---|
| **#680** | This work (Galaxy + history fetch + props markets + AGENTS brief) |
| #679 | Grok full audit at `bb0e7dfc0` (`handoff/GROK46_FULL_AUDIT_2026-08-27.md` on **that** branch) |
| #677 | Finish Line plan **DRAFT** |
| #678 | sports-intel orientation |

`git fetch origin bb0e7df` looks for a **branch named** `bb0e7df`. `origin/main` **is** `bb0e7dfc0`.

---

## 8. What Claude should do next (priority)

1. Add `fetchNormalized` test for Galaxy + unpaid `processSport` with inline ESPN fixture (non-empty).
2. Do **not** merge to main unless founder says.
3. Do **not** flip gates.
4. Do **not** re-open Rundown signup or Polymarket cron.
5. Optional: wire `fetchNflverseGameLines` into a **backtest/CLV consumer** (fetch exists; consumer does not).
6. Founder-only: unset `THE_ODDS_API_KEY` on a **preview** and confirm refresh logs `espn_public` / Galaxy; then production if they want the $30 bill dead. Agents do not edit `.env*` or Vercel env.
7. Founder-only: `EVENT_ODDS_INGEST_ENABLED=true` with cap if they want remaining prop credits spent.

---

## 9. Do not repeat (collision log)

- Auditing `.claude/worktrees/phase3` instead of `packages/data-ingestion/src/`
- Counting `.venv` + `.claude` as “the codebase” (16k files vs ~5.9k tracked)
- “Kill switch = env flip Rundown”
- Galaxy as supplement
- History gap 2018–2025 as unsolved
- Enabling Vitest UI (npm audit critical on vitest &lt; 3.2.6 — do not expose UI)
- `npm audit fix --force`
