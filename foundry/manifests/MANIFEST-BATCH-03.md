# MOTIF-TIERB-DRAIN-01 -- Batch 03 reconciliation manifest

Producer: Motif fleet (MOTIF-TIERB-DRAIN-01, Garrett's order 2026-11-14). Delivery branch: motif/foundry-tierb-2026-11-14.
book_id = first 16 hex of sha256(str(pdf_size_bytes) + pdf_bytes), the foundry scan-digest formula, computed on the exact file processed.
Every artifact below passed, on Motif's own run: foundry gatekeeper validate() with zero errors, and every verbatim quote verified as a contiguous normalized substring of the extracted text.
All five entered this batch after quote-repair passes (failing quotes replaced with contiguous passages and re-verified). Rasmussen additionally had its book_id re-keyed: the first pass computed the digest over the extracted text file; the id recorded here is the PDF digest.

Refusals recorded since batch 02 (honest, no substitution): Murphy PML Introduction, Cover and Thomas, Wasserman All of Statistics, Billingsley Probability and Measure, Goodfellow Deep Learning, Koller and Friedman PGM, Casella and Berger, Durrett Probability, Efron and Hastie CASI, Haigh Taking Chances, Pearl Causality, Bertsekas DP Vol I. None of these files exist in the VM library copy; if foundry.db holds them PENDING, their files live only on the Windows side.

## fcf3eef1576f7169 -- Graham et al. (IOM), Sports-Related Concussions in Youth (2014)
- source file: library/books-b-medical/GrahamEtAl-2014-SportsRelatedConcussionsInYouth.pdf (3889138 bytes)
- full sha256: 8416e106b31e537c33cd5f2c9326d71bf61cb69c082cb91bd9e6f7ba47e93f4d
- primitives: 35 | think words: 1008 | artifact bytes: 73533
- verification: gatekeeper PASS; quotes 35/35; book_id matches PDF digest

## e04321889fc2e663 -- Bronstein et al., Geometric Deep Learning (2021)
- source file: library/books-d-models/BronsteinEtAl-2021-GeometricDeepLearning.pdf (45092403 bytes)
- full sha256: dcf8212ed37db9ac154ac975b8f9c7d36831cf56b75261679b04ab9814985fc2
- primitives: 33 | think words: 1057 | artifact bytes: 71823
- verification: gatekeeper PASS; quotes 33/33; book_id matches PDF digest

## 08518cdeed8dfc2d -- Rasmussen & Williams, Gaussian Processes for Machine Learning (2006)
- source file: library/books-must-have/RasmussenWilliams-2006-GaussianProcessesForMachineLearning.pdf (4052292 bytes)
- full sha256: 20355ed64b3df27c4477850dd5fcff8bfc25f56dcde043dbd08d1e5d5582db25
- primitives: 35 | think words: 1049 | artifact bytes: 81508
- verification: gatekeeper PASS; quotes 35/35; book_id matches PDF digest

## 3884daedb59e27b3 -- Clemente & Sarmento (eds.), Fitness in Team Sports (2022)
- source file: library/books-a-sports/Clemente-Sarmento-2022-Fitness-Assessment-Monitoring-Training-Team-Sports-MDPI.pdf (29071266 bytes)
- full sha256: 426eb162633637b513cd5e2aea811ca9885ed98084210783af0b80eef42c87b4
- primitives: 30 | think words: 1003 | artifact bytes: 69252
- verification: gatekeeper PASS; quotes 30/30; book_id matches PDF digest

## 9fd0285d2feab6ee -- Hopcroft & Ullman, Introduction to Automata Theory, Languages, and Computation (1979)
- source file: library/books-must-have/HopcroftUllman-1979-AutomataTheoryLanguagesComputation.pdf (268023869 bytes)
- full sha256: e24cd3c55c98f29bf54044d077e697dc445af982702beb1b996c63f7a4a4aeaf
- primitives: 35 | think words: 983 | artifact bytes: 71800
- verification: gatekeeper PASS; quotes 35/35; book_id matches PDF digest

Batch total: 5 books, 168 primitives. Running drain total: 20 books, 685 primitives (batches 01-03).