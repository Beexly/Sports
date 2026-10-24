# Alignment features add ~0.01 AUC (ablation)

Follow-up to the pre-snap baseline, but at **play level** (98,579 plays) with defensive alignment as a
signature: counts of every `lined_up_position` value per play, plus formation, alignment, down,
distance, motion, quarter and scores.

- Full model: **AUC 0.7045**, Brier 0.1779 (base 0.2036)
- Same model with **every** `lu_*` alignment column dropped: **AUC 0.6939**, Brier 0.1798

So the entire defensive alignment signature is worth **+0.0106 AUC**. Ten thousandths. That is the
headline and it is not what the literature implies.

## Comparability caveat, stated
The earlier player-level run scored 0.719 but on 275k player-rows; this is play-level on 98.5k plays
with a different feature set. **They are not directly comparable** — player rows weight heavily-used
personnel more. The valid comparison is the ablation *within* this run: 0.7045 vs 0.6939.

## Interpretation
Pre-snap shape (who stands where, in categorical buckets) is nearly redundant once down, distance and
score state are present. The 0.70 ceiling has now survived two feature families. What is left must be
motion-conditional and player-specific — the per-player k-means leverage encoding from the BDB 2025
deck, or actual tracking displacement — not more categorical shape.
