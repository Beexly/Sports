# AUDIT_INCORPORATION_LEDGER

Opened 2026-10-17 01:20 CT. Instrument for Garrett's order: every finding in the Oct 16-17 audits is WIRED, IN MOTION, GARRETT-PROPERTY, or REMAINDER. Names and counts only for credentials, never values. Nothing deleted.

States: **WIRED** = in the system, running, tested, on real data (commit + test + live output + real data, all four). **IN MOTION** = owner, next step, evidence. **GARRETT-PROPERTY** = his act, prep state stated. **REMAINDER** = cannot be wired here: reason + owner.

## Extraction status per source (STATUS: INCOMPLETE - extraction has just begun)

| # | Source audit | Document located? | Items extracted |
|---|---|---|---|
| 1 | Gemini full verification audit (5 passes) | No file found; incorporate on arrival | 0 |
| 2 | Vision lane set (CV audit, Grok verify-and-improve, counter-review, quality follow-up) | Not located as files; quality-follow-up counts (15 vs 14 shadow records, watch.games=29) known from prompts only | 2 |
| 3 | Wire-everything QA follow-up | Interim only; no final report | 0 |
| 4 | REA audit package | `docs/data-sources/research/2026-10-16/rea_extraction/rea_audit.md` located, not yet read | 2 (flags known from prompt) |
| 5 | AGY Zero-Loss Ledger + two corrections | Not located | 0 |
| 6 | P-18 audit | Not located | 0 |
| 7 | P-19 audit (421 hits / 23 files) | Not located; count from prompt only | 1 |
| 8 | Completeness audits + addendum (G-items) | `00c-completeness-audit.md`, `00d-audit-addendum.md` located, not yet read | 0 |
| 9 | Sweep compilation gap audit | Not located | 0 |
| 10 | arXiv census (3,039 / 781 / 579) | Not located; numbers from prompt only | 1 |
| 11 | Minis ingest findings | Not located | 0 |
| 12 | Jev RUN-REPORT + Hermes emission-gate scorecard | Scorecard located on branch (`reports/emission-gate-eval-*.md`) | 3 |
| 13 | Board reclassification manifest | Not located | 0 |
| 14 | Profile rabbit hole + header capture | Not located | 0 |
| 15 | arXiv extraction set (this session) | Yes, landed `3d821089c`, `1e030d64a` | 7 |

Sources located with content: 5 of 15 partially. The other 10 cannot be extracted until the files are provided. This is a gap in the extraction, listed here, not a disposition.

## Ledger lines

| ID | Item | Source | Evidence pointer | State | Proof / next step / owner |
|---|---|---|---|---|---|
| L-001 | SPACE_API_TOKEN unset, frame endpoint 503 | #2 vision set | HF Space `Beexly/gse-watch-pipeline` | IN MOTION | Secret set 2026-10-17 01:14 CT; 3-way probe: no token 401, wrong 401, right 200 (1x1 test image, not a real frame). Next: first real-frame post from burst job. Owner: Vision lane |
| L-002 | Shadow records 15 vs 14 loaded | #2 | `intelligence/vision/shadow/vision_shadow.jsonl`, commit `9d56b5a7a` | IN MOTION | Reconcile by counting file lines vs `watch.derived_metrics` rows on dev branch `dev-cv-watch-2026-10`. Owner: Vision lane |
| L-003 | watch.games = 29 unexplained | #2 | dev branch `dev-cv-watch-2026-10` | IN MOTION | Query and classify rows. Owner: Vision lane |
| L-004 | REA commit-hash conflict | #4 | `rea_audit.md` | IN MOTION | Settle against `git cat-file`. Owner: QA |
| L-005 | REA unverified secrets-scan claim | #4 | `rea_audit.md` | IN MOTION | Re-run the scan, counts and file names only. Owner: QA |
| L-006 | P-19: 421 credential-pattern hits in 23 files | #7 | prompt only | IN MOTION | Register names/counts only; rotation tracked as items. Owner: Garrett (rotation), QA (register) |
| L-007 | arXiv census: 3,039 files / 781 branches / 579 fully read | #10 | prompt only | IN MOTION | Restate every corpus claim with scope; this session's 133-paper corpus is a different number (curated from two arXiv searches, abstracts only, not fully read). Owner: QA |
| L-008 | Gate arm KILLED on frozen protocol (7 of 9 bars failed; mean -0.1624 units, n=351 of 1,847 test) | #12 | `reports/emission-gate-eval-results-2026-10-16.md` | IN MOTION | Rebuild ranking on independentTrueProb, re-run frozen protocol. Owner: Engine lane |
| L-009 | confidence inverted at top; must not be a ranking input | #12 | `apps/web/app/api/picks/route.ts` still passes `confidence` to `passesPublicSelectiveFilterAsync` | IN MOTION | Remove input in the rebuild. Owner: Engine lane |
| L-010 | Emission-state flag location unknown (`ZERO_OBJECT` not in repo) | #12 | grep of `origin/main` and emission-gate branch | REMAINDER | Flag name/location needed to flip it. Owner: Garrett or Hermes |
| L-011 | arXiv: 7 target papers, 200-result catalog | #15 | `a3b025e4c` | IN MOTION | Cataloged only; no engine registry reads them. Owner: Methods lane |
| L-012 | arXiv: 133-paper corpus, 5-pillar synthesis, compendium | #15 | `3d821089c`, `1e030d64a` | IN MOTION | Abstract-level only; none fully read. Owner: Methods lane |
| L-013 | equations.md §6-7 | #15 | `3d821089c`, `1e030d64a` | IN MOTION | Prose only until implemented. Owner: Methods lane |
| L-014 | Models 11-23 | #15 | `models.md` | IN MOTION | Prose only until implemented. Owner: Methods lane |
| L-015 | 15 shadow tracking records at weight 0.0 on dev branch | #2 | `9d56b5a7a` | IN MOTION | Real data, but only 1 game; extend via burst job. Owner: Vision lane |

Note: L-011 as first written mixed two states; its final state is IN MOTION. No item here is WIRED yet, because none has all four proofs.
