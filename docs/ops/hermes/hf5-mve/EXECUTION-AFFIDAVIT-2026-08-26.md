# H-F5 MVE execution affidavit — 2026-08-26

**Outcome: KILL** (final capital 0.000000 · kill checkpoint n=50 · early abort
per prereg · certify never approached). Full frozen output:
`RESULTS-2026-08-26-executed.md` (this directory).

## What ran

The FROZEN runner from `origin/hermes/hf5-mve` @ `0035e3b4` —
`scripts/edge-lab/run-mve.ts` — byte-unmodified, seed 20260820, nParticles 24,
prereg v2 primary only (6–3h window, lambda=0.3, side-adaptive asymmetric
fractional e-process). No other window, lambda, or variant was computed.

## Transport (the one deviation, and why it is not a deviation of substance)

C-59 blocked on DB auth; this container's egress additionally has no raw-TCP
route to Neon (agent-proxy limitation, HTTPS only). Resolution: the corpus was
mirrored read-only into a LOCAL Postgres 16 and the frozen runner pointed at
the mirror via env. The mirror is row-exact:

- Source: `gse-postgres` (summer-brook-99380762), read-only role `hermes_ro`,
  over Neon SQL-over-HTTP (keyset-paginated, 10k rows/request).
- Mirrored: sports row `baseball_mlb`; **691** FINAL MLB games with scores,
  commence [2026-05-22, 2026-08-21); **198,922** TOTALS odds rows for those
  games — counts verified identical against the source before the run.
- Columns mirrored verbatim for every field the runner reads (games: id,
  externalId, sportId, teams, commenceTime, status, scores; odds: id, gameId,
  bookmaker, market, total, overPrice, underPrice, fetchedAt). The only
  synthetic values are fields the runner never reads (games.updatedAt, a stub
  ingestion_runs FK).
- Launcher: a 3-line wrapper setting DATABASE_URL then importing the runner
  unchanged (`run-mve-local.mts`, reproduced below). No experiment code touched.

### Provenance evidence — VERIFIED post-run by a second model (2026-08-26)

Both claims below were asserted by the executor and have since been checked
independently. Commands and observed outputs:

**1. Runner byte-unmodified** — `git diff --stat origin/hermes/hf5-mve --
scripts/edge-lab/run-mve.ts packages/prediction-engine/src/research/mve-eprocess.ts
packages/prediction-engine/src/research/nb-rbpf.ts
packages/prediction-engine/src/shin-devig.ts` → **empty output** (no
differences). The only worktree modification is `RESULTS.md`, which the runner
itself writes. Digests of the executed files:

```
ec0ce66dbdf5c65053fe3b73b0b73d40d525df4f8cb67a4a1a1fb5dcedf27a46  scripts/edge-lab/run-mve.ts
8e20e39d5623f2f0d4d3b94787715b9bbae83becd93b39da58bfb9c1041e690e  packages/prediction-engine/src/research/mve-eprocess.ts
```

**2. Mirror row-exact** — an identical md5 content digest was computed over the
prod source (read-only `hermes_ro`, SQL-over-HTTP) and over the local mirror the
runner actually read, covering every column the runner consumes, with
timestamps digested as epoch seconds so client formatting cannot mask a
difference. Re-runnable as `scripts/edge-lab/verify-mirror-digest.py` (read-only
both sides; connection strings come from env, never the repo). Observed:

| relation | prod | mirror | |
|---|---|---|---|
| games (corpus) | `691:e13dfc363d4c17d9423e9ce824fd1058` | `691:e13dfc363d4c17d9423e9ce824fd1058` | MATCH |
| odds (TOTALS, corpus) | `198922:6f63074ab8e653032a869e1925414ab4` | `198922:6f63074ab8e653032a869e1925414ab4` | MATCH |

Digest expression (run verbatim against both, with the corpus subquery from
this document's Transport section):

```sql
-- games
SELECT count(*)::text || ':' || md5(string_agg(
  id || '|' || "homeTeamName" || '|' || "awayTeamName" || '|' ||
  extract(epoch from "commenceTime")::bigint || '|' ||
  "homeScore" || '|' || "awayScore", ',' ORDER BY id))
FROM games WHERE id IN (<corpus>);
-- odds
SELECT count(*)::text || ':' || md5(string_agg(
  id || '|' || "gameId" || '|' || bookmaker || '|' ||
  coalesce(total::text,'~') || '|' || coalesce("overPrice"::text,'~') || '|' ||
  coalesce("underPrice"::text,'~') || '|' ||
  extract(epoch from "fetchedAt")::bigint, ',' ORDER BY id))
FROM odds WHERE market = 'TOTALS' AND "gameId" IN (<corpus>);
```

The transport therefore changed the wire, not the bytes: the frozen runner read
the same rows it would have read against prod directly.

```ts
process.env["DATABASE_URL"] = "postgresql://<local-mirror>";
process.env["DIRECT_URL"] = "postgresql://<local-mirror>";
await import("./scripts/edge-lab/run-mve.ts");
```

## Counts (from the frozen output)

Candidates 691 · excluded 334 (entry quality) · pushes 20 · graded 337.
Checkpoints: n=50 E=0.0055 → kill (threshold 0.10); E≈0 thereafter; early
abort triggered (capital < 0.01 after 50).

**Binding outcome vs diagnostics:** the binding protocol outcome is determined
at the n=50 checkpoint (kill threshold breached + early-abort condition met).
The frozen runner itself emits the full 337-bet capital path and later
checkpoints as part of its fixed output format; those post-abort rows are
runner-emitted diagnostics, not additional protocol evidence, and
`RESULTS-2026-08-26-executed.md` is that runner output **verbatim and
unedited** — hand-editing frozen output would be a worse protocol violation
than carrying its diagnostics.

**Cohort note for the auditor (text-vs-code discrepancy, predates execution):**
the prereg v2 prose heading says "retrospective walk-forward, 241 games" — the
estimated eligible cohort when the text was written (2026-08-20). The frozen
runner — finalized after the text as the executable form — defines the cohort
by RULE (MLB FINAL totals games, fixed window `CORPUS_FROM 2026-05-22` →
`CORPUS_TO 2026-08-21`, entry-quality filters), not by a 241-game list. At
execution the rule selected 691 candidates / 337 graded; the growth is the
corpus filling in between text-writing and code-freeze. No parameter was
chosen post-hoc, the window is outcome-blind, and the result was adverse
(KILL), so no favorable-selection concern arises in either direction — but
the independent audit should confirm this reading before publication.

## Protocol status

- Per prereg v2: kill threshold + early abort → **publish the kill (fifth Kill
  Ledger entry); this edge program closes**. The pre-written kill-entry draft
  is `docs/ops/edge/2026-08-20-mve-kill-entry-draft.md` (on the hf5 branch).
- Per FINAL-RUN seat law: the executor of this run may not audit it. The
  **independent cross-model audit of H-F5 (statistics + code) is still
  required before the kill entry goes to the public Kill Ledger.** Nothing
  public has been touched.
- Honest reading: the null ("the market's de-vigged totals probability upper-
  bounds the true probability of the predictably-chosen side") SURVIVED,
  emphatically. There is no exploitable side-selection edge in MLB totals at
  the 6–3h entry under this rule. This closes one door with receipts and
  redirects the program to E2 (resolution via covariates, props, softer
  markets) exactly as `2026-08-26-EDGE-PATH.md` sequences.
