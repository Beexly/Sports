# NFL Analytics Reverse-Engineering Knowledge Base (2026-09-25)

Scratch work recovered from the Hermes host on 2026-09-26. These files existed only
in `/tmp` and were not in any repo. They are preserved here unchanged, byte for
byte, in the order they were written.

## Scope directive

Garrett's engine ingests **all** signals and learns from everything; decisions are
made downstream. These documents were therefore produced with no filtering and no
relevance judgement applied at collection time. They are raw inventory, not
conclusions, and several entries are explicitly flagged as inference rather than
disclosed vendor fact.

## What is here

### Knowledge base (`kb-*.md`)

| File | Contents |
|---|---|
| `kb-lessons-master.md` | Master consolidation. Scope directive plus the lessons-learned roll-up. |
| `kb-gap.md` | Gap analysis: what Sports `AGENTS.md` claims vs what is actually evidenced. |
| `kb-ngs.md` | Next Gen Stats digest. |
| `kb-props.md` | DFS and props digest. |
| `kb-benchmark.md` | Benchmark extras: metrics in `AGENTS.md` missing from the 2026-09-17/24 sweep catalog. Records the exact scan range (4,029 lines, read-only, no edits). |
| `kb-sources.md` | Data sources master list. |
| `kb-learnings.md` | Learnings digest. |
| `kb-part1a.md` | Metric catalog, part 1a. |
| `kb-part1b.md` | Metric catalog, part 1b (September 19). |
| `kb-part1c.md` | Metric catalog, part 1c (September 23). |

### Raw inventories (`inventory-*.txt`)

| File | Contents |
|---|---|
| `inventory-sweep.txt` | The main metric sweep. Per-metric entries keyed to source line numbers, e.g. `## 1. EPA (Expected Points Added) [L43]`. |
| `inventory-ngs.txt` | Per-source NGS profile. |
| `inventory-props.txt` | QB and prop-side inventory. |
| `inventory-benchmark.txt` | What was scanned, at which line offsets. |
| `inventory-sources.txt` | **Empty (0 bytes) in the original.** Not reconstructed — listed here so the gap is visible rather than silently dropped. |

## How to read the line references

`[L43]`, `[L1248]`, `[L1609]`, `[L1896]` are line offsets into the Sports repo
`AGENTS.md` as it stood on 2026-09-25 (4,029 lines). They are anchors into a file
that has since moved, so treat them as provenance for the claim rather than as a
live citation, and re-resolve before relying on one.

## Status

Unreviewed after recovery. Nothing here has been checked against a second source
or merged into any existing research doc. Do not treat a number here as verified
just because it is written down.
