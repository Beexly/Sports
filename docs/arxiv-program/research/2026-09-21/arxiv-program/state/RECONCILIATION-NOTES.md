## 2026-09-21 covered-ID reconciliation
- existing-research-map.md contains 64 unique arXiv IDs (earlier "63" was an extraction miscount).
- 42 of the 64 are in the 865-paper sweep corpus -> correctly excluded from manifest-500.
- The remaining 22 were never in the corpus, so no manifest action was needed for them.
- 10 pilot IDs additionally excluded (ledgers 0001-0010 already exist).
- Reserve: 97 eligible papers remain after manifest selection (from 597 non-score-0, non-covered, non-pilot candidates); reserve-100.jsonl holds all 97. A true 100-row reserve would require new candidates or changed exclusions.
- Tracker phantom-completion bug fixed: manifest 41-50 (group4, failed batch) had been wrongly marked completed; reset to pending.
