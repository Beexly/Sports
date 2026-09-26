# Workspace Manifest — what lived where, and where it lives now

> Generated 2026-09-26. Companion to [`PAPER-CATALOG.md`](PAPER-CATALOG.md)
> and [`BRANCH-MAP.md`](BRANCH-MAP.md).

## The headline

**Nothing is lost. Almost everything is unfindable.**

That distinction matters, because "lost" and "unfindable" need opposite fixes.
Lost → recover it. Unfindable → index it. This repo needed the second one.

## Where the 1,658 papers actually are

They are **already in `main`**, under `docs/research/`. They were never in a
workspace folder, and they were never deleted. There is no missing-archive
recovery to perform.

| Collection | Files | Note |
|---|---:|---|
| `2026-09-21/arxiv-deep/` | 1,511 | One markdown extraction per paper, `NNNN-slug.md` |
| `2026-09-21/arxiv-program/` | 147 | Program docs + `index/` ledgers (see below) |
| `2026-09-18/statrankings/` | 105 | |
| `2026-09-18/full-tables/` | 77 | |
| `2026-09-17/gse-lab/` | 34 | |
| `2026-09-17/props-consensus/` | 28 | |
| other dated collections | ~120 | see [`PAPER-CATALOG.md`](PAPER-CATALOG.md) |
| **total tracked under `docs/research/`** | **2,194** | includes 22 rescued 2026-09-14 |

The `arxiv-program/index/` directory is the part that answers "what do we know
about these papers" — it is not a paper dump, it is the reasoning layer:

- `corpus-index.jsonl` — one record per paper
- `IMPROVEMENT-LEDGER.md` / `.jsonl` — what was claimed, what was built
- `BUILD-QUEUE.md` — the build order
- `SIGNAL-GAPS.md` — named quantities with no implementation
- `WIRE-IN-PLAN.md`, `SIGNAL-TAXONOMY.md`
- `PROGRAM-STATUS.md` (parent dir)

**Start there, not in `arxiv-deep/`.** The 1,511 extractions are the *what*;
`arxiv-program/index/` is the *so what*.

## The real problem: 495 unmerged branches

`origin` has **495 branches not in `main`**. **116 of them carry ≥5 changed
files** — that is 116 pieces of real, finished, pushed work that no cloud agent
reading `main` can see. See [`BRANCH-MAP.md`](BRANCH-MAP.md) for the table with
per-branch file counts.

The largest, by files-different-from-`main`:

| Δfiles | branch | date |
|---:|---|---|
| 533 | `codex/api-v1-autonomous-polish-hardening` | 2026-07-04 |
| 521 | `codex/api-v1-disposable-db-rehearsal-plan` | 2026-07-04 |
| 499 | `codex/api-v1-db-schema-proposal` | 2026-07-04 |
| 495 | `codex/api-persistence-shadow-adapter` | 2026-07-04 |
| 492 | `codex/api-consumer-registry-shadow` | 2026-07-04 |
| 477 | `codex/commercial-revenue-core` | 2026-07-04 |
| 464 | `claude/keen-ptolemy-t38f1g` | 2026-06-26 |
| 331 | `hermes/last-plan-2026-09-15` | 2026-09-22 |
| 243 | `hermes/h0-next` | 2026-08-23 |
| 227 | `claude/website-redesign-world-class-xoz5sz` | 2026-07-23 |

A large Δ on an old branch usually means **divergence, not value** — a branch cut
long ago that never merged upstream will show every file `main` has since
changed. Read the branch's *subject line and date* before assuming it holds
work you need. The map is sorted newest-first for that reason.

**This is the mechanism behind the back-and-forth.** An agent branches from
`main`, builds something real, pushes, reports success — and the next agent,
also reading `main`, cannot see any of it, so redoes it or contradicts it.

## Known at-risk: device-local files

These exist on this iOS device only. `/tmp` is wiped by iOS under storage
pressure, and this shell is not a backup. Anything below that is not in git
should be considered **unbacked-up**.

| Location | What | In git? |
|---|---|---|
| `/root/workspace-gse/gse-discovery/` | 22 files: `minis-overnight-deep-report-2026-09-14.md` (59 KB), `prereg-2026-09-14.md`, `res_*.json` (13 result files), 6 python drivers | **no** — rescued to `docs/research/2026-09-14/gse-discovery/` on this branch |
| `/tmp/papers/` | 13 arXiv source PDFs (~76 MB) | **no** — binaries; the *extractions* are in git, the PDFs are not. Deliberately not committed (size). |
| `/root/*.html`, `methodology_*.{txt,json}` | one-off scraped reference material | **no** — scratch, low value |
| `/var/minis/shared/*` | `gse-discovery`, `xai-galaxy`, `aisha-album` | empty now; was mirrored, not a system of record |

**Rule going forward:** if it is worth a second agent finding, it goes in this
repo. `/tmp` is a scratchpad, not storage.

## Two clones, one remote

`/tmp/gsx` and `/root/beexly-sports` are both clones of `Beexly/Sports`. Both
were clean at time of writing. `/tmp/Sports` is a bare-ish repo (`.git` only, no
checkout, 289 MB) — it is the object store the worktrees hang off, not a working
copy. Do not treat three directories as three projects.

## Regenerating

```bash
python3 scripts/gen-agent-index.py     # catalog + branch map
python3 scripts/fill-branch-counts.py  # Δfiles column (slow first run, cached)
```

Both are safe to re-run after new work lands. The counts cache lives outside
the repo (`/tmp/branch-filecounts.tsv`) and rebuilds itself if absent.
