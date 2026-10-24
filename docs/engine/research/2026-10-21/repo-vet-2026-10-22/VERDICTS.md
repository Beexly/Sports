# Repo vet 2026-10-22

Pasted 3 links. Distinct 3. Metadata is from `gh api repos/<slug>` on 2026-10-22, not from memory.

| repo | stars | pushed_at | license | archived | language |
|---|---:|---|---|---|---|
| alibaba/aacr-bench | 246 | 2026-10-15T07:13:55Z | Apache-2.0 | false | Python |
| alibaba/open-code-review | 47961 | 2026-10-22T04:24:26Z | Apache-2.0 | false | Go |
| tirth8205/code-review-graph | 32317 | 2026-10-16T11:20:26Z | MIT | false | Python |

Policy check: `docs/strategy/dfs-tooling-vetting-2026-09-12.md:42` says no licence means all rights reserved. None of these three are unlicensed, so none are rejected on that rule. None are a scraped sportsbook feed.

Runtime: none of these ship into a TypeScript route. The only honest fits are a dev-time review CLI, an offline benchmark, or a local agent graph.

## Verdicts

- alibaba/open-code-review — ADOPTED as a dev-time CLI, not as a repo dependency. npm package `@alibaba-group/open-code-review` is 1.13.2. `npx` needed `--allow-scripts=@alibaba-group/open-code-review` because the package has a postinstall. Ran `ocr review --preview --audience agent --commit 110d4f087`. Exit 0. Preview said 3 files changed, 1 reviewable (`arxiv-id-fetch.xml`), 2 excluded as unsupported markdown. A full LLM review was not run. No provider was configured, and no key was invented.
- alibaba/aacr-bench — reference only. It is the benchmark dataset OCR's README points at (200 PRs, 10 languages, arXiv 2601.19494). It does not review this repo. The dataset was not downloaded.
- tirth8205/code-review-graph — reference only. MIT Python graph for local review context. It is not installed here (`python -m pip show` found nothing). A graph of this monorepo was not built.

Adopted 1. Reference only 2. Rejected 0. Skipped 0.

## Next

1. `ocr review --audience agent --commit <sha>` once a provider is configured. Do not add the GitHub Action.
2. Do not vendor AACR-Bench into the engine. Use it only if a review-model eval is actually being scored.
3. If the graph is wanted, install `code-review-graph` against one package, not the whole monorepo, and measure the index size before trusting a context-reduction claim.
