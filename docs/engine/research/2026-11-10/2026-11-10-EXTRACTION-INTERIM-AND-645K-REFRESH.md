# Extraction — what you have right now (interim build, Nov 10, 2026, 10:35 AM CT)

## The two master files

| File | Records now | This morning |
|---|---:|---:|
| EQUATIONS-MASTER.jsonl | **528,115** | 321,807 |
| SITUATIONAL-MASTER.jsonl | **98,556** | 58,642 |

Local: `~/workspace/extraction-mandate-2026-11-10/extraction-output/`
On Drive (same links as this morning, contents replaced and size-verified at 10:46 AM CT):
- Equations: https://drive.google.com/file/d/1g7htiDP8q2hoS2s9fpFYh7A-1u_tz2Xu/view?usp=drivesdk
- Situational: https://drive.google.com/file/d/1H6UIEatCIeo6wF4zKWG6nG5H4Np8FFcz/view?usp=drivesdk

## What was added in this build (net, after same-source dedupe)

Equations, +206,308:
- Paper completion (P2, still running when snapshotted): +126,970
- arXiv program papers via free LaTeX source (R4): +41,584
- Cap-free books pass (P3): +31,913
- Sports research docs, first mining ever (R4): +5,803
- Layout pass (P4, incl. Crooks 1999 recovered): +38

Situational, +39,914:
- Cap-free books pass (P3): +35,245
- Sports research docs (R4): +3,697
- Paper completion (P2): +824
- Layout pass (P4): +148

Dedupe dropped only same-source repeats (11,645 equation records). Identical formulas from different sources stay as separate records, same rule as phase 1. Zero torn or corrupt lines in any input.

## Fixes verified in this build

- **udlbook doubled backslashes:** 152 stored rows actually carried the defect; all 152 repaired in place and flagged.
- **The Little Book of Semaphores** (zero rows book-wide before): now 196 equations + 84 situational.
- **NICE NG232 head-injury guideline** (zero rows before): its threshold rules are in, carried as situational records (107 records carry its GCS rules — rules are statements, not equations, so that is the correct form).

## The honest quality picture (measured, not claimed)

- **Recall census (R1):** papers 100.0% measured recall — the papers gap was coverage, now closing. Books: 53.1% strict displayed-equation recall in the phase-1 master; the cap-free pass and reassembly attack exactly the classes the census named (front-loaded cap truncation was the single biggest miss mechanism).
- **Executable share (P5):** about 31.7% of the master parses and evaluates today under the honest executor (47/47 tests pass; it never invents values — records that cannot run say why). Papers are the strongest slice at 50.7%.
- Records are captured verbatim spans with provenance (source file, page/section, method). Precision varies by shelf: the medical shelf's equation records are only ~15–25% formula-like (statistical fragments) — its real yield is situational. Nothing in the masters was reconstructed or generated.

## Still running, and how completion is locked in

Five lanes were still producing when this snapshot was taken: P2 (papers), R2 (display reassembly), R3 (repo source code), R4 (program papers), R5 (image-embedded math). Plus P1 (OCR).

The completion mechanism is mechanical now, not vigilance: the rebuild is a saved script. Each time a lane lands, its output gets count-verified against its files, folded into both masters, and the Drive copies refresh in place. You get one final delivery when the last lane lands.

- **P1 OCR is the slow one.** The pipeline is built and proven (Dixon & Coles pages OCR clean in 17–82 CPU-seconds on a calm box), but this machine is a shared 1.5-CPU cell and every lane at once starved it: 0 of 39 books finished so far, drivers still grinding (Dixon & Coles, Thorp). It loses nothing, resumes with one command, and gets the CPU as the other lanes finish. 5,343 pages is the full job.

## Remaining known gaps (named, with closers)

1. **26,968 flattened multi-line displays** still skipped in the books pass — every one logged with book + page + reason (`lane-p3-still-skipped.jsonl`). Closer: render-and-read pass. R2's reassembly is recovering part of this class from the other direction.
2. **Frontiers-2024 DBSI Eq. 1 (p. 96)** lost to a back-matter filter bug in P3 — flagged, recoverable in a targeted pass.
3. **Inline prose relations** in books: census estimates ~200–270 short relations in sentences were never held as records in the E1 shelves. R2's inline recovery targets this.
4. **Image-embedded math beyond Nielsen:** R5's disease sweep sizes this class across the whole library; the queue it produces is the closer list.
5. **Patent figure math and figure labels** (Alon Fig-4 class): known, small, needs render-and-read.
6. **GGIR repo variants:** 19 of 30 axis/filter metric variants missed by the README pass; R3's code mining is the closer.

Nothing has been deleted anywhere. The fabricated registry (21,419 template rows) stays quarantined as cataloged evidence, out of the masters.
