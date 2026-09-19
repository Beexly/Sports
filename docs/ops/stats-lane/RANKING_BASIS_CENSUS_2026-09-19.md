# Ranking-basis census + v5.2.7 version-fixed ordering (2026-09-19)

Export n=3261 · basis={'independent_trueProb': 846, 'blend_indep_conf': 271, 'confidence': 662, 'confidence_only_no_rankingP': 1482}

CONFIRMED: confidence_only rows exist only on v5.0.0, v5.1.0

## v5.2.7 settled with rankingP+marketFairProb

### rankingSource=confidence n=452
- pool hit 0.5464601769911505 Wilson [0.5003648667134861, 0.5917724020219695]
- top-decile rankingP 0.5333333333333333 n=45 Wilson [0.3907720886241046, 0.6706509605798527] base=0.5464601769911505
- top-decile marketFairProb 0.8888888888888888 Wilson [0.7650062450910905, 0.9515959956217445]
- top-decile rankP vs mfp intervals: SEPARATE

### rankingSource=blend_indep_conf n=259
- pool hit 0.528957528957529 Wilson [0.46818667748410975, 0.5888819143978452]
- top-decile rankingP 0.56 n=25 Wilson [0.37067017019564436, 0.7333462505299744] base=0.528957528957529
- top-decile marketFairProb 0.88 Wilson [0.7004380781662651, 0.9583325864293191]
- top-decile rankP vs mfp intervals: OVERLAP

## Pending board (this export)

{'independent_trueProb': 46, 'blend_indep_conf': 11, 'confidence': 163}
None

## Kill lines

- Ordering duel only within one modelVersion
- Overlap => say THEY OVERLAP; do not name a winner
- Do not pool rankingSource=confidence with independent_trueProb
- Live pending board includes confidence-source rows — report both sources
