# Paper text extracts (2026-09-25/26)

Raw full-text extracts pulled from arXiv PDFs while working the
papers-into-scorecard task. Six files, ~78k words total. Preserved from
`/tmp/papers/` so the source text behind the ported code is not lost.

| File | arXiv id | Words | Landed in the repo? |
|---|---|---|---|
| `shared-40C237E7_httpsarxiv.orgpdf2606.18512.pdf.txt` | 2606.18512 — *Causal Forecasting Beyond the Observed* | 28,208 | no port found on `main` |
| `shared-DA8219FE_httpsarxiv.orgpdf2603.03613.pdf.txt` | 2603.03613 — *Empirical* (relabelling) | 23,637 | yes, `relabelingNull` |
| `shared-7FA5B530_httpsarxiv.orgpdf2505.23703.pdf.txt` | 2505.23703 — *Let's Reason* (natural to formal) | 12,723 | yes, `exact.ts` BigInt Wilson |
| `shared-062A2FBE_httpsarxiv.orgpdf2504.08747.pdf.txt` | 2504.08747 — *GridMind* | 5,874 | yes, gridmind module |
| `shared-4D6F4FDF_2603.25901.txt` | 2603.25901 — *Decoding Defensive* | 6,563 | no port found on `main` |
| `shared-6A179B1C_2604.01491.txt` | 2604.01491 — *Opponent-Adjusted* | 3,685 | yes, `clusterBootstrap` |

The "landed" column was checked by grepping `main` for the arXiv id at the time
of recovery (2026-09-26). "No port found" means no file named after the id
exists on `main`; it is not proof that nothing was derived from the paper.

## Caveats

- These are **pdf-to-text conversions, not clean source**. Line breaks, hyphen
  splitting, and column order are mangled. 2606.18512 in particular has its
  author block interleaved with body text. Quote from these only after
  checking the arXiv HTML version.
- Filenames carry a `shared-<hash>_` prefix from the download tool. Left as-is
  so they stay traceable to whatever produced them.
- The id is authoritative; the `shared-<hash>` prefix is not.
