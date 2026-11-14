# MOTIF-TIERB-DRAIN-01 -- Batch 02 reconciliation manifest

Producer: Motif fleet (MOTIF-TIERB-DRAIN-01, Garrett's order 2026-11-14). Delivery branch: motif/foundry-tierb-2026-11-14.
book_id = first 16 hex of sha256(str(pdf_size_bytes) + pdf_bytes), the foundry scan-digest formula, computed on the exact file processed.
Every artifact below passed, on Motif's own run: foundry gatekeeper validate() with zero errors, and every verbatim quote verified as a contiguous normalized substring of the extracted text.
NASEM entered this batch after a quote-repair pass (8 quotes replaced with contiguous passages, re-verified 35/35).

Refusals recorded this batch (honest, no substitution attempted): Pearl, Causality 2ed -- file absent from the local library; Bertsekas, Dynamic Programming and Optimal Control Vol I 4ed -- assigned edition absent (other Bertsekas works present and being processed separately). If foundry.db holds these PENDING, their files were not reachable from the Motif VM library copy.

## 844edea160b0f5c9 -- Murphy, Probabilistic Machine Learning: Advanced Topics (2023)
- source file: library/books-d-models/Murphy-2023-ProbabilisticMachineLearningAdvancedTopics.pdf (151421194 bytes)
- full sha256: 54d6bfa8cc4a367bb553bea1c5127ca63696a9655b2ca1f6137a8584dccfdbaf
- primitives: 35 | think words: 1039 | artifact bytes: 83187
- verification: gatekeeper PASS; quotes 35/35; book_id matches PDF digest

## b4a2a7351d2588a1 -- NASEM, Traumatic Brain Injury: A Roadmap for Accelerating Progress (2022)
- source file: library/books-b-medical/NASEM-2022-TraumaticBrainInjury-RoadmapForAcceleratingProgress.pdf (9915941 bytes)
- full sha256: c8fc50449857efb5262c08cce3b45c2cb133545eccbd191bc41b4878378c6872
- primitives: 35 | think words: 1007 | artifact bytes: 71816
- verification: gatekeeper PASS; quotes 35/35; book_id matches PDF digest

## 7fc5eb82705f556e -- Von Neumann & Morgenstern, Theory of Games and Economic Behavior (1944)
- source file: library/books-must-have/VonNeumannMorgenstern-1944-TheoryOfGamesAndEconomicBehavior.pdf (33143357 bytes)
- full sha256: b4aa8a3e667bfa9759126df2b9305ee35a677a486141efafd4d0fe48b37d9f07
- primitives: 33 | think words: 907 | artifact bytes: 65394
- verification: gatekeeper PASS; quotes 33/33; book_id matches PDF digest

## 48a955c72873ccf6 -- Devroye, Non-Uniform Random Variate Generation (1986)
- source file: library/books-must-have/Devroye-1986-NonUniformRandomVariateGeneration.pdf (40610306 bytes)
- full sha256: 96dfe6033ce51879f8cac18ad807951c976f0ba2982c946e4cb54c33f8c06925
- primitives: 35 | think words: 962 | artifact bytes: 88220
- verification: gatekeeper PASS; quotes 35/35; book_id matches PDF digest

## 026d30fb53c6e2d0 -- Hernan & Robins, Causal Inference: What If (2020)
- source file: library/books-d-models/HernanRobins-2020-CausalInferenceWhatIf.pdf (11315465 bytes)
- full sha256: a1067af923e9156bb95fbe4b0d18699bd0723e9c902bdc74465cf7782820b1b5
- primitives: 38 | think words: 937 | artifact bytes: 84431
- verification: gatekeeper PASS; quotes 38/38; book_id matches PDF digest

## ab13317c6764ea96 -- Keynes, A Treatise on Probability (1921)
- source file: library/books-must-have/Keynes-1921-TreatiseOnProbability.pdf (30606577 bytes)
- full sha256: a0d23785d26ae06b08ca016556f33aa0767bb207e8534a0b7b1b479b417403f9
- primitives: 35 | think words: 997 | artifact bytes: 81934
- verification: gatekeeper PASS; quotes 35/35; book_id matches PDF digest

Batch total: 6 books, 211 primitives. Running drain total: 15 books, 517 primitives (batches 01+02).