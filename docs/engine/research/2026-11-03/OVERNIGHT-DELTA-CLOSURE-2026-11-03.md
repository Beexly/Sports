# Overnight Delta Closure — 2026-11-03

**Branch:** `hermes/week8-forensic-tracks-1-3`
**Starting HEAD:** `e5d99612a` (four commits past the contract's stated baseline `deaa44b28`)
**Contract baseline as written:** `deaa44b28`, 76 tests, 6,237 Neon rows, 497 `nov02:*` rows.

## Why this is a delta pass, not a fresh run

The contract describes state that had already advanced. Verified at session start:

| Item | Contract says | Actual at start |
|---|---|---|
| HEAD | `deaa44b28` | `e5d99612a` |
| pytest | 76 passed | 77 passed |
| Neon `lit.premise` total | 6,237 | 6,166 |
| Neon `nov02:*` rows | 497 | 426 |
| `origin/main` ledger | fix pending | `4799c83e4` already pushed |
| Track 1 TS modules | to wire | present with `.test.ts` siblings |
| Track 3 baseline artifact | to generate | present (7,395 b) |
| Track 4 GPP report | to generate | present (4,670 b) |
| Track 2 walk-forward receipt | to generate | present (3,432 b) |

Re-running Tracks 1–4 from scratch would have rewritten already-verified artifacts
and risked regressing green work. This pass closes only what was genuinely missing.

## Gaps found and closed

### 1. Two contract-named trench symbols did not exist

Track 3 requires `compute_pocket_voronoi_area` and
`apply_sharp_pass_rush_chip_and_slide_adjustment`. Neither name existed anywhere in
the tree; the repo carried `compute_ibrahim_voronoi_pocket_survival` and
`compute_sharp_pass_rush_protection_adjustment` instead.

Added to `intelligence/coaching/trench_pocket_physics.py`:

- **EQ-NOV03-031 `compute_pocket_voronoi_area`** — a geometric sector roll-up that
  converts a 25-bin polar pocket tessellation into blindside / center area series
  consumable by the Ibrahim survival kernel. It is an *aggregation helper*: bin
  areas must come from tracking data, and no constants are fitted. Provenance is
  stated in the code so it is not mistaken for a model from the paper.
- **EQ-NOV03-032 `apply_sharp_pass_rush_chip_and_slide_adjustment`** — exact
  delegation to the existing Sharp protection model. No forked constants, no new
  attenuation coefficients; a test asserts the alias output equals the direct call.

Tests: `tests/test_week9_voronoi_and_chip_adapters.py`, 10 cases covering sector
geometry (11 blindside bins / 4 centre bins at 14.4° wedges), single vs multi-frame
input, negative-area clamping, validation errors, hand-off into the survival kernel,
and alias identity.

### 2. Track 5 book extraction was missing two of the nine named sources

The feed carried entries for `2106.10165` (Roberts & Yaida), `vmls`, `Katch-McArdle`,
`Jayanti`, `DLP-KDD` and `16678907951`. It had **zero** rows for Kreyszig.

Extracted verbatim with PyMuPDF and appended as six rows, each carrying both the PDF
page and the printed page number:

| ID | Source | Location | Content |
|---|---|---|---|
| EQ-NOV03-KREYSZIG-P579 | Kreyszig 10e §12.4 | PDF p.579 / printed 553 | characteristic coords `v = x+ct, w = x-ct` ⇒ `u_vw = 0` ⇒ `u = f(x+ct) + g(x-ct)` |
| EQ-NOV03-KREYSZIG-P900 | Kreyszig 10e §20.4 | PDF p.900 / printed 874 | normal equations for polynomial least squares |
| EQ-NOV03-KREYSZIG-P925 | Kreyszig 10e | PDF p.925 | ill-conditioning caveat: small residual ≠ small solution error |
| EQ-NOV03-GLYNJAMES-P964 | Glyn James 4e §11.5.1 | PDF p.964 / printed 939 | OLS regression definition |
| EQ-NOV03-GLYNJAMES-P489 | Glyn James 4e eq. 5.103 | PDF p.489 / printed 464 | steady-state sinusoidal response `x_ss = A|G(jw)| sin(wt + arg G(jw))` |
| EQ-NOV03-GLYNJAMES-P754 | Glyn James 4e §9.2 | PDF p.754 / printed 729 | Fourier conduction law ⇒ 1-D heat equation |

All six are `DIRECT_FROM_SOURCE` / `GATED_EXPERIMENT_CANDIDATE` /
`wired_into_end_to_end_slate_pipeline: false`. Nothing was promoted to
`CITABLE_VERIFIED`, and no operator was invented: each `equation` field is a
transcription of text on the cited page.

File identity confirmed: `16678907951.pdf` is *Advanced Modern Engineering
Mathematics*, Glyn James, 4th edition, 1,065 pp. Kreyszig is 1,283 pp.

### 3. Manifest rebuilt against current disk

`build_downloads_manifest.py` reports:

```
386 files, 5 sensitive-excluded, 3 rejected-retracted-paper,
6 non-domain-ignored, 11 build-artifact-ignored, 58 sha256-duplicates-aliased
```

The builder classifies sensitive files **before** hashing (`sha256: None`), so the
guardrail "never read, open or hash the five sensitive files" is upheld by
construction, not by convention.

## Neon sync — `lit.premise`, `dev-lit-vectors-2026-10`

`python scripts/ingest/import_nov02_feed.py --execute`:

```
total_planned: 432   (429 HONESTLY_UNCITED_PRIOR, 3 REJECTED_CORRUPT)
unmatched_source_file_count: 0
citable_verified_count: 0
before_total: 6166  ->  after_total: 6172
existing_nov02: 426 ->  after_nov02: 432
purged_non_domain_or_duplicate_rows: 0
```

Independently re-queried afterwards with `hermes_ro`:
`total = 6172`, `nov02 = 432`, `CITABLE_VERIFIED = 1098` (unchanged — no new
citable was created; the 1,098 are the pre-existing class-A corpus).

## Test result

`python -m pytest tests -q` → **87 passed** (77 pre-existing + 10 new).
Zero failures, zero errors.

## Deliberately NOT done, with reasons

1. **Track 4 Week 9 GPP pool from `DKSalaries.csv`.** The shipped
   `verify_dk_salaries_slate_identity` proves that file is slate
   11/01/2026–11/02/2026 — Week 8, not Week 9. Building a "Week 9" portfolio from it
   would mislabel a Week 8 pool, which is the exact error class the forensic review
   exists to prevent. The optimizer already exposes
   `build_sample_week9_dfs_slate_pool()` for a labelled synthetic pool; no Week 9
   salaries file is present on disk.
2. **CIA-RDP96 Stargate as a Noyes-gate grounding source.** Track B of the shipped
   work deliberately stripped it; this pass did not reinstate it.
3. **Re-running Tracks 1–4 artifacts.** They exist and are green. Rewriting them
   would have churned verified output for no gain.

## Caveats

- Free disk was 2.6 GB at session start (100% used). OCR of the 1,283-page Kreyszig
  was not attempted for that reason; extraction was page-targeted, not whole-book.
- The regenerated `week9_tuesday_0400ct_sealed_baseline_2026.json` diff is
  `generated_at_utc` plus the derived `baseline_sha256` only — two lines, no content
  change.
