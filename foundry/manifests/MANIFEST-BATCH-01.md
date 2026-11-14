# MOTIF-TIERB-DRAIN-01 -- Batch 01 reconciliation manifest

Producer: Motif fleet (MOTIF-TIERB-DRAIN-01, Garrett's order 2026-11-14). Delivery branch: motif/foundry-tierb-2026-11-14.
book_id = first 16 hex of sha256(str(pdf_size_bytes) + pdf_bytes), the foundry scan-digest formula, computed on the exact file processed.
Every artifact below passed, on Motif's own run: foundry gatekeeper validate() with zero errors, and every verbatim quote verified as a contiguous normalized substring of the extracted text.

## fd46bd843c84e705 -- Fujii, Machine Learning in Sports (2025)
- source file: library/books-a-sports/Fujii-2025-Machine-Learning-in-Sports-Springer.pdf (5220994 bytes)
- full sha256: 73ad87f129145744dcd9d205f41fff59f898fe42e318222457eb65b69c4d4008
- primitives: 28 | think words: 995 | artifact bytes: 62582
- verification: gatekeeper PASS; quotes 28/28; book_id matches PDF digest

## 636fb9f30380efe6 -- Sutton & Barto, Reinforcement Learning: An Introduction, 2ed (2018)
- source file: library/books-d-models/SuttonBarto-2018-ReinforcementLearningIntroduction.pdf (73129769 bytes)
- full sha256: 2dd0d71d9ee883fbeb99f9b888c65ac3255fae2512203d11b18e838befffe9a6
- primitives: 33 | think words: 1108 | artifact bytes: 74324
- verification: gatekeeper PASS; quotes 33/33; book_id matches PDF digest

## 15452dc5f38ae30a -- Congelio, Introduction to NFL Analytics with R (2023)
- source file: library/books-a-sports/Congelio-2023-Introduction-to-NFL-Analytics-with-R.pdf (43266760 bytes)
- full sha256: f132e5185303be0118b5e8930d38db1291f1a9768af262855c39190d9bddb8d1
- primitives: 35 | think words: 1064 | artifact bytes: 76166
- verification: gatekeeper PASS; quotes 35/35; book_id matches PDF digest

## fcd01817529b6806 -- Prince, Computer Vision: Models, Learning, and Inference (2012)
- source file: library/books-d-models/Prince-2012-ComputerVisionModelsLearningAndInference.pdf (51437626 bytes)
- full sha256: cf9505604662916c419ad7b159d9fbb8e44cdab88015bd12cf8872f59596c3ef
- primitives: 35 | think words: 922 | artifact bytes: 80389
- verification: gatekeeper PASS; quotes 35/35; book_id matches PDF digest

## 46e377123f662ec5 -- Peyre & Cuturi, Computational Optimal Transport (2019)
- source file: library/books-must-have/PeyreCuturi-2019-ComputationalOptimalTransport.pdf (42429657 bytes)
- full sha256: 5292a1fc53631ac28fdbcccecc060de8e072b3008fb8d36c22d963a8f6a06bac
- primitives: 35 | think words: 1016 | artifact bytes: 93545
- verification: gatekeeper PASS; quotes 35/35; book_id matches PDF digest

## 8dfdb8ea7ef78b30 -- Lattimore & Szepesvari, Bandit Algorithms (2020)
- source file: library/books-must-have/LattimoreSzepesvari-2020-BanditAlgorithms.pdf (5400750 bytes)
- full sha256: b71acb03034d73ca0ea148c9c6a91c34a88dd8c7ab8471af38035b34399bad9f
- primitives: 35 | think words: 981 | artifact bytes: 91187
- verification: gatekeeper PASS; quotes 35/35; book_id matches PDF digest

## a465f45c94709a31 -- Arora & Barak, Computational Complexity (2009)
- source file: library/books-must-have/AroraBarak-2009-ComputationalComplexity.pdf (4572986 bytes)
- full sha256: da0881782a35bde6a0779a2eb1a8d480f39fbddf70bbb92824d1dc5550a033b2
- primitives: 35 | think words: 964 | artifact bytes: 79158
- verification: gatekeeper PASS; quotes 35/35; book_id matches PDF digest

## 709226a7be2f8de6 -- Gelman et al., Bayesian Data Analysis, 3ed (2013)
- source file: library/books-must-have/GelmanEtAl-2013-BayesianDataAnalysis3.pdf (55911785 bytes)
- full sha256: 246f7d34daad4971d40fa247f1045bf3fce4f912dcea9b4267b161ee7a70b306
- primitives: 35 | think words: 939 | artifact bytes: 87051
- verification: gatekeeper PASS; quotes 35/35; book_id matches PDF digest

## 8fb7570e0a2a06ef -- Boyd & Vandenberghe, Convex Optimization (2004)
- source file: library/books-d-models/BoydVandenberghe-2004-ConvexOptimization.pdf (5793371 bytes)
- full sha256: 61325d6612c8c5ed4d0119575238192b25d480bfcf24838ae4acc86c42873cdf
- primitives: 35 | think words: 937 | artifact bytes: 78709
- verification: gatekeeper PASS; quotes 35/35; book_id matches PDF digest

Batch total: 9 books, 306 primitives.