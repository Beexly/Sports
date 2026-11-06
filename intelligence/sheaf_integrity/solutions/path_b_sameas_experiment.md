# Path B — CRC as GraphRAG same-as pre-filter

## Hypothesis
Structural same-as edges should be **blocked from retrieval**. Reduces identity-merge hallucinations vs string-equality baseline.

## Protocol
1. Graph: nodes = entity mentions; edges = proposed same-as
2. Run ontology_hygiene_report
3. Policy: structural → block; statistical → allow + realign flag; consistent → allow
4. Metrics: precision@identity, false merge rate vs baseline

## Kill criteria
No lift vs string-equality baseline → park Path B.

## Non-coupling
No sports. No GNN. No learned maps.
