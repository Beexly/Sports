# GPL Explainer — plain-language license guide for GSE (2026-09-28)

**One line up front: this is an engineering explainer, not legal advice.** If any licensed item becomes structurally load-bearing for a commercial product, a one-hour IP-attorney review of that specific integration is cheap insurance. Everything below is about how to operate safely, not a legal opinion.

## 1. What the GPL is

The GNU General Public License is a *free software* license with a catch: you're free to use, modify, and share the code — but if you distribute your modified version (or a product containing it), you must share *your* source code under the same license. That catch has a name: **copyleft**.

Think of it as a chain letter for source code: anyone downstream gets the same freedoms you got, and nobody can take GPL code private.

## 2. Copyleft vs. MIT — the one difference that matters

- **MIT** (and Apache-2.0, BSD): "Do whatever you want. Keep my name on it." You can copy MIT code into a closed commercial product and never share your code. This is why the sweep flagged MIT repos as green lights.
- **GPL**: "Do whatever you want — but if you ship it, you ship your source too." The freedoms come with the share-back obligation. That's copyleft: copyright law used to *enforce* openness instead of restricting it.

For GSE: MIT code can live inside the closed product freely. GPL code cannot live inside the closed product without triggering the share-back.

## 3. GPL version 2 vs. version 3

- **GPL-2.0** (older, 1991): the classic copyleft. No explicit patent grant, no anti-Tivoization clause.
- **GPL-3.0** (2007): closes loopholes — adds an express patent license (contributors grant patent rights on their contributions), anti-DRM provisions, and clearer compatibility language. Practically stricter than v2.
- **"GPL-2.0 or later" vs. "GPL-3.0-only":** some projects let you choose the version ("or later" = flexible); some pin to one version. The sweep found `LGPL-3.0-only` on the ESPN package — version-pinned, no choice. Always check which.

For our purposes they behave the same: copyleft on distributed derivatives.

## 4. AGPL — the dangerous one for a web product

The **Affero GPL** (AGPL-3.0) was written to close the "ASP loophole": with plain GPL, you could run modified GPL code on your *server*, serve users over the network, and never "distribute" anything — so no share-back was triggered. Google-era SaaS ran on this.

AGPL §13 kills the loophole: **if users interact with the software over a network, you must offer them the corresponding source code.** For a web product like GSE's site, that means:

- Running AGPL code server-side to generate anything users see = you owe the source of the whole combined work to those users.
- This is why the sweep verdict on PanopticPigskin (AGPL-3.0, broadcast camera-calibration CV) was **method-only, full stop** — not a line ported, not run server-side to produce user-facing outputs.
- Garrett's instinct was right to ask about this one specifically: of all the licenses in the sweep, AGPL is the one that could reach into a web product.

## 5. LGPL — the linking exception

The **Lesser GPL** was designed for libraries. Rule: you may *use* an unmodified LGPL library in your closed product (dynamic linking / npm dependency) without your product becoming LGPL. The library itself stays LGPL; your code stays yours.

The sweep's concrete case: `espn-fantasy-football-api` (LGPL-3.0-only) is **safe to `npm install` and import unmodified**. What you must NOT do: copy its `src/` files into the monorepo, or fork-and-vendor a modified copy — a modified vendored copy *is* a derivative work and must be shared under LGPL. Patch upstream or not at all.

## 6. "Derivative work" — what it means for the coding agent in practice

Copyright's derivative-work concept, applied to the coding agent's daily work:

- **Studying is safe.** Reading GPL code to learn *what it does* and *what method it uses* creates no obligation. Ideas and methods aren't copyrightable.
- **Copying is not.** Pasting GPL/AGPL code (or a mechanical line-by-line translation, e.g. R→TypeScript of the same structure) into the repo creates a derivative work — the copyleft attaches.
- **Clean-room is the safe path.** (1) Read the method. (2) Close the repo. (3) Write a design doc in your own words — inputs, outputs, algorithm stages. (4) Implement from the doc, never with the source open side-by-side. (5) Don't mirror its file/function/stage structure or copy names. (6) Note provenance in the header: source, license, "independently implemented."
- **Facts are free; expression isn't.** Numbers, ranks, player IDs, output schemas-as-facts: safe to use. Code structure, comments, pipeline staging, creative text: not safe. (Legal grounding: Feist v. Rural, 1991 — facts aren't copyrightable expression.)

## 7. The dataset question (dynastyprocess, nflverse-pfr)

This confused the sweep, so here's the clean version:

- A GPL on a **dataset** binds the *compilation* (the curated collection as an expressive work) — it does not make the individual facts inside it GPL'd. Reading ECR ranks or snap counts out of `dynastyprocess/data` CSVs and storing those *numbers* in our own tables is not creating a derivative work of the GPL'd compilation.
- What you can't do: commit their CSV/parquet files into the repo, redistribute the files verbatim, or copy the GPL'd *workflows/code* that generate them.
- Separate trap, same repos: the repo's GPL governs the compilation — it does **not** override the upstream source's terms. DynastyProcess ECR is scraped from FantasyPros; if ECR becomes load-bearing on a revenue surface, FantasyPros' own ToS needs a separate review. Two licenses, two questions.

## 8. What happens if GPL code ends up in the product

Honest version, in escalating order:

1. **The obligation:** if GPL'd code is in a distributed product (or AGPL code is network-served), the license requires offering the corresponding source of the combined work under the same license.
2. **The remedy if caught early:** remove the code and rewrite it clean-room *before* it ships or spreads. This is why the orchestration has license gates and provenance headers — they're early-detection instruments.
3. **The risk if caught late:** the copyright holder can demand compliance (share the source) or sue for infringement. In practice, the Software Freedom Conservancy and similar enforcers start with "comply within 30 days" letters — GPL-3.0 even has a formal 30-day cure provision for first-time violators. It's a fixable problem if you act fast, and an expensive one if you don't.
4. **The product risk specific to GSE:** the engine is the moat. An AGPL contamination event that forced source publication of engine code would destroy the moat. This is why AGPL gets the strictest rule.

## 9. Safe operating rules (standing)

1. **MIT / Apache-2.0 / BSD / CC-BY-4.0:** use freely, keep the attribution. The price is a credit line, nothing more.
2. **LGPL:** use as an unmodified dependency only. Never fork-and-vendor.
3. **GPL-3.0 code:** study only. Facts and methods learnable; zero code ported; no line-by-line translation. Clean-room if reimplementing.
4. **GPL-3.0 data:** extract facts into our own schema; never vendor the files; never redistribute verbatim.
5. **AGPL-3.0:** method-only, full stop. Never port, never run server-side for user-facing outputs.
6. **No license:** treat as all-rights-reserved — method only, independent reimplementation.
7. **Provenance headers everywhere:** every ingestion module notes source, license, what was taken (facts vs. method), and "independently implemented" where applicable. The headers are the paper trail that makes every verdict above defensible.
8. **Upstream ToS is a separate question** from the repo license — check both when a source becomes load-bearing.

*Engineering explainer, not legal advice. No credentials in this document.*
