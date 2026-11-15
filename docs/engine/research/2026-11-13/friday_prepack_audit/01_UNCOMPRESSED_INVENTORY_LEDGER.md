# GSE + GSI Uncompressed Multi-Surface Master Inventory Ledger — 2026-11-13

Generated (UTC): `2026-11-14T00:59:24.642196+00:00` | Zero-Compression, Read-Only Audit (`?mode=ro`, live workers untouched)

## Stage 1A — 4-Branch GCP Sync Unpack & Collision Verification
- Sync loop: `C:\Users\Garrett\Sports\foundry\sync_gcp_4nodes.ps1` (daemon active, 600s interval) -> `C:\Users\Garrett\Sports\foundry\unpack_gcp_4branches.py` (all 4 branches configured: `True`)
- Unpack runner exit code: `0` | `unique_filenames_flat=2157` | `actual_flat_files=2157` | `missing_flat_files=0` | `total_branch_blobs=2215`

| Node | Branch | Commit SHA | Unpacked Blobs (`by_node`) |
|---|---|---|---|
| node1 | `origin/gcp/foundry-shard-b-2026-11-13` | `2d483ab83c904b36dd12109f59c0665750a7f01a` | 873 |
| node2 | `origin/gcp/foundry-node2-2026-11-13` | `c63047fcc2e7a4b7c4d8214f2b20c336757090e8` | 743 |
| node3 | `origin/gcp/foundry-node3-2026-11-13` | `4d12fbc95d0ddbaf2760aa3adc889b834491b281` | 302 |
| node4 | `origin/gcp/foundry-node4-2026-11-13` | `39289dd9ffbdb5147ebd8d85aa136ab62302d9c0` | 297 |

### All `58` Pre-Mod4 Branch Overlaps Preserved Losslessly Under `by_node/` (Node 3 collisions=0, Node 4 collisions=1)
| # | Filename | Winner Node | Winner Words | Winner XML Tags | All Variants (`node:words:sha256[:12]`) |
|---|---|---|---|---|---|
| 1 | `000ebb065c_1505.01462v1.pdf.md` | node2 | 7605 | 5/5 | node2:7605w:be471ab6fee2; node1:3716w:99715a540c3c |
| 2 | `01509c4a9f_1906.04066v1.pdf.md` | node1 | 7267 | 5/5 | node1:7267w:25006bfe0a35; node2:7084w:bf26573089f0 |
| 3 | `081cb559c2_Extending_Power_BI_with_Python_and_R_bibis.ir.pdf.md` | node1 | 7968 | 5/5 | node1:7968w:a0724c3e4aa1; node2:5830w:aedc78a48c4b |
| 4 | `0cd756909e_10.1201_9781003364320_previewpdf.pdf.md` | node2 | 8786 | 5/5 | node2:8786w:3bd866f4a0df; node1:5431w:cba432d0e7ad |
| 5 | `1045461bfb_2511.00261v2.pdf.md` | node2 | 9259 | 5/5 | node2:9259w:f778328541a0; node1:5286w:881472d4f706 |
| 6 | `2124e9fbe3_2606.05966v1.pdf.md` | node1 | 7563 | 5/5 | node1:7563w:128f380a1000; node2:6136w:d3e3bbc45b1f |
| 7 | `21e10e1f61_2603.26575v1.pdf.md` | node1 | 8806 | 5/5 | node1:8806w:6061dc2e11bd; node2:7222w:d9e2c01444f0 |
| 8 | `22b882028d_2609.01337v1.pdf.md` | node2 | 7249 | 5/5 | node2:7249w:8e4ad9382ef7; node1:5951w:3829bee22026 |
| 9 | `232014a839_ifafrules.pdf.md` | node2 | 10729 | 5/5 | node2:10729w:4841c550930b; node1:5925w:640fbe2145f5 |
| 10 | `23d50a8065_2605.05997v2.pdf.md` | node1 | 7069 | 5/5 | node1:7069w:f843aa4014c3; node2:7033w:22326655cbdd |
| 11 | `24dff9ca8f_1708.06694v2.pdf.md` | node2 | 9433 | 5/5 | node2:9433w:5289103a61f2; node1:7116w:def041f90051 |
| 12 | `24e630a20a_978-3-319-41285-6.pdf.md` | node2 | 8652 | 5/5 | node2:8652w:4707eda62431; node1:4917w:19287d6e19dd |
| 13 | `2d99d62aed_2609.13453v1.pdf.md` | node2 | 7912 | 5/5 | node2:7912w:1b4e11902bf4; node1:5460w:56ae5c87f477 |
| 14 | `311ab61af9_book_9780262374675.pdf.md` | node1 | 5766 | 5/5 | node1:5766w:35b7f7dd5a38; node2:4907w:c88192b37283 |
| 15 | `34fb2c4aa8_2305.01643v2.pdf.md` | node1 | 10169 | 5/5 | node1:10169w:2f200a0ffe9d; node2:9754w:4d81df20efe5 |
| 16 | `38bb7693c8_bws_book_2_.pdf.md` | node1 | 5744 | 5/5 | node1:5744w:35089a63f107; node2:5691w:4b5fff70a1b7 |
| 17 | `3c1781c4e8_2510.19150v1.pdf.md` | node1 | 7944 | 5/5 | node1:7944w:94dfb977c83f; node2:4264w:e1f6c486b16a |
| 18 | `4759286936_2512.24601v3.pdf.md` | node2 | 7312 | 5/5 | node2:7312w:f12172c3c136; node1:6760w:df84eb8e7d6a |
| 19 | `4a3e94d3ab_PVAMU_MSU_FOOTBALL_GAMENOTES_2024.pdf.md` | node2 | 8556 | 5/5 | node2:8556w:361da24b949d; node1:5891w:dcb40d629b19 |
| 20 | `5a6f3925d4_applied-predictive-modeling-max-kuhn-kjell-johnson_1518.pdf.md` | node2 | 10275 | 5/5 | node2:10275w:4165d2d792ce; node1:5829w:4fb6e4aa30de |
| 21 | `5bf56e566f_2601.11492v2.pdf.md` | node2 | 8001 | 5/5 | node2:8001w:cca04f3d6c6c; node1:3927w:d897919be153 |
| 22 | `5ca8695d28_9789819614455.pdf.md` | node1 | 9077 | 5/5 | node1:9077w:299c2da2a620; node2:8296w:141cf1801eb8 |
| 23 | `5f14f376b0_2401.00649v2.pdf.md` | node2 | 4517 | 5/5 | node2:4517w:1df88b25ebd4; node1:4506w:397b8524d874 |
| 24 | `628dec66f5_GT_book.pdf.md` | node2 | 7748 | 5/5 | node2:7748w:f0a027ff3802; node1:3901w:eb24ac35e448 |
| 25 | `62ea6701b4_mlgm_epfl_book.pdf.md` | node1 | 5811 | 5/5 | node1:5811w:a3cb28a8b24b; node2:3967w:459889ce82ac |
| 26 | `6d6eb7c687_2603.25901v1_1_.pdf.md` | node2 | 5817 | 5/5 | node2:5817w:7e8d767cfb4a; node1:5568w:cbde63d4fabc |
| 27 | `6df8151157_NFL_Football_-_Playbook.pdf.md` | node1 | 8997 | 5/5 | node1:8997w:4c5e9f40b27b; node2:6357w:a162fd9a67ad |
| 28 | `79f317bbf8_2204.00003v3.pdf.md` | node1 | 8735 | 5/5 | node1:8735w:02abb8adfeac; node2:5107w:d6f71bb17f07 |
| 29 | `82d7c37e12_2604.27865v1.pdf.md` | node1 | 9733 | 5/5 | node1:9733w:50d59e7f4df7; node2:8692w:b617d2091a95 |
| 30 | `8685fcb60a_Robert_Kissell_2017.pdf.md` | node1 | 8010 | 5/5 | node1:8010w:edc73ba67dd7; node4:5535w:51da15ed1f88 |
| 31 | `8b98159f37__OceanofPDF.com_Introduction_to_Recursive_Programming_-_Manuel_Rubio-Sanchez.pdf.md` | node1 | 7967 | 5/5 | node1:7967w:fef5d757e179; node2:3932w:816c18cb520e |
| 32 | `8cd094a90d_2602.02979v3.pdf.md` | node2 | 8069 | 5/5 | node2:8069w:82b81240c2b4; node1:5140w:424b3a8ff96d |
| 33 | `92102fcc19_2602.08996v1.pdf.md` | node2 | 6265 | 5/5 | node2:6265w:6a0e45fcf806; node1:6114w:907d4639aefd |
| 34 | `974530f0c6_Concussion_PDF.pdf.md` | node2 | 6122 | 5/5 | node2:6122w:e7093942c338; node1:4125w:e632911fb4a4 |
| 35 | `98d5e2e8a7_2605.14855v1.pdf.md` | node2 | 5686 | 5/5 | node2:5686w:321139ec0ba2; node1:4965w:c48378fc9514 |
| 36 | `9bbfe908a4_2406.19563v2_1_.pdf.md` | node1 | 9773 | 5/5 | node1:9773w:10f09b7d6c32; node2:8627w:02dadd3e6b77 |
| 37 | `a3de879972_ai4all.pdf.md` | node1 | 8242 | 5/5 | node1:8242w:8057657854ec; node2:3384w:8cb839c90b2b |
| 38 | `a5600e2c62_2609.28049v1.pdf.md` | node2 | 10260 | 5/5 | node2:10260w:6cda98ac54eb; node1:6628w:3f1a63cb50f8 |
| 39 | `a718683af5_32263160.pdf.md` | node2 | 6803 | 5/5 | node2:6803w:a7f807b6210a; node1:5801w:14ef67c992d3 |
| 40 | `a9156f88ef_mcs.pdf.md` | node2 | 8839 | 5/5 | node2:8839w:02db5bc7a2cc; node1:1576w:adf681e9d48b |
| 41 | `b12f5f61bc_Advanced_AI_Architectures_for_Engineering_Innovation.pdf.md` | node2 | 9918 | 5/5 | node2:9918w:f52b2576fa9b; node1:9147w:435a0696bfb6 |
| 42 | `b1ceea385e_16678907951_1_.pdf.md` | node1 | 8330 | 5/5 | node1:8330w:83707cde97fa; node2:6904w:5184c87aa7dd |
| 43 | `b705384f38_2608.21381v1.pdf.md` | node2 | 9950 | 5/5 | node2:9950w:5bfa5d3ca203; node1:7013w:8ce9df457925 |
| 44 | `bc5069abec_2105.09506v1.pdf.md` | node2 | 7983 | 5/5 | node2:7983w:5496564a62cc; node1:2471w:5b5bddbc6465 |
| 45 | `be0f684b59_814578.pdf.md` | node2 | 8327 | 5/5 | node2:8327w:3ed5a83a9bb3; node1:7890w:4d980c6f917b |
| 46 | `c22d517e45_2512.15386v1.pdf.md` | node1 | 7503 | 5/5 | node1:7503w:b7e7d8184a7a; node2:6607w:dd67b80609fe |
| 47 | `c3a22ffdff_advanced-engineering-mathematics_by-erwin-kreyszig-__10th_edition-1_1_.pdf.md` | node1 | 7294 | 5/5 | node1:7294w:a1950dd5c76f; node2:6258w:f197232445a2 |
| 48 | `c4386dc83e_qt5qw5382d_noSplash_983c1629d166d6b046b4a2d65e75e816.pdf.md` | node1 | 9600 | 5/5 | node1:9600w:e6cdf626d2de; node2:2855w:d5474941e6b3 |
| 49 | `c5fe68815a_2303.11174v2.pdf.md` | node1 | 8152 | 5/5 | node1:8152w:bc972a6275b4; node2:6626w:2ddab4491dcf |
| 50 | `c8ec997481_1512.06808v1.pdf.md` | node1 | 8636 | 5/5 | node1:8636w:bcb70e410416; node2:7829w:8d665593cdae |
| 51 | `cd5f21c15d__OceanofPDF.com_Ultimate_Step_by_Step_Guide_to_Machine_Lea_-_Daneyal_Anis.pdf.md` | node1 | 8831 | 5/5 | node1:8831w:c17f44768ceb; node2:5807w:e58a61a88bfa |
| 52 | `cd966a5df8_2509.05913v3.pdf.md` | node1 | 9313 | 5/5 | node1:9313w:fbf35a93815b; node2:5981w:b45629ef49a8 |
| 53 | `d4a5de2a09_2509.21673v1.pdf.md` | node1 | 5581 | 5/5 | node1:5581w:4ade6f9d5ab5; node2:5125w:3235640393c7 |
| 54 | `dd12d76495_2403.12977v3.pdf.md` | node2 | 7590 | 5/5 | node2:7590w:cc12938182d6; node1:6821w:35940c1bfb33 |
| 55 | `ec9d92d401_2604.08885v1.pdf.md` | node1 | 8317 | 5/5 | node1:8317w:24d38867287c; node2:6920w:a8c2caa67005 |
| 56 | `f0c8dd125c_2510.12323v1_1_.pdf.md` | node1 | 7715 | 5/5 | node1:7715w:855a7853adb7; node2:6998w:563f2d271b5b |
| 57 | `f7b7784e43_bitstream_59010.pdf.md` | node2 | 7949 | 5/5 | node2:7949w:752275a7e889; node1:7627w:8c666d49f851 |
| 58 | `f93881361f_file_1726508125ivhrv.pdf.md` | node1 | 6651 | 5/5 | node1:6651w:5c1845b180df; node2:4548w:f8a6aeade0c1 |

## Stage 1B — Local Hermes Sovereign Foundry Accounting (`foundry.db?mode=ro`)
- `corpus_queue` total rows: `17248` | `primitives` table rows: `633` | `reasoning_traces` table rows: `152`
- Status counts: `{"DELEGATED_GCP": 8599, "PENDING": 8416, "QUARANTINED": 132, "COMPLETE": 79, "INSUFFICIENT_SOURCE_ACCESS": 9, "DUPLICATE_WORK": 8, "INSUFFICIENT_OCR": 4, "CLAIMED": 1}`

### `corpus_queue` Full Status x Shard x Extension Breakdown
| Status | Shard | Extension | Count |
|---|---|---|---|
| CLAIMED | shard_a_0_7 | `.pdf` | 1 |
| COMPLETE | shard_a_0_7 | `.pdf` | 75 |
| COMPLETE | shard_b_8_f | `.pdf` | 4 |
| DELEGATED_GCP | shard_b_8_f | `.md` | 4278 |
| DELEGATED_GCP | shard_b_8_f | `.pdf` | 1363 |
| DELEGATED_GCP | shard_b_8_f | `.tex` | 6 |
| DELEGATED_GCP | shard_b_8_f | `.txt` | 2952 |
| DUPLICATE_WORK | shard_a_0_7 | `.pdf` | 8 |
| INSUFFICIENT_OCR | shard_a_0_7 | `.pdf` | 4 |
| INSUFFICIENT_SOURCE_ACCESS | shard_a_0_7 | `.pdf` | 8 |
| INSUFFICIENT_SOURCE_ACCESS | shard_b_8_f | `.pdf` | 1 |
| PENDING | shard_a_0_7 | `.md` | 4295 |
| PENDING | shard_a_0_7 | `.pdf` | 1288 |
| PENDING | shard_a_0_7 | `.tex` | 8 |
| PENDING | shard_a_0_7 | `.txt` | 2825 |
| QUARANTINED | shard_a_0_7 | `.md` | 25 |
| QUARANTINED | shard_a_0_7 | `.pdf` | 6 |
| QUARANTINED | shard_a_0_7 | `.txt` | 36 |
| QUARANTINED | shard_b_8_f | `.md` | 29 |
| QUARANTINED | shard_b_8_f | `.pdf` | 5 |
| QUARANTINED | shard_b_8_f | `.txt` | 31 |

### Vision OCR & Swarm Telemetry (`foundry/logs/*`)
| Log File | Bytes | Lines | TTFT > 15s | HTTP 413 | Circuit Cooldown | Throughput < 25 tok/s |
|---|---|---|---|---|---|---|
| `ling_extract_run1.log` | 186 | 2 | 1 | 0 | 0 | 0 |
| `ling_extract_run2.log` | 186 | 2 | 1 | 0 | 0 | 0 |
| `ling_extract_run3.log` | 154 | 2 | 1 | 0 | 0 | 0 |
| `ling_lane.log` | 1079 | 12 | 3 | 1 | 1 | 1 |
| `ling_ocr_run1.log` | 175 | 2 | 0 | 1 | 0 | 0 |
| `ling_ocr_run2.log` | 190 | 2 | 0 | 0 | 1 | 0 |
| `ling_ocr_run3.log` | 188 | 2 | 0 | 0 | 0 | 1 |
| `swarm_status.md` | 59268 | 467 | 3 | 1 | 1 | 1 |

### All `98` Sovereign Primitive Books (`foundry/artifacts/primitives/*.json`)
| # | Book ID | File / Title | Domain | Tier | Era Layer | Pages | Page Offset Note | Prims | Bet Hits | Toy Hits | Source / Limitation Disclosure | Commit SHA & TS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `0414b2bd02f58929` | 2025-NFL-Record-and-Fact-Book | football | A | football | 842/842 | 1_based_pdf_assumed | 6 | 0 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 2 | `07089dec6f73619e` | Wilce-1923-Football-How-to-Play-It-and-How-to-Understand-It | football | A | football | 276/276 | printed page numbers run about 12 lower) | 8 | 1 | 0 | J. W. Wilce, M.D., Football: How to Play It and How to Understand It (Charles Scribner's Sons, 1923); author was head football coach at Ohio State University. Internet Archive scan (isobn_9781258229580), 276 PDF pages, all read in full chunks; pages 275-276 blank. Page citations are 1-based PDF page numbers (the book's printed page numbers run about 12 lower). Page-1 retraction check: none; no retraction markers anywhere; no betting/odds content. OCR defects quarantined (no primitives built on them): 'Copyeicut'/'Amenca' (p. 4), 'towch-down' (p. 15), 'CHAPLE RANI' for Chapter VI (p. 82), mirrored plate captions (e.g. pp. 37, 65), footnote 'too yards' for 100 (p. 71), garbled signal examples '2¢-7-14-6' and '2/-g-15-3' (p. 229), 'o~-20-yard line' (p. 235). Verbatim quotes preserve source hyphenation artifacts ('stand- points', p. 243) and em-dashes exactly as whitespace-normalized. All LaTeX are explicitly labeled formalizations of printed prose rules; the source contains no equations. Rule statements are 1923-era and must not be read as modern NFL rules. | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 3 | `090cfc0da55b02cd` | Computational and Mathematical Methods in Medicine - 2022 - Chang - The Application of Transcranial Electrical Stimulation | math | A | math | 11/11 | 1_based_pdf_assumed | 5 | 4 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 4 | `0a31ef31857e287d` | PVAMU_MSU_FOOTBALL_GAMENOTES_2024 | football | A | football | 23/23 | 1_based_pdf_assumed | 6 | 1 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 5 | `0c444afcd300d1c3` | Special_Issue_Traumatic_Brain_InjuryChronic_Trauma | psych | A | psych | 3/3 | 1_based_pdf_assumed | 4 | 0 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 6 | `102f952911d380f9` | andrew-ng-machine-learning-yearning | cs | A | cs | 118/118 | 1_based_pdf_assumed | 6 | 1 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 7 | `10c8c515e69e40f4` | Zuppke-1922-Football-Technique-and-Tactics | football | A | football | 184/184 | Printed page numbers run 14 behind PDF pages (PDF 15 = printed | 6 | 1 | 0 | Robert C. Zuppke, Football Technique and Tactics, first edition, Copyright 1922, Zuppke and Bearg, Urbana, Illinois (title page PDF 7). Internet Archive scan with OCR text layer; full 184-page chunked read (17 near-empty pages are plates/endpapers, inspected). Page-1 retraction check: none — cover OCR noise only, no publisher notice. QUALITATIVE SOURCE: zero printed equations; all LaTeX is explicitly labeled predicate-logic formalization of printed prose rules. Printed page numbers run 14 behind PDF pages (PDF 15 = printed 1); citations use PDF pages. OCR artifacts preserved verbatim in quotes ('vards' for yards, hyphenated line breaks 'terri- tory', 'comple- tion', 'un- less', 'antici- pated'). Printed numbers used as printed historical data only: 1921 Big Ten game statistics (PDF 157-161), zone depths, 'forty vards' exchange ideal. No modern measurements invented; no sportsbook odds anywhere. | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 8 | `118c462e78e37fa7` | Daume-2017-CourseInMachineLearning | cs | A | cs | 227/227 | 1_based_pdf_assumed | 4 | 3 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 9 | `13afe72d1ef6bdbd` | WHITEPAPER_DITO_Quantum_computing_guide_navigating_future_2024 | physics | A | physics | 105/105 | 1_based_pdf_assumed | 7 | 0 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 10 | `1498481931694bd8` | Szepesvari-2010-AlgorithmsForReinforcementLearning | cs | A | cs | 98/98 | printed page | 18 | 1 | 0 | Csaba Szepesvari, 'Algorithms for Reinforcement Learning', Synthesis Lectures on Artificial Intelligence and Machine Learning, Morgan & Claypool Publishers (draft June 2009, published 2010). 98-page PDF read in full (MDP/Bellman ch2, TD/TD(lambda)/function-approx ch3, control/bandits/Q-learning ch4). Legitimate readable monograph, not retracted, title matches content. Local SHARD A (sha256 prefix 1). All verbatim quotes verified exact substrings of the extracted text after ligature/quote/whitespace normalization; cites by section + printed page. Zero sportsbook odds; this is the RL/MDP decision layer governing GSE's play-call engine, complementing the online (4d07e5902607436f) and batch/PAC (5b79f17544fe148c) layers. | `4fb3a9b0b8c3` 2026-11-13T18:09:48-06:00 |
| 11 | `160c2b78da096e4b` | ModelTrainingandOptimization | cs | A | cs | 6/6 | 1_based_pdf_assumed | 0 | 0 | 0 | status=INSUFFICIENT_SOURCE_ACCESS extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 12 | `17150554536af787` | James-1890-PrinciplesOfPsychology-Vol2 | psych | A | psych | 1/726 | 1_based_pdf_assumed | 0 | 0 | 0 | status=INSUFFICIENT_OCR extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 13 | `192267e30813837d` | MohriRostamizadehTalwalkar-2018-FoundationsOfMachineLearning2 | cs | A | cs | 505/505 | 1_based_pdf_assumed | 6 | 4 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 14 | `1976064dcffc0e42` | Predicting_NFL_Point_Spreads_via_Machine_Learning | cs | A | cs | 18/18 | 1_based_pdf_assumed | 5 | 10 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 15 | `1a04a74c1cd2528c` | MavroudisCiobica-2025-TraumaticBrainInjury-RecentAdvancesAndChallenges | psych | A | psych | 190/190 | none_disclosed | 6 | 1 | 0 | Full 190-page chunked read completed (pymupdf text layer; no OCR needed). Page-1 and whole-text scan found NO retraction or expression-of-concern markers. Title matches content; original IntechOpen edited volume, not a derivative AI summary. Editorial defects quarantined (no primitives built on them): (a) Ch.2 PDF p.26 swaps GCS severity labels (calls GCS 13-15 'moderate' and 9-12 'mild'); (b) Ch.6 PDF p.122 Lip-1 prose inverts the mechanism ('inhibition of xCT or inactivation of GPX4' would INDUCE ferroptosis), and PDF p.123 polydatin prose ('increase MDA ... reduce GPX4') contradicts its own Table 1 (down-MDA, up-GPX4); (c) Ch.6 §4.2.4 mislabels 'Posttraumatic epilepsy' as a type of hydrocephalus; (d) Reynolds perspective chapters (1, 8) misclassify Strattera as an antipsychotic, write 'chronic traumatic encephalitis' for encephalopathy, and overclaim TBI is 'always neurodegenerative', contradicting Ch.4's favorable-outcome consensus. Extracted kernels come only from the internally consistent core (Ch.2 ICP/CPP management, Ch.4 neurometabolic cascade, Ch.6 Fenton/System Xc- biochemistry, Ch.9 compliance/urodynamics). Balanced stoichiometric LaTeX and the CPP=MAP-ICP identity and Na/K-pump 3:2:1 ratio are flagged in ledgers as canonical formalizations or external standard context where the source states them only in prose or not at all. All Layer-2 telemetry honestly LATENT_UNIDENTIFIABLE. | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 16 | `1cfd792f9b7396d1` | VaibhavAhluwaliaGaurEds-2023-BrainInjuryNeurodegeneration-MolecularFunctionalTranslational-MDPI | psych | A | psych | 138/430 | 1_based_pdf_assumed | 5 | 1 | 0 | status=COMPLETE extractor=qwen4-max-preview (worker ext-37) | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 17 | `1d16023dfb5cb925` | The Essential Smart Football PDF | football | A | football | 192/192 | 1_based_pdf_assumed | 0 | 0 | 0 | status=INSUFFICIENT_SOURCE_ACCESS extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 18 | `1eb756d93ff49446` | Hull-1943-PrinciplesOfBehavior | psych | A | psych | 0/428 | 1_based_pdf_assumed | 0 | 0 | 0 | status=INSUFFICIENT_OCR extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 19 | `203aeb745b1aed40` | A-Course-in-Machine-Learning | cs | A | cs | 189/189 | 1_based_pdf_assumed | 5 | 1 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 20 | `21544db09ed29308` | Drafting strategies in fantasy football A study of competitive sequential human decision making | football | A | football | 29/29 | 1_based_pdf_assumed | 7 | 1 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 21 | `24164ab251a21dbe` | The Essential Smart Football PDF | football | A | football | 192/192 | 1_based_pdf_assumed | 0 | 0 | 0 | status=INSUFFICIENT_SOURCE_ACCESS extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 22 | `2435ddad2e0ddd16` | ZhouEd-2019-TBI-NeurobiologyDiagnosisAndTreatment | psych | A | psych | 170/170 | 1_based_pdf_assumed | 6 | 0 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 23 | `24cd6351f8d171a6` | andrew-ng-machine-learning-yearning | cs | A | cs | 118/118 | 1_based_pdf_assumed | 5 | 4 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 24 | `25294936f511d828` | Playfair-Data-NFL-Visual-Analytics-Consulting-Case-Study | football | A | football | 24/24 | 1_based_pdf_assumed | 6 | 5 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 25 | `2626db0663ce780e` | 05-x-strategy | history | A | history | 8/8 | 1_based_pdf_assumed | 6 | 5 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 26 | `28ced3431e66ee6f` | learn-to-code-with-fantasy-football | football | A | football | 276/276 | 1_based_pdf_assumed | 6 | 2 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 27 | `29a9a56fe196f2f2` | Camp-1894-Football-Facts-and-Figures | football | A | football | 262/262 | 1_based_pdf_assumed | 5 | 0 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 28 | `2d97f3a1f7fad21e` | NCAA-1922-Official-Football-Guide-Rules-and-Record-Book | football | A | football | 424/424 | none_disclosed | 6 | 2 | 0 | Primary historical source: Spalding's Official Foot Ball Guide / NCAA Official Foot Ball Rules 1922, ed. Walter Camp; Internet Archive scan officialnational07nation, 424 PDF pages, real OCR text layer (~958k chars, 19 near-empty pages). Not retracted (p.1 library mark, p.2 copyright deposit). Full text of all 424 pages extracted programmatically; deep sovereign core-read on the official rules code (PDF pp.355-424); surrounding season reviews/rosters/records/ads scanned at text level. OCR defects preserved verbatim in quotes and quarantined in per-primitive source_note: '160 leet'/'bide Lines'/'bevond' (p.363), dropped forfeit zero '1 to in favor' (p.367), marginal-header interleaving 'a 4 downs. m team' (p.392), stray period 'when the . ball' (p.373). Predicate-logic LaTeX fields are explicit formalizations of printed prose rules, not printed equations. | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 29 | `2ec4f6881728fa8b` | MoerlandEtAl-2023-ModelBasedReinforcementLearning-SurveyMonograph | cs | A | cs | 67/67 | 1_based_pdf_assumed | 6 | 3 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 30 | `3178b5fdce0fc1a5` | Football Analytics with Python and R_bibis.ir | football | A | football | 352/352 | 1_based_pdf_assumed | 6 | 5 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 31 | `32d8b2d0d4f7f22f` | Rockne-1925-Coaching-The-Way-of-the-Winner | football | A | eighth primary source, 1894-1925 | 264/294 | PDF page = printed page + 22 (printed p150 = PDF p172) | 14 | 1 | 0 | Library scan (barcode 3 3540 00023 1976; call number 796.33207 R592c, p293). PDF page = printed page + 22 (printed p150 = PDF p172); all citations are PDF pages. Read pp31-294 in full (264 pages: core 31-117 and 158-294 plus gap 118-157); front matter pp1-30 (title, preface, contents) not read. Zero printed equations: the only numeric objects are the empirical play-value table (p172), the factor-weight judgment tables (pp173-175, partially garbled by OCR), the 35% pull-out claim (p126), the 33 1/3% away-game claim (p224), and printed angles/counts; all formalizations are explicitly labeled predicate-logic renderings of prose rules. OCR defects quarantined: rotated practice-schedule text pp212-213, diagram-only pages pp139-140, 216-217, 238-239, garbled factor table p173. No sportsbook content anywhere in the source. Era chain position: eighth primary source, 1894-1925; first with printed distributional priors. | `37f086ba6e6b` 2026-11-13T15:49:40-06:00 |
| 32 | `33df04255621d53b` | Aerodynamic_drag_measurement_of_American_footballs | football | A | football | 6/6 | 1_based_pdf_assumed | 4 | 2 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 33 | `345052dfaf01a062` | SuttonBarto-2018-ReinforcementLearningIntroduction | cs | A | cs | 119/548 | 1_based_pdf_assumed | 8 | 1 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 34 | `366ba522490b1573` | How-to-Lie-with-Statistics | math | A | math | 141/141 | 1_based_pdf_assumed | 7 | 1 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 35 | `385d408a043b611b` | LinKrishnamurthyEds-2026-NeurologicalNeuropsychiatricDisordersMilitaryVolII-Frontiers | psych | A | psych | 123/123 | 1_based_pdf_assumed | 5 | 0 | 0 | status=COMPLETE extractor=qwen4-max-preview (worker ext-32) | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 36 | `39871d5617848573` | AgrawalEd-2012-BrainInjury-PathogenesisMonitoringRecoveryManagement | psych | A | psych | 100/538 | 1_based_pdf_assumed | 7 | 3 | 0 | status=COMPLETE extractor=qwen4-max-preview (hermes worker ext-42) | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 37 | `3c1295822da31ba0` | 2409.18934_LLM_and_ML_for_Fantasy_Football_and_Sports_Prediction | football | A | football | 16/16 | none_disclosed | 8 | 2 | 0 | PROVENANCE MISMATCH: file is named 2409.18934_LLM_and_ML_for_Fantasy_Football_and_Sports_Prediction.pdf and queued as football, but the actual content is the physics paper 'Two-dimensional Stoner transitions beyond mean-field' by Raines & Chubukov (arXiv:2409.18934v1 [cond-mat.str-el], 27 Sep 2024). Extracted honestly as physics-domain primitives; football bindings are explicitly derived Layer-2 isomorphisms, not claimed origins. Flag for corpus librarian to correct the title/domain metadata. | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 38 | `3d7cafefb6ffa2ae` | Dixon & Coles 1997 — Modelling Association Football Scores and Inefficiencies in the Football Betting Market | football | A | football | 0/17 | 1_based_pdf_assumed | 0 | 0 | 0 | status=INSUFFICIENT_OCR extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 39 | `3da8c2a20553953a` | Nielsen-2015-NeuralNetworksAndDeepLearning | cs | A | the 2015 learning-algorithm layer beneath ADM (decision) and Garnett (experiment design) — it prints how the value model is fit and the pathologies (saturation, overfitting, unstable gradients) that veto naive training claims | 96/215 | PDF page = printed page + 7 (printed 19 = PDF 26 | 18 | 2 | 0 | Michael Nielsen, Neural Networks and Deep Learning (2015), LibreTexts OER republication (https://LibreTexts.org), CC BY-NC 3.0; original at neuralnetworksanddeeplearning.com, code at github.com/mnielsen/neural-networks-and-deep-learning. Title page spells the author 'Michael Nielson' (LibreTexts catalog spelling); the work is Michael Nielsen's. 215 PDF pages. PDF page = printed page + 7 (printed 19 = PDF 26; printed 157 = PDF 164); all citations are PDF pages. EXTRACTION LIMITATION (disclosed): this LibreTexts rendering typesets inline mathematics as images/MathJax that pymupdf get_text() does not extract, so equation glyphs are largely absent from the text layer; the PROSE and the PYTHON CODE are fully verbatim-extractable. Sovereign primitives are therefore verbatim prose quotes and verbatim code quotes; latex fields are either transcribed from verbatim printed code (p7 sigmoid_prime, p14 weight initializer) or explicitly labeled RECONSTRUCTED from printed prose (p2, p11, p16, p17), never claimed as verbatim glyph extraction. This is a text PDF with image-rendered math, NOT an image-only scan, so it is not INSUFFICIENT_OCR; the conceptual and code content is complete and readable. Dense-monograph solo core-read of 96 pages across seven blocks: 26-35 (gradient descent/SGD/implementation), 50-60 (backprop assumptions/BP1-BP4/algorithm/code/speed), 64-72 (cross-entropy), 76-100 (overfitting/regularization/weight init/code), 120-131 (momentum/tanh/ReLU/universality), 154-166 (vanishing/unstable gradient), 170-185 (convolutional networks). Front matter, ch3.5 hyperparameter heuristics detail, ch4 visual-proof steps, ch6.3+ code and ch7 appendix beyond the core blocks not read. No sportsbook lines/spreads/totals/implied odds anywhere. Era-chain position: the 2015 learning-algorithm layer beneath ADM (decision) and Garnett (experiment design) — it prints how the value model is fit and the pathologies (saturation, overfitting, unstable gradients) that veto naive training claims. | `ae23348e8c95` 2026-11-13T16:55:00-06:00 |
| 40 | `3f0633a80a9e8157` | 2205.12462_Machine_Learning_Player_Performance_and_Fantasy_Points_Projection | cs | A | cs | 5/5 | 1_based_pdf_assumed | 0 | 0 | 0 | status=INSUFFICIENT_SOURCE_ACCESS extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 41 | `3fa96d690212683b` | Edwards-1916-Football-Days | football | A | football | 549/549 | 1_based_pdf_assumed | 6 | 0 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 42 | `409f5dad119c06ed` | Institutional Integration of 10Hz NFL Spatial Tracking | football | A | football | 53/53 | 1_based_pdf_assumed | 8 | 5 | 0 | status=COMPLETE extractor=qwen4-max-preview (worker ext-33) | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 43 | `47da7cd12f78ad9c` | NICE-2025-RehabilitationChronicNeurologicalDisorders-AcquiredBrainInjury-NG252 | psych | A | psych | 145/145 | 1_based_pdf_assumed | 5 | 2 | 0 | status=COMPLETE extractor=qwen4-max-preview (worker ext-33) | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 44 | `49ef6f06a351a3f7` | Bach-2024-LearningTheoryFromFirstPrinciples | cs | A | cs | 488/488 | 1_based_pdf_assumed | 6 | 4 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 45 | `4c25fa54afee431d` | Garnett-2023-BayesianOptimization | cs | A | the 2023 sequential-experiment-design / acquisition terminal node above ADM's decision layer — it prints how to design the next simulation, plus the regret lower bounds and misspecification gaps that veto overconfident engine claims | 144/376 | PDF page = printed page + 18 (printed 1 = PDF 19 | 20 | 2 | 0 | Roman Garnett, Bayesian Optimization, Cambridge University Press 2023, DOI 10.1017/9781108348973. Free-to-view author version (footer on every page: 'This version is free to view and download for personal use only. Not for redistribution, resale, or use in derivative works. (c) Roman Garnett 2023. https://bayesoptbook.com/'). 376 PDF pages. PDF page = printed page + 18 (printed 1 = PDF 19; printed 287 = PDF 305); all citations are PDF pages. Dense-monograph solo core-read of 144 pages across eight blocks: 19-32 (ch1 formalization/Bayesian approach/BO loop), 33-44 (ch2 GP definition/exact+noisy inference), 105-124 (ch5 decision theory/sequential fixed budget/cost-aware termination), 127-138 (ch6 utility functions EI/PI/information gain), 141-174 (ch7 policies EI/KG/PI/entropy search/bandits/UCB/Thompson), 175-198 (ch8 computing policies with GPs: EI/PI/UCB closed forms, noisy EI, KG, Thompson, predictive entropy search), 231-250 (ch10 regret/GP-UCB convergence/lower bounds), 305-312 (ch12 history). Front matter, ch3-4 (covariance/model selection), ch9 (scaling), ch11 (extensions), appendices and exercises beyond the core blocks not read. This source PRINTS its equations; latex fields transcribe printed equations with equation numbers, prose quotes verbatim. Hyphenation preserved as extracted ('un- certainty' p232, 'pro- cedures' p306). vNM utility axioms cited fn5 (ch5), linking to ADM 2022. No sportsbook lines/spreads/totals/implied odds anywhere; 'multi-armed bandit' is the standard historical problem name (slot-machine origin), not betting content. Era-chain position: the 2023 sequential-experiment-design / acquisition terminal node above ADM's decision layer — it prints how to design the next simulation, plus the regret lower bounds and misspecification gaps that veto overconfident engine claims. | `b8500f55c074` 2026-11-13T16:34:35-06:00 |
| 46 | `4d067ce7fd44a2d1` | machine-learning-projects-python | cs | A | cs | 135/135 | 1_based_pdf_assumed | 8 | 2 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 47 | `4d07e5902607436f` | ShalevShwartz-2012-OnlineLearningAndOnlineConvexOptimization | cs | A | cs | 90/90 | none_disclosed | 19 | 2 | 0 | Shai Shalev-Shwartz, 'Online Learning and Online Convex Optimization', Foundations and Trends in Machine Learning Vol.4 No.2 (2011) 107-194, DOI 10.1561/2200000018, (c) 2012. 90-page PDF read in full. Legitimate readable monograph, not retracted, title matches content. Local SHARD A (sha256 prefix 4). All verbatim quotes verified exact substrings of the extracted text after ligature/quote/whitespace normalization. Zero sportsbook odds; this is the online-learning/regret layer governing how the GSE engine learns snap-by-snap against adversarial Nature and converts that to a calibrated pre-game probability. | `c1c1fa3ef81f` 2026-11-13T17:41:00-06:00 |
| 48 | `4e3d8fd8a23059fc` | football-analytics-101-readthedocs-io-en-latest | football | A | football | 14/14 | 1_based_pdf_assumed | 5 | 2 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 49 | `4f974188ca231968` | SIGN-2013-BrainInjuryRehabilitationInAdults-SIGN130 | psych | A | psych | 75/75 | 1_based_pdf_assumed | 5 | 0 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 50 | `51810ec3502aa6a7` | Football Analytics-Sid | football | A | football | 21/21 | 1_based_pdf_assumed | 0 | 1 | 0 | status=INSUFFICIENT_SOURCE_ACCESS extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 51 | `52b5d36325e11cd7` | Reed-1913-Football-for-Public-and-Player | football | A | football | 295/295 | none_disclosed | 6 | 1 | 0 | Reed 1913 Football for Public and Player, 295 PDF pages; 257 text-bearing, 32 zero-char illustration/diagram plates; printed prose ends p242 then blank/ad pages. Full OCR prose layer readable, zero equations, no retraction notice, no betting chapter. Diagram pages carry OCR noise but all quoted prose is clean and verbatim. | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 52 | `537da7b7adb2e1dd` | Yeung-2008-InformationTheoryAndNetworkCoding | cs | A | cs | 578/578 | 1_based_pdf_assumed | 8 | 1 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 53 | `539b52ea8d0a6d37` | RobertsYaida-2022-PrinciplesOfDeepLearningTheory | cs | A | cs | 471/471 | 1_based_pdf_assumed | 4 | 3 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 54 | `53bdc9b1b0089ddc` | NFL Football - Playbook | football | A | football | 2/2 | 1_based_pdf_assumed | 5 | 1 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 55 | `53d47a558cf53d1f` | Kolmogorov-1933-FoundationsOfTheTheoryOfProbability | math | A | math | 88/88 | 1_based_pdf_assumed | 7 | 1 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 56 | `53ff4fe1320a9a44` | DengYu-2014-DeepLearningMethodsAndApplications | cs | A | cs | 197/197 | none_disclosed | 8 | 0 | 0 | Li Deng and Dong Yu, Deep Learning: Methods and Applications, Foundations and Trends in Signal Processing vol. 7, nos. 3-4 (2013; copyright 2014), journal pp. 197-387, DOI 10.1561/2000000039. 197 PDF pages, all read in full chunks (body PDF pp. 1-158, references PDF pp. 159-197). Page citations are 1-based PDF page numbers; printed journal page = PDF page + 190. Page-1 retraction check: none; no retraction markers anywhere; no betting/odds content; no football content (GSE mappings are architectural transfers, labeled as such). Era-bound: empirical results (Table 7.1 error rates, ImageNet 2012/2013 numbers) are 2010-2014 benchmarks, not permanent laws. Text-layer artifacts quarantined (no primitives built on them): 'hyper cycle' for 'hype cycle' (PDF pp. 20-21), reference [256] 'Playing arari' for 'Atari' (PDF p. 180), 'consine' for 'cosine' in the DSSM lead-in prose (PDF p. 124, preserved verbatim inside the p5 quote). Quotes preserve source ligatures (U+FB01/U+FB02) and hyphenation artifacts ('hid- den', 'approx- imately') exactly as whitespace-normalized. Equations transcribed from the PDF text layer with sub/superscript structure reconstructed in LaTeX and cross-checked against surrounding prose; p6's LaTeX is a labeled symbolic restatement of a printed prose procedure, and p7's RER values are labeled derived arithmetic on printed Table 7.1 pairs. | `uncommitted_live_hermes`  |
| 57 | `5432be0e4c9c47fe` | Computational and Mathematical Methods in Medicine - 2022 - Li - Retracted  Research on Application of Sports Training | math | A | math | 12/12 | 1_based_pdf_assumed | 4 | 3 | 0 | status=INSUFFICIENT_SOURCE_ACCESS extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 58 | `54c95039290a80fb` | machine-learning-projects-python | cs | A | cs | 135/135 | 1_based_pdf_assumed | 6 | 0 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 59 | `553c5528787d2538` | Physiological_and_Biomechanical_Monitoring_in_Amer | physics | A | physics | 31/31 | 1_based_pdf_assumed | 6 | 1 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 60 | `55d0f88972ad63be` | Davis-1911-Football-The-American-Intercollegiate-Game | football | A | football | None/None | none_disclosed | 6 | 3 | 0 | Google Books scan of the 1911 Charles Scribner's Sons first edition (digitization notice PDF p1; title page PDF p12; 'Published September, 1911' PDF p13). Public domain; no retraction. Author Parke H. Davis was a member of the Intercollegiate Rules Committee (title page), i.e., participant-observer; the appendix reprints the official proceedings. OCR artifacts preserved verbatim in all quotes (e.g., '3ide', 'strat^y', 'histoiy', 'q^ass', 'Tlie', 'requirem^it'). Coverage: front matter pp1-13 and Part I pp14-158 read verbatim; appendix pp530-577 read verbatim; Part II pp158-529 (372 pages of play-by-play game records) processed page-by-page via heading digest plus full reads of pp158-161, 222, 300-302, 305, 430-432, 528; used as calibration evidence, not quoted for betting content. Two editorial defects quarantined, no primitives built on them: (1) ch. VIII narrative (PDF p145) says 'five yards on four downs' but the 1882 rule text (PDF p541) and Part II records ('third down', PDF p222) establish three downs; (2) narrative dates the field-goal reduction to the 1903 session (PDF p143) but the official proceedings place it at the March 1904 meeting (PDF pp564-565) - appendix used as authoritative. | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 61 | `55e082c734ce5566` | ReddiEtAl-2026-MachineLearningSystems-Vol2-AtScale | cs | A | cs | 96/1690 | none_disclosed | 16 | 1 | 0 | Vol2 'At Scale' (1690 pp). Local SHARD A (sha256 prefix 5). Read a targeted 96-page core: Notation (pp.45-49), ch1 scaling laws + C3 + Fleet Law (pp.82-105), ch2 memory wall + Roofline (pp.138-155), ch5 collectives (pp.346-360), ch6 distributed training (pp.414-428), ch7 fault tolerance (pp.502-514). Vol1 'Foundations' is DELEGATED_GCP (shard c) and was NOT touched. All verbatim quotes verified as exact substrings of the extracted core. Zero sportsbook odds; this is the fleet/systems layer that governs how the GSE ensemble and Foundry swarm execute. | `d6cd25e4a530` 2026-11-13T17:22:35-06:00 |
| 62 | `578457115b76903d` | A_Genetic_Algorithm_for_Optimizing_Fantasy_Footbal | cs | A | cs | 19/19 | 1_based_pdf_assumed | 5 | 2 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 63 | `584e09211a54b4fa` | Congelio-2023-Introduction-to-NFL-Analytics-with-R | football | A | football | 297/297 | 1_based_pdf_assumed | 6 | 1 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 64 | `5b79f17544fe148c` | ShalevShwartzBenDavid-2014-UnderstandingMachineLearning | cs | A | cs | 449/449 | printed pages but section numbers are stable, so primitives ci | 18 | 1 | 0 | Shai Shalev-Shwartz and Shai Ben-David, 'Understanding Machine Learning: From Theory to Algorithms', Cambridge University Press 2014. 449-page PDF read (core theory ch 2-7, 13-14 in full). Legitimate readable textbook, not retracted, title matches content. The book states PDF page indices differ from printed pages but section numbers are stable, so primitives cite by SECTION + printed page. Local SHARD A (sha256 prefix 5). All verbatim quotes verified exact substrings of the extracted text after ligature/quote/whitespace normalization. Zero sportsbook odds; this is the batch/statistical-learning-theory layer governing GSE pre-game generalization, complementing the online layer (Shalev-Shwartz 2012, book 4d07e5902607436f). | `7f5d365ac360` 2026-11-13T17:54:49-06:00 |
| 65 | `5bb26b9323c43ddb` | ZhangEtAl-2023-DiveIntoDeepLearning | cs | A | cs | 1151/1151 | printed page (PDF indices != printed) | 20 | 1 | 0 | Aston Zhang, Zachary C. Lipton, Mu Li, Alexander J. Smola, 'Dive into Deep Learning' (d2l.ai), 2023. 1151-page PDF; core algorithms chapters read in full (softmax/cross-entropy ch4.1, weight decay ch3.7, dropout ch5.6, attention/transformer ch11, optimization ch12). Legitimate readable textbook, not retracted, title matches content. Local SHARD A (sha256 prefix 5). All verbatim quotes verified exact substrings (>=8 words) of the extracted text after ligature/quote/whitespace normalization; cites by section + printed page (PDF indices != printed). Zero sportsbook odds; this is the deep-learning algorithms layer (the GSE engine's neural machinery), complementing the online (4d07e590), batch/PAC (5b79f175), and RL/decision (1498481931) layers. | `2816f3488924` 2026-11-13T18:38:04-06:00 |
| 66 | `5c31b5de385d42ac` | NFL-Win-Probability | football | A | football | 27/27 | 1_based_pdf_assumed | 5 | 8 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 67 | `5e3094b6f359a758` | Machinelearningningforsportresultsprediction_systematicreview | cs | A | cs | 8/8 | 1_based_pdf_assumed | 8 | 3 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 68 | `5e3d2c14003c9e74` | 2025-NFL-Record-and-Fact-Book | football | A | football | 842/842 | 1_based_pdf_assumed | 7 | 0 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 69 | `5ebcc3f3acfef4c9` | ShannonWeaver-1963-MathematicalTheoryOfCommunication | math | A | math | 132/132 | 1_based_pdf_assumed | 6 | 3 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 70 | `5fee5df924431396` | Berry-1921-The-Forward-Pass-in-Football | football | A | football | 44/44 | 1_based_pdf_assumed | 4 | 13 | 0 | status=COMPLETE extractor=qwen4-max-preview (worker ext-32) | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 71 | `62af700cfd3180fa` | InterJourMathematicaComputationalMethods | math | A | math | 17/17 | 1_based_pdf_assumed | 6 | 0 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 72 | `63cf635c3d045ed5` | Computational_Modeling_in_Biomechanics | physics | A | physics | 7/7 | 1_based_pdf_assumed | 0 | 0 | 0 | status=INSUFFICIENT_SOURCE_ACCESS extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 73 | `64a4e0d61f21a823` | Hamilton-2020-GraphRepresentationLearning | cs | A | cs | 141/141 | Printed page numbers run 8 behind PDF pages (PDF 9 = printed 1 | 6 | 1 | 0 | William L. Hamilton, Graph Representation Learning, 2020 pre-publication draft (Morgan & Claypool, Synthesis Lectures on AI and ML Vol. 14 No. 3), McGill University. Page 1 carries the author's copyright/pre-publication notice; NO retraction. Born-digital LaTeX PDF (pdfTeX), clean text layer; full 141-page chunked read including bibliography. Printed page numbers run 8 behind PDF pages (PDF 9 = printed 1); citations use PDF pages. Equations reconstructed faithfully from the printed equation fragments with standard notation; equation numbers given per primitive. SOURCE DEFECT (quarantined, no primitive built on it): Theorem 3 prints I_K(u,v) proportional to p_{G,K}(u\|v) while its prose defines that term as the probability of visiting v from u — argument order inconsistent; printed form preserved verbatim in p3 and flagged. Ligatures (diﬀerentiable, simpliﬁed) and hyphenated line breaks preserved verbatim in quotes. No sportsbook odds; no football-era origin claims — this is a 2020 CS monograph and all football bindings are explicitly labeled structural isomorphisms, not historical origins. | `uncommitted_live_hermes`  |
| 74 | `65c65dec7ddaacd5` | 2002.04682_Combinatorial_Optimization_and_Submodular_Maximization_for_Team_Selection | cs | A | cs | 10/10 | 1_based_pdf_assumed | 4 | 0 | 0 | status=COMPLETE extractor=qwen4-max-preview (worker ext-32) | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 75 | `678271d94588b50d` | Prince-2023-UnderstandingDeepLearning | cs | A | the 2023 MODERN DL-THEORY layer ABOVE Nielsen 2015 — it updates the learning mechanics with double descent, implicit regularization, ResNets/BatchNorm, Adam, and the honest 'why does it work' frontier | 104/541 | PDF page = printed page + 14 (printed 57 = PDF 71 | 20 | 2 | 0 | Simon Prince, Understanding Deep Learning (MIT Press 2023), author's freely-distributed draft (udllibook.com; 'Draft: please send errata to udlbookmail@gmail.com' on every page; CC-BY-NC-ND, (C) MIT Press). 541 PDF pages. PDF page = printed page + 14 (printed 57 = PDF 71; printed 402 = PDF 416); all citations PDF pages. EXTRACTION: this is a proper LaTeX-typeset PDF whose mathematics IS text-extractable as Unicode glyphs (phi, theta, partial, sum, product, sigma^2, in, R, pi, KL). Equations render across multiple lines in the text layer with equation numbers interleaved; latex fields are TRANSCRIBED from the printed text-layer equations and explicitly labeled as reassembled from multi-line extraction, never claimed as verbatim glyph images. Prose quotes are verbatim. Text PDF, NOT image-only -> not INSUFFICIENT_OCR. Dense-monograph (>400pp) solo core-read of 104 pages across eight blocks: 43-50 (universal approximation/shallow general case), 70-86 (loss functions/MLE/least-squares/heteroscedastic/cross-entropy=KL), 91-105 (fitting/GD/SGD/momentum/Nesterov/Adam), 117-125 (backprop algorithm/He-Glorot init), 132-147 (measuring performance/bias-variance-noise/double descent/curse of dimensionality/hyperparameters), 152-160 (explicit+implicit regularization/MAP/early stopping/ensembling), 200-210 (residual networks/shattered gradients/BatchNorm/ResNet), 416-434 (ch20 'Why does deep learning work?'/NP-hardness/lottery tickets/flat minima/grokking/adversarial/pruning/distillation/no prescriptive theory). Front matter, ch1-2/4 detail, ch10 convolutions, ch12-19 (transformers/GNNs/generative/RL), ch21 ethics, appendices, bibliography, index not read. No sportsbook lines/spreads/totals/implied odds anywhere. Era-chain position: the 2023 MODERN DL-THEORY layer ABOVE Nielsen 2015 — it updates the learning mechanics with double descent, implicit regularization, ResNets/BatchNorm, Adam, and the honest 'why does it work' frontier; unifies with Garnett (MAP=prior, cross-entropy=KL=info) and ADM (decision) under one information-theoretic objective. | `f78750cefc3b` 2026-11-13T17:05:50-06:00 |
| 76 | `68aeef90c5264628` | nfl flag situational play book_prd | football | A | football | 35/35 | 1_based_pdf_assumed | 6 | 1 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 77 | `6aeb75fe28eb9cd8` | Cavanaugh-1919-Inside-Football | football | A | football | 342/342 | 1_based_pdf_assumed | 6 | 1 | 0 | status=COMPLETE extractor=qwen4-max-preview (worker ext-39) | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 78 | `6bc7d84da4bde923` | Lewis-1896-A-Primer-of-College-Football | football | A | football | 264/264 | 1_based_pdf_assumed | 6 | 3 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 79 | `6c532aecbad020e8` | PVAMU_MSU_FOOTBALL_GAMENOTES_2024 | football | A | football | 23/23 | 1_based_pdf_assumed | 6 | 0 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 80 | `6cf36a29e51c0a02` | _OceanofPDF.com_The_Hidden_Game_of_Football_-_Bob_Carroll | football | A | football | 426/426 | 1_based_pdf_assumed | 8 | 2 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 81 | `6d101348291a5c1f` | Football Analytics with Python and R_ Learning Data Science (1) | football | A | football | 488/488 | 1_based_pdf_assumed | 5 | 5 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 82 | `6e0d7d342ecb2ea6` | VonNeumannMorgenstern-1944-TheoryOfGamesAndEconomicBehavior | psych | A | psych | 674/674 | 1_based_pdf_assumed | 8 | 1 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 83 | `6e380ace520cdafa` | Gray-2011-EntropyAndInformationTheory2 | cs | A | cs | 324/324 | 1_based_pdf_assumed | 5 | 0 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 84 | `71382581388cd74f` | Daly-1921-American-Football | football | A | football | 1/210 | 1_based_pdf_assumed | 0 | 0 | 0 | status=INSUFFICIENT_OCR extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 85 | `719c464f186464cd` | The_NFL_Coaching_Network_Analysis_of_the_Social_Ne (1) | football | A | football | 8/8 | 1_based_pdf_assumed | 8 | 2 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 86 | `73c11ea388c2e5f6` | James-1890-PrinciplesOfPsychology-Vol1 | psych | A | psych | 716/716 | 1_based_pdf_assumed | 5 | 0 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 87 | `74b7272fc5b1919d` | Keynes-1921-TreatiseOnProbability | math | A | math | 74/494 | 1_based_pdf_assumed | 8 | 1 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 88 | `77d4ee5161695968` | The Quantitative Analysis and Visualization of NFL Passing Routes | football | A | football | 26/26 | 1_based_pdf_assumed | 8 | 4 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 89 | `7b8723df5531a5a9` | PetersenZech-2024-MathematicalTheoryOfDeepLearning | math | A | math | 333/333 | 1_based_pdf_assumed | 6 | 0 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 90 | `7e3a32c1d8621611` | SuLvEds-2022-FrontiersInTraumaticBrainInjury | psych | A | psych | 136/136 | 1_based_pdf_assumed | 6 | 1 | 0 | status=COMPLETE extractor=qwen4-max-preview (worker ext-33) | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 91 | `7ec06be65ab3f269` | Kochenderfer-Wheeler-Wray-2022-AlgorithmsForDecisionMaking | cs | A | the 2022 formal terminal node that identifies what the 1894-1925 prose sources computed | 190/700 | PDF page = printed page + 22 (printed 112 = PDF 134) | 19 | 2 | 0 | Kochenderfer, Wheeler, Wray, Algorithms for Decision Making, MIT Press 2022, CC-BY-NC-ND license (footer on every page; build stamp 2025-09-21). 700 PDF pages. PDF page = printed page + 22 (printed 112 = PDF 134); all citations are PDF pages. Dense-monograph solo core-read of 190 pages across nine blocks: 133-152 (simple decisions/utility/VOI), 155-182 (MDPs/Bellman/LQR), 303-318 (policy validation/importance sampling/robust DP/trade analysis), 321-338 (exploration-exploitation/bandits), 357-376 (model-free RL/Q-learning/shaping/replay), 401-428 (POMDP beliefs/Kalman/EKF/UKF/particle filters), 429-448 (exact belief-state planning/alpha vectors), 515-538 (multiagent reasoning/Nash/correlated/level-k/fictitious play), 539-554 (Markov games/Nash Q-learning). Front matter, remaining chapters (1-5, 8-13, 16, 18, 21-23, 26+), appendices and exercises beyond the core blocks not read. This source PRINTS its equations (unlike the 1894-1925 era chain); latex fields are transcriptions of printed equations with equation numbers, and prose quotes are verbatim. Hyphenation in quotes preserved as extracted (e.g. 'ac- tions' p528). No sportsbook lines/spreads/totals/implied odds anywhere; the bandit chapter's 'one-armed bandit' slot-machine framing is the standard historical name for the problem, not betting content. Era-chain position: the 2022 formal terminal node that identifies what the 1894-1925 prose sources computed; first source in the corpus with printed executable decision-theoretic mathematics for every GSE engine component. | `ccc21ebd4462` 2026-11-13T16:15:04-06:00 |
| 92 | `7f0f084cdb020856` | undated - Do Behavioral Considerations Cloud Penalty-Kick Location Optimization in Professional Soccer Game Theory and Empirical Testing using Polynom - Uribe et al | cs | A | cs | 15/15 | 1_based_pdf_assumed | 5 | 3 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 93 | `7ffbf72292a61a18` | Computational and Mathematical Methods in Medicine - 2022 - Wang - Retracted  Sports Feedback System Based on Video Digital | math | A | math | 11/11 | 1_based_pdf_assumed | 0 | 0 | 0 | status=INSUFFICIENT_SOURCE_ACCESS extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 94 | `8a1ae44d89418bd2` | A-Course-in-Machine-Learning | cs | A | cs | 189/189 | 1_based_pdf_assumed | 5 | 5 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 95 | `95719becd340bcea` | Corentin-Herbinet-Using-Machine-Learning-techniques-to-predict-the-outcome-of-profressional-football-matches (1) | football | A | football | 73/73 | 1_based_pdf_assumed | 6 | 8 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 96 | `a84d79326cdf925d` | a-machine-learning-model-for-analysis-and-prediction-of-football-match-outcomes-in-the-english-premier-league-4850 | football | A | football | 9/9 | 1_based_pdf_assumed | 5 | 4 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 97 | `cea9c306f975be55` | Beyond-the-Expert_-An-Algorithmic-Approach-to-Correcting-Expert-Bias-in-Fantasy-Football-Projections_Jayanti | football | A | football | 15/15 | 1_based_pdf_assumed | 6 | 1 | 0 | status=COMPLETE extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |
| 98 | `dd2d91e7961b7189` | Computational and Mathematical Methods in Medicine - 2022 - Song - Retracted  Data Fusion Algorithm for Myocardial | math | A | math | 14/14 | 1_based_pdf_assumed | 0 | 0 | 0 | status=INSUFFICIENT_SOURCE_ACCESS extractor=hermes-foundry | `b089fb03e986` 2026-11-13T15:24:07-06:00 |

### All `637` Sovereign Primitives Inside Completed Books (Schema Valid: `637/637` | Formal LaTeX: `507` | Qualitative Prose: `130`)
| # | Book ID | Primitive ID | Name | Domain | Page | Verbatim Len | LaTeX Len | Formal LaTeX | Assumptions | Breakdown | Schema Valid |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `0414b2bd02f58929` | `p1` | NFL Passer Rating (fixed-standard system adopted 1973): four clipped component scores, sum/6 x 100, ceiling 158.3 | football | 314 | 226 | 335 | True | True | True | True |
| 2 | `0414b2bd02f58929` | `p2` | Instant Replay challenge economy: two challenges, conditional third, hard cap at three; timeout-coupled cost; clear-and-obvious reversal threshold | football | 42 | 128 | 117 | True | True | True | True |
| 3 | `0414b2bd02f58929` | `p3` | Modified sudden-death overtime (2025 alignment): both teams guaranteed an opportunity to possess even after a first-possession touchdown; 10-minute regular-season cap; defensive score/safety exception | football | 313 | 258 | 143 | True | True | True | True |
| 4 | `0414b2bd02f58929` | `p4` | Postseason/draft tie-breaking: ordered lexicographic cascade with recursive restart semantics and coin-toss terminal arbiter | football | 36 | 189 | 263 | True | True | True | True |
| 5 | `0414b2bd02f58929` | `p5` | Emergency Third Quarterback: designation and in-game activation predicate under roster constraints | football | 44 | 150 | 248 | True | True | True | True |
| 6 | `0414b2bd02f58929` | `p6` | 1932 indoor-championship scar -> 1933 codification: hashmarks and forward pass legalized from anywhere behind the line of scrimmage | history | 365 | 132 | 0 | False | True | True | True |
| 7 | `07089dec6f73619e` | `p1` | Down-and-distance possession renewal rule (four tries, ten yards) | football | 18 | 146 | 138 | True | True | True | True |
| 8 | `07089dec6f73619e` | `p2` | Fumble-equivalent field-position cost (thirty to fifty yards) | football | 57 | 254 | 103 | True | True | True | True |
| 9 | `07089dec6f73619e` | `p3` | Net punt gain and coverage constraint (hang time vs distance) | football | 70 | 136 | 109 | True | True | True | True |
| 10 | `07089dec6f73619e` | `p4` | Openness mean-variance ordering of play classes (equal-strength printed means) | football | 133 | 140 | 206 | True | True | True | True |
| 11 | `07089dec6f73619e` | `p5` | Companion plays: deception by identical observable prefix | football | 150 | 92 | 157 | True | True | True | True |
| 12 | `07089dec6f73619e` | `p6` | Conservative generalship: fourth-down punt doctrine and doubt-kick rule | football | 234 | 73 | 107 | True | True | True | True |
| 13 | `07089dec6f73619e` | `p7` | Lateral zone generalship: 20-yard policy partition of the field | football | 235 | 62 | 122 | True | True | True | True |
| 14 | `07089dec6f73619e` | `p8` | Fatigue-gated practice load: ninety-minute cap and end-of-session injury hazard | physiology | 243 | 150 | 107 | True | True | True | True |
| 15 | `090cfc0da55b02cd` | `p1` | Subject-specific r-squared band-selection statistic (Eq. 1) | cs | 5 | 151 | 136 | True | True | True | True |
| 16 | `090cfc0da55b02cd` | `p2` | Common Spatial Pattern (CSP) joint-diagonalization spatial filter (Eqs. 2-8) | cs | 6 | 226 | 210 | True | True | True | True |
| 17 | `090cfc0da55b02cd` | `p3` | Linear Discriminant Analysis Fisher criterion (Eqs. 9-14) | cs | 7 | 171 | 99 | True | True | True | True |
| 18 | `090cfc0da55b02cd` | `p4` | tDCS anodal subthreshold excitability modulation and NMDA-dependent plasticity | physiology | 3 | 236 | 0 | False | True | True | True |
| 19 | `090cfc0da55b02cd` | `p5` | tACS endogenous-frequency resonance and spike-timing-dependent plasticity sign rule | physiology | 3 | 274 | 0 | False | True | True | True |
| 20 | `0a31ef31857e287d` | `p1` | Third-Down Conversion Asymmetry (PVAMU 10/20 vs Northwestern State 2/13, Sept 7 2024) | football | 1 | 99 | 0 | False | True | True | True |
| 21 | `0a31ef31857e287d` | `p2` | Red-Zone Trip Suppression (3 points allowed on 2 Northwestern State trips) | football | 1 | 87 | 0 | False | True | True | True |
| 22 | `0a31ef31857e287d` | `p3` | Time-of-Possession Conservation (37:29 to 22:31) | football | 1 | 52 | 0 | False | True | True | True |
| 23 | `0a31ef31857e287d` | `p4` | Season Third-Down Rates Through Two Games (14/35 = 40% vs opponents 8/28 = 29%) | football | 14 | 79 | 0 | False | True | True | True |
| 24 | `0a31ef31857e287d` | `p5` | Third-Quarter Scoring Peak (10 points vs Northwestern State) | football | 1 | 86 | 0 | False | True | True | True |
| 25 | `0a31ef31857e287d` | `p6` | Fourth-Down Aggression Sample (1-for-1, 100% in game; 1/2 season) | football | 1 | 84 | 0 | False | True | True | True |
| 26 | `0c444afcd300d1c3` | `p1` | Dose-responsive dementia risk in injury severity and repetition, genotype-moderated | psych | 1 | 124 | 101 | True | True | True | True |
| 27 | `0c444afcd300d1c3` | `p2` | BBB disruption increases with injury frequency; 'mild' phenotypes carry measurable vascular compromise | physiology | 1 | 180 | 157 | True | True | True | True |
| 28 | `0c444afcd300d1c3` | `p3` | HIF-1 biphasic regime inversion: protective in mild/early hypoxia, toxic in chronic/advanced | physiology | 2 | 201 | 208 | True | True | True | True |
| 29 | `0c444afcd300d1c3` | `p4` | Calcium-driven enzyme network as shared TBI-AD secondary-injury cascade, calpain control node | physiology | 2 | 220 | 260 | True | True | True | True |
| 30 | `102f952911d380f9` | `p1` | Single-number evaluation metric and the F1 harmonic mean | cs | 21 | 142 | 54 | True | True | True | True |
| 31 | `102f952911d380f9` | `p2` | Optimizing and satisficing metrics (constrained scalarization) | cs | 22 | 86 | 0 | False | True | True | True |
| 32 | `102f952911d380f9` | `p3` | Bias/variance error decomposition against the optimal (Bayes) error rate | cs | 42 | 76 | 227 | True | True | True | True |
| 33 | `102f952911d380f9` | `p4` | Optimization Verification test: separating search failure from scoring-function failure | cs | 86 | 114 | 114 | True | True | True | True |
| 34 | `102f952911d380f9` | `p5` | Error-analysis ceiling and the Eyeball/Blackbox dev split | cs | 36 | 75 | 0 | False | True | True | True |
| 35 | `102f952911d380f9` | `p6` | Four-set diagnostic: bias, variance, and data mismatch under distribution shift | cs | 79 | 71 | 0 | False | True | True | True |
| 36 | `10c8c515e69e40f4` | `p1` | Play-cycle pre-snap indistinguishability (Zuppke play cycle completeness rule) | football | 75 | 199 | 155 | True | True | True | True |
| 37 | `10c8c515e69e40f4` | `p2` | Punt territory-exchange policy ('When in doubt, punt' + zone-conditional down rules) | football | 151 | 154 | 306 | True | True | True | True |
| 38 | `10c8c515e69e40f4` | `p3` | Tertiary information-gated commitment (hold until direction is certain) | football | 101 | 247 | 163 | True | True | True | True |
| 39 | `10c8c515e69e40f4` | `p4` | Long-pass completion veto (golden rule of pass defense) | football | 20 | 126 | 241 | True | True | True | True |
| 40 | `10c8c515e69e40f4` | `p5` | First-yard control theorem with wedge apex re-election (fault-tolerant point of attack) | football | 71 | 109 | 226 | True | True | True | True |
| 41 | `10c8c515e69e40f4` | `p6` | Shift two-sided uncertainty tradeoff (disorganize the defense, risk your own assignments) | football | 144 | 328 | 222 | True | True | True | True |
| 42 | `118c462e78e37fa7` | `p1` | Perceptron Convergence Theorem | cs | 50 | 233 | 108 | True | True | True | True |
| 43 | `118c462e78e37fa7` | `p2` | Bayes Optimal Classifier and Bayes Error Rate | cs | 19 | 205 | 155 | True | True | True | True |
| 44 | `118c462e78e37fa7` | `p3` | Loss of SupervisedIL (T-squared compounding-error bound) | cs | 214 | 333 | 154 | True | True | True | True |
| 45 | `118c462e78e37fa7` | `p4` | Loss of DAgger (linear-T bound via dataset aggregation) | cs | 217 | 325 | 218 | True | True | True | True |
| 46 | `13afe72d1ef6bdbd` | `p1` | Unitarity - conservation of total probability under quantum evolution | physics | 25 | 139 | 61 | True | True | True | True |
| 47 | `13afe72d1ef6bdbd` | `p2` | Fidelity-error-rate identity and the sequential-gate budget | cs | 19 | 174 | 74 | True | True | True | True |
| 48 | `13afe72d1ef6bdbd` | `p3` | Grover quadratic speedup for unstructured search | cs | 35 | 180 | 85 | True | True | True | True |
| 49 | `13afe72d1ef6bdbd` | `p4` | Exponential growth of the classical simulation state space | physics | 28 | 167 | 37 | True | True | True | True |
| 50 | `13afe72d1ef6bdbd` | `p5` | Symmetry reduction of the computational state space | math | 27 | 173 | 0 | False | True | True | True |
| 51 | `13afe72d1ef6bdbd` | `p6` | Harvest-now, decrypt-later attack (information-lifetime exposure) | cs | 76 | 208 | 0 | False | True | True | True |
| 52 | `13afe72d1ef6bdbd` | `p7` | Migration lead-time rule under capability uncertainty | cs | 77 | 308 | 108 | True | True | True | True |
| 53 | `1498481931694bd8` | `mdp_sequential` | Markov Decision Process (sequential decision model) |  | sec 2.2, printed p.8 | 157 | 156 | True | True | True | True |
| 54 | `1498481931694bd8` | `return_maximization` | Discounted return and the optimal behavior objective |  | sec 2.2, printed p.9 | 136 | 124 | True | True | True | True |
| 55 | `1498481931694bd8` | `optimal_value` | Optimal value function and optimality |  | sec 2.3, printed p.12-13 | 69 | 136 | True | True | True | True |
| 56 | `1498481931694bd8` | `optimal_stationary_exists` | Existence of an optimal stationary policy |  | sec 2.3, printed p.14 | 80 | 140 | True | True | True | True |
| 57 | `1498481931694bd8` | `bellman_dp` | Bellman equations, contraction, and dynamic programming |  | sec 2.3-2.4, printed p.15-16 (Facts 1-3) | 81 | 145 | True | True | True | True |
| 58 | `1498481931694bd8` | `value_policy_iteration` | Value iteration and policy iteration |  | sec 2.4, printed p.16-17 (eq 16) | 240 | 121 | True | True | True | True |
| 59 | `1498481931694bd8` | `td_bootstrapping` | Temporal-difference learning and bootstrapping |  | sec 3.1, printed p.18 (Sutton 1984, 1988) | 127 | 133 | True | True | True | True |
| 60 | `1498481931694bd8` | `td_stochastic_approx` | TD as stochastic approximation (ODE convergence) |  | sec 3.1.1, printed p.19-20 (eq 18) | 118 | 81 | True | True | True | True |
| 61 | `1498481931694bd8` | `step_sizes` | Robbins-Monro step sizes and the constant-step-size practice |  | sec 3.1.1, printed p.20 (RM conditions) | 100 | 127 | True | True | True | True |
| 62 | `1498481931694bd8` | `td_lambda` | TD(lambda): unifying Monte-Carlo and TD(0) |  | sec 3.1.3, printed p.23-25 (eligibility traces) | 81 | 176 | True | True | True | True |
| 63 | `1498481931694bd8` | `function_approx` | Function approximation for large state spaces |  | sec 3.2, printed p.25-26 (averagers) | 118 | 190 | True | True | True | True |
| 64 | `1498481931694bd8` | `qlearning_sampling` | Q-learning: off-policy learning from arbitrary sampling |  | sec 4.3.1, printed p.56-57 (Watkins 1989, eq 34) | 222 | 137 | True | True | True | True |
| 65 | `1498481931694bd8` | `qlearning_insight` | Q-learning's key insight: action-values are expectations |  | sec 4.3.1, printed p.57 | 160 | 182 | True | True | True | True |
| 66 | `1498481931694bd8` | `qlearning_offpolicy` | Q-learning is inherently off-policy |  | sec 4.3.1, printed p.57 | 123 | 123 | True | True | True | True |
| 67 | `1498481931694bd8` | `post_decision_states` | Post-decision states (afterstates) avoid stochastic optimization |  | sec 4.3.1, printed p.58 (Powell 2007; Sutton-Barto afterstates) | 94 | 118 | True | True | True | True |
| 68 | `1498481931694bd8` | `exploration_greedy_fails` | Pure greed fails: exploration is mandatory |  | sec 4.2.1, printed p.47 (Robbins 1952) | 250 | 136 | True | True | True | True |
| 69 | `1498481931694bd8` | `ofu_ucb` | Optimism in the face of uncertainty (UCB1) |  | sec 4.2.1, printed p.47-48 (Lai-Robbins 1985; Auer et al. 2002) | 78 | 127 | True | True | True | True |
| 70 | `1498481931694bd8` | `explore_exploit_balance` | The exploration-exploitation tradeoff |  | sec 4.2.1, printed p.47 (epsilon-greedy, Boltzmann) | 101 | 184 | True | True | True | True |
| 71 | `192267e30813837d` | `p1` | McDiarmid's inequality (bounded-differences concentration, Theorem D.8) | math | 459 | 207 | 183 | True | True | True | True |
| 72 | `192267e30813837d` | `p2` | Rademacher generalization bound (Theorem 3.3) | cs | 48 | 209 | 225 | True | True | True | True |
| 73 | `192267e30813837d` | `p3` | Representer theorem (Theorem 6.11) | cs | 134 | 399 | 169 | True | True | True | True |
| 74 | `192267e30813837d` | `p4` | AdaBoost empirical-error bound (Theorem 7.2) | cs | 166 | 206 | 193 | True | True | True | True |
| 75 | `192267e30813837d` | `p5` | Uniform-stability generalization bound (Theorem 14.2) | cs | 352 | 128 | 78 | True | True | True | True |
| 76 | `192267e30813837d` | `p6` | Q-learning convergence theorem (Theorem 17.18) | cs | 416 | 231 | 156 | True | True | True | True |
| 77 | `1976064dcffc0e42` | `p1` | Random Forests (bootstrap-aggregated regression ensemble; Breiman 2001) | cs | 12 | 121 | 56 | True | True | True | True |
| 78 | `1976064dcffc0e42` | `p2` | Gradient Boosting (stagewise additive residual correction; Friedman 2001) | cs | 13 | 142 | 39 | True | True | True | True |
| 79 | `1976064dcffc0e42` | `p3` | ANN loss-gradient weight adaptation (backpropagation-style learning) | cs | 13 | 198 | 90 | True | True | True | True |
| 80 | `1976064dcffc0e42` | `p4` | K-Nearest Neighbors local-similarity regression (Cover & Hart 1967) | cs | 8 | 161 | 52 | True | True | True | True |
| 81 | `1976064dcffc0e42` | `p5` | Stepwise MLR with AIC / adjusted-R^2 model selection (Akaike information criterion) | cs | 12 | 193 | 27 | True | True | True | True |
| 82 | `1a04a74c1cd2528c` | `monro-kellie-fixed-volume` | Monro-Kellie fixed-volume constraint with compliance-to-elastance transition |  | PDF p.40 (printed book p.28), Chapter 2 §7.7 'ICP monitoring and management', Kariuki & Omariba, DOI 10.5772/intechopen.1005056 | 574 | 215 | True | True | True | True |
| 83 | `1a04a74c1cd2528c` | `cpp-target-band-autoregulation` | Cerebral perfusion pressure target band with age-stratified pressure floor and autoregulation dependence |  | PDF p.39 (printed book p.27), Chapter 2 §7.4 'Blood pressure and cerebral perfusion pressure (CPP)'; Table 2 'Goals of treatment' PDF p.37 (book p.25) | 396 | 276 | True | True | True | True |
| 84 | `1a04a74c1cd2528c` | `fenton-iron-catalysis` | Fenton reaction: ferrous-iron catalytic radical generation driving lipid peroxidation (ferroptosis) |  | PDF p.111 (printed book p.99), Chapter 6 §1, Qian et al., DOI 10.5772/intechopen.1005618; corroborating passage PDF p.114 (book p.102) §3.2.2 | 363 | 219 | True | True | True | True |
| 85 | `1a04a74c1cd2528c` | `system-xc-antiport-gpx4` | System Xc− 1:1 cystine/glutamate antiport coupled to the GSH-GPX4 lipid-peroxide detoxification axis |  | PDF p.113 (printed book p.101), Chapter 6 §3.2.1 'Inhibition of ferroptosis pathway', Qian et al. | 377 | 187 | True | True | True | True |
| 86 | `1a04a74c1cd2528c` | `bladder-compliance-dlpp` | Bladder compliance C = dV/dP and the detrusor leak-point pressure > 40 cmH2O upper-tract risk boundary |  | PDF p.162 (printed book p.150) §2.1.1 'Storage phase' and PDF pp.170-171 (book pp.158-159) §5.6, Chapter 9, Milton, Bain & Couchman, DOI 10.5772/intechopen.1006148 | 455 | 173 | True | True | True | True |
| 87 | `1a04a74c1cd2528c` | `concussion-energy-mismatch` | Concussion neurometabolic energy mismatch: supply incapacity vs restoration demand with ATP-dependent ion pumping |  | PDF p.70 (printed book p.58), Chapter 4 §5 'Pathophysiology', Tamimi et al., DOI 10.5772/intechopen.1005615 | 293 | 252 | True | True | True | True |
| 88 | `1cfd792f9b7396d1` | `p1` | Lipid peroxidation free-radical chain (initiation-propagation) in post-TBI membranes | physiology | 41 | 520 | 258 | True | True | True | True |
| 89 | `1cfd792f9b7396d1` | `p2` | Two-stage ddPCR normalization: RNA-input quotient then geometric-mean endogenous-control quotient | math | 97 | 536 | 138 | True | True | True | True |
| 90 | `1cfd792f9b7396d1` | `p3` | Mechanical strain-dose regime map: 5% adaptive / 25% sublethal / 50% lethal in stretched neurons | physiology | 73 | 387 | 145 | True | True | True | True |
| 91 | `1cfd792f9b7396d1` | `p4` | MitoQ potential-driven mitochondrial targeting: TPP+ lipophilic cation accumulation at the inner membrane | physics | 347 | 376 | 136 | True | True | True | True |
| 92 | `1cfd792f9b7396d1` | `p5` | Canonical-probe blindness: isoform-resolved assay detects what the canonical-only assay misses (miR-146a) | math | 105 | 326 | 200 | True | True | True | True |
| 93 | `203aeb745b1aed40` | `p1` | Perceptron Convergence Theorem (Rosenblatt) | cs | 45 | 233 | 186 | True | True | True | True |
| 94 | `203aeb745b1aed40` | `p2` | Expected-loss formalization of induction (Eqs 1.1–1.2) | cs | 16 | 166 | 173 | True | True | True | True |
| 95 | `203aeb745b1aed40` | `p3` | Bayes Optimal Classifier and Bayes error floor (Theorem 8) | cs | 101 | 135 | 139 | True | True | True | True |
| 96 | `203aeb745b1aed40` | `p4` | Soft-margin SVM: optimal slack equals hinge loss (Eqs 6.44–6.46) | cs | 99 | 110 | 136 | True | True | True | True |
| 97 | `203aeb745b1aed40` | `p5` | K-Means Convergence Theorem (Theorem 15) | cs | 164 | 169 | 90 | True | True | True | True |
| 98 | `21544db09ed29308` | `p1` | Positional scarcity gradient (role-specific marginal value decay) | football | 6 | 205 | 0 | False | True | True | True |
| 99 | `21544db09ed29308` | `p2` | Relative-value objective (win probability, not absolute points) | football | 7 | 214 | 0 | False | True | True | True |
| 100 | `21544db09ed29308` | `p3` | Handcuffing insurance kernel and its null test | football | 17 | 374 | 0 | False | True | True | True |
| 101 | `21544db09ed29308` | `p4` | Preceding-pick herding (implicit social influence in sequential choice) | psych | 20 | 161 | 0 | False | True | True | True |
| 102 | `21544db09ed29308` | `p5` | Representativeness-driven roster homogeneity | psych | 16 | 256 | 0 | False | True | True | True |
| 103 | `21544db09ed29308` | `p6` | Frequency-dependent optimality and the robustness criterion | cs | 23 | 198 | 0 | False | True | True | True |
| 104 | `21544db09ed29308` | `p7` | Correlated-asset variance stacking (same-NFL-team roster construction) | math | 20 | 396 | 0 | False | True | True | True |
| 105 | `2435ddad2e0ddd16` | `p1` | Neurometabolic cascade of concussion (excitotoxicity vs endogenous neuroprotection) | physiology | 17 | 186 | 0 | False | True | True | True |
| 106 | `2435ddad2e0ddd16` | `p2` | Post-Concussion Symptom Scale cutoff false-positive invariant | psych | 18 | 175 | 112 | True | True | True | True |
| 107 | `2435ddad2e0ddd16` | `p3` | Second Impact Syndrome catastrophic refractory-window threshold | physiology | 63 | 125 | 0 | False | True | True | True |
| 108 | `2435ddad2e0ddd16` | `p4` | Glial/neuronal biomarker ratio (GNR) and complementary-panel classification | physiology | 89 | 106 | 180 | True | True | True | True |
| 109 | `2435ddad2e0ddd16` | `p5` | Brain-tissue hypoxia threshold dominates functional outcome over ICP | physics | 138 | 159 | 114 | True | True | True | True |
| 110 | `2435ddad2e0ddd16` | `p6` | Flow-metabolism coupling preservation invariant in neuro-sedation | physiology | 157 | 208 | 215 | True | True | True | True |
| 111 | `24cd6351f8d171a6` | `p1` | F1 score as the harmonic mean of Precision and Recall (single-number evaluation metric) | cs | 21 | 106 | 33 | True | True | True | True |
| 112 | `24cd6351f8d171a6` | `p2` | Error decomposition: Bias = Optimal error rate (unavoidable bias) + Avoidable bias; Variance = dev error - training error | cs | 47 | 63 | 63 | True | True | True | True |
| 113 | `24cd6351f8d171a6` | `p3` | Optimization Verification test (search-failure vs scoring-function-failure attribution) | cs | 86 | 103 | 28 | True | True | True | True |
| 114 | `24cd6351f8d171a6` | `p4` | Error-analysis ceiling: category fraction bounds the maximum achievable error reduction | cs | 30 | 192 | 0 | False | True | True | True |
| 115 | `24cd6351f8d171a6` | `p5` | Optimizing vs satisficing metrics (constrained single-objective formulation) | cs | 23 | 161 | 0 | False | True | True | True |
| 116 | `25294936f511d828` | `p1` | Implicit bias (NIH definition as quoted in the case study) | psych | 7 | 123 | 0 | False | True | True | True |
| 117 | `25294936f511d828` | `p2` | Reshuffling effect (asymmetric reentry into the head-coach pipeline) | football | 16 | 179 | 0 | False | True | True | True |
| 118 | `25294936f511d828` | `p3` | Compassion fade and psychic numbing (Slovic, as quoted in the case study) | psych | 9 | 155 | 0 | False | True | True | True |
| 119 | `25294936f511d828` | `p4` | Pilula chart encoding (run-length serialization of tenure spells) | cs | 15 | 294 | 0 | False | True | True | True |
| 120 | `25294936f511d828` | `p5` | Diffusion of innovations critical mass (Rogers, as cited in the case study) | psych | 4 | 105 | 0 | False | True | True | True |
| 121 | `25294936f511d828` | `p6` | Measurement-window scoping and provenance regime (1993-2023) | cs | 11 | 188 | 0 | False | True | True | True |
| 122 | `2626db0663ce780e` | `xs-witness-loss-completeness` | Public-record witness: post every settlement, losses above all (settlement:publication ~ 1:1) | strategy | 2 | 189 | 167 | True | True | True | True |
| 123 | `2626db0663ce780e` | `xs-lexicographic-job-order` | Strict priority order of channel jobs: witness > distribution > community > research | strategy | 1 | 105 | 123 | True | True | True | True |
| 124 | `2626db0663ce780e` | `xs-score-not-probability` | Confidence is a factor-sum score, never a rendered probability (0.8663 claimed vs 0.5191 realized, z=-10.7) | strategy | 3 | 259 | 181 | True | True | True | True |
| 125 | `2626db0663ce780e` | `xs-fail-closed-idempotent-transport` | Fail-closed, idempotent send: record key before send, check mute at send time | strategy | 7 | 149 | 165 | True | True | True | True |
| 126 | `2626db0663ce780e` | `xs-rumor-quarantine-admission` | Rumor-quarantine admission: >=2 independent sources OR official; timestamp is the signal; category not text | strategy | 6 | 90 | 197 | True | True | True | True |
| 127 | `2626db0663ce780e` | `xs-metric-admissibility` | Metric admissibility: a metric you may not optimise for is not a metric | strategy | 8 | 61 | 223 | True | True | True | True |
| 128 | `28ced3431e66ee6f` | `p1` | Ordinary Least Squares linear regression (minimum sum of squared residuals) | math | 191 | 121 | 100 | True | True | True | True |
| 129 | `28ced3431e66ee6f` | `p2` | Logistic (logit) link bounding a linear predictor to a probability | math | 202 | 156 | 75 | True | True | True | True |
| 130 | `28ced3431e66ee6f` | `p3` | Ceteris-paribus coefficient interpretation / omitted-variable control | math | 197 | 129 | 131 | True | True | True | True |
| 131 | `28ced3431e66ee6f` | `p4` | P-value as null-survival frequency and the replicability crisis (p-hacking veto) | math | 194 | 135 | 0 | False | True | True | True |
| 132 | `28ced3431e66ee6f` | `p5` | Quadratic marginal effect via the power rule (state-dependent derivative) | math | 200 | 167 | 59 | True | True | True | True |
| 133 | `28ced3431e66ee6f` | `p6` | Composite scores by weighting plus percentile rescaling (SPARQ / passer-rating pattern) | math | 181 | 93 | 75 | True | True | True | True |
| 134 | `29a9a56fe196f2f2` | `p1` | Pre-participation physician-clearance gate (Ames rule) | football | 29 | 208 | 88 | True | True | True | True |
| 135 | `29a9a56fe196f2f2` | `p2` | Vital index = lung-capacity / weight (Beyer) | physiology | 39 | 149 | 10 | True | True | True | True |
| 136 | `29a9a56fe196f2f2` | `p3` | Mass-play mean-weight-mismatch hazard (King's 25-pound threshold) | football | 103 | 197 | 111 | True | True | True | True |
| 137 | `29a9a56fe196f2f2` | `p4` | Original Rugby on-side invariant (behind-the-ball predicate) | football | 175 | 210 | 44 | True | True | True | True |
| 138 | `29a9a56fe196f2f2` | `p5` | Exposure-normalized injury rate (Dartmouth player-game denominator) | football | 127 | 390 | 68 | True | True | True | True |
| 139 | `2d97f3a1f7fad21e` | `p1` | RULE I — Field and Goal Geometry (Dimensions, Marking, Goal) | football | 363 | 391 | 208 | True | True | True | True |
| 140 | `2d97f3a1f7fad21e` | `p2` | RULE V — Scoring Value Vector | football | 367 | 178 | 128 | True | True | True | True |
| 141 | `2d97f3a1f7fad21e` | `p3` | RULE XIX Sec.1 — Necessary Gain on Downs (10 yards in four downs) | football | 392 | 185 | 157 | True | True | True | True |
| 142 | `2d97f3a1f7fad21e` | `p4` | RULE XVII — Forward Pass Legality, Count, and Receiver Eligibility | football | 388 | 79 | 155 | True | True | True | True |
| 143 | `2d97f3a1f7fad21e` | `p5` | RULE X — Try-for-Point After Touchdown | football | 378 | 239 | 133 | True | True | True | True |
| 144 | `2d97f3a1f7fad21e` | `p6` | RULE VI Sec.16 — Safety by Defending-Side Impetus | football | 373 | 282 | 95 | True | True | True | True |
| 145 | `2ec4f6881728fa8b` | `p1` | Model as reversible access to MDP dynamics (survey definition) | cs | 4 | 78 | 0 | False | True | True | True |
| 146 | `2ec4f6881728fa8b` | `p2` | Bellman equation for the action-value function (Eq. 2) | cs | 4 | 87 | 155 | True | True | True | True |
| 147 | `2ec4f6881728fa8b` | `p3` | Tabular maximum-likelihood transition estimator (Eq. 4) | cs | 7 | 106 | 63 | True | True | True | True |
| 148 | `2ec4f6881728fa8b` | `p4` | Regret definition (Eq. 8) and minimax lower bound (Table 7) | cs | 44 | 154 | 132 | True | True | True | True |
| 149 | `2ec4f6881728fa8b` | `p5` | Task-conflated intrinsic/extrinsic reward mixture (Eq. 5) | cs | 39 | 173 | 58 | True | True | True | True |
| 150 | `2ec4f6881728fa8b` | `p6` | Options framework for temporal abstraction (initiation set, sub-policy, termination probability) | cs | 15 | 979 | 0 | False | True | True | True |
| 151 | `3178b5fdce0fc1a5` | `p1` | Expected Points Added (EPA) as a play-level state-value difference | football | 332 | 73 | 135 | True | True | True | True |
| 152 | `3178b5fdce0fc1a5` | `p2` | Metric stability via lagged Pearson correlation (signal-to-noise gate) | math | 42 | 142 | 143 | True | True | True | True |
| 153 | `3178b5fdce0fc1a5` | `p3` | Logit-link generalized linear model for binary completion (CPOE expectation kernel) | math | 333 | 202 | 153 | True | True | True | True |
| 154 | `3178b5fdce0fc1a5` | `p4` | Poisson count kernel for discrete scoring events | math | 167 | 122 | 114 | True | True | True | True |
| 155 | `3178b5fdce0fc1a5` | `p5` | Regression toward the mean (reliability-weighted shrinkage of noisy performance) | math | 335 | 95 | 61 | True | True | True | True |
| 156 | `3178b5fdce0fc1a5` | `p6` | Principal component analysis (orthogonal latent-feature extraction) | math | 239 | 88 | 107 | True | True | True | True |
| 157 | `32d8b2d0d4f7f22f` | `p1` | Tactical situation state tuple (defensive expectation prior) | football | 86 | 172 | 136 | True | True | True | True |
| 158 | `32d8b2d0d4f7f22f` | `p2` | Sacrifice plays (negative-EPA actions with positive setup externality) | football | 237 | 215 | 237 | True | True | True | True |
| 159 | `32d8b2d0d4f7f22f` | `p3` | Check plays (counter-policy actions contingent on defensive adaptation) | football | 236 | 346 | 185 | True | True | True | True |
| 160 | `32d8b2d0d4f7f22f` | `p4` | Empirical play-class outcome distributions (thirty-game analysis) | football | 172 | 359 | 216 | True | True | True | True |
| 161 | `32d8b2d0d4f7f22f` | `p5` | Guard pull-out within-game A/B intervention (35 percent efficiency claim) | football | 126 | 146 | 102 | True | True | True | True |
| 162 | `32d8b2d0d4f7f22f` | `p6` | Sifting end: the commitment duel ('who will show first') | football | 143 | 352 | 173 | True | True | True | True |
| 163 | `32d8b2d0d4f7f22f` | `p7` | Bounded-downside long pass as punt substitute | football | 259 | 215 | 185 | True | True | True | True |
| 164 | `32d8b2d0d4f7f22f` | `p8` | Weak-spot nursing (exploit-rate constraint under adversary adaptation) | football | 256 | 253 | 226 | True | True | True | True |
| 165 | `32d8b2d0d4f7f22f` | `p9` | Punt-signal masking and mixed punt numbers | football | 209 | 234 | 170 | True | True | True | True |
| 166 | `32d8b2d0d4f7f22f` | `p10` | Scouting sample-selection rule (offense revealed in easy games, defense in hard games) | football | 188 | 168 | 192 | True | True | True | True |
| 167 | `32d8b2d0d4f7f22f` | `p11` | Scout epistemic honesty constraint | football | 202 | 183 | 150 | True | True | True | True |
| 168 | `32d8b2d0d4f7f22f` | `p12` | Scrimmage load cap and the six-week critical window | football | 218 | 80 | 121 | True | True | True | True |
| 169 | `32d8b2d0d4f7f22f` | `p13` | Intentional safety as points-for-field-position exchange | football | 251 | 279 | 164 | True | True | True | True |
| 170 | `32d8b2d0d4f7f22f` | `p14` | Lead-magnitude irrelevance and triple-pass relaxation trap | football | 254 | 73 | 205 | True | True | True | True |
| 171 | `33df04255621d53b` | `p1` | Yaw-Dependent Drag Coefficient and the ~4x Crosswind Cliff (printed p.103) | football | 6 | 130 | 138 | True | True | True | True |
| 172 | `33df04255621d53b` | `p2` | Reynolds-Number Non-Dimensionalization and the Separation Regime Gate (printed p.99, p.102) | physics | 5 | 210 | 78 | True | True | True | True |
| 173 | `33df04255621d53b` | `p3` | Orientation-Dependent Flow-Separation Topology (printed p.102) | football | 5 | 166 | 88 | True | True | True | True |
| 174 | `33df04255621d53b` | `p4` | Tare-Subtracted Force Measurement and Repeatability Protocol (printed p.100) | football | 3 | 105 | 139 | True | True | True | True |
| 175 | `345052dfaf01a062` | `p1` | Action-value definition for the k-armed bandit (Eq. 2.1) | cs | 48 | 104 | 65 | True | True | True | True |
| 176 | `345052dfaf01a062` | `p2` | Bellman optimality equation for the action-value function (Eq. 3.20) | cs | 85 | 181 | 98 | True | True | True | True |
| 177 | `345052dfaf01a062` | `p3` | TD(0) update and the temporal-difference error (Eqs. 6.2, 6.5) | cs | 142 | 183 | 157 | True | True | True | True |
| 178 | `345052dfaf01a062` | `p4` | Q-learning: off-policy TD control (Eq. 6.8) | cs | 153 | 140 | 115 | True | True | True | True |
| 179 | `345052dfaf01a062` | `p5` | The reward hypothesis (Sec. 3.2) | cs | 75 | 178 | 0 | False | True | True | True |
| 180 | `345052dfaf01a062` | `p6` | The deadly triad: function approximation + bootstrapping + off-policy training (Sec. 11.3) | cs | 286 | 114 | 0 | False | True | True | True |
| 181 | `345052dfaf01a062` | `p7` | Reward prediction error hypothesis of dopamine neuron activity (Sec. 15.3) | cs | 403 | 286 | 47 | True | True | True | True |
| 182 | `345052dfaf01a062` | `p8` | The lambda-return: compound update unifying TD and Monte Carlo (Eq. 12.2) | cs | 311 | 88 | 86 | True | True | True | True |
| 183 | `366ba522490b1573` | `p1` | Equal-inclusion-probability test of a random sample | math | 20 | 124 | 74 | True | True | True | True |
| 184 | `366ba522490b1573` | `p2` | Mean-median-mode trichotomy and skew-induced divergence | math | 27 | 217 | 131 | True | True | True | True |
| 185 | `366ba522490b1573` | `p3` | Probable-error bands and the overlapping-band comparison veto | math | 55 | 145 | 179 | True | True | True | True |
| 186 | `366ba522490b1573` | `p4` | Cube-law scaling of similar solids and pictograph distortion | math | 69 | 103 | 109 | True | True | True | True |
| 187 | `366ba522490b1573` | `p5` | Exposure-normalized rates and population comparability | math | 78 | 210 | 114 | True | True | True | True |
| 188 | `366ba522490b1573` | `p6` | Shifting-base asymmetry of sequential percentage changes | math | 110 | 108 | 87 | True | True | True | True |
| 189 | `366ba522490b1573` | `p7` | Sign-flip of a correlation beyond its observed support (rain-corn regime) | math | 90 | 147 | 107 | True | True | True | True |
| 190 | `385d408a043b611b` | `p1` | Concussion -> neurodegenerative adjusted hazard ratios (Cox AHR) with confounding reversal and case-definition attenuation (Belding et al.) | medicine | 11 | 358 | 158 | True | True | True | True |
| 191 | `385d408a043b611b` | `p2` | Bayesian adaptive decision gates with simulation-calibrated family-wise type-I error (ADEPT trial, Oberman et al.) | medicine | 41 | 196 | 304 | True | True | True | True |
| 192 | `385d408a043b611b` | `p3` | Bridge strength and path length govern symptom propagation, not density (gendered networks, Hamama-Raz & Hamama) | medicine | 72 | 138 | 125 | True | True | True | True |
| 193 | `385d408a043b611b` | `p4` | Allostatic opponent effect: repetitive relief-seeking resets baseline and induces paradoxical pain management-induced pain (Manhapra et al., FREIDEM) | medicine | 113 | 105 | 147 | True | True | True | True |
| 194 | `385d408a043b611b` | `p5` | Karvonen reserve-based target-heart-rate prescription kernel with MIIT and rTMS dosing (EXERT-Stroke, Lin et al.) | medicine | 28 | 208 | 134 | True | True | True | True |
| 195 | `39871d5617848573` | `p1` | Cerebral perfusion pressure gradient (CPP = MAP - ICP) with autoregulatory operating corridor | physiology | 235 | 192 | 105 | True | True | True | True |
| 196 | `39871d5617848573` | `p2` | Monro-Kellie doctrine: intracranial volume conservation with exhausted-compensation elastance | physiology | 236 | 215 | 174 | True | True | True | True |
| 197 | `39871d5617848573` | `p3` | Cerebrovascular pressure reactivity index (PRx): correlation-sign regime classifier for autoregulation | physiology | 238 | 125 | 135 | True | True | True | True |
| 198 | `39871d5617848573` | `p4` | Ischemic CBF threshold cascade: electrical failure precedes irreversible membrane failure | physiology | 246 | 187 | 176 | True | True | True | True |
| 199 | `39871d5617848573` | `p5` | NAA synthesis energy cost: net loss of 11 ATP per NAA; acetyl-CoA hydrolysis Delta-G = -31.2 kJ/mol | physiology | 518 | 253 | 188 | True | True | True | True |
| 200 | `39871d5617848573` | `p6` | Symptom-metabolism dissociation: return-to-play gated on NAA/Cr normalization, not symptom clearance | physiology | 528 | 364 | 140 | True | True | True | True |
| 201 | `39871d5617848573` | `p7` | Fick-principle tracer kinetics: CBF from the deconvolved impulse residue function F*R(t) | physics | 296 | 162 | 169 | True | True | True | True |
| 202 | `3c1295822da31ba0` | `p1` | Unconventional 2D Stoner transition: strongly first order yet diverging susceptibility | physics | 1 | 90 | 0 | False | True | True | True |
| 203 | `3c1295822da31ba0` | `p2` | Mean-field Stoner criterion: susceptibility and vertex diverge at nu*U = 1 | physics | 3 | 136 | 76 | True | True | True | True |
| 204 | `3c1295822da31ba0` | `p3` | Mean-field energy exactly quadratic in polarization forces a first-order jump at the susceptibility divergence | physics | 3 | 103 | 60 | True | True | True | True |
| 205 | `3c1295822da31ba0` | `p4` | Beyond-mean-field logarithmic suppression: particle-particle ladders renormalize U downward | physics | 6 | 129 | 63 | True | True | True | True |
| 206 | `3c1295822da31ba0` | `p5` | 2D-specific particle-particle logarithm (not a Cooper logarithm) | physics | 4 | 173 | 54 | True | True | True | True |
| 207 | `3c1295822da31ba0` | `p6` | Anisotropy selects valley polarization and restores the mean-field-like Stoner transition | physics | 11 | 181 | 0 | False | True | True | True |
| 208 | `3c1295822da31ba0` | `p7` | Luttinger-Ward conserving approximation versus non-conserving RPA | physics | 12 | 141 | 101 | True | True | True | True |
| 209 | `3c1295822da31ba0` | `p8` | Regime of validity: three beyond-MF scenarios and the breakdown of the logarithmic approximation | physics | 6 | 145 | 0 | False | True | True | True |
| 210 | `3da8c2a20553953a` | `p1` | Smooth surrogate cost, not raw classification count | cs | 26 | 108 | 0 | False | True | True | True |
| 211 | `3da8c2a20553953a` | `p2` | Gradient descent update and learning-rate breakdown | cs | 29 | 326 | 142 | True | True | True | True |
| 212 | `3da8c2a20553953a` | `p3` | Stochastic gradient descent: mini-batch as political polling | cs | 31 | 150 | 0 | False | True | True | True |
| 213 | `3da8c2a20553953a` | `p4` | Two assumptions backpropagation requires of the cost | cs | 50 | 333 | 0 | False | True | True | True |
| 214 | `3da8c2a20553953a` | `p5` | Backpropagation is the chain rule; one forward plus one backward pass | cs | 58 | 211 | 0 | False | True | True | True |
| 215 | `3da8c2a20553953a` | `p6` | BP4 consequence: low-activation and saturated neurons learn slowly | cs | 53 | 152 | 0 | False | True | True | True |
| 216 | `3da8c2a20553953a` | `p7` | Sigmoid derivative (verbatim printed code) and its 1/4 ceiling | cs | 58 | 96 | 125 | True | True | True | True |
| 217 | `3da8c2a20553953a` | `p8` | Cross-entropy cancels the saturation slowdown: error controls learning rate | cs | 67 | 144 | 0 | False | True | True | True |
| 218 | `3da8c2a20553953a` | `p9` | Fermi's elephant: the true test is prediction on unseen situations | cs | 76 | 107 | 0 | False | True | True | True |
| 219 | `3da8c2a20553953a` | `p10` | Early stopping and the hold-out method: validation, not test, for hyperparameters | cs | 79 | 106 | 0 | False | True | True | True |
| 220 | `3da8c2a20553953a` | `p11` | L2 regularization / weight decay: a compromise, and a kludge | cs | 81 | 126 | 153 | True | True | True | True |
| 221 | `3da8c2a20553953a` | `p12` | Occam caution and no-free-lunch: simplicity is not a scientific principle | cs | 86 | 97 | 0 | False | True | True | True |
| 222 | `3da8c2a20553953a` | `p13` | Dropout as averaging many networks; robust features via co-adaptation breaking | cs | 90 | 228 | 0 | False | True | True | True |
| 223 | `3da8c2a20553953a` | `p14` | Weight initialization 1/sqrt(n_in) avoids hidden-neuron saturation | cs | 100 | 98 | 149 | True | True | True | True |
| 224 | `3da8c2a20553953a` | `p15` | Universality theorem and its two caveats | math | 128 | 180 | 0 | False | True | True | True |
| 225 | `3da8c2a20553953a` | `p16` | Unstable gradient: early-layer gradient is a product of all later layers | cs | 165 | 151 | 176 | True | True | True | True |
| 226 | `3da8c2a20553953a` | `p17` | ReLU: no positive-side saturation, but dying on negative input | cs | 122 | 290 | 103 | True | True | True | True |
| 227 | `3da8c2a20553953a` | `p18` | Convolutional architecture: shared weights, translation invariance, pooling | cs | 173 | 158 | 0 | False | True | True | True |
| 228 | `3fa96d690212683b` | `p1` | Fresh-substitute-over-crippled-star law and the injury-concealment incentive | football | 280 | 347 | 102 | True | True | True | True |
| 229 | `3fa96d690212683b` | `p2` | Adversary-consent exit gate (the 1887 no-substitution attrition rule) | football | 341 | 330 | 76 | True | True | True | True |
| 230 | `3fa96d690212683b` | `p3` | Strict-liability enforcement of the below-knees tackling rule (intent unobservable) | football | 165 | 122 | 131 | True | True | True | True |
| 231 | `3fa96d690212683b` | `p4` | Punt hang-time coverage constraint (Haughton's kick-height rule) | football | 375 | 62 | 59 | True | True | True | True |
| 232 | `3fa96d690212683b` | `p5` | Public-observation scouting doctrine (Knox's provenance rule) | football | 441 | 294 | 121 | True | True | True | True |
| 233 | `3fa96d690212683b` | `p6` | Condition-over-drill taper doctrine (Chadwick-Murphy pre-game load rule) | football | 322 | 178 | 160 | True | True | True | True |
| 234 | `409f5dad119c06ed` | `p1` | Conformalized Quantile Regression: non-conformity score, rank index, and finite-sample marginal coverage | cs | 35 | 110 | 326 | True | True | True | True |
| 235 | `409f5dad119c06ed` | `p2` | Fail-closed small-sample clamp invariant: max-residual coverage equals n/(n+1) | cs | 37 | 123 | 215 | True | True | True | True |
| 236 | `409f5dad119c06ed` | `p3` | Helmholtz-Hodge decomposition and Poisson equation for gridiron pitch gravity | physics | 12 | 163 | 303 | True | True | True | True |
| 237 | `409f5dad119c06ed` | `p4` | Step-and-turn movement model: Gamma step length and von Mises turn angle | math | 11 | 155 | 210 | True | True | True | True |
| 238 | `409f5dad119c06ed` | `p5` | Hip-flip biomechanical refractory constraint: 200-400 ms transition recovery delay | physiology | 19 | 242 | 195 | True | True | True | True |
| 239 | `409f5dad119c06ed` | `p6` | Disguise entropy: KL divergence between post-snap and pre-snap coverage posteriors | cs | 23 | 140 | 211 | True | True | True | True |
| 240 | `409f5dad119c06ed` | `p7` | ESOE residualization: separation over expected conditioned on route, coverage, leverage, and timing | football | 20 | 120 | 259 | True | True | True | True |
| 241 | `409f5dad119c06ed` | `p8` | Ville's martingale inequality: anytime-valid forecast-skill E-process gate | math | 46 | 151 | 215 | True | True | True | True |
| 242 | `47da7cd12f78ad9c` | `p1` | 24-hour postural management conjunctive gate: mobility impairment AND risk presence | physiology | 49 | 378 | 300 | True | True | True | True |
| 243 | `47da7cd12f78ad9c` | `p2` | Exercise dose as a jointly-agreed constrained vector (frequency, duration, intensity) | physiology | 46 | 78 | 170 | True | True | True | True |
| 244 | `47da7cd12f78ad9c` | `p3` | Progressive-condition dose scheduling: low/intermediate frequency over a longer horizon | physiology | 49 | 193 | 157 | True | True | True | True |
| 245 | `47da7cd12f78ad9c` | `p4` | FES etiological gate: upper-motor-neurone lesion causation conditions stimulation | physiology | 50 | 167 | 151 | True | True | True | True |
| 246 | `47da7cd12f78ad9c` | `p5` | Fatigue confounder screening: treatable-factor set before primary attribution | psych | 45 | 252 | 206 | True | True | True | True |
| 247 | `49ef6f06a351a3f7` | `p1` | Hoeffding's inequality (bounded-variable concentration; Prop 1.2, eq 1.7) | math | 26 | 85 | 127 | True | True | True | True |
| 248 | `49ef6f06a351a3f7` | `p2` | McDiarmid's bounded-difference inequality (Prop 1.3) | math | 29 | 106 | 144 | True | True | True | True |
| 249 | `49ef6f06a351a3f7` | `p3` | Bernstein's inequality (variance-aware concentration; Prop 1.4, eq 1.11) | math | 30 | 85 | 136 | True | True | True | True |
| 250 | `49ef6f06a351a3f7` | `p4` | Finite-class uniform deviation bound (union bound + Hoeffding; section 4.4.3) | cs | 104 | 134 | 170 | True | True | True | True |
| 251 | `49ef6f06a351a3f7` | `p5` | Rademacher complexity and symmetrization (eq 4.12; Prop 4.2) | cs | 107 | 170 | 137 | True | True | True | True |
| 252 | `49ef6f06a351a3f7` | `p6` | Representer theorem and kernel ridge reformulation (Prop 7.1 / Cor 7.1, eq 7.2) | cs | 197 | 112 | 127 | True | True | True | True |
| 253 | `4c25fa54afee431d` | `p1` | Founding premise: experiments designed with purpose, aware of ignorance | cs | 305 | 103 | 0 | False | True | True | True |
| 254 | `4c25fa54afee431d` | `p2` | Maximum noisy observation is a spurious goalpost (not a utility) | cs | 182 | 85 | 0 | False | True | True | True |
| 255 | `4c25fa54afee431d` | `p3` | Noiseless-EI approximations must be avoided under significant noise | cs | 184 | 121 | 0 | False | True | True | True |
| 256 | `4c25fa54afee431d` | `p4` | UCB closed form and the fixed-beta vs fixed-target non-equivalence | cs | 189 | 176 | 165 | True | True | True | True |
| 257 | `4c25fa54afee431d` | `p5` | Knowledge-gradient KGCP: do not spend evaluations confirming belief | cs | 194 | 88 | 129 | True | True | True | True |
| 258 | `4c25fa54afee431d` | `p6` | Regret is an unavoidable consequence of decision under uncertainty | cs | 232 | 76 | 187 | True | True | True | True |
| 259 | `4c25fa54afee431d` | `p7` | Simple vs cumulative regret: no-regret is strictly stronger | cs | 233 | 246 | 108 | True | True | True | True |
| 260 | `4c25fa54afee431d` | `p8` | Density theorem: convergence on all continuous functions iff eventual density | math | 234 | 93 | 0 | False | True | True | True |
| 261 | `4c25fa54afee431d` | `p9` | Worst-case simple regret is unbounded at every finite stage | math | 235 | 72 | 0 | False | True | True | True |
| 262 | `4c25fa54afee431d` | `p10` | GP sample paths almost surely do not lie in their RKHS | math | 237 | 87 | 124 | True | True | True | True |
| 263 | `4c25fa54afee431d` | `p11` | RKHS norm of posterior mean equals Mahalanobis data-fit score | math | 238 | 122 | 155 | True | True | True | True |
| 264 | `4c25fa54afee431d` | `p12` | Rougher objectives require more observations (smoothness-sample complexity) | math | 239 | 138 | 0 | False | True | True | True |
| 265 | `4c25fa54afee431d` | `p13` | Russo-Van Roy: regret can only be high when learning compensates | cs | 244 | 98 | 113 | True | True | True | True |
| 266 | `4c25fa54afee431d` | `p14` | GP-UCB no-regret convergence certificate (Srinivas 2010) | cs | 246 | 70 | 262 | True | True | True | True |
| 267 | `4c25fa54afee431d` | `p15` | Scarlett lower bound: expected cumulative regret Omega(sqrt(tau)) via Fano | math | 249 | 102 | 139 | True | True | True | True |
| 268 | `4c25fa54afee431d` | `p16` | Chernoff: non-Bayesian sequential procedures are dangerous | history | 306 | 143 | 0 | False | True | True | True |
| 269 | `4c25fa54afee431d` | `p17` | Kushner 1962: all major ideas of modern BO already present | history | 307 | 97 | 0 | False | True | True | True |
| 270 | `4c25fa54afee431d` | `p18` | Attribution correction: Saltenis 1971 introduced EI, not Mockus | history | 308 | 84 | 0 | False | True | True | True |
| 271 | `4c25fa54afee431d` | `p19` | Thompson: never eliminate a treatment even against overwhelming evidence | history | 310 | 117 | 0 | False | True | True | True |
| 272 | `4c25fa54afee431d` | `p20` | Thompson sampling as a hallucinated objective function | cs | 167 | 69 | 137 | True | True | True | True |
| 273 | `4d067ce7fd44a2d1` | `p1` | Q-learning temporal-difference update (Bellman backup with learning-rate blending) | cs | 74 | 214 | 157 | True | True | True | True |
| 274 | `4d067ce7fd44a2d1` | `p2` | Greedy policy extraction: policy = argmax over Q | cs | 74 | 106 | 49 | True | True | True | True |
| 275 | `4d067ce7fd44a2d1` | `p3` | Ridge-regression closed-form Q-function fit with model blending | cs | 119 | 116 | 95 | True | True | True | True |
| 276 | `4d067ce7fd44a2d1` | `p4` | Cross-entropy (log-loss) objective for softmax classification | cs | 49 | 299 | 0 | False | True | True | True |
| 277 | `4d067ce7fd44a2d1` | `p5` | Bias-variance tradeoff: model complexity versus sample complexity | cs | 108 | 107 | 0 | False | True | True | True |
| 278 | `4d067ce7fd44a2d1` | `p6` | DQN stabilization: experience replay buffer and frozen target network | cs | 124 | 162 | 0 | False | True | True | True |
| 279 | `4d067ce7fd44a2d1` | `p7` | Holdout evaluation: train/test split on unseen data | cs | 31 | 96 | 0 | False | True | True | True |
| 280 | `4d067ce7fd44a2d1` | `p8` | Delayed-reward credit assignment | cs | 74 | 213 | 0 | False | True | True | True |
| 281 | `4d07e5902607436f` | `online_framework` | Online learning protocol (no statistical assumption) |  | p.109 (sec 1); protocol p.108-109 | 120 | 163 | True | True | True | True |
| 282 | `4d07e5902607436f` | `regret_def` | Regret relative to a hypothesis class |  | p.108 (sec 1); regret eqs 1.1-1.2 p.110 | 191 | 184 | True | True | True | True |
| 283 | `4d07e5902607436f` | `cover_impossibility` | Cover's impossibility and convexification by randomization |  | p.112 (sec 1.2); randomization p.115-116 | 108 | 112 | True | True | True | True |
| 284 | `4d07e5902607436f` | `halving` | Halving mistake bound (version-space majority) |  | p.114 (Theorem 1.2); Consistent Corollary 1.1 p.114 | 110 | 61 | True | True | True | True |
| 285 | `4d07e5902607436f` | `ftl` | Follow-The-Leader and its stability failure |  | p.124 (sec 2.2); failure Example 2.2 p.127 | 116 | 121 | True | True | True | True |
| 286 | `4d07e5902607436f` | `ftrl_stability` | Follow-The-Regularized-Leader: stability implies low regret |  | p.127 (sec 2.3); Lemma 2.3 p.128 | 93 | 147 | True | True | True | True |
| 287 | `4d07e5902607436f` | `ogd` | Online Gradient Descent regret bound |  | p.132-133 (eq 2.5, Corollary 2.7); update p.128 | 136 | 193 | True | True | True | True |
| 288 | `4d07e5902607436f` | `convex_linearization` | Convexity as lower-bounding tangents (linearization) |  | p.131 (Lemma 2.5, eq 2.3); reduction eq 2.4 p.132 | 94 | 169 | True | True | True | True |
| 289 | `4d07e5902607436f` | `strong_convexity` | Strong convexity (regularizer geometry) |  | p.134-135 (Definition 2.4, Lemma 2.8) | 85 | 123 | True | True | True | True |
| 290 | `4d07e5902607436f` | `reg_geometry_choice` | Regularizer must match loss geometry (ℓ1 vs ℓ2) |  | p.140 (Corollary 2.14 discussion, sec 2.5.3) | 70 | 159 | True | True | True | True |
| 291 | `4d07e5902607436f` | `omd` | Online Mirror Descent (link function) |  | p.141-142 (sec 2.6); Theorem 2.15 p.143 | 98 | 204 | True | True | True | True |
| 292 | `4d07e5902607436f` | `bregman` | Bregman divergence (posterior geometry) |  | p.148 (eq 2.12, sec 2.7.2) | 114 | 55 | True | True | True | True |
| 293 | `4d07e5902607436f` | `strong_smooth_duality` | Strong/smooth duality (Fenchel) |  | p.149 (Lemma 2.19); Fenchel-Young eq 2.11 p.147 | 77 | 210 | True | True | True | True |
| 294 | `4d07e5902607436f` | `weighted_majority` | Weighted Majority / prediction with expert advice |  | p.157-159 (sec 3.1, Theorem 3.1) | 91 | 164 | True | True | True | True |
| 295 | `4d07e5902607436f` | `littlestone` | Littlestone dimension characterizes online learnability |  | p.161-164 (sec 3.2, Defs 3.2-3.3, Corollary 3.4); VC comparison Theorem 3.5 p.164 | 107 | 187 | True | True | True | True |
| 296 | `4d07e5902607436f` | `perceptron_margin` | Perceptron margin mistake bound |  | p.171-172 (Theorem 3.9); hinge surrogate p.169 | 76 | 129 | True | True | True | True |
| 297 | `4d07e5902607436f` | `bandit_feedback` | Bandit limited feedback and importance-weighted gradients |  | p.177 (sec 4); estimator p.180, Corollary 4.2 p.181 | 196 | 177 | True | True | True | True |
| 298 | `4d07e5902607436f` | `bandit_oco` | Bandit OCO: gradient descent without a gradient |  | p.179 (sec 4.2); Flaxman-Kalai-McMahan sec 4.3 p.182-185 | 107 | 192 | True | True | True | True |
| 299 | `4d07e5902607436f` | `online_to_batch` | Online-to-Batch conversion (regret/T generalization) |  | p.187 (sec 5); Theorem 5.1, Corollary 5.2 p.188-189 | 133 | 186 | True | True | True | True |
| 300 | `4e3d8fd8a23059fc` | `p1` | ASPOGAMO camera-view player trajectory determination (Automated Sports Game Analysis Models) | football | 8 | 155 | 0 | False | True | True | True |
| 301 | `4e3d8fd8a23059fc` | `p2` | Wisdom-of-the-crowd projection aggregation (mean / weighted average / robust average) | math | 14 | 245 | 82 | True | True | True | True |
| 302 | `4e3d8fd8a23059fc` | `p3` | Armchair Analysis play-level custom charting schema (QB Pressure / Hits / Hurries; Defenders in the Box; Contested Balls) | football | 14 | 150 | 0 | False | True | True | True |
| 303 | `4e3d8fd8a23059fc` | `p4` | Google Research Football reinforcement-learning environment (Gameplay Football base) | cs | 9 | 90 | 0 | False | True | True | True |
| 304 | `4e3d8fd8a23059fc` | `p5` | DeepMind MuJoCo Multi-Agent Soccer Environment (2v2 physics-engine simulator) | physics | 9 | 119 | 0 | False | True | True | True |
| 305 | `4f974188ca231968` | `p1` | Glasgow Coma Score severity partition (mild/moderate/severe) | physiology | 9 | 188 | 139 | True | True | True | True |
| 306 | `4f974188ca231968` | `p2` | WHO operational definition of mild traumatic brain injury (conjunctive gate) | physiology | 15 | 118 | 222 | True | True | True | True |
| 307 | `4f974188ca231968` | `p3` | Vegetative state diagnostic criteria and aetiology-dependent permanence gate | physiology | 40 | 115 | 158 | True | True | True | True |
| 308 | `4f974188ca231968` | `p4` | Compensatory-over-restitution invariant in cognitive rehabilitation | psych | 26 | 242 | 0 | False | True | True | True |
| 309 | `4f974188ca231968` | `p5` | Amantadine transient recovery-rate kernel with washout convergence | physiology | 42 | 181 | 0 | False | True | True | True |
| 310 | `52b5d36325e11cd7` | `p1` | Wind-conditioned tempo invariant: with the wind play fast and kick early to press the advantage; against the wind play slowly, run for time, and conserve strength for the turn |  | 228 | 152 | 488 | True | True | True | True |
| 311 | `52b5d36325e11cd7` | `p2` | Play-revelation reservation rule: never spend an original or high-class running play in your own territory, where its diagnosis costs future scoring value; exercise it only in opponent territory or when beaten with about a minute left |  | 228 | 160 | 442 | True | True | True | True |
| 312 | `52b5d36325e11cd7` | `p3` | Field-zone action policy: partition the field into kicking-defense, field-goal, and kicking-attack zones and select the kick form by zone, distance punt early, placement from the thirty, quick drop from the twenty |  | 203 | 286 | 444 | True | True | True | True |
| 313 | `52b5d36325e11cd7` | `p4` | Tail-risk-bounded placing punt: from the forty near center, put the ball out of bounds just short of the ten rather than drive it closer, eliminating the wind-bounce touchback branch that hands the defense a fresh kick |  | 203 | 407 | 454 | True | True | True | True |
| 314 | `52b5d36325e11cd7` | `p5` | Matching-coins deception endgame: once generalship approaches a standard, guess the other coach's expectation of your eleven and choose between doing the expected and the unexpected to maximize deception |  | 268 | 328 | 434 | True | True | True | True |
| 315 | `52b5d36325e11cd7` | `p6` | Local-information generalship override: the quarterback on the field sees the defense's flaw better than the coaches and may violate the laid-out generalship when his instant observation beats the precommitted plan |  | 275 | 289 | 460 | True | True | True | True |
| 316 | `537da7b7adb2e1dd` | `p1` | Shannon entropy (Definition 2.13) | cs | 26 | 103 | 30 | True | True | True | True |
| 317 | `537da7b7adb2e1dd` | `p2` | Data Processing Theorem (Theorem 2.42) | cs | 45 | 108 | 53 | True | True | True | True |
| 318 | `537da7b7adb2e1dd` | `p3` | Fano's Inequality (Theorem 2.47) | cs | 47 | 193 | 43 | True | True | True | True |
| 319 | `537da7b7adb2e1dd` | `p4` | Weak Asymptotic Equipartition Property (Theorem 5.3, Weak AEP II) | cs | 114 | 180 | 175 | True | True | True | True |
| 320 | `537da7b7adb2e1dd` | `p5` | Channel Coding Theorem (Theorem 7.15) with DMC capacity (Definition 7.6) | cs | 161 | 145 | 64 | True | True | True | True |
| 321 | `537da7b7adb2e1dd` | `p6` | Max-Flow Bound for network coding (Theorem 18.3) | cs | 435 | 123 | 43 | True | True | True | True |
| 322 | `537da7b7adb2e1dd` | `p7` | Max-Flow Bound for Linear Network Coding (Theorem 19.10) | cs | 449 | 201 | 50 | True | True | True | True |
| 323 | `537da7b7adb2e1dd` | `p8` | I-Measure construction: information measures as a signed set measure (Theorem 3.6, eqs. 3.40-3.41) | math | 70 | 442 | 122 | True | True | True | True |
| 324 | `539b52ea8d0a6d37` | `p1` | Criticality of the Two-Point Correlator in Deep Linear Networks (C_W = 1) | cs | 58 | 295 | 264 | True | True | True | True |
| 325 | `539b52ea8d0a6d37` | `p2` | Depth-to-Width Ratio as the Emergent Running Coupling (Connected Four-Point Correlator) | cs | 62 | 221 | 217 | True | True | True | True |
| 326 | `539b52ea8d0a6d37` | `p3` | General-Activation Criticality via the Parallel Susceptibility (chi_parallel(K*) = 1) | physics | 113 | 306 | 214 | True | True | True | True |
| 327 | `539b52ea8d0a6d37` | `p4` | Non-Commuting Width/Depth Limits and the Double-Scaling Interpolating Solution (Chaos) | cs | 69 | 215 | 200 | True | True | True | True |
| 328 | `53bdc9b1b0089ddc` | `p1` | Simultaneous Alignment Selection with Pre-Snap Defensive Shift Gate | football | 2 | 65 | 0 | False | True | True | True |
| 329 | `53bdc9b1b0089ddc` | `p2` | Nine-Zone Passing Geometry with Even/Odd Parity Partition | football | 1 | 111 | 0 | False | True | True | True |
| 330 | `53bdc9b1b0089ddc` | `p3` | Hybrid Human-Computer Defensive Control (Single Control Man) | football | 2 | 99 | 0 | False | True | True | True |
| 331 | `53bdc9b1b0089ddc` | `p4` | Possession-First First-Down Priority (Score-vs-Possession Tradeoff) | football | 2 | 88 | 0 | False | True | True | True |
| 332 | `53bdc9b1b0089ddc` | `p5` | Blitz / Red-Dog Risk Acknowledgment (Pressure-vs-Coverage Gamble) | football | 2 | 53 | 0 | False | True | True | True |
| 333 | `53d47a558cf53d1f` | `p1` | Axioms I-V: field of probability (Ch. I §1, printed p. 2; PDF p. 13) | math | 13 | 278 | 87 | True | True | True | True |
| 334 | `53d47a558cf53d1f` | `p2` | Conditional probability and Theorem of Bayes, formula (14) (Ch. I §4, printed pp. 6-8; PDF pp. 17-19) | math | 19 | 212 | 97 | True | True | True | True |
| 335 | `53d47a558cf53d1f` | `p3` | Mutual independence of events; pairwise independence insufficient, 2^n - n - 1 conditions (Ch. I §5, Definition II and eq. (4), printed pp. 10-11; PDF pp. 21-22) | math | 22 | 225 | 142 | True | True | True | True |
| 336 | `53d47a558cf53d1f` | `p4` | Axiom VI (Axiom of Continuity) and complete additivity; infinite fields as idealized models (Ch. II §1, printed pp. 14-15; PDF pp. 25-26) | math | 26 | 409 | 161 | True | True | True | True |
| 337 | `53d47a558cf53d1f` | `p5` | Markov chain definition and basic composition formula p(k,n) = p(k,m)p(m,n) (Ch. I §6, printed p. 13; PDF p. 24) | math | 24 | 392 | 178 | True | True | True | True |
| 338 | `53d47a558cf53d1f` | `p6` | Law of Large Numbers: general idea and Markov condition for normal stability (Ch. VI §3, printed pp. 61-63; PDF pp. 72-74) | math | 74 | 250 | 204 | True | True | True | True |
| 339 | `53d47a558cf53d1f` | `p7` | Zero-or-One Law for tail events (Appendix, printed pp. 69-70; PDF pp. 80-81) | math | 80 | 435 | 100 | True | True | True | True |
| 340 | `53ff4fe1320a9a44` | `p1` | RBM energy-based joint distribution (Bernoulli-Bernoulli) | cs | 52 | 138 | 215 | True | True | True | True |
| 341 | `53ff4fe1320a9a44` | `p2` | RBM factorized sigmoid conditionals (bipartite conditional independence) | cs | 52 | 178 | 208 | True | True | True | True |
| 342 | `53ff4fe1320a9a44` | `p3` | Contrastive-divergence weight update (data minus model correlations) | cs | 53 | 107 | 90 | True | True | True | True |
| 343 | `53ff4fe1320a9a44` | `p4` | DSN closed-form output weights (convex subproblem constraint U = F(W)) | cs | 65 | 132 | 139 | True | True | True | True |
| 344 | `53ff4fe1320a9a44` | `p5` | DSSM cosine relevance and softmax click-through likelihood | cs | 124 | 108 | 159 | True | True | True | True |
| 345 | `53ff4fe1320a9a44` | `p6` | Dropout regularization (random omission plus weight scaling) | cs | 95 | 106 | 98 | True | True | True | True |
| 346 | `53ff4fe1320a9a44` | `p7` | Data-scaling of the DNN advantage (relative error reduction grows with training size) | cs | 78 | 259 | 105 | True | True | True | True |
| 347 | `53ff4fe1320a9a44` | `p8` | Rectified linear unit activation | cs | 90 | 98 | 17 | True | True | True | True |
| 348 | `5432be0e4c9c47fe` | `p1` | Ordinary least-squares normal equation (multiple linear regression coefficients) | math | 6 | 122 | 34 | True | True | True | True |
| 349 | `5432be0e4c9c47fe` | `p2` | Locally weighted least squares with Gaussian kernel (local linear weighting) | math | 6 | 162 | 129 | True | True | True | True |
| 350 | `5432be0e4c9c47fe` | `p3` | Convolutional neural network back-propagation error function (sum of squared outputs) | cs | 4 | 86 | 79 | True | True | True | True |
| 351 | `5432be0e4c9c47fe` | `p4` | Weighted multi-classifier ensemble fusion rules with information-gain weights | cs | 4 | 126 | 174 | True | True | True | True |
| 352 | `54c95039290a80fb` | `p1` | Q-learning temporal-difference update (Bellman optimality backup) | cs | 74 | 155 | 114 | True | True | True | True |
| 353 | `54c95039290a80fb` | `p2` | Greedy policy as argmax over the Q-function | cs | 74 | 106 | 27 | True | True | True | True |
| 354 | `54c95039290a80fb` | `p3` | Deep Q-network least-squares Bellman-residual loss | cs | 98 | 150 | 74 | True | True | True | True |
| 355 | `54c95039290a80fb` | `p4` | Ridge regression closed-form (regularized least squares) with EMA model update | math | 119 | 116 | 135 | True | True | True | True |
| 356 | `54c95039290a80fb` | `p5` | Bias-variance decomposition of mean squared error | math | 108 | 256 | 109 | True | True | True | True |
| 357 | `54c95039290a80fb` | `p6` | Cross-entropy (log-loss) and gradient descent optimization | cs | 49 | 592 | 92 | True | True | True | True |
| 358 | `553c5528787d2538` | `p1` | Acute-to-chronic ratio of player load (ACWR) | physiology | 19 | 290 | 63 | True | True | True | True |
| 359 | `553c5528787d2538` | `p2` | Session rating-of-perceived-exertion training load (sRPE x time) | physiology | 19 | 122 | 141 | True | True | True | True |
| 360 | `553c5528787d2538` | `p3` | Head-impact severity distribution (population median peak linear and rotational acceleration) | physics | 8 | 203 | 96 | True | True | True | True |
| 361 | `553c5528787d2538` | `p4` | Multidimensional concussion invariant (no universal severity-only threshold) | physiology | 22 | 319 | 0 | False | True | True | True |
| 362 | `553c5528787d2538` | `p5` | Anticipatory neck-muscle activation (awareness) reduces head-injury metrics, not strength | psych | 11 | 250 | 0 | False | True | True | True |
| 363 | `553c5528787d2538` | `p6` | Vagal-tone recovery index lnRMSSD and linemen autonomic impairment | physiology | 21 | 193 | 91 | True | True | True | True |
| 364 | `55d0f88972ad63be` | `55d0f88972ad63be_p1` | Three-downs-five-yards possession reset rule (1882) | football/history | 541 | 192 | 112 | True | True | True | True |
| 365 | `55d0f88972ad63be` | `55d0f88972ad63be_p2` | Era-weighted additive scoring functional (1883-1910) | football/history | 105 | 188 | 139 | True | True | True | True |
| 366 | `55d0f88972ad63be` | `55d0f88972ad63be_p3` | Scrimmage snap-back: deterministic possession assignment (1880) | football/history | 99 | 242 | 68 | True | True | True | True |
| 367 | `55d0f88972ad63be` | `55d0f88972ad63be_p4` | Forward pass as defensive-spreading threat option (1906) | football | 147 | 165 | 151 | True | True | True | True |
| 368 | `55d0f88972ad63be` | `55d0f88972ad63be_p5` | Mass-play innovation-prohibition cycle (1884-1910) | history/football | 151 | 427 | 0 | False | True | True | True |
| 369 | `55d0f88972ad63be` | `55d0f88972ad63be_p6` | Participant-verification protocol with declared uncertainty (Davis method) | history | 67 | 114 | 0 | False | True | True | True |
| 370 | `55e082c734ce5566` | `fleet_law` | Fleet Law (distributed step-time decomposition) |  | p.100 (eq 1.3); terms pp.100-102 | 204 | 122 | True | True | True | True |
| 371 | `55e082c734ce5566` | `scaling_law` | Power-law scaling law with irreducible floor |  | p.91 (sec 1.3.4); Theorem 1.1 p.87 | 311 | 81 | True | True | True | True |
| 372 | `55e082c734ce5566` | `comm_intensity` | Communication intensity and fabric balance |  | p.82 (eq 1.1) | 151 | 25 | True | True | True | True |
| 373 | `55e082c734ce5566` | `chinchilla_6pd` | Compute-optimal allocation and the 6PD training-FLOP law |  | p.85 (sec 1.3.2); O_train p.84; ~20 tokens/param p.84 | 174 | 36 | True | True | True | True |
| 374 | `55e082c734ce5566` | `reliability_gap` | Reliability gap (all-component availability) |  | p.93 (eq 1.2) | 166 | 47 | True | True | True | True |
| 375 | `55e082c734ce5566` | `roofline` | Roofline model (attainable throughput ceiling) |  | p.148 (eq 2.1) | 201 | 82 | True | True | True | True |
| 376 | `55e082c734ce5566` | `ridge_point` | Ridge point (precision-dependent efficiency threshold) |  | p.148 (Definition 2.3) | 130 | 58 | True | True | True | True |
| 377 | `55e082c734ce5566` | `alpha_beta` | Alpha-beta transfer cost model and crossover size |  | p.359 (sec 5.5); model p.41; crossover p.360 | 141 | 61 | True | True | True | True |
| 378 | `55e082c734ce5566` | `ring_allreduce` | Ring AllReduce bandwidth-optimal gradient synchronization |  | p.349 (Definition 5.1); cost table p.357 | 169 | 76 | True | True | True | True |
| 379 | `55e082c734ce5566` | `parallelism_3d` | 3D parallelism configuration cube |  | p.420 (sec 6.2, fig 6.2) | 376 | 65 | True | True | True | True |
| 380 | `55e082c734ce5566` | `exp_reliability` | Exponential system reliability and inverse-MTBF scaling |  | p.506 (eqs 7.3, 7.4); single-component p.505 | 114 | 148 | True | True | True | True |
| 381 | `55e082c734ce5566` | `young_daly` | Young-Daly optimal checkpoint interval |  | p.46 (Notation: Cluster Reliability, Fault Tolerance, and Checkpointing) | 161 | 87 | True | True | True | True |
| 382 | `55e082c734ce5566` | `availability_mttr` | Steady-state availability and the recovery lever |  | p.507 (Systems Perspective 7.1) | 88 | 55 | True | True | True | True |
| 383 | `55e082c734ce5566` | `r_eff` | Effective fleet throughput factorization |  | p.49 (Notation: Fleet capacity factors and goodput) | 112 | 124 | True | True | True | True |
| 384 | `55e082c734ce5566` | `dp_average` | Data-parallel gradient averaging preserves the SGD estimator |  | p.424 (sec 6.3) | 255 | 83 | True | True | True | True |
| 385 | `55e082c734ce5566` | `memory_budget` | Peak-residency memory budget (weights+gradients+optimizer+activations) |  | p.427 (sec 6.3.1.2) | 87 | 118 | True | True | True | True |
| 386 | `578457115b76903d` | `p1` | Season projection operator S(R) (sum of optimal weekly lineup scores) | cs | 3 | 132 | 31 | True | True | True | True |
| 387 | `578457115b76903d` | `p2` | Mass-conserving playoff-weighted gain g_a^w with non-playoff weight alpha_n | cs | 3 | 96 | 144 | True | True | True | True |
| 388 | `578457115b76903d` | `p3` | Fairness-penalized trade cost c with win-win constraints | cs | 3 | 127 | 134 | True | True | True | True |
| 389 | `578457115b76903d` | `p4` | Hybrid per-partner elitism with six mutation operators (diversity preservation) | cs | 4 | 131 | 0 | False | True | True | True |
| 390 | `578457115b76903d` | `p5` | Empirical gain-ratio lever law (alpha and beta control user-opponent gain ratio) | cs | 7 | 102 | 0 | False | True | True | True |
| 391 | `584e09211a54b4fa` | `p1` | Expected Points Added (EPA) as the before/after expected-points difference | football | 290 | 200 | 75 | True | True | True | True |
| 392 | `584e09211a54b4fa` | `p2` | Success rate: from yardage-fraction thresholds to the EPA>0 indicator | football | 294 | 362 | 47 | True | True | True | True |
| 393 | `584e09211a54b4fa` | `p3` | Completion Percentage Over Expected (CPOE) as a situation-conditioned accuracy residual | football | 288 | 186 | 87 | True | True | True | True |
| 394 | `584e09211a54b4fa` | `p4` | Logistic (binary) regression link: linear predictor mapped to a probability | math | 234 | 140 | 84 | True | True | True | True |
| 395 | `584e09211a54b4fa` | `p5` | Multinomial logit play-call policy over run/pass categories | football | 243 | 213 | 118 | True | True | True | True |
| 396 | `584e09211a54b4fa` | `p6` | Rare-event class-imbalance accuracy paradox and the F1 harmonic mean | cs | 239 | 103 | 90 | True | True | True | True |
| 397 | `5b79f17544fe148c` | `statistical_framework` | Statistical learning framework (learner blind to D) |  | sec 2.1, printed p.34 (PDF p.34) | 102 | 128 | True | True | True | True |
| 398 | `5b79f17544fe148c` | `erm_overfitting` | Empirical Risk Minimization and overfitting |  | sec 2.2-2.2.1, printed p.35-36 | 98 | 165 | True | True | True | True |
| 399 | `5b79f17544fe148c` | `inductive_bias` | Inductive bias (hypothesis class as prior knowledge) |  | sec 2.3, printed p.37 | 179 | 114 | True | True | True | True |
| 400 | `5b79f17544fe148c` | `pac_learnability` | PAC learnability and sample complexity |  | sec 3.1, printed p.43-44 (Def 3.1, Cor 3.2) | 100 | 211 | True | True | True | True |
| 401 | `5b79f17544fe148c` | `agnostic_bayes` | Agnostic PAC and the Bayes optimal predictor |  | sec 3.2.1, printed p.46 (Def 3.3) | 159 | 133 | True | True | True | True |
| 402 | `5b79f17544fe148c` | `uniform_convergence` | Uniform convergence (epsilon-exemplar sample) |  | sec 4.1, printed p.54 (Def 4.1, 4.3; Lemma 4.2; Cor 4.4) | 134 | 144 | True | True | True | True |
| 403 | `5b79f17544fe148c` | `hoeffding` | Hoeffding concentration + union bound (finite-class UC) |  | sec 4.2, printed p.56-57 (Lemma 4.5, Cor 4.6) | 151 | 223 | True | True | True | True |
| 404 | `5b79f17544fe148c` | `no_free_lunch` | No-Free-Lunch theorem (no universal learner) |  | sec 5.1, printed p.60-61 (Theorem 5.1) | 132 | 135 | True | True | True | True |
| 405 | `5b79f17544fe148c` | `bias_complexity` | Bias-complexity tradeoff (approximation + estimation error) |  | sec 5.2, printed p.62 (error decomposition) | 133 | 173 | True | True | True | True |
| 406 | `5b79f17544fe148c` | `approximation_error` | Approximation error vanishes only under realizability |  | sec 5.2, printed p.64-65 | 68 | 141 | True | True | True | True |
| 407 | `5b79f17544fe148c` | `vc_philosophy` | Shattering and the VC epistemic motto |  | sec 6.2, printed p.70 (Def 6.3 shattering; Cor 6.4; Thm 6.6) | 72 | 191 | True | True | True | True |
| 408 | `5b79f17544fe148c` | `fundamental_theorem` | Fundamental theorem of statistical learning |  | sec 6.4, printed p.72-73 (Theorems 6.7, 6.8) | 103 | 254 | True | True | True | True |
| 409 | `5b79f17544fe148c` | `sauer_growth` | Sauer-Shelah-Perles lemma (polynomial growth) |  | sec 6.5.1, printed p.73-74 (Def 6.9, Lemma 6.10) | 121 | 189 | True | True | True | True |
| 410 | `5b79f17544fe148c` | `vc_not_params` | VC dimension is not parameter count |  | sec 6.3.5, printed p.72 (sin example); sec 6.3.4 finite bound | 52 | 174 | True | True | True | True |
| 411 | `5b79f17544fe148c` | `rlm_stabilizer` | Regularized Loss Minimization (Tikhonov / ridge) |  | sec 13-13.1, printed p.171-172 (eq 13.1-13.5) | 76 | 152 | True | True | True | True |
| 412 | `5b79f17544fe148c` | `stability_generalization` | Replace-one stability equals the generalization gap |  | sec 13.2-13.3, printed p.173-177 (Thm 13.2, Def 13.3, Cor 13.6, 13.8) | 141 | 148 | True | True | True | True |
| 413 | `5b79f17544fe148c` | `sgd_unbiased` | Stochastic Gradient Descent (unbiased subgradient) |  | sec 14.3, printed p.191 (Thm 14.8); sec 14.4 projection | 106 | 210 | True | True | True | True |
| 414 | `5b79f17544fe148c` | `sgd_risk_fresh_example` | SGD minimizes true risk from a single fresh example |  | sec 14.5.1, printed p.196-197 (eq 14.13, Cor 14.12) | 78 | 205 | True | True | True | True |
| 415 | `5bb26b9323c43ddb` | `attention_intuition` | Attention: revisit the input rather than compress it |  | sec 11 intro, printed p.410 (Bahdanau et al. 2014) | 153 | 116 | True | True | True | True |
| 416 | `5bb26b9323c43ddb` | `attention_pooling` | Attention pooling aggregates (key,value) pairs |  | sec 11.1.2, printed p.414 (eq 11.1.1-11.1.3) | 81 | 136 | True | True | True | True |
| 417 | `5bb26b9323c43ddb` | `softmax_attention` | All popular attention uses softmax |  | sec 11.3.1, printed p.421 (eq 11.3.3) | 138 | 114 | True | True | True | True |
| 418 | `5bb26b9323c43ddb` | `scaled_dot_product` | Scaled dot-product attention (the 1/sqrt(d) fix) |  | sec 11.3.1, printed p.421 (eq 11.3.2, 11.3.6) | 104 | 148 | True | True | True | True |
| 419 | `5bb26b9323c43ddb` | `additive_attention` | Additive attention for mismatched dimensions |  | sec 11.3.4, printed p.425 (eq 11.3.7, Bahdanau) | 74 | 135 | True | True | True | True |
| 420 | `5bb26b9323c43ddb` | `self_attention` | Self-attention: every token attends to every token |  | sec 11.6, printed p.435-436 (eq 11.6.1) | 158 | 75 | True | True | True | True |
| 421 | `5bb26b9323c43ddb` | `attention_complexity` | Self-attention complexity: O(n^2 d), O(1) path |  | sec 11.6.2, printed p.437 | 148 | 198 | True | True | True | True |
| 422 | `5bb26b9323c43ddb` | `positional_encoding` | Positional encoding restores order to self-attention |  | sec 11.6.3, printed p.437-438 (eq 11.6.2-11.6.3) | 79 | 110 | True | True | True | True |
| 423 | `5bb26b9323c43ddb` | `transformer_residual_ln` | Transformer: residual connections + layer normalization |  | sec 11.7.1, printed p.441 (Vaswani et al. 2017) | 56 | 126 | True | True | True | True |
| 424 | `5bb26b9323c43ddb` | `masked_autoregressive` | Masked attention preserves the autoregressive property |  | sec 11.7.1, printed p.441 | 146 | 116 | True | True | True | True |
| 425 | `5bb26b9323c43ddb` | `cross_entropy_gradient` | Cross-entropy gradient = prediction minus reality |  | sec 4.1.2, printed p.130 (eq 4.1.10) | 216 | 107 | True | True | True | True |
| 426 | `5bb26b9323c43ddb` | `cross_entropy_loss` | Cross-entropy loss penalizes confident errors infinitely |  | sec 4.1.2, printed p.129-130 (eq 4.1.8-4.1.9) | 76 | 133 | True | True | True | True |
| 427 | `5bb26b9323c43ddb` | `sgd_unbiased` | SGD: unbiased gradient at O(1) cost |  | sec 12.4.1, printed p.493 (eq 12.4.1-12.4.4) | 79 | 115 | True | True | True | True |
| 428 | `5bb26b9323c43ddb` | `dynamic_learning_rate` | Dynamic learning-rate decay |  | sec 12.4.2, printed p.494-495 (eq 12.4.5) | 78 | 156 | True | True | True | True |
| 429 | `5bb26b9323c43ddb` | `momentum_velocity` | Momentum: velocity as a leaky average of gradients |  | sec 12.6.1, printed p.510-511 (eq 12.6.2-12.6.5, Polyak 1964) | 132 | 160 | True | True | True | True |
| 430 | `5bb26b9323c43ddb` | `momentum_illconditioned` | Momentum stabilizes ill-conditioned descent |  | sec 12.6.1, printed p.511 | 108 | 159 | True | True | True | True |
| 431 | `5bb26b9323c43ddb` | `adam_algorithm` | Adam: momentum + per-coordinate scaling + bias correction |  | sec 12.10, printed p.532-533 (eq 12.10.1-12.10.4) | 95 | 233 | True | True | True | True |
| 432 | `5bb26b9323c43ddb` | `adam_divergence` | Adam can diverge; Yogi fixes the second moment |  | sec 12.10, printed p.532 (eq 12.10.5-12.10.6, Yogi) | 87 | 156 | True | True | True | True |
| 433 | `5bb26b9323c43ddb` | `weight_decay` | Weight decay (ℓ2 regularization) restricts parameter size |  | sec 3.7.1, printed p.119-120 (eq 3.7.2-3.7.3) | 58 | 129 | True | True | True | True |
| 434 | `5bb26b9323c43ddb` | `dropout` | Dropout: input noise = Tikhonov regularization |  | sec 5.6, printed p.194-195 (eq 5.6.1, Srivastava et al. 2014) | 122 | 92 | True | True | True | True |
| 435 | `5c31b5de385d42ac` | `p1` | PFR state-mean kernel: score differential + drive expected points + linearly time-discounted kickoff line |  | 4 | 152 | 119 | True | True | True | True |
| 436 | `5c31b5de385d42ac` | `p2` | PFR uncertainty kernel: square-root time decay of outcome variance with empirical 13.45-point anchor |  | 5 | 803 | 74 | True | True | True | True |
| 437 | `5c31b5de385d42ac` | `p3` | Win probability as Gaussian tail area with half-mass tie correction |  | 5 | 379 | 124 | True | True | True | True |
| 438 | `5c31b5de385d42ac` | `p4` | Late-game time-floor regularization and overtime extension of the PFR kernel |  | 14 | 349 | 60 | True | True | True | True |
| 439 | `5c31b5de385d42ac` | `p5` | Calibration-gated accuracy-complexity null: closed-form PFR matches 500-tree random forest |  | 10 | 234 | 0 | False | True | True | True |
| 440 | `5e3094b6f359a758` | `p1` | Classification accuracy as ratio of correct predictions to evaluated cases | cs | 3 | 179 | 62 | True | True | True | True |
| 441 | `5e3094b6f359a758` | `p2` | Decision boundary: classification as partition of feature space vs regression as trend function | cs | 3 | 199 | 0 | False | True | True | True |
| 442 | `5e3094b6f359a758` | `p3` | C4.5/C5.0 decision-tree induction via information entropy (ID3 lineage) | cs | 3 | 170 | 37 | True | True | True | True |
| 443 | `5e3094b6f359a758` | `p4` | KStar instance-based classification with entropic distance and missing-value handling | cs | 3 | 192 | 0 | False | True | True | True |
| 444 | `5e3094b6f359a758` | `p5` | Meta END meta-classification: re-classifying classifier judgments in a new feature space | cs | 3 | 188 | 0 | False | True | True | True |
| 445 | `5e3094b6f359a758` | `p6` | Multi-agent learning-space growth with agent count | cs | 1 | 158 | 0 | False | True | True | True |
| 446 | `5e3094b6f359a758` | `p7` | Score prediction harder than win/lose prediction (review conclusion) | cs | 7 | 84 | 0 | False | True | True | True |
| 447 | `5e3094b6f359a758` | `p8` | DOE finding: ranking-difference threshold (>4) dominates home advantage (Liu, Shi & Najjar 2017, as reported) | cs | 5 | 148 | 0 | False | True | True | True |
| 448 | `5e3d2c14003c9e74` | `nfl2025-field-geometry` | NFL field geometry and the goal-line plane scoring condition |  | PDF p. 783 (Digest of Rules, FIELD, items 1-5) | 901 | 164 | True | True | True | True |
| 449 | `5e3d2c14003c9e74` | `nfl2025-scoring-weights` | NFL scoring weight vector (6/3/2/1/2), verified against box-score arithmetic |  | PDF p. 784 (Digest of Rules, TRY); weights cross-checked vs PDF p. 49, 55, 61 team scoring tables | 112 | 64 | True | True | True | True |
| 450 | `5e3d2c14003c9e74` | `nfl2025-timing` | NFL timing architecture: 4x15-min periods, 40/25-s play clock, 3 timeouts/half |  | PDF p. 783 (Digest of Rules, TIMING, items 2-6) | 713 | 134 | True | True | True | True |
| 451 | `5e3d2c14003c9e74` | `nfl2025-overtime` | NFL modified sudden-death overtime: possession guarantee and absorbing states |  | PDF p. 784 (Digest of Rules, OVERTIME, regular-season item 3); postseason item 1 and PDF p. 314 | 384 | 134 | True | True | True | True |
| 452 | `5e3d2c14003c9e74` | `nfl2025-seeding-tiebreak` | NFL playoff seeding bracket and 12-step lexicographic tiebreak with coin-toss terminal |  | PDF p. 11 (Wild Card Weekend Site Priorities); tiebreak procedure PDF p. 37 | 366 | 120 | True | True | True | True |
| 453 | `5e3d2c14003c9e74` | `nfl2025-scoring-genealogy` | Genealogy of NFL scoring weights: TD 4->5->6, FG 5->4->3 (1898-1912) |  | PDF p. 364 (Chronology of Professional Football, entries 1898/1904/1909/1912) | 105 | 108 | True | True | True | True |
| 454 | `5e3d2c14003c9e74` | `nfl2025-hof-selection` | Pro Football Hall of Fame selection: 50-member committee, 80% supermajority, 4-8 annual quota |  | PDF p. 347 (Pro Football Hall of Fame, selection process) | 332 | 61 | True | True | True | True |
| 455 | `5ebcc3f3acfef4c9` | `p1` | Shannon entropy of a discrete source (Theorem 2 axiomatic characterization) | math | 51 | 826 | 28 | True | True | True | True |
| 456 | `5ebcc3f3acfef4c9` | `p2` | Equivocation and rate of transmission R = H(x) - H_y(x); noisy-channel capacity C = max[H(x) - H_y(x)] | math | 67 | 348 | 58 | True | True | True | True |
| 457 | `5ebcc3f3acfef4c9` | `p3` | Theorem 11 - Fundamental theorem for a discrete channel with noise (noisy-channel coding theorem) | math | 71 | 502 | 144 | True | True | True | True |
| 458 | `5ebcc3f3acfef4c9` | `p4` | Theorem 17 - Shannon-Hartley capacity of a band-limited channel with white thermal noise under average power limitation | math | 100 | 457 | 81 | True | True | True | True |
| 459 | `5ebcc3f3acfef4c9` | `p5` | Theorem 13 - Sampling expansion for band-limited functions; 2TW degrees of freedom | math | 86 | 698 | 119 | True | True | True | True |
| 460 | `5ebcc3f3acfef4c9` | `p6` | Theorem 22 - Rate for a white noise source relative to an R.M.S. fidelity criterion (rate-distortion kernel) | math | 115 | 211 | 26 | True | True | True | True |
| 461 | `5fee5df924431396` | `P1` | Rule-evolution asymmetry: offense restricted, defense free; the forward pass as endogenous counter-legislation (1906-1912) | football | 13 | 78 | 0 | False | True | True | True |
| 462 | `5fee5df924431396` | `P2` | Coverage-overload / choice principle: spread eligibles across more zones than defenders can cover; pigeonhole kernel (derived) | football | 27 | 279 | 182 | True | True | True | True |
| 463 | `5fee5df924431396` | `P3` | Passer-depth time budget: experimental 13-15 yd window, 7-10 yd failure regime, 15 yd spiral-snap prerequisite, 55 yd clearance geometry | football | 25 | 93 | 154 | True | True | True | True |
| 464 | `5fee5df924431396` | `P4` | Defensive time-compression doctrine: pass cannot be prevented; hurry/jam/zone/open-defense levers with 1921 geometry | football | 35 | 123 | 0 | False | True | True | True |
| 465 | `62af700cfd3180fa` | `p1` | Pareto dominance / Pareto-efficiency criterion (eq. 1) | math | 3 | 224 | 92 | True | True | True | True |
| 466 | `62af700cfd3180fa` | `p2` | Nash equilibrium unilateral-deviation condition + existence (eq. 2) | math | 3 | 736 | 106 | True | True | True | True |
| 467 | `62af700cfd3180fa` | `p3` | Frequency-weighted additive role payoff kernel u_i = sum V_j rho(x_j) | math | 7 | 535 | 104 | True | True | True | True |
| 468 | `62af700cfd3180fa` | `p4` | QB-OL coupled payoff (minimal role-interaction instance) | math | 7 | 175 | 61 | True | True | True | True |
| 469 | `62af700cfd3180fa` | `p5` | Same-survey (multinomial) confidence interval for difference of win proportions (eq. 3) | math | 9 | 316 | 122 | True | True | True | True |
| 470 | `62af700cfd3180fa` | `p6` | Context-free grammar of legal American-football play sequences | cs | 4 | 258 | 93 | True | True | True | True |
| 471 | `64a4e0d61f21a823` | `p1` | Neural message-passing kernel (permutation-equivariant AGGREGATE-UPDATE recursion) | cs | 57 | 123 | 201 | True | True | True | True |
| 472 | `64a4e0d61f21a823` | `p2` | GCN symmetric-normalized aggregation kernel (degree-stabilized message passing) | cs | 61 | 185 | 129 | True | True | True | True |
| 473 | `64a4e0d61f21a823` | `p3` | Over-smoothing influence theorem (Jacobian influence proportional to random-walk visit probability) | cs | 67 | 210 | 141 | True | True | True | True |
| 474 | `64a4e0d61f21a823` | `p4` | Weisfeiler-Lehman expressivity ceiling and the injective GIN kernel | cs | 104 | 145 | 116 | True | True | True | True |
| 475 | `64a4e0d61f21a823` | `p5` | Spectral graph convolution as Laplacian polynomial; deep message passing as low-pass filter | cs | 95 | 323 | 110 | True | True | True | True |
| 476 | `64a4e0d61f21a823` | `p6` | Preferential-attachment generative kernel (degree-proportional growth, power-law alpha=3) | cs | 114 | 276 | 117 | True | True | True | True |
| 477 | `65c65dec7ddaacd5` | `p1` | Per-atom von Mises stress invariant from the virial stress tensor (Eq. 1) | physics | 3 | 161 | 227 | True | True | True | True |
| 478 | `65c65dec7ddaacd5` | `p2` | Quadratic stress-strain constitutive fit: Young's modulus E and negative third-order elastic modulus D (Table 1) | physics | 4 | 121 | 57 | True | True | True | True |
| 479 | `65c65dec7ddaacd5` | `p3` | Brittle versus sequential-metastable fracture dynamics: uniform vs localized stress concentration (PG 480 fs, MAC 1160 fs) | physics | 4 | 258 | 0 | False | True | True | True |
| 480 | `65c65dec7ddaacd5` | `p4` | Thermal sublimation threshold under linear ramp: discontinuous solid-to-gas-like transition (PG 4095 K, MAC 3626 K) | physics | 6 | 111 | 0 | False | True | True | True |
| 481 | `678271d94588b50d` | `p1` | Maximum-likelihood recipe for constructing any loss function | cs | 74 | 117 | 111 | True | True | True | True |
| 482 | `678271d94588b50d` | `p2` | Least squares is a consequence of the Gaussian + independence assumptions | cs | 76 | 148 | 99 | True | True | True | True |
| 483 | `678271d94588b50d` | `p3` | Heteroscedastic regression: predict the variance, not just the mean | cs | 78 | 175 | 65 | True | True | True | True |
| 484 | `678271d94588b50d` | `p4` | Negative log-likelihood, cross-entropy, and KL divergence are equivalent | cs | 86 | 129 | 170 | True | True | True | True |
| 485 | `678271d94588b50d` | `p5` | Convex losses guarantee the global minimum; neural losses do not | cs | 94 | 123 | 0 | False | True | True | True |
| 486 | `678271d94588b50d` | `p6` | Adam: adaptive per-parameter steps with bias-corrected moments | cs | 104 | 152 | 229 | True | True | True | True |
| 487 | `678271d94588b50d` | `p7` | He initialization: variance 2/D_h keeps ReLU activations stable | cs | 124 | 118 | 205 | True | True | True | True |
| 488 | `678271d94588b50d` | `p8` | Bias-variance-noise decomposition of expected test error | cs | 138 | 157 | 237 | True | True | True | True |
| 489 | `678271d94588b50d` | `p9` | Double descent: test error falls again past the interpolation threshold | cs | 143 | 154 | 0 | False | True | True | True |
| 490 | `678271d94588b50d` | `p10` | Curse of dimensionality: training data are vanishingly sparse | math | 143 | 134 | 0 | False | True | True | True |
| 491 | `678271d94588b50d` | `p11` | Implicit regularization: SGD penalizes batch-gradient variance | cs | 157 | 103 | 234 | True | True | True | True |
| 492 | `678271d94588b50d` | `p12` | Regularization is a Bayesian prior: MAP estimation | cs | 153 | 191 | 133 | True | True | True | True |
| 493 | `678271d94588b50d` | `p13` | Residual identity path: gradients reach early layers directly | cs | 205 | 166 | 267 | True | True | True | True |
| 494 | `678271d94588b50d` | `p14` | Shattered gradients: deep-network gradients become uncorrelated | cs | 201 | 115 | 0 | False | True | True | True |
| 495 | `678271d94588b50d` | `p15` | Batch normalization: standardize then learn scale and shift | cs | 208 | 119 | 120 | True | True | True | True |
| 496 | `678271d94588b50d` | `p16` | The epistemic frontier: a priori, deep learning shouldn't work | cs | 416 | 184 | 0 | False | True | True | True |
| 497 | `678271d94588b50d` | `p17` | Lottery ticket hypothesis: winning subnetworks at initialization | cs | 421 | 92 | 0 | False | True | True | True |
| 498 | `678271d94588b50d` | `p18` | Flat minima correlate with generalization — but sharpness alone is not sufficient | cs | 426 | 84 | 0 | False | True | True | True |
| 499 | `678271d94588b50d` | `p19` | Grokking and the Goldilocks zone: delayed generalization via weight norm | cs | 427 | 110 | 0 | False | True | True | True |
| 500 | `678271d94588b50d` | `p20` | No prescriptive theory: the limits of understanding deep learning | cs | 434 | 155 | 0 | False | True | True | True |
| 501 | `68aeef90c5264628` | `p1` | Rub/Pick Route Crossing Constraint (Bunch Play 1 vs Man to Man) | football | 3 | 260 | 0 | False | True | True | True |
| 502 | `68aeef90c5264628` | `p2` | Flood Overload Counting Invariant (Trips Play 1 vs Cover 3) | football | 23 | 122 | 0 | False | True | True | True |
| 503 | `68aeef90c5264628` | `p3` | Single-Defender High-Low Binary Read (Twins Stack Play 1 vs Cover 1) | football | 12 | 179 | 0 | False | True | True | True |
| 504 | `68aeef90c5264628` | `p4` | Cover 2 Middle-of-Field Soft Spot | football | 14 | 57 | 0 | False | True | True | True |
| 505 | `68aeef90c5264628` | `p5` | Play-Action Forward-Step Deception Mechanism | football | 2 | 182 | 0 | False | True | True | True |
| 506 | `68aeef90c5264628` | `p6` | Coverage Call Exclusion Rule (NFL Flag Man: Red Zone / Bunch) | football | 31 | 79 | 0 | False | True | True | True |
| 507 | `6aeb75fe28eb9cd8` | `p1` | Anti-zone-play early-offense invariant: do not gate attack by field zone; score at the earliest feasible moment; start the strongest lineup | football | 287 | 173 | 232 | True | True | True | True |
| 508 | `6aeb75fe28eb9cd8` | `p2` | Field-goal vs scoring-play tie-break: take the field goal only if slightly surer; at about-even chances take the big scoring play (payoff-dominance tie-break) | football | 303 | 127 | 165 | True | True | True | True |
| 509 | `6aeb75fe28eb9cd8` | `p3` | Blocker single-side forcing invariant: stay on one side of the man to be blocked to collapse his dodge set to one direction; standing directly in front gives him two guesses | football | 276 | 114 | 173 | True | True | True | True |
| 510 | `6aeb75fe28eb9cd8` | `p4` | Defensive fullback nearest-central-spot covering invariant: take the minimax-central feasible spot over reachable threats; adaptive depth 25 -> 30 yards on a kick-from-running-formation | football | 253 | 112 | 248 | True | True | True | True |
| 511 | `6aeb75fe28eb9cd8` | `p5` | Receiver self-determination + single-use interference invariant: the catcher chooses his own path; the helper is a budget-1 resource spent on the first/most dangerous down-field man | football | 256 | 275 | 213 | True | True | True | True |
| 512 | `6aeb75fe28eb9cd8` | `p6` | Placement-kick non-monotone block-hazard invariant: block danger peaks near eight yards depth; wing-block hazard rises with depth while line-collision hazard falls | football | 265 | 329 | 141 | True | True | True | True |
| 513 | `6bc7d84da4bde923` | `p1` | Defensive territory-minimization invariant: shrink the advance-feasible region at the snap so eleven fixed defenders can protect it; close the line rather than let it pull open |  | 213 | 135 | 400 | True | True | True | True |
| 514 | `6bc7d84da4bde923` | `p2` | End-rush lead-intercept rule: take the sharp inward path B D, not the sideline-retreat A B, to reach the runner before interference forms and turn him into the forward pocket |  | 216 | 137 | 407 | True | True | True | True |
| 515 | `6bc7d84da4bde923` | `p3` | Field-position-over-possession doctrine: prefer the opponent holding the ball at their own twenty-five to holding it yourself at your own twenty-five; kick for territory, then regain nearer their goal |  | 188 | 152 | 441 | True | True | True | True |
| 516 | `6bc7d84da4bde923` | `p4` | Kick-timing unpredictability rule: do not reserve the kick for the forced third down, where the opponent must expect it; distribute kicks across earlier downs by field zone |  | 190 | 99 | 462 | True | True | True | True |
| 517 | `6bc7d84da4bde923` | `p5` | Loss-minimization concession kernel: when rushers are on the full-back before he can kick, concede a safety rather than risk a touchdown; better give up two points than four or six |  | 230 | 199 | 452 | True | True | True | True |
| 518 | `6bc7d84da4bde923` | `p6` | Centre shortest-path rule: the straight line through the centre is the shortest distance to the required five yards, the base of a right triangle being shorter than the hypotenuse of an end run |  | 150 | 223 | 370 | True | True | True | True |
| 519 | `6c532aecbad020e8` | `p1` | Third-down conversion as a binomial rate operator | football | 1 | 99 | 95 | True | True | True | True |
| 520 | `6c532aecbad020e8` | `p2` | Possession-time conservation and its audit | football | 1 | 52 | 92 | True | True | True | True |
| 521 | `6c532aecbad020e8` | `p3` | Net rushing yardage decomposition under NCAA convention | football | 14 | 53 | 112 | True | True | True | True |
| 522 | `6c532aecbad020e8` | `p4` | Red-zone efficiency: scores, touchdowns, and points per trip | football | 15 | 87 | 107 | True | True | True | True |
| 523 | `6c532aecbad020e8` | `p5` | Small-denominator percentage: 1-for-1 is not 100 percent ability | football | 1 | 84 | 209 | True | True | True | True |
| 524 | `6c532aecbad020e8` | `p6` | NCAA passer-efficiency composite operator (reconstructed and verified) | football | 16 | 50 | 78 | True | True | True | True |
| 525 | `6cf36a29e51c0a02` | `hg-point-potential-linear` | Linear field-position point potential (1 point per 12.5 yards) | football | 106 | 295 | 48 | True | True | True | True |
| 526 | `6cf36a29e51c0a02` | `hg-next-score-ep` | Next-score expected-points estimator (midfield = 1.96 points) | football | 105 | 269 | 109 | True | True | True | True |
| 527 | `6cf36a29e51c0a02` | `hg-turnover-swing` | Turnover point-potential swing is a field-position-independent 4 points | football | 108 | 134 | 125 | True | True | True | True |
| 528 | `6cf36a29e51c0a02` | `hg-fourth-down-ep-rule` | Fourth-down go/kick decision by expected point potential (0.7*5.8 + 0.3*1.6 = 4.54) | football | 163 | 160 | 143 | True | True | True | True |
| 529 | `6cf36a29e51c0a02` | `hg-drive-wp-value` | Win probability as a game-state value function; drive value = delta WP | football | 78 | 271 | 129 | True | True | True | True |
| 530 | `6cf36a29e51c0a02` | `hg-down-success-thresholds` | Down-dependent success thresholds (40% / 60% / 100% of yards to go) | football | 72 | 259 | 116 | True | True | True | True |
| 531 | `6cf36a29e51c0a02` | `hg-era-relative-rate` | Era-relative dominance RATE and the 10/45 new passer rating | football | 395 | 308 | 265 | True | True | True | True |
| 532 | `6cf36a29e51c0a02` | `hg-scoring-regression` | Season scoring regression: yards/14.03, turnovers x 2.08, intercept 38.7 (560 team-seasons) | football | 239 | 187 | 92 | True | True | True | True |
| 533 | `6d101348291a5c1f` | `p1` | Metric stability as lag-1 Pearson correlation (sticky-stats reliability gate) | math | 48 | 109 | 120 | True | True | True | True |
| 534 | `6d101348291a5c1f` | `p2` | Expectation-residual metric construction (RYOE / CPOE / xG operator) with stability validation gate | math | 26 | 170 | 99 | True | True | True | True |
| 535 | `6d101348291a5c1f` | `p3` | Generalized linear model with logit link for bounded binary responses (logistic completion model) | math | 170 | 167 | 137 | True | True | True | True |
| 536 | `6d101348291a5c1f` | `p4` | Poisson count kernel and log-link Poisson regression for low-frequency discrete events | math | 205 | 122 | 154 | True | True | True | True |
| 537 | `6d101348291a5c1f` | `p5` | Scale-first principal component analysis (eigen-rotation) and k-means archetype clustering | cs | 277 | 78 | 135 | True | True | True | True |
| 538 | `6e0d7d342ecb2ea6` | `p1` | Main Theorem of zero-sum two-person games: general strict determinateness / minimax equality (17.6, eq. (17:6); printed p. 153; PDF p. 176) | math | 176 | 536 | 267 | True | True | True | True |
| 539 | `6e0d7d342ecb2ea6` | `p2` | Axiomatic utility: axioms (3:A)-(3:C) and numerical utility unique up to a linear transformation (3.6.1, printed p. 26, PDF p. 49; Appendix A.2, printed pp. 617-628, PDF pp. 640-651) | math | 49 | 983 | 332 | True | True | True | True |
| 540 | `6e0d7d342ecb2ea6` | `p3` | Characteristic function of a zero-sum n-person game: axioms (25:3:a)-(25:3:c) and the conceptual proof of superadditivity (25.3, printed pp. 241-242; PDF pp. 264-265) | math | 265 | 479 | 111 | True | True | True | True |
| 541 | `6e0d7d342ecb2ea6` | `p4` | Imputation: individual rationality (30:1) and collective efficiency (30:2) in the zero-sum reduced form (30.1.1, printed p. 263; PDF p. 286) | math | 286 | 257 | 76 | True | True | True | True |
| 542 | `6e0d7d342ecb2ea6` | `p5` | Domination (30:3)-(30:4) and solution as stable standard of behavior (30:5:a)-(30:5:c) (30.1.1, printed p. 264; PDF p. 287) | math | 287 | 389 | 305 | True | True | True | True |
| 543 | `6e0d7d342ecb2ea6` | `p6` | Strategic equivalence, unique reduced form (27:A), and the essential/inessential dichotomy (27.1-27.3, printed pp. 246-249; PDF pp. 269-272) | math | 271 | 285 | 247 | True | True | True | True |
| 544 | `6e0d7d342ecb2ea6` | `p7` | Fictitious-player zero-sum extension of a general n-person game, eq. (56:2) (56.2.2, printed p. 506; PDF p. 529) | math | 529 | 886 | 96 | True | True | True | True |
| 545 | `6e0d7d342ecb2ea6` | `p8` | Uniqueness of the solution under finiteness and strict acyclicity, theorem (65:X) (65.7-65.8, printed pp. 598-600; PDF pp. 621-623) | math | 623 | 346 | 203 | True | True | True | True |
| 546 | `6e380ace520cdafa` | `g1_entropy_ergodic_theorem` | Entropy ergodic theorem / Shannon-McMillan-Breiman: sample entropy converges a.e. to entropy rate (Gray Lemma 3.2.1, printed p51) | ['cs', 'information-theory', 'ergodic-theory'] | 72 | 199 | 81 | True | True | True | True |
| 547 | `6e380ace520cdafa` | `g2_aep_typical_set_counting` | Asymptotic equipartition property: ~e^{n Hbar} equiprobable typical sequences (Gray §3.5, printed p68) | ['cs', 'information-theory', 'source-coding'] | 89 | 201 | 160 | True | True | True | True |
| 548 | `6e380ace520cdafa` | `g3_divergence_inequality` | Divergence inequality: D(P\|\|M) >= 0 with equality iff P = M (Gray Lemma 5.2.1, printed p84) | ['cs', 'information-theory', 'statistics'] | 105 | 125 | 109 | True | True | True | True |
| 549 | `6e380ace520cdafa` | `g4_feinstein_lemma` | Feinstein's lemma: one-shot channel code error <= M e^{-a} + P(i <= a) (Gray Lemma 12.2.1, printed p255) | ['cs', 'information-theory', 'channel-coding'] | 276 | 177 | 71 | True | True | True | True |
| 550 | `6e380ace520cdafa` | `g5_capacity_equality_coding` | Equality of operational, AMS, stationary, ergodic and Shannon capacities; R < C achievable (Gray Lemma 12.4.3 + Cor 12.4.1, printed p263) | ['cs', 'information-theory', 'channel-coding'] | 284 | 129 | 165 | True | True | True | True |
| 551 | `719c464f186464cd` | `p1` | Apprenticeship depth over breadth: championship coaches stay with a single mentor | football | 4 | 151 | 0 | False | True | True | True |
| 552 | `719c464f186464cd` | `p2` | Mentor prolificacy predicts champion production; championship concentration (24/40) | football | 4 | 236 | 0 | False | True | True | True |
| 553 | `719c464f186464cd` | `p3` | Relational probability tree: tenure and avoidance of catastrophic seasons; plural winning recipes | football | 5 | 177 | 0 | False | True | True | True |
| 554 | `719c464f186464cd` | `p4` | Precision at playoff level: coaching-history model beats persistence and random | football | 6 | 145 | 130 | True | True | True | True |
| 555 | `719c464f186464cd` | `p5` | Staff composition: first-year head-coach penalty and assistant playoff-experience threshold | football | 5 | 167 | 0 | False | True | True | True |
| 556 | `719c464f186464cd` | `p6` | Regime break: salary cap and free agency decay predictability toward random ('Any Given Season') | football | 6 | 148 | 0 | False | True | True | True |
| 557 | `719c464f186464cd` | `p7` | Autocorrelation and collective classification: skill propagates through mentors and opponents | football | 7 | 236 | 0 | False | True | True | True |
| 558 | `719c464f186464cd` | `p8` | Three dependency types any complex-network model must represent; offense/defense composition | football | 7 | 154 | 0 | False | True | True | True |
| 559 | `73c11ea388c2e5f6` | `j1_plasticity_habit` | Habit as plasticity: structure weak enough to yield, strong enough not to yield all at once (James Ch IV, printed p105) | ['psych', 'habit', 'motor-learning', 'neuroplasticity'] | 122 | 283 | 0 | False | True | True | True |
| 560 | `73c11ea388c2e5f6` | `j2_stream_of_thought` | The stream of thought: consciousness is continuous, not chopped into bits (James Ch IX, printed p239) | ['psych', 'consciousness', 'attention', 'cognition'] | 256 | 222 | 0 | False | True | True | True |
| 561 | `73c11ea388c2e5f6` | `j3_attention_withdrawal` | Attention as focalization with withdrawal; its opposite is distraction (James Ch XI, printed p404) | ['psych', 'attention', 'cognitive-load', 'executive-control'] | 421 | 308 | 0 | False | True | True | True |
| 562 | `73c11ea388c2e5f6` | `j4_fechner_weber_psychophysics` | Fechner's psychophysical measure formula S = C log R, built on Weber's constant-fraction law (James Ch XIII, printed p539-540) | ['psych', 'psychophysics', 'discrimination', 'measurement'] | 556 | 147 | 99 | True | True | True | True |
| 563 | `73c11ea388c2e5f6` | `j5_retentiveness_elaborating_associates` | Native retentiveness is unchangeable; memory improvement is elaborating associates (James Ch XVI, printed p663-664) | ['psych', 'memory', 'learning', 'association'] | 680 | 198 | 0 | False | True | True | True |
| 564 | `74b7272fc5b1919d` | `p1` | Probability as an objective logical relation between proposition-sets (a/h) | math | 23 | 177 | 12 | True | True | True | True |
| 565 | `74b7272fc5b1919d` | `p2` | Multiplication Theorem (Def. X) and definition of independence (Def. XIII) | math | 155 | 230 | 38 | True | True | True | True |
| 566 | `74b7272fc5b1919d` | `p3` | Addition Theorem for exclusive alternatives (24.1) and general form (24) | math | 163 | 202 | 78 | True | True | True | True |
| 567 | `74b7272fc5b1919d` | `p4` | Inverse Principle (38) and Johnson's Cumulative Formula (46) with the coefficient of dependence | math | 171 | 187 | 126 | True | True | True | True |
| 568 | `74b7272fc5b1919d` | `p5` | Weight of arguments V(a/h): evidence volume independent of probability balance | math | 96 | 140 | 63 | True | True | True | True |
| 569 | `74b7272fc5b1919d` | `p6` | Principle of Indifference and the indivisible-alternatives qualification | math | 80 | 245 | 153 | True | True | True | True |
| 570 | `74b7272fc5b1919d` | `p7` | Bernoulli's Theorem: binomial frequency concentration, the mpq condition, and the two-headed-coin counterexample | math | 356 | 174 | 79 | True | True | True | True |
| 571 | `74b7272fc5b1919d` | `p8` | The Inductive Hypothesis: limitation of independent variety; inductive correlation over universal induction | other | 279 | 126 | 25 | True | True | True | True |
| 572 | `77d4ee5161695968` | `p1` | Min-max normalization of player/team statistics to [0,1] (Equation 1) | football | 10 | 135 | 52 | True | True | True | True |
| 573 | `77d4ee5161695968` | `p2` | Quantile-based removal of low-sample players before rate statistics | football | 9 | 193 | 0 | False | True | True | True |
| 574 | `77d4ee5161695968` | `p3` | Yards per catch as season receiving yards divided by catches | football | 9 | 171 | 43 | True | True | True | True |
| 575 | `77d4ee5161695968` | `p4` | Average minimum clearance: mean over route points of distance to nearest defender | football | 14 | 284 | 103 | True | True | True | True |
| 576 | `77d4ee5161695968` | `p5` | Route selection by weighted total of normalized route score and disturbance, argmax | football | 15 | 319 | 85 | True | True | True | True |
| 577 | `77d4ee5161695968` | `p6` | Personnel-package combinatorics: 11 players = 5 OL + 1 QB + 5 skill slots | football | 10 | 237 | 0 | False | True | True | True |
| 578 | `77d4ee5161695968` | `p7` | WR1/WR2/WR3 ordering by season base targets (revealed preference) | football | 14 | 181 | 0 | False | True | True | True |
| 579 | `77d4ee5161695968` | `p8` | Coverage-beater structure: corner and post routes exploit cover 2 zone | football | 12 | 148 | 0 | False | True | True | True |
| 580 | `7b8723df5531a5a9` | `p1_uat_nonpolynomial_iff` | Universal approximation iff non-polynomial activation (Leshno-Lin-Pinkus-Schocken, book Thm 3.9) | ['math', 'deep-learning-theory', 'approximation-theory'] | 29 | 125 | 149 | True | True | True | True |
| 581 | `7b8723df5531a5a9` | `p2_piece_upper_bound_depth_exponential` | Affine-piece upper bound (p*width)^L: depth multiplies, width adds (book Thm 6.3) | ['math', 'deep-learning-theory', 'ReLU-geometry'] | 74 | 158 | 69 | True | True | True | True |
| 582 | `7b8723df5531a5a9` | `p3_depth_lower_bound_curvature` | Curvature-driven depth lower bound: error >= C*(2 width)^(-2L) (book Thm 6.4) | ['math', 'deep-learning-theory', 'approximation-lower-bounds'] | 74 | 305 | 125 | True | True | True | True |
| 583 | `7b8723df5531a5a9` | `p4_expected_pieces_random_bias` | Random-bias expected piece count O(L*N), not exponential (book Thm 6.9, Eq 6.3.1) | ['math', 'deep-learning-theory', 'random-initialization'] | 79 | 77 | 145 | True | True | True | True |
| 584 | `7b8723df5531a5a9` | `p5_curse_of_dimensionality_any_architecture` | Curse of dimensionality for any continuously parametrized approximator (book Cor 8.6, Thm 8.4) | ['math', 'deep-learning-theory', 'information-based-complexity'] | 103 | 142 | 170 | True | True | True | True |
| 585 | `7b8723df5531a5a9` | `p6_barron_dimension_free_rate` | Barron-class dimension-free O(c/N) mean-square approximation (book Thm 8.12, Eq 8.2.1) | ['math', 'deep-learning-theory', 'Barron-space', 'harmonic-analysis'] | 108 | 160 | 160 | True | True | True | True |
| 586 | `7e3a32c1d8621611` | `p1` | ICP/CPP management corridor: treat above 22 mmHg ICP, target 60-70 mmHg CPP, harm above 70 | physiology | 21 | 106 | 180 | True | True | True | True |
| 587 | `7e3a32c1d8621611` | `p2` | Age-stratified systolic blood pressure floor: piecewise threshold by age band | physiology | 20 | 215 | 149 | True | True | True | True |
| 588 | `7e3a32c1d8621611` | `p3` | PaCO2 ventilation window: forbidden zone below 25, normo-ventilation 35-45, therapeutic override 30-34 | physiology | 32 | 92 | 271 | True | True | True | True |
| 589 | `7e3a32c1d8621611` | `p4` | Time-persistence intervention gate: threshold AND duration >5 min for ICP and PbtO2 | physiology | 21 | 148 | 172 | True | True | True | True |
| 590 | `7e3a32c1d8621611` | `p5` | S100B biomarker certificate: cutoffs, kinetics, and asymmetric sensitivity/specificity | physiology | 117 | 102 | 317 | True | True | True | True |
| 591 | `7e3a32c1d8621611` | `p6` | GFAP pathology threshold and release kinetics: extracranial-immune astroglial channel | physiology | 116 | 155 | 202 | True | True | True | True |
| 592 | `7ec06be65ab3f269` | `p1` | Utility representation and positive-affine uniqueness | cs | 135 | 199 | 128 | True | True | True | True |
| 593 | `7ec06be65ab3f269` | `p2` | Maximum expected utility principle | cs | 138 | 126 | 130 | True | True | True | True |
| 594 | `7ec06be65ab3f269` | `p3` | Value of information is nonnegative and action-change-gated | cs | 143 | 150 | 176 | True | True | True | True |
| 595 | `7ec06be65ab3f269` | `p4` | Finite-horizon optimal policies are time-dependent (clock-aware risk) | cs | 157 | 154 | 137 | True | True | True | True |
| 596 | `7ec06be65ab3f269` | `p5` | Bellman residual convergence certificate | cs | 164 | 110 | 171 | True | True | True | True |
| 597 | `7ec06be65ab3f269` | `p6` | Certainty equivalence (plan on the mean under linear-Gaussian noise) | cs | 172 | 86 | 140 | True | True | True | True |
| 598 | `7ec06be65ab3f269` | `p7` | Reward-shaping policy invariance (potential-based iff) | cs | 365 | 105 | 95 | True | True | True | True |
| 599 | `7ec06be65ab3f269` | `p8` | Importance sampling for rare-event policy evaluation | cs | 309 | 152 | 211 | True | True | True | True |
| 600 | `7ec06be65ab3f269` | `p9` | Robust dynamic programming (minimax over a model suite) | cs | 311 | 404 | 107 | True | True | True | True |
| 601 | `7ec06be65ab3f269` | `p10` | Do-not-deploy as a first-class remediation option | cs | 316 | 103 | 148 | True | True | True | True |
| 602 | `7ec06be65ab3f269` | `p11` | Discrete belief update and the overconfidence guard | cs | 405 | 308 | 131 | True | True | True | True |
| 603 | `7ec06be65ab3f269` | `p12` | Particle deprivation and adaptive injection | cs | 412 | 170 | 242 | True | True | True | True |
| 604 | `7ec06be65ab3f269` | `p13` | Alpha-vector value function is piecewise-linear and convex | cs | 433 | 231 | 115 | True | True | True | True |
| 605 | `7ec06be65ab3f269` | `p14` | Quantal (softmax) response: errors scale with cheapness | cs | 519 | 94 | 156 | True | True | True | True |
| 606 | `7ec06be65ab3f269` | `p15` | Hierarchical softmax: bounded-depth recursive theory of mind | cs | 526 | 273 | 141 | True | True | True | True |
| 607 | `7ec06be65ab3f269` | `p16` | Fictitious play: empirical-frequency opponent modeling | cs | 527 | 274 | 98 | True | True | True | True |
| 608 | `7ec06be65ab3f269` | `p17` | Markov-game best response reduces to a single-agent MDP | cs | 541 | 82 | 119 | True | True | True | True |
| 609 | `7ec06be65ab3f269` | `p18` | Traveler's dilemma: empirical bound on human rationality depth | cs | 528 | 98 | 100 | True | True | True | True |
| 610 | `7ec06be65ab3f269` | `p19` | Nash equilibrium computation is PPAD-complete | cs | 520 | 152 | 130 | True | True | True | True |
| 611 | `7f0f084cdb020856` | `p1` | Mixed-strategy Nash equilibrium of the constant-sum PK game: indifference conditions and the zero-correlation prediction | cs | 4 | 288 | 238 | True | True | True | True |
| 612 | `7f0f084cdb020856` | `p2` | Statistical game against Nature: argmax selection inflates observed location-conditional conversion rates | cs | 6 | 361 | 264 | True | True | True | True |
| 613 | `7f0f084cdb020856` | `p3` | Intersection-of-complements falsification design: H0 non-negative volume-conversion correlation across all partition subsets | cs | 7 | 370 | 138 | True | True | True | True |
| 614 | `7f0f084cdb020856` | `p4` | Revealed-preference regression and indifference-curve tradeoff: optimization utility priced 3.12x behavioral (optics) utility | cs | 13 | 543 | 102 | True | True | True | True |
| 615 | `7f0f084cdb020856` | `p5` | Risk geometry of the goal face: border length, ground-as-bumper, and the miss/save asymmetry between top and bottom partitions | cs | 8 | 338 | 231 | True | True | True | True |
| 616 | `8a1ae44d89418bd2` | `p1` | Perceptron Convergence Theorem (Theorem 1) | cs | 45 | 189 | 27 | True | True | True | True |
| 617 | `8a1ae44d89418bd2` | `p2` | Expected-Loss Formalization of Inductive Learning (Eq 1.1) | cs | 16 | 167 | 109 | True | True | True | True |
| 618 | `8a1ae44d89418bd2` | `p3` | Bayes Optimal Classifier (Theorem 8, Eq 7.1) | cs | 101 | 100 | 74 | True | True | True | True |
| 619 | `8a1ae44d89418bd2` | `p4` | Curse of Dimensionality: Distance Concentration and the Porcupine Sphere (Eq 2.2) | cs | 34 | 146 | 146 | True | True | True | True |
| 620 | `8a1ae44d89418bd2` | `p5` | AdaBoost Adaptive Weighting and Reweighting (Algorithm 31) | cs | 152 | 147 | 250 | True | True | True | True |
| 621 | `95719becd340bcea` | `p1` | Elo residual-update team rating (online gradient-style correction) | cs | 41 | 196 | 105 | True | True | True | True |
| 622 | `95719becd340bcea` | `p2` | Expected goals (xG) as a shot-level scoring-probability integral | cs | 29 | 194 | 196 | True | True | True | True |
| 623 | `95719becd340bcea` | `p3` | Poisson score-to-outcome probability kernel (Dixon-Coles lineage) | math | 25 | 217 | 118 | True | True | True | True |
| 624 | `95719becd340bcea` | `p4` | Generalized linear model: OLS linear predictor and logit link | math | 17 | 108 | 174 | True | True | True | True |
| 625 | `95719becd340bcea` | `p5` | F1 score as harmonic precision-recall balance for imbalanced classes | math | 49 | 257 | 154 | True | True | True | True |
| 626 | `95719becd340bcea` | `p6` | Naive Bayes factorized posterior with Gaussian likelihood | math | 19 | 102 | 163 | True | True | True | True |
| 627 | `a84d79326cdf925d` | `p1` | Temporal train/validation/test split as anti-leakage invariant | cs | 4 | 415 | 0 | False | True | True | True |
| 628 | `a84d79326cdf925d` | `p2` | Multi-scale rolling form features plus days-since-last-match fatigue proxy | football | 4 | 279 | 0 | False | True | True | True |
| 629 | `a84d79326cdf925d` | `p3` | Random Forest bagging variance reduction with probabilistic three-way output | cs | 4 | 147 | 0 | False | True | True | True |
| 630 | `a84d79326cdf925d` | `p4` | Printed evaluation metric suite: Accuracy, Precision, Recall, F1-Score (Table 1) | cs | 5 | 97 | 255 | True | True | True | True |
| 631 | `a84d79326cdf925d` | `p5` | Reported performance claims under audit: RF 87.14% / ROC-AUC 99.00%, internal ranking contradiction, leakage red flag | football | 7 | 145 | 0 | False | True | True | True |
| 632 | `cea9c306f975be55` | `p1` | Component-wise PPR fantasy-point aggregation (Eqs. 1-2) | football | 4 | 146 | 162 | True | True | True | True |
| 633 | `cea9c306f975be55` | `p2` | Coefficient of Determination R2 (Eq. 3) | math | 5 | 134 | 83 | True | True | True | True |
| 634 | `cea9c306f975be55` | `p3` | Rank-based Mean Absolute Error (Eq. 4) | math | 5 | 175 | 68 | True | True | True | True |
| 635 | `cea9c306f975be55` | `p4` | Spearman's Rank Correlation Coefficient, no-ties closed form (Eq. 5) | math | 5 | 97 | 41 | True | True | True | True |
| 636 | `cea9c306f975be55` | `p5` | Career-max ceiling feature and lag-window observational equivalence | cs | 4 | 154 | 0 | False | True | True | True |
| 637 | `cea9c306f975be55` | `p6` | Four-bias taxonomy of judgmental adjustment (Hirsimäki framework, applied) | psych | 2 | 241 | 0 | False | True | True | True |

### All `73` SFT Trajectories (`foundry/artifacts/sft/foundry_sft.jsonl`)
- `compiler_state.json`: `last_compiled_complete_count=74`, `sft_books=73`, live `COMPLETE` books without SFT row yet (`hermes-inline` newly completed after compiler run): `['1498481931694bd8', '4d07e5902607436f', '55e082c734ce5566', '5b79f17544fe148c', '5bb26b9323c43ddb', '6d101348291a5c1f']`

| Row # | Book ID | Queue Status | Title | `<think>` Balanced | `<think>` Words | >= 850 Words | Bet Hits |
|---|---|---|---|---|---|---|---|
| 1 | `8a1ae44d89418bd2` | COMPLETE | A-Course-in-Machine-Learning | False | 0 | False | 1 |
| 2 | `a84d79326cdf925d` | COMPLETE | a-machine-learning-model-for-analysis-and-prediction-of-football-match-outcomes-in-the-english-premier-league-4850 | False | 0 | False | 2 |
| 3 | `102f952911d380f9` | COMPLETE | andrew-ng-machine-learning-yearning | False | 0 | False | 1 |
| 4 | `33df04255621d53b` | COMPLETE | Aerodynamic_drag_measurement_of_American_footballs | False | 0 | False | 2 |
| 5 | `578457115b76903d` | COMPLETE | A_Genetic_Algorithm_for_Optimizing_Fantasy_Footbal | False | 0 | False | 3 |
| 6 | `cea9c306f975be55` | COMPLETE | Beyond-the-Expert_-An-Algorithmic-Approach-to-Correcting-Expert-Bias-in-Fantasy-Football-Projections_Jayanti | False | 0 | False | 2 |
| 7 | `090cfc0da55b02cd` | COMPLETE | Computational and Mathematical Methods in Medicine - 2022 - Chang - The Application of Transcranial Electrical Stimulation | False | 0 | False | 3 |
| 8 | `4e3d8fd8a23059fc` | COMPLETE | football-analytics-101-readthedocs-io-en-latest | False | 0 | False | 3 |
| 9 | `3178b5fdce0fc1a5` | COMPLETE | Football Analytics with Python and R_bibis.ir | False | 0 | False | 2 |
| 10 | `62af700cfd3180fa` | COMPLETE | InterJourMathematicaComputationalMethods | False | 0 | False | 2 |
| 11 | `28ced3431e66ee6f` | COMPLETE | learn-to-code-with-fantasy-football | False | 0 | False | 4 |
| 12 | `95719becd340bcea` | COMPLETE | Corentin-Herbinet-Using-Machine-Learning-techniques-to-predict-the-outcome-of-profressional-football-matches (1) | False | 0 | False | 4 |
| 13 | `68aeef90c5264628` | COMPLETE | nfl flag situational play book_prd | False | 0 | False | 1 |
| 14 | `5c31b5de385d42ac` | COMPLETE | NFL-Win-Probability | False | 0 | False | 10 |
| 15 | `1976064dcffc0e42` | COMPLETE | Predicting_NFL_Point_Spreads_via_Machine_Learning | False | 0 | False | 9 |
| 16 | `553c5528787d2538` | COMPLETE | Physiological_and_Biomechanical_Monitoring_in_Amer | False | 0 | False | 2 |
| 17 | `49ef6f06a351a3f7` | COMPLETE | Bach-2024-LearningTheoryFromFirstPrinciples | False | 0 | False | 5 |
| 18 | `584e09211a54b4fa` | COMPLETE | Congelio-2023-Introduction-to-NFL-Analytics-with-R | False | 0 | False | 1 |
| 19 | `2ec4f6881728fa8b` | COMPLETE | MoerlandEtAl-2023-ModelBasedReinforcementLearning-SurveyMonograph | True | 998 | True | 3 |
| 20 | `7b8723df5531a5a9` | COMPLETE | PetersenZech-2024-MathematicalTheoryOfDeepLearning | True | 1147 | True | 1 |
| 21 | `539b52ea8d0a6d37` | COMPLETE | RobertsYaida-2022-PrinciplesOfDeepLearningTheory | True | 855 | True | 2 |
| 22 | `6e380ace520cdafa` | COMPLETE | Gray-2011-EntropyAndInformationTheory2 | True | 1211 | True | 1 |
| 23 | `73c11ea388c2e5f6` | COMPLETE | James-1890-PrinciplesOfPsychology-Vol1 | True | 1250 | True | 1 |
| 24 | `345052dfaf01a062` | COMPLETE | SuttonBarto-2018-ReinforcementLearningIntroduction | True | 899 | True | 2 |
| 25 | `53d47a558cf53d1f` | COMPLETE | Kolmogorov-1933-FoundationsOfTheTheoryOfProbability | True | 1166 | True | 1 |
| 26 | `5ebcc3f3acfef4c9` | COMPLETE | ShannonWeaver-1963-MathematicalTheoryOfCommunication | True | 1128 | True | 2 |
| 27 | `192267e30813837d` | COMPLETE | MohriRostamizadehTalwalkar-2018-FoundationsOfMachineLearning2 | True | 870 | True | 2 |
| 28 | `74b7272fc5b1919d` | COMPLETE | Keynes-1921-TreatiseOnProbability | True | 1009 | True | 1 |
| 29 | `6e0d7d342ecb2ea6` | COMPLETE | VonNeumannMorgenstern-1944-TheoryOfGamesAndEconomicBehavior | True | 1424 | True | 1 |
| 30 | `7f0f084cdb020856` | COMPLETE | undated - Do Behavioral Considerations Cloud Penalty-Kick Location Optimization in Professional Soccer Game Theory and Empirical Testing using Polynom - Uribe et al | True | 978 | True | 2 |
| 31 | `537da7b7adb2e1dd` | COMPLETE | Yeung-2008-InformationTheoryAndNetworkCoding | True | 942 | True | 1 |
| 32 | `53bdc9b1b0089ddc` | COMPLETE | NFL Football - Playbook | True | 906 | True | 1 |
| 33 | `366ba522490b1573` | COMPLETE | How-to-Lie-with-Statistics | True | 1020 | True | 1 |
| 34 | `25294936f511d828` | COMPLETE | Playfair-Data-NFL-Visual-Analytics-Consulting-Case-Study | True | 1023 | True | 3 |
| 35 | `5e3d2c14003c9e74` | COMPLETE | 2025-NFL-Record-and-Fact-Book | True | 880 | True | 1 |
| 36 | `0c444afcd300d1c3` | COMPLETE | Special_Issue_Traumatic_Brain_InjuryChronic_Trauma | True | 951 | True | 1 |
| 37 | `13afe72d1ef6bdbd` | COMPLETE | WHITEPAPER_DITO_Quantum_computing_guide_navigating_future_2024 | True | 1131 | True | 1 |
| 38 | `21544db09ed29308` | COMPLETE | Drafting strategies in fantasy football A study of competitive sequential human decision making | True | 878 | True | 2 |
| 39 | `4d067ce7fd44a2d1` | COMPLETE | machine-learning-projects-python | True | 1063 | True | 1 |
| 40 | `5e3094b6f359a758` | COMPLETE | Machinelearningningforsportresultsprediction_systematicreview | True | 1001 | True | 4 |
| 41 | `6c532aecbad020e8` | COMPLETE | PVAMU_MSU_FOOTBALL_GAMENOTES_2024 | True | 956 | True | 1 |
| 42 | `719c464f186464cd` | COMPLETE | The_NFL_Coaching_Network_Analysis_of_the_Social_Ne (1) | True | 1035 | True | 2 |
| 43 | `77d4ee5161695968` | COMPLETE | The Quantitative Analysis and Visualization of NFL Passing Routes | True | 940 | True | 4 |
| 44 | `6cf36a29e51c0a02` | COMPLETE | _OceanofPDF.com_The_Hidden_Game_of_Football_-_Bob_Carroll | True | 921 | True | 1 |
| 45 | `65c65dec7ddaacd5` | COMPLETE | 2002.04682_Combinatorial_Optimization_and_Submodular_Maximization_for_Team_Selection | True | 947 | True | 1 |
| 46 | `3c1295822da31ba0` | COMPLETE | 2409.18934_LLM_and_ML_for_Fantasy_Football_and_Sports_Prediction | True | 1003 | True | 2 |
| 47 | `409f5dad119c06ed` | COMPLETE | Institutional Integration of 10Hz NFL Spatial Tracking | True | 954 | True | 3 |
| 48 | `2626db0663ce780e` | COMPLETE | 05-x-strategy | True | 886 | True | 3 |
| 49 | `47da7cd12f78ad9c` | COMPLETE | NICE-2025-RehabilitationChronicNeurologicalDisorders-AcquiredBrainInjury-NG252 | True | 908 | True | 2 |
| 50 | `1a04a74c1cd2528c` | COMPLETE | MavroudisCiobica-2025-TraumaticBrainInjury-RecentAdvancesAndChallenges | True | 945 | True | 1 |
| 51 | `2435ddad2e0ddd16` | COMPLETE | ZhouEd-2019-TBI-NeurobiologyDiagnosisAndTreatment | True | 912 | True | 1 |
| 52 | `385d408a043b611b` | COMPLETE | LinKrishnamurthyEds-2026-NeurologicalNeuropsychiatricDisordersMilitaryVolII-Frontiers | True | 922 | True | 2 |
| 53 | `4f974188ca231968` | COMPLETE | SIGN-2013-BrainInjuryRehabilitationInAdults-SIGN130 | True | 948 | True | 1 |
| 54 | `7e3a32c1d8621611` | COMPLETE | SuLvEds-2022-FrontiersInTraumaticBrainInjury | True | 855 | True | 1 |
| 55 | `5fee5df924431396` | COMPLETE | Berry-1921-The-Forward-Pass-in-Football | True | 1786 | True | 7 |
| 56 | `1cfd792f9b7396d1` | COMPLETE | VaibhavAhluwaliaGaurEds-2023-BrainInjuryNeurodegeneration-MolecularFunctionalTranslational-MDPI | True | 1665 | True | 1 |
| 57 | `29a9a56fe196f2f2` | COMPLETE | Camp-1894-Football-Facts-and-Figures | True | 948 | True | 1 |
| 58 | `6aeb75fe28eb9cd8` | COMPLETE | Cavanaugh-1919-Inside-Football | True | 1340 | True | 1 |
| 59 | `3fa96d690212683b` | COMPLETE | Edwards-1916-Football-Days | True | 1037 | True | 1 |
| 60 | `6bc7d84da4bde923` | COMPLETE | Lewis-1896-A-Primer-of-College-Football | True | 953 | True | 2 |
| 61 | `39871d5617848573` | COMPLETE | AgrawalEd-2012-BrainInjury-PathogenesisMonitoringRecoveryManagement | True | 1296 | True | 1 |
| 62 | `55d0f88972ad63be` | COMPLETE | Davis-1911-Football-The-American-Intercollegiate-Game | True | 925 | True | 3 |
| 63 | `2d97f3a1f7fad21e` | COMPLETE | NCAA-1922-Official-Football-Guide-Rules-and-Record-Book | True | 1213 | True | 1 |
| 64 | `07089dec6f73619e` | COMPLETE | Wilce-1923-Football-How-to-Play-It-and-How-to-Understand-It | True | 1267 | True | 1 |
| 65 | `10c8c515e69e40f4` | COMPLETE | Zuppke-1922-Football-Technique-and-Tactics | True | 1370 | True | 1 |
| 66 | `52b5d36325e11cd7` | COMPLETE | Reed-1913-Football-for-Public-and-Player | True | 1056 | True | 1 |
| 67 | `64a4e0d61f21a823` | COMPLETE | Hamilton-2020-GraphRepresentationLearning | True | 1152 | True | 1 |
| 68 | `32d8b2d0d4f7f22f` | COMPLETE | Rockne-1925-Coaching-The-Way-of-the-Winner | True | 983 | True | 0 |
| 69 | `53ff4fe1320a9a44` | COMPLETE | DengYu-2014-DeepLearningMethodsAndApplications | True | 909 | True | 0 |
| 70 | `7ec06be65ab3f269` | COMPLETE | Kochenderfer-Wheeler-Wray-2022-AlgorithmsForDecisionMaking | True | 902 | True | 0 |
| 71 | `4c25fa54afee431d` | COMPLETE | Garnett-2023-BayesianOptimization | True | 983 | True | 0 |
| 72 | `3da8c2a20553953a` | COMPLETE | Nielsen-2015-NeuralNetworksAndDeepLearning | True | 933 | True | 0 |
| 73 | `678271d94588b50d` | COMPLETE | Prince-2023-UnderstandingDeepLearning | True | 954 | True | 0 |

### All `18` Executable RLVR Counterfactual Vetoes (`foundry/artifacts/rlvr_vetoes/*.jsonl`, `all_passed=True`)
| # | Batch File | Scenario Name | Scenario ID | Milestone | Correct=True | Wrong=False | JSON-Str=True | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | `batch-001.jsonl` | Crosswind Cliff at 1:58 | `batch-001_1` | batch=batch-001.jsonl | True | True (ret=False) | True | PASS |
| 2 | `batch-001.jsonl` | Leaky Oracle on the Opening OT Drive | `batch-001_2` | batch=batch-001.jsonl | True | True (ret=False) | True | PASS |
| 3 | `batch-001.jsonl` | The 158.3 Mirage on a Short Week | `batch-001_3` | batch=batch-001.jsonl | True | True (ret=False) | True | PASS |
| 4 | `batch-002.jsonl` | Conservation Mirage | `batch-002_1` | batch=batch-002.jsonl | True | True (ret=False) | True | PASS |
| 5 | `batch-002.jsonl` | Reversed Cadence | `batch-002_2` | batch=batch-002.jsonl | True | True (ret=False) | True | PASS |
| 6 | `batch-002.jsonl` | Matched-Seed Mirage | `batch-002_3` | batch=batch-002.jsonl | True | True (ret=False) | True | PASS |
| 7 | `rlvr_batch-003.jsonl` | The Hundred-Snap Rollout | `rlvr_batch-003_1` | batch=rlvr_batch-003.jsonl | True | True (ret=False) | True | PASS |
| 8 | `rlvr_batch-003.jsonl` | The No-Huddle Firehose | `rlvr_batch-003_2` | batch=rlvr_batch-003.jsonl | True | True (ret=False) | True | PASS |
| 9 | `rlvr_batch-003.jsonl` | The Two-Witness Gamble | `rlvr_batch-003_3` | batch=rlvr_batch-003.jsonl | True | True (ret=False) | True | PASS |
| 10 | `rlvr_batch-004.jsonl` | The Clamped Corridor on the Rookie Prop | `rlvr_batch-004_1` | batch=rlvr_batch-004.jsonl | True | True (ret=False) | True | PASS |
| 11 | `rlvr_batch-004.jsonl` | The Mean-Field Dynasty | `rlvr_batch-004_2` | batch=rlvr_batch-004.jsonl | True | True (ret=False) | True | PASS |
| 12 | `rlvr_batch-004.jsonl` | The Witness Ledger at the Goal Line | `rlvr_batch-004_3` | batch=rlvr_batch-004.jsonl | True | True (ret=False) | True | PASS |
| 13 | `rlvr_batch-005.jsonl` | The Interior Eight Yards | `rlvr_batch-005_1` | batch=rlvr_batch-005.jsonl | True | True (ret=False) | True | PASS |
| 14 | `rlvr_batch-005.jsonl` | The Observable Act | `rlvr_batch-005_2` | batch=rlvr_batch-005.jsonl | True | True (ret=False) | True | PASS |
| 15 | `rlvr_batch-005.jsonl` | The Contagion Chain | `rlvr_batch-005_3` | batch=rlvr_batch-005.jsonl | True | True (ret=False) | True | PASS |
| 16 | `rlvr_batch-006.jsonl` | The Saturated Confidence | `rlvr_batch-006_1` | batch=rlvr_batch-006.jsonl | True | True (ret=False) | True | PASS |
| 17 | `rlvr_batch-006.jsonl` | The Overfit Elephant | `rlvr_batch-006_2` | batch=rlvr_batch-006.jsonl | True | True (ret=False) | True | PASS |
| 18 | `rlvr_batch-006.jsonl` | The Vanishing Credit | `rlvr_batch-006_3` | batch=rlvr_batch-006.jsonl | True | True (ret=False) | True | PASS |

## Stage 1C — Live 4-VM GCP Foundry, Cost Breakdown, Masked 6-Provider Readiness & All Unpacked `.md` Dossiers
| VM | Zone | Machine Type | IP | Disk (GB/Type) | Service | Root Usage | Created (UTC) | Elapsed (hr) | $/hr | Elapsed USD | Manifest `COMPLETE` |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `gse-foundry-gcp-01` | `us-central1-a` | `e2-standard-8` | `34.66.12.72` | 200 GB pd-standard | `active` | `/dev/root       193G  7.2G  186G   4% /` | `2026-11-13T17:52:22.913000+00:00` | 7.12 | $0.2790 | $1.98 | 798 |
| `gse-foundry-gcp-02` | `us-central1-a` | `e2-standard-8` | `34.170.207.245` | 60 GB pd-standard | `active` | `/dev/root        58G  4.0G   54G   7% /` | `2026-11-13T19:23:55.213000+00:00` | 5.59 | $0.2713 | $1.52 | 725 |
| `gse-foundry-gcp-03` | `us-east1-b` | `e2-standard-8` | `34.75.120.29` | 60 GB pd-standard | `active` | `/dev/root        58G  4.0G   54G   8% /` | `2026-11-13T21:23:22.661000+00:00` | 3.6 | $0.2713 | $0.98 | 826 |
| `gse-foundry-gcp-04` | `us-west1-b` | `e2-standard-8` | `35.199.163.8` | 60 GB pd-standard | `active` | `/dev/root        58G  4.0G   54G   8% /` | `2026-11-13T21:23:38.813000+00:00` | 3.59 | $0.2713 | $0.98 | 717 |

- **Live Cost Summary:** Total compute+disk burn rate = `$1.0928/hr` (`$26.23/day` actual `380 GB` PD; `$26.78/day` at 4x200GB baseline); elapsed GCE+disk since launch = `$5.45`; Compute+disk $5.45 elapsed so far at execution; 24h full run = $26.23 actual disk ($26.78 if 4x200GB) + ~$5-$10 OpenRouter/egress = ~$31-$37 24h ceiling.

### Masked 6-Provider API Readiness Matrix (Zero Raw Keys)
| Provider | Masked Key | Status | Models / Endpoints | Operational Role |
|---|---|---|---|---|
| OpenRouter | `sk-or-...configured_env_and_gcp` | `ACTIVE_PRIMARY_CLOUD` | deepseek/deepseek-v4.1-flash-1017, free :free coding pool | Primary 24-thread GCP extraction + repo coding triage |
| NVIDIA NIM | `nvapi-...WcV8Y` | `ACTIVE_GCP_FALLBACK_AND_LOCAL_READY` | deepseek-ai/deepseek-v4.1-flash, nvidia/nemotron-3.5-super-vl-120b-a12b, stepfun-ai/step-5-preview, minimaxai/minimax-m3.1-flash | Verified in GCP MODELS[] fallback chain & nim/nvapi inference |
| DeepInfra | `sk-di-...YhR6` | `SUPPLIED_READY_OPENAI_COMPAT` | deepseek-ai/DeepSeek-V3 / R1 OpenAI-compat endpoint | Zero-leakage overflow reasoning endpoint (base: https://api.deepinfra.com/v1/openai) |
| APIMart | `sk-uu8...vMVT` | `SUPPLIED_READY_OVERFLOW` | DeepSeek / Qwen / GPT-compatible relay | Secondary burst relay for Foundry extraction when OpenRouter 429s |
| ModelScope | `ms-3c28...25e83e` | `SUPPLIED_READY_QWEN_DEEPSEEK` | Qwen2.5/3 + DeepSeek open weights API-Inference (https://api-inference.modelscope.cn/v1) | Open-weight Asian-mirror inference fallback |
| Parallel AI ($20 Governed) | `AmdJ...RIsY` | `VERIFIED_CLIENT_AND_GOVERNED_20USD` | POST /v1beta/search, /v1beta/extract, /chat/completions (speed-lite/base) via intelligence/providers/parallel_ai_client.py | Grounded web search, injury/inactive corroboration, Six-Tier bitemporal verification ($2/day, $0.50/run, $20 hard cap) |

### Week 10 GCP & Local Crucibles Audit (`week10_crucible` + `gcp_sync`)
- Unpacked `week10_*.md` files: `14` | `AUDITOR2_HANDOFF.md` present: `True` | `ne_at_det_crucible_override_required=False` | `kc_at_atl_crucible_override_required=False`
| Crucible File | Source | Bytes | Mentions Munich/Allianz | Mentions Closed Roof |
|---|---|---|---|---|
| `week10_BUF_at_NYJ.md` | `gcp_sync` | 37068 | False | False |
| `week10_CAR_at_NO.md` | `gcp_sync` | 38993 | False | False |
| `week10_HOU_at_CLE.md` | `gcp_sync` | 38255 | False | False |
| `week10_JAX_at_TEN.md` | `gcp_sync` | 42974 | False | False |
| `week10_KC_at_ATL.md` | `gcp_sync` | 37156 | False | False |
| `week10_LAC_at_BAL.md` | `gcp_sync` | 27987 | False | False |
| `week10_LAR_at_ARI.md` | `gcp_sync` | 37581 | False | False |
| `week10_MIA_at_IND.md` | `gcp_sync` | 44362 | False | False |
| `week10_MIN_at_GB.md` | `gcp_sync` | 54373 | False | False |
| `week10_NE_at_DET.md` | `gcp_sync` | 41291 | True | False |
| `week10_PIT_at_CIN.md` | `gcp_sync` | 34288 | False | False |
| `week10_SEA_at_LV.md` | `gcp_sync` | 38218 | False | False |
| `week10_SF_at_DAL.md` | `gcp_sync` | 34510 | False | True |
| `week10_w1_LAC_at_BAL_MNF.md` | `gcp_sync` | 48217 | False | False |
| `AUDITOR2_HANDOFF.md` | `local week10_crucible` | 10060 | (see handoff/dossier) | (see handoff/dossier) |
| `HOU_CLE.md` | `local week10_crucible` | 33679 | (see handoff/dossier) | (see handoff/dossier) |
| `SF_DAL.md` | `local week10_crucible` | 34195 | (see handoff/dossier) | (see handoff/dossier) |

### All `2215` Unpacked Cloud Artifacts Across `by_node/node1..4`
| # | Node | Relative Path | Bytes | Words | XML Tags | All 5 Tags | SHA-256[:16] |
|---|---|---|---|---|---|---|---|
| 1 | node1 | `gcp_foundry/arxiv_foundry_w1_NAVIER_STOKES_SINGULARITY_1012_5143v1.md` | 47001 | 6777 | 4/5 | False | `2c4567de77a5c794` |
| 2 | node1 | `gcp_foundry/arxiv_foundry_w1_NAVIER_STOKES_SINGULARITY_1307_3600v1.md` | 51744 | 7945 | 4/5 | False | `04ad1846825ff460` |
| 3 | node1 | `gcp_foundry/arxiv_foundry_w1_NAVIER_STOKES_SINGULARITY_1907_08748v1.md` | 44098 | 6374 | 4/5 | False | `79fd8ee1ddf12cb4` |
| 4 | node1 | `gcp_foundry/arxiv_foundry_w1_NAVIER_STOKES_SINGULARITY_2109_15289v1.md` | 41768 | 5766 | 4/5 | False | `44059a02bd76a3b7` |
| 5 | node1 | `gcp_foundry/arxiv_foundry_w1_NAVIER_STOKES_SINGULARITY_2304_04045v1.md` | 41357 | 5441 | 4/5 | False | `be1f334c4ae5b6a6` |
| 6 | node1 | `gcp_foundry/arxiv_foundry_w1_NAVIER_STOKES_SINGULARITY_2306_04146v2.md` | 56472 | 7757 | 4/5 | False | `9917c371a597cc4f` |
| 7 | node1 | `gcp_foundry/arxiv_foundry_w1_NAVIER_STOKES_SINGULARITY_2606_29468v1.md` | 51389 | 7339 | 4/5 | False | `121e80d30c117609` |
| 8 | node1 | `gcp_foundry/arxiv_foundry_w1_STOCHASTIC_DIFF_GAMES_1706_08880v1.md` | 61748 | 9336 | 4/5 | False | `b126fc4ebfbcea1b` |
| 9 | node1 | `gcp_foundry/arxiv_foundry_w1_STOCHASTIC_DIFF_GAMES_1904_08115v1.md` | 35844 | 4932 | 4/5 | False | `88854cf16543f7ec` |
| 10 | node1 | `gcp_foundry/arxiv_foundry_w1_STOCHASTIC_DIFF_GAMES_2109_14893v2.md` | 56109 | 7808 | 4/5 | False | `3d10b4c84d6f4e63` |
| 11 | node1 | `gcp_foundry/arxiv_foundry_w2_NAVIER_STOKES_SINGULARITY_1001_0380v3.md` | 47568 | 6860 | 4/5 | False | `e409bbee26a34835` |
| 12 | node1 | `gcp_foundry/arxiv_foundry_w2_NAVIER_STOKES_SINGULARITY_1012_2033v1.md` | 50410 | 7329 | 4/5 | False | `6db9876395e299e9` |
| 13 | node1 | `gcp_foundry/arxiv_foundry_w2_NAVIER_STOKES_SINGULARITY_1510_05095v1.md` | 48168 | 6299 | 4/5 | False | `bf34b47ab975992c` |
| 14 | node1 | `gcp_foundry/arxiv_foundry_w2_NAVIER_STOKES_SINGULARITY_2307_03434v5.md` | 49244 | 6255 | 4/5 | False | `8f9a778d6099fef1` |
| 15 | node1 | `gcp_foundry/arxiv_foundry_w2_NAVIER_STOKES_SINGULARITY_math_0604234v8.md` | 31731 | 4018 | 4/5 | False | `a2b9849e30484991` |
| 16 | node1 | `gcp_foundry/arxiv_foundry_w3_NAVIER_STOKES_SINGULARITY_1012_5364v2.md` | 45181 | 6491 | 4/5 | False | `f31297301e610139` |
| 17 | node1 | `gcp_foundry/arxiv_foundry_w3_NAVIER_STOKES_SINGULARITY_1310_5642v1.md` | 44652 | 6097 | 4/5 | False | `0499e7a3fd7b37b9` |
| 18 | node1 | `gcp_foundry/arxiv_foundry_w3_NAVIER_STOKES_SINGULARITY_1503_03063v2.md` | 57940 | 7731 | 4/5 | False | `5fab3cfd998e60b4` |
| 19 | node1 | `gcp_foundry/arxiv_foundry_w3_NAVIER_STOKES_SINGULARITY_1509_01543v1.md` | 47894 | 6726 | 4/5 | False | `46fd73a9b3f25d9a` |
| 20 | node1 | `gcp_foundry/arxiv_foundry_w3_NAVIER_STOKES_SINGULARITY_1910_00173v4.md` | 54529 | 7289 | 4/5 | False | `c19cd036960d0c8b` |
| 21 | node1 | `gcp_foundry/arxiv_foundry_w3_NAVIER_STOKES_SINGULARITY_2402_13229v3.md` | 52187 | 6938 | 4/5 | False | `a310a1a46d8e4131` |
| 22 | node1 | `gcp_foundry/arxiv_foundry_w3_NAVIER_STOKES_SINGULARITY_2405_10916v3.md` | 56188 | 7908 | 4/5 | False | `d6ccb7e9e9702edb` |
| 23 | node1 | `gcp_foundry/arxiv_foundry_w3_STOCHASTIC_DIFF_GAMES_2502_07390v2.md` | 20417 | 2520 | 4/5 | False | `50e7844b1c8cf1ce` |
| 24 | node1 | `gcp_foundry/foundry_w1_SHALIZI_CAUSAL_LEARNING.md` | 37591 | 5629 | 4/5 | False | `634f3be79adfdac5` |
| 25 | node1 | `gcp_foundry/foundry_w1_THOOFT_CA_QM.md` | 48422 | 6785 | 4/5 | False | `6670f87d0e8d7d59` |
| 26 | node1 | `gcp_foundry/foundry_w2_CHEN_HOU_NAVIER_STOKES.md` | 51470 | 6751 | 4/5 | False | `377e7d614e313ab6` |
| 27 | node1 | `gcp_foundry/foundry_w2_THUEREY_PHYSICS_DL.md` | 64206 | 8725 | 4/5 | False | `5928b9bca83f65d3` |
| 28 | node1 | `gcp_foundry/foundry_w3_FUJII_SPORTS_ML.md` | 25563 | 3517 | 4/5 | False | `337c4735b330aba7` |
| 29 | node1 | `gcp_foundry/foundry_w3_PROSPECT_THREAT_COGNITION.md` | 58463 | 8537 | 4/5 | False | `c91dd09d2f7af61f` |
| 30 | node1 | `gcp_foundry/week10_BUF_at_NYJ.md` | 37068 | 5116 | 5/5 | True | `be42633e53669aa8` |
| 31 | node1 | `gcp_foundry/week10_CAR_at_NO.md` | 38993 | 5292 | 5/5 | True | `112c45e27f9feb43` |
| 32 | node1 | `gcp_foundry/week10_HOU_at_CLE.md` | 38255 | 5447 | 5/5 | True | `aa0aa117f392a755` |
| 33 | node1 | `gcp_foundry/week10_JAX_at_TEN.md` | 42974 | 5808 | 5/5 | True | `3fa652e84b87b186` |
| 34 | node1 | `gcp_foundry/week10_KC_at_ATL.md` | 37156 | 4739 | 5/5 | True | `afcbb7ece0237c27` |
| 35 | node1 | `gcp_foundry/week10_LAC_at_BAL.md` | 27987 | 3930 | 5/5 | True | `c95724bf8f16d101` |
| 36 | node1 | `gcp_foundry/week10_LAR_at_ARI.md` | 37581 | 5414 | 5/5 | True | `8914630775953950` |
| 37 | node1 | `gcp_foundry/week10_MIA_at_IND.md` | 44362 | 6172 | 5/5 | True | `29a8ba707d3650c2` |
| 38 | node1 | `gcp_foundry/week10_MIN_at_GB.md` | 54373 | 7705 | 5/5 | True | `d439448d63ed995e` |
| 39 | node1 | `gcp_foundry/week10_NE_at_DET.md` | 41291 | 5585 | 5/5 | True | `6e936253d327fd6d` |
| 40 | node1 | `gcp_foundry/week10_PIT_at_CIN.md` | 34288 | 4608 | 5/5 | True | `bed3826b9bae66b8` |
| 41 | node1 | `gcp_foundry/week10_SEA_at_LV.md` | 38218 | 5280 | 5/5 | True | `1b733a3ee1f3b20f` |
| 42 | node1 | `gcp_foundry/week10_SF_at_DAL.md` | 34510 | 4810 | 5/5 | True | `4878ca4f70fad45f` |
| 43 | node1 | `gcp_foundry/week10_w1_LAC_at_BAL_MNF.md` | 48217 | 7389 | 4/5 | False | `7230631112dff867` |
| 44 | node1 | `gdrive_corpus_extractions/000ebb065c_1505.01462v1.pdf.md` | 27494 | 3716 | 5/5 | True | `99715a540c3c3210` |
| 45 | node1 | `gdrive_corpus_extractions/007ebaf11b_AgrawalEd-2012-BrainInjury-PathogenesisMonitoringRecoveryManagement.pdf.md` | 61974 | 9086 | 5/5 | True | `37b572ebb5246086` |
| 46 | node1 | `gdrive_corpus_extractions/00cc7a326f_Playfair-Data-NFL-Visual-Analytics-Consulting-Case-Study.pdf.md` | 41033 | 5792 | 5/5 | True | `ef386f1f0fbc8d19` |
| 47 | node1 | `gdrive_corpus_extractions/00f269c8ed_openalex_W4409087059.pdf.md` | 33845 | 4858 | 5/5 | True | `a3d68cd8d561fdee` |
| 48 | node1 | `gdrive_corpus_extractions/0126f44820_master_thesis_julien_delavande_supaero.pdf.md` | 63475 | 8919 | 5/5 | True | `3851e0f36af081d7` |
| 49 | node1 | `gdrive_corpus_extractions/012c8556b0_openalex_W2257765035.pdf.md` | 61005 | 9032 | 5/5 | True | `36cf633c1fd1ccc4` |
| 50 | node1 | `gdrive_corpus_extractions/01509c4a9f_1906.04066v1.pdf.md` | 49150 | 7267 | 5/5 | True | `25006bfe0a35696c` |
| 51 | node1 | `gdrive_corpus_extractions/01539fb1b5_arxiv_2610.32727v1.pdf.md` | 34358 | 4829 | 5/5 | True | `6828a1e9352e3c7c` |
| 52 | node1 | `gdrive_corpus_extractions/0200840ad9_openalex_W7215095993.pdf.md` | 53803 | 7500 | 5/5 | True | `961396ca7510357f` |
| 53 | node1 | `gdrive_corpus_extractions/02453fa66d_2026_-_Beyond_the_Federer_paradox_in_tennis_-_Mart_n_et_al.pdf.md` | 58346 | 8423 | 5/5 | True | `07b976bf1ac6e837` |
| 54 | node1 | `gdrive_corpus_extractions/024bacdbb4_openalex_W4415004602.pdf.md` | 65200 | 9243 | 5/5 | True | `a4a5e854de3a90ce` |
| 55 | node1 | `gdrive_corpus_extractions/024f5a5d3a_arxiv_2311.11471v1.pdf.md` | 63485 | 9329 | 5/5 | True | `7a488fefc3a95b23` |
| 56 | node1 | `gdrive_corpus_extractions/02ab2ec0ca_openalex_W2528125845.pdf.md` | 47997 | 6588 | 5/5 | True | `7089c3534cb98319` |
| 57 | node1 | `gdrive_corpus_extractions/02c447a174_Basketball_Teams_as_Strategic_Networks.pdf.md` | 60369 | 8840 | 5/5 | True | `fd03436c39302166` |
| 58 | node1 | `gdrive_corpus_extractions/02dbc08982_openalex_W2810333422.pdf.md` | 48699 | 6578 | 5/5 | True | `479d0a40be57794c` |
| 59 | node1 | `gdrive_corpus_extractions/030ba17cf3_Maths_Project.pdf.md` | 48813 | 7213 | 5/5 | True | `6a9a6f71189d8dad` |
| 60 | node1 | `gdrive_corpus_extractions/031a0b1c0a_arxiv_2204.04143v1.pdf.md` | 55414 | 7831 | 5/5 | True | `7c1b4ccaec14a166` |
| 61 | node1 | `gdrive_corpus_extractions/032946c560_2026_-_Contact_Power_and_Balls_in_Play_A_Three-Rate_Decomposition_of_Batting_Ave.md` | 49409 | 7135 | 5/5 | True | `714812510746b74f` |
| 62 | node1 | `gdrive_corpus_extractions/0341970b16_undated_-_HoopEval_Individual_Player_Action_Evaluation_via_Deep_Reinforcement_Le.md` | 65311 | 9478 | 5/5 | True | `22306e54118b06c5` |
| 63 | node1 | `gdrive_corpus_extractions/0371902cff_arxiv_2609.33450v1.pdf.md` | 55867 | 7876 | 5/5 | True | `922bb3f80684b915` |
| 64 | node1 | `gdrive_corpus_extractions/03978ab62a_arxiv_2506.23843v1.pdf.md` | 34784 | 4962 | 5/5 | True | `976c57f363e2ec66` |
| 65 | node1 | `gdrive_corpus_extractions/03afd5c1c5_2210.00507v1.pdf.md` | 29592 | 4324 | 5/5 | True | `6ec30247c7b204fd` |
| 66 | node1 | `gdrive_corpus_extractions/0410e5f291_openalex_W7160490289.pdf.md` | 39796 | 5797 | 5/5 | True | `8a13175d72ba5ebc` |
| 67 | node1 | `gdrive_corpus_extractions/04294fbc4d_openalex_W4392385272.pdf.md` | 56295 | 7927 | 5/5 | True | `ef9da6f8722ca1f7` |
| 68 | node1 | `gdrive_corpus_extractions/04e3eed373__OceanofPDF.com_Introduction_to_NFL_Analytics_with_R_-_Bradley_J_Congelio.pdf.md` | 52989 | 7591 | 5/5 | True | `64a100911fc3267b` |
| 69 | node1 | `gdrive_corpus_extractions/0541efad5a_2019_-_Estimating_four_Factor_Values_inthe_NBA_A_Seemingly_Unrelated_Regression_.md` | 65851 | 9326 | 5/5 | True | `6be8851256a145ed` |
| 70 | node1 | `gdrive_corpus_extractions/05a6157fc2_KochenderferWheeler-2026-AlgorithmsForOptimization2.pdf.md` | 63039 | 8973 | 5/5 | True | `e402720648d6a15d` |
| 71 | node1 | `gdrive_corpus_extractions/05d26954f6_arxiv_2609.23450v1.pdf.md` | 63539 | 9228 | 5/5 | True | `6063ae0a9f77cd58` |
| 72 | node1 | `gdrive_corpus_extractions/05df22d10f_openalex_W7168251394.pdf.md` | 51167 | 7906 | 5/5 | True | `8933069fbb5149a5` |
| 73 | node1 | `gdrive_corpus_extractions/061d6a6cfc_2026_-_Multimodal_Injury_Risk_Prediction_in_Tennis_-_Alvarez_et_al.pdf.md` | 58226 | 8552 | 5/5 | True | `df293d2588ea043b` |
| 74 | node1 | `gdrive_corpus_extractions/063a079c92_openalex_W7220632668.pdf.md` | 57822 | 9038 | 5/5 | True | `daf54959f13fc213` |
| 75 | node1 | `gdrive_corpus_extractions/066dcc77eb_James-1890-PrinciplesOfPsychology-Vol1.pdf.md` | 53641 | 7653 | 5/5 | True | `6a22a2dc573b0209` |
| 76 | node1 | `gdrive_corpus_extractions/067bc0d98d_2605.10796.pdf.md` | 60628 | 8433 | 5/5 | True | `07bece00d5bae194` |
| 77 | node1 | `gdrive_corpus_extractions/069f3f9697_openalex_W4404601849.pdf.md` | 59166 | 9192 | 5/5 | True | `a02e98489b364f7a` |
| 78 | node1 | `gdrive_corpus_extractions/0759ad5812_openalex_W4413291636.pdf.md` | 34127 | 4873 | 5/5 | True | `381149aae410a81c` |
| 79 | node1 | `gdrive_corpus_extractions/0771b552dd_Prediction_of_athletes_performance_using.pdf.md` | 40415 | 5758 | 5/5 | True | `bbf277138d73263f` |
| 80 | node1 | `gdrive_corpus_extractions/07c2bf4f79_arxiv_2209.09987v1.pdf.md` | 61326 | 9545 | 5/5 | True | `14a2558f357aa8dd` |
| 81 | node1 | `gdrive_corpus_extractions/07df6c85b4_2026_-_Comparative_Effects_of_Sand-_and_Grass-Based_Repeated-Sprint_Training_on_.md` | 62450 | 8904 | 5/5 | True | `c1b204482914740f` |
| 82 | node1 | `gdrive_corpus_extractions/07fc94d65a_openalex_W2174287636.pdf.md` | 51559 | 7675 | 5/5 | True | `42624a739dc67be6` |
| 83 | node1 | `gdrive_corpus_extractions/081cb559c2_Extending_Power_BI_with_Python_and_R_bibis.ir.pdf.md` | 54777 | 7968 | 5/5 | True | `a0724c3e4aa14baf` |
| 84 | node1 | `gdrive_corpus_extractions/08788e3b15_Grimmett-2018-ProbabilityOnGraphs2.pdf.md` | 50070 | 7282 | 5/5 | True | `227acf59910b025c` |
| 85 | node1 | `gdrive_corpus_extractions/08819590f5_2511.12908v2.pdf.md` | 34631 | 5059 | 5/5 | True | `9fcdbe510fbf0e15` |
| 86 | node1 | `gdrive_corpus_extractions/08afe84212_openalex_W3189670121.pdf.md` | 42187 | 5911 | 5/5 | True | `ee7b3f1c9635ff68` |
| 87 | node1 | `gdrive_corpus_extractions/08d7071822_2020_-_Profiting_from_overreaction_in_soccer_betting_odds_-_Wheatcroft.pdf.md` | 48040 | 6955 | 5/5 | True | `284f4e47d9b11594` |
| 88 | node1 | `gdrive_corpus_extractions/08dddf4bd4_openalex_W2903294873.pdf.md` | 43237 | 5113 | 5/5 | True | `0a3788663906311d` |
| 89 | node1 | `gdrive_corpus_extractions/08e43ac12d_2017_Possession_Sketches_Mapping_NBA_Strategies.pdf.md` | 45846 | 6779 | 5/5 | True | `e30e9bbeecf88031` |
| 90 | node1 | `gdrive_corpus_extractions/0915b26d6a_PetersenZech-2024-MathematicalTheoryOfDeepLearning.pdf.md` | 39988 | 5544 | 5/5 | True | `d3e3d5e95d71afde` |
| 91 | node1 | `gdrive_corpus_extractions/091bd94eab_2506.22119.pdf.md` | 56431 | 7974 | 5/5 | True | `3d5b1ac48d585404` |
| 92 | node1 | `gdrive_corpus_extractions/095d4b994d_arxiv_2504.06357v1.pdf.md` | 72892 | 10310 | 5/5 | True | `ce3616f402f5ccb4` |
| 93 | node1 | `gdrive_corpus_extractions/0a0e75b3cc_arxiv_2207.11709v2.pdf.md` | 59463 | 8573 | 5/5 | True | `2000577c9cd42573` |
| 94 | node1 | `gdrive_corpus_extractions/0a2ecfcd0e_2023_-_StratAlign_Uncovering_Tactical_Patterns_through_Large-Scale_Event_Sequenc.md` | 70783 | 10299 | 5/5 | True | `182f16694220f616` |
| 95 | node1 | `gdrive_corpus_extractions/0abe1378e0_openalex_W7167218103.pdf.md` | 38451 | 5399 | 5/5 | True | `ff90bf8bf205a30c` |
| 96 | node1 | `gdrive_corpus_extractions/0b17af935b_arxiv_2110.07365v2.pdf.md` | 58404 | 8446 | 5/5 | True | `b0b17857089c1ac3` |
| 97 | node1 | `gdrive_corpus_extractions/0b320e8ca5_preview-9781040436820_A63387833.pdf.md` | 51287 | 7082 | 5/5 | True | `97bdd4d918c36d08` |
| 98 | node1 | `gdrive_corpus_extractions/0b37c27108_2025_-_Quantifying_Off_Ball_Defensive_Impact_through_Cover_Shadows_Lorenzo_Casci.md` | 66007 | 9536 | 5/5 | True | `47ef7bcf2867f022` |
| 99 | node1 | `gdrive_corpus_extractions/0c6b3ae0eb_openalex_W4389139008.pdf.md` | 25207 | 3268 | 5/5 | True | `31fac9c5024bbb8d` |
| 100 | node1 | `gdrive_corpus_extractions/0cd756909e_10.1201_9781003364320_previewpdf.pdf.md` | 36378 | 5431 | 5/5 | True | `cba432d0e7ad5601` |
| 101 | node1 | `gdrive_corpus_extractions/0d17d8060e_2106.10165v2.pdf.md` | 43632 | 5724 | 5/5 | True | `e4ab0b7f4c5b7e23` |
| 102 | node1 | `gdrive_corpus_extractions/0d963f7c77_Daly-1921-American-Football.pdf.md` | 40459 | 5907 | 5/5 | True | `c239c829c9b71479` |
| 103 | node1 | `gdrive_corpus_extractions/0df7056308_ShannonWeaver-1963-MathematicalTheoryOfCommunication.pdf.md` | 56351 | 8550 | 5/5 | True | `340da0b16c51fd30` |
| 104 | node1 | `gdrive_corpus_extractions/0e69b6864f_2605.24445v1.pdf.md` | 36107 | 5497 | 5/5 | True | `28c5f505797160f2` |
| 105 | node1 | `gdrive_corpus_extractions/0e848e5593_2023_-_Algorithmic_NBA_Player_Acquisition_-_Brill_et_al.pdf.md` | 60082 | 8347 | 5/5 | True | `e6ee7908408b2d25` |
| 106 | node1 | `gdrive_corpus_extractions/0e9017e536_2025_-_Optimizing_Lead_Distance_-_Whitney-Epstein_et_al.pdf.md` | 60156 | 8427 | 5/5 | True | `acce0785ba402a10` |
| 107 | node1 | `gdrive_corpus_extractions/0ea3cbc195_2016_-_The_Hot-Hand_Fallacy_Cognitive_Mistakes_or_Equilibrium_Adjustments_Eviden.md` | 43777 | 6344 | 5/5 | True | `daef1308e42ae353` |
| 108 | node1 | `gdrive_corpus_extractions/0eab6f8ee3_arxiv_2501.10449v4.pdf.md` | 28635 | 3852 | 5/5 | True | `85e1505919749328` |
| 109 | node1 | `gdrive_corpus_extractions/0efc83dbe9_openalex_W132931105.pdf.md` | 64253 | 9033 | 5/5 | True | `7e9745519dfcde7f` |
| 110 | node1 | `gdrive_corpus_extractions/0f39cd474d_2026_-_Better_Prevent_than_Tackle_Valuing_Defense_in_Soccer_Based_on_Graph_Neura.md` | 36586 | 5418 | 5/5 | True | `e71f9fde07853d16` |
| 111 | node1 | `gdrive_corpus_extractions/0f3ed986c9_openalex_W7131761880.pdf.md` | 65543 | 9420 | 5/5 | True | `d4e40ae2eb92550d` |
| 112 | node1 | `gdrive_corpus_extractions/0f46c7818a_2010_A_Regression_Based_Adjusted_Plus_Minus_Statistic_for_NHL_-_McDonald.pdf.md` | 63249 | 9081 | 5/5 | True | `9710bfece2a59e06` |
| 113 | node1 | `gdrive_corpus_extractions/0fde602c9c_openalex_W1505403248.pdf.md` | 32022 | 4757 | 5/5 | True | `fce96d39677cd042` |
| 114 | node1 | `gdrive_corpus_extractions/0ff69f469d_undated_-_Analyzing_NBA_Player_Positions_and_Interactions_with_Density-Functiona.md` | 60338 | 8471 | 5/5 | True | `b762c19dc3a2a106` |
| 115 | node1 | `gdrive_corpus_extractions/10452727e6_arxiv_2004.07786v1.pdf.md` | 45552 | 6650 | 5/5 | True | `a0bb723405c7ee7a` |
| 116 | node1 | `gdrive_corpus_extractions/1045461bfb_2511.00261v2.pdf.md` | 36100 | 5286 | 5/5 | True | `881472d4f706eabc` |
| 117 | node1 | `gdrive_corpus_extractions/1070752db4_AstromMurray-2008-FeedbackSystems1.pdf.md` | 37175 | 5300 | 5/5 | True | `ee5cd3e020060a42` |
| 118 | node1 | `gdrive_corpus_extractions/10ae4dc106_2606.08064v1.pdf.md` | 66484 | 9511 | 5/5 | True | `4d5355a2c200f113` |
| 119 | node1 | `gdrive_corpus_extractions/10e792fe7e_2023_-_Clustering_Women_s_Football_Players_-_Identifying_Functional_Patterns_for.md` | 32797 | 4432 | 5/5 | True | `742d12f2d4f9be53` |
| 120 | node1 | `gdrive_corpus_extractions/118be12a00_arxiv_1511.04136v4.pdf.md` | 47655 | 7271 | 5/5 | True | `3e77c2e3babbeaae` |
| 121 | node1 | `gdrive_corpus_extractions/1254b01681_openalex_W4411109518.pdf.md` | 33830 | 4737 | 5/5 | True | `27ae925e16c9f584` |
| 122 | node1 | `gdrive_corpus_extractions/126357e83e_arxiv_1508.04158v1.pdf.md` | 39809 | 5940 | 5/5 | True | `5e566eccd6063969` |
| 123 | node1 | `gdrive_corpus_extractions/12a432fa7c_openalex_W4406476383.pdf.md` | 55617 | 8120 | 5/5 | True | `1c3c25ef123d7034` |
| 124 | node1 | `gdrive_corpus_extractions/12b0187c22_openalex_W7222881309.pdf.md` | 33427 | 4939 | 5/5 | True | `894aa3c7841e322b` |
| 125 | node1 | `gdrive_corpus_extractions/12d22fceef_2601.00998v1.pdf.md` | 54528 | 7509 | 5/5 | True | `ad3d8aef23e403aa` |
| 126 | node1 | `gdrive_corpus_extractions/12d91dc85f_2018_nflWAR__a_reproducible_method_for_offensive_player_evaluation_in_football_J.md` | 54550 | 7455 | 5/5 | True | `bdca23b57210612b` |
| 127 | node1 | `gdrive_corpus_extractions/131799713a_MohriRostamizadehTalwalkar-2018-FoundationsOfMachineLearning2.pdf.md` | 65352 | 9295 | 5/5 | True | `5861a8a52209f309` |
| 128 | node1 | `gdrive_corpus_extractions/132e40bf96_openalex_W4302293571.pdf.md` | 49441 | 7022 | 5/5 | True | `d1064bad647548fb` |
| 129 | node1 | `gdrive_corpus_extractions/13c909bac1__OceanofPDF.com_Predictive_Modelling_for_Football_Analytics_-_Leonardo_Egidi.pdf.md` | 51827 | 7147 | 5/5 | True | `3034afc6482c24de` |
| 130 | node1 | `gdrive_corpus_extractions/13d728a3ef_2018_-_Eye_on_the_Ball_The_Relationship_Between_Sensorimotor_Abilities_and_On-Fi.md` | 24126 | 3432 | 5/5 | True | `9bfb575b9fdd5883` |
| 131 | node1 | `gdrive_corpus_extractions/144610b9b6_arxiv_2507.20163v1.pdf.md` | 63064 | 8864 | 5/5 | True | `0c0f17bf7995512f` |
| 132 | node1 | `gdrive_corpus_extractions/14acbbc650_openalex_W4379537143.pdf.md` | 44508 | 6800 | 5/5 | True | `bb82e4b7f2b61283` |
| 133 | node1 | `gdrive_corpus_extractions/1537a81f43_arxiv_2204.06918v2.pdf.md` | 35615 | 5174 | 5/5 | True | `c89dc38c71aec018` |
| 134 | node1 | `gdrive_corpus_extractions/1651b32378_arxiv_2007.12327v2.pdf.md` | 26588 | 3986 | 5/5 | True | `cef27ab17c8c6899` |
| 135 | node1 | `gdrive_corpus_extractions/168795919c_2401.16392.pdf.md` | 35241 | 5131 | 5/5 | True | `92c1de36193f74bb` |
| 136 | node1 | `gdrive_corpus_extractions/16892b6b5f_2020_-_Comparing_Free-Throw_Forms_Among_NBA_Players_Through_3D_Similarity_Measur.md` | 41227 | 5914 | 5/5 | True | `85601c69ea922c6c` |
| 137 | node1 | `gdrive_corpus_extractions/16ce53ad0b_Evaluating_NHL_Goalies_Skaters_and_Teams.pdf.md` | 32032 | 4769 | 5/5 | True | `05d1e4b40580e7a6` |
| 138 | node1 | `gdrive_corpus_extractions/16d100645a_How-to-Lie-with-Statistics.pdf.md` | 68371 | 10219 | 5/5 | True | `7a5e0d694af9e905` |
| 139 | node1 | `gdrive_corpus_extractions/176c59881e_openalex_W4412375544.pdf.md` | 41036 | 6028 | 5/5 | True | `44b315cf0523e70e` |
| 140 | node1 | `gdrive_corpus_extractions/17eaeb088a_openalex_W2688838357.pdf.md` | 32965 | 4827 | 5/5 | True | `6a9746b84482d458` |
| 141 | node1 | `gdrive_corpus_extractions/18593ca41e_2020_-_PFF_WAR_Modeling_Player_Value_in_American_Football_-_Unknown_Authors.pdf.md` | 28148 | 4142 | 5/5 | True | `d5e572f5f4f134bf` |
| 142 | node1 | `gdrive_corpus_extractions/18b0cc84ce_978-3-319-32428-9.pdf.md` | 30518 | 4355 | 5/5 | True | `5c04743f6e5f160c` |
| 143 | node1 | `gdrive_corpus_extractions/190c89b2b7_2015_-_Diamonds_on_the_Line_Profits_through_Investment_Gaming_-_Unknown_Authors..md` | 34933 | 4909 | 5/5 | True | `f0c00f98df5a3027` |
| 144 | node1 | `gdrive_corpus_extractions/19ae264865_2022_-_Predicting_Career_Wins_Above_Replacement_from_Rookie_Stats_in_Baseball_Ad.md` | 44420 | 6395 | 5/5 | True | `bff6cf3a3ddb00af` |
| 145 | node1 | `gdrive_corpus_extractions/19af2e590a_2019_-_Playing_Fast_Not_Loose_Evaluating_team-level_pace_of_play_in_ice_hockey_u.md` | 65789 | 9607 | 5/5 | True | `d668c4b9ecaef120` |
| 146 | node1 | `gdrive_corpus_extractions/1a0b923c62_arxiv_1508.00776v1.pdf.md` | 58064 | 8562 | 5/5 | True | `4df76efd506d45a7` |
| 147 | node1 | `gdrive_corpus_extractions/1acd9c574b_Vershynin-2026-HighDimensionalProbability.pdf.md` | 40568 | 5678 | 5/5 | True | `9dc022be3f7e5a52` |
| 148 | node1 | `gdrive_corpus_extractions/1ad3716ed1_arxiv_2609.29044v1.pdf.md` | 37679 | 5330 | 5/5 | True | `329f50f9e76320f3` |
| 149 | node1 | `gdrive_corpus_extractions/1b16fc9a05_Yeung-2008-InformationTheoryAndNetworkCoding.pdf.md` | 51045 | 7305 | 5/5 | True | `6914bb634c757b3f` |
| 150 | node1 | `gdrive_corpus_extractions/1b7ebd6539_Interception_The_Secrets_Of_Modern_Sports_Betting.pdf.md` | 48962 | 7078 | 5/5 | True | `b3f8ba9e6fdbd650` |
| 151 | node1 | `gdrive_corpus_extractions/1bde380423_arxiv_2203.00734v2.pdf.md` | 55916 | 8347 | 5/5 | True | `5b431c87b0273cc2` |
| 152 | node1 | `gdrive_corpus_extractions/1c0a3539c8_2017_-_Optimizing_pre-season_training_loads_in_Australian_football_-_Unknown_Aut.md` | 58861 | 8499 | 5/5 | True | `b2434f8d6a69928a` |
| 153 | node1 | `gdrive_corpus_extractions/1c150056b6_2019_-_Leveraging_Batter-Pitcher_Matchups_for_Optimal_Game_Strategy_-_Unknown_Au.md` | 55143 | 7774 | 5/5 | True | `22b77523fc5b4f1e` |
| 154 | node1 | `gdrive_corpus_extractions/1c65a4155a_10.1201_b17189_previewpdf.pdf.md` | 57075 | 7875 | 5/5 | True | `dc7a0f4ed9107701` |
| 155 | node1 | `gdrive_corpus_extractions/1c957546f9_arxiv_2003.06994v1.pdf.md` | 66352 | 9757 | 5/5 | True | `8c9548e94c58b70b` |
| 156 | node1 | `gdrive_corpus_extractions/1d6fb9915a_openalex_W7212246697.pdf.md` | 46022 | 6647 | 5/5 | True | `b78d921fab271174` |
| 157 | node1 | `gdrive_corpus_extractions/1e497a8dfb_arxiv_2211.12334v1.pdf.md` | 60178 | 8484 | 5/5 | True | `b010d31a95dbfc89` |
| 158 | node1 | `gdrive_corpus_extractions/1fb52d993b_openalex_W7215427368.pdf.md` | 32039 | 4544 | 5/5 | True | `e1ec1e98de96f9ed` |
| 159 | node1 | `gdrive_corpus_extractions/1fbb32f016_2026_-_Tackling_Causality_Estimating_Frame-Level_Defensive_Impact_with_Multi-Age.md` | 65766 | 9103 | 5/5 | True | `533d63548cf5452d` |
| 160 | node1 | `gdrive_corpus_extractions/2102269b27_2302.09276.pdf.md` | 63333 | 9361 | 5/5 | True | `26481ced56b983d6` |
| 161 | node1 | `gdrive_corpus_extractions/2124e9fbe3_2606.05966v1.pdf.md` | 53586 | 7563 | 5/5 | True | `128f380a10008eea` |
| 162 | node1 | `gdrive_corpus_extractions/216554de46_2003.09384.pdf.md` | 62842 | 9204 | 5/5 | True | `6caced313978755e` |
| 163 | node1 | `gdrive_corpus_extractions/217740a750_openalex_W2044784588.pdf.md` | 63567 | 9396 | 5/5 | True | `e0b536237b73494c` |
| 164 | node1 | `gdrive_corpus_extractions/2193abfdf6_openalex_W4307804863.pdf.md` | 31811 | 4425 | 5/5 | True | `5b8c0b15572c88e9` |
| 165 | node1 | `gdrive_corpus_extractions/21b043226c_2024_-_A_Holistic_Examination_of_Streakiness_and_Consistency_in_Major_League_Bas.md` | 60323 | 9003 | 5/5 | True | `17d879edc38c1851` |
| 166 | node1 | `gdrive_corpus_extractions/21dab58114_openalex_W4285491162.pdf.md` | 61438 | 8764 | 5/5 | True | `20e1053f39584ff4` |
| 167 | node1 | `gdrive_corpus_extractions/21e10e1f61_2603.26575v1.pdf.md` | 59441 | 8806 | 5/5 | True | `6061dc2e11bd976c` |
| 168 | node1 | `gdrive_corpus_extractions/21f1240a9a_ssrn-7197889.pdf.md` | 66784 | 9211 | 5/5 | True | `58df8ea8c6d5160c` |
| 169 | node1 | `gdrive_corpus_extractions/22b882028d_2609.01337v1.pdf.md` | 40704 | 5951 | 5/5 | True | `3829bee22026494e` |
| 170 | node1 | `gdrive_corpus_extractions/22db6bd233_2022_-_Predicting_Winners_in_Cricket_Introducing_Sports_Analytics_to_One_of_the_.md` | 64324 | 9504 | 5/5 | True | `16f90e0ce80afeb1` |
| 171 | node1 | `gdrive_corpus_extractions/2318211c91_vanderAalst-Carmona-2022-ProcessMiningHandbook-OA.pdf.md` | 48229 | 6743 | 5/5 | True | `0419800fd43df07f` |
| 172 | node1 | `gdrive_corpus_extractions/232014a839_ifafrules.pdf.md` | 37188 | 5925 | 5/5 | True | `640fbe2145f51f88` |
| 173 | node1 | `gdrive_corpus_extractions/232d94a6cc_NASEM-2022-TraumaticBrainInjury-RoadmapForAcceleratingProgress.pdf.md` | 60128 | 8722 | 5/5 | True | `a1cd1a2bb78f3b17` |
| 174 | node1 | `gdrive_corpus_extractions/23d50a8065_2605.05997v2.pdf.md` | 49659 | 7069 | 5/5 | True | `f843aa4014c37c2b` |
| 175 | node1 | `gdrive_corpus_extractions/23de37799a_openalex_W7125491954.pdf.md` | 33800 | 4790 | 5/5 | True | `050806ec466703a2` |
| 176 | node1 | `gdrive_corpus_extractions/240dfc5f07_2016_A_Scalable_Framework_for_NBA_Player_and_Team_Comparisons_Using_Player_Track.md` | 49709 | 7247 | 5/5 | True | `d55f46c231b19bd5` |
| 177 | node1 | `gdrive_corpus_extractions/2410bbf0cd_2019_-_Home_Sweet_Home_Quantifying_Home_Court_Advantages_for_NCAA_Basketball_Sta.md` | 47106 | 6494 | 5/5 | True | `6441348f7e83fb9c` |
| 178 | node1 | `gdrive_corpus_extractions/245092c06d_2022_-_Finding_the_NBA_Draft_Diamonds_in_the_Rough_-_Batra_et_al.pdf.md` | 49233 | 7234 | 5/5 | True | `040437e530656859` |
| 179 | node1 | `gdrive_corpus_extractions/24a285253b_arxiv_2004.10335v3.pdf.md` | 52725 | 8072 | 5/5 | True | `b26557a8432d51ae` |
| 180 | node1 | `gdrive_corpus_extractions/24c0240353_2606.18242v1.pdf.md` | 43255 | 6125 | 5/5 | True | `81f33ee46de7518e` |
| 181 | node1 | `gdrive_corpus_extractions/24dff9ca8f_1708.06694v2.pdf.md` | 50640 | 7116 | 5/5 | True | `def041f90051e0d8` |
| 182 | node1 | `gdrive_corpus_extractions/24e630a20a_978-3-319-41285-6.pdf.md` | 36313 | 4917 | 5/5 | True | `19287d6e19dd5582` |
| 183 | node1 | `gdrive_corpus_extractions/253e33e9b1_2021_-_Winning_and_losing_streaks_in_the_National_Hockey_League_are_teams_experi.md` | 49041 | 7323 | 5/5 | True | `6eaf7b7d1fbef0a7` |
| 184 | node1 | `gdrive_corpus_extractions/259e892d7a_2020_-_Characterization_of_Space_and_Time-Dependence_of_3-Point_Shots_in_Basketb.md` | 51752 | 7349 | 5/5 | True | `f49582eb89e6551f` |
| 185 | node1 | `gdrive_corpus_extractions/262eea675a_2026_-_Comparative_Effects_Of_1V1_Vs_3V3_Small-Sided_Basketball_Training_On_Body.md` | 34841 | 5219 | 5/5 | True | `aa066de686dfdfc5` |
| 186 | node1 | `gdrive_corpus_extractions/2652a35250_2019_-_The_Economic_Impact_of_NBA_Superstars_Evidence_from_Missed_Games_using_Ti.md` | 32187 | 4656 | 5/5 | True | `b8b6b211594b3c0e` |
| 187 | node1 | `gdrive_corpus_extractions/26952d183e_openalex_W781300278.pdf.md` | 65824 | 9609 | 5/5 | True | `eeb66c86d2ef4fc4` |
| 188 | node1 | `gdrive_corpus_extractions/27c3b00db4_openalex_W104532112.pdf.md` | 60783 | 8184 | 5/5 | True | `555f9ebe743ea9eb` |
| 189 | node1 | `gdrive_corpus_extractions/27d98bcb9b_openalex_W7202199795.pdf.md` | 39317 | 5753 | 5/5 | True | `7e4eca1243bb03ea` |
| 190 | node1 | `gdrive_corpus_extractions/28362167b7_2026_-_Scouting_Anyone_Probabilistic_Player_Archetypes_for_Any_League_-_Myrte_et.md` | 29537 | 4124 | 5/5 | True | `23495912f828800e` |
| 191 | node1 | `gdrive_corpus_extractions/28c74be4b1_BoydVandenberghe-2004-ConvexOptimization.pdf.md` | 29376 | 4028 | 5/5 | True | `b4e4814d96533605` |
| 192 | node1 | `gdrive_corpus_extractions/29066232fb_openalex_W2810898768.pdf.md` | 42025 | 5794 | 5/5 | True | `efd21bc8407f6a28` |
| 193 | node1 | `gdrive_corpus_extractions/2909ed342b_arxiv_2608.09254v1.pdf.md` | 57056 | 8469 | 5/5 | True | `9f4f6e4896da919d` |
| 194 | node1 | `gdrive_corpus_extractions/29b0dc06ee_stat928_notes.pdf.md` | 53896 | 7540 | 5/5 | True | `bf718f37f99a7edb` |
| 195 | node1 | `gdrive_corpus_extractions/2a0c17a0f3_openalex_W7168292467.pdf.md` | 57431 | 8417 | 5/5 | True | `8060bfe4c86e6ff3` |
| 196 | node1 | `gdrive_corpus_extractions/2a20f66aec_2602.00676v1.pdf.md` | 36619 | 5106 | 5/5 | True | `eb811ed2d53ecbed` |
| 197 | node1 | `gdrive_corpus_extractions/2a485ad684_Football_Analytics_with_Python_and_R_bibis.ir.pdf.md` | 56186 | 8136 | 5/5 | True | `774ffcf14c3b86c1` |
| 198 | node1 | `gdrive_corpus_extractions/2a73e75dbb_2005_Overconfidence_vs_Market_Efficiency_in_the_NFL.pdf.md` | 57939 | 8628 | 5/5 | True | `2151e4ebb1edbd60` |
| 199 | node1 | `gdrive_corpus_extractions/2a8dacadaf_Peterson-Davie-2024-ComputerNetworksASystemsApproach-v6.1.pdf.md` | 53312 | 7649 | 5/5 | True | `1d5900be7270a760` |
| 200 | node1 | `gdrive_corpus_extractions/2ac1b52d42_2608.25246v1.pdf.md` | 54923 | 7598 | 5/5 | True | `be98d772cfaae82d` |
| 201 | node1 | `gdrive_corpus_extractions/2ad843d6d5_arxiv_2204.13809v2.pdf.md` | 59798 | 8896 | 5/5 | True | `f0473afdf57f903e` |
| 202 | node1 | `gdrive_corpus_extractions/2b8a09ce03_arxiv_2506.03057v1.pdf.md` | 64193 | 8985 | 5/5 | True | `70b29023957cfe7a` |
| 203 | node1 | `gdrive_corpus_extractions/2c3e5d267a_openalex_W2126937776.pdf.md` | 28751 | 3994 | 5/5 | True | `d3434a1b876fc0a3` |
| 204 | node1 | `gdrive_corpus_extractions/2c512994e4_2023_Analytics_have_some_humility_a_statistical_view_of_fourth-down_decision_mak.md` | 56112 | 8129 | 5/5 | True | `db17e9ebcd5048ea` |
| 205 | node1 | `gdrive_corpus_extractions/2ce80f7d75_arxiv_2004.08189v2.pdf.md` | 63238 | 9306 | 5/5 | True | `284ded509e522216` |
| 206 | node1 | `gdrive_corpus_extractions/2d99d62aed_2609.13453v1.pdf.md` | 37593 | 5460 | 5/5 | True | `56ae5c87f477e86a` |
| 207 | node1 | `gdrive_corpus_extractions/2dea973c33_arxiv_2406.17220v2.pdf.md` | 63333 | 8905 | 5/5 | True | `0f092d0216763c41` |
| 208 | node1 | `gdrive_corpus_extractions/2deeed140c_2020_-_Seeing_in_to_the_future_using_self-propelled_particle_models_to_aid_playe.md` | 50712 | 7313 | 5/5 | True | `ed3f7a71757bf947` |
| 209 | node1 | `gdrive_corpus_extractions/2e66bff536_arxiv_2507.03016v1.pdf.md` | 56598 | 8236 | 5/5 | True | `97ad433053d8aa27` |
| 210 | node1 | `gdrive_corpus_extractions/2ecc73acb5_arxiv_2501.03674v2.pdf.md` | 49333 | 6836 | 5/5 | True | `2c870fd3097fc4cc` |
| 211 | node1 | `gdrive_corpus_extractions/2fa75aa7e3_2512.02651v1.pdf.md` | 55513 | 7515 | 5/5 | True | `5dbac604bac26ebf` |
| 212 | node1 | `gdrive_corpus_extractions/2fb2ec41c2_2021_-_Comparing_sequential_forecasters_is_538_any_better_than_Vegas-Odds_-_Unkn.md` | 59812 | 8426 | 5/5 | True | `50d6870182af9bd3` |
| 213 | node1 | `gdrive_corpus_extractions/3046758a08_2020_-_Pulling_Starters_-_Unknown_Authors.pdf.md` | 70256 | 10149 | 5/5 | True | `bfa43a267d5a3a16` |
| 214 | node1 | `gdrive_corpus_extractions/3053a6c1af_2023_-_Aiming_for_Competitive_Balance_Designing_Fair_Handicap_Systems_for_Darts_.md` | 52108 | 7360 | 5/5 | True | `847daefebbb54f0d` |
| 215 | node1 | `gdrive_corpus_extractions/30b1e13460_2021_-_Hadi_Sotudeh_-_Potential_Penetrative_Pass_P3_-_Unknown_Authors.pdf.md` | 64698 | 9193 | 5/5 | True | `cd045a7505b78779` |
| 216 | node1 | `gdrive_corpus_extractions/30d64a40d6_2017_-_Using_a_tennis_rating_system_to_determine_handicaps_in_amateur_matches_-_.md` | 35780 | 5478 | 5/5 | True | `bc406bbd8cdfb68f` |
| 217 | node1 | `gdrive_corpus_extractions/30f7034042_openalex_W2994375231.pdf.md` | 62637 | 8561 | 5/5 | True | `5728957061dabe65` |
| 218 | node1 | `gdrive_corpus_extractions/3113594bc7_Keynes-1921-TreatiseOnProbability.pdf.md` | 50147 | 7459 | 5/5 | True | `4b80e210bde9b238` |
| 219 | node1 | `gdrive_corpus_extractions/311ab61af9_book_9780262374675.pdf.md` | 41773 | 5766 | 5/5 | True | `35b7f7dd5a38b070` |
| 220 | node1 | `gdrive_corpus_extractions/31896e1be9_3703323.3703743.pdf.md` | 48917 | 7211 | 5/5 | True | `674a210ece588d00` |
| 221 | node1 | `gdrive_corpus_extractions/31b2f99de2_openalex_W3123784184.pdf.md` | 56558 | 8136 | 5/5 | True | `874a17caf399acce` |
| 222 | node1 | `gdrive_corpus_extractions/31c9d8a138_openalex_W2771875038.pdf.md` | 68708 | 10057 | 5/5 | True | `c5fc04acdcc58473` |
| 223 | node1 | `gdrive_corpus_extractions/323277a359__OceanofPDF.com_Data-Driven_Modelling_and_Predictive_Analytics_-_Alex_Khang.pdf.md` | 67739 | 9837 | 5/5 | True | `4bc2b3ed25fef8c7` |
| 224 | node1 | `gdrive_corpus_extractions/325c6e0b4b_openalex_W3156412229.pdf.md` | 47006 | 6940 | 5/5 | True | `b37d182788657717` |
| 225 | node1 | `gdrive_corpus_extractions/32d786e70a_arxiv_2602.22941v2.pdf.md` | 37750 | 5242 | 5/5 | True | `1ea543cf93e3b21d` |
| 226 | node1 | `gdrive_corpus_extractions/3307c6f9fa_2021_-_Samer_Fatayri_Kirill_Serykh_and_Egor_Gumin_-_What_Drives_the_Goalkeepers_.md` | 39510 | 5717 | 5/5 | True | `729733997c0d3fad` |
| 227 | node1 | `gdrive_corpus_extractions/3380bf901d_22b_2022.pdf.md` | 67831 | 10226 | 5/5 | True | `56ef85a7ab356c53` |
| 228 | node1 | `gdrive_corpus_extractions/33e7f25e67_2403.16282.pdf.md` | 52199 | 7306 | 5/5 | True | `ae2e9bc4463cf456` |
| 229 | node1 | `gdrive_corpus_extractions/344138dce8_2211.14921.pdf.md` | 64855 | 9276 | 5/5 | True | `2ae80664658bd7aa` |
| 230 | node1 | `gdrive_corpus_extractions/34fb2c4aa8_2305.01643v2.pdf.md` | 70234 | 10169 | 5/5 | True | `2f200a0ffe9ddc0d` |
| 231 | node1 | `gdrive_corpus_extractions/353debd549_openalex_W4385432369.pdf.md` | 57517 | 7975 | 5/5 | True | `6fefc433b162c705` |
| 232 | node1 | `gdrive_corpus_extractions/359e69a26b_Hailperin-2019-OperatingSystemsAndMiddleware.pdf.md` | 64112 | 9296 | 5/5 | True | `518c2da56cde7eee` |
| 233 | node1 | `gdrive_corpus_extractions/35c709de3a_Frontiers-2024-NewInsightsPerspectivesOnTBI.pdf.md` | 50099 | 7314 | 5/5 | True | `d6937e512e8e39d0` |
| 234 | node1 | `gdrive_corpus_extractions/364e32ffc9_2309.00756.pdf.md` | 45360 | 6684 | 5/5 | True | `20d75071ad531a40` |
| 235 | node1 | `gdrive_corpus_extractions/3691171543_ISLR_Seventh_Printing.pdf.md` | 50379 | 7441 | 5/5 | True | `f7bd9291715ab38b` |
| 236 | node1 | `gdrive_corpus_extractions/36c26c884d_From_Players_to_Teams_Towards_a_Multi_Le.pdf.md` | 26759 | 3859 | 5/5 | True | `22a1b0759d23393f` |
| 237 | node1 | `gdrive_corpus_extractions/36d90b0856_2019_-_Wins_Above_Replacement_and_the_MLB_MVP_Vote_A_Natural_Experiment_-_Unknow.md` | 65356 | 9246 | 5/5 | True | `6217a4869b942f5a` |
| 238 | node1 | `gdrive_corpus_extractions/3706a47ed7_Settles-2012-ActiveLearning.pdf.md` | 42695 | 5853 | 5/5 | True | `897293e3c502e2a4` |
| 239 | node1 | `gdrive_corpus_extractions/375484133b_openalex_W3147221328.pdf.md` | 53703 | 8274 | 5/5 | True | `5fbcba7c91b2ec75` |
| 240 | node1 | `gdrive_corpus_extractions/376ba2ad50_Pearson-1892-GrammarOfScience.pdf.md` | 43428 | 6171 | 5/5 | True | `e9aa48d5e2099cf9` |
| 241 | node1 | `gdrive_corpus_extractions/380b95785e_openalex_W4412997188.pdf.md` | 39452 | 5682 | 5/5 | True | `59beee3775e8826d` |
| 242 | node1 | `gdrive_corpus_extractions/380d26e3cd_openalex_W7167210251.pdf.md` | 27406 | 3911 | 5/5 | True | `f6a02cc9c815d053` |
| 243 | node1 | `gdrive_corpus_extractions/3873517d07_Lampson-2021-HintsAndPrinciplesForComputerSystemDesign.pdf.md` | 55858 | 8602 | 5/5 | True | `99dddd5c14298cc9` |
| 244 | node1 | `gdrive_corpus_extractions/3896e877a1_2017_-_Quantifying_the_causal_effects_of_conservative_fourth_down_decision-makin.md` | 59589 | 8729 | 5/5 | True | `0a3b66b957d6417e` |
| 245 | node1 | `gdrive_corpus_extractions/38bb7693c8_bws_book_2_.pdf.md` | 40288 | 5744 | 5/5 | True | `35089a63f107a890` |
| 246 | node1 | `gdrive_corpus_extractions/398e2af561_openalex_W2582918269.pdf.md` | 48403 | 6812 | 5/5 | True | `bae2f96bb074c31c` |
| 247 | node1 | `gdrive_corpus_extractions/3a6024052e_arxiv_2604.21822v1.pdf.md` | 32207 | 4599 | 5/5 | True | `1568529eff563e90` |
| 248 | node1 | `gdrive_corpus_extractions/3b0977df8b_2015_Counterpoints_Advanced_Defensive_Metrics_NBA.pdf.md` | 66404 | 9375 | 5/5 | True | `5799d8ee35d3d172` |
| 249 | node1 | `gdrive_corpus_extractions/3b673f8a71_openalex_W4281763319.pdf.md` | 53964 | 7521 | 5/5 | True | `d11045fcfa5fb40b` |
| 250 | node1 | `gdrive_corpus_extractions/3b7a927d72_openalex_W1490155018.pdf.md` | 61535 | 9021 | 5/5 | True | `830998878e01c6b5` |
| 251 | node1 | `gdrive_corpus_extractions/3bf068a4db_2021_-_Soumyajit_Bose_and_Manas_Saraswat_-_Anatomy_of_Receiving_and_Turning_with.md` | 37046 | 5594 | 5/5 | True | `3dc212b43c8c1289` |
| 252 | node1 | `gdrive_corpus_extractions/3c1781c4e8_2510.19150v1.pdf.md` | 53774 | 7944 | 5/5 | True | `94dfb977c83fcb28` |
| 253 | node1 | `gdrive_corpus_extractions/3cb0682e7e_openalex_W4296283787.pdf.md` | 50315 | 6941 | 5/5 | True | `c9f443f6562bbe3f` |
| 254 | node1 | `gdrive_corpus_extractions/3cbbd8bf4b_openalex_W2059096325.pdf.md` | 57350 | 8322 | 5/5 | True | `b1e19b666293050b` |
| 255 | node1 | `gdrive_corpus_extractions/3d3dc0cf57_openalex_W4390874966.pdf.md` | 58961 | 8615 | 5/5 | True | `0c1e824d0d2789e9` |
| 256 | node1 | `gdrive_corpus_extractions/3d6a4356da_openalex_W4413925067.pdf.md` | 53993 | 7616 | 5/5 | True | `b97064cdae3a58eb` |
| 257 | node1 | `gdrive_corpus_extractions/3d95cb727c_Research_Methods_and_Performance_Analysi.pdf.md` | 56569 | 8135 | 5/5 | True | `8111b5a0c8f7915f` |
| 258 | node1 | `gdrive_corpus_extractions/3e3a7ee996_openalex_W2461456227.pdf.md` | 65421 | 9235 | 5/5 | True | `fb6506d17ac72661` |
| 259 | node1 | `gdrive_corpus_extractions/3e4ab84d3a_arxiv_1906.01760v3.pdf.md` | 57379 | 8200 | 5/5 | True | `4f883659a34d3449` |
| 260 | node1 | `gdrive_corpus_extractions/3e7f04915f_openalex_W4393253889.pdf.md` | 34393 | 5138 | 5/5 | True | `7099549135e5a4a8` |
| 261 | node1 | `gdrive_corpus_extractions/3e97f6867f_arxiv_2108.04602v1.pdf.md` | 21546 | 2959 | 5/5 | True | `83787911c5308e4c` |
| 262 | node1 | `gdrive_corpus_extractions/3ec5df2602_arxiv_1711.02741v2.pdf.md` | 54747 | 7795 | 5/5 | True | `0c537d4a0e38c91f` |
| 263 | node1 | `gdrive_corpus_extractions/3f1a009b59_arxiv_1704.04390v1.pdf.md` | 39699 | 5932 | 5/5 | True | `940ce0c49e6bd531` |
| 264 | node1 | `gdrive_corpus_extractions/3f4553b46e_openalex_W2395194742.pdf.md` | 58732 | 8423 | 5/5 | True | `0748af485c005bea` |
| 265 | node1 | `gdrive_corpus_extractions/3f9e32f815_2003.12185v1.pdf.md` | 41696 | 6015 | 5/5 | True | `00e77e0627852c5a` |
| 266 | node1 | `gdrive_corpus_extractions/3fe948c8d6_openalex_W2947015376.pdf.md` | 27318 | 3827 | 5/5 | True | `7dae134513d3d32e` |
| 267 | node1 | `gdrive_corpus_extractions/400c3d730c_A_Journey_Across_Football_Modelling_with.pdf.md` | 59085 | 8457 | 5/5 | True | `594932a51a02ba41` |
| 268 | node1 | `gdrive_corpus_extractions/40b3ac2b36_arxiv_2201.11533v1.pdf.md` | 37432 | 5453 | 5/5 | True | `9cc514b9d0f3152e` |
| 269 | node1 | `gdrive_corpus_extractions/40ff53f02d_2106.12666v2.pdf.md` | 45296 | 6749 | 5/5 | True | `1ed4c0a1e8fd063d` |
| 270 | node1 | `gdrive_corpus_extractions/418b02d110_2014_Pointwise_Slides.pdf.md` | 43278 | 5870 | 5/5 | True | `61c0da5c21f49c6e` |
| 271 | node1 | `gdrive_corpus_extractions/419d6c9054_2111.02859.pdf.md` | 53875 | 7416 | 5/5 | True | `18e6ebde95a459ab` |
| 272 | node1 | `gdrive_corpus_extractions/41da5dd9a1_openalex_W4393159506.pdf.md` | 46921 | 6713 | 5/5 | True | `6120949e014ef30f` |
| 273 | node1 | `gdrive_corpus_extractions/41ecb4812c__OceanofPDF.com_Sparse_Graphical_Modeling_for_High_Dimensional_Data_-_Faming_Lia.md` | 36685 | 4908 | 5/5 | True | `328a22ab3070b37c` |
| 274 | node1 | `gdrive_corpus_extractions/41fa8843b0_JurafskyMartin-2026-SpeechAndLanguageProcessing-3edDraft.pdf.md` | 48200 | 6921 | 5/5 | True | `57961fecc2f5134f` |
| 275 | node1 | `gdrive_corpus_extractions/42450caf19_2503.15225v3_1_.pdf.md` | 35258 | 5217 | 5/5 | True | `de9bd243cf8704cd` |
| 276 | node1 | `gdrive_corpus_extractions/42ab0f0c4f_openalex_W7166534666.pdf.md` | 55341 | 7700 | 5/5 | True | `284e584c39b1d765` |
| 277 | node1 | `gdrive_corpus_extractions/42c2ae5227_arxiv_1910.07722v1.pdf.md` | 56877 | 8146 | 5/5 | True | `aa6292f7c081f13f` |
| 278 | node1 | `gdrive_corpus_extractions/43216e3501_arxiv_2610.13259v1.pdf.md` | 67200 | 9679 | 5/5 | True | `508719492152c822` |
| 279 | node1 | `gdrive_corpus_extractions/43b15eafdd_2605.12799v1.pdf.md` | 62753 | 8524 | 5/5 | True | `26fc4beb9873d719` |
| 280 | node1 | `gdrive_corpus_extractions/43b805fd9e_arxiv_2502.04931v2.pdf.md` | 41769 | 5817 | 5/5 | True | `45e3872cee22e709` |
| 281 | node1 | `gdrive_corpus_extractions/43c44ff6b8_openalex_W4391175335.pdf.md` | 40130 | 5846 | 5/5 | True | `c798c1e8307eb366` |
| 282 | node1 | `gdrive_corpus_extractions/440614d47a_2017_-_NFLWAR_A_reproducible_method_for_offensive_player_evaluation_in_football_.md` | 58013 | 8139 | 5/5 | True | `b457bd943f9ddb71` |
| 283 | node1 | `gdrive_corpus_extractions/441b0826a9_arxiv_1810.10658v1.pdf.md` | 31933 | 4751 | 5/5 | True | `fb1b401450004d50` |
| 284 | node1 | `gdrive_corpus_extractions/444ce5118c_2022_-_Quantifying_the_impact_of_imbalanced_groups_in_FIFA_Women_s_World_Cup_tou.md` | 45715 | 6656 | 5/5 | True | `9184e74d5a449610` |
| 285 | node1 | `gdrive_corpus_extractions/4478b868ba_1909.12938.pdf.md` | 50811 | 7454 | 5/5 | True | `d96028e088a0acba` |
| 286 | node1 | `gdrive_corpus_extractions/450a5436e7_arxiv_2509.14000v5.pdf.md` | 53821 | 7905 | 5/5 | True | `f126be52edd43e5e` |
| 287 | node1 | `gdrive_corpus_extractions/45165d4ef9_2606.06926.pdf.md` | 44022 | 6485 | 5/5 | True | `f4e71aee5c9c3bfc` |
| 288 | node1 | `gdrive_corpus_extractions/4606e0416d_Merz-2017-LeagueofDenialReview.pdf.md` | 53227 | 7310 | 5/5 | True | `54eee6eb1acb6614` |
| 289 | node1 | `gdrive_corpus_extractions/460b859f26_openalex_W4405616050.pdf.md` | 50210 | 7230 | 5/5 | True | `3826d97cfb6a5917` |
| 290 | node1 | `gdrive_corpus_extractions/465d7223de_arxiv_2605.00268v2.pdf.md` | 50844 | 6929 | 5/5 | True | `26a82bed5bf44b7c` |
| 291 | node1 | `gdrive_corpus_extractions/46ab513fce_arxiv_2501.09281v2.pdf.md` | 67698 | 9477 | 5/5 | True | `7c021abc51802880` |
| 292 | node1 | `gdrive_corpus_extractions/46f3cb294e_KanakisEd-2025-TBI-CTE-AsCauseOfAlzheimers-MDPI.pdf.md` | 40694 | 5691 | 5/5 | True | `8e8fd2a98306ccfd` |
| 293 | node1 | `gdrive_corpus_extractions/471ccf0364_A-Course-in-Machine-Learning.pdf.md` | 34726 | 5145 | 5/5 | True | `1fd9a554e6913aef` |
| 294 | node1 | `gdrive_corpus_extractions/4727ab6f5b_2610.00302v1.pdf.md` | 38819 | 5407 | 5/5 | True | `2f65255c8f5d664d` |
| 295 | node1 | `gdrive_corpus_extractions/473144076c_2411.08055v1.pdf.md` | 46186 | 6769 | 5/5 | True | `4ba6a1824a069a44` |
| 296 | node1 | `gdrive_corpus_extractions/4759286936_2512.24601v3.pdf.md` | 46906 | 6760 | 5/5 | True | `df84eb8e7d6a406a` |
| 297 | node1 | `gdrive_corpus_extractions/4771256568_2019_A_Naive_Bayes_Approach_for_NFL_Passing_Evaluation_from_Tracking_Data_Extrac.md` | 45525 | 6509 | 5/5 | True | `fa04fb1c0ef68408` |
| 298 | node1 | `gdrive_corpus_extractions/478f869e8b_2015_-_Survivor_functions_hazard_functions_and_median_lifetimes_for_olympic_spon.md` | 46985 | 6841 | 5/5 | True | `f6bcf1575cc8d494` |
| 299 | node1 | `gdrive_corpus_extractions/479c19a19a_Hellerstein-Stonebraker-Hamilton-2007-ArchitectureOfADatabaseSystem.pdf.md` | 30734 | 4089 | 5/5 | True | `843fd0f25be29711` |
| 300 | node1 | `gdrive_corpus_extractions/47a8d7f86b_Conway_S_and_Ouellette_M_2019_Playing_it.pdf.md` | 34954 | 4905 | 5/5 | True | `3a571921b562422b` |
| 301 | node1 | `gdrive_corpus_extractions/480f7e7085_2025_-_A_Comparative_Analysis_of_Rating_Systems_in_the_US_Junior_Tennis_Developm.md` | 70364 | 10154 | 5/5 | True | `168a7b431f154df6` |
| 302 | node1 | `gdrive_corpus_extractions/48537d8529_2018_-_An_Open-Sourced_Optical_Tracking_and_Advanced_eSports_Analytics_Platform_.md` | 64450 | 9381 | 5/5 | True | `6851ae9628a78e45` |
| 303 | node1 | `gdrive_corpus_extractions/4855366104_2025_-_The_Curse_of_the_Second_Red_Bull_-_Zahn_et_al.pdf.md` | 60460 | 8497 | 5/5 | True | `c9a3edbaaf24e1e2` |
| 304 | node1 | `gdrive_corpus_extractions/48836e40a0_PierreLuckeWoldEds-2025-Neurotrauma-MDPI.pdf.md` | 49673 | 6835 | 5/5 | True | `d4116ec04a050797` |
| 305 | node1 | `gdrive_corpus_extractions/48b2c90faa_HennigOsborneKersting-2022-ProbabilisticNumerics.pdf.md` | 45628 | 6290 | 5/5 | True | `2b4c2d00411e7382` |
| 306 | node1 | `gdrive_corpus_extractions/493fe16e15_openalex_W4362602314.pdf.md` | 59753 | 8612 | 5/5 | True | `fb0dcdabc7a81d75` |
| 307 | node1 | `gdrive_corpus_extractions/49b24c13b4_openalex_W7160901492.pdf.md` | 65220 | 9488 | 5/5 | True | `fc8ef992c2d2b0d9` |
| 308 | node1 | `gdrive_corpus_extractions/49f49908b2_Fisher-1928-StatisticalMethodsForResearchWorkers.pdf.md` | 39847 | 5725 | 5/5 | True | `9229892d45640f48` |
| 309 | node1 | `gdrive_corpus_extractions/4a07ffeefe_openalex_W2782973998.pdf.md` | 62210 | 9299 | 5/5 | True | `92633b2ea06957b7` |
| 310 | node1 | `gdrive_corpus_extractions/4a326d903f_LevinPeresWilmer-2017-MarkovChainsAndMixingTimes2.pdf.md` | 55180 | 7739 | 5/5 | True | `14500f37b62003bd` |
| 311 | node1 | `gdrive_corpus_extractions/4a3e94d3ab_PVAMU_MSU_FOOTBALL_GAMENOTES_2024.pdf.md` | 37145 | 5891 | 5/5 | True | `dcb40d629b19bc99` |
| 312 | node1 | `gdrive_corpus_extractions/4a9e009c66_Exploiting_Early_Intent_Recognition_for.pdf.md` | 53233 | 7569 | 5/5 | True | `a22751c823719ede` |
| 313 | node1 | `gdrive_corpus_extractions/4afc2df3a6_ZhangEtAl-2023-DiveIntoDeepLearning.pdf.md` | 46703 | 6670 | 5/5 | True | `20fe5b0ac6dbc0bd` |
| 314 | node1 | `gdrive_corpus_extractions/4b75dd3408_Murphy-2023-ProbabilisticMachineLearningAdvancedTopics.pdf.md` | 62574 | 8565 | 5/5 | True | `1e8f524f4a4575c2` |
| 315 | node1 | `gdrive_corpus_extractions/4b9a657a15_2024_Estimating_NBA_Team_Shot_Selection_Efficiency_from_Aggregations_of....pdf.md` | 63332 | 9198 | 5/5 | True | `2df3370fdb21481a` |
| 316 | node1 | `gdrive_corpus_extractions/4c0bef6d11_arxiv_2602.15181v1.pdf.md` | 59382 | 8422 | 5/5 | True | `3c59a942a01154e8` |
| 317 | node1 | `gdrive_corpus_extractions/4c3736612e_arxiv_1608.08434v1.pdf.md` | 34943 | 5032 | 5/5 | True | `9916c5db5cad2e7b` |
| 318 | node1 | `gdrive_corpus_extractions/4c685d2cc4_openalex_W2488007833.pdf.md` | 33155 | 4727 | 5/5 | True | `f726625c6b3e309d` |
| 319 | node1 | `gdrive_corpus_extractions/4d01ea54ef_openalex_W4254972474.pdf.md` | 44439 | 6122 | 5/5 | True | `3173302ac0e3b889` |
| 320 | node1 | `gdrive_corpus_extractions/4d34ee4972_openalex_W2528885724.pdf.md` | 46644 | 6751 | 5/5 | True | `0d10091db7699caf` |
| 321 | node1 | `gdrive_corpus_extractions/4d97baf5c9_arxiv_2210.08648v2.pdf.md` | 35648 | 5440 | 5/5 | True | `9bc7b8f1d241d6c7` |
| 322 | node1 | `gdrive_corpus_extractions/4db07cd507__OceanofPDF.com_The_Hidden_Game_of_Football_-_Bob_Carroll.pdf.md` | 62390 | 9580 | 5/5 | True | `1b323e77d6fe21ef` |
| 323 | node1 | `gdrive_corpus_extractions/4dea62e91d_2606.21814.pdf.md` | 64682 | 9284 | 5/5 | True | `58955d4667c6b2df` |
| 324 | node1 | `gdrive_corpus_extractions/4e0821947d_2020_-_Changing_the_Major_League_Baseball_A_Whole_New_Ballgame_-_Unknown_Authors.md` | 54622 | 8002 | 5/5 | True | `4dde56d0456905d4` |
| 325 | node1 | `gdrive_corpus_extractions/4e1be2800e_2504.12021.pdf.md` | 52475 | 7621 | 5/5 | True | `108d56768b217c1a` |
| 326 | node1 | `gdrive_corpus_extractions/4e6ca9e3bc_openalex_W1015253378.pdf.md` | 61185 | 8685 | 5/5 | True | `e06463aa2d3f460b` |
| 327 | node1 | `gdrive_corpus_extractions/4e89a82eb4_openalex_W7166835043.pdf.md` | 45018 | 6221 | 5/5 | True | `325759fdf9f1cebc` |
| 328 | node1 | `gdrive_corpus_extractions/4e8ef963cf_arxiv_2204.04049v1.pdf.md` | 47528 | 7064 | 5/5 | True | `1bf17c46b68413cb` |
| 329 | node1 | `gdrive_corpus_extractions/4e97589cd6_mawrld003-endmatter.pdf.md` | 51802 | 7430 | 5/5 | True | `3b31ba81527279dd` |
| 330 | node1 | `gdrive_corpus_extractions/4eb3195211_2410.21484.pdf.md` | 60835 | 8450 | 5/5 | True | `b995226488ddc878` |
| 331 | node1 | `gdrive_corpus_extractions/4f36c9baa9_arxiv_1911.09807v1.pdf.md` | 49634 | 6699 | 5/5 | True | `be504c84915c4a2b` |
| 332 | node1 | `gdrive_corpus_extractions/4fbee21ee8_openalex_W2359113307.pdf.md` | 30707 | 4496 | 5/5 | True | `36cbf71e07903ee1` |
| 333 | node1 | `gdrive_corpus_extractions/4fda52985e_DavisEd-2023-CombatMedicSpecialistFieldcraft-II-Borden.pdf.md` | 46738 | 6797 | 5/5 | True | `9b7ec0865acba3e6` |
| 334 | node1 | `gdrive_corpus_extractions/50242953a9__OceanofPDF.com_Flawed_Prophets_-_Tirthak_Saha.pdf.md` | 56766 | 8121 | 5/5 | True | `7647f3f8b6ecf436` |
| 335 | node1 | `gdrive_corpus_extractions/5061f86010_2023_-_Are_Surprise_Teams_in_the_MLB_in_2023_More_Surprising_-_Federico_et_al.pd.md` | 34071 | 4777 | 5/5 | True | `51d63bea7892c4b6` |
| 336 | node1 | `gdrive_corpus_extractions/5062a569be_arxiv_2503.11181v1.pdf.md` | 63899 | 8897 | 5/5 | True | `be146a4401cdfff8` |
| 337 | node1 | `gdrive_corpus_extractions/50760ebf5b_arxiv_2410.07401v1.pdf.md` | 46622 | 6615 | 5/5 | True | `e58abd48bd7b56ee` |
| 338 | node1 | `gdrive_corpus_extractions/5078a5fe23_arxiv_1307.7198v1.pdf.md` | 52629 | 7610 | 5/5 | True | `4b366296784c956c` |
| 339 | node1 | `gdrive_corpus_extractions/50996d9fd0_openalex_W7216018874.pdf.md` | 69285 | 9652 | 5/5 | True | `f57a5911658b24f4` |
| 340 | node1 | `gdrive_corpus_extractions/50a30b7193_2109.13743v2.pdf.md` | 59437 | 8694 | 5/5 | True | `484a7648c6c3bd13` |
| 341 | node1 | `gdrive_corpus_extractions/513999e791_ReddiEtAl-2026-MachineLearningSystems-Vol1-Foundations.pdf.md` | 39128 | 5686 | 5/5 | True | `3530a1bc623f336c` |
| 342 | node1 | `gdrive_corpus_extractions/517308d9a3_openalex_W3070197474.pdf.md` | 61302 | 9021 | 5/5 | True | `86b6c663a57d897e` |
| 343 | node1 | `gdrive_corpus_extractions/519d39188e_2016_Meta-Analytics.pdf.md` | 44656 | 6119 | 5/5 | True | `db8128e3848e7a72` |
| 344 | node1 | `gdrive_corpus_extractions/51aa2c084d_2026_-_Hierarchical_Bayesian_Modeling_of_Cross-League_Performance_Translation_in.md` | 62132 | 8435 | 5/5 | True | `8a4f15c3ecad90e2` |
| 345 | node1 | `gdrive_corpus_extractions/51ce2588fd_2020_Unsupervised_Methods_for_Identifying_Pass_Coverage_Among_Defensive_Backs_wi.md` | 49433 | 7247 | 5/5 | True | `c61125bedbd5e03f` |
| 346 | node1 | `gdrive_corpus_extractions/527d9b6be4_2020_-_Projecting_NFL_Potential_from_College_Career_Performance_Curve_-_Unknown_.md` | 38311 | 5399 | 5/5 | True | `6ec722507e198aae` |
| 347 | node1 | `gdrive_corpus_extractions/52ae5997e3_InterJourMathematicaComputationalMethods.pdf.md` | 29752 | 4306 | 5/5 | True | `b9b4fc97ca73e995` |
| 348 | node1 | `gdrive_corpus_extractions/52c4e37690_2407.15987.pdf.md` | 29237 | 4120 | 5/5 | True | `587c7a9fce26496d` |
| 349 | node1 | `gdrive_corpus_extractions/52cb5aa04e_FregniEd-2019-Neurotrauma-FromEmergencyRoomToDayByDayLife-Frontiers.pdf.md` | 56685 | 8138 | 5/5 | True | `b353de284ad5e82d` |
| 350 | node1 | `gdrive_corpus_extractions/52ed6d6b10_1601.00574.pdf.md` | 15673 | 2091 | 5/5 | True | `68643d3c61bb9f41` |
| 351 | node1 | `gdrive_corpus_extractions/538967badb_Bishop-2006-PatternRecognitionAndMachineLearning.pdf.md` | 24701 | 3535 | 5/5 | True | `34ae645a3f2e344a` |
| 352 | node1 | `gdrive_corpus_extractions/54b4e6dacd_AndersonGuionnetZeitouni-2010-IntroductionToRandomMatrices.pdf.md` | 48157 | 6571 | 5/5 | True | `7a417fb9096293ee` |
| 353 | node1 | `gdrive_corpus_extractions/54c825cd4c_arxiv_2505.15820v4.pdf.md` | 55745 | 8231 | 5/5 | True | `de794473d9aa0579` |
| 354 | node1 | `gdrive_corpus_extractions/5576d95d0a_2205.09878v1.pdf.md` | 67094 | 9717 | 5/5 | True | `f7b125bd0892cefd` |
| 355 | node1 | `gdrive_corpus_extractions/55cbe73972_openalex_W4309344380.pdf.md` | 44159 | 5967 | 5/5 | True | `c6de2fdb2d7f1075` |
| 356 | node1 | `gdrive_corpus_extractions/55d907c2d4_PickingWinners_1_.pdf.md` | 44183 | 6402 | 5/5 | True | `39cc7da3bf801e75` |
| 357 | node1 | `gdrive_corpus_extractions/56ee2c2e62_openalex_W7223122180.pdf.md` | 33808 | 4834 | 5/5 | True | `80609b3424bd144c` |
| 358 | node1 | `gdrive_corpus_extractions/573f6a4e37_2026_-_Valuing_La_Pausa_Quantifying_Optimal_Pass_Timing_Beyond_Speed_-_Lee_et_al.md` | 46111 | 6930 | 5/5 | True | `c6257fbda199e7dd` |
| 359 | node1 | `gdrive_corpus_extractions/578da2fd90_ShalevShwartzBenDavid-2014-UnderstandingMachineLearning.pdf.md` | 45401 | 6325 | 5/5 | True | `dc595de3a23e0a53` |
| 360 | node1 | `gdrive_corpus_extractions/59b8c80c5d_arxiv_2311.05720v1.pdf.md` | 45553 | 6351 | 5/5 | True | `5d2d85f06709fd4c` |
| 361 | node1 | `gdrive_corpus_extractions/59d7428e5e_openalex_W2963742915.pdf.md` | 73232 | 10685 | 5/5 | True | `1632f49ba0c1f9ed` |
| 362 | node1 | `gdrive_corpus_extractions/59d7843bf1_openalex_W4254368736.pdf.md` | 69326 | 10532 | 5/5 | True | `b1ef3166ad536f45` |
| 363 | node1 | `gdrive_corpus_extractions/5a0be45815_2024_Feeling_the_Pressure_-_A_Unified_Framework_for_Automating_Pass_Rushing_Stat.md` | 45270 | 6621 | 5/5 | True | `82dfe07b14eb0279` |
| 364 | node1 | `gdrive_corpus_extractions/5a18de557e_arxiv_2203.16210v1.pdf.md` | 47874 | 6921 | 5/5 | True | `97f7cabb1aeb4c01` |
| 365 | node1 | `gdrive_corpus_extractions/5a6f3925d4_applied-predictive-modeling-max-kuhn-kjell-johnson_1518.pdf.md` | 39852 | 5829 | 5/5 | True | `4fb6e4aa30de3fe7` |
| 366 | node1 | `gdrive_corpus_extractions/5ac0dc3d36_arxiv_1802.00998v2.pdf.md` | 60430 | 8218 | 5/5 | True | `0c4ea30a7b14d210` |
| 367 | node1 | `gdrive_corpus_extractions/5b79b47812_openalex_W54281187.pdf.md` | 40205 | 5596 | 5/5 | True | `f263f519f2d40ddc` |
| 368 | node1 | `gdrive_corpus_extractions/5b99bd86d0_openalex_W3161500803.pdf.md` | 35678 | 5392 | 5/5 | True | `57e932a991f8a33f` |
| 369 | node1 | `gdrive_corpus_extractions/5bf56e566f_2601.11492v2.pdf.md` | 28149 | 3927 | 5/5 | True | `d897919be153abb7` |
| 370 | node1 | `gdrive_corpus_extractions/5ca8695d28_9789819614455.pdf.md` | 61594 | 9077 | 5/5 | True | `299c2da2a620ecb5` |
| 371 | node1 | `gdrive_corpus_extractions/5ccf26b6d5_Luo-2022-UnderstandingDiffusionModels.pdf.md` | 37813 | 5117 | 5/5 | True | `5b4fa35047be749f` |
| 372 | node1 | `gdrive_corpus_extractions/5d007bd99c_2015_-_Nearest-neighbor_matchup_effects_Predicting_March_Madness_-_Unknown_Autho.md` | 47207 | 6459 | 5/5 | True | `dff8a254d3161cc0` |
| 373 | node1 | `gdrive_corpus_extractions/5d345fa810_2311.04726v1.pdf.md` | 36836 | 5306 | 5/5 | True | `92e41dcdfe765772` |
| 374 | node1 | `gdrive_corpus_extractions/5df6bc6f4e_2608.12926v1.pdf.md` | 36439 | 5051 | 5/5 | True | `e68b0981a375df18` |
| 375 | node1 | `gdrive_corpus_extractions/5e58489d11_2022_-_Using_Machine_Learning_to_Describe_how_Players_Impact_the_Game_in_the_MLB.md` | 59383 | 8808 | 5/5 | True | `d902b72c535a442d` |
| 376 | node1 | `gdrive_corpus_extractions/5eb031f000_2021_-_Smart_kills_and_worthless_deaths_eSports_analytics_for_League_of_Legends_.md` | 56795 | 8498 | 5/5 | True | `5a275b20926e39cd` |
| 377 | node1 | `gdrive_corpus_extractions/5ec9548474_openalex_W7171193566.pdf.md` | 27170 | 3832 | 5/5 | True | `682db5ca94b9a1ae` |
| 378 | node1 | `gdrive_corpus_extractions/5edffe95e1_2017_Football_Route_Identification.pdf.md` | 39534 | 5548 | 5/5 | True | `c9b518db968a7e5c` |
| 379 | node1 | `gdrive_corpus_extractions/5f03c4da24_2509.11362v2.pdf.md` | 37664 | 5269 | 5/5 | True | `4c0ca0d07650928a` |
| 380 | node1 | `gdrive_corpus_extractions/5f14f376b0_2401.00649v2.pdf.md` | 33151 | 4506 | 5/5 | True | `397b8524d874fb5f` |
| 381 | node1 | `gdrive_corpus_extractions/5f943ae5b7_Camp-1900-Book-of-College-Sports.pdf.md` | 38124 | 5349 | 5/5 | True | `d19449958a63253b` |
| 382 | node1 | `gdrive_corpus_extractions/5fc0810f0e_2019_-_How_Much_Do_Coaches_Matter_-_Unknown_Authors.pdf.md` | 42545 | 6087 | 5/5 | True | `5c82240ff32304d8` |
| 383 | node1 | `gdrive_corpus_extractions/5fdea1e665_openalex_W2051329839.pdf.md` | 38723 | 5708 | 5/5 | True | `e75ac3a6298d7f8c` |
| 384 | node1 | `gdrive_corpus_extractions/604b64db5d_Hajek-2015-RandomProcessesForEngineers.pdf.md` | 42537 | 5929 | 5/5 | True | `641ad75f6450cfdb` |
| 385 | node1 | `gdrive_corpus_extractions/60ebd4440f_2026_-_Machine_Learning_Based_Classification_of_Alertness_Levels_in_Elite_Shooti.md` | 29618 | 4073 | 5/5 | True | `71c790da7f2cb0ca` |
| 386 | node1 | `gdrive_corpus_extractions/60ee25cbeb_2025_-_The_Imposter_on_the_Pitch_Learning_Team_Agnostic_Signatures_for_Counterfa.md` | 48723 | 6642 | 5/5 | True | `5b88bbd9794e9829` |
| 387 | node1 | `gdrive_corpus_extractions/615bc83ffd_The_mechanical_interactions_between_an_American_fo.pdf.md` | 37417 | 5368 | 5/5 | True | `c889561f7a5e42f8` |
| 388 | node1 | `gdrive_corpus_extractions/6196c3fd7a_SilverbergPonsfordBarlowEds-2020-ConcussionRehabilitation-Frontiers.pdf.md` | 51739 | 7415 | 5/5 | True | `61596485b9787cea` |
| 389 | node1 | `gdrive_corpus_extractions/628dec66f5_GT_book.pdf.md` | 26945 | 3901 | 5/5 | True | `eb24ac35e448c629` |
| 390 | node1 | `gdrive_corpus_extractions/62af64a1c5_2025_-_Using_Machine_Learning_to_Construct_Optimal_Team_Rosters_in_the_Modern_NB.md` | 65638 | 9385 | 5/5 | True | `c4423a980d6586be` |
| 391 | node1 | `gdrive_corpus_extractions/62ea6701b4_mlgm_epfl_book.pdf.md` | 43045 | 5811 | 5/5 | True | `a3cb28a8b24b19da` |
| 392 | node1 | `gdrive_corpus_extractions/63735f9de7_Bach-2024-LearningTheoryFromFirstPrinciples.pdf.md` | 65611 | 9018 | 5/5 | True | `18fef038a6309a76` |
| 393 | node1 | `gdrive_corpus_extractions/63d65611f9_arxiv_2207.14124v1.pdf.md` | 49789 | 7298 | 5/5 | True | `3ea6e83f8344eb10` |
| 394 | node1 | `gdrive_corpus_extractions/64706957d5_Predicting_run_production_and_run_preven.pdf.md` | 47906 | 6867 | 5/5 | True | `b9f99064280c9cff` |
| 395 | node1 | `gdrive_corpus_extractions/64a193e654_arxiv_2411.08216v1.pdf.md` | 47196 | 6604 | 5/5 | True | `165a21e64f0bc5c0` |
| 396 | node1 | `gdrive_corpus_extractions/64dd070f3b_2023_-_Calculating_NBA_MVPs_Using_Advanced_Sports_Analytics_-_Shen_et_al.pdf.md` | 51201 | 7562 | 5/5 | True | `4781e4c5dc01a218` |
| 397 | node1 | `gdrive_corpus_extractions/653f2900b2_2507.10571v3.pdf.md` | 12701 | 1677 | 5/5 | True | `4ccd3dee0a8fd38e` |
| 398 | node1 | `gdrive_corpus_extractions/65f5002309_ShohamLeytonBrown-2009-MultiagentSystems.pdf.md` | 40527 | 5825 | 5/5 | True | `e1570ce34922acb9` |
| 399 | node1 | `gdrive_corpus_extractions/6635dfad56_openalex_W3099713642.pdf.md` | 47413 | 6809 | 5/5 | True | `25c77c513c60059d` |
| 400 | node1 | `gdrive_corpus_extractions/6691952171_openalex_W7223908867.pdf.md` | 53353 | 7308 | 5/5 | True | `3654cafaea27be4c` |
| 401 | node1 | `gdrive_corpus_extractions/66b17c6cad_openalex_W7169845079.pdf.md` | 59877 | 8253 | 5/5 | True | `b2237ed4fd28abad` |
| 402 | node1 | `gdrive_corpus_extractions/66bda9c775_2019_-_Data-driven_lowlight_and_highlight_reel_creation_based_on_explainable_tem.md` | 30710 | 4420 | 5/5 | True | `0dcdc1fab2d62f95` |
| 403 | node1 | `gdrive_corpus_extractions/66bf4294c0_openalex_W4205183153.pdf.md` | 58159 | 8310 | 5/5 | True | `4db06d3da6e6db2e` |
| 404 | node1 | `gdrive_corpus_extractions/67483e30f0_2022_-_Stolen_Bases_are_Disappearing_as_Baseball_Become_More_Analytical_-_Yellin.md` | 41951 | 6223 | 5/5 | True | `6f248b839f12bf4a` |
| 405 | node1 | `gdrive_corpus_extractions/67d4273176_2204.13992.pdf.md` | 59312 | 8008 | 5/5 | True | `aac40712736228c2` |
| 406 | node1 | `gdrive_corpus_extractions/68290c488a_2019_-_The_Paths_We_Take_A_Player_Tracking_Analysis_of_NHL_Shootouts_-_Unknown_A.md` | 60560 | 8487 | 5/5 | True | `b551ebeed9e4e47b` |
| 407 | node1 | `gdrive_corpus_extractions/682e08879d_arxiv_2010.16031v1.pdf.md` | 47499 | 6692 | 5/5 | True | `417495f629d620bb` |
| 408 | node1 | `gdrive_corpus_extractions/692f887ea3_arxiv_2508.19477v1.pdf.md` | 55482 | 7826 | 5/5 | True | `a76fc5b133f29b8e` |
| 409 | node1 | `gdrive_corpus_extractions/697e558111_2024_-_Expected_Value_Curves_Don_t_Tell_the_Full_Story_Exploring_NFL_Draft_Posit.md` | 22983 | 3254 | 5/5 | True | `6c1624098e2e7646` |
| 410 | node1 | `gdrive_corpus_extractions/6ad44061f8_arxiv_2108.10312v1.pdf.md` | 40937 | 6384 | 5/5 | True | `669c297ca0c89256` |
| 411 | node1 | `gdrive_corpus_extractions/6b1f23881c_openalex_W7128948123.pdf.md` | 28656 | 3996 | 5/5 | True | `c9606a48280f1715` |
| 412 | node1 | `gdrive_corpus_extractions/6b5fe5e048_W2133991822.pdf.md` | 37209 | 5335 | 5/5 | True | `b26cca23cb5bad41` |
| 413 | node1 | `gdrive_corpus_extractions/6ba96bd042_2025_-_A_mixed-effects_spatial_point_process_framework_for_modeling_player_shoot.md` | 51810 | 7528 | 5/5 | True | `a8d1955d86a3b8f4` |
| 414 | node1 | `gdrive_corpus_extractions/6c5ddc22c3_Attacking_game_patterns_in_Soccer_A_sequ.md.md` | 41738 | 5837 | 5/5 | True | `aa73e5322c92a955` |
| 415 | node1 | `gdrive_corpus_extractions/6ce024cd8e_openalex_W1964648142.pdf.md` | 45445 | 6399 | 5/5 | True | `500f0fb18814b9e0` |
| 416 | node1 | `gdrive_corpus_extractions/6d00309a9c_GrahamEtAl-2014-SportsRelatedConcussionsInYouth.pdf.md` | 69259 | 9858 | 5/5 | True | `051a0d72edc29aab` |
| 417 | node1 | `gdrive_corpus_extractions/6d5e82952b_Dordal-2023-AnIntroductionToComputerNetworks-2e.pdf.md` | 52063 | 7739 | 5/5 | True | `980116c15ec4ec6a` |
| 418 | node1 | `gdrive_corpus_extractions/6d6eb7c687_2603.25901v1_1_.pdf.md` | 38340 | 5568 | 5/5 | True | `cbde63d4fabcc636` |
| 419 | node1 | `gdrive_corpus_extractions/6da34d3d5d_2606.30449v1_1_.pdf.md` | 34906 | 4926 | 5/5 | True | `f4eb9a84046bc12a` |
| 420 | node1 | `gdrive_corpus_extractions/6dd25a6bd9_openalex_W4395082026.pdf.md` | 43059 | 5945 | 5/5 | True | `c96145ee1d17e226` |
| 421 | node1 | `gdrive_corpus_extractions/6df8151157_NFL_Football_-_Playbook.pdf.md` | 56299 | 8997 | 5/5 | True | `4c5e9f40b27b11d6` |
| 422 | node1 | `gdrive_corpus_extractions/6e33bd4620_undated_-_Risk_of_Collusion_Will_Groups_of_3_Ruin_the_FIFA_World_Cup_-_Guyon.pdf.md` | 44850 | 6802 | 5/5 | True | `54f49a00ee666ea0` |
| 423 | node1 | `gdrive_corpus_extractions/6e748ab4ae_Sherrington-1906-IntegrativeActionOfTheNervousSystem.pdf.md` | 67887 | 9554 | 5/5 | True | `a57a5e3637b369c7` |
| 424 | node1 | `gdrive_corpus_extractions/6fdac2246b_Bubeck-2015-ConvexOptimizationAlgorithmsAndComplexity.pdf.md` | 38943 | 5431 | 5/5 | True | `e4039ece70441132` |
| 425 | node1 | `gdrive_corpus_extractions/70801a8ba1_KL_API_Endpoints_2_4_.pdf.md` | 49722 | 7103 | 5/5 | True | `ab9a260df312971d` |
| 426 | node1 | `gdrive_corpus_extractions/70ae07e125_2605.31529v2.pdf.md` | 43283 | 6200 | 5/5 | True | `c71714b34ec599c3` |
| 427 | node1 | `gdrive_corpus_extractions/70c62cd157_openalex_W4405285377.pdf.md` | 45301 | 6307 | 5/5 | True | `ae56e4ec8cf7e8b5` |
| 428 | node1 | `gdrive_corpus_extractions/70e143a3fa_openalex_W7215301048.pdf.md` | 53548 | 7704 | 5/5 | True | `99085d92da7c818b` |
| 429 | node1 | `gdrive_corpus_extractions/711881a8b5_openalex_W2604655842.pdf.md` | 68989 | 9529 | 5/5 | True | `5f2521b66853531a` |
| 430 | node1 | `gdrive_corpus_extractions/715d3ec535_359576.359585.pdf.md` | 44848 | 6457 | 5/5 | True | `53efbcd34e885c2a` |
| 431 | node1 | `gdrive_corpus_extractions/71fc2fc283_2022_-_Go_For_It_A_Data_Driven_Analysis_of_NFL_4th_Downs_-_Lerman_et_al.pdf.md` | 57449 | 8672 | 5/5 | True | `8ef6ce957d7bc8a2` |
| 432 | node1 | `gdrive_corpus_extractions/7277a23bed_Tesi-vittorio-donofrio.pdf.md` | 28603 | 3786 | 5/5 | True | `befa1e58a748fe21` |
| 433 | node1 | `gdrive_corpus_extractions/7287d95388_Temporal_Aspects_of_Team_Cognition_A_Cas.pdf.md` | 60561 | 8292 | 5/5 | True | `e0040d67c6866065` |
| 434 | node1 | `gdrive_corpus_extractions/72b8fc9558_arxiv_2101.02702v3.pdf.md` | 55366 | 7590 | 5/5 | True | `df4b2ba14b8e61e2` |
| 435 | node1 | `gdrive_corpus_extractions/73267bdeac_2512.05277v4.pdf.md` | 40180 | 5964 | 5/5 | True | `03bd793afa39480d` |
| 436 | node1 | `gdrive_corpus_extractions/7326f2b8e9_2021_Home_sweet_home_-_Quantifying_home_court_advantages_for_NCAA_basketball_sta.md` | 53688 | 7557 | 5/5 | True | `eb37ee4d2ad93e1f` |
| 437 | node1 | `gdrive_corpus_extractions/73cd81c64a_arxiv_1802.00634v1.pdf.md` | 47090 | 7025 | 5/5 | True | `f5321cce8063940c` |
| 438 | node1 | `gdrive_corpus_extractions/7421e5147f_arxiv_2603.17866v3.pdf.md` | 65655 | 9317 | 5/5 | True | `c7b164c40c1b8448` |
| 439 | node1 | `gdrive_corpus_extractions/745fbe1337_Camp-1910-The-Book-of-Foot-Ball.pdf.md` | 46271 | 7372 | 5/5 | True | `e3d115aef614e682` |
| 440 | node1 | `gdrive_corpus_extractions/746468ad43_openalex_W4414088906.pdf.md` | 36164 | 4842 | 5/5 | True | `75fabba5587165cc` |
| 441 | node1 | `gdrive_corpus_extractions/749574a881_2017_Steph_Curry_Shot_Attribute_Analysis.pdf.md` | 57371 | 8038 | 5/5 | True | `656b6507dc86fc01` |
| 442 | node1 | `gdrive_corpus_extractions/7520b4e8cf_2609.12386v1.pdf.md` | 64396 | 8943 | 5/5 | True | `03c46018f7ec91a4` |
| 443 | node1 | `gdrive_corpus_extractions/7579316e08_CRICTRS_-_Embedding_Based_Statistical_and_Semi-Supervised_Cricket_Team_Recommend.md` | 49231 | 6949 | 5/5 | True | `865684030ec911e8` |
| 444 | node1 | `gdrive_corpus_extractions/75f5cd2ca1_WilliamsonShmoys-2011-DesignOfApproximationAlgorithms.pdf.md` | 57667 | 8086 | 5/5 | True | `d336afc47b38ddd5` |
| 445 | node1 | `gdrive_corpus_extractions/76346fd902_openalex_W4417423020.pdf.md` | 36526 | 5369 | 5/5 | True | `8f95a499a507ea1b` |
| 446 | node1 | `gdrive_corpus_extractions/767f96d770_Kreps-2014-IHeartLogs.pdf.md` | 45221 | 6907 | 5/5 | True | `1673224d0e93b54d` |
| 447 | node1 | `gdrive_corpus_extractions/76b01a0d67_ReedZemekEtAl-2021-LivingGuideline-PediatricConcussion.pdf.md` | 61503 | 8586 | 5/5 | True | `54e73193391c963b` |
| 448 | node1 | `gdrive_corpus_extractions/76c8c61f40_2013_-_Total_Hockey_Rating_THoR_A_comprehensive_statistical_rating_of_National_H.md` | 54377 | 8016 | 5/5 | True | `de5bfc43e8991a4f` |
| 449 | node1 | `gdrive_corpus_extractions/776a72089b_openalex_W4386076389.pdf.md` | 48497 | 6808 | 5/5 | True | `242277f78e970cb1` |
| 450 | node1 | `gdrive_corpus_extractions/777ca79c8a_BadenesEd-2022-TBI-ClinicalCharacteristicsAndOutcomes-MDPI.pdf.md` | 46284 | 6531 | 5/5 | True | `c06821b84dcf9923` |
| 451 | node1 | `gdrive_corpus_extractions/77ab173bf2_Performance_analysis_of_game_dynamics_du.pdf.md` | 55047 | 8175 | 5/5 | True | `a4fd4a03e09afab8` |
| 452 | node1 | `gdrive_corpus_extractions/788e2e9474_arxiv_2101.05388v1.pdf.md` | 55790 | 8136 | 5/5 | True | `81b81df7ef10a725` |
| 453 | node1 | `gdrive_corpus_extractions/78c1b10eea_openalex_W7147629186.pdf.md` | 61029 | 8992 | 5/5 | True | `45c58cccb8427d5a` |
| 454 | node1 | `gdrive_corpus_extractions/793dd69c27_openalex_W4385571571.pdf.md` | 38928 | 5824 | 5/5 | True | `7a918d65c11c517a` |
| 455 | node1 | `gdrive_corpus_extractions/79c5f444b6_openalex_W4413766906.pdf.md` | 52222 | 7136 | 5/5 | True | `e5d9923242fd7e24` |
| 456 | node1 | `gdrive_corpus_extractions/79f172e9d8_2017_-_Automatic_event_detection_in_basketball_games_-_Unknown_Authors.pdf.md` | 29057 | 4091 | 5/5 | True | `31af64aaafab7f8e` |
| 457 | node1 | `gdrive_corpus_extractions/79f317bbf8_2204.00003v3.pdf.md` | 57849 | 8735 | 5/5 | True | `02abb8adfeac9ea5` |
| 458 | node1 | `gdrive_corpus_extractions/7a5faf45a6_arxiv_2301.12813v3.pdf.md` | 29244 | 4138 | 5/5 | True | `33689fb5e1870d7a` |
| 459 | node1 | `gdrive_corpus_extractions/7a7036cd41_openalex_W4405244335.pdf.md` | 23124 | 3280 | 5/5 | True | `50cc60adda6fb832` |
| 460 | node1 | `gdrive_corpus_extractions/7a7d73e59e_2607.12447v2.pdf.md` | 45315 | 6321 | 5/5 | True | `c52cb7a89cdb227e` |
| 461 | node1 | `gdrive_corpus_extractions/7b1b564d2d_openalex_W4412850001.pdf.md` | 57618 | 8183 | 5/5 | True | `93a33c808debf191` |
| 462 | node1 | `gdrive_corpus_extractions/7b6acaaa9b_Knowledge_flow_from_the_top_the_importan.pdf.md` | 29852 | 3796 | 5/5 | True | `1ad4aae593e7f668` |
| 463 | node1 | `gdrive_corpus_extractions/7bab723acb_openalex_W2994681748.pdf.md` | 48420 | 6957 | 5/5 | True | `50cc90656ea7e803` |
| 464 | node1 | `gdrive_corpus_extractions/7bc49e8bd6_2208.06972.pdf.md` | 50724 | 7347 | 5/5 | True | `06c6173da5fdd48f` |
| 465 | node1 | `gdrive_corpus_extractions/7c7fe8717e_openalex_W3007920314.pdf.md` | 36532 | 5220 | 5/5 | True | `0406361d47757de4` |
| 466 | node1 | `gdrive_corpus_extractions/7c9678bff4_openalex_W7216743542.pdf.md` | 49913 | 6528 | 5/5 | True | `30c8edb21d0898ef` |
| 467 | node1 | `gdrive_corpus_extractions/7cbb954031_arxiv_2604.01383v1.pdf.md` | 57352 | 8073 | 5/5 | True | `143b46eaecae5cc2` |
| 468 | node1 | `gdrive_corpus_extractions/7cc7ce60c4_openalex_W2588294172.pdf.md` | 56676 | 7387 | 5/5 | True | `f0b7ccc3f7f65f8b` |
| 469 | node1 | `gdrive_corpus_extractions/7cc93aaeee_openalex_W7213256388.pdf.md` | 30239 | 4469 | 5/5 | True | `3d9a14a321223ce9` |
| 470 | node1 | `gdrive_corpus_extractions/7d80c29f54_openalex_W4409251523.pdf.md` | 66280 | 9390 | 5/5 | True | `a3cb667644143099` |
| 471 | node1 | `gdrive_corpus_extractions/7df55c48d1_2403.04031v1.pdf.md` | 28877 | 4182 | 5/5 | True | `1725446a23f158c6` |
| 472 | node1 | `gdrive_corpus_extractions/7e0ac7af8b_arxiv_2504.20052v1.pdf.md` | 44449 | 6548 | 5/5 | True | `4cd19f6ea0393d76` |
| 473 | node1 | `gdrive_corpus_extractions/7f324b9bf0_openalex_W2118152326.pdf.md` | 37664 | 5051 | 5/5 | True | `dfeb3ab798845e9e` |
| 474 | node1 | `gdrive_corpus_extractions/7fbc34a016_openalex_W3017094594.pdf.md` | 56973 | 8536 | 5/5 | True | `894200c5c5a4da96` |
| 475 | node1 | `gdrive_corpus_extractions/7fe4f1086f_arxiv_2105.01226v1.pdf.md` | 65963 | 9350 | 5/5 | True | `233fe49d91b15162` |
| 476 | node1 | `gdrive_corpus_extractions/8014c52bc4_2024_-_Noisy_Judgments_A_probability_surface-based_analysis_of_umpiring_variabil.md` | 52230 | 7340 | 5/5 | True | `be02910222844979` |
| 477 | node1 | `gdrive_corpus_extractions/8022bf8d64_openalex_W4210297623.pdf.md` | 68054 | 9732 | 5/5 | True | `5a39950e9c85634e` |
| 478 | node1 | `gdrive_corpus_extractions/808f3e6792_arxiv_1805.08324v1.pdf.md` | 41916 | 5721 | 5/5 | True | `953447620c18e247` |
| 479 | node1 | `gdrive_corpus_extractions/80af7ed660_Clemente-Ed-2022-Training-Load-WellBeing-Readiness-MDPI.pdf.md` | 55905 | 8309 | 5/5 | True | `be17f8e5237aa858` |
| 480 | node1 | `gdrive_corpus_extractions/80b98a0287_arxiv_2209.02540v3.pdf.md` | 52114 | 7725 | 5/5 | True | `7dba375377de7482` |
| 481 | node1 | `gdrive_corpus_extractions/80de789bc5_arxiv_2001.05673v1.pdf.md` | 52977 | 7453 | 5/5 | True | `55851570481fba51` |
| 482 | node1 | `gdrive_corpus_extractions/811de082f6_openalex_W2027713938.pdf.md` | 59949 | 8558 | 5/5 | True | `cbb61c79fcf602a2` |
| 483 | node1 | `gdrive_corpus_extractions/81566e53d8_arxiv_2608.15688v1.pdf.md` | 65785 | 9434 | 5/5 | True | `235857301978888e` |
| 484 | node1 | `gdrive_corpus_extractions/818c6b013d_openalex_W4281285840.pdf.md` | 65318 | 9122 | 5/5 | True | `7261ceff23aa8ff7` |
| 485 | node1 | `gdrive_corpus_extractions/826c6115a0_2017_-_What_does_it_mean_to_draft_perfectly_-_Unknown_Authors.pdf.md` | 41635 | 5887 | 5/5 | True | `7096f425c91102e5` |
| 486 | node1 | `gdrive_corpus_extractions/827c932f8b_openalex_W7127975157.pdf.md` | 43704 | 5991 | 5/5 | True | `0739e806b3752fdb` |
| 487 | node1 | `gdrive_corpus_extractions/82d7c37e12_2604.27865v1.pdf.md` | 66850 | 9733 | 5/5 | True | `50d59e7f4df77ff3` |
| 488 | node1 | `gdrive_corpus_extractions/836c785cd0_2021_-_Dissecting_the_Tennis_Rally_Valuing_Decision_Making_and_Shot_Execution_in.md` | 56439 | 8181 | 5/5 | True | `f2dea128eba599da` |
| 489 | node1 | `gdrive_corpus_extractions/837c894fee_arxiv_2007.06344v1.pdf.md` | 47226 | 6800 | 5/5 | True | `9ddc5da8da74fbb5` |
| 490 | node1 | `gdrive_corpus_extractions/839c988653_2023_-_An_Events_and_360_Data-Driven_Approach_for_Extracting_Team_Tactics_and_Ev.md` | 55163 | 8018 | 5/5 | True | `ea4f5c006724a209` |
| 491 | node1 | `gdrive_corpus_extractions/83ceae37d7_2023-2017.pdf.md` | 30501 | 4330 | 5/5 | True | `7a762d9b0eea813f` |
| 492 | node1 | `gdrive_corpus_extractions/83e51fc7df_Axler-2023-LinearAlgebraDoneRight4.pdf.md` | 50896 | 7221 | 5/5 | True | `9260512dc2fd9bce` |
| 493 | node1 | `gdrive_corpus_extractions/84434fc269_openalex_W7117373768.pdf.md` | 56395 | 7734 | 5/5 | True | `fe71eefe3cf60838` |
| 494 | node1 | `gdrive_corpus_extractions/84991607b6_1701.05976.pdf.md` | 53125 | 7378 | 5/5 | True | `9be4b0790433439a` |
| 495 | node1 | `gdrive_corpus_extractions/84e046e9d6_arxiv_2405.07407v1.pdf.md` | 32130 | 4706 | 5/5 | True | `0408946edf276582` |
| 496 | node1 | `gdrive_corpus_extractions/8502e94b55_openalex_W4317566632.pdf.md` | 56517 | 8202 | 5/5 | True | `e44e9b18f80c0a73` |
| 497 | node1 | `gdrive_corpus_extractions/8685fcb60a_Robert_Kissell_2017.pdf.md` | 54939 | 8010 | 5/5 | True | `edc73ba67dd76c96` |
| 498 | node1 | `gdrive_corpus_extractions/86a037479b_openalex_W3143531337.pdf.md` | 32886 | 4740 | 5/5 | True | `120947244ea8f129` |
| 499 | node1 | `gdrive_corpus_extractions/86a2dd60eb_2303.10895v1.pdf.md` | 55356 | 7366 | 5/5 | True | `1d52efa6393fb239` |
| 500 | node1 | `gdrive_corpus_extractions/86aa924734_2026_-_Possession-Level_Player_Impact_in_the_Pre-Play-by-Play_NBA_Era_A_Video-Re.md` | 38825 | 5443 | 5/5 | True | `26be6a1c78ef1016` |
| 501 | node1 | `gdrive_corpus_extractions/86bdc81b87_Stagg-Williams-1893-Scientific-and-Practical-Treatise-on-American-Football.pdf.md` | 64281 | 9820 | 5/5 | True | `6c51f474d63b77c6` |
| 502 | node1 | `gdrive_corpus_extractions/873a8b22d2_2017_Body_Shots_-_Analyzing_Shooting_Styles_in_the_NBA_using_Body-Pose_Attribute.md` | 45141 | 6266 | 5/5 | True | `6d392e9ba68dc481` |
| 503 | node1 | `gdrive_corpus_extractions/8755bd3d65_2025_-_An_Extensive_Investigation_of_Strategies_in_Baseball_-_William_et_al.pdf.md` | 55161 | 7815 | 5/5 | True | `abc62e1565d24884` |
| 504 | node1 | `gdrive_corpus_extractions/87b537f449_2024_-_The_Strain_of_Success_A_Predictive_Model_for_Injury_Risk_Mitigation_and_T.md` | 40162 | 5667 | 5/5 | True | `06bb83b928c1befa` |
| 505 | node1 | `gdrive_corpus_extractions/8810931f0a_openalex_W7212005278.pdf.md` | 26888 | 3897 | 5/5 | True | `aa44ec18ae4c700c` |
| 506 | node1 | `gdrive_corpus_extractions/887229b8ad_arxiv_2609.25039v1.pdf.md` | 29099 | 4378 | 5/5 | True | `777f2549da00e6a9` |
| 507 | node1 | `gdrive_corpus_extractions/88741a1a6e_arxiv_2603.17336v1.pdf.md` | 52418 | 7378 | 5/5 | True | `b852822cb192cb7b` |
| 508 | node1 | `gdrive_corpus_extractions/88d93d6614_arxiv_2609.24403v1.pdf.md` | 35492 | 5246 | 5/5 | True | `e9fe61a3fb5b30db` |
| 509 | node1 | `gdrive_corpus_extractions/8959bfbdc6_2604.11786v1_1_.pdf.md` | 42218 | 6059 | 5/5 | True | `5903d73ac905d8a8` |
| 510 | node1 | `gdrive_corpus_extractions/89686819b8_Bernard-1865-IntroductionExperimentalMedicine.pdf.md` | 41671 | 5804 | 5/5 | True | `a18e125cf03314bb` |
| 511 | node1 | `gdrive_corpus_extractions/8a0c6796f6_arxiv_2505.03811v1.pdf.md` | 58817 | 8564 | 5/5 | True | `e6d07fecd3762d91` |
| 512 | node1 | `gdrive_corpus_extractions/8a31a20b7e_2023_-_Effect_of_Increased_Three-point_Shot_Attempts_on_Probability_of_Winning_i.md` | 45360 | 6717 | 5/5 | True | `dcb9c3649aed8150` |
| 513 | node1 | `gdrive_corpus_extractions/8a58da91e7_2025_-_Capturing_Player_Impact_From_Team_Action_Sequences_Minho_Lee_2025_12_03_1.md` | 30176 | 4163 | 5/5 | True | `0cc1b9c179f9e90b` |
| 514 | node1 | `gdrive_corpus_extractions/8aad79a99c_2016_-_Using_Digital_Signals_To_Measure_Audience_Brand_Engagement_At_Major_Sport.md` | 64543 | 9285 | 5/5 | True | `87f8c646b723e12a` |
| 515 | node1 | `gdrive_corpus_extractions/8acd2708eb_2603.09896v1_2_.pdf.md` | 37164 | 5383 | 5/5 | True | `0a7cb070676e6f49` |
| 516 | node1 | `gdrive_corpus_extractions/8b2f7ce0f4_Barroso-Holzle-Ranganathan-2018-TheDatacenterAsAComputer-3e.pdf.md` | 30595 | 4448 | 5/5 | True | `8d42a0ea09875709` |
| 517 | node1 | `gdrive_corpus_extractions/8b3969c934_2022_-_Analyzing_the_Value_of_Starting_Pitchers_vs_Relief_Pitchers_in_MLB_-_Jha_.md` | 50772 | 7458 | 5/5 | True | `2a098bb2a2a449a5` |
| 518 | node1 | `gdrive_corpus_extractions/8b39d667a3_2021_-_Quantifying_Hitter_Plate_Discipline_in_Major_League_Baseball_-_Unknown_Au.md` | 25914 | 3392 | 5/5 | True | `a598a8442720c3fa` |
| 519 | node1 | `gdrive_corpus_extractions/8b91d151b1_openalex_W2773987212.pdf.md` | 59321 | 8794 | 5/5 | True | `3122119201ed1574` |
| 520 | node1 | `gdrive_corpus_extractions/8b98159f37__OceanofPDF.com_Introduction_to_Recursive_Programming_-_Manuel_Rubio-Sanchez.pdf.md` | 52632 | 7967 | 5/5 | True | `fef5d757e1797754` |
| 521 | node1 | `gdrive_corpus_extractions/8ba7ca90fb_arxiv_2011.10336v1.pdf.md` | 29965 | 4276 | 5/5 | True | `a73497e6bd85bb6a` |
| 522 | node1 | `gdrive_corpus_extractions/8c429ba8e7_2023_-_Why_Did_They_Succeed_A_World_Cup_2022_Analysis_-_Lim_et_al.pdf.md` | 27689 | 3873 | 5/5 | True | `8564b84b6956ec99` |
| 523 | node1 | `gdrive_corpus_extractions/8c7ba921f2_Research_Methods_and_Performance_Analysi.md.md` | 40335 | 5919 | 5/5 | True | `cdf4144fce0cfdbd` |
| 524 | node1 | `gdrive_corpus_extractions/8cbe688d61_arxiv_2409.14351v1.pdf.md` | 57688 | 8322 | 5/5 | True | `3176bdbd48694ac3` |
| 525 | node1 | `gdrive_corpus_extractions/8cd094a90d_2602.02979v3.pdf.md` | 36882 | 5140 | 5/5 | True | `424b3a8ff96d61f9` |
| 526 | node1 | `gdrive_corpus_extractions/8ce64541cd_arxiv_1812.08448v1.pdf.md` | 53559 | 7492 | 5/5 | True | `ed5a9613949ec1a2` |
| 527 | node1 | `gdrive_corpus_extractions/8d028900e4_openalex_W7170145256.pdf.md` | 51960 | 6825 | 5/5 | True | `e4860e52e312ea3a` |
| 528 | node1 | `gdrive_corpus_extractions/8d34ac856f_2023_-_Quantifying_Defensive_Spin_Moves_in_American_Football_A_Player_Tracking_A.md` | 70857 | 10241 | 5/5 | True | `4df3024fc9a2327f` |
| 529 | node1 | `gdrive_corpus_extractions/8d4a342a44_openalex_W2886017866.pdf.md` | 40904 | 5781 | 5/5 | True | `151673abb8cef24f` |
| 530 | node1 | `gdrive_corpus_extractions/8db5dd367d_openalex_W3206802906.pdf.md` | 56631 | 7768 | 5/5 | True | `22c0824ee9729dff` |
| 531 | node1 | `gdrive_corpus_extractions/8de3b15936_2020_-_Bettor_Up_Assess_Analyze_and_Achieve_-_Unknown_Authors.pdf.md` | 59492 | 8514 | 5/5 | True | `a67906cb33e9c27b` |
| 532 | node1 | `gdrive_corpus_extractions/8e3ea23aef_2025_-_Testing_the_Bottleneck_Hypothesis_in_Professional_Tennis_Rankings_-_Riche.md` | 59673 | 8680 | 5/5 | True | `eb21c3bf92761cb4` |
| 533 | node1 | `gdrive_corpus_extractions/8e962744ff_2025_-_Identifying_playing_styles_in_football_using_topic_modeling_-_Misuric-Ram.md` | 53875 | 7822 | 5/5 | True | `498b8d16f4fabbfe` |
| 534 | node1 | `gdrive_corpus_extractions/8ea9e721ab_2024_-_Boulder2Vec_Modeling_Climber_Performances_in_Professional_Bouldering_Comp.md` | 43493 | 6484 | 5/5 | True | `3cd2f4a7da9519b5` |
| 535 | node1 | `gdrive_corpus_extractions/8ef92415c1_arxiv_2409.19363v2.pdf.md` | 54987 | 7575 | 5/5 | True | `398e623fa59cc46e` |
| 536 | node1 | `gdrive_corpus_extractions/8f5456e69b_2609.16468v1.pdf.md` | 54248 | 7353 | 5/5 | True | `c1e6fe59fa6c8c1e` |
| 537 | node1 | `gdrive_corpus_extractions/907c847f57_openalex_W2901271536.pdf.md` | 56962 | 8423 | 5/5 | True | `5f069394ee992d15` |
| 538 | node1 | `gdrive_corpus_extractions/909d826d2b_Diebold-2024-Forecasting.pdf.md` | 36937 | 5093 | 5/5 | True | `f85357883a0d792f` |
| 539 | node1 | `gdrive_corpus_extractions/915dd984db_arxiv_2104.10916v1.pdf.md` | 60498 | 8838 | 5/5 | True | `df34ad2a3fc030e0` |
| 540 | node1 | `gdrive_corpus_extractions/915f6d7e44_arxiv_2607.17151v1.pdf.md` | 35531 | 5179 | 5/5 | True | `ac0036585286dc99` |
| 541 | node1 | `gdrive_corpus_extractions/91d5b8b7da_arxiv_2310.17875v3.pdf.md` | 54725 | 7846 | 5/5 | True | `e888456cc247e45d` |
| 542 | node1 | `gdrive_corpus_extractions/92102fcc19_2602.08996v1.pdf.md` | 42882 | 6114 | 5/5 | True | `907d4639aefdac9e` |
| 543 | node1 | `gdrive_corpus_extractions/9230b37987_openalex_W2955189650.pdf.md` | 61658 | 9309 | 5/5 | True | `2d5271181429d81d` |
| 544 | node1 | `gdrive_corpus_extractions/92dd95f597_arxiv_2203.02281v2.pdf.md` | 63963 | 9253 | 5/5 | True | `c6fd5fa8b21964cc` |
| 545 | node1 | `gdrive_corpus_extractions/9343c620a4_arxiv_2006.07562v1.pdf.md` | 33153 | 4904 | 5/5 | True | `20ea37cce1bad414` |
| 546 | node1 | `gdrive_corpus_extractions/939eaa96df_arxiv_2405.06600v1.pdf.md` | 38125 | 5591 | 5/5 | True | `14c612f7c4174a2f` |
| 547 | node1 | `gdrive_corpus_extractions/942ea5c596_2022_-_Is_Everton_s_One-Season_Drop_Off_Due_to_Random_or_Structural_Factors_-_Ba.md` | 45263 | 6357 | 5/5 | True | `d0c155a83149d40a` |
| 548 | node1 | `gdrive_corpus_extractions/94f720c96e_arxiv_2512.19528v1.pdf.md` | 65566 | 9671 | 5/5 | True | `0064c8a02d08e55c` |
| 549 | node1 | `gdrive_corpus_extractions/951b4eff2c_2019_-_playerElo_-_Unknown_Authors.pdf.md` | 52768 | 7661 | 5/5 | True | `03524ea6409b07d5` |
| 550 | node1 | `gdrive_corpus_extractions/952cbb62db_Beyond-the-Expert_-An-Algorithmic-Approach-to-Correcting-Expert-Bias-in-Fantasy-.md` | 54894 | 8177 | 5/5 | True | `39be55a955b21ee4` |
| 551 | node1 | `gdrive_corpus_extractions/952ee558bd_2025_-_CoachAI_Badminton_Environment_Realistic_Badminton_Game_Simulator_for_Enha.md` | 69418 | 9776 | 5/5 | True | `2fb0c088b6531a94` |
| 552 | node1 | `gdrive_corpus_extractions/95432f5dd8_arxiv_2602.13772v1.pdf.md` | 56828 | 7546 | 5/5 | True | `3a0d5ae1fb28a179` |
| 553 | node1 | `gdrive_corpus_extractions/963a4147a1_MortersPeres-2010-BrownianMotion.pdf.md` | 38600 | 5376 | 5/5 | True | `b4ae61fec6ebbe42` |
| 554 | node1 | `gdrive_corpus_extractions/9688b9791a_openalex_W1966035333.pdf.md` | 29288 | 4446 | 5/5 | True | `3841dc6fd0e2f482` |
| 555 | node1 | `gdrive_corpus_extractions/96afc2de84_arxiv_2603.16136v1.pdf.md` | 69475 | 9584 | 5/5 | True | `dbf659135e732589` |
| 556 | node1 | `gdrive_corpus_extractions/96d334c26b_openalex_W4386375167.pdf.md` | 59114 | 9183 | 5/5 | True | `d80aab981ba314fd` |
| 557 | node1 | `gdrive_corpus_extractions/974530f0c6_Concussion_PDF.pdf.md` | 27378 | 4125 | 5/5 | True | `e632911fb4a46bca` |
| 558 | node1 | `gdrive_corpus_extractions/97beabe24f_arxiv_2211.02125v1.pdf.md` | 49208 | 7133 | 5/5 | True | `0ce57467fa45b3b9` |
| 559 | node1 | `gdrive_corpus_extractions/97fabee5e1_arxiv_2410.11582v1.pdf.md` | 47308 | 6846 | 5/5 | True | `b6e0f52b462d929b` |
| 560 | node1 | `gdrive_corpus_extractions/9877e48e99_openalex_W4390451802.pdf.md` | 63705 | 8821 | 5/5 | True | `2166ab6b01062f77` |
| 561 | node1 | `gdrive_corpus_extractions/98ad2f948e_2017_Shrinkage_estimation_of_NFL_field_goal_success_probabilities_-_Jason_A._Osb.md` | 28779 | 4223 | 5/5 | True | `cd1aef863e3bf894` |
| 562 | node1 | `gdrive_corpus_extractions/98d5e2e8a7_2605.14855v1.pdf.md` | 34324 | 4965 | 5/5 | True | `c48378fc9514edbb` |
| 563 | node1 | `gdrive_corpus_extractions/98d81d377f_2023_-_Estimating_individual_contributions_to_team_success_in_women_s_college_vo.md` | 29776 | 4243 | 5/5 | True | `94cad34720757052` |
| 564 | node1 | `gdrive_corpus_extractions/98e8a07e50_MondelloHayesEds-2015-BiomarkersForBrainInjury-Frontiers.pdf.md` | 68724 | 9385 | 5/5 | True | `3ba7fe352da2aed5` |
| 565 | node1 | `gdrive_corpus_extractions/9907d024ec_SEAM_methodology_for_context-rich_player_matchup_evaluations.pdf.md` | 30194 | 4206 | 5/5 | True | `2d55f965eec6fc50` |
| 566 | node1 | `gdrive_corpus_extractions/99bba94045_openalex_W7156131943.pdf.md` | 39269 | 5634 | 5/5 | True | `44e8ac0222cfb3a0` |
| 567 | node1 | `gdrive_corpus_extractions/9a09a16684_arxiv_2508.01015v1.pdf.md` | 68071 | 9864 | 5/5 | True | `6a888f05ec7718ba` |
| 568 | node1 | `gdrive_corpus_extractions/9ac113c499_2024_-_To_Go_for_Two_or_Not_to_Go_for_Two_A_Statistical_Analysis_of_the_Biggest_.md` | 45164 | 6476 | 5/5 | True | `bbb99f7709392711` |
| 569 | node1 | `gdrive_corpus_extractions/9b18f1927e_2016_Find_the_Open_Receiver_QB_Decision_Making.pdf.md` | 27905 | 4140 | 5/5 | True | `acf12f0f760e3f9a` |
| 570 | node1 | `gdrive_corpus_extractions/9b1b0055dd_James-1890-PrinciplesOfPsychology-Vol2.pdf.md` | 70652 | 10483 | 5/5 | True | `1d6463697c8fa5df` |
| 571 | node1 | `gdrive_corpus_extractions/9b2b3dc9fd_arxiv_2409.04889v1.pdf.md` | 60776 | 8617 | 5/5 | True | `05ad03a6a2057e93` |
| 572 | node1 | `gdrive_corpus_extractions/9b4617c464_XiaoZhu-2025-FoundationsOfLargeLanguageModels.pdf.md` | 32347 | 4759 | 5/5 | True | `dd1199ce6ea4cfbe` |
| 573 | node1 | `gdrive_corpus_extractions/9b4f15793a_2405.02412.pdf.md` | 63923 | 9132 | 5/5 | True | `5345ffd4c05f1219` |
| 574 | node1 | `gdrive_corpus_extractions/9b51655a79__OceanofPDF.com_Hierarchical_modeling_and_analysis_for_spatial_data_-_Banerjee.p.md` | 41992 | 5723 | 5/5 | True | `994709ea1d470d29` |
| 575 | node1 | `gdrive_corpus_extractions/9b5ee083c5_Camp-Deland-1896-Football.pdf.md` | 52117 | 8163 | 5/5 | True | `553d9e17dcd36395` |
| 576 | node1 | `gdrive_corpus_extractions/9bbfe908a4_2406.19563v2_1_.pdf.md` | 69938 | 9773 | 5/5 | True | `10f09b7d6c323314` |
| 577 | node1 | `gdrive_corpus_extractions/9bf3bc72bb_arxiv_1811.12799v1.pdf.md` | 56547 | 8997 | 5/5 | True | `8a88a2ba7e1951a7` |
| 578 | node1 | `gdrive_corpus_extractions/9c337617a7_2023_-_Optimal_Strategy_for_Defensive_Pressure_in_American_Football_Insights_fro.md` | 30930 | 4248 | 5/5 | True | `649506d010e127b8` |
| 579 | node1 | `gdrive_corpus_extractions/9cbbf5d86a_GelmanEtAl-2013-BayesianDataAnalysis3.pdf.md` | 48949 | 6633 | 5/5 | True | `bb03ca949d57148e` |
| 580 | node1 | `gdrive_corpus_extractions/9cfc8d04c2_arxiv_1805.05009v1.pdf.md` | 57986 | 8523 | 5/5 | True | `f2b045439ec55ccc` |
| 581 | node1 | `gdrive_corpus_extractions/9d9d859e88_openalex_W3202062685.pdf.md` | 43095 | 6094 | 5/5 | True | `73a0a09d59c4a759` |
| 582 | node1 | `gdrive_corpus_extractions/9da2688d03_openalex_W4414972247.pdf.md` | 42463 | 6213 | 5/5 | True | `cd83fa642372ca8b` |
| 583 | node1 | `gdrive_corpus_extractions/9da8a6df33_arxiv_1511.04351v2.pdf.md` | 45053 | 6803 | 5/5 | True | `e2e4b251697489f0` |
| 584 | node1 | `gdrive_corpus_extractions/9df2215c4a_openalex_W4402809225.pdf.md` | 72232 | 10242 | 5/5 | True | `a84597f15556579a` |
| 585 | node1 | `gdrive_corpus_extractions/9e0b60bed2_2025_-_Clustering_Aging_Curves_to_Classify_Athlete_Development_and_Predict_Caree.md` | 44183 | 5992 | 5/5 | True | `ce91ebd4d30895ab` |
| 586 | node1 | `gdrive_corpus_extractions/9f5dd30885_arxiv_2003.11291v2.pdf.md` | 28228 | 4247 | 5/5 | True | `a6067b9fc63e13ee` |
| 587 | node1 | `gdrive_corpus_extractions/9fc5a4e463_arxiv_2503.10386v3.pdf.md` | 53002 | 7509 | 5/5 | True | `91205a69d7bb28da` |
| 588 | node1 | `gdrive_corpus_extractions/9fd7f2d160_ArmstrongEd-2001-PrinciplesOfForecasting.pdf.md` | 51035 | 6982 | 5/5 | True | `ff99de4d1e31abfe` |
| 589 | node1 | `gdrive_corpus_extractions/a03b0e4706_openalex_W4405296518.pdf.md` | 35924 | 4945 | 5/5 | True | `9f8d8b365c66e13d` |
| 590 | node1 | `gdrive_corpus_extractions/a0a9b41a8b_2020_-_Evaluating_the_effectiveness_of_different_network_flow_motifs_in_associat.md` | 32272 | 4673 | 5/5 | True | `10bf144d4ced1986` |
| 591 | node1 | `gdrive_corpus_extractions/a0ec8fb991_2012_Deconstructing_the_Rebound_-_Rajiv_Maheswaran.pdf.md` | 38427 | 5788 | 5/5 | True | `9e5de556a15aa8a5` |
| 592 | node1 | `gdrive_corpus_extractions/a0fe471607_E-book-Mastering-the-art-of-player-development.pdf.md` | 61033 | 8475 | 5/5 | True | `f6e36fb66d27fbec` |
| 593 | node1 | `gdrive_corpus_extractions/a1046c2602_2502.00560.pdf.md` | 36784 | 5113 | 5/5 | True | `86e448766a7f5dcf` |
| 594 | node1 | `gdrive_corpus_extractions/a1349ad780_2510.19457v4.pdf.md` | 50446 | 7213 | 5/5 | True | `5e7ec52c51a670ad` |
| 595 | node1 | `gdrive_corpus_extractions/a179a8eb1b_2026_-_Comparative_Effects_of_Training_Modalities_on_Countermovement_Jump_Perfor.md` | 29999 | 4285 | 5/5 | True | `08651478eb5147d3` |
| 596 | node1 | `gdrive_corpus_extractions/a186bcde70_2020_-_Redefining_the_Penalty_Kick_Does_the_Punishment_Fit_the_Crime_-_Unknown_A.md` | 35832 | 5267 | 5/5 | True | `91835bd68a00f027` |
| 597 | node1 | `gdrive_corpus_extractions/a1bff68090_2013_Acceleration_in_the_NBA_Slides.pdf.md` | 43191 | 6104 | 5/5 | True | `064392e9653a966a` |
| 598 | node1 | `gdrive_corpus_extractions/a20b78c654_2019_Rao-Blackwellizing_field_goal_percentage_-_dalygrafstein_jqas_2019.pdf.md` | 47371 | 6685 | 5/5 | True | `56c29b6741222aa8` |
| 599 | node1 | `gdrive_corpus_extractions/a2b8227fee_2026_-_Opponent-Adjusted_Evaluation_of_NFL_Pass_Blocking_and_Pass_Rushing_Perfor.md` | 53607 | 7490 | 5/5 | True | `835f789132364bdf` |
| 600 | node1 | `gdrive_corpus_extractions/a346a9d40a_2019_A_Bayesian_Joint_Model_for_Spatial_Point_Processes_with_Application_to_Bask.md` | 65742 | 9532 | 5/5 | True | `e3060bab2d3aad49` |
| 601 | node1 | `gdrive_corpus_extractions/a3de879972_ai4all.pdf.md` | 59177 | 8242 | 5/5 | True | `8057657854ec47e7` |
| 602 | node1 | `gdrive_corpus_extractions/a3e8c6eed1_2102.05728.pdf.md` | 51602 | 7428 | 5/5 | True | `01d9985e1b785beb` |
| 603 | node1 | `gdrive_corpus_extractions/a3ed504b26_A_Genetic_Algorithm_for_Optimizing_Fantasy_Footbal.pdf.md` | 16396 | 2416 | 5/5 | True | `033a5251f28bc876` |
| 604 | node1 | `gdrive_corpus_extractions/a419fbb1a8_openalex_W90674028.pdf.md` | 46842 | 6627 | 5/5 | True | `e3f5c899a0c4a3b4` |
| 605 | node1 | `gdrive_corpus_extractions/a4d046f7a3_2018_High_Resolution_Shot_Capture_-_Systematic_Biases.pdf.md` | 48760 | 7664 | 5/5 | True | `579a2a0e9ccaef2b` |
| 606 | node1 | `gdrive_corpus_extractions/a50b3b999a_2026_-_SambaGraph_Action-Reaction_Spatio-Temporal_Graphs_for_Soccer_Tactical_Res.md` | 52646 | 7520 | 5/5 | True | `47c46a264ae01799` |
| 607 | node1 | `gdrive_corpus_extractions/a510100dde_openalex_W2367442858.pdf.md` | 54767 | 7319 | 5/5 | True | `acb9c920de2c0576` |
| 608 | node1 | `gdrive_corpus_extractions/a5600e2c62_2609.28049v1.pdf.md` | 45775 | 6628 | 5/5 | True | `3f1a63cb50f863df` |
| 609 | node1 | `gdrive_corpus_extractions/a5ae57cb61_openalex_W7204715181.pdf.md` | 59698 | 8318 | 5/5 | True | `397f54271efaa78d` |
| 610 | node1 | `gdrive_corpus_extractions/a5f63c54ad_2021_-_Applying_Hierarchical_Bayesian_Models_to_ATP_Data_-_Unknown_Authors.pdf.md` | 62258 | 8701 | 5/5 | True | `6b23e42c7af23a9c` |
| 611 | node1 | `gdrive_corpus_extractions/a5fe22a553_Rockne-1925-The-Four-Winners.pdf.md` | 48322 | 6968 | 5/5 | True | `06c019ba96bcfe72` |
| 612 | node1 | `gdrive_corpus_extractions/a6d67c7af2_2022_-_Zero_Running_Backs_or_Zero_Points_An_Analysis_on_the_Optimal_Fantasy_Foot.md` | 47965 | 7118 | 5/5 | True | `92e475cc1d1b3640` |
| 613 | node1 | `gdrive_corpus_extractions/a718683af5_32263160.pdf.md` | 39019 | 5801 | 5/5 | True | `14ef67c992d35e23` |
| 614 | node1 | `gdrive_corpus_extractions/a738147a92_arxiv_1603.05583v1.pdf.md` | 55998 | 7978 | 5/5 | True | `12831a10b64fec64` |
| 615 | node1 | `gdrive_corpus_extractions/a77c663bc4_openalex_W7154958003.pdf.md` | 64683 | 9363 | 5/5 | True | `dafa63682adcc1e7` |
| 616 | node1 | `gdrive_corpus_extractions/a7cf09f85f_undated_-_A_Machine_Learning_Approach_to_Player_Value_and_Decision_Making_in_Pro.md` | 55956 | 7744 | 5/5 | True | `14ef712dbfb1c64e` |
| 617 | node1 | `gdrive_corpus_extractions/a7d4c48298_Betts-etal-2012-ExploringCQRSAndEventSourcing.pdf.md` | 63894 | 9092 | 5/5 | True | `1600886aabd6b479` |
| 618 | node1 | `gdrive_corpus_extractions/a84b112feb_arxiv_2303.03366v2.pdf.md` | 38585 | 5490 | 5/5 | True | `c2890e2b1a27880d` |
| 619 | node1 | `gdrive_corpus_extractions/a8acd22f61_2026_-_Strategic_Multi-Agent_Learning_for_Interpretable_Action_Valuation_of_All_.md` | 60717 | 8345 | 5/5 | True | `d2f600ea78f95c59` |
| 620 | node1 | `gdrive_corpus_extractions/a8df2046ab_2017_tHoops_-_A_Multi-Aspect_Analytical_Framework_for_Spatio-Temporal_Basketball.md` | 45110 | 6835 | 5/5 | True | `14b4b7bc57b0021a` |
| 621 | node1 | `gdrive_corpus_extractions/a914e4ab4d_arxiv_2401.09942v1.pdf.md` | 38842 | 5640 | 5/5 | True | `ff9975f53d7effb0` |
| 622 | node1 | `gdrive_corpus_extractions/a9156f88ef_mcs.pdf.md` | 11147 | 1576 | 5/5 | True | `adf681e9d48b6d13` |
| 623 | node1 | `gdrive_corpus_extractions/a916a5d3a2_Kolmogorov-1933-FoundationsOfTheTheoryOfProbability.pdf.md` | 39116 | 5345 | 5/5 | True | `f717f6b5b58a9a15` |
| 624 | node1 | `gdrive_corpus_extractions/a9fe11440b_openalex_W7148978084.pdf.md` | 49698 | 7697 | 5/5 | True | `5fc040740c217da5` |
| 625 | node1 | `gdrive_corpus_extractions/ab907c894c_arxiv_2307.09699v1.pdf.md` | 49149 | 7061 | 5/5 | True | `2e227c63df410db5` |
| 626 | node1 | `gdrive_corpus_extractions/abdc91c1a8_WainwrightJordan-2008-GraphicalModelsExponentialFamiliesVariationalInference.pdf.md` | 50407 | 6845 | 5/5 | True | `eb4418d439696f2f` |
| 627 | node1 | `gdrive_corpus_extractions/ac037908d6_VADoD-2021-CPG-PostAcute-mTBI.pdf.md` | 70042 | 9591 | 5/5 | True | `c50ce9d604734f7d` |
| 628 | node1 | `gdrive_corpus_extractions/acbc547819_arxiv_2506.08327v1.pdf.md` | 44481 | 6451 | 5/5 | True | `8bb467e6b665da2f` |
| 629 | node1 | `gdrive_corpus_extractions/ade1f4c08d_arxiv_2304.08709v2.pdf.md` | 42322 | 6338 | 5/5 | True | `9780cb36d89870c8` |
| 630 | node1 | `gdrive_corpus_extractions/ae2843b06b_2025_-_Movement_dynamics_in_elite_female_soccer_athletes_the_quantile_cube_appro.md` | 40639 | 5760 | 5/5 | True | `23ee7db5da6a8335` |
| 631 | node1 | `gdrive_corpus_extractions/ae44d93228_2104.11595.pdf.md` | 33524 | 4767 | 5/5 | True | `9127d27ce4be70ff` |
| 632 | node1 | `gdrive_corpus_extractions/af168e3f7e_2022_-_Rocket_League_esports_-_Lee_et_al.pdf.md` | 59990 | 8914 | 5/5 | True | `7c06b5d7c1f2305a` |
| 633 | node1 | `gdrive_corpus_extractions/af9af4ee13_openalex_W4412453777.pdf.md` | 38213 | 5452 | 5/5 | True | `71abf0f612c74241` |
| 634 | node1 | `gdrive_corpus_extractions/af9cc5cb37_openalex_W7163699313.pdf.md` | 44114 | 6100 | 5/5 | True | `e1661bdb2107a0cf` |
| 635 | node1 | `gdrive_corpus_extractions/b0086d802c_Spielman-2023-SpectralAndAlgebraicGraphTheory.pdf.md` | 40993 | 5800 | 5/5 | True | `bfa6b43f28af038b` |
| 636 | node1 | `gdrive_corpus_extractions/b0b4f2da68_AgrawalEd-2012-BrainInjury-FunctionalAspectsRehabilitationPrevention.pdf.md` | 65921 | 9461 | 5/5 | True | `6e85e07bf6391758` |
| 637 | node1 | `gdrive_corpus_extractions/b0d6354f35_openalex_W7164681229.pdf.md` | 50914 | 7082 | 5/5 | True | `ba2e48111006975b` |
| 638 | node1 | `gdrive_corpus_extractions/b0d99971c3_arxiv_2406.01033v1.pdf.md` | 40249 | 5768 | 5/5 | True | `c1564e3446bb53ae` |
| 639 | node1 | `gdrive_corpus_extractions/b12f5f61bc_Advanced_AI_Architectures_for_Engineering_Innovation.pdf.md` | 65918 | 9147 | 5/5 | True | `435a0696bfb6d93e` |
| 640 | node1 | `gdrive_corpus_extractions/b16e0f3e15_openalex_W2921205141.pdf.md` | 36155 | 5707 | 5/5 | True | `0d5428b427f94fd3` |
| 641 | node1 | `gdrive_corpus_extractions/b1c1ddee1d_arxiv_2506.12716v1.pdf.md` | 52111 | 7254 | 5/5 | True | `4184e51e6546aa9e` |
| 642 | node1 | `gdrive_corpus_extractions/b1ceea385e_16678907951_1_.pdf.md` | 59795 | 8330 | 5/5 | True | `83707cde97fa85fa` |
| 643 | node1 | `gdrive_corpus_extractions/b3433d7113_arxiv_2511.06175v1.pdf.md` | 45435 | 6524 | 5/5 | True | `2434d85c9565f414` |
| 644 | node1 | `gdrive_corpus_extractions/b348f8a7ee_2024_-_Leveraging_minute-by-minute_soccer_match_event_data_to_adjust_Team_s_offe.md` | 46020 | 6443 | 5/5 | True | `96e0c445b7b86b60` |
| 645 | node1 | `gdrive_corpus_extractions/b355857b1c_openalex_W1981595822.pdf.md` | 32124 | 4906 | 5/5 | True | `6c5892faea1f2fa6` |
| 646 | node1 | `gdrive_corpus_extractions/b376f8128f_openalex_W4409289508.pdf.md` | 66943 | 9205 | 5/5 | True | `3592249692ac054e` |
| 647 | node1 | `gdrive_corpus_extractions/b3cac62ae3_arxiv_2505.12854v1.pdf.md` | 64032 | 9037 | 5/5 | True | `d8c79dd92af9edb0` |
| 648 | node1 | `gdrive_corpus_extractions/b3ce3502fd_2604.20861v3.pdf.md` | 51942 | 7556 | 5/5 | True | `32907c83486fe022` |
| 649 | node1 | `gdrive_corpus_extractions/b40805fe74_HardtRecht-2022-PatternsPredictionsAndActions.pdf.md` | 61675 | 8832 | 5/5 | True | `2ba7bb89a5392d17` |
| 650 | node1 | `gdrive_corpus_extractions/b4b4ccb0bd_2412.13176.pdf.md` | 39101 | 5746 | 5/5 | True | `8830b9a96c1d4c8f` |
| 651 | node1 | `gdrive_corpus_extractions/b54ac8f3bd_nflWAR-_A_Reproducible_Method_for_Offensive_Player_Evaluation_in_Football_Extend.md` | 63283 | 8842 | 5/5 | True | `ff015338d46b41c3` |
| 652 | node1 | `gdrive_corpus_extractions/b675120abe_front_matter.pdf.md` | 28324 | 4205 | 5/5 | True | `88a44c51b4cba5d7` |
| 653 | node1 | `gdrive_corpus_extractions/b68e1148d3_openalex_W2133122533.pdf.md` | 67839 | 9855 | 5/5 | True | `6eb73ef6a8677af9` |
| 654 | node1 | `gdrive_corpus_extractions/b6fb6ecaea_Cavanaugh-1919-Inside-Football.pdf.md` | 56257 | 8470 | 5/5 | True | `251c33f5501dd9cf` |
| 655 | node1 | `gdrive_corpus_extractions/b705384f38_2608.21381v1.pdf.md` | 49866 | 7013 | 5/5 | True | `8ce9df4579259ab5` |
| 656 | node1 | `gdrive_corpus_extractions/b7c36d56b5_openalex_W4404212078.pdf.md` | 24353 | 3347 | 5/5 | True | `097e39bbf8387bd1` |
| 657 | node1 | `gdrive_corpus_extractions/b7fb3a3c9e_2023_-_The_Drafting_Dynasty_Which_NBA_Franchise_Dominates_the_Draft_-_Dandapani_.md` | 53011 | 7845 | 5/5 | True | `03998594b8d3ba85` |
| 658 | node1 | `gdrive_corpus_extractions/b931f45fea_Identifying_basketball_performance_indic.pdf.md` | 60590 | 8354 | 5/5 | True | `913aa3c207c5308d` |
| 659 | node1 | `gdrive_corpus_extractions/b9459b7bf4_openalex_W4225820105.pdf.md` | 61345 | 8812 | 5/5 | True | `710eba97103e5bd9` |
| 660 | node1 | `gdrive_corpus_extractions/b9bb0f5833_2406.04062.pdf.md` | 35134 | 4971 | 5/5 | True | `37c1a189bbc073d1` |
| 661 | node1 | `gdrive_corpus_extractions/baef859e95_2017_-_Bullpen_Strategies_for_Major_League_Baseball_-_Unknown_Authors.pdf.md` | 33804 | 4870 | 5/5 | True | `064005ab983b67ea` |
| 662 | node1 | `gdrive_corpus_extractions/bb3221831c_2026_-_Zero-Shot_Multimodal_Event_Spotting_in_Soccer_Broadcasts_-_Kamal_et_al.pd.md` | 42491 | 6094 | 5/5 | True | `049b18659b7dba3b` |
| 663 | node1 | `gdrive_corpus_extractions/bbd8eae9fe_arxiv_2505.08126v1.pdf.md` | 62093 | 9261 | 5/5 | True | `e7538ba5d1185bc5` |
| 664 | node1 | `gdrive_corpus_extractions/bc5069abec_2105.09506v1.pdf.md` | 17170 | 2471 | 5/5 | True | `5b5bddbc64658cdf` |
| 665 | node1 | `gdrive_corpus_extractions/bc583065da_arxiv_2107.00500v1.pdf.md` | 65470 | 9658 | 5/5 | True | `73ff49a08569fd04` |
| 666 | node1 | `gdrive_corpus_extractions/bc821cc391_arxiv_2008.07870v1.pdf.md` | 24938 | 3572 | 5/5 | True | `6f38c32a0dada984` |
| 667 | node1 | `gdrive_corpus_extractions/bcb57d0e46_2024_-_Balancing_pressing_intensity_and_defensive_solidity_against_different_pas.md` | 54356 | 7375 | 5/5 | True | `f6c0bdc70bd3bdea` |
| 668 | node1 | `gdrive_corpus_extractions/bcc7a531a0_openalex_W1872861900.pdf.md` | 34215 | 4892 | 5/5 | True | `0dab76367a32cc44` |
| 669 | node1 | `gdrive_corpus_extractions/bd060dfcd3_2023_-_Optimal_Rest_Days_for_Pitchers_Maximizing_Performance_and_Wins_-_Zilberma.md` | 61552 | 9268 | 5/5 | True | `07195363e24c2ef1` |
| 670 | node1 | `gdrive_corpus_extractions/bd815d32ab_arxiv_2108.13577v1.pdf.md` | 61791 | 8915 | 5/5 | True | `a3916b5ba67718e0` |
| 671 | node1 | `gdrive_corpus_extractions/be0f684b59_814578.pdf.md` | 57369 | 7890 | 5/5 | True | `4d980c6f917b5045` |
| 672 | node1 | `gdrive_corpus_extractions/be39c5dac2_2609.19035v1.pdf.md` | 38790 | 4894 | 5/5 | True | `6729ed616d3ec9bf` |
| 673 | node1 | `gdrive_corpus_extractions/bea20fada9_openalex_W7210193024.pdf.md` | 51675 | 7790 | 5/5 | True | `d2cf2b236b29296c` |
| 674 | node1 | `gdrive_corpus_extractions/bee7a67a91_2024_-_KabaddiPy_A_package_to_enable_access_to_Professional_Kabaddi_Data_-_Unkno.md` | 56568 | 8429 | 5/5 | True | `36f467bb32bef7e9` |
| 675 | node1 | `gdrive_corpus_extractions/bef73f8318_andrew-ng-machine-learning-yearning.pdf.md` | 52095 | 7304 | 5/5 | True | `1d71f9432fa51f88` |
| 676 | node1 | `gdrive_corpus_extractions/bfe0af3f27_The_latent_structure_of_standard_game_ef.pdf.md` | 44421 | 6174 | 5/5 | True | `c819b381c459e4b6` |
| 677 | node1 | `gdrive_corpus_extractions/c061fe3e5a_openalex_W4412870581.pdf.md` | 59503 | 8186 | 5/5 | True | `5d3c3902df586ea3` |
| 678 | node1 | `gdrive_corpus_extractions/c0a9061cb1_openalex_W4415276574.pdf.md` | 39628 | 5289 | 5/5 | True | `99df634c15b511b9` |
| 679 | node1 | `gdrive_corpus_extractions/c0d43b6edc_Nielsen-2015-NeuralNetworksAndDeepLearning.pdf.md` | 38900 | 5749 | 5/5 | True | `c23762b77e7323a6` |
| 680 | node1 | `gdrive_corpus_extractions/c107fb0532_openalex_W2160259202.pdf.md` | 59630 | 8562 | 5/5 | True | `09f73fba460e84f7` |
| 681 | node1 | `gdrive_corpus_extractions/c117d03a94_2026_-_The_Contract_Effect_Why_NHL_Players_Perform_Differently_When_Money_Is_on_.md` | 52520 | 7603 | 5/5 | True | `8f42d3d6bddb65a2` |
| 682 | node1 | `gdrive_corpus_extractions/c1db108abc_2303.13323.pdf.md` | 50888 | 7467 | 5/5 | True | `f756a13192611785` |
| 683 | node1 | `gdrive_corpus_extractions/c1f2dff3d7_openalex_W7221445558.pdf.md` | 63283 | 9022 | 5/5 | True | `e4b1a20482e55af9` |
| 684 | node1 | `gdrive_corpus_extractions/c21e6b685e_openalex_W4410065207.pdf.md` | 42283 | 5698 | 5/5 | True | `e0e73e166cadc0a9` |
| 685 | node1 | `gdrive_corpus_extractions/c22d517e45_2512.15386v1.pdf.md` | 51240 | 7503 | 5/5 | True | `b7e7d8184a7a6cb7` |
| 686 | node1 | `gdrive_corpus_extractions/c26014f348_2025_-_EPI_over_Time_in_English_Football_Tureen_Chen_-_Unknown_Authors.pdf.md` | 42827 | 6074 | 5/5 | True | `7102f7101114b423` |
| 687 | node1 | `gdrive_corpus_extractions/c2a53fecec_openalex_W7115285095.pdf.md` | 35597 | 5053 | 5/5 | True | `585b5c21e6ee6d87` |
| 688 | node1 | `gdrive_corpus_extractions/c3875fdcf1_openalex_W7217603037.pdf.md` | 47123 | 6540 | 5/5 | True | `d62914bd20f6a5a4` |
| 689 | node1 | `gdrive_corpus_extractions/c38c621c07_undated_-_Doinkalytics_A_New_Paradigm_in_National_Football_League_NFL_Placekicki.md` | 37322 | 5166 | 5/5 | True | `e680efb7bf3c6d43` |
| 690 | node1 | `gdrive_corpus_extractions/c3a22ffdff_advanced-engineering-mathematics_by-erwin-kreyszig-__10th_edition-1_1_.pdf.md` | 48100 | 7294 | 5/5 | True | `a1950dd5c76f32c4` |
| 691 | node1 | `gdrive_corpus_extractions/c3bfb8a316_2016_Preventing_in-game_Injuries_NBA.pdf.md` | 59118 | 8700 | 5/5 | True | `9fbe933bdc8e71d6` |
| 692 | node1 | `gdrive_corpus_extractions/c4386dc83e_qt5qw5382d_noSplash_983c1629d166d6b046b4a2d65e75e816.pdf.md` | 65558 | 9600 | 5/5 | True | `e6cdf626d2deed24` |
| 693 | node1 | `gdrive_corpus_extractions/c484638a03_2021_-_Opening_up_the_court_analyzing_player_performance_across_tennis_Grand_Sla.md` | 39347 | 5756 | 5/5 | True | `bb7672096dcc0c8d` |
| 694 | node1 | `gdrive_corpus_extractions/c4da1bc0fe_openalex_W4378803412.pdf.md` | 58907 | 8540 | 5/5 | True | `f0afafcd9f9e8a68` |
| 695 | node1 | `gdrive_corpus_extractions/c514ea4d55_Skinner-1953-ScienceAndHumanBehavior.pdf.md` | 30308 | 4264 | 5/5 | True | `e4debe529e98dfd8` |
| 696 | node1 | `gdrive_corpus_extractions/c5a54c1aef_6085_Accelerating_Sinkhorn_alg.pdf.md` | 50496 | 7113 | 5/5 | True | `3dd88e22b48524d2` |
| 697 | node1 | `gdrive_corpus_extractions/c5c82b3082_openalex_W3112359635.pdf.md` | 41290 | 5875 | 5/5 | True | `480d579a8952ea6a` |
| 698 | node1 | `gdrive_corpus_extractions/c5fe68815a_2303.11174v2.pdf.md` | 54997 | 8152 | 5/5 | True | `bc972a6275b43cf9` |
| 699 | node1 | `gdrive_corpus_extractions/c6289532c0_arxiv_2108.06432v2.pdf.md` | 59814 | 8672 | 5/5 | True | `5437b59321f6bbbc` |
| 700 | node1 | `gdrive_corpus_extractions/c671b1eb2b_arxiv_2011.00958v2.pdf.md` | 17360 | 2469 | 5/5 | True | `306b29b362032984` |
| 701 | node1 | `gdrive_corpus_extractions/c6f6e45e14_openalex_W7216022264.pdf.md` | 46668 | 6596 | 5/5 | True | `db9b15a2cb5140f2` |
| 702 | node1 | `gdrive_corpus_extractions/c6f9e77d9b_2017_High-resolution_shot_capture_reveals_systematic_biases_and_an_improved_meth.md` | 69280 | 10155 | 5/5 | True | `395905db6cc1b680` |
| 703 | node1 | `gdrive_corpus_extractions/c704413360_2509.11796v1.pdf.md` | 45554 | 6482 | 5/5 | True | `7019af4686821bf5` |
| 704 | node1 | `gdrive_corpus_extractions/c723aaf3ac_2014_-_Win_at_Home_and_Draw_Away_Automatic_Formation_Analysis_Highlighting_the_D.md` | 70824 | 10314 | 5/5 | True | `710017276951d572` |
| 705 | node1 | `gdrive_corpus_extractions/c77eac060b_arxiv_2304.04437v1.pdf.md` | 51993 | 7047 | 5/5 | True | `2d215bd100267e78` |
| 706 | node1 | `gdrive_corpus_extractions/c7d54a09e2_openalex_W7214499110.pdf.md` | 53625 | 8192 | 5/5 | True | `8f7de5b8e7d3c239` |
| 707 | node1 | `gdrive_corpus_extractions/c7e41f7bb9_arxiv_2606.20542v1.pdf.md` | 40646 | 5831 | 5/5 | True | `10e7ecae217abac5` |
| 708 | node1 | `gdrive_corpus_extractions/c86555d90e_arxiv_2610.05041v1.pdf.md` | 41368 | 6149 | 5/5 | True | `a6f7a8c7123d304d` |
| 709 | node1 | `gdrive_corpus_extractions/c884221e84_arxiv_2003.09003v1.pdf.md` | 37418 | 5349 | 5/5 | True | `7d98b97aba44ef4f` |
| 710 | node1 | `gdrive_corpus_extractions/c8c64d3549_1909.10631.pdf.md` | 58063 | 8600 | 5/5 | True | `857c70aa8a3dbc3c` |
| 711 | node1 | `gdrive_corpus_extractions/c8ec997481_1512.06808v1.pdf.md` | 57723 | 8636 | 5/5 | True | `bcb70e4104161ce4` |
| 712 | node1 | `gdrive_corpus_extractions/c9120b28ee_2020_-_You_Cannot_Do_That_Ben_Stokes_Dynamically_Predicting_Shot_Type_in_Cricket.md` | 55815 | 8027 | 5/5 | True | `0d07b0954fae7c37` |
| 713 | node1 | `gdrive_corpus_extractions/c93ad4855c_arxiv_2109.14306v1.pdf.md` | 53176 | 7760 | 5/5 | True | `9ee7d8ef6bedf090` |
| 714 | node1 | `gdrive_corpus_extractions/c944587dfd_openalex_W4220892302.pdf.md` | 62468 | 9053 | 5/5 | True | `4264dd63021a142c` |
| 715 | node1 | `gdrive_corpus_extractions/c9ba3c322e_HopcroftUllman-1979-AutomataTheoryLanguagesComputation.pdf.md` | 36087 | 5358 | 5/5 | True | `e4bf7c87e0533558` |
| 716 | node1 | `gdrive_corpus_extractions/ca2fa5b9d7_arxiv_2409.17533v2.pdf.md` | 31684 | 4356 | 5/5 | True | `553c36f271a61f1a` |
| 717 | node1 | `gdrive_corpus_extractions/ca4bd88206_openalex_W4393219223.pdf.md` | 45524 | 6545 | 5/5 | True | `f4bd224b914f15e3` |
| 718 | node1 | `gdrive_corpus_extractions/caea756803_Track_Anything_-_Segment_Anything_Meets_Videos.pdf.md` | 56666 | 8259 | 5/5 | True | `5c13d94ca9c2a461` |
| 719 | node1 | `gdrive_corpus_extractions/cc4b97fef7_0132937646.pdf.md` | 57401 | 9092 | 5/5 | True | `bd870495525e6eff` |
| 720 | node1 | `gdrive_corpus_extractions/ccb519c6d9_openalex_W4310403842.pdf.md` | 27110 | 3797 | 5/5 | True | `12ceb64ac0e883ee` |
| 721 | node1 | `gdrive_corpus_extractions/cce3100223__15590410_-_Journal_of_Quantitative_Analysis_in_Sports_Identifying_NCAA_tourname.md` | 52421 | 7862 | 5/5 | True | `8f6d6930fe655a0c` |
| 722 | node1 | `gdrive_corpus_extractions/cd4c679eb1_openalex_W4417061281.pdf.md` | 56155 | 8108 | 5/5 | True | `6885cc456f7cb942` |
| 723 | node1 | `gdrive_corpus_extractions/cd5f21c15d__OceanofPDF.com_Ultimate_Step_by_Step_Guide_to_Machine_Lea_-_Daneyal_Anis.pdf.md` | 60605 | 8831 | 5/5 | True | `c17f44768cebc2f2` |
| 724 | node1 | `gdrive_corpus_extractions/cd941f28c8_Computational_and_Mathematical_Methods_in_Medicine_-_2022_-_Li_-_Retracted_Resea.md` | 27970 | 3937 | 5/5 | True | `49bd41c7ffcee341` |
| 725 | node1 | `gdrive_corpus_extractions/cd966a5df8_2509.05913v3.pdf.md` | 62724 | 9313 | 5/5 | True | `fbf35a93815bee01` |
| 726 | node1 | `gdrive_corpus_extractions/cd99c6b72c_ReddiEtAl-2026-MachineLearningSystems-Vol2-AtScale.pdf.md` | 56389 | 8432 | 5/5 | True | `38becc0c9995740e` |
| 727 | node1 | `gdrive_corpus_extractions/cdbad7f516_openalex_W4281789014.pdf.md` | 41288 | 5920 | 5/5 | True | `67bd5eb51d141a7e` |
| 728 | node1 | `gdrive_corpus_extractions/ce089b1309_arxiv_2207.05518v2.pdf.md` | 60804 | 8655 | 5/5 | True | `65c99a0d7572f9c3` |
| 729 | node1 | `gdrive_corpus_extractions/ce39a1708d_arxiv_2101.01984v1.pdf.md` | 48765 | 6967 | 5/5 | True | `7026eb9e9c054c09` |
| 730 | node1 | `gdrive_corpus_extractions/ce5b5a0b59_Lewis-1896-A-Primer-of-College-Football.pdf.md` | 47930 | 7586 | 5/5 | True | `3a586f90be8bc7a9` |
| 731 | node1 | `gdrive_corpus_extractions/ce5b9a8f19_ten-proofs-oai.pdf.md` | 35890 | 5040 | 5/5 | True | `a369fc5c5589e4fa` |
| 732 | node1 | `gdrive_corpus_extractions/ce60aedf4b_arxiv_2302.06569v1.pdf.md` | 63336 | 9125 | 5/5 | True | `f4840dbcf9c80771` |
| 733 | node1 | `gdrive_corpus_extractions/ce7f8b6256_Variations_on_multimedia_data_mining.pdf.md` | 58975 | 8451 | 5/5 | True | `2f2aae3dc825055f` |
| 734 | node1 | `gdrive_corpus_extractions/ce8db7c574_2017_-_Using_survival_analysis_to_estimate_injury_recovery_times_and_positional_.md` | 52179 | 7430 | 5/5 | True | `5ff359ccc122d1b6` |
| 735 | node1 | `gdrive_corpus_extractions/cecaac712e_arxiv_2412.06258v1.pdf.md` | 48377 | 7100 | 5/5 | True | `13cce2af9de9bdd0` |
| 736 | node1 | `gdrive_corpus_extractions/cf03a70a49_2211.15392v2.pdf.md` | 32760 | 4230 | 5/5 | True | `faff8c4468227078` |
| 737 | node1 | `gdrive_corpus_extractions/cfc4550b20_jsep-2024.pdf.md` | 51145 | 7099 | 5/5 | True | `3fe1745fe18f70e0` |
| 738 | node1 | `gdrive_corpus_extractions/d06255126b_2022_-_Whether_Weather_Wind_Speed_and_Temperature_Impacts_Offensive_Success_in_t.md` | 44623 | 6546 | 5/5 | True | `11702f2e55284841` |
| 739 | node1 | `gdrive_corpus_extractions/d13524f8b1_arxiv_2410.14161v2.pdf.md` | 50534 | 7345 | 5/5 | True | `075f03c268a86cfd` |
| 740 | node1 | `gdrive_corpus_extractions/d1363c8cf1_2021_-_Javier_M._Buld_and_Borja_Burriel_-_The_quest_for_the_right_pass_Quantifyi.md` | 60213 | 8710 | 5/5 | True | `3f5184dd399cdf78` |
| 741 | node1 | `gdrive_corpus_extractions/d13ec57021_2011.09192.pdf.md` | 51688 | 6759 | 5/5 | True | `d6308c549ebc08ed` |
| 742 | node1 | `gdrive_corpus_extractions/d222e4f59f_arxiv_2104.10068v2.pdf.md` | 53894 | 7652 | 5/5 | True | `5b6cd83f4f790961` |
| 743 | node1 | `gdrive_corpus_extractions/d2be06d3b9_openalex_W2465389976.pdf.md` | 60730 | 8812 | 5/5 | True | `d7f5b07aa76c4f85` |
| 744 | node1 | `gdrive_corpus_extractions/d2c0c84abb_2013_-_State_of_Transition_Estimating_Real-Time_Expected_Possession_Value_in_the.md` | 54865 | 7628 | 5/5 | True | `1d0bcdb2792b8aa4` |
| 745 | node1 | `gdrive_corpus_extractions/d38d0810c8_Automated_Assistants_for_Analyzing_Team.pdf.md` | 60215 | 8809 | 5/5 | True | `ebb265f158564e17` |
| 746 | node1 | `gdrive_corpus_extractions/d406b5f938_openalex_W2076165727.pdf.md` | 48050 | 7355 | 5/5 | True | `f77292314ad9f4e4` |
| 747 | node1 | `gdrive_corpus_extractions/d42e217e51_HildebrandHorstEds-2020-SeverelyInjuredPatient-MDPI.pdf.md` | 45006 | 6600 | 5/5 | True | `171cdbfcd34a6f6f` |
| 748 | node1 | `gdrive_corpus_extractions/d4a5de2a09_2509.21673v1.pdf.md` | 39308 | 5581 | 5/5 | True | `4ade6f9d5ab53873` |
| 749 | node1 | `gdrive_corpus_extractions/d4ac14600a_openalex_W7154453553.pdf.md` | 60176 | 8525 | 5/5 | True | `0157a13524c26e1b` |
| 750 | node1 | `gdrive_corpus_extractions/d4b14ffaad_arxiv_2008.07725v2.pdf.md` | 57461 | 8214 | 5/5 | True | `09631ebdb90a8f7a` |
| 751 | node1 | `gdrive_corpus_extractions/d4de2bdafa_2025_-_Boosting_Draft_Accuracy_A_Two-Stage_Classifier_Regressor_Approach_for_NFL.md` | 62105 | 9130 | 5/5 | True | `4019a3fa79105d5c` |
| 752 | node1 | `gdrive_corpus_extractions/d522bbe922_arxiv_2211.12009v1.pdf.md` | 49913 | 7318 | 5/5 | True | `50a9887f19e03b8b` |
| 753 | node1 | `gdrive_corpus_extractions/d5737d82ae_openalex_W7165167524.pdf.md` | 55061 | 7762 | 5/5 | True | `9ff5013319d09f86` |
| 754 | node1 | `gdrive_corpus_extractions/d57fc587a8_2502.08621v2.pdf.md` | 51074 | 7180 | 5/5 | True | `67d5b54d934e37c2` |
| 755 | node1 | `gdrive_corpus_extractions/d5d8f0192e_openalex_W3199783350.pdf.md` | 32332 | 4353 | 5/5 | True | `33c9586d9be7f5fc` |
| 756 | node1 | `gdrive_corpus_extractions/d671370ef1_arxiv_1907.08816v1.pdf.md` | 58427 | 8676 | 5/5 | True | `6ae04ed04da9ed7e` |
| 757 | node1 | `gdrive_corpus_extractions/d67b9667a4_openalex_W4401416089.pdf.md` | 61774 | 9349 | 5/5 | True | `48ac1c19a1889840` |
| 758 | node1 | `gdrive_corpus_extractions/d72ec9fd68_Ashby-1956-IntroductionToCybernetics.pdf.md` | 56238 | 8485 | 5/5 | True | `f5471fe6d6bcea28` |
| 759 | node1 | `gdrive_corpus_extractions/d7ac230f3a_2304.06489v1.pdf.md` | 35535 | 4791 | 5/5 | True | `0af5b418aa803fd2` |
| 760 | node1 | `gdrive_corpus_extractions/d7d579a940_2609.05584.pdf.md` | 57616 | 8886 | 5/5 | True | `a4a044380c5b20f7` |
| 761 | node1 | `gdrive_corpus_extractions/d7dfa93336_2021_-_Prediction_of_Defensive_Player_Trajectories_in_NFL_Games_with_Defender_CN.md` | 37595 | 5321 | 5/5 | True | `e988ad3f8e9fe87d` |
| 762 | node1 | `gdrive_corpus_extractions/d85ef68198_Computational_and_Mathematical_Methods_in_Medicine_-_2022_-_Chang_-_The_Applicat.md` | 54385 | 7617 | 5/5 | True | `1f7aebac4e93f57a` |
| 763 | node1 | `gdrive_corpus_extractions/d88bd39139_openalex_W2890460527.pdf.md` | 56473 | 8283 | 5/5 | True | `3f45c811c29c9cbf` |
| 764 | node1 | `gdrive_corpus_extractions/d8a0738cb9_openalex_W1492752543.pdf.md` | 65566 | 9519 | 5/5 | True | `6e85c42323491856` |
| 765 | node1 | `gdrive_corpus_extractions/d9023af1c0_arxiv_2409.16902v5.pdf.md` | 32208 | 4583 | 5/5 | True | `712bbc55e777c8e1` |
| 766 | node1 | `gdrive_corpus_extractions/d9275c1a51_2026_-_The_Pitcher_s_Dilemma_A_Game-Theoretical_Model_of_Pickoffs_and_Stolen_Bas.md` | 60602 | 8615 | 5/5 | True | `b630f74537bccded` |
| 767 | node1 | `gdrive_corpus_extractions/d9a401071b_openalex_W4406132113.pdf.md` | 47486 | 6685 | 5/5 | True | `15a5615ab84f9a6d` |
| 768 | node1 | `gdrive_corpus_extractions/d9c11198a0_BrazdilEtAl-2022-Metalearning-AutoMLAndDataMining.pdf.md` | 54827 | 8072 | 5/5 | True | `bb2f32e9b0676cf7` |
| 769 | node1 | `gdrive_corpus_extractions/d9fbd6790f_PVLDB26-song.pdf.md` | 41957 | 5948 | 5/5 | True | `fccb783237d6536b` |
| 770 | node1 | `gdrive_corpus_extractions/da0a09e477_openalex_W7119509037.pdf.md` | 47576 | 6869 | 5/5 | True | `8ceb568e80be75c2` |
| 771 | node1 | `gdrive_corpus_extractions/da1545136d_openalex_W7160258009.pdf.md` | 42627 | 5792 | 5/5 | True | `0f1c005de1598e3e` |
| 772 | node1 | `gdrive_corpus_extractions/da2d2c5fc8_1411.1243.pdf.md` | 64470 | 9510 | 5/5 | True | `f5f08880e06a8d6d` |
| 773 | node1 | `gdrive_corpus_extractions/dab07bf38a_2025_-_Modelling_player_performance_after_potential_transfers_between_leagues_Ri.md` | 30537 | 4408 | 5/5 | True | `c966654fed53c9db` |
| 774 | node1 | `gdrive_corpus_extractions/dc8024103b_Spaldings-Official-Foot-Ball-Guide-1915.pdf.md` | 33436 | 4913 | 5/5 | True | `6fd79718aabc69a6` |
| 775 | node1 | `gdrive_corpus_extractions/dcc2b1a5ed_2025_-_College_Football_Volatility_A_Bayesian_state-space_model_of_the_transfer_.md` | 36317 | 5200 | 5/5 | True | `c31cdc2ebe587b5d` |
| 776 | node1 | `gdrive_corpus_extractions/dd12d76495_2403.12977v3.pdf.md` | 45649 | 6821 | 5/5 | True | `35940c1bfb334f80` |
| 777 | node1 | `gdrive_corpus_extractions/dd198b08b5_2023_-_Leveraging_Team_Traces_to_Optimise_Process-Aware_Tactical_Style_Discovery.md` | 64673 | 9229 | 5/5 | True | `c63edc810186d24b` |
| 778 | node1 | `gdrive_corpus_extractions/dd365778c1_openalex_W7160488124.pdf.md` | 62879 | 8552 | 5/5 | True | `fe03902e538b332b` |
| 779 | node1 | `gdrive_corpus_extractions/ddf3650856_2016_spatio_temporal_analysis_for_team_sports.pdf.md` | 23691 | 3353 | 5/5 | True | `d0d6fd3c931ae6e4` |
| 780 | node1 | `gdrive_corpus_extractions/df15c099ba_arxiv_2501.13994v1.pdf.md` | 31449 | 4627 | 5/5 | True | `ba76e030d921f235` |
| 781 | node1 | `gdrive_corpus_extractions/df993e40f5_arxiv_2405.13896v1.pdf.md` | 61229 | 8870 | 5/5 | True | `e019654e5c03a138` |
| 782 | node1 | `gdrive_corpus_extractions/dffb140e58_AI-Infra-Book-EN.pdf.md` | 38374 | 5954 | 5/5 | True | `c6c7ee31f5af108a` |
| 783 | node1 | `gdrive_corpus_extractions/dffc6ac54f_BU_FB_Game_Notes_TCU_FINAL.pdf.md` | 42920 | 6717 | 5/5 | True | `0784db3702f73f66` |
| 784 | node1 | `gdrive_corpus_extractions/e071d4ad46_R_as_a_GIS_A_R_Pearse_V2.pdf.md` | 55330 | 7943 | 5/5 | True | `6806b9ec81230f02` |
| 785 | node1 | `gdrive_corpus_extractions/e111be7102_arxiv_2111.11535v2.pdf.md` | 66986 | 10275 | 5/5 | True | `c22ea9be6991848e` |
| 786 | node1 | `gdrive_corpus_extractions/e16b818db9_2402.10979v2.pdf.md` | 34925 | 4806 | 5/5 | True | `476aeaa1aa83cd8e` |
| 787 | node1 | `gdrive_corpus_extractions/e18411dd45_2012_Sports_Data_Mining_Technology_Used_in_Basketball_Outcome_Predicti.pdf.md` | 34994 | 4708 | 5/5 | True | `6c3cabefebc1f27e` |
| 788 | node1 | `gdrive_corpus_extractions/e198af87c6_arxiv_2210.12519v1.pdf.md` | 61603 | 8625 | 5/5 | True | `e2352aabaed99fb7` |
| 789 | node1 | `gdrive_corpus_extractions/e1b544cfd5_2020_-_Evaluating_Parametric_Methods_for_Modeling_European_Soccer_Team_Goals_-_U.md` | 68872 | 9503 | 5/5 | True | `f8674ec714743717` |
| 790 | node1 | `gdrive_corpus_extractions/e1bf8289b2_openalex_W4386223745.pdf.md` | 38948 | 5436 | 5/5 | True | `0fe5f158dfb1e5d8` |
| 791 | node1 | `gdrive_corpus_extractions/e1c67351b7_2021_-_A_Bayesian_marked_spatial_point_processes_model_for_basketball_shot_chart.md` | 72417 | 10633 | 5/5 | True | `122c42010649d1d6` |
| 792 | node1 | `gdrive_corpus_extractions/e2743b6176_arxiv_2507.12245v1.pdf.md` | 60324 | 8645 | 5/5 | True | `a102395bc8f4f165` |
| 793 | node1 | `gdrive_corpus_extractions/e2ef831dfc_Zuppke-1922-Football-Technique-and-Tactics.pdf.md` | 58778 | 8912 | 5/5 | True | `ed0f54ce2430a390` |
| 794 | node1 | `gdrive_corpus_extractions/e308a35f93_openalex_W2800090273.pdf.md` | 53675 | 8315 | 5/5 | True | `d829d8f1b9abe80b` |
| 795 | node1 | `gdrive_corpus_extractions/e32e1f41ee_openalex_W7214151459.pdf.md` | 53006 | 7543 | 5/5 | True | `b1dff1613b41a76c` |
| 796 | node1 | `gdrive_corpus_extractions/e41103fb91_ISLR_First_Printing.pdf.md` | 52802 | 7314 | 5/5 | True | `188f6ee9204e1181` |
| 797 | node1 | `gdrive_corpus_extractions/e44571db94_2604.16588v1.pdf.md` | 31132 | 4498 | 5/5 | True | `0058182e5528b640` |
| 798 | node1 | `gdrive_corpus_extractions/e4c88ce06c_openalex_W3202546516.pdf.md` | 56857 | 8068 | 5/5 | True | `2a9d1fde79d6723d` |
| 799 | node1 | `gdrive_corpus_extractions/e572d59095_openalex_W2951695555.pdf.md` | 32994 | 4711 | 5/5 | True | `5c2af89516b37a85` |
| 800 | node1 | `gdrive_corpus_extractions/e5ea3da191_openalex_W4395065336.pdf.md` | 70269 | 10078 | 5/5 | True | `58131e2f786e09aa` |
| 801 | node1 | `gdrive_corpus_extractions/e60f3c893b_2012_-_Models_for_Third_Down_Conversion_in_the_National_Football_League_-_Unknow.md` | 60739 | 8720 | 5/5 | True | `cca4323b17885a99` |
| 802 | node1 | `gdrive_corpus_extractions/e6523dc9f9_2017_Position_importance_in_NCAA_football_-_Zachary_Knowlton_and_Gilbert_W._Fell.md` | 61020 | 8937 | 5/5 | True | `b2f9e81dad4069e4` |
| 803 | node1 | `gdrive_corpus_extractions/e6c268ccb0_Benezet-1904-Three-Years-of-Football-at-Dartmouth.pdf.md` | 46845 | 6968 | 5/5 | True | `6dbbcc7fba31e443` |
| 804 | node1 | `gdrive_corpus_extractions/e744dabad0_openalex_W2024401270.pdf.md` | 44509 | 6242 | 5/5 | True | `e7f056d87b2a1fb5` |
| 805 | node1 | `gdrive_corpus_extractions/e78623ea85_2022_-_The_Importance_of_Break_Point_Percentage_-_Yu_et_al.pdf.md` | 45189 | 6320 | 5/5 | True | `6bd3428d13095726` |
| 806 | node1 | `gdrive_corpus_extractions/e8f48b46fb_2021_-_A_Poisson_Betting_Model_with_a_Kelly_Criterion_Element_for_European_Socce.md` | 52976 | 8054 | 5/5 | True | `d847ad5ed636dd04` |
| 807 | node1 | `gdrive_corpus_extractions/eaa9e72f8e_vgcbylbsb2abq3nfiejf.pdf.md` | 63543 | 9042 | 5/5 | True | `104152a672c1b6bb` |
| 808 | node1 | `gdrive_corpus_extractions/eb23030703_2025_-_The_Risk_and_the_Reward_An_In-depth_Evaluation_of_Strategic_Aggressivenes.md` | 27160 | 3843 | 5/5 | True | `c2fda9c59aa90e6a` |
| 809 | node1 | `gdrive_corpus_extractions/eb34bf9d88_2511.11983v1.pdf.md` | 43991 | 6037 | 5/5 | True | `deb396ffa0b35df3` |
| 810 | node1 | `gdrive_corpus_extractions/eb5d89797e_Oliveira-Brito-Eds-2023-Wellness-Fitness-Performance-Monitoring-Athletes-MDPI.pd.md` | 31741 | 4688 | 5/5 | True | `a4929593f1c7c9a2` |
| 811 | node1 | `gdrive_corpus_extractions/eb8e8dfc2e_openalex_W3132266770.pdf.md` | 58200 | 8501 | 5/5 | True | `fb37e7f2e5594281` |
| 812 | node1 | `gdrive_corpus_extractions/eb92b9ba9c_The_harsh_rule_of_goals_data_driven_perf.pdf.md` | 47906 | 7303 | 5/5 | True | `e1b525fcac0af4f7` |
| 813 | node1 | `gdrive_corpus_extractions/ebfd248e06_2019_-_A_Data_Driven_Goalkeeper_Evaluation_Framework_-_Unknown_Authors.pdf.md` | 51165 | 7232 | 5/5 | True | `f1290cdf843f0b54` |
| 814 | node1 | `gdrive_corpus_extractions/ec4a79528b_openalex_W2952964002.pdf.md` | 66503 | 9882 | 5/5 | True | `f5e07d0af2bcc2b6` |
| 815 | node1 | `gdrive_corpus_extractions/ec71684d5f_2022_-_Optimal_Pitch_Spin_Rate_and_Velocity_to_Maximize_Whiff_Rate_-_Park_et_al..md` | 49912 | 7113 | 5/5 | True | `62f9551fbd6bb607` |
| 816 | node1 | `gdrive_corpus_extractions/ec8e09715e_arxiv_2007.11984v1.pdf.md` | 40983 | 5649 | 5/5 | True | `314b2c192862e72b` |
| 817 | node1 | `gdrive_corpus_extractions/ec9d92d401_2604.08885v1.pdf.md` | 61714 | 8317 | 5/5 | True | `24d38867287c7156` |
| 818 | node1 | `gdrive_corpus_extractions/ed3428b990_2018_Asset_Pricing_and_Sports_Betting_-_Tobias_Moskowitz.pdf.md` | 53086 | 7614 | 5/5 | True | `0b485385742d85ab` |
| 819 | node1 | `gdrive_corpus_extractions/eef08e5486_2021_-_Decoding_MLB_Pitch_Sequencing_Strategies_via_Directed_Graph_Embeddings_-_.md` | 51329 | 7084 | 5/5 | True | `17a7e162cd8ae5fa` |
| 820 | node1 | `gdrive_corpus_extractions/eef13bc518_2609.17271v1.pdf.md` | 43726 | 6174 | 5/5 | True | `d97b3ef66d99bc6b` |
| 821 | node1 | `gdrive_corpus_extractions/ef0d87974a_mit-book.pdf.md` | 48631 | 6970 | 5/5 | True | `6a7c86aa6b12e4ce` |
| 822 | node1 | `gdrive_corpus_extractions/efe509a17e_arxiv_2310.11700v2.pdf.md` | 46607 | 6653 | 5/5 | True | `70c2dc36eaeb0e3e` |
| 823 | node1 | `gdrive_corpus_extractions/f014da4209_2013_To_Crash_or_not_to_crash_Slides.pdf.md` | 54048 | 7825 | 5/5 | True | `ecf719bb6889741e` |
| 824 | node1 | `gdrive_corpus_extractions/f0c8dd125c_2510.12323v1_1_.pdf.md` | 55661 | 7715 | 5/5 | True | `855a7853adb70b57` |
| 825 | node1 | `gdrive_corpus_extractions/f11744fac0_1912.11762.pdf.md` | 38858 | 5707 | 5/5 | True | `38da33dbb4148bab` |
| 826 | node1 | `gdrive_corpus_extractions/f12ca7ff91_2025_-_Tackling_Causality_Estimating_Frame-Level_Defensive_Impact_with_Multi-Age.md` | 54156 | 7329 | 5/5 | True | `0d089b78114156c9` |
| 827 | node1 | `gdrive_corpus_extractions/f1e3ba27a0_arxiv_2610.39093v1.pdf.md` | 58056 | 8572 | 5/5 | True | `d63af0f91e546d5a` |
| 828 | node1 | `gdrive_corpus_extractions/f2018b8935_arxiv_2405.08909v2.pdf.md` | 27501 | 3687 | 5/5 | True | `78e7d778dd7fe250` |
| 829 | node1 | `gdrive_corpus_extractions/f294069a56_LaValle-2006-PlanningAlgorithms.pdf.md` | 56163 | 8017 | 5/5 | True | `27067bac556d4f2a` |
| 830 | node1 | `gdrive_corpus_extractions/f2eecf3fdc_Devroye-1986-NonUniformRandomVariateGeneration.pdf.md` | 50333 | 7315 | 5/5 | True | `641e0020cb7c2c90` |
| 831 | node1 | `gdrive_corpus_extractions/f2f930e8b6__OceanofPDF.com_Freezing_Cold_Takes_NFL_-_Fred_Segal.pdf.md` | 45958 | 6755 | 5/5 | True | `ad7047052e4d861d` |
| 832 | node1 | `gdrive_corpus_extractions/f3adbcfe99_arxiv_2004.00367v1.pdf.md` | 68114 | 9687 | 5/5 | True | `29df54cdc395c941` |
| 833 | node1 | `gdrive_corpus_extractions/f47a99f57a_openalex_W2901486678.pdf.md` | 43844 | 6390 | 5/5 | True | `ad7ed33695e0b924` |
| 834 | node1 | `gdrive_corpus_extractions/f48d73adb6_2024_-_Quantifying_NFL_Quarterback_Aggressiveness_Using_aDOT_Over_Expected_AYOE_.md` | 43827 | 6361 | 5/5 | True | `d0cec0976fba7f42` |
| 835 | node1 | `gdrive_corpus_extractions/f4cb1a2ae4_openalex_W7133830480.pdf.md` | 26250 | 3384 | 5/5 | True | `47e55de0873d843f` |
| 836 | node1 | `gdrive_corpus_extractions/f5a3a75bda_arxiv_2110.03090v2.pdf.md` | 33122 | 5125 | 5/5 | True | `04b61000645d6b02` |
| 837 | node1 | `gdrive_corpus_extractions/f5caa76c5e_Camp-1920-Football-Without-a-Coach.pdf.md` | 58581 | 8905 | 5/5 | True | `79a0b4d9a47e9075` |
| 838 | node1 | `gdrive_corpus_extractions/f64b11a063_BarocasHardtNarayanan-2023-FairnessAndMachineLearning.pdf.md` | 31882 | 4226 | 5/5 | True | `f421bfb4801600b4` |
| 839 | node1 | `gdrive_corpus_extractions/f6b1292486_openalex_W3016766501.pdf.md` | 45301 | 6418 | 5/5 | True | `2058a7215945398d` |
| 840 | node1 | `gdrive_corpus_extractions/f775f93228_openalex_W7164066741.pdf.md` | 51002 | 7196 | 5/5 | True | `c180bae2333f7985` |
| 841 | node1 | `gdrive_corpus_extractions/f782039a7e_undated_-_A_Game_Theoretical_Approach_to_Optimal_Pitch_Sequencing_-_Melville_et_.md` | 31494 | 4660 | 5/5 | True | `5c1ed5c6221adb84` |
| 842 | node1 | `gdrive_corpus_extractions/f7b7784e43_bitstream_59010.pdf.md` | 52581 | 7627 | 5/5 | True | `8c666d49f851282f` |
| 843 | node1 | `gdrive_corpus_extractions/f7d71a4945_Football_Analytics_with_Python_and_R__Learning_Data_Science_1_.pdf.md` | 39883 | 5329 | 5/5 | True | `1fc38936fa9d3eff` |
| 844 | node1 | `gdrive_corpus_extractions/f80e81310e_2026_-_Quantifying_the_limits_of_human_athletic_performance_a_Bayesian_analysis_.md` | 57838 | 8240 | 5/5 | True | `66d52ee3383acd3b` |
| 845 | node1 | `gdrive_corpus_extractions/f86053b1ee_2026_-_Quantifying_and_Predicting_Pitch_Sequence_Effectiveness_Using_Visual_Dece.md` | 50408 | 7280 | 5/5 | True | `1fba7f59a5209fb8` |
| 846 | node1 | `gdrive_corpus_extractions/f87506e6c1_openalex_W4409263260.pdf.md` | 62986 | 9307 | 5/5 | True | `ed03e08312a3d0e5` |
| 847 | node1 | `gdrive_corpus_extractions/f8ac7ca2cf_openalex_W2556993384.pdf.md` | 56646 | 7754 | 5/5 | True | `d85f6f6d1d5dfdd9` |
| 848 | node1 | `gdrive_corpus_extractions/f9078f94be_2026_-_Effects_of_Attachment_Type_on_Phase-Specific_Surface_Electromyographic_Am.md` | 64602 | 8933 | 5/5 | True | `cfe319e99f24873a` |
| 849 | node1 | `gdrive_corpus_extractions/f90e9f9bef_arxiv_2511.04126v1.pdf.md` | 55635 | 7762 | 5/5 | True | `ea03920d66be6c13` |
| 850 | node1 | `gdrive_corpus_extractions/f93881361f_file_1726508125ivhrv.pdf.md` | 46704 | 6651 | 5/5 | True | `5c1845b180df6577` |
| 851 | node1 | `gdrive_corpus_extractions/f9c7a5b86b_arxiv_2012.13755v2.pdf.md` | 34130 | 4829 | 5/5 | True | `20a35c34e7c868c3` |
| 852 | node1 | `gdrive_corpus_extractions/fa8dabed4c_2305.13654v3.pdf.md` | 39869 | 5524 | 5/5 | True | `2759f65a03311d02` |
| 853 | node1 | `gdrive_corpus_extractions/fa99099a52_arxiv_2607.07320v1.pdf.md` | 43565 | 6045 | 5/5 | True | `3e482db9be4b1f24` |
| 854 | node1 | `gdrive_corpus_extractions/faa8a4b9ce_2024_-_Editor_s_note_on_fairness_in_sports_analytics_-_Baumer.pdf.md` | 52540 | 7585 | 5/5 | True | `846ff33389a3020c` |
| 855 | node1 | `gdrive_corpus_extractions/fae2542946_Python_Geospatial_Development_2010_.pdf.md` | 60832 | 8493 | 5/5 | True | `4581cb65492b1c87` |
| 856 | node1 | `gdrive_corpus_extractions/fb1f9b707d_2026_-_Wide_Open_Gazes_Quantifying_Visual_Exploratory_Behavior_in_Soccer_with_Po.md` | 61827 | 9281 | 5/5 | True | `d456d807e7ea6c3c` |
| 857 | node1 | `gdrive_corpus_extractions/fb6324976b_HF_ULTRASCALE_PLAYBOOK.pdf.md` | 33781 | 5085 | 5/5 | True | `4e6e2076a0b0cdee` |
| 858 | node1 | `gdrive_corpus_extractions/fb6f455a7e_arxiv_2610.36183v1.pdf.md` | 48532 | 6969 | 5/5 | True | `270e695c165d7134` |
| 859 | node1 | `gdrive_corpus_extractions/fbd2852834_Player_Progression_Guide_Template__331225796__Full_Book-20190725135347.pdf.md` | 45516 | 6242 | 5/5 | True | `8d2a3a3eb555e0ed` |
| 860 | node1 | `gdrive_corpus_extractions/fc047c3d26_arxiv_2406.20024v3.pdf.md` | 43224 | 6160 | 5/5 | True | `7b6c7ef5a6d64702` |
| 861 | node1 | `gdrive_corpus_extractions/fc14c3f41c_openalex_W4360859055.pdf.md` | 33391 | 4689 | 5/5 | True | `38a75fc866f31f37` |
| 862 | node1 | `gdrive_corpus_extractions/fc6934f85a_openalex_W4285818118.pdf.md` | 63521 | 9048 | 5/5 | True | `4a219d298d773fa5` |
| 863 | node1 | `gdrive_corpus_extractions/fc9c5a85c1_arxiv_2211.09663v1.pdf.md` | 48984 | 6986 | 5/5 | True | `baa219694fd301f4` |
| 864 | node1 | `gdrive_corpus_extractions/fce7da849d_openalex_W2614793251.pdf.md` | 63884 | 9234 | 5/5 | True | `a0e93903555e73df` |
| 865 | node1 | `gdrive_corpus_extractions/fd84a547d4_openalex_W4362549158.pdf.md` | 55346 | 7660 | 5/5 | True | `4ffa8be91ce61236` |
| 866 | node1 | `gdrive_corpus_extractions/fd96333279_Galton-1889-NaturalInheritance.pdf.md` | 58301 | 8009 | 5/5 | True | `eed3ffdf89f75bd8` |
| 867 | node1 | `gdrive_corpus_extractions/fd98ef4e92_vmls_boyd_vandenberghe.pdf.md` | 61072 | 8947 | 5/5 | True | `cccfdb58e4bd6082` |
| 868 | node1 | `gdrive_corpus_extractions/fec46c0780_The_Essential_Smart_Football_PDF.pdf.md` | 33318 | 4972 | 5/5 | True | `6e94a12ed00d5991` |
| 869 | node1 | `gdrive_corpus_extractions/ff320e2695_2021_Classification_of_all-rounders_in_limited_over_cricket_-_a_machine_learning.md` | 48562 | 6977 | 5/5 | True | `9f79377acb00aa6b` |
| 870 | node1 | `gdrive_corpus_extractions/gdoc_139de_GSI_GSE_11_5.md` | 53725 | 7494 | 5/5 | True | `422ea3a729f2750a` |
| 871 | node1 | `gdrive_corpus_extractions/gdoc_15d08_GSE_Coach_Simulation_Audits_1_-_Copy.md` | 45605 | 6403 | 5/5 | True | `ce132e20d39873a6` |
| 872 | node1 | `gdrive_corpus_extractions/gdoc_1I3_f_GSE_Sealed_Architecture_Primary_Sources_1_.md` | 47179 | 6471 | 5/5 | True | `efc1ed56058327df` |
| 873 | node1 | `gdrive_corpus_extractions/gdoc_1Z0M3_GSE_Sealed_Architecture_Primary_Sources.md` | 53211 | 7415 | 5/5 | True | `b812498fec6d1435` |
| 874 | node2 | `gdrive_corpus_extractions/0008ff1697_1906.05029.pdf.md` | 59211 | 8717 | 5/5 | True | `109d098eaeb38661` |
| 875 | node2 | `gdrive_corpus_extractions/000ebb065c_1505.01462v1.pdf.md` | 55614 | 7605 | 5/5 | True | `be471ab6fee248e3` |
| 876 | node2 | `gdrive_corpus_extractions/006560b114_Yost-1905-Football-for-Player-and-Spectator.pdf.md` | 44024 | 6362 | 5/5 | True | `8cff26ad1dea8de3` |
| 877 | node2 | `gdrive_corpus_extractions/00f1c233ad_Bertsekas-2020-RolloutPolicyIterationAndDistributedRL.pdf.md` | 49209 | 6867 | 5/5 | True | `bc56a3e9d27605fc` |
| 878 | node2 | `gdrive_corpus_extractions/01301d239e_2025_-_Poise_or_Panic_Breaking_Down_QB_Pressure_-_Hafiz_et_al.pdf.md` | 29157 | 4210 | 5/5 | True | `2c2da0755dbbd207` |
| 879 | node2 | `gdrive_corpus_extractions/01509c4a9f_1906.04066v1.pdf.md` | 49288 | 7084 | 5/5 | True | `bf26573089f0f0c1` |
| 880 | node2 | `gdrive_corpus_extractions/0264720809_390237-1116491-1-PB.pdf.md` | 52634 | 6368 | 5/5 | True | `b1e22ba2062a4d62` |
| 881 | node2 | `gdrive_corpus_extractions/02d6233e65_2007_-_Real-world_challenges_in_the_pursuit_of_Olympic_excellence_-_Unknown_Auth.md` | 56966 | 8058 | 5/5 | True | `182556ee7d8febe6` |
| 882 | node2 | `gdrive_corpus_extractions/035f7e55cd_arxiv_2504.10106v1.pdf.md` | 67040 | 9519 | 5/5 | True | `f381f9cd5de80b2d` |
| 883 | node2 | `gdrive_corpus_extractions/0375b192f2_openalex_W3165325799.pdf.md` | 37245 | 5428 | 5/5 | True | `4a32c73ed04388d5` |
| 884 | node2 | `gdrive_corpus_extractions/03a20a2802_openalex_W4413945574.pdf.md` | 55951 | 8049 | 5/5 | True | `9c25b677a56c1f31` |
| 885 | node2 | `gdrive_corpus_extractions/048ab65040_openalex_W3126885275.pdf.md` | 37261 | 5757 | 5/5 | True | `c4e16f78e67f8d39` |
| 886 | node2 | `gdrive_corpus_extractions/0500ea03ba_VonNeumannMorgenstern-1944-TheoryOfGamesAndEconomicBehavior.pdf.md` | 47603 | 7066 | 5/5 | True | `c840922430cc19fe` |
| 887 | node2 | `gdrive_corpus_extractions/0504db3c5f_1710.02824.pdf.md` | 33067 | 4924 | 5/5 | True | `eafc21c73caca1b1` |
| 888 | node2 | `gdrive_corpus_extractions/064bdf2b01_openalex_W4238420800.pdf.md` | 54950 | 7712 | 5/5 | True | `b0f27defa4838c97` |
| 889 | node2 | `gdrive_corpus_extractions/076a55c842_openalex_W3204832317.pdf.md` | 62696 | 9283 | 5/5 | True | `d40167d169c1de77` |
| 890 | node2 | `gdrive_corpus_extractions/076aa27cc5_Boole-1854-LawsOfThought.pdf.md` | 49420 | 7303 | 5/5 | True | `cc019aa01bddc4c9` |
| 891 | node2 | `gdrive_corpus_extractions/07ae773d4b_2015_Graphical_Model_for_Basketball_Match_Simulation.pdf.md` | 44232 | 6162 | 5/5 | True | `9fbcc60e4317a7e0` |
| 892 | node2 | `gdrive_corpus_extractions/081cb559c2_Extending_Power_BI_with_Python_and_R_bibis.ir.pdf.md` | 40579 | 5830 | 5/5 | True | `aedc78a48c4b5dec` |
| 893 | node2 | `gdrive_corpus_extractions/088650005a_Hall-Beej-GuideToNetworkProgramming.pdf.md` | 55800 | 8392 | 5/5 | True | `a7521b9f8cb0f88f` |
| 894 | node2 | `gdrive_corpus_extractions/088842d499_2021_-_Making_Offensive_Play_Predictable_-_Using_a_Graph_Convolutional_Network_t.md` | 71382 | 10590 | 5/5 | True | `c7107f42f1214d6e` |
| 895 | node2 | `gdrive_corpus_extractions/08a5fb55e2_FILTERING_PROCEDURES_FOR_SENSOR_DATA_IN.pdf.md` | 36057 | 5512 | 5/5 | True | `e7c8422b7dd8611e` |
| 896 | node2 | `gdrive_corpus_extractions/09143298c0_WHITEPAPER_DITO_Quantum_computing_guide_navigating_future_2024.pdf.md` | 59315 | 8847 | 5/5 | True | `7f1bb5bdd80d205d` |
| 897 | node2 | `gdrive_corpus_extractions/092df9a46a_ArpaciDusseau-2018-OperatingSystemsThreeEasyPieces-FreeEd.pdf.md` | 47410 | 7152 | 5/5 | True | `37e8f626af7491d3` |
| 898 | node2 | `gdrive_corpus_extractions/09582cb542_2019_Analyzing_National_Football_League_is_Challenging_but_player_tracking_data_.md` | 56863 | 8318 | 5/5 | True | `37c478df1ad71c7d` |
| 899 | node2 | `gdrive_corpus_extractions/09b5e50643_2024_Player_Pressure_Map_-_A_Novel_Representation_of_Pressure_in_Soccer.pdf.md` | 53441 | 7616 | 5/5 | True | `0d239f80c10790e2` |
| 900 | node2 | `gdrive_corpus_extractions/0a5766ab1b_openalex_W4385967521.pdf.md` | 32360 | 4725 | 5/5 | True | `21be41ede6d509e2` |
| 901 | node2 | `gdrive_corpus_extractions/0acfaad2da_openalex_W4229081576.pdf.md` | 53853 | 7966 | 5/5 | True | `5f612324c777db2b` |
| 902 | node2 | `gdrive_corpus_extractions/0bb0d9695c_MarshallEtAl-2018-ONF-GuidelineConcussion-mTBI-PersistentSymptoms-3rdEd.pdf.md` | 52292 | 7375 | 5/5 | True | `22c8744213c60ba9` |
| 903 | node2 | `gdrive_corpus_extractions/0c02c391a6_arxiv_2407.09736v1.pdf.md` | 56238 | 7707 | 5/5 | True | `cd142552ffdca89f` |
| 904 | node2 | `gdrive_corpus_extractions/0c6069c3de_Lan2020_Article_Semi-onlineMulti-peopleTrackin.pdf.md` | 67205 | 9962 | 5/5 | True | `66c291b01a614ac0` |
| 905 | node2 | `gdrive_corpus_extractions/0ca226f3b0_Goncalves-Bravo-Folgado-2022-Training-Methods-Sports-Performance-Health-MDPI.pdf.md` | 46234 | 6658 | 5/5 | True | `ff5aed75352b75f6` |
| 906 | node2 | `gdrive_corpus_extractions/0cc9064758_openalex_W2955895625.pdf.md` | 58396 | 8549 | 5/5 | True | `9ef21c22a204d153` |
| 907 | node2 | `gdrive_corpus_extractions/0cd756909e_10.1201_9781003364320_previewpdf.pdf.md` | 59937 | 8786 | 5/5 | True | `3bd866f4a0dfe28d` |
| 908 | node2 | `gdrive_corpus_extractions/0d11da5330_openalex_W2963807718.pdf.md` | 59643 | 8358 | 5/5 | True | `3faa8cd889e8cec8` |
| 909 | node2 | `gdrive_corpus_extractions/0d3517864b_arxiv_1704.06378v1.pdf.md` | 49622 | 7193 | 5/5 | True | `ca02029f06aea4b8` |
| 910 | node2 | `gdrive_corpus_extractions/0d5c2de383_2402.10243v1.pdf.md` | 63013 | 8962 | 5/5 | True | `576630d28eda3692` |
| 911 | node2 | `gdrive_corpus_extractions/0d67bfbe1f_2024_Lasso_Multinomial_Performance_Indicators_for_in-play_Basketball_Data_-_Damo.md` | 58934 | 7983 | 5/5 | True | `cfd350f4456c65f3` |
| 912 | node2 | `gdrive_corpus_extractions/0d95543c1e_arxiv_2604.08722v1.pdf.md` | 55573 | 7759 | 5/5 | True | `4eccf9904e6b2405` |
| 913 | node2 | `gdrive_corpus_extractions/0da5b03f6f_Laplace-1814-PhilosophicalEssayOnProbabilities.pdf.md` | 48432 | 6773 | 5/5 | True | `288133f8a96aa04a` |
| 914 | node2 | `gdrive_corpus_extractions/0e4991e56f_2505.08665v5.pdf.md` | 60415 | 8205 | 5/5 | True | `c5da086b36cf6dbc` |
| 915 | node2 | `gdrive_corpus_extractions/0f63b2302c_openalex_W2601805314.pdf.md` | 58129 | 8855 | 5/5 | True | `b76eeeff77246a4a` |
| 916 | node2 | `gdrive_corpus_extractions/0fc802a455_AndelicEtAlEds-2022-NewPerspectivesRehabilitationAfterTBI-MDPI.pdf.md` | 69466 | 9616 | 5/5 | True | `bdf8eb8b0c168cae` |
| 917 | node2 | `gdrive_corpus_extractions/1045461bfb_2511.00261v2.pdf.md` | 64409 | 9259 | 5/5 | True | `f778328541a0b092` |
| 918 | node2 | `gdrive_corpus_extractions/10dcdb521a_arxiv_2311.14642v1.pdf.md` | 39241 | 5612 | 5/5 | True | `e32a6a3487274836` |
| 919 | node2 | `gdrive_corpus_extractions/10e099df49_2022_-_Optical_tracking_in_team_sports_A_survey_on_player_and_ball_tracking_meth.md` | 43002 | 6415 | 5/5 | True | `5d03d20d6e22217f` |
| 920 | node2 | `gdrive_corpus_extractions/1113a28cd6_Hamilton-2020-GraphRepresentationLearning.pdf.md` | 45186 | 6098 | 5/5 | True | `5c61f435e1de1051` |
| 921 | node2 | `gdrive_corpus_extractions/11ad804ac6_1607.01756.pdf.md` | 58145 | 8179 | 5/5 | True | `c13a32e5dfe7f04e` |
| 922 | node2 | `gdrive_corpus_extractions/1207b1e230_2019_Using_In-Game_Shot_Trajectories_to_Better_Understand_Defensive_Impact_in_th.md` | 37835 | 5339 | 5/5 | True | `ef6aa6213d656185` |
| 923 | node2 | `gdrive_corpus_extractions/12f0edc5dd_arxiv_2506.22503v1.pdf.md` | 47513 | 6638 | 5/5 | True | `57146ce83d15ed75` |
| 924 | node2 | `gdrive_corpus_extractions/135d648bdc_Measuring_sport_performances_under_press.pdf.md` | 44342 | 6399 | 5/5 | True | `44d528a59a1c2b4a` |
| 925 | node2 | `gdrive_corpus_extractions/1370caa081_Stagg-1927-Touchdown.pdf.md` | 65111 | 10041 | 5/5 | True | `74595b11ab39f0d3` |
| 926 | node2 | `gdrive_corpus_extractions/13a2013b04_undated_-_Detection_of_tactical_patterns_using_semi-supervised_graph_neural_netw.md` | 41070 | 5746 | 5/5 | True | `40906325f15c4ed0` |
| 927 | node2 | `gdrive_corpus_extractions/13b89caf89_arxiv_2511.18730v1.pdf.md` | 32853 | 4561 | 5/5 | True | `ad7212d887807860` |
| 928 | node2 | `gdrive_corpus_extractions/13bae4ddcb_LaValle-2006-PlanningAlgorithms.pdf.md` | 52816 | 7666 | 5/5 | True | `7fd3dbad9c532b1e` |
| 929 | node2 | `gdrive_corpus_extractions/141f7a9af4_arxiv_2502.16313v1.pdf.md` | 61089 | 8622 | 5/5 | True | `4649ecd61b58431b` |
| 930 | node2 | `gdrive_corpus_extractions/145a62d06a_Hitting_Is_Contagious_in_Baseball_Evidence.pdf.md` | 53827 | 7796 | 5/5 | True | `3929fdbc4b81534d` |
| 931 | node2 | `gdrive_corpus_extractions/14862f2e56_openalex_W7222014487.pdf.md` | 54009 | 7720 | 5/5 | True | `459e699bafd8acb8` |
| 932 | node2 | `gdrive_corpus_extractions/148988ec9e_openalex_W2788692190.pdf.md` | 51014 | 7164 | 5/5 | True | `559c681e4471286d` |
| 933 | node2 | `gdrive_corpus_extractions/14b5df5dcd_arxiv_1712.08714v1.pdf.md` | 53570 | 7381 | 5/5 | True | `5427e8d85c075943` |
| 934 | node2 | `gdrive_corpus_extractions/14e3d2134d_openalex_W1500008659.pdf.md` | 54356 | 8302 | 5/5 | True | `07c6f40fce8dd147` |
| 935 | node2 | `gdrive_corpus_extractions/150bfb7af2_arxiv_2306.16568v3.pdf.md` | 31709 | 4580 | 5/5 | True | `f204f381336dcb65` |
| 936 | node2 | `gdrive_corpus_extractions/1558b2eab7_openalex_W7138160877.pdf.md` | 35219 | 4933 | 5/5 | True | `6c5a28768749731c` |
| 937 | node2 | `gdrive_corpus_extractions/16188dffb8_2024_-_GoalNet_Advancing_Counterattack_Prediction_in_Soccer_through_Gender-Speci.md` | 55549 | 7904 | 5/5 | True | `76ef830ef36868c4` |
| 938 | node2 | `gdrive_corpus_extractions/161a637595_1910.07410.pdf.md` | 56139 | 7998 | 5/5 | True | `50ada0f691872833` |
| 939 | node2 | `gdrive_corpus_extractions/16324775cf_2607.18461.pdf.md` | 37045 | 5513 | 5/5 | True | `41f0eded02b6e7e9` |
| 940 | node2 | `gdrive_corpus_extractions/169842cdc3_arxiv_1801.02302v2.pdf.md` | 49842 | 6886 | 5/5 | True | `8e09e5d9c7d9cbcb` |
| 941 | node2 | `gdrive_corpus_extractions/177c663730_2015_Improving_Shot_Prediction_in_Soccer.pdf.md` | 65255 | 9867 | 5/5 | True | `332b2ddfba63818f` |
| 942 | node2 | `gdrive_corpus_extractions/17e8989154_2019_Analytics_for_the_Front_Office_-_Valuing_Protections_on_NBA_Draft_Picks.pdf.md` | 45583 | 6655 | 5/5 | True | `79c6ddc5afc6a886` |
| 943 | node2 | `gdrive_corpus_extractions/18a9480600_2024_-_College_Basketball_An_In-depth_Study_of_the_Foul_Up_3_Dilemma_-_Zapata-Ha.md` | 35254 | 5309 | 5/5 | True | `31ef8e544109b7cf` |
| 944 | node2 | `gdrive_corpus_extractions/1947614011_openalex_W4281711932.pdf.md` | 41389 | 5932 | 5/5 | True | `f7f6b0d5937db5f2` |
| 945 | node2 | `gdrive_corpus_extractions/1a33c60f2d_2016_Footballonomics_-_The_Anatomy_of_American_Football_-_Pelechrinis_Papalexaki.md` | 52639 | 7814 | 5/5 | True | `360148c9e8c30c83` |
| 946 | node2 | `gdrive_corpus_extractions/1a7c900665_arxiv_2501.04712v2.pdf.md` | 51248 | 7294 | 5/5 | True | `7955f0490978871c` |
| 947 | node2 | `gdrive_corpus_extractions/1a9a0909c0_2013_-_Trends_in_Singles_Play_Intensity_on_the_ATP_Tour_-_Unknown_Authors.pdf.md` | 58056 | 8597 | 5/5 | True | `c9eae3b756f7321d` |
| 948 | node2 | `gdrive_corpus_extractions/1b253ccbf1_2026_-_A_Markov_Chain_Approach_to_Modeling_Rugby_Union_-_Watts_et_al.pdf.md` | 42399 | 6373 | 5/5 | True | `3156444f5dd04b6d` |
| 949 | node2 | `gdrive_corpus_extractions/1c36b047ef_arxiv_1906.02042v2.pdf.md` | 54641 | 7890 | 5/5 | True | `b6619c148e802dea` |
| 950 | node2 | `gdrive_corpus_extractions/1cda9107f8_2026_-_Kicking_for_Goal_or_Touch_An_Expected_Points_Framework_for_Penalty_Decisi.md` | 61593 | 8715 | 5/5 | True | `34f2d5cbf4aae109` |
| 951 | node2 | `gdrive_corpus_extractions/1d1fe4eb5a_2025_-_Analyzing_Movement_Dynamics_in_Elite_Female_Soccer_Athletes_-_Unknown_Aut.md` | 51047 | 6744 | 5/5 | True | `364d3168eb421295` |
| 952 | node2 | `gdrive_corpus_extractions/1db4699325_2019_-_A_Bayesian_Joint_Model_for_Spatial_Point_Process_with_Application_to_Bask.md` | 67168 | 9352 | 5/5 | True | `d4e564dc8ebbd68e` |
| 953 | node2 | `gdrive_corpus_extractions/1db46a15f7_2017_Passing_Behavior_Flow_Motifs.pdf.md` | 50616 | 7309 | 5/5 | True | `e4ba3b777a522b17` |
| 954 | node2 | `gdrive_corpus_extractions/1ddec33b42_Willaman-1928-Football-Today-and-Tomorrow.pdf.md` | 56109 | 8625 | 5/5 | True | `93f5913d59929e4a` |
| 955 | node2 | `gdrive_corpus_extractions/1df2e2440d_BronsteinEtAl-2021-GeometricDeepLearning.pdf.md` | 63017 | 8942 | 5/5 | True | `5e253cbce28b5a1f` |
| 956 | node2 | `gdrive_corpus_extractions/1df436cc77_arxiv_1511.06181v2.pdf.md` | 48386 | 7025 | 5/5 | True | `6daf129e31c36e03` |
| 957 | node2 | `gdrive_corpus_extractions/1e09d887c1_openalex_W2963274633.pdf.md` | 61254 | 8776 | 5/5 | True | `cc94f0d19eb7ff83` |
| 958 | node2 | `gdrive_corpus_extractions/1e13bda610_openalex_W4309231083.pdf.md` | 52674 | 7717 | 5/5 | True | `647656647fb724b0` |
| 959 | node2 | `gdrive_corpus_extractions/1e85af0c69_2021_-_Leaving_Goals_on_the_Pitch_Evaluating_Decision_Making_in_Soccer_-_Unknown.md` | 39581 | 5798 | 5/5 | True | `fff144a43128fd5d` |
| 960 | node2 | `gdrive_corpus_extractions/1eb3d08097_openalex_W4393364605.pdf.md` | 40221 | 5657 | 5/5 | True | `894cb9ae247d32ce` |
| 961 | node2 | `gdrive_corpus_extractions/1eeca5a98a_2026_-_Influence_of_Repeated-Sprint_Bout_Duration_in_Sprint_Interval_Training_In.md` | 29479 | 4239 | 5/5 | True | `c5d1bb9f39f6ef4c` |
| 962 | node2 | `gdrive_corpus_extractions/201a3d0092_2026_-_Fast_Hybrid_Search_for_Red-Zone_Play_Recommendations_-_Khan_et_al.pdf.md` | 42988 | 6069 | 5/5 | True | `76c42e04bf907cb7` |
| 963 | node2 | `gdrive_corpus_extractions/202b4c0ab7_undated_-_Decomposing_the_Immeasurable_Sport_A_deep_learning_expected_possession.md` | 35294 | 5005 | 5/5 | True | `26701d46d95bcb8f` |
| 964 | node2 | `gdrive_corpus_extractions/206594f1eb_AroraBarak-2009-ComputationalComplexity.pdf.md` | 38015 | 5444 | 5/5 | True | `8635d27e6793dba4` |
| 965 | node2 | `gdrive_corpus_extractions/2088f8f3dc_2018_-_Using_Computer_Vision_and_Machine_Learning_to_Automatically_Classify_NFL_.md` | 26755 | 3698 | 5/5 | True | `4b36d1cbacdd6b22` |
| 966 | node2 | `gdrive_corpus_extractions/20cf658333_openalex_W3127579382.pdf.md` | 50218 | 7401 | 5/5 | True | `063c1b6b3c2657f6` |
| 967 | node2 | `gdrive_corpus_extractions/2124e9fbe3_2606.05966v1.pdf.md` | 43005 | 6136 | 5/5 | True | `d3e3bbc45b1f293d` |
| 968 | node2 | `gdrive_corpus_extractions/21e10e1f61_2603.26575v1.pdf.md` | 48945 | 7222 | 5/5 | True | `d9e2c01444f06e9b` |
| 969 | node2 | `gdrive_corpus_extractions/21eaf19587_2026_-_Predictive_Effect_of_Echocardiographic_Assessment_of_Myocardial_Efficienc.md` | 50854 | 7050 | 5/5 | True | `67adf5b3c8c77f02` |
| 970 | node2 | `gdrive_corpus_extractions/22a44c9931_2015_-_Assessing_the_offensive_productivity_of_NHL_players_using_in-game_win_pro.md` | 51373 | 7636 | 5/5 | True | `4150af931135f906` |
| 971 | node2 | `gdrive_corpus_extractions/22b3a09e9a_openalex_W4404643469.pdf.md` | 28612 | 4146 | 5/5 | True | `04bfb275f1fff913` |
| 972 | node2 | `gdrive_corpus_extractions/22b82cdd5b_2020_-_Quantifying_Passing_Using_NBA_Tracking_Data_to_Create_an_Expected_Assist_.md` | 57164 | 8245 | 5/5 | True | `d9350bf481b47812` |
| 973 | node2 | `gdrive_corpus_extractions/22b882028d_2609.01337v1.pdf.md` | 52071 | 7249 | 5/5 | True | `8e4ad9382ef74aec` |
| 974 | node2 | `gdrive_corpus_extractions/22df77ea75_2026_-_Hop_Test_Performance_is_Associated_with_Return-to-Sport_but_Shows_Limited.md` | 31095 | 4611 | 5/5 | True | `cca3fb94c5a52f30` |
| 975 | node2 | `gdrive_corpus_extractions/232014a839_ifafrules.pdf.md` | 69793 | 10729 | 5/5 | True | `4841c550930b9512` |
| 976 | node2 | `gdrive_corpus_extractions/2331f41fe6_openalex_W4298394572.pdf.md` | 32260 | 4338 | 5/5 | True | `584a5be0c338a037` |
| 977 | node2 | `gdrive_corpus_extractions/2359976323_2012_-_Using_Conditional_Estimates_to_Simulate_In-Play_Outcomes_in_Limited_Overs.md` | 41750 | 6093 | 5/5 | True | `5af7a10afb201c2b` |
| 978 | node2 | `gdrive_corpus_extractions/2378152d3a_arxiv_2306.04090v3.pdf.md` | 34861 | 5265 | 5/5 | True | `3df39f4985fffbc1` |
| 979 | node2 | `gdrive_corpus_extractions/23d50a8065_2605.05997v2.pdf.md` | 50901 | 7033 | 5/5 | True | `22326655cbdd50c2` |
| 980 | node2 | `gdrive_corpus_extractions/23da69684c__15590410_-_Journal_of_Quantitative_Analysis_in_Sports_An_analytical_approach_fo.md` | 33858 | 4921 | 5/5 | True | `42c9588bb10fd731` |
| 981 | node2 | `gdrive_corpus_extractions/242425c21c_openalex_W4416335655.pdf.md` | 29692 | 4358 | 5/5 | True | `04e7716587bd4008` |
| 982 | node2 | `gdrive_corpus_extractions/2460428df3_2022_-_Predicting_the_Quarterback-MVP_in_the_NFL_-_Brill_et_al.pdf.md` | 61772 | 9161 | 5/5 | True | `d255a7926543003f` |
| 983 | node2 | `gdrive_corpus_extractions/24a0963559_openalex_W3016139316.pdf.md` | 26554 | 3513 | 5/5 | True | `28362bee793959e4` |
| 984 | node2 | `gdrive_corpus_extractions/24dff9ca8f_1708.06694v2.pdf.md` | 64036 | 9433 | 5/5 | True | `5289103a61f22e9e` |
| 985 | node2 | `gdrive_corpus_extractions/24e630a20a_978-3-319-41285-6.pdf.md` | 62122 | 8652 | 5/5 | True | `4707eda62431a484` |
| 986 | node2 | `gdrive_corpus_extractions/2570990269_2023_-_cricWAR_A_reproducible_system_for_evaluating_player_performance_in_limite.md` | 46568 | 6576 | 5/5 | True | `3950504f165160c6` |
| 987 | node2 | `gdrive_corpus_extractions/25780ffd34_Hatcher-2002-AlgebraicTopology.pdf.md` | 64960 | 9483 | 5/5 | True | `2694306c2287c9ae` |
| 988 | node2 | `gdrive_corpus_extractions/258a4548fe_arxiv_1711.03799v3.pdf.md` | 54964 | 7336 | 5/5 | True | `5c699e79dc33f941` |
| 989 | node2 | `gdrive_corpus_extractions/25a293e307_arxiv_1902.03604v2.pdf.md` | 40544 | 6055 | 5/5 | True | `ac46a35af2cb9178` |
| 990 | node2 | `gdrive_corpus_extractions/25ab1017be_openalex_W7137100366.pdf.md` | 49477 | 7340 | 5/5 | True | `eb4f4f6320f8f6c6` |
| 991 | node2 | `gdrive_corpus_extractions/265b63c94b_openalex_W4406488955.pdf.md` | 28934 | 4058 | 5/5 | True | `b0f71d821795e932` |
| 992 | node2 | `gdrive_corpus_extractions/2666dbe1df_Hazan-2022-IntroductionToOnlineConvexOptimization.pdf.md` | 41932 | 6067 | 5/5 | True | `6128939b99c30040` |
| 993 | node2 | `gdrive_corpus_extractions/268f4f141c_arxiv_2204.07482v1.pdf.md` | 48103 | 6573 | 5/5 | True | `5a105b3a8f1c791b` |
| 994 | node2 | `gdrive_corpus_extractions/26b259acd3_2025_-_Causal_Impact_of_Offensive_Linemen_on_Pass_Plays_-_Ben.pdf.md` | 51268 | 7181 | 5/5 | True | `e7f6a7a9fc460bf0` |
| 995 | node2 | `gdrive_corpus_extractions/26bfb2dff5_learn-to-code-with-fantasy-football.pdf.md` | 63897 | 9131 | 5/5 | True | `7b1bb6ff9a4cda10` |
| 996 | node2 | `gdrive_corpus_extractions/26f356b63e_arxiv_2311.03561v2.pdf.md` | 70439 | 10184 | 5/5 | True | `3d3a4f3a6e5e195a` |
| 997 | node2 | `gdrive_corpus_extractions/2792c44405_Wilce-1923-Football-How-to-Play-It-and-How-to-Understand-It.pdf.md` | 57413 | 9344 | 5/5 | True | `b190086f645bd6fd` |
| 998 | node2 | `gdrive_corpus_extractions/27fa7ee3ff_arxiv_2107.05150v1.pdf.md` | 55126 | 7796 | 5/5 | True | `578cd507967c57ac` |
| 999 | node2 | `gdrive_corpus_extractions/2826acb559_2603.07091v1.pdf.md` | 47611 | 6477 | 5/5 | True | `af17eb8c0b947cb9` |
| 1000 | node2 | `gdrive_corpus_extractions/2836bd3fca_openalex_W2964328071.pdf.md` | 28758 | 3988 | 5/5 | True | `debac81325b8e43f` |
| 1001 | node2 | `gdrive_corpus_extractions/28a221e53e_2026_-_BMASH_Ball-Motion-Aware_Soccer_Header_Spotting_-_Hasen_et_al.pdf.md` | 57406 | 8926 | 5/5 | True | `b53dcbc47bd329bb` |
| 1002 | node2 | `gdrive_corpus_extractions/28e46a02b3_Daume-2017-CourseInMachineLearning.pdf.md` | 43558 | 6276 | 5/5 | True | `e97f0d7b67584822` |
| 1003 | node2 | `gdrive_corpus_extractions/28fc720e47_arxiv_2309.16987v1.pdf.md` | 55563 | 8072 | 5/5 | True | `63742480b1cfeaa4` |
| 1004 | node2 | `gdrive_corpus_extractions/297424578d_openalex_W4390601226.pdf.md` | 69946 | 10466 | 5/5 | True | `35c4aa5a12984e4c` |
| 1005 | node2 | `gdrive_corpus_extractions/2a03a950f2_Foundations_of_Probabilistic_Programming.pdf.md` | 66880 | 9004 | 5/5 | True | `6dba32764aa9176f` |
| 1006 | node2 | `gdrive_corpus_extractions/2a2210496b_2020_Nuclear_penalized_multiomial_regression_with_an_application_to_prediction_a.md` | 39175 | 5517 | 5/5 | True | `23a0a79ecae32f21` |
| 1007 | node2 | `gdrive_corpus_extractions/2afe98a520_2023_-_Identifying_Key_Players_and_Playing_Styles_of_10_English_Premier_League_T.md` | 36538 | 5213 | 5/5 | True | `6869454f3dd471fa` |
| 1008 | node2 | `gdrive_corpus_extractions/2cac887005_2021_-_Routine_Inspection_A_playbook_for_corner_kicks_-_Unknown_Authors.pdf.md` | 60910 | 8776 | 5/5 | True | `19f5d35f4ec32502` |
| 1009 | node2 | `gdrive_corpus_extractions/2cc6418bc3_openalex_W4319300181.pdf.md` | 30188 | 4698 | 5/5 | True | `c2977d039358930e` |
| 1010 | node2 | `gdrive_corpus_extractions/2d8e6869ed_Fleuret-2023-LittleBookOfDeepLearning.pdf.md` | 55734 | 7765 | 5/5 | True | `0d199114925f8c62` |
| 1011 | node2 | `gdrive_corpus_extractions/2d99d62aed_2609.13453v1.pdf.md` | 53614 | 7912 | 5/5 | True | `1b4e11902bf48e4a` |
| 1012 | node2 | `gdrive_corpus_extractions/2da9099a76_2026_-_Characterizing_and_Controlling_the_Perceived_Competitive_Balance_in_Sport.md` | 57579 | 8408 | 5/5 | True | `4954601f79311fd6` |
| 1013 | node2 | `gdrive_corpus_extractions/2dc74383cd_openalex_W4417112759.pdf.md` | 62841 | 8766 | 5/5 | True | `7c2296d7c01f53ab` |
| 1014 | node2 | `gdrive_corpus_extractions/2dcb633075_openalex_W7222646693.pdf.md` | 59799 | 8349 | 5/5 | True | `d6402c514a97fb90` |
| 1015 | node2 | `gdrive_corpus_extractions/2e2cb4b9ce_Taleb-2020-StatisticalConsequencesOfFatTails.pdf.md` | 28116 | 3948 | 5/5 | True | `5ab913afa52543b4` |
| 1016 | node2 | `gdrive_corpus_extractions/2e49a4e813_arxiv_1801.01565v2.pdf.md` | 37510 | 5626 | 5/5 | True | `eaaf8c4ccd1d5954` |
| 1017 | node2 | `gdrive_corpus_extractions/2e9ffc9e07_Corentin-Herbinet-Using-Machine-Learning-techniques-to-predict-the-outcome-of-pr.md` | 55265 | 7715 | 5/5 | True | `0d844bf5cf4778a6` |
| 1018 | node2 | `gdrive_corpus_extractions/2ef2dffe64_Camp-1902-Spaldings-How-to-Play-Foot-Ball.pdf.md` | 49987 | 7665 | 5/5 | True | `34b0474ddde6c75a` |
| 1019 | node2 | `gdrive_corpus_extractions/2f4a5700ca__15590410_-_Journal_of_Quantitative_Analysis_in_Sports_Meta-analytics__tools_for.md` | 60086 | 8308 | 5/5 | True | `d5a59c5031ce3b74` |
| 1020 | node2 | `gdrive_corpus_extractions/2fa52b9be7_Majors-FongJones-Miranda-2026-ObservabilityEngineering-2e.pdf.md` | 58592 | 8423 | 5/5 | True | `7b4fe1aa78f15785` |
| 1021 | node2 | `gdrive_corpus_extractions/2fd4eba88c_2310.16813v1.pdf.md` | 58161 | 8676 | 5/5 | True | `3b286d368dcc3eaf` |
| 1022 | node2 | `gdrive_corpus_extractions/306f228ec8_arxiv_2208.04897v1.pdf.md` | 40253 | 5614 | 5/5 | True | `cc7aadaea176eba3` |
| 1023 | node2 | `gdrive_corpus_extractions/30aa1e767c_arxiv_2405.01112v1.pdf.md` | 69563 | 10164 | 5/5 | True | `85eeea3ad3152184` |
| 1024 | node2 | `gdrive_corpus_extractions/30af5c2e15_arxiv_2507.14657v2.pdf.md` | 33257 | 4970 | 5/5 | True | `3046796493988d53` |
| 1025 | node2 | `gdrive_corpus_extractions/30e64b1efc_2510.07297.pdf.md` | 66293 | 9535 | 5/5 | True | `05dc8019a675be78` |
| 1026 | node2 | `gdrive_corpus_extractions/311ab61af9_book_9780262374675.pdf.md` | 34901 | 4907 | 5/5 | True | `c88192b372831259` |
| 1027 | node2 | `gdrive_corpus_extractions/32174ea2e5_2019_-_TRAP_A_Predictive_Framework_for_Trail_Running_Assessment_Performance_-_Un.md` | 55611 | 7755 | 5/5 | True | `6501d0d2c045b724` |
| 1028 | node2 | `gdrive_corpus_extractions/32317eef08_arxiv_2011.01324v2.pdf.md` | 51511 | 7370 | 5/5 | True | `007d670fa12534f3` |
| 1029 | node2 | `gdrive_corpus_extractions/3265fc59f9_openalex_W7217396014.pdf.md` | 47651 | 6820 | 5/5 | True | `6d66061e74a73a32` |
| 1030 | node2 | `gdrive_corpus_extractions/332e5942ba_arxiv_2003.03271v2.pdf.md` | 33690 | 5135 | 5/5 | True | `e9bb85658c1f8659` |
| 1031 | node2 | `gdrive_corpus_extractions/3393498200_2025_-_From_groups_to_a_single_league_evaluating_competitiveness_in_the_UEFA_Cha.md` | 30466 | 4351 | 5/5 | True | `d275aa871c3d5a94` |
| 1032 | node2 | `gdrive_corpus_extractions/3395ee0200_BlumHopcroftKannan-2020-FoundationsOfDataScience.pdf.md` | 47579 | 6908 | 5/5 | True | `6fdcec552fd011f8` |
| 1033 | node2 | `gdrive_corpus_extractions/34273e8406_openalex_W4296035374.pdf.md` | 41855 | 5667 | 5/5 | True | `76db90491a9a3c9e` |
| 1034 | node2 | `gdrive_corpus_extractions/34fb2c4aa8_2305.01643v2.pdf.md` | 70248 | 9754 | 5/5 | True | `4d81df20efe57fd2` |
| 1035 | node2 | `gdrive_corpus_extractions/3511c2a8a5_2609.17091v1.pdf.md` | 59898 | 8611 | 5/5 | True | `261d6bcefa98814d` |
| 1036 | node2 | `gdrive_corpus_extractions/35c88bbc99_Hull-1943-PrinciplesOfBehavior.txt.md` | 33770 | 4751 | 5/5 | True | `1b8769d910aab11f` |
| 1037 | node2 | `gdrive_corpus_extractions/36dacc0b8a_2026_-_The_Acute_Effects_of_Blood_Flow_Restriction_on_Ankle_Muscle_Reaction_Time.md` | 45147 | 6418 | 5/5 | True | `c3d19fd02603e9bb` |
| 1038 | node2 | `gdrive_corpus_extractions/3782ddd22c_Halmos-1950-MeasureTheory.txt.md` | 59599 | 9002 | 5/5 | True | `245b56655d8919fb` |
| 1039 | node2 | `gdrive_corpus_extractions/37badecc9b_arxiv_2609.10498v1.pdf.md` | 53361 | 7763 | 5/5 | True | `dfd25ecaca99d173` |
| 1040 | node2 | `gdrive_corpus_extractions/38939eff28_arxiv_2304.05170v2.pdf.md` | 49437 | 7371 | 5/5 | True | `51bc4fb33c23ea7c` |
| 1041 | node2 | `gdrive_corpus_extractions/38bb7693c8_bws_book_2_.pdf.md` | 39547 | 5691 | 5/5 | True | `4b5fff70a1b7727d` |
| 1042 | node2 | `gdrive_corpus_extractions/3933e60c1d_arxiv_2510.15616v1.pdf.md` | 27828 | 3295 | 5/5 | True | `63996ea27dbadbb1` |
| 1043 | node2 | `gdrive_corpus_extractions/3969b632e3_arxiv_2503.18282v2.pdf.md` | 55023 | 7732 | 5/5 | True | `519e7ae397cf87e0` |
| 1044 | node2 | `gdrive_corpus_extractions/3a9c46674e_2021_-_Juan_Camilo_Campos_-_Determining_the_phases_of_play_using_Graph_Neural_Ne.md` | 59286 | 8449 | 5/5 | True | `aa3b2b519585faeb` |
| 1045 | node2 | `gdrive_corpus_extractions/3adefac562_2020_Learning_Feature_Representations_from_Football_Tracking.pdf.md` | 26665 | 3639 | 5/5 | True | `0ca4c99b37ed80bf` |
| 1046 | node2 | `gdrive_corpus_extractions/3afb194daa_openalex_W4283218895.pdf.md` | 58635 | 8506 | 5/5 | True | `c7c94bd34e7b6122` |
| 1047 | node2 | `gdrive_corpus_extractions/3afb515414_Attacking_game_patterns_in_Soccer_A_sequ.pdf.md` | 32701 | 4659 | 5/5 | True | `97e74720c4c8a5a6` |
| 1048 | node2 | `gdrive_corpus_extractions/3b75cad733_arxiv_2502.03342v1.pdf.md` | 63719 | 8637 | 5/5 | True | `18ebfeead7e78631` |
| 1049 | node2 | `gdrive_corpus_extractions/3b9ff21a2d_2019_-_The_Economic_Impact_of_NBA_Superstars_Evidence_from_Missed_Games_using_Ti.md` | 56743 | 7913 | 5/5 | True | `7644d5ae100c2603` |
| 1050 | node2 | `gdrive_corpus_extractions/3c12417be5_NCAA-1922-Official-Football-Guide-Rules-and-Record-Book.pdf.md` | 66072 | 10252 | 5/5 | True | `0de0ea5b81fe843d` |
| 1051 | node2 | `gdrive_corpus_extractions/3c1781c4e8_2510.19150v1.pdf.md` | 29781 | 4264 | 5/5 | True | `e1f6c486b16af21a` |
| 1052 | node2 | `gdrive_corpus_extractions/3c1a24c9f1__OceanofPDF.com_Analytic_Methods_in_Sports_3rd_Ed_-_Thomas_A_Severini.pdf.md` | 31489 | 4323 | 5/5 | True | `1e788027069b662c` |
| 1053 | node2 | `gdrive_corpus_extractions/3ce8ec3592_2022_-_Running_to_Runs_the_Importance_of_Baserunning_-_Patel_et_al.pdf.md` | 48577 | 7295 | 5/5 | True | `80c1238f6cd78503` |
| 1054 | node2 | `gdrive_corpus_extractions/3d2a739812_openalex_W2969262985.pdf.md` | 31183 | 4478 | 5/5 | True | `c070ec6d6bc9dc76` |
| 1055 | node2 | `gdrive_corpus_extractions/3d65f3b879__OceanofPDF.com_The_Billion-Dollar_Bet_-_JF_Sachs.pdf.md` | 45235 | 6670 | 5/5 | True | `5fc8fd60862e022a` |
| 1056 | node2 | `gdrive_corpus_extractions/3d7505ae72_openalex_W2303002157.pdf.md` | 48479 | 6919 | 5/5 | True | `91388b19c851a9c8` |
| 1057 | node2 | `gdrive_corpus_extractions/3d863d0023_arxiv_2404.08401v5.pdf.md` | 43165 | 6305 | 5/5 | True | `c30adf924ff28d52` |
| 1058 | node2 | `gdrive_corpus_extractions/3e5ebed6ed_arxiv_2404.04234v3.pdf.md` | 59777 | 8204 | 5/5 | True | `8ef0f53de866a0d3` |
| 1059 | node2 | `gdrive_corpus_extractions/3e94a2ecd8_2016_-_The_Thin_Edge_of_the_Wedge_Accurately_Predicting_Shot_Outcomes_in_Tennis_.md` | 54160 | 7950 | 5/5 | True | `e20068805d0aeda8` |
| 1060 | node2 | `gdrive_corpus_extractions/3e97951854_Prince-2012-ComputerVisionModelsLearningAndInference.pdf.md` | 43257 | 6315 | 5/5 | True | `00a084867a8522ab` |
| 1061 | node2 | `gdrive_corpus_extractions/3f3f327992_Model_Trees_for_Identifying_Exceptional_Players_in_the_NHL_Draft.pdf.md` | 60219 | 9020 | 5/5 | True | `5c738152c0ab020e` |
| 1062 | node2 | `gdrive_corpus_extractions/3fd95f18c2_2013_-_Live_by_the_Three_Die_by_the_Three_The_Price_of_Risk_in_the_NBA_-_Unknown.md` | 58639 | 7969 | 5/5 | True | `a982b06b95473082` |
| 1063 | node2 | `gdrive_corpus_extractions/40ae3b75eb_2014_Factorized_Point_Process_Intensities_-_Spatial_Analysis.pdf.md` | 36435 | 5221 | 5/5 | True | `8645e0129f1f949e` |
| 1064 | node2 | `gdrive_corpus_extractions/412b8b6411_2023_-_Contextualized_Generative_Ghosting_Model_as_Benchmark_for_Evaluating_Play.md` | 51629 | 7011 | 5/5 | True | `9f3a50fe44a5bc8d` |
| 1065 | node2 | `gdrive_corpus_extractions/4143bf4e5e_openalex_W4412569476.pdf.md` | 61493 | 8904 | 5/5 | True | `7ef2563f27357161` |
| 1066 | node2 | `gdrive_corpus_extractions/41f65800cd_openalex_W7171556166.pdf.md` | 66792 | 9394 | 5/5 | True | `6a4c3e4924f2e942` |
| 1067 | node2 | `gdrive_corpus_extractions/42127bd172_openalex_W7108323803.pdf.md` | 54015 | 7431 | 5/5 | True | `bc70d37a075a979d` |
| 1068 | node2 | `gdrive_corpus_extractions/429e602888_1710.06551.pdf.md` | 49254 | 7116 | 5/5 | True | `4a6bd61cc5896267` |
| 1069 | node2 | `gdrive_corpus_extractions/4358a72546_openalex_W4404562813.pdf.md` | 48977 | 6937 | 5/5 | True | `906947805b759680` |
| 1070 | node2 | `gdrive_corpus_extractions/43dab1787d_openalex_W2161604086.pdf.md` | 63515 | 8848 | 5/5 | True | `427140e93c95ce12` |
| 1071 | node2 | `gdrive_corpus_extractions/43e6dc4932_openalex_W2969495598.pdf.md` | 66408 | 9747 | 5/5 | True | `64bd3cfbb1e13045` |
| 1072 | node2 | `gdrive_corpus_extractions/443b30fc82_arxiv_2604.01491v2.pdf.md` | 58202 | 8342 | 5/5 | True | `b40b3f712a274c7e` |
| 1073 | node2 | `gdrive_corpus_extractions/44eb0f753f_openalex_W4312591085.pdf.md` | 33523 | 4806 | 5/5 | True | `8eb7de85912fdffe` |
| 1074 | node2 | `gdrive_corpus_extractions/451a4f534d_2024_-_Exploring_the_Evolution_of_the_NFL_Draft_Pick_Trade_Market_Over_Time_-_Na.md` | 62546 | 9243 | 5/5 | True | `f06fc8837a9461ec` |
| 1075 | node2 | `gdrive_corpus_extractions/45ee7cdc38_openalex_W4391249056.pdf.md` | 33717 | 4944 | 5/5 | True | `2503170b927a8276` |
| 1076 | node2 | `gdrive_corpus_extractions/45f56166e7_openalex_W4385800687.pdf.md` | 28017 | 3940 | 5/5 | True | `f91ae1712cd72aeb` |
| 1077 | node2 | `gdrive_corpus_extractions/4604cb0325_arxiv_2208.12646v1.pdf.md` | 59095 | 8742 | 5/5 | True | `96a4a13d7a999ce7` |
| 1078 | node2 | `gdrive_corpus_extractions/467bd4ff66_2022_-_The_2021-2022_Liaoning_Flying_Leopards_The_Best_Championship_Team_in_Fran.md` | 65383 | 9452 | 5/5 | True | `43f1fdd1e329563c` |
| 1079 | node2 | `gdrive_corpus_extractions/46b562de83_openalex_W3207926413.pdf.md` | 62875 | 9094 | 5/5 | True | `01e54463d55b59d9` |
| 1080 | node2 | `gdrive_corpus_extractions/46e0797275_openalex_W4409815280.pdf.md` | 47188 | 6893 | 5/5 | True | `29194e553ac2577f` |
| 1081 | node2 | `gdrive_corpus_extractions/4759286936_2512.24601v3.pdf.md` | 50039 | 7312 | 5/5 | True | `f12172c3c1365f9c` |
| 1082 | node2 | `gdrive_corpus_extractions/478bbbafa9_2004.10142.pdf.md` | 58420 | 8362 | 5/5 | True | `4f7a8b31314ed33f` |
| 1083 | node2 | `gdrive_corpus_extractions/47ad24349b_2017_-_From_NOOB_to_SMURF_Advanced_analytics_for_League_of_Legends_-_Unknown_Aut.md` | 26731 | 3671 | 5/5 | True | `7c6f01bc933443b0` |
| 1084 | node2 | `gdrive_corpus_extractions/47b26d6d0a_AlbrechtEtAl-2024-MultiAgentReinforcementLearning.pdf.md` | 48533 | 7266 | 5/5 | True | `cd28cab6d8901e72` |
| 1085 | node2 | `gdrive_corpus_extractions/47d73cf503_openalex_W2794497862.pdf.md` | 58884 | 8938 | 5/5 | True | `286804ecd6bc2e7b` |
| 1086 | node2 | `gdrive_corpus_extractions/4828db56a2_2024_-_Optimizing_Football_Squad_Planning_Balancing_Competitive_Success_and_Fina.md` | 45703 | 6494 | 5/5 | True | `320b256fa5874a06` |
| 1087 | node2 | `gdrive_corpus_extractions/4876683c82_openalex_W7225130247.pdf.md` | 34682 | 5171 | 5/5 | True | `7e4b3529e9e02f99` |
| 1088 | node2 | `gdrive_corpus_extractions/4886a4bfc4_2026_-_Perceiving_and_Predicting_Dynamic_Sports_Spatiotemporal_Intelligence_in_V.md` | 58279 | 8733 | 5/5 | True | `4cc5734069c78779` |
| 1089 | node2 | `gdrive_corpus_extractions/48ff472ae2_2017_-_Projecting_college_basketball_freshman_performance_using_grassroots_baske.md` | 43063 | 5886 | 5/5 | True | `f934f24b0079c106` |
| 1090 | node2 | `gdrive_corpus_extractions/48ffcf2865_2023_-_Analytics_have_some_humility_a_statistical_view_of_fourth_down_decision_m.md` | 59625 | 8717 | 5/5 | True | `f19fb090ac210b56` |
| 1091 | node2 | `gdrive_corpus_extractions/4979285771_arxiv_2403.13821v1.pdf.md` | 33752 | 4729 | 5/5 | True | `ef324e5d57998d19` |
| 1092 | node2 | `gdrive_corpus_extractions/4a3e94d3ab_PVAMU_MSU_FOOTBALL_GAMENOTES_2024.pdf.md` | 57069 | 8556 | 5/5 | True | `361da24b949dfd9d` |
| 1093 | node2 | `gdrive_corpus_extractions/4a3f925d3f_arxiv_2212.12167v1.pdf.md` | 52086 | 7267 | 5/5 | True | `db7148e9621f3593` |
| 1094 | node2 | `gdrive_corpus_extractions/4b6febdb77_arxiv_1607.06317v1.pdf.md` | 60443 | 8708 | 5/5 | True | `e2a80d1b755e97d4` |
| 1095 | node2 | `gdrive_corpus_extractions/4b99b94f69_arxiv_2103.12511v2.pdf.md` | 54253 | 7642 | 5/5 | True | `08fdb57b72b3e72a` |
| 1096 | node2 | `gdrive_corpus_extractions/4c6bdb079c_openalex_W3125490157.pdf.md` | 35596 | 5144 | 5/5 | True | `08bdd69ecd3d8979` |
| 1097 | node2 | `gdrive_corpus_extractions/4cb18636bc_2023_-_Feeling_fast_Beliefs_and_performance_among_high_school_sprinters_-_Lybber.md` | 57243 | 8167 | 5/5 | True | `23626289c7b1c34f` |
| 1098 | node2 | `gdrive_corpus_extractions/4cc04eabf3_arxiv_2112.08345v2.pdf.md` | 39270 | 6066 | 5/5 | True | `78a09530d0897082` |
| 1099 | node2 | `gdrive_corpus_extractions/4cf3850215_2023_-_TacticalGPT_-_Uncovering_the_Potential_of_LLMs_for_Predicting_Tactical_De.md` | 70105 | 9486 | 5/5 | True | `863b745c616c8973` |
| 1100 | node2 | `gdrive_corpus_extractions/4d4a98c196_openalex_W2410142274.pdf.md` | 37832 | 5175 | 5/5 | True | `ee6604c84d13af05` |
| 1101 | node2 | `gdrive_corpus_extractions/4d761c70a6_openalex_W3192297822.pdf.md` | 58972 | 8502 | 5/5 | True | `8513aadcffeedba5` |
| 1102 | node2 | `gdrive_corpus_extractions/4d94d72353_2020_-_High_Anticipation_Exploring_Trends_Between_Public_Perception_and_Player_V.md` | 43230 | 6273 | 5/5 | True | `565b96df94bf9e0b` |
| 1103 | node2 | `gdrive_corpus_extractions/4de1a3f42d_openalex_W4389245974.pdf.md` | 33248 | 5051 | 5/5 | True | `60592d041aba771c` |
| 1104 | node2 | `gdrive_corpus_extractions/4ebb9dfd69_Olson-1965-LogicOfCollectiveAction.pdf.md` | 60617 | 8847 | 5/5 | True | `e979c9f21b9e8ced` |
| 1105 | node2 | `gdrive_corpus_extractions/4f066346cc_2024_-_Introducing_Grid_WAR_rethinking_WAR_for_starting_pitchers_-_Brill_et_al.p.md` | 31679 | 4667 | 5/5 | True | `4fad595314b97ca4` |
| 1106 | node2 | `gdrive_corpus_extractions/4f3d5fc3f3_Appliance_of_Neural_Networks_in_Basketba.pdf.md` | 62673 | 8993 | 5/5 | True | `2369b3af15377af4` |
| 1107 | node2 | `gdrive_corpus_extractions/4fe5728401_arxiv_2602.12080v2.pdf.md` | 53759 | 7823 | 5/5 | True | `344124449189bbd2` |
| 1108 | node2 | `gdrive_corpus_extractions/505b098096_openalex_W4386394626.pdf.md` | 58291 | 8108 | 5/5 | True | `2666e96f479d3210` |
| 1109 | node2 | `gdrive_corpus_extractions/515af059e1_LattimoreSzepesvari-2020-BanditAlgorithms.pdf.md` | 33831 | 4942 | 5/5 | True | `623daf180585719d` |
| 1110 | node2 | `gdrive_corpus_extractions/51b9a0aa52_ecosico_thesis.pdf.md` | 29350 | 3968 | 5/5 | True | `14acf6c5883cf61f` |
| 1111 | node2 | `gdrive_corpus_extractions/5272612004_Roper-1920-Winning-Football.pdf.md` | 53806 | 8007 | 5/5 | True | `bd4f49408bf8c2e0` |
| 1112 | node2 | `gdrive_corpus_extractions/529492117f_2026_-_Context-adjusted_Player_Evaluation_for_Twenty20_Cricket_-_Bandyopadhyay.p.md` | 46446 | 6411 | 5/5 | True | `74e2069f2873be7c` |
| 1113 | node2 | `gdrive_corpus_extractions/5299a05e74_arxiv_2412.00692v3.pdf.md` | 62278 | 8932 | 5/5 | True | `c1cbaa84f5507845` |
| 1114 | node2 | `gdrive_corpus_extractions/52d5f0072d_arxiv_2501.02771v2.pdf.md` | 62739 | 8949 | 5/5 | True | `31500aba44f4dbe0` |
| 1115 | node2 | `gdrive_corpus_extractions/53398bae6b_openalex_W7164858889.pdf.md` | 53746 | 8237 | 5/5 | True | `85d515bc11baa394` |
| 1116 | node2 | `gdrive_corpus_extractions/53a8755fe8_DengYu-2014-DeepLearningMethodsAndApplications.pdf.md` | 56636 | 8214 | 5/5 | True | `0e2ab862074aaa1f` |
| 1117 | node2 | `gdrive_corpus_extractions/53b08aa3c7_1909.08903.pdf.md` | 67493 | 9847 | 5/5 | True | `dd052470eceec00d` |
| 1118 | node2 | `gdrive_corpus_extractions/53b84d5773_2026_-_Can_a_Stadium_Full_of_Monkeys_Playing_Strat-o-Matic_Outmanage_Earl_Weaver.md` | 50704 | 7426 | 5/5 | True | `d4861b56ba9eff6b` |
| 1119 | node2 | `gdrive_corpus_extractions/53be920f6f__OceanofPDF.com_The_Recursive_Mind_-_Michael_C_Corballis.pdf.md` | 58708 | 8660 | 5/5 | True | `82e5fa84690f307a` |
| 1120 | node2 | `gdrive_corpus_extractions/53e279e67f_2013_-_Crossing_in_Soccer_has_a_Strong_Negative_Impact_on_Scoring_Evidence_from_.md` | 25822 | 3563 | 5/5 | True | `03b52dc11434f75a` |
| 1121 | node2 | `gdrive_corpus_extractions/5417d0cfa0_Factorized_Point_Process_Intensities_-_A_Spatial_Analysis_of_Professional_Basket.md` | 62284 | 8962 | 5/5 | True | `7402737090c5414d` |
| 1122 | node2 | `gdrive_corpus_extractions/5449f8dedf_2022_-_How_Rare_is_Pete_Alonso_s_53_Home_Run_Season_-_Burlant_et_al.pdf.md` | 57860 | 8518 | 5/5 | True | `ddcf79e9e3f081d8` |
| 1123 | node2 | `gdrive_corpus_extractions/5587f1cc1b_openalex_W1601290867.pdf.md` | 24830 | 3739 | 5/5 | True | `444b437d5481421b` |
| 1124 | node2 | `gdrive_corpus_extractions/55b7cd9535_Clemente-Sarmento-2022-Fitness-Assessment-Monitoring-Training-Team-Sports-MDPI.p.md` | 26772 | 3795 | 5/5 | True | `89cd2c88e9058c8f` |
| 1125 | node2 | `gdrive_corpus_extractions/55dc26e1c6_arxiv_2606.14094v1.pdf.md` | 30493 | 4402 | 5/5 | True | `4c50dc02d18b6031` |
| 1126 | node2 | `gdrive_corpus_extractions/568e481c3c_Garnett-2023-BayesianOptimization.pdf.md` | 57756 | 7928 | 5/5 | True | `7603578ad9e36f6f` |
| 1127 | node2 | `gdrive_corpus_extractions/56b7eff9d0_arxiv_2609.25652v1.pdf.md` | 36628 | 5425 | 5/5 | True | `eb7a75858d488395` |
| 1128 | node2 | `gdrive_corpus_extractions/56cacd8b35_2017_-_A_point-based_Bayesian_hierarchical_model_to_predict_the_outcome_of_tenni.md` | 59490 | 7999 | 5/5 | True | `5664b77f5237d333` |
| 1129 | node2 | `gdrive_corpus_extractions/572d52ea92_2012_Using_Computer_Vision_and_Machine_Learning_to_Automatically_Classify_NFL_Ga.md` | 17218 | 2706 | 5/5 | True | `836e4bb3979c03e6` |
| 1130 | node2 | `gdrive_corpus_extractions/572d7a88a4_2025_-_A_Run_Expectancy_Approach_to_Lead_Distance_Optimization_in_Major_League_B.md` | 54668 | 7736 | 5/5 | True | `88fd7cb1829a53ce` |
| 1131 | node2 | `gdrive_corpus_extractions/5740bb494a_2024_-_Equity_diversity_and_inclusion_in_sports_analytics_-_Fernandes_et_al.pdf.md` | 56898 | 8029 | 5/5 | True | `806bc037f7c195cd` |
| 1132 | node2 | `gdrive_corpus_extractions/57f3a5a961_2025_-_The_Manager_Bounce_From_Immediate_Shock_to_Tactical_Identity_Sean_Hooker_.md` | 43203 | 5853 | 5/5 | True | `927ad4ac2691ea25` |
| 1133 | node2 | `gdrive_corpus_extractions/58542ba52f_2020_-_Measuring_the_Impact_of_Robotic_Umpires_-_Unknown_Authors.pdf.md` | 41811 | 6203 | 5/5 | True | `2d89dfd696194067` |
| 1134 | node2 | `gdrive_corpus_extractions/5923594c5c_openalex_W4402156329.pdf.md` | 51066 | 7429 | 5/5 | True | `0587c0e27ea0546b` |
| 1135 | node2 | `gdrive_corpus_extractions/592f6cece7_Rogov-2023-PostgreSQL14Internals.pdf.md` | 38651 | 5465 | 5/5 | True | `e773d4a534c815a2` |
| 1136 | node2 | `gdrive_corpus_extractions/59dc92d23c_arxiv_2505.16199v1.pdf.md` | 53674 | 7630 | 5/5 | True | `d3f054885f982bfc` |
| 1137 | node2 | `gdrive_corpus_extractions/5a0f34e667_Galaxy_Sports_Edge_Brand_Use_Pack.pdf.md` | 59983 | 8190 | 5/5 | True | `dcbba4b3a91ef825` |
| 1138 | node2 | `gdrive_corpus_extractions/5a6f3925d4_applied-predictive-modeling-max-kuhn-kjell-johnson_1518.pdf.md` | 71133 | 10275 | 5/5 | True | `4165d2d792ce08ad` |
| 1139 | node2 | `gdrive_corpus_extractions/5b1ca38425_openalex_W4380088106.pdf.md` | 55224 | 7850 | 5/5 | True | `b686e03914398287` |
| 1140 | node2 | `gdrive_corpus_extractions/5b1f2db18b_openalex_W2771394759.pdf.md` | 55830 | 7993 | 5/5 | True | `9477d32b4acef85b` |
| 1141 | node2 | `gdrive_corpus_extractions/5b2eeccb9b_2026_-_Integrating_Dynamic_Defensive_Geometry_and_Match-State_Context_in_Probabi.md` | 53879 | 7680 | 5/5 | True | `de8d33bcac932ad9` |
| 1142 | node2 | `gdrive_corpus_extractions/5b7d18bff4_B04124012020.pdf.md` | 58689 | 8243 | 5/5 | True | `476ad1cb5fe8ddab` |
| 1143 | node2 | `gdrive_corpus_extractions/5b9a46f1e3_TR_2008_07.pdf.md` | 48539 | 6942 | 5/5 | True | `483bd57ad33a25f0` |
| 1144 | node2 | `gdrive_corpus_extractions/5bf56e566f_2601.11492v2.pdf.md` | 57330 | 8001 | 5/5 | True | `cca04f3d6c6c9333` |
| 1145 | node2 | `gdrive_corpus_extractions/5c26dd9f75_arxiv_2407.08508v1.pdf.md` | 48062 | 7097 | 5/5 | True | `6eafffb05524921e` |
| 1146 | node2 | `gdrive_corpus_extractions/5c2949ae2e_openalex_W645530109.pdf.md` | 43435 | 5770 | 5/5 | True | `fce9eea1888443ea` |
| 1147 | node2 | `gdrive_corpus_extractions/5c45ea8fe9_openalex_W3119175810.pdf.md` | 51274 | 7719 | 5/5 | True | `72912b5ab3dbf7eb` |
| 1148 | node2 | `gdrive_corpus_extractions/5ca8695d28_9789819614455.pdf.md` | 60181 | 8296 | 5/5 | True | `141cf1801eb861e7` |
| 1149 | node2 | `gdrive_corpus_extractions/5d4c5b8406_A_Decade_of_Euroleague_Basketball_an_Ana.pdf.md` | 50884 | 7520 | 5/5 | True | `fbaeb94fe64b4119` |
| 1150 | node2 | `gdrive_corpus_extractions/5d6355bfbe_openalex_W7112866642.pdf.md` | 30480 | 4135 | 5/5 | True | `2a0c85e5a1d97ab9` |
| 1151 | node2 | `gdrive_corpus_extractions/5dcf5f59a1_Spatio_temporal_movements_in_team_sports.pdf.md` | 54809 | 7965 | 5/5 | True | `03f4f0e2cf8a69f5` |
| 1152 | node2 | `gdrive_corpus_extractions/5e4692cbb7_2601.12132v1.pdf.md` | 58187 | 8347 | 5/5 | True | `e12a45f0e3407afd` |
| 1153 | node2 | `gdrive_corpus_extractions/5e536dcf8c_openalex_W3034326629.pdf.md` | 68428 | 9880 | 5/5 | True | `a7e241e67be7255e` |
| 1154 | node2 | `gdrive_corpus_extractions/5f14f376b0_2401.00649v2.pdf.md` | 35743 | 4517 | 5/5 | True | `1df88b25ebd4a44c` |
| 1155 | node2 | `gdrive_corpus_extractions/5ff522dbf3_openalex_W1572907844.pdf.md` | 23907 | 3621 | 5/5 | True | `66a91c1b5001b286` |
| 1156 | node2 | `gdrive_corpus_extractions/5ffb97a974_arxiv_2202.08837v1.pdf.md` | 50776 | 7325 | 5/5 | True | `7370d9f9ab60b3a7` |
| 1157 | node2 | `gdrive_corpus_extractions/6043df9488_Gray-2011-EntropyAndInformationTheory2.pdf.md` | 30289 | 4114 | 5/5 | True | `ce2fcdf94974ebe2` |
| 1158 | node2 | `gdrive_corpus_extractions/6060f91d6a_arxiv_1712.07920v1.pdf.md` | 42446 | 5921 | 5/5 | True | `d42fd48ae6e5ab5f` |
| 1159 | node2 | `gdrive_corpus_extractions/60a1389ad3_openalex_W2397986404.pdf.md` | 38537 | 5365 | 5/5 | True | `3cb127806fa931c5` |
| 1160 | node2 | `gdrive_corpus_extractions/60a24f7a71_arxiv_2403.10512v1.pdf.md` | 71781 | 10628 | 5/5 | True | `0dd502a38a3f1741` |
| 1161 | node2 | `gdrive_corpus_extractions/60f397cabf_openalex_W4376127706.pdf.md` | 64168 | 8965 | 5/5 | True | `130e4190774839e4` |
| 1162 | node2 | `gdrive_corpus_extractions/615e537833_arxiv_2203.16761v1.pdf.md` | 59611 | 8488 | 5/5 | True | `7968f95715592c12` |
| 1163 | node2 | `gdrive_corpus_extractions/6164e16e38_openalex_W4388585882.pdf.md` | 60597 | 8792 | 5/5 | True | `679af4200527a187` |
| 1164 | node2 | `gdrive_corpus_extractions/620cc86be8_arxiv_2109.01305v1.pdf.md` | 72115 | 10651 | 5/5 | True | `0a2e9881276c49fb` |
| 1165 | node2 | `gdrive_corpus_extractions/623c4567e2_fspor-7-1569155.pdf.md` | 31376 | 4341 | 5/5 | True | `726e4a93c9657a51` |
| 1166 | node2 | `gdrive_corpus_extractions/628dec66f5_GT_book.pdf.md` | 55339 | 7748 | 5/5 | True | `f0a027ff3802ee3d` |
| 1167 | node2 | `gdrive_corpus_extractions/62ea6701b4_mlgm_epfl_book.pdf.md` | 28031 | 3967 | 5/5 | True | `459889ce82acad7a` |
| 1168 | node2 | `gdrive_corpus_extractions/64f7a02c03_arxiv_2405.12588v1.pdf.md` | 45267 | 6508 | 5/5 | True | `da282ef46ccfd90b` |
| 1169 | node2 | `gdrive_corpus_extractions/6573bff775_2025_-_Defending_the_Long_Throw_A_Dual_Model_Framework_for_Minimising_Defensive_.md` | 51197 | 7454 | 5/5 | True | `2c9e223f12081841` |
| 1170 | node2 | `gdrive_corpus_extractions/65a99e2de8_openalex_W4402679764.pdf.md` | 60993 | 8517 | 5/5 | True | `7cd1fff8a92d97fa` |
| 1171 | node2 | `gdrive_corpus_extractions/65bf318944_1910.03203.pdf.md` | 62330 | 8793 | 5/5 | True | `535b6238d19a3d54` |
| 1172 | node2 | `gdrive_corpus_extractions/660e792e44_arxiv_2504.01321v1.pdf.md` | 41974 | 6209 | 5/5 | True | `f173c349c728f33b` |
| 1173 | node2 | `gdrive_corpus_extractions/67521ccd0d_arxiv_1907.11306v2.pdf.md` | 56437 | 7941 | 5/5 | True | `112febd61dcbdd44` |
| 1174 | node2 | `gdrive_corpus_extractions/683d1248c5_ISLP_website.pdf.md` | 51820 | 7892 | 5/5 | True | `97abccde783b1985` |
| 1175 | node2 | `gdrive_corpus_extractions/6875e94c6e_arxiv_2310.04360v1.pdf.md` | 26428 | 3787 | 5/5 | True | `b9c26f491323dbc9` |
| 1176 | node2 | `gdrive_corpus_extractions/692b074f4a_arxiv_2206.13785v1.pdf.md` | 58840 | 8517 | 5/5 | True | `44173537af0000a6` |
| 1177 | node2 | `gdrive_corpus_extractions/69c5a00719_Sayama-2015-ModelingAndAnalysisOfComplexSystems.pdf.md` | 33295 | 4466 | 5/5 | True | `08505c14882a5069` |
| 1178 | node2 | `gdrive_corpus_extractions/69e3f0b7d3_openalex_W4205745258.pdf.md` | 67837 | 9434 | 5/5 | True | `64d40b65251832a8` |
| 1179 | node2 | `gdrive_corpus_extractions/6a90266b4a_2022_-_Stars_Matter_an_Analysis_of_College_Football_Recruiting_Development_and_D.md` | 46135 | 6607 | 5/5 | True | `ebb4273c7fa9f1c6` |
| 1180 | node2 | `gdrive_corpus_extractions/6aae5dcd33_openalex_W2964179938.pdf.md` | 62265 | 9024 | 5/5 | True | `256415c8e0d0f869` |
| 1181 | node2 | `gdrive_corpus_extractions/6ab3938de9_arxiv_1709.03399v1.pdf.md` | 29635 | 4269 | 5/5 | True | `6e135d5fe9b98c6d` |
| 1182 | node2 | `gdrive_corpus_extractions/6ac28b1860_2014_-_A_Data-driven_Method_for_In-game_Decision_Making_in_MLB_-_Unknown_Authors.md` | 50312 | 7243 | 5/5 | True | `53fe5e75c9350b13` |
| 1183 | node2 | `gdrive_corpus_extractions/6acc458c07_Camp-1894-Football-Facts-and-Figures.pdf.md` | 16569 | 2345 | 5/5 | True | `9a9bbb12036c0f74` |
| 1184 | node2 | `gdrive_corpus_extractions/6ad7a80d02_2012_-_The_Sensitivity_of_College_Football_Rankings_to_Several_Modeling_Choices_.md` | 40526 | 5747 | 5/5 | True | `e08e8c89c746c379` |
| 1185 | node2 | `gdrive_corpus_extractions/6ae3f21d62_2021_-_MAYFIELD_Machine_Learning_Algorithm_for_Yearly_Forecasting_Indicators_and.md` | 56897 | 8127 | 5/5 | True | `ae3beb7242d1f722` |
| 1186 | node2 | `gdrive_corpus_extractions/6b6fb18002_2022_-_In_a_Rush_to_Pass_NFL_Teams_Pass_on_Rushing_-_Cramer_et_al.pdf.md` | 40679 | 5922 | 5/5 | True | `b887ec4cf30505fe` |
| 1187 | node2 | `gdrive_corpus_extractions/6b70f87e16_openalex_W2948061489.pdf.md` | 39110 | 5796 | 5/5 | True | `40327e8ec9a334fe` |
| 1188 | node2 | `gdrive_corpus_extractions/6c0e7edd14_PetersJanzingScholkopf-2017-ElementsOfCausalInference.pdf.md` | 61546 | 8989 | 5/5 | True | `ab503b9fc9bd28e8` |
| 1189 | node2 | `gdrive_corpus_extractions/6c2d7caa25_openalex_W4385572157.pdf.md` | 61045 | 8869 | 5/5 | True | `788e76f1e4b85926` |
| 1190 | node2 | `gdrive_corpus_extractions/6c66f99121_arxiv_2102.05020v3.pdf.md` | 41649 | 5849 | 5/5 | True | `0fdd47d559e37a8e` |
| 1191 | node2 | `gdrive_corpus_extractions/6d32218b08_2606.28570v1_1_.pdf.md` | 27051 | 3771 | 5/5 | True | `5d36b29bf4137b5c` |
| 1192 | node2 | `gdrive_corpus_extractions/6d54358116_openalex_W4390905124.pdf.md` | 51422 | 7205 | 5/5 | True | `b33b29066b28845b` |
| 1193 | node2 | `gdrive_corpus_extractions/6d6164501d_2007_-_Statistical_models_for_the_evaluation_of_fielding_in_baseball_-_Unknown_A.md` | 37431 | 5320 | 5/5 | True | `71d6ce5b4178bcd8` |
| 1194 | node2 | `gdrive_corpus_extractions/6d6eb7c687_2603.25901v1_1_.pdf.md` | 40520 | 5817 | 5/5 | True | `7e8d767cfb4a3647` |
| 1195 | node2 | `gdrive_corpus_extractions/6de2d70a78_openalex_W4417170461.pdf.md` | 36646 | 5170 | 5/5 | True | `6b39df9232cab11b` |
| 1196 | node2 | `gdrive_corpus_extractions/6df8151157_NFL_Football_-_Playbook.pdf.md` | 42886 | 6357 | 5/5 | True | `a162fd9a67ad751b` |
| 1197 | node2 | `gdrive_corpus_extractions/6e67d3c586_undated_-_Using_Tracking_and_Charting_Data_to_Better_Evaluate_NFL_Players_A_Revi.md` | 60203 | 8786 | 5/5 | True | `1f73606bc05072fd` |
| 1198 | node2 | `gdrive_corpus_extractions/6ed94c31f6_2023_-_Assessing_Spatial_Heterogeneity_in_Whiff_Rate_Using_Geographically_Weight.md` | 62710 | 8613 | 5/5 | True | `045c240319666698` |
| 1199 | node2 | `gdrive_corpus_extractions/6f76540e34_arxiv_2206.02373v2.pdf.md` | 36473 | 5247 | 5/5 | True | `d2204b19557fc3d9` |
| 1200 | node2 | `gdrive_corpus_extractions/6f7eb136f3_openalex_W7212263315.pdf.md` | 42690 | 6446 | 5/5 | True | `314c8dfbaf6d7a77` |
| 1201 | node2 | `gdrive_corpus_extractions/7029cc3668_openalex_W4386321819.pdf.md` | 51639 | 6389 | 5/5 | True | `1cebf4fa7eda9c4b` |
| 1202 | node2 | `gdrive_corpus_extractions/709e3f83f4_2026_-_Efficient_Frontier_Optimization_of_NBA_Shot_Selection_Using_Markov_Reward.md` | 57864 | 8015 | 5/5 | True | `b6b4de0be8a9051e` |
| 1203 | node2 | `gdrive_corpus_extractions/714f12d792_arxiv_2511.09455v1.pdf.md` | 44935 | 6471 | 5/5 | True | `4d5baac5d977fe0e` |
| 1204 | node2 | `gdrive_corpus_extractions/7175d86b5c_2204.06240v3.pdf.md` | 38689 | 6152 | 5/5 | True | `317954143434e32c` |
| 1205 | node2 | `gdrive_corpus_extractions/719ee048bb_arxiv_2609.33664v2.pdf.md` | 35215 | 5170 | 5/5 | True | `84b59140a9a7e36d` |
| 1206 | node2 | `gdrive_corpus_extractions/7219451f6c_arxiv_2308.11870v1.pdf.md` | 46977 | 6665 | 5/5 | True | `13796d5abd5db6f4` |
| 1207 | node2 | `gdrive_corpus_extractions/72f198e104_openalex_W3197337134.pdf.md` | 61139 | 8793 | 5/5 | True | `4313a10c5d9323e2` |
| 1208 | node2 | `gdrive_corpus_extractions/7309165725_arxiv_2304.02939v2.pdf.md` | 63174 | 9255 | 5/5 | True | `2eefbcd8a56aded4` |
| 1209 | node2 | `gdrive_corpus_extractions/7383d65851_openalex_W2801467151.pdf.md` | 54439 | 7549 | 5/5 | True | `88d820746ac80ac7` |
| 1210 | node2 | `gdrive_corpus_extractions/738e03819d_openalex_W2256613729.pdf.md` | 69824 | 9880 | 5/5 | True | `2282e9506ba110de` |
| 1211 | node2 | `gdrive_corpus_extractions/743632c8dc_openalex_W2593564570.pdf.md` | 59852 | 9125 | 5/5 | True | `8ef05bf33fe24237` |
| 1212 | node2 | `gdrive_corpus_extractions/74e1d0bbfa_2021_College_Basketball_Rating_CBR_-_A_new_body-of-work_metric_for_NCAA_tourname.md` | 55754 | 8247 | 5/5 | True | `0a2138a959196666` |
| 1213 | node2 | `gdrive_corpus_extractions/74ee8c30de_2017_-_From_Markov_models_to_Poisson_point_processes_Understanding_player_moveme.md` | 48714 | 6740 | 5/5 | True | `36701f4e364130ed` |
| 1214 | node2 | `gdrive_corpus_extractions/753de6579b_openalex_W4226441884.pdf.md` | 35359 | 4856 | 5/5 | True | `929c18613ed2614c` |
| 1215 | node2 | `gdrive_corpus_extractions/75928873e0_openalex_W7162017806.pdf.md` | 34933 | 4876 | 5/5 | True | `203aa6a99ccea145` |
| 1216 | node2 | `gdrive_corpus_extractions/75b64a09a4_2022_-_Beyond_action_valuation_A_deep_reinforcement_learning_framework_for_optim.md` | 61763 | 8659 | 5/5 | True | `44a855933ad2302a` |
| 1217 | node2 | `gdrive_corpus_extractions/7611bc99a6_openalex_W3102441345.pdf.md` | 46000 | 6723 | 5/5 | True | `58fa116b324fee06` |
| 1218 | node2 | `gdrive_corpus_extractions/7617a8b9b7_openalex_W4368276049.pdf.md` | 67540 | 9612 | 5/5 | True | `8e6f192182432cca` |
| 1219 | node2 | `gdrive_corpus_extractions/7658cc3970_physics_0310148.pdf.md` | 55673 | 8268 | 5/5 | True | `7d0af374e1a75ca6` |
| 1220 | node2 | `gdrive_corpus_extractions/76e21fbe07_1805.01271.pdf.md` | 32048 | 4319 | 5/5 | True | `e6f18ddb714da2e6` |
| 1221 | node2 | `gdrive_corpus_extractions/76f9128e50_openalex_W4396975753.pdf.md` | 51070 | 6992 | 5/5 | True | `9b6dfcffa64e6445` |
| 1222 | node2 | `gdrive_corpus_extractions/781c257044_2024_-_The_Sharpe_Ratio_and_Hitter_Evaluation_A_New_Application_of_Modern_Portfo.md` | 54149 | 7705 | 5/5 | True | `cad87256833f9a6e` |
| 1223 | node2 | `gdrive_corpus_extractions/789accca99_Virchow-1858-CellularPathology.pdf.md` | 55141 | 7608 | 5/5 | True | `af2b01bb66f9d102` |
| 1224 | node2 | `gdrive_corpus_extractions/795a32c12a_2024_-_No_More_Throwing_Darts_at_the_Wall_Developing_Fair_Handicaps_for_Darts_us.md` | 46370 | 6577 | 5/5 | True | `5cac9009928d4ba9` |
| 1225 | node2 | `gdrive_corpus_extractions/79b83bb46c_openalex_W3203630087.pdf.md` | 36163 | 5300 | 5/5 | True | `437cdeff75566c8a` |
| 1226 | node2 | `gdrive_corpus_extractions/79f317bbf8_2204.00003v3.pdf.md` | 33205 | 5107 | 5/5 | True | `d6f71bb17f079db6` |
| 1227 | node2 | `gdrive_corpus_extractions/7a0e26e653_2013_Acceleration_in_the_NBA_Towards_an_Algorithmic_Taxonomy_of_Basketball_Plays.md` | 45220 | 6427 | 5/5 | True | `6aa9dd0674151c3a` |
| 1228 | node2 | `gdrive_corpus_extractions/7a298107bd_openalex_W7125814715.pdf.md` | 34406 | 4733 | 5/5 | True | `f10376d405d77691` |
| 1229 | node2 | `gdrive_corpus_extractions/7a9938774f_arxiv_2602.18504v1.pdf.md` | 27627 | 3843 | 5/5 | True | `3e580449ff643359` |
| 1230 | node2 | `gdrive_corpus_extractions/7ab19865f1_SozenKanatEds-2022-TraumaAndEmergencySurgery.pdf.md` | 54907 | 7874 | 5/5 | True | `b9865aadc2919f50` |
| 1231 | node2 | `gdrive_corpus_extractions/7ad340a409_openalex_W2223717072.pdf.md` | 62464 | 9202 | 5/5 | True | `7aefb288e11f1f35` |
| 1232 | node2 | `gdrive_corpus_extractions/7b3a49475a_openalex_W4403545181.pdf.md` | 64606 | 9288 | 5/5 | True | `ec956eac04aa6207` |
| 1233 | node2 | `gdrive_corpus_extractions/7b575e4bae_openalex_W4312929867.pdf.md` | 54815 | 5862 | 5/5 | True | `f34e2584217cee0e` |
| 1234 | node2 | `gdrive_corpus_extractions/7c0ba19e88_arxiv_2311.06818v1.pdf.md` | 44699 | 6741 | 5/5 | True | `18504d2ce7bbdba6` |
| 1235 | node2 | `gdrive_corpus_extractions/7c4718769f_arxiv_2505.01526v1.pdf.md` | 41544 | 5473 | 5/5 | True | `75f6428ec4d9bd61` |
| 1236 | node2 | `gdrive_corpus_extractions/7c476a9520_openalex_W3165481862.pdf.md` | 59256 | 8163 | 5/5 | True | `0a7c941f20f59126` |
| 1237 | node2 | `gdrive_corpus_extractions/7c77f86eee_preview-9780429822322_A39043779.pdf.md` | 43843 | 6233 | 5/5 | True | `b8e532e105a11299` |
| 1238 | node2 | `gdrive_corpus_extractions/7cc4307405_2017_-_Mixed_Membership_Martial_Arts_Data-Driven_Analysis_of_Winning_Martial_Art.md` | 37447 | 5258 | 5/5 | True | `e2d3d673efee197a` |
| 1239 | node2 | `gdrive_corpus_extractions/7d0c7cf939_arxiv_1904.08155v1.pdf.md` | 60044 | 8783 | 5/5 | True | `470d6d91812bf5df` |
| 1240 | node2 | `gdrive_corpus_extractions/7d5247005b_openalex_W7224822482.pdf.md` | 35638 | 5268 | 5/5 | True | `6fd35634e7c14a16` |
| 1241 | node2 | `gdrive_corpus_extractions/7e26d33cf0_arxiv_2007.01089v1.pdf.md` | 47455 | 6821 | 5/5 | True | `e4b1dc161911ce00` |
| 1242 | node2 | `gdrive_corpus_extractions/7e8091d214_openalex_W2605539036.pdf.md` | 66674 | 9427 | 5/5 | True | `45f99fabb8672614` |
| 1243 | node2 | `gdrive_corpus_extractions/7e86851f92_openalex_W4400728177.pdf.md` | 64168 | 9336 | 5/5 | True | `70290e2c7f2efdb1` |
| 1244 | node2 | `gdrive_corpus_extractions/7f471fc5b7__15590410_-_Journal_of_Quantitative_Analysis_in_Sports_A_generative_model_for_pr.md` | 39827 | 5412 | 5/5 | True | `d1073355b43b584c` |
| 1245 | node2 | `gdrive_corpus_extractions/807b72aff3_arxiv_2306.13074v5.pdf.md` | 60591 | 9049 | 5/5 | True | `af5b9a427bcb16d3` |
| 1246 | node2 | `gdrive_corpus_extractions/8094b5628c_2020_Dynamically_scheduling_NFL_games_to_reduce_strength_of_schedule_variability.md` | 56814 | 8263 | 5/5 | True | `7780a780b60b9763` |
| 1247 | node2 | `gdrive_corpus_extractions/80be5ee150_openalex_W4294732557.pdf.md` | 36458 | 5256 | 5/5 | True | `24fd89acf4caf9c7` |
| 1248 | node2 | `gdrive_corpus_extractions/81ff846b04_openalex_W7168220287.pdf.md` | 33399 | 4545 | 5/5 | True | `45c7b6fe739b583a` |
| 1249 | node2 | `gdrive_corpus_extractions/8230c298ae_2018_-_batter_pitcher_2vec_Statistic-Free_Talent_Modeling_With_Neural_Player_Emb.md` | 53315 | 7374 | 5/5 | True | `88ce4d27558d94b3` |
| 1250 | node2 | `gdrive_corpus_extractions/824bb20bdf_2026_-_Beyond_Traditional_Metrics_A_Systematic_Review_of_Spatial_and_Spatiotempo.md` | 56389 | 7576 | 5/5 | True | `b00a4606697a8ce3` |
| 1251 | node2 | `gdrive_corpus_extractions/82d7c37e12_2604.27865v1.pdf.md` | 57802 | 8692 | 5/5 | True | `b617d2091a95f5b5` |
| 1252 | node2 | `gdrive_corpus_extractions/82ed245460_openalex_W2514949041.pdf.md` | 61409 | 9321 | 5/5 | True | `424a58edcc046696` |
| 1253 | node2 | `gdrive_corpus_extractions/830bec9dbb_2019_Using_In-Game_Shot_Trajectories_to_Better_Understand_Defensive_Impact_in_th.md` | 29521 | 4287 | 5/5 | True | `2a1c0986d2d39f28` |
| 1254 | node2 | `gdrive_corpus_extractions/8339a62f7a_2023_-_Sources_of_Bias_in_One-Meter_Diving_Competitions_-_Unknown_Authors.pdf.md` | 64267 | 9637 | 5/5 | True | `93c9eee36971bd8e` |
| 1255 | node2 | `gdrive_corpus_extractions/836fb4cab3_Cox-Kaashoek-Morris-2018-xv6Book-rev11.pdf.md` | 54983 | 8377 | 5/5 | True | `eb0dd91c2c002caa` |
| 1256 | node2 | `gdrive_corpus_extractions/83df16ff3a_2026_-_Identifying_the_determinants_of_soccer_coach_turnover_by_competing_risks_.md` | 57567 | 8365 | 5/5 | True | `ed9a686bdc25923b` |
| 1257 | node2 | `gdrive_corpus_extractions/8436973439_2014_-_What_Does_it_Take_to_Call_a_Strike_Three_Biases_in_Umpire_Decision_Making.md` | 57294 | 8522 | 5/5 | True | `ba5bdece020bd734` |
| 1258 | node2 | `gdrive_corpus_extractions/84441a4148_arxiv_2307.06640v2.pdf.md` | 57947 | 8286 | 5/5 | True | `fe5bdc65a90ce05c` |
| 1259 | node2 | `gdrive_corpus_extractions/84b88529f0_2017_Understanding_and_Increasing_3_point_Shooting.pdf.md` | 62846 | 9091 | 5/5 | True | `af9792e841769fb5` |
| 1260 | node2 | `gdrive_corpus_extractions/8517badd93_2606.24916.pdf.md` | 41651 | 6244 | 5/5 | True | `2368762d4a3c31c3` |
| 1261 | node2 | `gdrive_corpus_extractions/85591db340_2024_-_Exploring_various_NBA_draft_value_curves_-_Bewtra_et_al.pdf.md` | 50818 | 7320 | 5/5 | True | `32bd64f72fcbf6b5` |
| 1262 | node2 | `gdrive_corpus_extractions/85ba12bfd2_Saltzer-Kaashoek-2009-PrinciplesOfComputerSystemDesign-PartII.pdf.md` | 60326 | 8814 | 5/5 | True | `6eb88de72767a014` |
| 1263 | node2 | `gdrive_corpus_extractions/85bec52aaf_Measuring_Spatial_Allocative_Efficiency_in_Basketball.pdf.md` | 42825 | 6289 | 5/5 | True | `91462f1b33d0449e` |
| 1264 | node2 | `gdrive_corpus_extractions/8687507e62_2025-NFL-Record-and-Fact-Book.pdf.md` | 34671 | 5229 | 5/5 | True | `0773b574319e4398` |
| 1265 | node2 | `gdrive_corpus_extractions/871f56ac37_arxiv_2403.13443v2.pdf.md` | 53978 | 8180 | 5/5 | True | `48485ba5a219849c` |
| 1266 | node2 | `gdrive_corpus_extractions/8823258570_Damage_PDF.pdf.md` | 42035 | 5956 | 5/5 | True | `1339934c98964ad8` |
| 1267 | node2 | `gdrive_corpus_extractions/886aa83fae_EasleyKleinberg-2010-NetworksCrowdsAndMarkets.pdf.md` | 20652 | 3013 | 5/5 | True | `e84d5025231fadcc` |
| 1268 | node2 | `gdrive_corpus_extractions/888c095c00_openalex_W7214257461.pdf.md` | 35592 | 5150 | 5/5 | True | `c54516b306f5e769` |
| 1269 | node2 | `gdrive_corpus_extractions/889d178df8_arxiv_2505.18111v1.pdf.md` | 60127 | 8711 | 5/5 | True | `8c0505eef163c9ea` |
| 1270 | node2 | `gdrive_corpus_extractions/893d120ca4_Visual_Tracking_Speed_and_Soccer_Performance_Metrics.pdf.md` | 32937 | 4631 | 5/5 | True | `09eae26582f96cb5` |
| 1271 | node2 | `gdrive_corpus_extractions/8974620c96_2605.30209.pdf.md` | 71380 | 10390 | 5/5 | True | `62f0c5280b4543d1` |
| 1272 | node2 | `gdrive_corpus_extractions/8981513b40_2016_The_Anatomy_of_the_Three-Point_Shot_-_Spatial_Bias_Fractals_and_the_Three-P.md` | 57705 | 8583 | 5/5 | True | `9e7df8fcc3908ffa` |
| 1273 | node2 | `gdrive_corpus_extractions/89849c94b1_openalex_W3215842786.pdf.md` | 48659 | 7089 | 5/5 | True | `b88e6725dc6fac5f` |
| 1274 | node2 | `gdrive_corpus_extractions/89b6add635_openalex_W2188730824.pdf.md` | 53679 | 7900 | 5/5 | True | `49bcd02e8fba5a6d` |
| 1275 | node2 | `gdrive_corpus_extractions/89b7519a1b_2026_-_Automated_Detection_of_Match_Phases_in_Football_from_Spatio-Temporal_Trac.md` | 36402 | 5442 | 5/5 | True | `2175cd699f39b585` |
| 1276 | node2 | `gdrive_corpus_extractions/8a347006dd_2020_-_Bang_the_Can_Slowly_An_Investigation_into_the_2017_Houston_Astros_-_Unkno.md` | 41444 | 6174 | 5/5 | True | `d049ef6c62a611bf` |
| 1277 | node2 | `gdrive_corpus_extractions/8b616d958b_Goldberg-2017-NeuralNetworkMethodsForNLP-PrimerDraft.pdf.md` | 55476 | 8146 | 5/5 | True | `3334c504e6048387` |
| 1278 | node2 | `gdrive_corpus_extractions/8b98159f37__OceanofPDF.com_Introduction_to_Recursive_Programming_-_Manuel_Rubio-Sanchez.pdf.md` | 25576 | 3932 | 5/5 | True | `816c18cb520e68ed` |
| 1279 | node2 | `gdrive_corpus_extractions/8ba6794c05_openalex_W3022801328.pdf.md` | 40701 | 6101 | 5/5 | True | `98323ebf568e486b` |
| 1280 | node2 | `gdrive_corpus_extractions/8bcf2db21b_2026_-_Concave_Processes_for_Multi-Task_Career_Trajectories_Evaluating_Aging_Acr.md` | 59230 | 8150 | 5/5 | True | `f075f8e834d00206` |
| 1281 | node2 | `gdrive_corpus_extractions/8bd7120d60_arxiv_2306.11035v2.pdf.md` | 60598 | 8498 | 5/5 | True | `289c8976f0e2ed01` |
| 1282 | node2 | `gdrive_corpus_extractions/8c4da7ba7e_openalex_W4389777203.pdf.md` | 61472 | 9182 | 5/5 | True | `aff05231dab4d7c4` |
| 1283 | node2 | `gdrive_corpus_extractions/8c5ad75a91_Davis-1911-Football-The-American-Intercollegiate-Game.pdf.md` | 50628 | 7707 | 5/5 | True | `0ce29f0a535bc95c` |
| 1284 | node2 | `gdrive_corpus_extractions/8c7103191c_openalex_W7143347166.pdf.md` | 65751 | 8948 | 5/5 | True | `962d0620ebadbd6b` |
| 1285 | node2 | `gdrive_corpus_extractions/8ca8402253_2024_-_The_winner_of_the_NFL_draft_is_not_necessarily_cursed_Exploring_the_discr.md` | 61677 | 8902 | 5/5 | True | `0affba9f11b532f4` |
| 1286 | node2 | `gdrive_corpus_extractions/8cd094a90d_2602.02979v3.pdf.md` | 57145 | 8069 | 5/5 | True | `82b81240c2b4fed2` |
| 1287 | node2 | `gdrive_corpus_extractions/8d9c1a3c96_2212.05223v1.pdf.md` | 32561 | 4856 | 5/5 | True | `487aa7a1bd67426e` |
| 1288 | node2 | `gdrive_corpus_extractions/8df69a6f17_Predicting_NFL_Point_Spreads_via_Machine_Learning.pdf.md` | 52733 | 7684 | 5/5 | True | `073544d069c17552` |
| 1289 | node2 | `gdrive_corpus_extractions/8e3e01bd0c_arxiv_2312.14401v1.pdf.md` | 53694 | 7365 | 5/5 | True | `4577b1cc3eb11c83` |
| 1290 | node2 | `gdrive_corpus_extractions/8e458007f7_2024_-_SET_Spatial_Edge_Technique_A_Framework_to_Evaluate_Edge_Setters_-_Bhatia_.md` | 33279 | 4643 | 5/5 | True | `820ad513486ac96e` |
| 1291 | node2 | `gdrive_corpus_extractions/8e60d01aad_arxiv_1408.3304v2.pdf.md` | 64308 | 9210 | 5/5 | True | `5596abd5d74a9154` |
| 1292 | node2 | `gdrive_corpus_extractions/8eb593c502_arxiv_1808.07349v3.pdf.md` | 28357 | 4251 | 5/5 | True | `5a536c5dda5582f4` |
| 1293 | node2 | `gdrive_corpus_extractions/8f3b6da56f_preview-9781351210157_A37399389_1_.pdf.md` | 36364 | 5195 | 5/5 | True | `d35f06c36773aec3` |
| 1294 | node2 | `gdrive_corpus_extractions/8f5526a259_arxiv_2307.02161v2.pdf.md` | 55584 | 7806 | 5/5 | True | `3dff362b48141b4b` |
| 1295 | node2 | `gdrive_corpus_extractions/9033571f1e_arxiv_2002.08097v1.pdf.md` | 52108 | 8009 | 5/5 | True | `534cb8cc3aaf17e1` |
| 1296 | node2 | `gdrive_corpus_extractions/904b0a4b9f_2013_-_Trouble_with_the_Curve_Identifying_Clusters_of_Pitchers_using_Improved_Cl.md` | 46914 | 6653 | 5/5 | True | `e0e86190f9329fbf` |
| 1297 | node2 | `gdrive_corpus_extractions/90a43de03a_2020_Baller2vec.pdf.md` | 61038 | 9074 | 5/5 | True | `defe749d547f2e2c` |
| 1298 | node2 | `gdrive_corpus_extractions/90fbc2658c_arxiv_1804.08944v2.pdf.md` | 48015 | 6880 | 5/5 | True | `2b5f35403a764f57` |
| 1299 | node2 | `gdrive_corpus_extractions/9103d26b9e_2022_-_Home_Field_Advantage_in_English_Premier_League_-_Aird_et_al.pdf.md` | 61904 | 9131 | 5/5 | True | `82108ab46ed67a49` |
| 1300 | node2 | `gdrive_corpus_extractions/9197c071b5_arxiv_2210.03195v1.pdf.md` | 37825 | 5472 | 5/5 | True | `6dd0dd0f3aefb144` |
| 1301 | node2 | `gdrive_corpus_extractions/91fd7afeac_2012_-_Parsing_the_Relationship_between_Baserunning_and_Batting_Abilities_within.md` | 53306 | 7801 | 5/5 | True | `dcbbb010a7311378` |
| 1302 | node2 | `gdrive_corpus_extractions/92102fcc19_2602.08996v1.pdf.md` | 42712 | 6265 | 5/5 | True | `6a0e45fcf806a1d9` |
| 1303 | node2 | `gdrive_corpus_extractions/9217920c8b_arxiv_2606.23604v4.pdf.md` | 62832 | 8562 | 5/5 | True | `687885ecee2dabda` |
| 1304 | node2 | `gdrive_corpus_extractions/92d344c29d_openalex_W3091422730.pdf.md` | 41758 | 5646 | 5/5 | True | `795fe1e4ccc7f99d` |
| 1305 | node2 | `gdrive_corpus_extractions/92db14c08d_Football_Analytics-Sid.pdf.md` | 51867 | 7564 | 5/5 | True | `9b8c90b2458de454` |
| 1306 | node2 | `gdrive_corpus_extractions/94034a8455_arxiv_2503.07789v1.pdf.md` | 55531 | 8118 | 5/5 | True | `d977bccd5d419811` |
| 1307 | node2 | `gdrive_corpus_extractions/94aa7c1e9d_arxiv_2508.13000v2.pdf.md` | 65036 | 9220 | 5/5 | True | `59be9c4ca8dd7b8b` |
| 1308 | node2 | `gdrive_corpus_extractions/952722f2cc_arxiv_2405.13397v1.pdf.md` | 57285 | 8554 | 5/5 | True | `6ea1517ca62b76f9` |
| 1309 | node2 | `gdrive_corpus_extractions/95fc1789d9_openalex_W4392866727.pdf.md` | 46923 | 6505 | 5/5 | True | `846c22d8ba1a9058` |
| 1310 | node2 | `gdrive_corpus_extractions/9636e6e7c0_openalex_W2911422814.pdf.md` | 48771 | 6993 | 5/5 | True | `ccbe1a086e8f7e87` |
| 1311 | node2 | `gdrive_corpus_extractions/96532d2986_Bertsekas-2026-ACourseInReinforcementLearning-2ed.pdf.md` | 47069 | 6502 | 5/5 | True | `a70c935906dc7ada` |
| 1312 | node2 | `gdrive_corpus_extractions/96d5f0d0fa_openalex_W2058625733.pdf.md` | 66199 | 9691 | 5/5 | True | `21e6321d540a79e7` |
| 1313 | node2 | `gdrive_corpus_extractions/970773ac98_2026_-_All-Star_Based_Evaluation_of_Draft_Value_Curves_Across_Major_North_Americ.md` | 51412 | 7211 | 5/5 | True | `2bf44c8e5f916a61` |
| 1314 | node2 | `gdrive_corpus_extractions/974530f0c6_Concussion_PDF.pdf.md` | 44628 | 6122 | 5/5 | True | `e7093942c3388945` |
| 1315 | node2 | `gdrive_corpus_extractions/97d7ddf8a9_2026_-_Exploring_The_Fidelity_of_Resistance_Training_Interventions_in_Regional_R.md` | 52156 | 7633 | 5/5 | True | `2931cc8c1fa677bf` |
| 1316 | node2 | `gdrive_corpus_extractions/97e3846b02_openalex_W4365211505.pdf.md` | 28121 | 3953 | 5/5 | True | `f55bd591f309855d` |
| 1317 | node2 | `gdrive_corpus_extractions/98034a84dc_2412.11814v2.pdf.md` | 57139 | 8066 | 5/5 | True | `a99b497fe9aec250` |
| 1318 | node2 | `gdrive_corpus_extractions/98600b266d_openalex_W2474409091.pdf.md` | 59883 | 8609 | 5/5 | True | `1ff28367f8cc2f3c` |
| 1319 | node2 | `gdrive_corpus_extractions/98b267a6c9_openalex_W1594821797.pdf.md` | 33799 | 4682 | 5/5 | True | `92082c01b61b8835` |
| 1320 | node2 | `gdrive_corpus_extractions/98d5e2e8a7_2605.14855v1.pdf.md` | 39294 | 5686 | 5/5 | True | `321139ec0ba21b9c` |
| 1321 | node2 | `gdrive_corpus_extractions/99ad8509fb_2026_-_Effects_of_Lower_Leg_Cupping_on_Ankle_Dorsiflexion_Range_of_Motion_and_Mu.md` | 36516 | 5297 | 5/5 | True | `5b07abb21a7d2f24` |
| 1322 | node2 | `gdrive_corpus_extractions/99c9fc7bea_2206.07212.pdf.md` | 26644 | 3900 | 5/5 | True | `c99e8e07bcc1d148` |
| 1323 | node2 | `gdrive_corpus_extractions/99ebed6022_2012_Multi-Agent_Team_Behavior_from_Partial_Team_Tracings.pdf.md` | 61801 | 9451 | 5/5 | True | `7932c1b597cbb574` |
| 1324 | node2 | `gdrive_corpus_extractions/9a088792d8_arxiv_2512.08467v1.pdf.md` | 59791 | 8436 | 5/5 | True | `dd25514e5df57a73` |
| 1325 | node2 | `gdrive_corpus_extractions/9a493b04de_openalex_W2962770344.pdf.md` | 56687 | 8538 | 5/5 | True | `d84142bd1bda2d5f` |
| 1326 | node2 | `gdrive_corpus_extractions/9a557c60ad_openalex_W4402402002.pdf.md` | 63251 | 8916 | 5/5 | True | `ab51ade403a16e53` |
| 1327 | node2 | `gdrive_corpus_extractions/9aa1df5b71_arxiv_1705.04600v2.pdf.md` | 50395 | 7228 | 5/5 | True | `c0626e3c75d147e0` |
| 1328 | node2 | `gdrive_corpus_extractions/9aaaf2950d_openalex_W7216349447.pdf.md` | 34494 | 4935 | 4/5 | False | `3580d87ac97481b9` |
| 1329 | node2 | `gdrive_corpus_extractions/9b4d291201_68d6be744d7efccc22080814_193949_-_Using_Tracking_Data_to_Build_Offensive_Line_De.md` | 41015 | 5709 | 5/5 | True | `9dc72850b0608a39` |
| 1330 | node2 | `gdrive_corpus_extractions/9b6f0eb527_arxiv_2504.00160v1.pdf.md` | 51333 | 7166 | 5/5 | True | `a505f13b5befb7b9` |
| 1331 | node2 | `gdrive_corpus_extractions/9b83357364_arxiv_2006.13264v1.pdf.md` | 54305 | 7316 | 5/5 | True | `4980a66340eabffe` |
| 1332 | node2 | `gdrive_corpus_extractions/9bbfe908a4_2406.19563v2_1_.pdf.md` | 61404 | 8627 | 5/5 | True | `02dadd3e6b777fed` |
| 1333 | node2 | `gdrive_corpus_extractions/9c3f4916c6_2022_-_fRisbee_An_Open-Source_Package_for_College_and_Professional_Ultimate_Fris.md` | 42069 | 6268 | 5/5 | True | `0148b8b95f53a3b3` |
| 1334 | node2 | `gdrive_corpus_extractions/9c79bc1987_2017_Possession_Sketches_-_Mapping_NBA_Strategies.pdf.md` | 56407 | 8222 | 5/5 | True | `e397014afb13b4b2` |
| 1335 | node2 | `gdrive_corpus_extractions/9d0d014b9f_arxiv_2209.07795v1.pdf.md` | 58939 | 8628 | 5/5 | True | `5042f09e9609e7ec` |
| 1336 | node2 | `gdrive_corpus_extractions/9d28a92192_Stopford-2018-DesigningEventDrivenSystems.pdf.md` | 56126 | 8300 | 5/5 | True | `577458429c3f9136` |
| 1337 | node2 | `gdrive_corpus_extractions/9d53c498b1_2606.09842v1.pdf.md` | 22802 | 2987 | 5/5 | True | `34f26ef6f1f92a81` |
| 1338 | node2 | `gdrive_corpus_extractions/9d6b8b41b8_arxiv_2403.15712v1.pdf.md` | 49181 | 7437 | 5/5 | True | `89033db5d856c365` |
| 1339 | node2 | `gdrive_corpus_extractions/9d85c26522_openalex_W4394918065.pdf.md` | 57354 | 8060 | 5/5 | True | `946d13cd157a6cec` |
| 1340 | node2 | `gdrive_corpus_extractions/9e089eb34a_Schurig-Center-BINBA-Brain-Injury-Handbook.pdf.md` | 55864 | 7984 | 5/5 | True | `adb2a631a9b50dc4` |
| 1341 | node2 | `gdrive_corpus_extractions/9e46b90f0c_2510.15983v1.pdf.md` | 43528 | 5876 | 5/5 | True | `5076584dd38b7302` |
| 1342 | node2 | `gdrive_corpus_extractions/9e900cf950_2017_Sports_Science_Youth_Appeal_John_Drazan.pdf.md` | 33617 | 4563 | 5/5 | True | `0f43682683013a40` |
| 1343 | node2 | `gdrive_corpus_extractions/9ea9bcac9b_openalex_W3092918295.pdf.md` | 45282 | 6384 | 5/5 | True | `c1e8102dff7587a3` |
| 1344 | node2 | `gdrive_corpus_extractions/9eac1867fa_2025_-_Modeling_Realistic_Placement_Probabilities_in_Speedcubing_Using_Kernel_De.md` | 40906 | 5987 | 5/5 | True | `196b087158657476` |
| 1345 | node2 | `gdrive_corpus_extractions/9f2d18c673_2022_-_Creating_a_Better_Pythagorean_Expectation_for_Basketball_-_Zhuang_et_al.p.md` | 58923 | 8590 | 5/5 | True | `af2aedce2c24981e` |
| 1346 | node2 | `gdrive_corpus_extractions/9f54104940_Downey-2018-ThinkComplexity-2e.pdf.md` | 51486 | 7320 | 5/5 | True | `9b00ca96717306d4` |
| 1347 | node2 | `gdrive_corpus_extractions/9f5b368dfb_Modelling_the_dynamic_pattern_of_surface.pdf.md` | 36734 | 5198 | 5/5 | True | `0121caedcbe8506e` |
| 1348 | node2 | `gdrive_corpus_extractions/a038c75bbb_numpybook.pdf.md` | 35050 | 5381 | 5/5 | True | `8065560e5b5bd28b` |
| 1349 | node2 | `gdrive_corpus_extractions/a0555a2f78_2019_Relative_age_effects_in_American_professional_football_-_Jack_F._Heneghan_a.md` | 58050 | 8401 | 5/5 | True | `ca68b8c84d79b6d8` |
| 1350 | node2 | `gdrive_corpus_extractions/a0cb7e9cff_2017_PageRank_Model_for_Player_Performance_Assessment.pdf.md` | 57273 | 8811 | 5/5 | True | `d84cc6a560780df3` |
| 1351 | node2 | `gdrive_corpus_extractions/a12ea5cfed_openalex_W7135026682.pdf.md` | 50943 | 7078 | 5/5 | True | `d772b8b79eff9e9c` |
| 1352 | node2 | `gdrive_corpus_extractions/a130f89bdc_2015_-_Rethinking_the_FIFA_World_Cup_final_draw_-_Unknown_Authors.pdf.md` | 42341 | 6076 | 5/5 | True | `f71153715df419f3` |
| 1353 | node2 | `gdrive_corpus_extractions/a19f0d1942_arxiv_2011.06014v1.pdf.md` | 57755 | 8376 | 5/5 | True | `0b077da0ef9b14b2` |
| 1354 | node2 | `gdrive_corpus_extractions/a1ad3f81af_2026_-_Explaining_Basketball_Shot_Classifications_with_Grad-CAM_An_Investigation.md` | 58746 | 8846 | 5/5 | True | `7bc4fcbff6db676f` |
| 1355 | node2 | `gdrive_corpus_extractions/a2c3964861_openalex_W4377007847.pdf.md` | 52254 | 7262 | 5/5 | True | `1c5bd5e4acb56381` |
| 1356 | node2 | `gdrive_corpus_extractions/a2c665fa17_openalex_W7155020784.pdf.md` | 33463 | 4813 | 5/5 | True | `c8a60d4908464e12` |
| 1357 | node2 | `gdrive_corpus_extractions/a3bacfa5d0_Forecasting_basketball_players_performan.pdf.md` | 43763 | 6418 | 5/5 | True | `5518ebd64be7f625` |
| 1358 | node2 | `gdrive_corpus_extractions/a3de879972_ai4all.pdf.md` | 24234 | 3384 | 5/5 | True | `8cb839c90b2ba35a` |
| 1359 | node2 | `gdrive_corpus_extractions/a3e4c7a65d_Data_Mining_in_Sports_A_Research_Overvie.pdf.md` | 50335 | 7120 | 5/5 | True | `13e438c31629eccb` |
| 1360 | node2 | `gdrive_corpus_extractions/a490d77523_SIGN-2013-BrainInjuryRehabilitationInAdults-SIGN130.pdf.md` | 56370 | 7751 | 5/5 | True | `f51782dbef5528e8` |
| 1361 | node2 | `gdrive_corpus_extractions/a4a7a60f67_openalex_W3045149055.pdf.md` | 51624 | 7066 | 5/5 | True | `47a51fea93fcd67c` |
| 1362 | node2 | `gdrive_corpus_extractions/a4aa9c8f31_Foul_Accumulation_in_the_NBA.pdf.md` | 34968 | 4954 | 5/5 | True | `0a0cf8d41de5d417` |
| 1363 | node2 | `gdrive_corpus_extractions/a4f29c628e_1908.02423v1.pdf.md` | 31807 | 4600 | 5/5 | True | `260dbca08a755559` |
| 1364 | node2 | `gdrive_corpus_extractions/a50c2d3a29_2025_-_Enhancing_NBA_True_Shot_Charts_A_Probabilistic_Spatial_Approach_to_Reboun.md` | 47813 | 6775 | 5/5 | True | `9a319381ed85dc1d` |
| 1365 | node2 | `gdrive_corpus_extractions/a5600e2c62_2609.28049v1.pdf.md` | 71299 | 10260 | 5/5 | True | `6cda98ac54ebf344` |
| 1366 | node2 | `gdrive_corpus_extractions/a5b14882bf_openalex_W3215120012.pdf.md` | 56204 | 7622 | 5/5 | True | `dfee691fb90c7a89` |
| 1367 | node2 | `gdrive_corpus_extractions/a5b881b11e_KELLEY_FREDERICK_MICHAEL_SPRING_2009_508CompliantCopy.pdf.md` | 56289 | 8492 | 5/5 | True | `248340b41c7ee888` |
| 1368 | node2 | `gdrive_corpus_extractions/a5e9d0fab8_1904.01192v1.pdf.md` | 56769 | 7885 | 5/5 | True | `86ba817a27276e81` |
| 1369 | node2 | `gdrive_corpus_extractions/a5fc2ad657_2605.13142v2.pdf.md` | 38092 | 5312 | 5/5 | True | `398cb75e527e8dcc` |
| 1370 | node2 | `gdrive_corpus_extractions/a66ce42218_openalex_W4390009575.pdf.md` | 63232 | 9010 | 5/5 | True | `aac9fae2f991f845` |
| 1371 | node2 | `gdrive_corpus_extractions/a6811477ef_arxiv_1907.03698v1.pdf.md` | 64165 | 9216 | 5/5 | True | `14e83e4a45fa44ed` |
| 1372 | node2 | `gdrive_corpus_extractions/a6c9924bb3_2025_-_AI_Special_Feature_AI-Assisted_Substitution_Decisions_A_Fuzzy_Logic_Appro.md` | 29163 | 4038 | 5/5 | True | `330e0fb3a24db047` |
| 1373 | node2 | `gdrive_corpus_extractions/a6d746a92c_2511.13326v2.pdf.md` | 32887 | 4679 | 5/5 | True | `6f85436863c9ed65` |
| 1374 | node2 | `gdrive_corpus_extractions/a6f63b3cac_arxiv_2411.04501v1.pdf.md` | 51321 | 7592 | 5/5 | True | `0cd2bd09de46ea64` |
| 1375 | node2 | `gdrive_corpus_extractions/a718683af5_32263160.pdf.md` | 47449 | 6803 | 5/5 | True | `a7f807b6210a5df4` |
| 1376 | node2 | `gdrive_corpus_extractions/a778120cce_2211.02219v3.pdf.md` | 27062 | 3843 | 5/5 | True | `298843e37ffa23c0` |
| 1377 | node2 | `gdrive_corpus_extractions/a7a086d1a2_arxiv_2609.26315v1.pdf.md` | 29868 | 4349 | 5/5 | True | `6a109a16b9cac659` |
| 1378 | node2 | `gdrive_corpus_extractions/a9010c175e_Pavlov-1927-ConditionedReflexes.pdf.md` | 49600 | 6906 | 5/5 | True | `9ee82f3074da4e9e` |
| 1379 | node2 | `gdrive_corpus_extractions/a90ee199f8_openalex_W2968744122.pdf.md` | 63787 | 9589 | 5/5 | True | `b43c7f06d4418cdc` |
| 1380 | node2 | `gdrive_corpus_extractions/a9156f88ef_mcs.pdf.md` | 60084 | 8839 | 5/5 | True | `02db5bc7a2cc443f` |
| 1381 | node2 | `gdrive_corpus_extractions/a98408c95f_arxiv_2403.10826v2.pdf.md` | 59444 | 8304 | 5/5 | True | `e9878c21fed7516d` |
| 1382 | node2 | `gdrive_corpus_extractions/ab0703528a_openalex_W4384340060.pdf.md` | 53678 | 7925 | 5/5 | True | `4f851d232eb217e2` |
| 1383 | node2 | `gdrive_corpus_extractions/ac2fe93a51_SuttonBarto-2018-ReinforcementLearningIntroduction.pdf.md` | 99637 | 14789 | 5/5 | True | `ba0f449295605bd4` |
| 1384 | node2 | `gdrive_corpus_extractions/ac7298290b_MavroudisCiobica-2025-TraumaticBrainInjury-RecentAdvancesAndChallenges.pdf.md` | 63693 | 9320 | 5/5 | True | `b55604c5a72de6d3` |
| 1385 | node2 | `gdrive_corpus_extractions/acf13c235d_2026_-_When_the_Strike_Zone_Becomes_Algorithmic_Umpire_Judgment_and_Player_Chall.md` | 44456 | 6402 | 5/5 | True | `62b96390bb0618b8` |
| 1386 | node2 | `gdrive_corpus_extractions/acf9fcdeae_2025_-_One_x_G_model_to_rule_them_all_Robert_Bajons_Tobias_Harringer_-_Unknown_A.md` | 46045 | 6738 | 5/5 | True | `07888a1526c286e3` |
| 1387 | node2 | `gdrive_corpus_extractions/ad3a263ac6_Sports-Tech-Annual-Chapter-4-Betting-Fantasy-Sports.pdf.md` | 52236 | 7313 | 5/5 | True | `196a4ae19da86434` |
| 1388 | node2 | `gdrive_corpus_extractions/ae63172065_openalex_W2301927419.pdf.md` | 46551 | 6408 | 5/5 | True | `54b92b20de562e54` |
| 1389 | node2 | `gdrive_corpus_extractions/ae6f8a36fb_arxiv_2109.04720v1.pdf.md` | 57178 | 8231 | 5/5 | True | `78ccf4027396215f` |
| 1390 | node2 | `gdrive_corpus_extractions/af64c679f9_openalex_W4287647045.pdf.md` | 49577 | 6732 | 5/5 | True | `7efcaaf0e591e536` |
| 1391 | node2 | `gdrive_corpus_extractions/afb74df38b_arxiv_2407.16076v1.pdf.md` | 66760 | 9784 | 5/5 | True | `bdc76a814da00436` |
| 1392 | node2 | `gdrive_corpus_extractions/b05c48d977_LindholmEtAl-2026-MachineLearningAFirstCourseForEngineersAndScientists-Draft.pdf.md` | 53897 | 7809 | 5/5 | True | `26e7007d59f746c6` |
| 1393 | node2 | `gdrive_corpus_extractions/b0d1ef0510_openalex_W2395669488.pdf.md` | 44535 | 6527 | 5/5 | True | `66db4a07ef2a6999` |
| 1394 | node2 | `gdrive_corpus_extractions/b12f5f61bc_Advanced_AI_Architectures_for_Engineering_Innovation.pdf.md` | 73171 | 9918 | 5/5 | True | `f52b2576fa9b3669` |
| 1395 | node2 | `gdrive_corpus_extractions/b1ceea385e_16678907951_1_.pdf.md` | 49553 | 6904 | 5/5 | True | `5184c87aa7dd1690` |
| 1396 | node2 | `gdrive_corpus_extractions/b211926ec6_ZhouEd-2019-TBI-NeurobiologyDiagnosisAndTreatment.pdf.md` | 44420 | 6287 | 5/5 | True | `c70e214998790c86` |
| 1397 | node2 | `gdrive_corpus_extractions/b2489094d2_arxiv_2308.09905v2.pdf.md` | 49395 | 7007 | 5/5 | True | `059eb5e8369cd926` |
| 1398 | node2 | `gdrive_corpus_extractions/b278d9c44c_openalex_W3141380301.pdf.md` | 65750 | 9492 | 5/5 | True | `6a58fc714c4e2f9a` |
| 1399 | node2 | `gdrive_corpus_extractions/b2b10cc97d_2021_-_Performance_Index_A_New_Way_To_Compare_Players_-_Unknown_Authors.pdf.md` | 59682 | 8777 | 5/5 | True | `212cfa4a0b1d23a6` |
| 1400 | node2 | `gdrive_corpus_extractions/b2c4a913ab_2020_-_Models_for_generating_NCAA_men_s_basketball_tournament_bracket_pools_-_Lu.md` | 37409 | 5356 | 5/5 | True | `cf3d6142dca68c91` |
| 1401 | node2 | `gdrive_corpus_extractions/b338dfaf03_2012_-_A_Comparison_of_the_Autocorrelation_and_Variance_of_NFL_Team_Strengths_Ov.md` | 64005 | 9162 | 5/5 | True | `68afa795229cc74e` |
| 1402 | node2 | `gdrive_corpus_extractions/b36fd7711e_2021_Predicting_NBA_Talent_from_Enormous_Amounts_of_College_Basketball_Tracking_.md` | 59991 | 8370 | 5/5 | True | `c4f87b91a0faafd2` |
| 1403 | node2 | `gdrive_corpus_extractions/b384622b6f_arxiv_2001.05161v1.pdf.md` | 58860 | 8572 | 5/5 | True | `2eefc5356d83610c` |
| 1404 | node2 | `gdrive_corpus_extractions/b3a8635ed9_2025_-_Using_Markov_Chains_and_Statistical_Analysis_to_Model_Intentional_Fouling.md` | 56416 | 8495 | 5/5 | True | `e6946dc0ba706913` |
| 1405 | node2 | `gdrive_corpus_extractions/b5813a2685_McKenney-2025-IsParallelProgrammingHard-AndIfSoWhatCanYouDoAboutIt.pdf.md` | 71469 | 10521 | 5/5 | True | `75cfdfec6cbf2dd7` |
| 1406 | node2 | `gdrive_corpus_extractions/b5d5551f7e_undated_-_A_model-based_risk-impact_analysis_of_dribble_actions_in_women_s_socce.md` | 51876 | 7084 | 5/5 | True | `e7556cf16b99a257` |
| 1407 | node2 | `gdrive_corpus_extractions/b6469302e6_The_Quantitative_Analysis_and_Visualization_of_NFL_Passing_Routes.pdf.md` | 46411 | 6572 | 5/5 | True | `a24fc27897d583dd` |
| 1408 | node2 | `gdrive_corpus_extractions/b6a6f27ac4_Edwards-1916-Football-Days.pdf.md` | 42127 | 6583 | 5/5 | True | `ccdf9367db639b66` |
| 1409 | node2 | `gdrive_corpus_extractions/b6a7184c05_2025_-_Multi-Model_Consensus_an_Ensemble_Approach_to_Basketball_Predictions_-_Gu.md` | 58120 | 8130 | 5/5 | True | `814322d727017383` |
| 1410 | node2 | `gdrive_corpus_extractions/b6ccff4a76_TsaoEtAlEds-2021-Concussion-Frontiers.pdf.md` | 30469 | 4195 | 5/5 | True | `3af0f4338635e450` |
| 1411 | node2 | `gdrive_corpus_extractions/b705384f38_2608.21381v1.pdf.md` | 71652 | 9950 | 5/5 | True | `5bfa5d3ca203512a` |
| 1412 | node2 | `gdrive_corpus_extractions/b7acf3962c_Prince-2023-UnderstandingDeepLearning.pdf.md` | 47413 | 6627 | 5/5 | True | `51f3a2dc80398ffe` |
| 1413 | node2 | `gdrive_corpus_extractions/b849b56139_arxiv_2505.03445v1.pdf.md` | 20495 | 2950 | 5/5 | True | `19c21df8a11fbdbe` |
| 1414 | node2 | `gdrive_corpus_extractions/b8575b4e79_openalex_W4416137375.pdf.md` | 55756 | 7781 | 5/5 | True | `13f769ea173e52c5` |
| 1415 | node2 | `gdrive_corpus_extractions/b932a57fb1_openalex_W3154792453.pdf.md` | 34881 | 4795 | 5/5 | True | `79ab650c3aa85233` |
| 1416 | node2 | `gdrive_corpus_extractions/b96323a7a4_openalex_W4409777651.pdf.md` | 57750 | 8030 | 5/5 | True | `b6cb3e8ff999e243` |
| 1417 | node2 | `gdrive_corpus_extractions/ba546b8436_machine-learning-projects-python.pdf.md` | 30441 | 4015 | 5/5 | True | `f3e637e61e73d361` |
| 1418 | node2 | `gdrive_corpus_extractions/ba89c51217_RasmussenWilliams-2006-GaussianProcessesForMachineLearning.pdf.md` | 30856 | 4368 | 5/5 | True | `3053164d6fa9bb78` |
| 1419 | node2 | `gdrive_corpus_extractions/bab6016571_arxiv_2403.14769v2.pdf.md` | 61196 | 8746 | 5/5 | True | `e41406f9ffa26545` |
| 1420 | node2 | `gdrive_corpus_extractions/bae79edd0a_VaibhavAhluwaliaGaurEds-2023-BrainInjuryNeurodegeneration-MolecularFunctionalTra.md` | 34371 | 4945 | 5/5 | True | `f156edad767b30e7` |
| 1421 | node2 | `gdrive_corpus_extractions/bae9641a1a_2308.01492v1.pdf.md` | 62919 | 8997 | 5/5 | True | `aa9b7017e4ab5d4c` |
| 1422 | node2 | `gdrive_corpus_extractions/bb09c17fef_openalex_W3022099801.pdf.md` | 50977 | 7270 | 5/5 | True | `34aba60eaa9a2dcd` |
| 1423 | node2 | `gdrive_corpus_extractions/bb7388efa4_Szeliski-2022-ComputerVisionAlgorithmsAndApplications-Draft.pdf.md` | 55787 | 7841 | 5/5 | True | `39cf2cbab628b1a9` |
| 1424 | node2 | `gdrive_corpus_extractions/bbaffe47f6_2020_Harris-SwingShiftCompressed.pdf.md` | 52440 | 8211 | 5/5 | True | `a38647829716fabd` |
| 1425 | node2 | `gdrive_corpus_extractions/bc20cf5b44_2026_-_TTNet_-_Multi-Task_Deep_Learning_for_Table_Tennis_Player_Analysis_with_Sm.md` | 60334 | 9416 | 5/5 | True | `c2a4babefe84ced8` |
| 1426 | node2 | `gdrive_corpus_extractions/bc5069abec_2105.09506v1.pdf.md` | 58436 | 7983 | 5/5 | True | `5496564a62ccf1cd` |
| 1427 | node2 | `gdrive_corpus_extractions/be052e81df_openalex_W4404209445.pdf.md` | 67899 | 10143 | 5/5 | True | `bcf5bba745d2fe97` |
| 1428 | node2 | `gdrive_corpus_extractions/be0f684b59_814578.pdf.md` | 62001 | 8327 | 5/5 | True | `3ed5a83a9bb36daf` |
| 1429 | node2 | `gdrive_corpus_extractions/bf15208375_2024_-_Evaluating_plate_discipline_in_Major_League_Baseball_with_Bayesian_Additi.md` | 54941 | 7767 | 5/5 | True | `3e6d1bf9c08bc8d8` |
| 1430 | node2 | `gdrive_corpus_extractions/bfd11acfdb_Modeling_Player_and_Team_Performance_in_Basketball_-_Terner_Franks.pdf.md` | 59285 | 8241 | 5/5 | True | `ed5b03645ee3736b` |
| 1431 | node2 | `gdrive_corpus_extractions/c018fc8779_arxiv_2404.09807v1.pdf.md` | 70593 | 10358 | 5/5 | True | `88ef9145080d1a9f` |
| 1432 | node2 | `gdrive_corpus_extractions/c035184dc8_openalex_W2158250595.pdf.md` | 31785 | 4463 | 5/5 | True | `c0129eb1c1d58c02` |
| 1433 | node2 | `gdrive_corpus_extractions/c0c33dd4a6_arxiv_2406.01011v1.pdf.md` | 49896 | 7026 | 5/5 | True | `fdbe491364d123b7` |
| 1434 | node2 | `gdrive_corpus_extractions/c12876d8c2_2021_-_An_Analysis_of_Quarterback_Ability_to_Hit_Receivers_In-Stride_Using_NFL_P.md` | 65843 | 8913 | 5/5 | True | `155b4b2922b87318` |
| 1435 | node2 | `gdrive_corpus_extractions/c159e319b3_openalex_W2331491097.pdf.md` | 59736 | 7977 | 5/5 | True | `d0c8b5a402f0fa29` |
| 1436 | node2 | `gdrive_corpus_extractions/c15cf5a2f4_PolyanskiyWu-2025-InformationTheoryFromCodingToLearning.pdf.md` | 41110 | 5457 | 5/5 | True | `6116ed7a5bdaa4ea` |
| 1437 | node2 | `gdrive_corpus_extractions/c19f404ff0_2023_-_Evaluating_the_outcomes_of_passing_plays_from_a_quarterback_s_perspective.md` | 59444 | 8333 | 5/5 | True | `62cb2e9a8431ac8a` |
| 1438 | node2 | `gdrive_corpus_extractions/c20b417d26_2026_-_MoveBench_A_Rubric-Based_Benchmark_for_Evaluating_Large_Language_Models_i.md` | 55943 | 7899 | 5/5 | True | `c523d312804a63d8` |
| 1439 | node2 | `gdrive_corpus_extractions/c20bedf046_d2459df1-279f-4ab9-9cdc-a0f489a95a5c.pdf.md` | 65676 | 9724 | 5/5 | True | `ff2520d9e152b97d` |
| 1440 | node2 | `gdrive_corpus_extractions/c229c7aa64_2205.11807.pdf.md` | 58954 | 8625 | 5/5 | True | `b406a8a23a0e0b4c` |
| 1441 | node2 | `gdrive_corpus_extractions/c22d517e45_2512.15386v1.pdf.md` | 45069 | 6607 | 5/5 | True | `dd67b80609fee633` |
| 1442 | node2 | `gdrive_corpus_extractions/c3216c451e_openalex_W3155172600.pdf.md` | 64676 | 9296 | 5/5 | True | `948b39104ec91259` |
| 1443 | node2 | `gdrive_corpus_extractions/c335b85358_1906.03339.pdf.md` | 57627 | 8270 | 5/5 | True | `1ff5919d28ee987d` |
| 1444 | node2 | `gdrive_corpus_extractions/c38976ef84_arxiv_1502.03532v2.pdf.md` | 31395 | 4573 | 5/5 | True | `fe65d72f0c2318b1` |
| 1445 | node2 | `gdrive_corpus_extractions/c3a22ffdff_advanced-engineering-mathematics_by-erwin-kreyszig-__10th_edition-1_1_.pdf.md` | 43628 | 6258 | 5/5 | True | `f197232445a21659` |
| 1446 | node2 | `gdrive_corpus_extractions/c3c39b1040_Narkhede-Shapira-Palino-2017-KafkaTheDefinitiveGuide-1e.pdf.md` | 38093 | 5377 | 5/5 | True | `d50712790faa69c6` |
| 1447 | node2 | `gdrive_corpus_extractions/c3f024054a_openalex_W7151803985.pdf.md` | 47288 | 6570 | 5/5 | True | `c2fce040b7fa1399` |
| 1448 | node2 | `gdrive_corpus_extractions/c3fe9acd4b_2025_-_Quantifying_the_Drivers_of_Serve_Effectiveness_in_Men_s_Tennis_-_Chen_et_.md` | 64630 | 9256 | 5/5 | True | `6156eaf30a97170d` |
| 1449 | node2 | `gdrive_corpus_extractions/c4386dc83e_qt5qw5382d_noSplash_983c1629d166d6b046b4a2d65e75e816.pdf.md` | 19626 | 2855 | 5/5 | True | `d5474941e6b326c5` |
| 1450 | node2 | `gdrive_corpus_extractions/c471ee5990_2026_-_Auditing_Contextual_Bias_in_Human_Ball-Strike_Calls_Using_KBO_s_Automated.md` | 36274 | 5030 | 5/5 | True | `ed0c502c8694db96` |
| 1451 | node2 | `gdrive_corpus_extractions/c4cbf829ca_openalex_W7216462896.pdf.md` | 35041 | 4829 | 5/5 | True | `9a7ad273a2ef85fb` |
| 1452 | node2 | `gdrive_corpus_extractions/c4d1252c79_arxiv_2105.07468v1.pdf.md` | 54630 | 7848 | 5/5 | True | `13079bb8517b0e1b` |
| 1453 | node2 | `gdrive_corpus_extractions/c5d7a838ea_arxiv_2608.30227v1.pdf.md` | 23414 | 3494 | 5/5 | True | `8feebc82c0af055c` |
| 1454 | node2 | `gdrive_corpus_extractions/c5fe68815a_2303.11174v2.pdf.md` | 45472 | 6626 | 5/5 | True | `2ddab4491dcf20f2` |
| 1455 | node2 | `gdrive_corpus_extractions/c637a0befa_openalex_W7215777517.pdf.md` | 43518 | 6489 | 5/5 | True | `8707bf2b9b479f02` |
| 1456 | node2 | `gdrive_corpus_extractions/c7116dec6a_2025_-_Decoding_attacking_success_in_soccer_a_data-driven_analysis_of_expected_p.md` | 59610 | 9174 | 5/5 | True | `084a7422b6d1fb78` |
| 1457 | node2 | `gdrive_corpus_extractions/c7543a46fa_openalex_W2963656397.pdf.md` | 62103 | 9986 | 5/5 | True | `9448f1efff321586` |
| 1458 | node2 | `gdrive_corpus_extractions/c796ce20e9_arxiv_2603.29761v1.pdf.md` | 53636 | 8163 | 5/5 | True | `f94ced38e72ec38c` |
| 1459 | node2 | `gdrive_corpus_extractions/c8351139c5_2023_-_A_Bayesian_analysis_of_the_time_through_the_order_penalty_in_baseball_-_B.md` | 34201 | 4785 | 5/5 | True | `32de6421386009d4` |
| 1460 | node2 | `gdrive_corpus_extractions/c83e6b5dea_a529c355e09a9c7e8a1d4f5d1e6e08558c69.pdf.md` | 26829 | 3799 | 5/5 | True | `2c9f41458748876a` |
| 1461 | node2 | `gdrive_corpus_extractions/c84458b719_openalex_W2980889515.pdf.md` | 50570 | 7321 | 5/5 | True | `901aa070aff84f5d` |
| 1462 | node2 | `gdrive_corpus_extractions/c886b772a7_2016_Optimal_Defensive_Disruption_Soccer.pdf.md` | 34263 | 4781 | 5/5 | True | `4da82af42651346f` |
| 1463 | node2 | `gdrive_corpus_extractions/c8ec997481_1512.06808v1.pdf.md` | 53513 | 7829 | 5/5 | True | `8d665593cdaedbf0` |
| 1464 | node2 | `gdrive_corpus_extractions/c8ed28704f_2506.03032v1.pdf.md` | 21472 | 3110 | 5/5 | True | `010b9f0613fa40ad` |
| 1465 | node2 | `gdrive_corpus_extractions/c91f56f106_openalex_W1938404366.pdf.md` | 34302 | 4789 | 5/5 | True | `2a63f59372a0f52a` |
| 1466 | node2 | `gdrive_corpus_extractions/ca0b01fb1b_openalex_W3205709908.pdf.md` | 60197 | 8850 | 5/5 | True | `7bfeec04ce93c948` |
| 1467 | node2 | `gdrive_corpus_extractions/ca54afeef2_2016_NBA_Offensive_Plays_using_Neural_Networks.pdf.md` | 26715 | 3862 | 5/5 | True | `778153c2f6e176ed` |
| 1468 | node2 | `gdrive_corpus_extractions/ca80fde601_2026_-_Going_for_Gold_Using_Neuromuscular_Skeletal_Machine_Learning_Simulations_.md` | 70317 | 10104 | 5/5 | True | `6614c9fcca5669bd` |
| 1469 | node2 | `gdrive_corpus_extractions/cac8c40053_openalex_W4396796758.pdf.md` | 57650 | 8129 | 5/5 | True | `13dd3792212339db` |
| 1470 | node2 | `gdrive_corpus_extractions/caebdf1cac_2026_-_Long-Term_Effects_of_NASM-OPT_Periodized_Training_on_Lower-Limb_Strength_.md` | 52693 | 7737 | 5/5 | True | `9f417652877a2c8e` |
| 1471 | node2 | `gdrive_corpus_extractions/cb0c73611c_openalex_W3015873503.pdf.md` | 56965 | 8096 | 5/5 | True | `96b89ef42a0bdad8` |
| 1472 | node2 | `gdrive_corpus_extractions/cbbd385d45_Kleppmann-2016-MakingSenseOfStreamProcessing.pdf.md` | 42131 | 6051 | 5/5 | True | `f45f6d9cc21c4fec` |
| 1473 | node2 | `gdrive_corpus_extractions/cc26ce3602_2024_-_Revisiting_player_contributions_in_regularized_adjusted_plus-minus_models.md` | 58086 | 8366 | 5/5 | True | `14e492538f44e11f` |
| 1474 | node2 | `gdrive_corpus_extractions/cc67a53408_arxiv_2604.10527v1.pdf.md` | 66454 | 9498 | 5/5 | True | `d9de94be1c0673a5` |
| 1475 | node2 | `gdrive_corpus_extractions/cc7fb8161e_2020_-_Going_deep_models_for_continuous-time_within-play_valuation_of_game_outco.md` | 38339 | 5617 | 5/5 | True | `fcf65cd91b595ab9` |
| 1476 | node2 | `gdrive_corpus_extractions/cd0df1a695_openalex_W3150086808.pdf.md` | 31773 | 4520 | 5/5 | True | `f8a75a4c13b00288` |
| 1477 | node2 | `gdrive_corpus_extractions/cd5f21c15d__OceanofPDF.com_Ultimate_Step_by_Step_Guide_to_Machine_Lea_-_Daneyal_Anis.pdf.md` | 39108 | 5807 | 5/5 | True | `e58a61a88bfa905e` |
| 1478 | node2 | `gdrive_corpus_extractions/cd6e7a6ab9_1710.00001.pdf.md` | 21948 | 3129 | 5/5 | True | `8da5f35bd8a97ed0` |
| 1479 | node2 | `gdrive_corpus_extractions/cd966a5df8_2509.05913v3.pdf.md` | 41266 | 5981 | 5/5 | True | `b45629ef49a89fc9` |
| 1480 | node2 | `gdrive_corpus_extractions/ce29026b49_openalex_W7203475461.pdf.md` | 45402 | 6486 | 5/5 | True | `9035d94b468c6eb5` |
| 1481 | node2 | `gdrive_corpus_extractions/ce33597774_openalex_W7215122567.pdf.md` | 60435 | 8154 | 5/5 | True | `ad6bb6bc1a0b7b76` |
| 1482 | node2 | `gdrive_corpus_extractions/ce4bdb165b_ShalevShwartz-2012-OnlineLearningAndOnlineConvexOptimization.pdf.md` | 44786 | 6502 | 5/5 | True | `6f11bd3a16f13550` |
| 1483 | node2 | `gdrive_corpus_extractions/ceb9b8bb5a_Robinson-Webber-Eifrem-2015-GraphDatabases-2e.pdf.md` | 39393 | 5828 | 5/5 | True | `599083324927a7a3` |
| 1484 | node2 | `gdrive_corpus_extractions/d02daeb86b_2024_-_Analyzing_Force_in_Tackling_with_the_Creation_of_the_Force_Over_Expected_.md` | 52262 | 7403 | 5/5 | True | `012379fbe29f084c` |
| 1485 | node2 | `gdrive_corpus_extractions/d03ce56c22_2026_-_Towards_Comprehensive_Basketball_Understanding_-_Hu_et_al.pdf.md` | 64386 | 9122 | 5/5 | True | `0ca9b9c862dc83e8` |
| 1486 | node2 | `gdrive_corpus_extractions/d0d1c5ecec_openalex_W2186129572.pdf.md` | 35459 | 4934 | 5/5 | True | `b84316a42f052843` |
| 1487 | node2 | `gdrive_corpus_extractions/d147062912_2017_-_A_switching_dynamic_generalized_linear_model_to_detect_abnormal_performan.md` | 63461 | 9247 | 5/5 | True | `d80da3fe9a0c5ef1` |
| 1488 | node2 | `gdrive_corpus_extractions/d15abf976c_openalex_W2070741213.pdf.md` | 34251 | 4490 | 5/5 | True | `78fb58852e78026f` |
| 1489 | node2 | `gdrive_corpus_extractions/d1720938cf_arxiv_2609.02854v1.pdf.md` | 66791 | 9879 | 5/5 | True | `f8e5917aa5d6751e` |
| 1490 | node2 | `gdrive_corpus_extractions/d18dbdad8c_arxiv_2410.01678v2.pdf.md` | 11671 | 1635 | 5/5 | True | `f84513ce3cfb16fc` |
| 1491 | node2 | `gdrive_corpus_extractions/d1d25221f7_2017_Hockey_Passing_Defensive_Ability.pdf.md` | 43729 | 6303 | 5/5 | True | `a489b259040d3d97` |
| 1492 | node2 | `gdrive_corpus_extractions/d266791362_2025_-_Pairwise-Elo_rating_system_-_Wong_et_al.pdf.md` | 51170 | 7564 | 5/5 | True | `5f1be38edf62e496` |
| 1493 | node2 | `gdrive_corpus_extractions/d26dd30386__OceanofPDF.com_The_logic_of_sports_betting_-_Ed_Miller.pdf.md` | 51332 | 7539 | 5/5 | True | `b5f4979424dd3cfd` |
| 1494 | node2 | `gdrive_corpus_extractions/d2e7328368_2012_Forecasting_NBA_Player_Performance_Douglas_Hwang.pdf.md` | 43293 | 6508 | 5/5 | True | `36d1802eb7b40957` |
| 1495 | node2 | `gdrive_corpus_extractions/d3ac84a4b2_ShumwayStoffer-2017-TimeSeriesAnalysisAndItsApplications4.pdf.md` | 50793 | 6970 | 5/5 | True | `a0bab4809bb2f27a` |
| 1496 | node2 | `gdrive_corpus_extractions/d4034a9212_openalex_W2073082666.pdf.md` | 65287 | 9432 | 5/5 | True | `998b7db22a39ae8e` |
| 1497 | node2 | `gdrive_corpus_extractions/d40961cc63_2024_-_Footedness_How_important_is_it_-_Unknown_Authors.pdf.md` | 46428 | 6816 | 5/5 | True | `5f7b2ed93edc7978` |
| 1498 | node2 | `gdrive_corpus_extractions/d45f27abd5_HutterKotthoffVanschoren-2019-AutomatedMachineLearning.pdf.md` | 45034 | 6324 | 5/5 | True | `59645e8c017223ba` |
| 1499 | node2 | `gdrive_corpus_extractions/d49786edf5_2608.01260v1_1_.pdf.md` | 29581 | 3818 | 5/5 | True | `8bc60beadbeb1b09` |
| 1500 | node2 | `gdrive_corpus_extractions/d4a5de2a09_2509.21673v1.pdf.md` | 35121 | 5125 | 5/5 | True | `3235640393c714c4` |
| 1501 | node2 | `gdrive_corpus_extractions/d4b125809c_openalex_W4295689624.pdf.md` | 47073 | 6174 | 5/5 | True | `7a8a090643596b64` |
| 1502 | node2 | `gdrive_corpus_extractions/d5085be710_openalex_W4407144972.pdf.md` | 39769 | 5939 | 5/5 | True | `0dba5416746d392d` |
| 1503 | node2 | `gdrive_corpus_extractions/d51742b5d3_2023_-_Against_All_Odds_Leicester_City_s_Triumphant_Journey_to_Premier_League_Gl.md` | 54994 | 8500 | 5/5 | True | `c6a0316b94d04969` |
| 1504 | node2 | `gdrive_corpus_extractions/d5cf7925c3_arxiv_2301.07583v1.pdf.md` | 47048 | 6913 | 5/5 | True | `9e4d12e8e6305985` |
| 1505 | node2 | `gdrive_corpus_extractions/d67881f554_MacKay-2003-InformationTheoryInferenceLearningAlgorithms.pdf.md` | 52318 | 7773 | 5/5 | True | `a70c1ac62dc94bec` |
| 1506 | node2 | `gdrive_corpus_extractions/d6b34b2ae8_2026_-_SoccerNet-FoulRet_Retrieving_Semantically_Similar_Soccer_Foul_Videos_-_Ar.md` | 38795 | 5692 | 5/5 | True | `f9f8def78797d679` |
| 1507 | node2 | `gdrive_corpus_extractions/d6c369d21e_openalex_W2952170990.pdf.md` | 50565 | 7298 | 5/5 | True | `df77f30b0478e560` |
| 1508 | node2 | `gdrive_corpus_extractions/d6cdfc398b_PeyreCuturi-2019-ComputationalOptimalTransport.pdf.md` | 34803 | 4637 | 5/5 | True | `d793bbda1b07b349` |
| 1509 | node2 | `gdrive_corpus_extractions/d70c6de2a4_2605.25409v1.pdf.md` | 54627 | 7443 | 5/5 | True | `394dca50071df508` |
| 1510 | node2 | `gdrive_corpus_extractions/d7528461e1_2026_-_Deep_Learning_Based_Illegal_Bowling_Action_Detection_-_Sutradhar_et_al.pd.md` | 52790 | 7757 | 5/5 | True | `021dd177c805a362` |
| 1511 | node2 | `gdrive_corpus_extractions/d75a8b6ecc_arxiv_2507.01134v1.pdf.md` | 42841 | 6392 | 5/5 | True | `84f6972dc4abecff` |
| 1512 | node2 | `gdrive_corpus_extractions/d7b6b7944f_2026_-_Mechanical_Output_and_Post-exercise_Jump_Responses_to_Percentage-Based_Re.md` | 29747 | 4102 | 5/5 | True | `80e7056f1098e0a0` |
| 1513 | node2 | `gdrive_corpus_extractions/d807da3437_openalex_W7220887854.pdf.md` | 61783 | 8989 | 5/5 | True | `94738e00c8c94b2a` |
| 1514 | node2 | `gdrive_corpus_extractions/d82319d7e6_openalex_W2466167637.pdf.md` | 49381 | 6764 | 5/5 | True | `5224ce352ad1c414` |
| 1515 | node2 | `gdrive_corpus_extractions/d8b0900d78_Slivkins-2019-IntroductionToMultiArmedBandits.pdf.md` | 58415 | 8072 | 5/5 | True | `84f1cc5a49e15799` |
| 1516 | node2 | `gdrive_corpus_extractions/d8c7d1ee24_CDC-2018-ReportToCongress-ManagementOfTBIInChildren.pdf.md` | 44443 | 6265 | 5/5 | True | `3122ed61ad2fae4e` |
| 1517 | node2 | `gdrive_corpus_extractions/d8e3642730_2019_-_Chuckers_Measuring_Lineup_Shot_Distribution_Optimality_Using_Spatial_Allo.md` | 39119 | 5638 | 5/5 | True | `8911ee02acb005b4` |
| 1518 | node2 | `gdrive_corpus_extractions/d91d533c7c_2026_-_GM_League_Arena_An_Interactive_Long-Horizon_Task_Benchmark_Based_on_Profe.md` | 55996 | 8901 | 5/5 | True | `de768f0024964908` |
| 1519 | node2 | `gdrive_corpus_extractions/d928c88cb6_Kochenderfer-Wheeler-Wray-2022-AlgorithmsForDecisionMaking.pdf.md` | 65493 | 8910 | 5/5 | True | `dc456b0e6d103bea` |
| 1520 | node2 | `gdrive_corpus_extractions/d958b469b8_arxiv_2405.18606v1.pdf.md` | 43723 | 6059 | 5/5 | True | `eb6796b3d2ba9319` |
| 1521 | node2 | `gdrive_corpus_extractions/da9a0270e2_openalex_W4226177585.pdf.md` | 34802 | 5241 | 5/5 | True | `761d2c9b357c1ff0` |
| 1522 | node2 | `gdrive_corpus_extractions/daa12a2ae8_arxiv_2209.08380v2.pdf.md` | 21962 | 3204 | 5/5 | True | `ba9b19c00d42a24d` |
| 1523 | node2 | `gdrive_corpus_extractions/dbaa80395e_2011_-_Seed_distributions_for_NCAA_men_s_basketball_tournament_Why_it_may_not_ma.md` | 49649 | 7026 | 5/5 | True | `9c2c9d8bceff7f89` |
| 1524 | node2 | `gdrive_corpus_extractions/dbfe9c16e0_2023_-_Sidelined_Using_Natural_Language_Processing_to_Investigate_Gender_Bias_in.md` | 44904 | 6329 | 5/5 | True | `daa2a1612c9cc6f5` |
| 1525 | node2 | `gdrive_corpus_extractions/dc3d2d47a8_arxiv_2012.08197v2.pdf.md` | 57861 | 8345 | 5/5 | True | `d2db76bd537004aa` |
| 1526 | node2 | `gdrive_corpus_extractions/dcb7c9d1c6_2026_-_Analysis_of_The_Differences_Between_Training_Matches_and_International_Co.md` | 33882 | 4902 | 5/5 | True | `84abba9763a8d2f3` |
| 1527 | node2 | `gdrive_corpus_extractions/dd12d76495_2403.12977v3.pdf.md` | 52701 | 7590 | 5/5 | True | `cc12938182d6728c` |
| 1528 | node2 | `gdrive_corpus_extractions/dd22b097db_MoerlandEtAl-2023-ModelBasedReinforcementLearning-SurveyMonograph.pdf.md` | 62643 | 8720 | 5/5 | True | `883f678d25d33da3` |
| 1529 | node2 | `gdrive_corpus_extractions/dd85570692_2026_-_Modern_Playoff_Tournament-Design_Analysis_across_Sports_A_Bayesian_Modeli.md` | 52550 | 7619 | 5/5 | True | `a324b597db12d3a1` |
| 1530 | node2 | `gdrive_corpus_extractions/ddbaff5476_2026_-_Quantifying_Officiating_Impact_in_the_NBA_A_Referee_Impact_Metric_Analysi.md` | 31539 | 4701 | 5/5 | True | `d180097e08fc3858` |
| 1531 | node2 | `gdrive_corpus_extractions/de00f0bbc9_arxiv_2111.14690v3.pdf.md` | 29480 | 4209 | 5/5 | True | `75d1fde50e084911` |
| 1532 | node2 | `gdrive_corpus_extractions/de676a8d1b_openalex_W7165027852.pdf.md` | 61388 | 8737 | 5/5 | True | `7bdd50e2f122b0fb` |
| 1533 | node2 | `gdrive_corpus_extractions/debfd1b131_HastieTibshiraniFriedman-2009-ElementsOfStatisticalLearning.pdf.md` | 43666 | 6544 | 5/5 | True | `777406924b7c752d` |
| 1534 | node2 | `gdrive_corpus_extractions/ded60ca435_arxiv_2505.05014v1.pdf.md` | 46705 | 6440 | 5/5 | True | `199022b15c4bdf0a` |
| 1535 | node2 | `gdrive_corpus_extractions/df262c54a5_CHARACTERIZING_THE_SPATIAL_STRUCTURE_OF.pdf.md` | 43663 | 5887 | 5/5 | True | `c0bcd82dd666ca67` |
| 1536 | node2 | `gdrive_corpus_extractions/dfb308db81_openalex_W4281910294.pdf.md` | 49472 | 7003 | 5/5 | True | `60c5e268c9e4eff2` |
| 1537 | node2 | `gdrive_corpus_extractions/dffc9d69ca_arxiv_2502.20111v1.pdf.md` | 50456 | 7312 | 5/5 | True | `b50473b3e65d9903` |
| 1538 | node2 | `gdrive_corpus_extractions/e003f6ceb5_arxiv_2412.17807v1.pdf.md` | 31337 | 4382 | 5/5 | True | `8f0671ddd3923107` |
| 1539 | node2 | `gdrive_corpus_extractions/e01320f1ba_prob-weber.pdf.md` | 41024 | 5933 | 5/5 | True | `8463888f441d0a5f` |
| 1540 | node2 | `gdrive_corpus_extractions/e0bfb90c3a_arxiv_2404.11335v1.pdf.md` | 46765 | 6713 | 5/5 | True | `3c672e219aace4a5` |
| 1541 | node2 | `gdrive_corpus_extractions/e0ce3916ff_openalex_W2576569389.pdf.md` | 37161 | 5431 | 5/5 | True | `b18814986b589edb` |
| 1542 | node2 | `gdrive_corpus_extractions/e15019b9ed_2023_-_Explainable_Defense_Coverage_Classification_in_NFL_Games_using_Deep_Neura.md` | 37178 | 5561 | 5/5 | True | `ef012ee7f7981392` |
| 1543 | node2 | `gdrive_corpus_extractions/e3088a2531_arxiv_2402.15895v1.pdf.md` | 33518 | 4924 | 5/5 | True | `5e1ee78eeb32756c` |
| 1544 | node2 | `gdrive_corpus_extractions/e3202bbf83_openalex_W3216650841.pdf.md` | 43008 | 6617 | 5/5 | True | `2232fac4d64c7dbe` |
| 1545 | node2 | `gdrive_corpus_extractions/e3768837aa_2026_-_Movement_Regularity_and_Local_Dynamic_Stability_During_Acute_and_12-Week_.md` | 24814 | 3432 | 5/5 | True | `8f6c25ea6b44bdc7` |
| 1546 | node2 | `gdrive_corpus_extractions/e43017d460_2026_-_How_exceptional_was_the_Big_Three_era_Extremes_and_persistence_in_men_s_p.md` | 36456 | 5200 | 5/5 | True | `6c3197f71ee45e98` |
| 1547 | node2 | `gdrive_corpus_extractions/e44229c2f3_openalex_W2783808523.pdf.md` | 45776 | 6483 | 5/5 | True | `2c1b153795942e45` |
| 1548 | node2 | `gdrive_corpus_extractions/e4bdcaa50e_openalex_W2031248988.pdf.md` | 38737 | 5420 | 5/5 | True | `b4d578d4f40f3dfe` |
| 1549 | node2 | `gdrive_corpus_extractions/e4e8ee489b_openalex_W3094751213.pdf.md` | 56112 | 7656 | 5/5 | True | `1314544dfe3aef41` |
| 1550 | node2 | `gdrive_corpus_extractions/e4f3331c09_2016_Sports_Ratings_models_slides_-_David_Aldous.pdf.md` | 37842 | 5496 | 5/5 | True | `75464a9209157ee2` |
| 1551 | node2 | `gdrive_corpus_extractions/e4f4a2221b_2025_-_Does_Lasix_Make_Horses_Run_Faster_-_Unknown_Authors.pdf.md` | 49665 | 6866 | 5/5 | True | `8a53b40e416b1d88` |
| 1552 | node2 | `gdrive_corpus_extractions/e538a713c5_Haughton-1922-Football-and-How-to-Watch-It.pdf.md` | 65265 | 9655 | 5/5 | True | `8e6c81cca3d6c4fa` |
| 1553 | node2 | `gdrive_corpus_extractions/e552b30fb0_2022_-_Seattle_Kraken_Expansion_Draft_Strategic_Approaches_-_Malter_et_al.pdf.md` | 47656 | 6792 | 5/5 | True | `b44a1892edc8d4d9` |
| 1554 | node2 | `gdrive_corpus_extractions/e67acd21c5_arxiv_2602.20997v3.pdf.md` | 56143 | 7539 | 5/5 | True | `8785e4a3d61ad691` |
| 1555 | node2 | `gdrive_corpus_extractions/e6de22e6c8_arxiv_2610.22306v1.pdf.md` | 63546 | 9205 | 5/5 | True | `4a55e0e1b7ced2ba` |
| 1556 | node2 | `gdrive_corpus_extractions/e6f53dbb29_openalex_W3105417430.pdf.md` | 39901 | 5409 | 5/5 | True | `f5f0c028331cefda` |
| 1557 | node2 | `gdrive_corpus_extractions/e7a1c8ef00_Burns-2018-DesigningDistributedSystems.pdf.md` | 65080 | 9532 | 5/5 | True | `55c87e7de3ed05d0` |
| 1558 | node2 | `gdrive_corpus_extractions/e7ce6a7f1a_PaulIbrahim.pdf.md` | 51584 | 7439 | 5/5 | True | `1e07c9412305267a` |
| 1559 | node2 | `gdrive_corpus_extractions/e7d88a526c_Spaldings-Official-Foot-Ball-Guide-1915.txt.md` | 66296 | 10632 | 5/5 | True | `58643dff3d3b93c4` |
| 1560 | node2 | `gdrive_corpus_extractions/e86f50d9c2_2025_-_The_Adaptability_Index_An_Information_Theoretic_Framework_for_Measuring_P.md` | 39492 | 5681 | 5/5 | True | `d4d824e83dbab893` |
| 1561 | node2 | `gdrive_corpus_extractions/e9411b3399_2014_Automatically_Recognizing_On-Ball_Screens.pdf.md` | 51064 | 7207 | 5/5 | True | `343cea32eda3dfd4` |
| 1562 | node2 | `gdrive_corpus_extractions/e988bc46b6_openalex_W2470920907.pdf.md` | 32281 | 4515 | 5/5 | True | `646a1047e87ce58a` |
| 1563 | node2 | `gdrive_corpus_extractions/eb096e2282_2025_-_Wind_vs_175_Grams_of_Plastic_Exploring_Weather_Effects_in_Professional_Ul.md` | 51635 | 7182 | 5/5 | True | `3b449960e3d0709e` |
| 1564 | node2 | `gdrive_corpus_extractions/eb17ea8b02_arxiv_2103.08808v1.pdf.md` | 68414 | 10091 | 5/5 | True | `1a7c5b97890a32f2` |
| 1565 | node2 | `gdrive_corpus_extractions/eb58b36384_2006.03700v1.pdf.md` | 50813 | 7166 | 5/5 | True | `2241d35e7694c2e0` |
| 1566 | node2 | `gdrive_corpus_extractions/eba3e02555_2026_-_Economic_resources_sporting_efficiency_and_uncertainty_a_stochastic_optim.md` | 44258 | 5991 | 5/5 | True | `341db723e9b8da52` |
| 1567 | node2 | `gdrive_corpus_extractions/ec9d92d401_2604.08885v1.pdf.md` | 48692 | 6920 | 5/5 | True | `a8c2caa67005a63b` |
| 1568 | node2 | `gdrive_corpus_extractions/ecc9c38612_Building_a_basketball_game_strategy_thro.md.md` | 36566 | 5150 | 5/5 | True | `a97c812a033aaba3` |
| 1569 | node2 | `gdrive_corpus_extractions/ece333484b_openalex_W2979856833.pdf.md` | 57619 | 8448 | 5/5 | True | `b63867ac8d8997f6` |
| 1570 | node2 | `gdrive_corpus_extractions/ecfff14366_openalex_W7210844158.pdf.md` | 29352 | 4493 | 5/5 | True | `20c673a12e28ec7f` |
| 1571 | node2 | `gdrive_corpus_extractions/ed95d3943e_openalex_W4366293245.pdf.md` | 52651 | 7482 | 5/5 | True | `2b52ef0a464f43d1` |
| 1572 | node2 | `gdrive_corpus_extractions/ee3a2f8ffc_The_Logic_Of_Sports_Betting.pdf.md` | 58275 | 8460 | 5/5 | True | `b70eb1d60beef232` |
| 1573 | node2 | `gdrive_corpus_extractions/ef3d18915b_VaibhavEtAlEds-2025-BrainInjuryAndNeurodegeneration-MDPI.pdf.md` | 36130 | 4831 | 5/5 | True | `c446caac2be2fcf0` |
| 1574 | node2 | `gdrive_corpus_extractions/ef7fcd47c8_arxiv_1804.06948v2.pdf.md` | 58905 | 8623 | 5/5 | True | `b427df9803b2641e` |
| 1575 | node2 | `gdrive_corpus_extractions/efa817912d_2405.02715v1.pdf.md` | 51081 | 7222 | 5/5 | True | `e7bdaf9a177b4eb1` |
| 1576 | node2 | `gdrive_corpus_extractions/f0c8dd125c_2510.12323v1_1_.pdf.md` | 50353 | 6998 | 5/5 | True | `563f2d271b5b2037` |
| 1577 | node2 | `gdrive_corpus_extractions/f0e947dbf5_2013_-_Using_Random_Forests_to_Estimate_Win_Probability_before_Each_Play_of_an_N.md` | 49975 | 7037 | 5/5 | True | `42965cacffbf3d88` |
| 1578 | node2 | `gdrive_corpus_extractions/f1280ac5e0_openalex_W2804062412.pdf.md` | 26216 | 3629 | 5/5 | True | `1a0c20b2e1f7720b` |
| 1579 | node2 | `gdrive_corpus_extractions/f2002cc087_Knight-1921-RiskUncertaintyAndProfit.pdf.md` | 40763 | 6091 | 5/5 | True | `07d74c0970225371` |
| 1580 | node2 | `gdrive_corpus_extractions/f2007dbcb8_2024_-_Quantifying_Uncertainty_in_Marathon_Finish_Time_Predictions_-_Unknown_Aut.md` | 58891 | 8480 | 5/5 | True | `2836fc35330731ac` |
| 1581 | node2 | `gdrive_corpus_extractions/f346785270_openalex_W763091254.pdf.md` | 36245 | 5010 | 5/5 | True | `ac1dc374348ecffd` |
| 1582 | node2 | `gdrive_corpus_extractions/f35446088a_arxiv_2503.11496v4.pdf.md` | 40473 | 5604 | 5/5 | True | `4b50481ccbe0c9ae` |
| 1583 | node2 | `gdrive_corpus_extractions/f46461ac85_arxiv_2502.21242v1.pdf.md` | 23638 | 3278 | 5/5 | True | `ab01e3ceec094951` |
| 1584 | node2 | `gdrive_corpus_extractions/f46b5d9fe4_Microsoft-2023-DotNetMicroservicesArchitecture-eBook.pdf.md` | 47540 | 6839 | 5/5 | True | `5ac241913cb4d465` |
| 1585 | node2 | `gdrive_corpus_extractions/f49392c541_arxiv_1712.09184v2.pdf.md` | 63037 | 9400 | 5/5 | True | `a2647b5ffed37fa1` |
| 1586 | node2 | `gdrive_corpus_extractions/f52103be69_openalex_W4294783526.pdf.md` | 44915 | 6302 | 5/5 | True | `94491b062b0681f1` |
| 1587 | node2 | `gdrive_corpus_extractions/f6d74c24f9_2023_-_Evaluating_plate_discipline_in_Major_League_Baseball_with_Bayesian_Additi.md` | 58294 | 8020 | 5/5 | True | `0d7964928dc59e92` |
| 1588 | node2 | `gdrive_corpus_extractions/f6e9d55b26_2013_-_Going_for_Three_Predicting_the_Likelihood_of_Field_Goal_Success_with_Logi.md` | 62503 | 8741 | 5/5 | True | `046525506b458559` |
| 1589 | node2 | `gdrive_corpus_extractions/f7b7784e43_bitstream_59010.pdf.md` | 54609 | 7949 | 5/5 | True | `752275a7e88984ec` |
| 1590 | node2 | `gdrive_corpus_extractions/f7e86b9eb7_arxiv_2408.17098v1.pdf.md` | 27922 | 3783 | 5/5 | True | `9a91e6cc90107d63` |
| 1591 | node2 | `gdrive_corpus_extractions/f80bcf442d_openalex_W623985648.pdf.md` | 29833 | 4074 | 5/5 | True | `d081f962c2e590c0` |
| 1592 | node2 | `gdrive_corpus_extractions/f8255b64f1_openalex_W4390497056.pdf.md` | 60299 | 8942 | 5/5 | True | `21c65bfbeb51e651` |
| 1593 | node2 | `gdrive_corpus_extractions/f91edc1c27_openalex_W2584258665.pdf.md` | 49600 | 7231 | 5/5 | True | `db5f388aa2ba90ce` |
| 1594 | node2 | `gdrive_corpus_extractions/f92ce4dfb1_openalex_W4415110710.pdf.md` | 38822 | 5238 | 5/5 | True | `4cf69afd12fddc3d` |
| 1595 | node2 | `gdrive_corpus_extractions/f93881361f_file_1726508125ivhrv.pdf.md` | 32011 | 4548 | 5/5 | True | `f8a6aeade0c13fe6` |
| 1596 | node2 | `gdrive_corpus_extractions/f95ba8cd28_2026_-_Unified_Pitch_Graphs_for_Diagnosing_Pitching_Strategy_-_Lee_et_al.pdf.md` | 28477 | 3916 | 5/5 | True | `b1d9b08dd6513349` |
| 1597 | node2 | `gdrive_corpus_extractions/f9f12f7db8_arxiv_2509.21715v3.pdf.md` | 59823 | 8732 | 5/5 | True | `1980cde52e0c546b` |
| 1598 | node2 | `gdrive_corpus_extractions/fc6e999ad8_openalex_W3108746815.pdf.md` | 31956 | 4425 | 5/5 | True | `77f0102f686b8d40` |
| 1599 | node2 | `gdrive_corpus_extractions/fd2402b8e8_openalex_W3173200101.pdf.md` | 37056 | 5467 | 5/5 | True | `e1c2929aa1b5ef2c` |
| 1600 | node2 | `gdrive_corpus_extractions/fd7a37087b_openalex_W4306746417.pdf.md` | 46302 | 6740 | 5/5 | True | `1c3298f5ddc4ed10` |
| 1601 | node2 | `gdrive_corpus_extractions/fdcb513945_arxiv_2101.12159v1.pdf.md` | 29693 | 4206 | 5/5 | True | `7446455b3eb6e99a` |
| 1602 | node2 | `gdrive_corpus_extractions/fe30dd5dd6_2504.07291.pdf.md` | 46590 | 6668 | 5/5 | True | `4eaa10b2d62b535d` |
| 1603 | node2 | `gdrive_corpus_extractions/fe3e67f3ca_arxiv_2604.01318v1.pdf.md` | 64674 | 8963 | 5/5 | True | `93ce91546c0d8588` |
| 1604 | node2 | `gdrive_corpus_extractions/fe4d04def3_arxiv_1810.09694v1.pdf.md` | 52826 | 7137 | 5/5 | True | `f391feef17a45e39` |
| 1605 | node2 | `gdrive_corpus_extractions/fe56193660_Computational_and_Mathematical_Methods_in_Medicine_-_2022_-_Song_-_Retracted_Dat.md` | 52972 | 7759 | 5/5 | True | `68c1d3881bab5f3a` |
| 1606 | node2 | `gdrive_corpus_extractions/fe6900ddf7_openalex_W2950789770.pdf.md` | 49575 | 6786 | 5/5 | True | `48a0fbeb1c16d317` |
| 1607 | node2 | `gdrive_corpus_extractions/fe805f8c10_Going_Deep_-_Models_for_Continuous_Time_Within_Play_Valuation_of_Game_Outcomes_i.md` | 44448 | 6432 | 5/5 | True | `a2c470d6637ba717` |
| 1608 | node2 | `gdrive_corpus_extractions/fedd1fe648_openalex_W7160838700.pdf.md` | 51370 | 7739 | 5/5 | True | `21d8b819e364cead` |
| 1609 | node2 | `gdrive_corpus_extractions/ff49882ef9_2026_-_A_Bayesian_bivariate_conditional_Poisson_regression_for_goal_dependence_i.md` | 37372 | 5764 | 5/5 | True | `eac5172e90de5d57` |
| 1610 | node2 | `gdrive_corpus_extractions/gdoc_16Cdx_Master_Execution_Report__The_Belichick_2_.md` | 49339 | 6380 | 5/5 | True | `7fcee57b17e0bd36` |
| 1611 | node2 | `gdrive_corpus_extractions/gdoc_1aTDA_Universal_Phase-Transition_Engine_GSE_Revenue_GSI_Grant_Blueprint.md` | 58463 | 8673 | 5/5 | True | `f5a2636a49931d0d` |
| 1612 | node2 | `gdrive_corpus_extractions/gdoc_1BKUe_GSE_Continuous_Learning_Architecture_Plan.md` | 34054 | 4349 | 5/5 | True | `2fd5284e939c55cf` |
| 1613 | node2 | `gdrive_corpus_extractions/gdoc_1cHMB_GSI_GSE_11_5_1_.md` | 38780 | 5245 | 5/5 | True | `464d1065f6a42c38` |
| 1614 | node2 | `gdrive_corpus_extractions/gdoc_1Dni6_Universal_Phase-Transition_Engine_GSE_Revenue_GSI_Grant_Blueprint.md` | 40207 | 5157 | 5/5 | True | `972c8d9146972d88` |
| 1615 | node2 | `gdrive_corpus_extractions/gdoc_1h1Ly_GSE_Coach-Brain_LLM_Engine.md` | 60258 | 8374 | 5/5 | True | `2a46139e64dbb7cb` |
| 1616 | node2 | `gdrive_corpus_extractions/gdoc_1lqGY_GSE_Coach-Brain_LLM_Engine_2_.md` | 51555 | 7171 | 5/5 | True | `19ac5dd41f28e4c0` |
| 1617 | node3 | `gdrive_corpus_extractions/01329ae31c_openalex_W4392773685.pdf.md` | 43286 | 6315 | 5/5 | True | `07d743c7d57efb17` |
| 1618 | node3 | `gdrive_corpus_extractions/018f6985ba_1912.02076.pdf.md` | 37677 | 5491 | 5/5 | True | `65be46673c2957fb` |
| 1619 | node3 | `gdrive_corpus_extractions/02593b66c8_2019_-_Efficient_Estimation_of_Distribution-free_dynamics_in_the_Bradley-Terry_M.md` | 37524 | 5392 | 5/5 | True | `57b9d104c83d8a44` |
| 1620 | node3 | `gdrive_corpus_extractions/02e27253a5_2016_-_Arsenal_Zone_Rating_A_PitchF_X_based_pitcher_projection_system_-_Unknown_.md` | 62488 | 9156 | 5/5 | True | `5b7cba8f61120d05` |
| 1621 | node3 | `gdrive_corpus_extractions/0419c72de0_arxiv_1808.03934v2.pdf.md` | 40410 | 5677 | 5/5 | True | `bb25a98f72c5fc5f` |
| 1622 | node3 | `gdrive_corpus_extractions/044a2710a2_1301.2954.pdf.md` | 51362 | 7006 | 5/5 | True | `4a08b0d385389869` |
| 1623 | node3 | `gdrive_corpus_extractions/04665610ac_Csiszar_Shields_2004_-_Information_Theory_and_Statistics_-_A_Tutorial.pdf.md` | 44428 | 5492 | 5/5 | True | `dfbffe9434856887` |
| 1624 | node3 | `gdrive_corpus_extractions/0706662c70_openalex_W3083974541.pdf.md` | 66542 | 9864 | 5/5 | True | `fd0e5e323fdc08a3` |
| 1625 | node3 | `gdrive_corpus_extractions/07205b193d_VictorLuo_steven_miller_understudy.pdf.md` | 60292 | 8648 | 5/5 | True | `3542924dc40c214a` |
| 1626 | node3 | `gdrive_corpus_extractions/07514b972c_2025_-_Adjusting_Double_Poisson_Models_to_Predict_the_NCAA_Division_I_Softball_C.md` | 54862 | 8017 | 5/5 | True | `97898c72aafcae6e` |
| 1627 | node3 | `gdrive_corpus_extractions/087ed067b1_2024_-_Analysis_of_Success_Probabilities_in_Field_Hockey_with_Machine_Learning_-.md` | 54637 | 7918 | 5/5 | True | `2df356aceb9dd1de` |
| 1628 | node3 | `gdrive_corpus_extractions/08e905a5f7_2025_-_A_Paradox_of_Blown_Leads_Rethinking_Win_Probability_in_Team_Sports_-_Unkn.md` | 32122 | 4880 | 5/5 | True | `4e32871a7db60de4` |
| 1629 | node3 | `gdrive_corpus_extractions/0904b28005_openalex_W7215824633.pdf.md` | 28789 | 3973 | 5/5 | True | `0d304aa2e83dc41f` |
| 1630 | node3 | `gdrive_corpus_extractions/096b817afe_openalex_W2537381238.pdf.md` | 41711 | 5993 | 5/5 | True | `f68a0faac24db8b2` |
| 1631 | node3 | `gdrive_corpus_extractions/09f6d06f0a_openalex_W4409787801.pdf.md` | 28946 | 4110 | 5/5 | True | `1a055601b7b45879` |
| 1632 | node3 | `gdrive_corpus_extractions/0b0702b6ee_openalex_W4362601779.pdf.md` | 39929 | 5712 | 5/5 | True | `8eded4d32604a8cd` |
| 1633 | node3 | `gdrive_corpus_extractions/10665d14f0_2024_-_Panel_Data_Methods_to_Evaluate_the_Impact_of_Rule_Changes_-_Unknown_Autho.md` | 50813 | 7466 | 5/5 | True | `789a2120acd7752a` |
| 1634 | node3 | `gdrive_corpus_extractions/10df2c079e_2024_-_RisingBALLER_A_Player_is_a_Token_a_Match_is_a_Sentence_A_Path_Towards_a_F.md` | 52221 | 7140 | 5/5 | True | `184a9da90d505a4f` |
| 1635 | node3 | `gdrive_corpus_extractions/111596f5c8_2019_-_How_Do_Typical_Runners_Performances_Vary_with_Age_and_Gender_-_Unknown_Au.md` | 52268 | 7537 | 5/5 | True | `8ef616afe022d6c1` |
| 1636 | node3 | `gdrive_corpus_extractions/1262d228df_2307.13807.pdf.md` | 47386 | 6418 | 5/5 | True | `3ed7c1db3bf804cb` |
| 1637 | node3 | `gdrive_corpus_extractions/127748f04e_openalex_W637747146.pdf.md` | 25904 | 3472 | 5/5 | True | `d5f90b658bdbcd3e` |
| 1638 | node3 | `gdrive_corpus_extractions/1285364a93_2020_-_Player_Benchmarking_and_Outcomes_A_Behavioral_Science_Approach_-_Unknown_.md` | 56823 | 7954 | 5/5 | True | `6b6247edc43cb9c2` |
| 1639 | node3 | `gdrive_corpus_extractions/138f21e6b6_arxiv_2006.12943v1.pdf.md` | 44937 | 6428 | 5/5 | True | `a82a15a60dcbe750` |
| 1640 | node3 | `gdrive_corpus_extractions/142b8edcb6_2002.03228v1.pdf.md` | 24036 | 3630 | 5/5 | True | `fe3c3f5e8b679260` |
| 1641 | node3 | `gdrive_corpus_extractions/152ddd6ad6_2026_-_Dummy_RAPM_Representing_Low-Minute_Players_in_Regularized_Adjusted_Plus-M.md` | 32056 | 4530 | 5/5 | True | `2a2546117312c38d` |
| 1642 | node3 | `gdrive_corpus_extractions/1550335d1c_nvt-learning-learning-path-developers-it-administrators.pdf.md` | 57455 | 8950 | 5/5 | True | `b4b0b09dbbb745c6` |
| 1643 | node3 | `gdrive_corpus_extractions/1597ee8aa2_arxiv_2507.10172v1.pdf.md` | 59650 | 8859 | 5/5 | True | `265a3c90ec8e061b` |
| 1644 | node3 | `gdrive_corpus_extractions/1686fa6ff9_openalex_W4317933942.pdf.md` | 47421 | 6623 | 5/5 | True | `0d701f7ead59a7ce` |
| 1645 | node3 | `gdrive_corpus_extractions/169eb2e40a__15590410_-_Journal_of_Quantitative_Analysis_in_Sports_The_implied_volatility_of.md` | 37322 | 5507 | 5/5 | True | `b82e1758080440d7` |
| 1646 | node3 | `gdrive_corpus_extractions/16a5f2fb81_openalex_W4220656645.pdf.md` | 62352 | 8889 | 5/5 | True | `e1cf5faa7ab9bcd3` |
| 1647 | node3 | `gdrive_corpus_extractions/18d8bf883a_2505.02170v1.pdf.md` | 27982 | 3970 | 5/5 | True | `99a61dcc6db4bc48` |
| 1648 | node3 | `gdrive_corpus_extractions/192ac8466d_openalex_W7160246579.pdf.md` | 63509 | 8905 | 5/5 | True | `d8f80d14601ce43a` |
| 1649 | node3 | `gdrive_corpus_extractions/19a22a9b5c_2021_-_Maaike_van_Roy_et_al_-_Optimally_Disrupting_Opponent_Build-ups_-_Unknown_.md` | 33222 | 4711 | 5/5 | True | `6b3664494d53878c` |
| 1650 | node3 | `gdrive_corpus_extractions/1a38978676_2024_-_The_coach_s_dilemma_how_a_yellow_card_can_change_the_course_of_a_match_-_.md` | 34216 | 4693 | 5/5 | True | `508ac4873a20b57f` |
| 1651 | node3 | `gdrive_corpus_extractions/1a4365070f_2026_-_Acute_Post-Activation_Performance_Enhancement_PAPE_Effects_of_A_Ballistic.md` | 39196 | 5679 | 5/5 | True | `ae030dba5182bc23` |
| 1652 | node3 | `gdrive_corpus_extractions/1c5ec45e7f_2026_-_Comparing_wins_above_replacement_across_baseball_history_-_Doane.pdf.md` | 32016 | 4496 | 5/5 | True | `7612507207764551` |
| 1653 | node3 | `gdrive_corpus_extractions/1d259db472_openalex_W1548148540.pdf.md` | 44248 | 5480 | 5/5 | True | `918e2832eadb221f` |
| 1654 | node3 | `gdrive_corpus_extractions/1d4e4568c9_2020_-_The_right_place_at_the_right_time_Advanced_off-ball_metrics_for_exploitin.md` | 52470 | 8334 | 5/5 | True | `5d84a7cf56ada901` |
| 1655 | node3 | `gdrive_corpus_extractions/1f6de422f2_2023_Machine_learning_for_sports_betting_should_forecasting_models_be_optimised_.md` | 39089 | 5802 | 5/5 | True | `d55cafeca3fcedfd` |
| 1656 | node3 | `gdrive_corpus_extractions/1fd5d3e81d_2608.04103v1.pdf.md` | 55228 | 7564 | 5/5 | True | `526fd7ac6e7df07d` |
| 1657 | node3 | `gdrive_corpus_extractions/2142b14222_2024_-_Calculating_Win_Probabilities_of_Any_Matchup_of_Soccer_Teams_A_Whole-Hist.md` | 55852 | 8281 | 5/5 | True | `220ddff3d60c4e3e` |
| 1658 | node3 | `gdrive_corpus_extractions/22d4fe2970_Evaluating_NFL_Plays_-_Expected_Points_Adjusted_for_Schedule_-_Pelechrinis_Kosta.md` | 46837 | 7077 | 5/5 | True | `1eabf007183f3720` |
| 1659 | node3 | `gdrive_corpus_extractions/23973548fe_openalex_W4207023496.pdf.md` | 64310 | 9302 | 5/5 | True | `23c3e17849f079e1` |
| 1660 | node3 | `gdrive_corpus_extractions/24794d2c33_DFS_Revision_1_May2019_2_.pdf.md` | 39499 | 5760 | 5/5 | True | `b689b2d5ebff35dc` |
| 1661 | node3 | `gdrive_corpus_extractions/2567c6ace1_openalex_W3023769036.pdf.md` | 55112 | 8008 | 5/5 | True | `313be46da0a03ffa` |
| 1662 | node3 | `gdrive_corpus_extractions/25a9033dec_2023_-_Learning_Contextual_Event_Embeddings_to_Predict_Player_Performance_in_the.md` | 53033 | 7739 | 5/5 | True | `304da27d8951f3c8` |
| 1663 | node3 | `gdrive_corpus_extractions/260bdef9ef_2011_Evaluating-Basketball-Player-Performance-via-Statistical-Network-Modeling.p.md` | 54768 | 7787 | 5/5 | True | `c1bc321496693dbf` |
| 1664 | node3 | `gdrive_corpus_extractions/261c5857e3_2019_-_The_Evolution_of_Curling_Analytics_-_Unknown_Authors.pdf.md` | 67407 | 10328 | 5/5 | True | `3f8cfbfe9d086819` |
| 1665 | node3 | `gdrive_corpus_extractions/2762e8332c_openalex_W4312607776.pdf.md` | 32065 | 4504 | 5/5 | True | `cb05f7ee93ca46cd` |
| 1666 | node3 | `gdrive_corpus_extractions/28aac87f58_openalex_W7131133871.pdf.md` | 65322 | 9753 | 5/5 | True | `971a383bf2b1a7c0` |
| 1667 | node3 | `gdrive_corpus_extractions/2a7391129c_2018_A_flight-based_metric_for_evaluating_NFL_punters_-_R._Drew_Pasteur_Emily_Ho.md` | 53617 | 8063 | 5/5 | True | `4c6344a3d23139ce` |
| 1668 | node3 | `gdrive_corpus_extractions/2aa06b961b_openalex_W4385359581.pdf.md` | 27933 | 4070 | 5/5 | True | `0040bfb3811f7038` |
| 1669 | node3 | `gdrive_corpus_extractions/2f5239913d_2026_-_An_option_pricing_framework_for_valuation_of_football_players_transfer_wi.md` | 36945 | 5630 | 5/5 | True | `e5e144d9572c2907` |
| 1670 | node3 | `gdrive_corpus_extractions/3015647b70_2019_-_The_Horizon_of_Sports_is_Digital_Using_Fantasy_Sports_e-Sports_and_Electr.md` | 37683 | 5137 | 5/5 | True | `8192e54a74afaf43` |
| 1671 | node3 | `gdrive_corpus_extractions/30cb03c3e8_arxiv_2006.13458v1.pdf.md` | 28586 | 4034 | 5/5 | True | `6311b505fc7e86bf` |
| 1672 | node3 | `gdrive_corpus_extractions/30fb115306_2024_-_Boot_It_A_Pragmatic_Alternative_To_Build_Up_Play_-_Unknown_Authors.pdf.md` | 52320 | 7520 | 5/5 | True | `8dfc606d194d46fa` |
| 1673 | node3 | `gdrive_corpus_extractions/3100671ff4_ChenBurkeCohenEds-2017-TBI-AsSystemsNeuroscienceProblem-Frontiers.pdf.md` | 44366 | 6068 | 5/5 | True | `56d0cdb627ee2978` |
| 1674 | node3 | `gdrive_corpus_extractions/341acbb4a6_2023_-_A_Comprehensive_Survey_of_the_Home_Advantage_in_American_football_-_Unkno.md` | 57870 | 8354 | 5/5 | True | `17016c7ec2b85362` |
| 1675 | node3 | `gdrive_corpus_extractions/35e6bd1576_openalex_W7119477077.pdf.md` | 35910 | 4912 | 5/5 | True | `220bb51deb40042f` |
| 1676 | node3 | `gdrive_corpus_extractions/3875166c43_openalex_W1491048006.pdf.md` | 34449 | 4646 | 5/5 | True | `1c4afc2d47e184d2` |
| 1677 | node3 | `gdrive_corpus_extractions/3894aa41b7_2025_-_To_What_Extent_Do_Socioeconomic_Factors_Such_as_HDI_Continental_Origin_an.md` | 56638 | 8230 | 5/5 | True | `b2497daa1fddbcd2` |
| 1678 | node3 | `gdrive_corpus_extractions/38ed159f24_openalex_W7172452061.pdf.md` | 34727 | 4872 | 5/5 | True | `f3a3ca2a617085f2` |
| 1679 | node3 | `gdrive_corpus_extractions/398aa8e0db_2024_-_Generation_of_threat_crediting_football_players_for_creating_dangerous_ac.md` | 30647 | 4243 | 5/5 | True | `94d86c7b4b18c149` |
| 1680 | node3 | `gdrive_corpus_extractions/3a404da0ff_arxiv_1407.0784v2.pdf.md` | 29171 | 4475 | 5/5 | True | `8479dbbfdf62e7ed` |
| 1681 | node3 | `gdrive_corpus_extractions/3aa9caeb84_openalex_W7160850813.pdf.md` | 48174 | 6632 | 5/5 | True | `3e40bea16b3cdeb2` |
| 1682 | node3 | `gdrive_corpus_extractions/3ca74f7b95_undated_-_Beyond_the_Box_Score_Using_Psychological_Metrics_to_Forecast_NBA_Succe.md` | 30421 | 4269 | 5/5 | True | `1d9d07b36480e998` |
| 1683 | node3 | `gdrive_corpus_extractions/3d445b1ba0_2026_-_Revisiting_Risky_Tackle_Detection_with_Vision_Transformers_-_Zaidi_et_al..md` | 64943 | 9398 | 5/5 | True | `bc8f9d16a28f8cbe` |
| 1684 | node3 | `gdrive_corpus_extractions/3f73880a2a_openalex_W4406708167.pdf.md` | 61463 | 9116 | 5/5 | True | `d4899fd99ec8de17` |
| 1685 | node3 | `gdrive_corpus_extractions/3f7915aa2b_2408.10867.pdf.md` | 42127 | 6169 | 5/5 | True | `63b7d7a1be69ff6e` |
| 1686 | node3 | `gdrive_corpus_extractions/4176deb0f4_openalex_W4415951858.pdf.md` | 60811 | 8488 | 5/5 | True | `6652985163de257e` |
| 1687 | node3 | `gdrive_corpus_extractions/4177ac1114_2021_-_The_SportsDataverse_An_Open_Source_Initiative_-_Unknown_Authors.pdf.md` | 38360 | 5390 | 5/5 | True | `78a9528ea7118071` |
| 1688 | node3 | `gdrive_corpus_extractions/41e692415f_openalex_W2726653123.pdf.md` | 42094 | 5572 | 5/5 | True | `c24a41cc065db100` |
| 1689 | node3 | `gdrive_corpus_extractions/44e3544151_arxiv_2303.08444v1.pdf.md` | 44408 | 6350 | 5/5 | True | `ab7887b2d46e30bf` |
| 1690 | node3 | `gdrive_corpus_extractions/457c922676_2022_-_cricWAR_A_reproducible_system_for_evaluating_player_performance_in_limite.md` | 30192 | 4326 | 5/5 | True | `4ee5eede6a72ef95` |
| 1691 | node3 | `gdrive_corpus_extractions/46c021149c_arxiv_2302.14058v1.pdf.md` | 34377 | 4832 | 5/5 | True | `2082ee65bac0413c` |
| 1692 | node3 | `gdrive_corpus_extractions/470678a02e_Tolman-1932-PurposiveBehaviorInAnimalsAndMen.txt.md` | 49586 | 6829 | 5/5 | True | `4401649b2486f8fb` |
| 1693 | node3 | `gdrive_corpus_extractions/49bbea6e57_openalex_W3166574549.pdf.md` | 36771 | 5636 | 5/5 | True | `fe33d3412459e442` |
| 1694 | node3 | `gdrive_corpus_extractions/49c30a313b_arxiv_2104.11747v1.pdf.md` | 36199 | 5109 | 5/5 | True | `4f39fe86e26bd5ed` |
| 1695 | node3 | `gdrive_corpus_extractions/4cdffd22ba_arxiv_2102.03453v1.pdf.md` | 62376 | 8990 | 5/5 | True | `462ea905e9a9920e` |
| 1696 | node3 | `gdrive_corpus_extractions/4df8f748df_2021_Application_of_PageRank_Algorithm_to_Division_I_NCAA_men_s_basketball_as_br.md` | 29645 | 4337 | 5/5 | True | `de49b993a2c8b28e` |
| 1697 | node3 | `gdrive_corpus_extractions/4e5b333339_2014_Hot_Hand_Fallacy.pdf.md` | 30143 | 4259 | 5/5 | True | `db7ff016d57ce324` |
| 1698 | node3 | `gdrive_corpus_extractions/4e83a8f329_openalex_W4410869446.pdf.md` | 55528 | 7942 | 5/5 | True | `7966b41b878d3a3a` |
| 1699 | node3 | `gdrive_corpus_extractions/4ee1715065_arxiv_2010.13424v1.pdf.md` | 59542 | 8954 | 5/5 | True | `a07d652d3072e48f` |
| 1700 | node3 | `gdrive_corpus_extractions/4ef71ff702__15590410_-_Journal_of_Quantitative_Analysis_in_Sports_Decomposing_Pythagoras.pd.md` | 55521 | 7815 | 5/5 | True | `679e9aa31f3479d2` |
| 1701 | node3 | `gdrive_corpus_extractions/4fbd8f5324_2025_-_Analyze_Tennis_Winning_Factors_Across_Different_Surfaces_By_Utilizing_Ran.md` | 58730 | 8557 | 5/5 | True | `7ca3667cc52dac09` |
| 1702 | node3 | `gdrive_corpus_extractions/50351368da_arxiv_2609.30026v1.pdf.md` | 23060 | 3284 | 5/5 | True | `7af40787e7dd5897` |
| 1703 | node3 | `gdrive_corpus_extractions/51684f8156_2022_-_Quantifying_NBA_play_style_drift_using_Finite_Mixture_Multinomial_model_-.md` | 59611 | 8393 | 5/5 | True | `b576cedb2030c220` |
| 1704 | node3 | `gdrive_corpus_extractions/51b959fd8c_2026_-_Age-Structured_Transition_Analysis_of_Competitive_Exit_in_U.S._Fencing_Co.md` | 49801 | 6806 | 5/5 | True | `88e858515aa1c12f` |
| 1705 | node3 | `gdrive_corpus_extractions/53f126a79b_openalex_W4414555705.pdf.md` | 44946 | 6207 | 5/5 | True | `ace280e76eff497a` |
| 1706 | node3 | `gdrive_corpus_extractions/544e932c0a_openalex_W2884284290.pdf.md` | 31934 | 4609 | 5/5 | True | `00bc73f8649b9703` |
| 1707 | node3 | `gdrive_corpus_extractions/54f93e650b_Data_Mining_in_Sports_A_Research_Overvie.pdf.md` | 40113 | 5634 | 5/5 | True | `a12e4272509de8ab` |
| 1708 | node3 | `gdrive_corpus_extractions/5997cf8568_2025_-_Deal_or_No_Deal_How_NFL_Teams_May_Be_Better_Off_in_the_Draft_-_Vinchurkar.md` | 37741 | 5345 | 5/5 | True | `e3d5fdb00bbef6db` |
| 1709 | node3 | `gdrive_corpus_extractions/5ade324081_openalex_W4385440023.pdf.md` | 40619 | 5981 | 5/5 | True | `84ca8373d74c3413` |
| 1710 | node3 | `gdrive_corpus_extractions/5bbc6c5aad_arxiv_2205.10949v1.pdf.md` | 50902 | 7594 | 5/5 | True | `b99fac91879bb976` |
| 1711 | node3 | `gdrive_corpus_extractions/5c6d2dfa9d_openalex_W7134035396.pdf.md` | 55034 | 7614 | 5/5 | True | `26fa33fa03722c63` |
| 1712 | node3 | `gdrive_corpus_extractions/5dd9321031_openalex_W2343891781.pdf.md` | 51383 | 7504 | 5/5 | True | `27a245c84245613b` |
| 1713 | node3 | `gdrive_corpus_extractions/5fcd0b6f56_openalex_W2130949007.pdf.md` | 48305 | 6968 | 5/5 | True | `ee8acf3afb6ebf3c` |
| 1714 | node3 | `gdrive_corpus_extractions/5ffe2678b0_2013_Using_Zone_Entry_Data_To_Separate_Offensive_Neutral_And_Defensive_Zone_Perf.md` | 33653 | 4765 | 5/5 | True | `408a6e10ba2f6034` |
| 1715 | node3 | `gdrive_corpus_extractions/607544bbdb_openalex_W4221138512.pdf.md` | 58405 | 8577 | 5/5 | True | `f95ce94d55932ce4` |
| 1716 | node3 | `gdrive_corpus_extractions/611d0589df_2026_-_Graph-to-Grid_G2G_Continuous-Coordinate_Feature_Painting_for_Soccer_Pass_.md` | 63746 | 9138 | 5/5 | True | `050843dbeb23770c` |
| 1717 | node3 | `gdrive_corpus_extractions/6341884e8e_2026_-_The_Influence_of_Structured_Multisport_Activities_at_Different_Weekly_Fre.md` | 36303 | 4986 | 5/5 | True | `27683da740699b98` |
| 1718 | node3 | `gdrive_corpus_extractions/641a07a45f_2021_-_Athlete_Rating_in_Score-Outcome_Multi-Competitor_Games_-_Unknown_Authors..md` | 55727 | 7649 | 5/5 | True | `79315a7c96acbb81` |
| 1719 | node3 | `gdrive_corpus_extractions/659cd68a76_epdf.pub_the-physics-of-basketball.pdf.md` | 62570 | 9285 | 5/5 | True | `9c7b1017354a42aa` |
| 1720 | node3 | `gdrive_corpus_extractions/6834672c3b_2023_-_Fair_and_Efficient_Ranking_in_Incomplete_Tournaments_-_Bertran.pdf.md` | 33035 | 4527 | 5/5 | True | `db845855d25bfc5b` |
| 1721 | node3 | `gdrive_corpus_extractions/692eac5a7b_DRAFTING_AGENT_BASED_MODELING_INTO_BASKE.pdf.md` | 60802 | 9109 | 5/5 | True | `01ed5013334c8ac9` |
| 1722 | node3 | `gdrive_corpus_extractions/694a620133_bookchapterPolypathology.pdf.md` | 54929 | 7924 | 5/5 | True | `a0327acde5459960` |
| 1723 | node3 | `gdrive_corpus_extractions/69c8722c48_2012_Big_2s_and_3s_Best_Players_Complement_Each_Other.pdf.md` | 49867 | 6933 | 5/5 | True | `a8c1cd552ae9c5cf` |
| 1724 | node3 | `gdrive_corpus_extractions/6a704284a3_2009_-_Using_New_Iterative_Methods_and_Fine_Grain_Data_to_Rank_College_Football_.md` | 31511 | 4461 | 5/5 | True | `4e06d053123e17dc` |
| 1725 | node3 | `gdrive_corpus_extractions/6ae31b8496_2025_-_Evaluating_NHL_Point_Production_Forecasting_Methods_for_Russian_Skaters_-.md` | 35886 | 4996 | 5/5 | True | `b82662242927cd8a` |
| 1726 | node3 | `gdrive_corpus_extractions/6af30137a4_2405.10247.pdf.md` | 54249 | 7641 | 5/5 | True | `6ae93d13e021fb84` |
| 1727 | node3 | `gdrive_corpus_extractions/6b2882b81a_arxiv_2210.11802v1.pdf.md` | 33664 | 4706 | 5/5 | True | `0d0a2b83e0836a76` |
| 1728 | node3 | `gdrive_corpus_extractions/6b5f1345cc_openalex_W4410468393.pdf.md` | 31731 | 4433 | 5/5 | True | `7e3735c9c6d66b78` |
| 1729 | node3 | `gdrive_corpus_extractions/6bcf280489_2026_-_Effects_of_A_Smartphone-Delivered_Mindfulness_Program_on_Pre-Competition_.md` | 28872 | 3950 | 5/5 | True | `19a967bba60fd40e` |
| 1730 | node3 | `gdrive_corpus_extractions/6e0e13c2b5_2026_-_Comparative_Efficacy_of_Different_Aquatic_Exercise_Modalities_on_Cognitiv.md` | 64027 | 8841 | 5/5 | True | `b3437afc080ed597` |
| 1731 | node3 | `gdrive_corpus_extractions/700ee47c42_1704.00197v3_1_.pdf.md` | 64623 | 9531 | 5/5 | True | `672b5b6d5ea0720a` |
| 1732 | node3 | `gdrive_corpus_extractions/70370718cd_2017_-_Using_data_analysis_to_predict_attendance_for_NHL_regular_season_games_-_.md` | 35507 | 5066 | 5/5 | True | `0f15e87cb8190a2d` |
| 1733 | node3 | `gdrive_corpus_extractions/70674d411e_openalex_W4385422854.pdf.md` | 58451 | 8342 | 5/5 | True | `a4f50629659d622a` |
| 1734 | node3 | `gdrive_corpus_extractions/7134796aa4_openalex_W194495087.pdf.md` | 35841 | 5068 | 5/5 | True | `dd5df138174d0868` |
| 1735 | node3 | `gdrive_corpus_extractions/72c3b8352a__15590410_-_Journal_of_Quantitative_Analysis_in_Sports_Estimating_an_NBA_player_.md` | 47723 | 6877 | 5/5 | True | `67c2ce82fdd31322` |
| 1736 | node3 | `gdrive_corpus_extractions/730ae28386_2510.06789v2.pdf.md` | 59762 | 8365 | 5/5 | True | `0be1b6a96482cf30` |
| 1737 | node3 | `gdrive_corpus_extractions/73a748a186_arxiv_2609.28933v1.pdf.md` | 41181 | 5620 | 5/5 | True | `c2e9387f4c8592d3` |
| 1738 | node3 | `gdrive_corpus_extractions/73f1d89bc8_2026_-_Challenge_or_Pass_A_Dynamic_Policy_for_MLB_s_Automated_Ball-Strike_System.md` | 32864 | 4826 | 5/5 | True | `e8a04b84288336d1` |
| 1739 | node3 | `gdrive_corpus_extractions/77b2409d4d_openalex_W3176134285.pdf.md` | 49844 | 7376 | 5/5 | True | `8bc1f2d8be73f2d6` |
| 1740 | node3 | `gdrive_corpus_extractions/782abe6395_openalex_W4293223831.pdf.md` | 31990 | 4651 | 5/5 | True | `bd0a889e178c8305` |
| 1741 | node3 | `gdrive_corpus_extractions/78f1aea604_openalex_W4404613039.pdf.md` | 36874 | 4947 | 5/5 | True | `afa09462c083be13` |
| 1742 | node3 | `gdrive_corpus_extractions/78fe6a5548_2025_-_A_smart_method_of_developing_football_odds_using_Markov_chain_process_a_c.md` | 60830 | 8573 | 5/5 | True | `706aeb17278b61a8` |
| 1743 | node3 | `gdrive_corpus_extractions/793bd9ca81_openalex_W4386321123.pdf.md` | 56671 | 8234 | 5/5 | True | `f653807fc0396f03` |
| 1744 | node3 | `gdrive_corpus_extractions/7bd8af6d8d_openalex_W7161586801.pdf.md` | 32362 | 4460 | 5/5 | True | `7ad993b86b1faf20` |
| 1745 | node3 | `gdrive_corpus_extractions/7bf872c8c4_HernanRobins-2020-CausalInferenceWhatIf.pdf.md` | 53324 | 7924 | 5/5 | True | `5c20759023215860` |
| 1746 | node3 | `gdrive_corpus_extractions/7d65be42b1_2023_-_Thinking_the_GOAT_Imitating_Tennis_Styles_-_Srinivasan_et_al.pdf.md` | 43192 | 5950 | 5/5 | True | `a10ea0dc0d18a77f` |
| 1747 | node3 | `gdrive_corpus_extractions/7ed139aaac_2101.10597.pdf.md` | 51142 | 7186 | 5/5 | True | `faf2818d6803d5ac` |
| 1748 | node3 | `gdrive_corpus_extractions/7f05a15edc_openalex_W3210204599.pdf.md` | 44097 | 5680 | 5/5 | True | `f7865d6dc4ec74e5` |
| 1749 | node3 | `gdrive_corpus_extractions/7fb4662389_openalex_W2529877681.pdf.md` | 32617 | 4382 | 5/5 | True | `44615e3716dc1450` |
| 1750 | node3 | `gdrive_corpus_extractions/7ff9e9b32d_2024_-_Examining_regional_and_familiarity_bias_of_referees_in_USA_Fencing_Divisi.md` | 53987 | 7622 | 5/5 | True | `ec2fc08ad518e62e` |
| 1751 | node3 | `gdrive_corpus_extractions/81d55eb7b8_openalex_W3108842862.pdf.md` | 60564 | 8967 | 5/5 | True | `f09c56030a4f725b` |
| 1752 | node3 | `gdrive_corpus_extractions/8254f435c0_Rockne-1925-Coaching-The-Way-of-the-Winner.pdf.md` | 49383 | 7844 | 5/5 | True | `7ee012bc247efbf4` |
| 1753 | node3 | `gdrive_corpus_extractions/8382da9a08_ssrn-7308118.pdf.md` | 57824 | 8437 | 5/5 | True | `6ba9226f69756859` |
| 1754 | node3 | `gdrive_corpus_extractions/83d7efa0e7_Player_Availability_Rating_PAR_-_A_Tool_for_Quantifying_Skater_Performance_for_N.md` | 45082 | 6546 | 5/5 | True | `cbbdb2164ab24581` |
| 1755 | node3 | `gdrive_corpus_extractions/83fba4bab8_2604.26501v1.pdf.md` | 44752 | 6630 | 5/5 | True | `f7041b49421036e9` |
| 1756 | node3 | `gdrive_corpus_extractions/849c613b3b_openalex_W4389249092.pdf.md` | 59524 | 8409 | 5/5 | True | `36cbfaac930fea1c` |
| 1757 | node3 | `gdrive_corpus_extractions/849c8492ce_openalex_W4311395405.pdf.md` | 40018 | 5753 | 5/5 | True | `75a179132d94d536` |
| 1758 | node3 | `gdrive_corpus_extractions/85412214fe_2020_A_No-Tanking_Draft_Allocation_Policy.pdf.md` | 44416 | 6484 | 5/5 | True | `702870d839c33361` |
| 1759 | node3 | `gdrive_corpus_extractions/85fb1e252d_19232.pdf.md` | 30610 | 4525 | 5/5 | True | `b65e8e2d7749f801` |
| 1760 | node3 | `gdrive_corpus_extractions/865aea2b22_2019_-_Winning_Isn_t_Everything_A_contextual_analysis_of_hockey_face-offs_-_Unkn.md` | 24672 | 3607 | 5/5 | True | `33aa8532596740f2` |
| 1761 | node3 | `gdrive_corpus_extractions/88b39bed5b_Reed-1913-Football-for-Public-and-Player.pdf.md` | 56073 | 8222 | 5/5 | True | `adda6b52b34ae348` |
| 1762 | node3 | `gdrive_corpus_extractions/89f1aff734_2020_-_Grinding_the_Bayes_A_Hierarchical_Modeling_Approach_to_Predicting_the_NFL.md` | 58998 | 8363 | 5/5 | True | `d68183a54c789898` |
| 1763 | node3 | `gdrive_corpus_extractions/8a45b41773_openalex_W2159488523.pdf.md` | 68339 | 9888 | 5/5 | True | `24e1ad4a0546cc8e` |
| 1764 | node3 | `gdrive_corpus_extractions/8ca03280bb_openalex_W2169962409.pdf.md` | 50726 | 7342 | 5/5 | True | `05d8dc421133c747` |
| 1765 | node3 | `gdrive_corpus_extractions/8d3dd89466_openalex_W7167022345.pdf.md` | 56540 | 7614 | 5/5 | True | `5354acd5584a1902` |
| 1766 | node3 | `gdrive_corpus_extractions/8d40438ff8_openalex_W4403972766.pdf.md` | 56657 | 8359 | 5/5 | True | `e222dfd259850c06` |
| 1767 | node3 | `gdrive_corpus_extractions/8d7485dcf8_2007_-_Probability_and_optimization_models_for_racing_-_Unknown_Authors.pdf.md` | 50442 | 7247 | 5/5 | True | `894e126ef70f8a31` |
| 1768 | node3 | `gdrive_corpus_extractions/8df6e7a99c_Visualizing_NFL_Player_Metrics.pdf.md` | 39250 | 5629 | 5/5 | True | `59526fea7fa8b919` |
| 1769 | node3 | `gdrive_corpus_extractions/8f9ac6d565_openalex_W4401287601.pdf.md` | 56729 | 7912 | 5/5 | True | `f93817cdb0140a11` |
| 1770 | node3 | `gdrive_corpus_extractions/903b94d2b8_2019_-_DeepQB_Deep_Learning_with_Player_Tracking_to_Quantify_Quarterback_Decisio.md` | 66638 | 9439 | 5/5 | True | `f1c40ea4d12a03d5` |
| 1771 | node3 | `gdrive_corpus_extractions/917fd4db84_NICE-2022-RehabilitationAfterTraumaticInjury-NG211.pdf.md` | 40906 | 5317 | 5/5 | True | `7614cbe5f93388a9` |
| 1772 | node3 | `gdrive_corpus_extractions/9217441772_arxiv_2310.14469v1.pdf.md` | 53228 | 7664 | 5/5 | True | `dad3b1c52561a220` |
| 1773 | node3 | `gdrive_corpus_extractions/9501909b47_2021_-_A_Web_Application_for_Manually_Tracking_Locational_Event_Data_in_Ice_Hock.md` | 55602 | 8264 | 5/5 | True | `51023e5ed3a0412b` |
| 1774 | node3 | `gdrive_corpus_extractions/95644e4a28_openalex_W7224050046.pdf.md` | 60306 | 8602 | 5/5 | True | `22aa691686add720` |
| 1775 | node3 | `gdrive_corpus_extractions/9573535067_openalex_W4407235749.pdf.md` | 55989 | 8017 | 5/5 | True | `25f51f1986f04632` |
| 1776 | node3 | `gdrive_corpus_extractions/958276ba6c_openalex_W2589060063.pdf.md` | 64218 | 9697 | 5/5 | True | `08ab5e4ff0b3cf1b` |
| 1777 | node3 | `gdrive_corpus_extractions/95d360780a_Downey-2016-LittleBookOfSemaphores.pdf.md` | 32508 | 4596 | 5/5 | True | `d2053dbd06d84649` |
| 1778 | node3 | `gdrive_corpus_extractions/95e34ca476_2110.01395.pdf.md` | 26108 | 3487 | 5/5 | True | `f150bcd7f40970bd` |
| 1779 | node3 | `gdrive_corpus_extractions/95f32f5983_openalex_W4360610402.pdf.md` | 33046 | 4576 | 5/5 | True | `dc62bfc6f5b1707d` |
| 1780 | node3 | `gdrive_corpus_extractions/95f929eec9_undated_-_A_Graph_Neural_Network_deep-dive_into_successful_counterattacks_-_Saha.md` | 42761 | 6169 | 5/5 | True | `ed0fa3271e6f4aa7` |
| 1781 | node3 | `gdrive_corpus_extractions/96e81b4f4f_2017_-_An_analysis_of_shot_quality_in_Major_League_Lacrosse_MLL_-_Unknown_Author.md` | 45237 | 6359 | 5/5 | True | `a82eb15555de05bc` |
| 1782 | node3 | `gdrive_corpus_extractions/9769360616_2609.13822v1.pdf.md` | 25893 | 4026 | 5/5 | True | `bda30ec38e87d7a9` |
| 1783 | node3 | `gdrive_corpus_extractions/99d1dec865_openalex_W7128182590.pdf.md` | 47313 | 6682 | 5/5 | True | `b412889075463a1f` |
| 1784 | node3 | `gdrive_corpus_extractions/9a8cd0de78_openalex_W2098304403.pdf.md` | 52509 | 7238 | 5/5 | True | `a987fffa4ac0e5e0` |
| 1785 | node3 | `gdrive_corpus_extractions/9bdff20a9a_2024_-_Optimizing_Baseball_Fielder_Positioning_with_Consideration_for_Adaptable_.md` | 38597 | 5459 | 5/5 | True | `6b572f2313b4006b` |
| 1786 | node3 | `gdrive_corpus_extractions/9c156adc09_openalex_W7131275597.pdf.md` | 61074 | 8530 | 5/5 | True | `438a6da274fa7f8d` |
| 1787 | node3 | `gdrive_corpus_extractions/9fb3cac0e8_arxiv_1811.07763v6.pdf.md` | 53289 | 7318 | 5/5 | True | `1ff56e55962ed632` |
| 1788 | node3 | `gdrive_corpus_extractions/a1889d26fa_2212.03041v1.pdf.md` | 32907 | 4409 | 5/5 | True | `5db4702d9be6c04d` |
| 1789 | node3 | `gdrive_corpus_extractions/a2201a402d_W7128505869.pdf.md` | 35068 | 5036 | 5/5 | True | `8c5e7381ac0ebaec` |
| 1790 | node3 | `gdrive_corpus_extractions/a29901ca0f_arxiv_2308.04872v1.pdf.md` | 65228 | 9298 | 5/5 | True | `b63867450fc1dcad` |
| 1791 | node3 | `gdrive_corpus_extractions/a2faa73faa_The_Probabilistic_Relevance_Framework_BM25_and_Bey.pdf.md` | 48954 | 6791 | 5/5 | True | `d528ed1563c6936b` |
| 1792 | node3 | `gdrive_corpus_extractions/a435dba473_2017_-_A_survey_of_advanced_modeling_techniques_for_forecasting_college_football.md` | 42438 | 6108 | 5/5 | True | `a49ff9d1ec51fc89` |
| 1793 | node3 | `gdrive_corpus_extractions/a473ccf32f_openalex_W7131402232.pdf.md` | 44229 | 5902 | 5/5 | True | `6a030b8ab9807de8` |
| 1794 | node3 | `gdrive_corpus_extractions/a4a051d556_2015_Predicting_Sports_Scoring_Dynamics_UC_Boulder.pdf.md` | 59412 | 8636 | 5/5 | True | `868f809cddafa4a0` |
| 1795 | node3 | `gdrive_corpus_extractions/a4b7b6f97b_Detecting_and_classifying_moments_in_bas.pdf.md` | 48081 | 7419 | 5/5 | True | `62f81f585c7dc0ce` |
| 1796 | node3 | `gdrive_corpus_extractions/a64b0ed7cb_openalex_W7204801053.pdf.md` | 29160 | 4254 | 5/5 | True | `56ef65bf567d5443` |
| 1797 | node3 | `gdrive_corpus_extractions/a684fe6f36_pham20a.pdf.md` | 51073 | 7032 | 5/5 | True | `0b69714005271cc5` |
| 1798 | node3 | `gdrive_corpus_extractions/a6d2b0b274_2025_-_Stats_and_Stumps_Using_Machine_Learning_to_Predict_T20I_Matches_with_Play.md` | 32061 | 4594 | 5/5 | True | `0adc4af56afce3f8` |
| 1799 | node3 | `gdrive_corpus_extractions/a6e7fdf475_openalex_W7128777824.pdf.md` | 27726 | 4040 | 5/5 | True | `ecf25927d03985e0` |
| 1800 | node3 | `gdrive_corpus_extractions/a7cabc8706_2026_-_Beyond_Match_Results_Bayesian_Mediation_of_Ability_Performance_and_Winnin.md` | 58984 | 8252 | 5/5 | True | `e32b2aa1da8ee7e4` |
| 1801 | node3 | `gdrive_corpus_extractions/a836be3728_AgarwalEtAl-2026-ReinforcementLearningTheoryAndAlgorithms-Draft.pdf.md` | 55841 | 7341 | 5/5 | True | `50d4cebbb64267fd` |
| 1802 | node3 | `gdrive_corpus_extractions/a9245884c9_openalex_W2617593301.pdf.md` | 23530 | 3124 | 5/5 | True | `5440987ce771a683` |
| 1803 | node3 | `gdrive_corpus_extractions/a947098a71_2020_Continuous-time_state-space_modelling_of_the_hot_hand_in_basketball.pdf.md` | 48343 | 6915 | 5/5 | True | `23e2be0677dceab1` |
| 1804 | node3 | `gdrive_corpus_extractions/aa8f858f9f_Institutional_Integration_of_10Hz_NFL_Spatial_Tracking_.pdf.md` | 39613 | 5535 | 5/5 | True | `81497c63dd8846cd` |
| 1805 | node3 | `gdrive_corpus_extractions/aafd3ff557_2017_AI_for_Fixing_Play_by_Play_Substitutions.pdf.md` | 45994 | 6458 | 5/5 | True | `624ebe3b00a76624` |
| 1806 | node3 | `gdrive_corpus_extractions/ab37cbd1c8_openalex_W7216164587.pdf.md` | 29016 | 3942 | 5/5 | True | `ffb6fb513bddd3a2` |
| 1807 | node3 | `gdrive_corpus_extractions/ae68f3d0ea_V11I6-1147.pdf.md` | 62370 | 8348 | 5/5 | True | `a7ef242d80a13137` |
| 1808 | node3 | `gdrive_corpus_extractions/af28bd6110_openalex_W3200399207.pdf.md` | 41987 | 5647 | 5/5 | True | `48df78e5584eb2f9` |
| 1809 | node3 | `gdrive_corpus_extractions/af9c7273e2_2026_-_Intervention_Effects_of_Recreational_Football_on_Obesity-Related_Health_O.md` | 43613 | 6244 | 5/5 | True | `869cc1d9aaabe150` |
| 1810 | node3 | `gdrive_corpus_extractions/afa754809c_openalex_W7154702891.pdf.md` | 46149 | 6213 | 5/5 | True | `c416f5d33073c1de` |
| 1811 | node3 | `gdrive_corpus_extractions/b06599ad9a_openalex_W4414023900.pdf.md` | 54601 | 7366 | 5/5 | True | `8da6ae21b26ca009` |
| 1812 | node3 | `gdrive_corpus_extractions/b068bf54e6_openalex_W4385170600.pdf.md` | 40741 | 5883 | 5/5 | True | `05b8e9eeccaebb79` |
| 1813 | node3 | `gdrive_corpus_extractions/b0a98e9ca8_openalex_W3209722974.pdf.md` | 56379 | 8208 | 5/5 | True | `977ad0a0f8af33f7` |
| 1814 | node3 | `gdrive_corpus_extractions/b141801b40_2026_-_Acute_Performance_Mechanical_and_Thermal_Effects_of_Isometric_Conditionin.md` | 40457 | 5886 | 5/5 | True | `07f4ff983d50bf2d` |
| 1815 | node3 | `gdrive_corpus_extractions/b190e351e8_2025_-_PRSS_A_New_Metric_to_Quantify_Pocket_Collapses_in_the_National_Football_L.md` | 49738 | 7319 | 5/5 | True | `aae911830d96d0fe` |
| 1816 | node3 | `gdrive_corpus_extractions/b2b51bf1c0_2203.14782v1.pdf.md` | 55089 | 8044 | 5/5 | True | `80a86111f3e5e93d` |
| 1817 | node3 | `gdrive_corpus_extractions/b30867ca2f_2605.12437v1.pdf.md` | 57416 | 8171 | 5/5 | True | `80d50f0295fc8b88` |
| 1818 | node3 | `gdrive_corpus_extractions/b31abf39f0_openalex_W4408042290.pdf.md` | 49683 | 7173 | 5/5 | True | `11bd42c648506076` |
| 1819 | node3 | `gdrive_corpus_extractions/b4398e1da9_openalex_W4225311319.pdf.md` | 56663 | 8731 | 5/5 | True | `8dc1812a62479fd1` |
| 1820 | node3 | `gdrive_corpus_extractions/b5f5c7f0ae_arxiv_2512.01478v2.pdf.md` | 60052 | 8370 | 5/5 | True | `a4bfb2cf508b3e2b` |
| 1821 | node3 | `gdrive_corpus_extractions/b847616d48_2026_-_From_Metrics_to_Decisions_in_NBA_Analytics_A_Critical_Integrative_Review_.md` | 63971 | 8955 | 5/5 | True | `28d6a66237fa4886` |
| 1822 | node3 | `gdrive_corpus_extractions/b9156a1a5d_Berry-1921-The-Forward-Pass-in-Football.pdf.md` | 58187 | 8832 | 5/5 | True | `59ff15a70cda3638` |
| 1823 | node3 | `gdrive_corpus_extractions/b92d93c127_2026_-_Interpretable_Prediction_and_Large-Scale_Analysis_of_Judging_in_Professio.md` | 50492 | 6905 | 5/5 | True | `ff7506f6712db6f0` |
| 1824 | node3 | `gdrive_corpus_extractions/b9ec6bd18d_2026_-_FromPitch2Board_Benchmarking_LLM_Agents_in_Long-Horizon_Football_Manageme.md` | 51842 | 7952 | 5/5 | True | `77247b0165493e8f` |
| 1825 | node3 | `gdrive_corpus_extractions/bafa43dc17_2022_-_Hot_Hand_Fallacy_Fallacy_Fallacy_-_Babitz.pdf.md` | 29855 | 4215 | 5/5 | True | `dbab15805b8c6aa7` |
| 1826 | node3 | `gdrive_corpus_extractions/bb4f9d4cf1_Szepesvari-2010-AlgorithmsForReinforcementLearning.pdf.md` | 49229 | 6719 | 5/5 | True | `41099a25236c9bec` |
| 1827 | node3 | `gdrive_corpus_extractions/bcfc4ac1d1_arxiv_2504.02019v2.pdf.md` | 53237 | 7146 | 5/5 | True | `634e932cdf599ec1` |
| 1828 | node3 | `gdrive_corpus_extractions/bd459641a6_rsl202302038CD3C1F6236.pdf.md` | 46639 | 6710 | 5/5 | True | `e3c20aa98eb85c3b` |
| 1829 | node3 | `gdrive_corpus_extractions/be4c74c2f7_Game_Location_Influences_Basketball_Play.pdf.md` | 53154 | 7381 | 5/5 | True | `2f767caf0c20a484` |
| 1830 | node3 | `gdrive_corpus_extractions/bec9d667f1_2026_-_Who_Gains_When_the_Umpire_Is_a_Machine_Evidence_from_the_Automated_Ball-S.md` | 50359 | 7424 | 5/5 | True | `ce2702cbefc597ff` |
| 1831 | node3 | `gdrive_corpus_extractions/bf10cbb875_openalex_W7172529474.pdf.md` | 64544 | 9127 | 5/5 | True | `b4186062ceecea50` |
| 1832 | node3 | `gdrive_corpus_extractions/bf9326c399_2026_Lineup_Regularized_Adjusted_Plus-Minus_L-RAPM_-_Petridis_Pelechrinis.pdf.md` | 40538 | 5887 | 5/5 | True | `c7718ee3edaafb29` |
| 1833 | node3 | `gdrive_corpus_extractions/c1def87a64_openalex_W3164854769.pdf.md` | 34711 | 5172 | 5/5 | True | `899785afba06fab9` |
| 1834 | node3 | `gdrive_corpus_extractions/c23f5be7f6_arxiv_2304.14394v3.pdf.md` | 30198 | 4199 | 5/5 | True | `f97bf43720a5bcad` |
| 1835 | node3 | `gdrive_corpus_extractions/c269fc425f_arxiv_2610.05961v2.pdf.md` | 61791 | 8388 | 5/5 | True | `df4f771e16050f98` |
| 1836 | node3 | `gdrive_corpus_extractions/c2a38303e5_2510.20668v1.pdf.md` | 31338 | 4431 | 5/5 | True | `54aed1ceb943f1f5` |
| 1837 | node3 | `gdrive_corpus_extractions/c35d15d052_2024_-_Estimating_positional_plus-minus_in_the_NBA_-_Gong_et_al.pdf.md` | 55151 | 8133 | 5/5 | True | `5525584d6087b7c5` |
| 1838 | node3 | `gdrive_corpus_extractions/c43ab11651_openalex_W2496839538.pdf.md` | 28141 | 3744 | 5/5 | True | `01cd95ae6dd4a02a` |
| 1839 | node3 | `gdrive_corpus_extractions/c48b17346f_arxiv_2502.21085v4.pdf.md` | 28832 | 4011 | 5/5 | True | `d977d31bf25baa40` |
| 1840 | node3 | `gdrive_corpus_extractions/c4d9d719ca_2016_Stochastic_Process_Model_Basketball.pdf.md` | 61425 | 8658 | 5/5 | True | `251f986a472395e2` |
| 1841 | node3 | `gdrive_corpus_extractions/c68d31d87e_2023_-_Leveraging_PFF_Data_to_Identify_Off-the-Ball_Runs_in_Soccer_through_NFL_R.md` | 34417 | 4842 | 5/5 | True | `e160666a8114fd1c` |
| 1842 | node3 | `gdrive_corpus_extractions/c82b39090e_openalex_W2891761289.pdf.md` | 27701 | 3978 | 5/5 | True | `58ec29b56561909f` |
| 1843 | node3 | `gdrive_corpus_extractions/c8f73442ab_2012_CourtVision.pdf.md` | 64253 | 9651 | 5/5 | True | `315bc950e74545ca` |
| 1844 | node3 | `gdrive_corpus_extractions/cad1200b5d_2024_-_Clutch_Matches_Are_In_The_Middle_Optimizing_OPR_with_Weighted_Least_Squar.md` | 32911 | 4651 | 5/5 | True | `51343f7911343d33` |
| 1845 | node3 | `gdrive_corpus_extractions/cb78b1daa2_openalex_W3201130824.pdf.md` | 34287 | 4897 | 5/5 | True | `516524967a8d1bfb` |
| 1846 | node3 | `gdrive_corpus_extractions/cb8f2fc5d4_2023_-_Serving_to_Win_A_Statistical_Exploration_of_Optimal_Serves_in_Beach_Volle.md` | 52809 | 8100 | 5/5 | True | `ada7e4cef8d15b63` |
| 1847 | node3 | `gdrive_corpus_extractions/cbf800156d_openalex_W4405993088.pdf.md` | 35254 | 5129 | 5/5 | True | `b55a27d59342428b` |
| 1848 | node3 | `gdrive_corpus_extractions/cc3509ac92_2007_-_Estimating_situational_effects_on_OPS_-_Unknown_Authors.pdf.md` | 55067 | 7618 | 5/5 | True | `5e560451bbe16f1f` |
| 1849 | node3 | `gdrive_corpus_extractions/cd0e49c11e_2023_-_Estimating_Positional_Plus-Minus_in_the_NBA_-_Gong_et_al.pdf.md` | 63892 | 9249 | 5/5 | True | `f8f0ff681e168888` |
| 1850 | node3 | `gdrive_corpus_extractions/cd77800dac_openalex_W7108318076.pdf.md` | 63806 | 9126 | 5/5 | True | `2869675452df092b` |
| 1851 | node3 | `gdrive_corpus_extractions/cf07006c25_2026_-_Time_Frequency_Analysis_of_Muscle_Activation_Patterns_during_the_Instep_K.md` | 62235 | 9025 | 5/5 | True | `3b54f183f2f9e732` |
| 1852 | node3 | `gdrive_corpus_extractions/d15a5c927e_2013_The_Dwight_Effect_A_New_Ensemble_of_Interior_Defense_Analytics_for_the_NBA..md` | 25510 | 3482 | 5/5 | True | `a2cde3272c64f469` |
| 1853 | node3 | `gdrive_corpus_extractions/d209115cb2_openalex_W4407252327.pdf.md` | 48133 | 7048 | 5/5 | True | `a7685fbe249c0b8b` |
| 1854 | node3 | `gdrive_corpus_extractions/d2e1ffc87c_2026_-_A_Drone-Based_Method_to_Measure_Sprint_Force-Velocity_Profiles_in_30-Mete.md` | 46083 | 6526 | 5/5 | True | `9f2622c3e075b2e5` |
| 1855 | node3 | `gdrive_corpus_extractions/d38807dd25_Camp-1891-American-Football.pdf.md` | 56588 | 9236 | 5/5 | True | `8dbffb4f12f45b67` |
| 1856 | node3 | `gdrive_corpus_extractions/d444941c9a_specsem_f2006_handouts_francis2.pdf.md` | 57052 | 8401 | 5/5 | True | `b70ad97ffcd0913f` |
| 1857 | node3 | `gdrive_corpus_extractions/d456a6107a_openalex_W7172137165.pdf.md` | 47099 | 6871 | 5/5 | True | `ec7cb28a732188ad` |
| 1858 | node3 | `gdrive_corpus_extractions/d4e1347431_2011_Player_Eval_Techniques_-_NBA.pdf.md` | 52874 | 7859 | 5/5 | True | `8dab7248ee77ba9a` |
| 1859 | node3 | `gdrive_corpus_extractions/d5083b4726_openalex_W2289890159.pdf.md` | 49977 | 7269 | 5/5 | True | `e52a4c52805a5b1c` |
| 1860 | node3 | `gdrive_corpus_extractions/d8ce869c44_arxiv_2405.14200v2.pdf.md` | 57743 | 8210 | 5/5 | True | `e96e8f64fca7c88a` |
| 1861 | node3 | `gdrive_corpus_extractions/d9efeecf9c_2020_-_Accuracy_and_National_Bias_of_Figure_Skating_Judges_The_Good_the_Bad_and_.md` | 31074 | 4471 | 5/5 | True | `f0f9878a3a73b089` |
| 1862 | node3 | `gdrive_corpus_extractions/da2d8911f2_openalex_W4401028613.pdf.md` | 54443 | 8002 | 5/5 | True | `70214f6365915912` |
| 1863 | node3 | `gdrive_corpus_extractions/dae812ad1c_2025_-_A_Comps-Based_Approach_for_Interpreting_Tree-Based_Predictions_with_an_Ap.md` | 65933 | 9451 | 5/5 | True | `49365a71fdb2517f` |
| 1864 | node3 | `gdrive_corpus_extractions/db6d36184d_2603.24015.pdf.md` | 63668 | 8904 | 5/5 | True | `d546e51f47849ee7` |
| 1865 | node3 | `gdrive_corpus_extractions/dcab74b6d2_2026_-_Can_Changes_in_Sit-To-Stand_Performance_Throughout_A_30-S_Time_Interval_B.md` | 43319 | 6200 | 5/5 | True | `cc4f8a40972acb46` |
| 1866 | node3 | `gdrive_corpus_extractions/dcb514fa6b_undated_-_Deep_Reinforcement_Learning_for_NBA_Player_Valuation_A_Temporal_Differ.md` | 56786 | 7771 | 5/5 | True | `e166ad3e5a656cde` |
| 1867 | node3 | `gdrive_corpus_extractions/dd7e90f6bf_arxiv_2202.00804v3.pdf.md` | 50847 | 7222 | 5/5 | True | `c3b3412503a6a2fb` |
| 1868 | node3 | `gdrive_corpus_extractions/ddbd51d2b3_openalex_W4402876468.pdf.md` | 42499 | 6147 | 5/5 | True | `768046bc6ee89200` |
| 1869 | node3 | `gdrive_corpus_extractions/ddc7090491_Effect_of_Defensive_Pressure_on_Movement.pdf.md` | 31959 | 4490 | 5/5 | True | `408595e9ddb3382e` |
| 1870 | node3 | `gdrive_corpus_extractions/dde51a743a_1712.05879.pdf.md` | 30267 | 4550 | 5/5 | True | `233941bfde8f3bae` |
| 1871 | node3 | `gdrive_corpus_extractions/de031eedd4_2022_-_Is_the_MLB_Picking_the_Right_Umpires_for_the_World_Series_-_Fischer_et_al.md` | 40538 | 5547 | 5/5 | True | `ec9728214253ddf9` |
| 1872 | node3 | `gdrive_corpus_extractions/de03d6dbcb_openalex_W7216167775.pdf.md` | 43979 | 6364 | 5/5 | True | `78696dcdb4e13d6d` |
| 1873 | node3 | `gdrive_corpus_extractions/dfdf047357_2024_-_Modelling_Team_Play_Style_Using_Tracking_Data_to_Evaluate_the_Effectivene.md` | 39668 | 5820 | 5/5 | True | `4d8a017f2cc0b80a` |
| 1874 | node3 | `gdrive_corpus_extractions/e1a1cc1b3c_2025_-_A_Fatigue_Penalty_Model_for_x_G_Conor_Malone_-_Unknown_Authors.pdf.md` | 55178 | 7864 | 5/5 | True | `25ac9fac99c6589c` |
| 1875 | node3 | `gdrive_corpus_extractions/e23fcb500b_openalex_W2626840438.pdf.md` | 57689 | 8335 | 5/5 | True | `a51578b375c9d78c` |
| 1876 | node3 | `gdrive_corpus_extractions/e31614bc62_arxiv_1907.10855v1.pdf.md` | 61287 | 8781 | 5/5 | True | `05d22ddf55a8271d` |
| 1877 | node3 | `gdrive_corpus_extractions/e392f65999_arxiv_2307.16675v1.pdf.md` | 49393 | 7103 | 5/5 | True | `3cd8464f3a96ad28` |
| 1878 | node3 | `gdrive_corpus_extractions/e46c4877f1_Latent_Structure_of_Situational_Efficien.pdf.md` | 55124 | 7740 | 5/5 | True | `1310a729d3795be6` |
| 1879 | node3 | `gdrive_corpus_extractions/e5763cf28b_openalex_W7160830021.pdf.md` | 44878 | 6561 | 5/5 | True | `c00ecf41dee0dff1` |
| 1880 | node3 | `gdrive_corpus_extractions/e632443f38_openalex_W2067975546.pdf.md` | 40926 | 5880 | 5/5 | True | `eb83b79f0398fd60` |
| 1881 | node3 | `gdrive_corpus_extractions/e7c11f578d_openalex_W4282840112.pdf.md` | 46187 | 6889 | 5/5 | True | `432863605c971e91` |
| 1882 | node3 | `gdrive_corpus_extractions/e80008f604_2023_-_Testing_styles_of_play_using_triad_census_distribution_an_application_to_.md` | 38546 | 5448 | 5/5 | True | `185433bc6d8c27d8` |
| 1883 | node3 | `gdrive_corpus_extractions/e932d978b8_Aerodynamic_drag_measurement_of_American_footballs.pdf.md` | 54362 | 8145 | 5/5 | True | `4a6e2015d6d3e5d4` |
| 1884 | node3 | `gdrive_corpus_extractions/e9b084deaa_2026_-_A_Statistical_and_Machine_Learning_Framework_for_Quantifying_Offensive_Im.md` | 41058 | 5893 | 5/5 | True | `0da94e020680da41` |
| 1885 | node3 | `gdrive_corpus_extractions/ea261c98e6_openalex_W2143215034.pdf.md` | 50590 | 6857 | 5/5 | True | `e14a4ab68e13d80b` |
| 1886 | node3 | `gdrive_corpus_extractions/ea5c2d067b_2021_The_Anatomy_of_Corner_3s_in_the_NBA_-_Pelechrinis_Goldsberry.pdf.md` | 59558 | 8706 | 5/5 | True | `005d43a4e158413b` |
| 1887 | node3 | `gdrive_corpus_extractions/eb29800ba9_2022_-_Introducing_Grid_WAR_Rethinking_WAR_for_Starting_Pitchers_-_Brill_et_al.p.md` | 56320 | 8301 | 5/5 | True | `74f0fe768dae8e6b` |
| 1888 | node3 | `gdrive_corpus_extractions/ec205a0b23_arxiv_1811.05622v1.pdf.md` | 62354 | 8623 | 5/5 | True | `77c092cafebfe014` |
| 1889 | node3 | `gdrive_corpus_extractions/ec7aaa73d2_2007_-_Rating_the_ratings_A_comparison_of_methods_for_ranking_college_ice_hockey.md` | 51645 | 7501 | 5/5 | True | `1d75f66401deab83` |
| 1890 | node3 | `gdrive_corpus_extractions/ed6845989c_Camp-1911-Football-for-the-Spectator.pdf.md` | 39113 | 5704 | 5/5 | True | `638af07902e9c3c1` |
| 1891 | node3 | `gdrive_corpus_extractions/ed6f135eb1_arxiv_2303.11855v1.pdf.md` | 53005 | 8026 | 5/5 | True | `ed7621c63846b73e` |
| 1892 | node3 | `gdrive_corpus_extractions/eee650f959_2022_Implicit_Biases_in_Refereeing_-_Lessons_from_NBA_Referees_-_Pelechrinis.pdf.md` | 56182 | 8165 | 5/5 | True | `e4e501dcef4cf0bc` |
| 1893 | node3 | `gdrive_corpus_extractions/ef81dd1a58_openalex_W2905907956.pdf.md` | 35729 | 4836 | 5/5 | True | `864447331d0ffdfd` |
| 1894 | node3 | `gdrive_corpus_extractions/f1a240dd69_openalex_W7214203117.pdf.md` | 29159 | 3880 | 5/5 | True | `1a7c748147aa95d2` |
| 1895 | node3 | `gdrive_corpus_extractions/f2379656b3_openalex_W2801135381.pdf.md` | 52931 | 7792 | 5/5 | True | `a134f2094723c5f6` |
| 1896 | node3 | `gdrive_corpus_extractions/f2a0c3b348_Drafting_strategies_in_fantasy_football_A_study_of_competitive_sequential_human_.md` | 55530 | 7991 | 5/5 | True | `fcb3ffa7271b9c64` |
| 1897 | node3 | `gdrive_corpus_extractions/f2dae3e7ec_2512.19551v1.pdf.md` | 35798 | 5128 | 5/5 | True | `e473cc0e2d36f7f6` |
| 1898 | node3 | `gdrive_corpus_extractions/f326f54260_2023_-_Robust_Daily_Fantasy_Sports_Maximizing_Reward_via_the_Robust_Optimization.md` | 57724 | 8530 | 5/5 | True | `3c1a7df283cd98ca` |
| 1899 | node3 | `gdrive_corpus_extractions/f3c49af1c8_Using_Machine_Learning_to_Predict_the_Ou.pdf.md` | 28243 | 3960 | 5/5 | True | `e079b91592213def` |
| 1900 | node3 | `gdrive_corpus_extractions/f507b0bae4_openalex_W600325436.pdf.md` | 57468 | 7992 | 5/5 | True | `154f2cf22078d64a` |
| 1901 | node3 | `gdrive_corpus_extractions/f6c51a2d6f_ssrn-3393127.pdf.md` | 50857 | 7018 | 5/5 | True | `7c49944ec252ae6f` |
| 1902 | node3 | `gdrive_corpus_extractions/f6dacc9b89_2610.00399v1.pdf.md` | 35979 | 5353 | 5/5 | True | `7227cbf798f23c5d` |
| 1903 | node3 | `gdrive_corpus_extractions/f7323306a2_2026_-_Effects_of_Different_Complex_Training_Methods_on_Change_of_Direction_Spri.md` | 36441 | 5205 | 5/5 | True | `c753c215cc41b24e` |
| 1904 | node3 | `gdrive_corpus_extractions/f7e62ca2de_2012_Sports_Negotiations.pdf.md` | 44810 | 6222 | 5/5 | True | `5ccbd44f519c8960` |
| 1905 | node3 | `gdrive_corpus_extractions/f882d0cc25_2004.14940.pdf.md` | 34285 | 5042 | 5/5 | True | `38d9325688e663c6` |
| 1906 | node3 | `gdrive_corpus_extractions/fa2a5c4987_arxiv_2602.10784v2.pdf.md` | 65977 | 9427 | 5/5 | True | `bc1c7306173011c3` |
| 1907 | node3 | `gdrive_corpus_extractions/fa5acdc294_openalex_W2997181461.pdf.md` | 37592 | 5164 | 5/5 | True | `31479f661bdde4e1` |
| 1908 | node3 | `gdrive_corpus_extractions/fb249b56e3_2019_DeepHoops_-_Evaluating_Micro-Actions_in_Basketball_Using_Deep_Feature_Repre.md` | 38618 | 5524 | 5/5 | True | `87bf8a30ec0d3b74` |
| 1909 | node3 | `gdrive_corpus_extractions/fb69b464ea_arxiv_1911.04529v5.pdf.md` | 51445 | 7190 | 5/5 | True | `146064e7d7dec075` |
| 1910 | node3 | `gdrive_corpus_extractions/fbf7fb251d_openalex_W4285009590.pdf.md` | 33333 | 4614 | 5/5 | True | `50e9180158d14658` |
| 1911 | node3 | `gdrive_corpus_extractions/fc4708088b_2025_-_Analyzing_South_American_soccer_team_performance_using_distributional_reg.md` | 37744 | 5247 | 5/5 | True | `3eb00466abfb8f17` |
| 1912 | node3 | `gdrive_corpus_extractions/fcffa172be_2023_-_Bayesian_two-stage_framework_for_lineup_independent_assessment_of_individ.md` | 47675 | 6576 | 5/5 | True | `a767e10417da90bc` |
| 1913 | node3 | `gdrive_corpus_extractions/fef62f823d_openalex_W4243547014.pdf.md` | 65950 | 9387 | 5/5 | True | `f859ee68bc941b5e` |
| 1914 | node3 | `gdrive_corpus_extractions/gdoc_11YWI_GSE_Coach_Simulation_Audits.md` | 54258 | 7428 | 5/5 | True | `91aab912fe21c0d7` |
| 1915 | node3 | `gdrive_corpus_extractions/gdoc_1AJD6_Neuro-Symbolic_and_Causal_Architecture_for_Institutional_Sports_Intelligence_at_.md` | 56068 | 7583 | 5/5 | True | `6b8312409adf78e3` |
| 1916 | node3 | `gdrive_corpus_extractions/gdoc_1Np10_CQR_Research.md` | 34392 | 4645 | 5/5 | True | `05dcaf6d7d175ba5` |
| 1917 | node3 | `gdrive_corpus_extractions/gdoc_1qneP_GSE_Continuous_Learning_Architecture_Plan_1_.md` | 32563 | 4060 | 5/5 | True | `820931c89e71f15c` |
| 1918 | node3 | `gdrive_corpus_extractions/gdoc_1TRt__GSE_Coach-Brain_LLM_Engine_1_.md` | 57152 | 7645 | 5/5 | True | `2519e5ffd8d81578` |
| 1919 | node4 | `gdrive_corpus_extractions/00ae3cd288_openalex_W3035690777.pdf.md` | 11696 | 1432 | 5/5 | True | `02820c0dde1df295` |
| 1920 | node4 | `gdrive_corpus_extractions/01cbb49890_2026_-_HoopMind_A_Real-Time_Neural_Game-Tree_System_for_Opponent-Aware_Possessio.md` | 60134 | 8788 | 5/5 | True | `97b9621e468e46a6` |
| 1921 | node4 | `gdrive_corpus_extractions/023970ec15_2024_Approaching_In-Venue_Quality_Tracking_from_Broadcast_Video_using_Generative.md` | 30729 | 4141 | 5/5 | True | `d46ad3fc7bcea935` |
| 1922 | node4 | `gdrive_corpus_extractions/029c69b6b8_2604.19792v2.pdf.md` | 31594 | 4544 | 5/5 | True | `9bc687f0952ac2f2` |
| 1923 | node4 | `gdrive_corpus_extractions/02b4bbb658_openalex_W2153505496.pdf.md` | 54993 | 7895 | 5/5 | True | `7d90c31f960eb792` |
| 1924 | node4 | `gdrive_corpus_extractions/0331ba71e2_openalex_W7212499837.pdf.md` | 38308 | 5016 | 5/5 | True | `849abb127300c030` |
| 1925 | node4 | `gdrive_corpus_extractions/03b8060cea_2005.10816.pdf.md` | 55267 | 8109 | 5/5 | True | `f8e44d111359154b` |
| 1926 | node4 | `gdrive_corpus_extractions/05eb3e31c8_undated_-_Evaluating_Player_Actions_in_Professional_Counter_Strike_using_Tempora.md` | 61401 | 8825 | 5/5 | True | `f5a76439df7a1eb5` |
| 1927 | node4 | `gdrive_corpus_extractions/062c2a4ca2_Computational_and_Mathematical_Methods_in_Medicine_-_2022_-_Wang_-_Retracted_Spo.md` | 53050 | 7766 | 5/5 | True | `c39736a811eff623` |
| 1928 | node4 | `gdrive_corpus_extractions/06752b8165_openalex_W2158613040.pdf.md` | 30588 | 4207 | 5/5 | True | `2a7a550f9c04958e` |
| 1929 | node4 | `gdrive_corpus_extractions/0787bcdee2_2101.00400.pdf.md` | 29995 | 3611 | 5/5 | True | `6fef6202f9c2c975` |
| 1930 | node4 | `gdrive_corpus_extractions/08b3fb7e1b_Predicting_NHL_match_outcomes_with_ML_mo.md.md` | 54557 | 7667 | 5/5 | True | `33d8f79edc1f2e4f` |
| 1931 | node4 | `gdrive_corpus_extractions/09244d3729_openalex_W4391522745.pdf.md` | 48031 | 7026 | 5/5 | True | `4f738495e22e03fd` |
| 1932 | node4 | `gdrive_corpus_extractions/09fa21c996_openalex_W2949464487.pdf.md` | 22867 | 3225 | 5/5 | True | `ea10e03139060eb4` |
| 1933 | node4 | `gdrive_corpus_extractions/0c208f4ba6_openalex_W4250378238.pdf.md` | 36059 | 5195 | 5/5 | True | `64f25509c3bc0541` |
| 1934 | node4 | `gdrive_corpus_extractions/0c980f6183_A_Field_Guide_to_Lies_PDF.pdf.md` | 34388 | 4575 | 5/5 | True | `4ea5edf60517852a` |
| 1935 | node4 | `gdrive_corpus_extractions/0d94d1ce33_undated_-_Data-Driven_Ghosting_using_Deep_Imitation_Learning_-_Hoang_et_al.pdf.md` | 49651 | 6955 | 5/5 | True | `c8f8eb8e88bca504` |
| 1936 | node4 | `gdrive_corpus_extractions/0eea912718_2024_-_High_Value_Football_Transfers_A_Win_or_Loss_Correlation_of_High_Value_Foo.md` | 58571 | 8481 | 5/5 | True | `d1a38591208dbb61` |
| 1937 | node4 | `gdrive_corpus_extractions/108bf5b580_arxiv_2201.00467v1.pdf.md` | 64788 | 9676 | 5/5 | True | `3f7847cce2e70c19` |
| 1938 | node4 | `gdrive_corpus_extractions/10b2a90247_openalex_W7126159453.pdf.md` | 66076 | 8996 | 5/5 | True | `caa681a3cd51b475` |
| 1939 | node4 | `gdrive_corpus_extractions/1238cbc83d_Projection_Predictive_Inference_for_Generalized_Linear_and_Additive_Multilevel_M.md` | 52902 | 7285 | 5/5 | True | `342cd187504d67b0` |
| 1940 | node4 | `gdrive_corpus_extractions/12552a05c8_2607.00665v1.pdf.md` | 45071 | 6172 | 5/5 | True | `659aa2dcbdbfa529` |
| 1941 | node4 | `gdrive_corpus_extractions/16f785cdb3_2022_-_Sports_narrative_enhancement_with_natural_language_generation_-_Wang_et_a.md` | 35614 | 5001 | 5/5 | True | `7853fe62e26e73b2` |
| 1942 | node4 | `gdrive_corpus_extractions/17695ae404_openalex_W1917222946.pdf.md` | 36496 | 4777 | 5/5 | True | `788fd1c9718885ba` |
| 1943 | node4 | `gdrive_corpus_extractions/176e3db4b8_undated_-_exPress_Contextual_Valuation_of_Individual_Players_Within_Pressing_Sit.md` | 36966 | 5294 | 5/5 | True | `44efc5784e32fbab` |
| 1944 | node4 | `gdrive_corpus_extractions/17c5f89d27_2602.23123v1.pdf.md` | 59928 | 8377 | 5/5 | True | `ef192a469f18c2c1` |
| 1945 | node4 | `gdrive_corpus_extractions/18a66e8cc0_2026_-_Blood_Flow_Restriction_Training_Reduces_Hemodynamic_Load_and_Improves_Car.md` | 28152 | 3948 | 5/5 | True | `bfcd830cd9f43a51` |
| 1946 | node4 | `gdrive_corpus_extractions/1900c8d0b2_SuLvEds-2022-FrontiersInTraumaticBrainInjury.pdf.md` | 35140 | 4857 | 5/5 | True | `fefb6a4ed416d7f6` |
| 1947 | node4 | `gdrive_corpus_extractions/1c837c4529_ssrn-5400018.pdf.md` | 54036 | 8276 | 5/5 | True | `e442795aa31b6be6` |
| 1948 | node4 | `gdrive_corpus_extractions/1c8a0e1c64_2023_-_An_Analysis_of_the_Influence_of_Game_Context_on_Team_Playing_Style_-_Unkn.md` | 32411 | 4549 | 5/5 | True | `89c780cec2942750` |
| 1949 | node4 | `gdrive_corpus_extractions/1ce37748dd_2026_-_Longitudinal_Bayesian_networks_for_assessing_team_performance_in_the_Nati.md` | 56368 | 8263 | 5/5 | True | `f4d94038060d39d5` |
| 1950 | node4 | `gdrive_corpus_extractions/1ebf4ed318_NICE-2025-RehabilitationChronicNeurologicalDisorders-AcquiredBrainInjury-NG252.p.md` | 62012 | 8374 | 5/5 | True | `f4c155b74855671f` |
| 1951 | node4 | `gdrive_corpus_extractions/1f0ea4bf38_2026_-_Regional_advantage_in_rugby_sevens_Is_there_a_home_effect_when_nobody_is_.md` | 53595 | 7607 | 5/5 | True | `e582f8ab0d2d76d5` |
| 1952 | node4 | `gdrive_corpus_extractions/1f44432ba0_2020_-_Player_Chemistry_Striving_for_a_Perfectly_Balanced_Soccer_Team_-_Unknown_.md` | 53337 | 7624 | 5/5 | True | `93d47fd15f765c70` |
| 1953 | node4 | `gdrive_corpus_extractions/1fc0680b2e_2020_-_Draft_Decisions_in_Uncertain_Times_Valuing_and_Simulating_NHL_Draft_Picks.md` | 42792 | 6183 | 5/5 | True | `f298153f492096f7` |
| 1954 | node4 | `gdrive_corpus_extractions/21090637aa_openalex_W2216786191.pdf.md` | 57696 | 8099 | 5/5 | True | `ce642b9e0798c703` |
| 1955 | node4 | `gdrive_corpus_extractions/2288d63b5e_2023_-_Mining_football_players_behavioral_profile_identifying_candidate_proxy_fe.md` | 47858 | 6497 | 5/5 | True | `7d8747d3d570dbe5` |
| 1956 | node4 | `gdrive_corpus_extractions/2484d976f1_2504.13939v1.pdf.md` | 39004 | 5382 | 5/5 | True | `6dac8ee8ef234f1c` |
| 1957 | node4 | `gdrive_corpus_extractions/281ccbc652_2511.00553v1.pdf.md` | 66140 | 9413 | 5/5 | True | `ee224c54a34db1b9` |
| 1958 | node4 | `gdrive_corpus_extractions/29bea739ad_rgis1_preview.pdf.md` | 45613 | 6705 | 5/5 | True | `0470e1258fa80c90` |
| 1959 | node4 | `gdrive_corpus_extractions/2c1db9cf33_arxiv_2108.07848v1.pdf.md` | 27847 | 3968 | 5/5 | True | `6e6bca52b4fba08c` |
| 1960 | node4 | `gdrive_corpus_extractions/2c68746bdf_openalex_W7218258823.pdf.md` | 61742 | 8576 | 5/5 | True | `0363442d99c13759` |
| 1961 | node4 | `gdrive_corpus_extractions/2cde5387e3_openalex_W7214395716.pdf.md` | 41771 | 5760 | 5/5 | True | `811a869371fe708b` |
| 1962 | node4 | `gdrive_corpus_extractions/2d1a25b3a4_2016_The_Shrinkage_of_the_Pythagorean_exponents_-_John_Chen_and_Tengfei_Li.pdf.md` | 32473 | 4933 | 5/5 | True | `6cbe550ddbfb7982` |
| 1963 | node4 | `gdrive_corpus_extractions/2df13fb276_2026_-_Performance_Analysis_in_the_Brazilian_Soccer_League_Applying_Machine_Lear.md` | 47926 | 6529 | 5/5 | True | `7adb0bd9571792af` |
| 1964 | node4 | `gdrive_corpus_extractions/304dc92f6f_undated_-_Do_Behavioral_Considerations_Cloud_Penalty-Kick_Location_Optimization_.md` | 57459 | 8042 | 5/5 | True | `5be3a667a180573f` |
| 1965 | node4 | `gdrive_corpus_extractions/309dffe91d_2014_-_Can_t_Buy_Much_Love_Why_money_is_not_baseball_s_most_valuable_currency_-_.md` | 51318 | 7474 | 5/5 | True | `01740d9cd61a5305` |
| 1966 | node4 | `gdrive_corpus_extractions/30f24f404f_2026_-_Effects_of_Exercise_Type_and_Dose_on_Cardiorespiratory_Fitness_in_Childre.md` | 37940 | 5332 | 5/5 | True | `982ae54604bee92e` |
| 1967 | node4 | `gdrive_corpus_extractions/3150d56ada_Overtime_Rules_and_Incentives_in_the_Nat.pdf.md` | 7277 | 1055 | 5/5 | True | `81485ba727bb44c2` |
| 1968 | node4 | `gdrive_corpus_extractions/3151dc09be_arxiv_1301.5943v1.pdf.md` | 30600 | 4312 | 5/5 | True | `efc34d00411d69ea` |
| 1969 | node4 | `gdrive_corpus_extractions/3164722bd7_2604.26099v1.pdf.md` | 41480 | 5670 | 5/5 | True | `e780df884b29edeb` |
| 1970 | node4 | `gdrive_corpus_extractions/326b530b3e_arxiv_2202.12884v1.pdf.md` | 53684 | 7764 | 5/5 | True | `7fd364a355bc2287` |
| 1971 | node4 | `gdrive_corpus_extractions/32a1670264_arxiv_1412.2066v2.pdf.md` | 62369 | 8967 | 5/5 | True | `1b514ac6bdf34932` |
| 1972 | node4 | `gdrive_corpus_extractions/32c3bafa17_nfl_flag_situational_play_book_prd.pdf.md` | 32252 | 4644 | 5/5 | True | `2a6e1fd8931582a4` |
| 1973 | node4 | `gdrive_corpus_extractions/34bb7aa1ae_2021_-_An_Examination_of_Sport_Climbing_s_Competition_Format_and_Scoring_System_.md` | 35161 | 5081 | 5/5 | True | `c117f724fea97b21` |
| 1974 | node4 | `gdrive_corpus_extractions/34ea27b271_nfl_way-to-play-playbook_1_.pdf.md` | 59558 | 8407 | 5/5 | True | `484e9dc998e7ae6f` |
| 1975 | node4 | `gdrive_corpus_extractions/354a86229d_arxiv_1910.08858v2.pdf.md` | 58983 | 8424 | 5/5 | True | `304d29e8477a242e` |
| 1976 | node4 | `gdrive_corpus_extractions/3635719d89_arxiv_2209.00451v1.pdf.md` | 28468 | 4162 | 5/5 | True | `97d74e9f80fa69a2` |
| 1977 | node4 | `gdrive_corpus_extractions/36f1f3f8ed_openalex_W4390348673.pdf.md` | 53122 | 7611 | 5/5 | True | `449228ee531cae3a` |
| 1978 | node4 | `gdrive_corpus_extractions/370b81b2c0_Bailis-2015-CoordinationAvoidanceInDistributedDatabases-Thesis.pdf.md` | 41859 | 5897 | 5/5 | True | `e1178643cbd3ca5d` |
| 1979 | node4 | `gdrive_corpus_extractions/37eee5be9b_Physiological_and_Biomechanical_Monitoring_in_Amer.pdf.md` | 66273 | 8830 | 5/5 | True | `d26a6f8cd1011b8b` |
| 1980 | node4 | `gdrive_corpus_extractions/39ae7aeae5_2018_Predictive_Analytics_for_University_of_Virginia_Football_Recruiting.pdf.md` | 31205 | 4196 | 5/5 | True | `ff9faf781986f0e9` |
| 1981 | node4 | `gdrive_corpus_extractions/39e7ac2d04_smartmoney.pdf.md` | 42150 | 6025 | 5/5 | True | `9fc47279589683dc` |
| 1982 | node4 | `gdrive_corpus_extractions/3b3ab4d808_openalex_W7223326645.pdf.md` | 36411 | 4852 | 5/5 | True | `5b70e2e052ae9c0e` |
| 1983 | node4 | `gdrive_corpus_extractions/3cff404a34_2607.07498v1.pdf.md` | 57938 | 8869 | 5/5 | True | `6c8e2766ae740653` |
| 1984 | node4 | `gdrive_corpus_extractions/3d10349e9e_2019_-_Comparing_NHL_Players_Shots_and_Goals_by_Algorithmically_Decomposing_Shot.md` | 63748 | 9067 | 5/5 | True | `21639c16bb9da69a` |
| 1985 | node4 | `gdrive_corpus_extractions/3d71dd94e0_2020_-_Scoring_a_Touchdown_with_Variable_Pricing_Evidence_from_a_Quasi-Experimen.md` | 41281 | 5869 | 5/5 | True | `6952263f99810da2` |
| 1986 | node4 | `gdrive_corpus_extractions/3e6c06bb18_openalex_W2033376636.pdf.md` | 27765 | 4088 | 5/5 | True | `239383667d08127e` |
| 1987 | node4 | `gdrive_corpus_extractions/3f39fcef59_2608.01696v1.pdf.md` | 33485 | 4609 | 5/5 | True | `14c2ee943f6ec14e` |
| 1988 | node4 | `gdrive_corpus_extractions/40392c082b_openalex_W4416778947.pdf.md` | 50604 | 7214 | 5/5 | True | `6ea1fc1ab164ce06` |
| 1989 | node4 | `gdrive_corpus_extractions/4058c4d861_openalex_W3213914232.pdf.md` | 32953 | 4494 | 5/5 | True | `338b88e3388d94dd` |
| 1990 | node4 | `gdrive_corpus_extractions/41e5aad75c_openalex_W4409913936.pdf.md` | 42601 | 6269 | 5/5 | True | `ca639e92fb215fa6` |
| 1991 | node4 | `gdrive_corpus_extractions/433fddf2f3_2006.08189v1.pdf.md` | 52658 | 7358 | 5/5 | True | `9e5d0c0ce69f656a` |
| 1992 | node4 | `gdrive_corpus_extractions/43da77e1f6_Beekmans-Dubbs-2025-LinuxFromScratch-12.4.pdf.md` | 43582 | 6292 | 5/5 | True | `69ff1c25ab7e4aa9` |
| 1993 | node4 | `gdrive_corpus_extractions/44a84c75c0_arxiv_1806.07227v2.pdf.md` | 55160 | 8332 | 5/5 | True | `7eb4f435bce68b89` |
| 1994 | node4 | `gdrive_corpus_extractions/45c31a4c5a_2023_-_Estimating_Shot_Selection_Efficiency_in_Basketball_A_Revealed_Efficiency_.md` | 30913 | 4251 | 5/5 | True | `a7e8d12e9c4710aa` |
| 1995 | node4 | `gdrive_corpus_extractions/4675c4b7b5_openalex_W7166513021.pdf.md` | 51927 | 7443 | 5/5 | True | `f862e43a6770f9eb` |
| 1996 | node4 | `gdrive_corpus_extractions/46ccc38d1a_openalex_W7162750924.pdf.md` | 53272 | 7695 | 5/5 | True | `dcc83cc913bc3a6a` |
| 1997 | node4 | `gdrive_corpus_extractions/470e82304e_arxiv_2009.02429v2.pdf.md` | 47930 | 6855 | 5/5 | True | `53b74cf58b5e60d2` |
| 1998 | node4 | `gdrive_corpus_extractions/475711dfc4_openalex_W4393154539.pdf.md` | 29146 | 4118 | 5/5 | True | `261c95c9b94df28b` |
| 1999 | node4 | `gdrive_corpus_extractions/49dfc10549_Numerical_Methods_and_Applications_in_Biomechanica.pdf.md` | 49431 | 6673 | 5/5 | True | `1c2f8d8a2a6f8559` |
| 2000 | node4 | `gdrive_corpus_extractions/4a7f2200e0_Large_data_and_Bayesian_modeling_aging_c.pdf.md` | 48454 | 6942 | 5/5 | True | `1a6f48774989fc60` |
| 2001 | node4 | `gdrive_corpus_extractions/4bd71657d0_2026_-_Hierarchical_Possession-Aware_Graph_Pointer_Network_for_Pass_Receiver_Sel.md` | 31540 | 3835 | 5/5 | True | `9545a886a7192139` |
| 2002 | node4 | `gdrive_corpus_extractions/4ca5ea154f_openalex_W7211992087.pdf.md` | 44040 | 6385 | 5/5 | True | `035b16f276666c6a` |
| 2003 | node4 | `gdrive_corpus_extractions/4d3ad456f8_2017_Bhostgusters_-_Realtime_Interactive_Play_Sketching_with_Synthesized_NBA_Def.md` | 66353 | 9183 | 5/5 | True | `eb84e365f83d6aea` |
| 2004 | node4 | `gdrive_corpus_extractions/4d6a91b520_openalex_W4388303828.pdf.md` | 56684 | 7987 | 5/5 | True | `7dffc87ac667829a` |
| 2005 | node4 | `gdrive_corpus_extractions/4e3e7e9327_2025_-_Using_Injury-Risk_Forecasting_to_Quantify_Financial_Impact_in_the_NBA_-_W.md` | 59918 | 8681 | 5/5 | True | `bbaa216e4e173c87` |
| 2006 | node4 | `gdrive_corpus_extractions/4fc45850f1_arxiv_2309.06285v1.pdf.md` | 41506 | 5920 | 5/5 | True | `0ef8450a07e0edcf` |
| 2007 | node4 | `gdrive_corpus_extractions/5011aa1d8d_p26.pdf.md` | 45731 | 6515 | 5/5 | True | `2e7801bcdd14f243` |
| 2008 | node4 | `gdrive_corpus_extractions/501c19f294_2026_-_Beyond_Expected_Goals_A_Probabilistic_Framework_for_Shot_Occurrences_in_S.md` | 42914 | 6071 | 5/5 | True | `e673dc35db3620bb` |
| 2009 | node4 | `gdrive_corpus_extractions/5293a2306c_2020_-_NBA_Lineup_Analysis_on_Clustered_Player_Tendencies_A_new_approach_to_the_.md` | 51681 | 7225 | 5/5 | True | `506899458fdd777d` |
| 2010 | node4 | `gdrive_corpus_extractions/53e304bcb6_2022_-_hockeyR_Easy_access_to_detailed_NHL_play-by-play_data_-_Unknown_Authors.p.md` | 49008 | 7188 | 5/5 | True | `aabe900fdc75c407` |
| 2011 | node4 | `gdrive_corpus_extractions/54ca087409_Aspnes-2025-NotesOnTheoryOfDistributedSystems.pdf.md` | 48085 | 6960 | 5/5 | True | `46fc4a53c9951ae0` |
| 2012 | node4 | `gdrive_corpus_extractions/562f27c1fb_2011_-_RUSH_Ratings_using_score_histories_-_Unknown_Authors.pdf.md` | 64711 | 10005 | 5/5 | True | `098a992302143994` |
| 2013 | node4 | `gdrive_corpus_extractions/56e89d5a67_2020_Predicting_plays_in_the_National_Football_League_-_Craig_Joash_Fernandes_Ro.md` | 41602 | 6099 | 5/5 | True | `491fde14cd8a0461` |
| 2014 | node4 | `gdrive_corpus_extractions/578f5eafa1_openalex_W4383560461.pdf.md` | 47502 | 6586 | 5/5 | True | `2943fe2fc3d43963` |
| 2015 | node4 | `gdrive_corpus_extractions/586389ba3d_2607.00164v1.pdf.md` | 64899 | 9338 | 5/5 | True | `54511314292b46f9` |
| 2016 | node4 | `gdrive_corpus_extractions/58b1dc1ae9_openalex_W4403313533.pdf.md` | 52045 | 7282 | 5/5 | True | `7c548c43d055907e` |
| 2017 | node4 | `gdrive_corpus_extractions/5a6313c1f8_openalex_W3156723266.pdf.md` | 60511 | 8565 | 5/5 | True | `a8d59bdec12924ad` |
| 2018 | node4 | `gdrive_corpus_extractions/5a8825d6c6_2024_-_Beyond_the_Boundary_Revolutionizing_the_IPL_MVP_Index_-_Rajaram_et_al.pdf.md` | 34018 | 4974 | 5/5 | True | `e08751d836cb4542` |
| 2019 | node4 | `gdrive_corpus_extractions/5b356c7fe7_2609.10737v1.pdf.md` | 31438 | 4705 | 5/5 | True | `e25d8eea2063f1ab` |
| 2020 | node4 | `gdrive_corpus_extractions/5b8be8efe3_2026_-_Unified_Trajectory_and_3D_Pose_Forecasting_for_Multi-Agent_Sports_Analysi.md` | 43185 | 6064 | 5/5 | True | `02e9974677c79be3` |
| 2021 | node4 | `gdrive_corpus_extractions/5c3955fd68_2026_-_Effects_of_Quadriceps_Strengthening_Exercise_with_Blood_Flow_Restriction_.md` | 38049 | 5652 | 5/5 | True | `7e406b0d6b47f6f6` |
| 2022 | node4 | `gdrive_corpus_extractions/5c90933466_2025_-_A_New_Framework_to_Estimate_Return_on_Investment_for_Player_Salaries_in_t.md` | 38387 | 5500 | 5/5 | True | `a189abc31d1517cb` |
| 2023 | node4 | `gdrive_corpus_extractions/5f1774af59_openalex_W2975098752.pdf.md` | 27004 | 3631 | 5/5 | True | `23ec23d73fbf15f9` |
| 2024 | node4 | `gdrive_corpus_extractions/611c60fead_arxiv_2601.18774v4.pdf.md` | 37129 | 5609 | 5/5 | True | `0f1d583de98c161b` |
| 2025 | node4 | `gdrive_corpus_extractions/631617b9fd_2012_NBA_Chemistry_Positive_and_Negative_Synergies.pdf.md` | 31233 | 4354 | 5/5 | True | `c1f7d08328d1cc0e` |
| 2026 | node4 | `gdrive_corpus_extractions/652c7cf712_Rao-Blackwellizing_Field_Goal_Percentage.pdf.md` | 50404 | 7083 | 5/5 | True | `a8e605b7a35fbe02` |
| 2027 | node4 | `gdrive_corpus_extractions/65d95ca009_openalex_W2945278229.pdf.md` | 33886 | 4556 | 5/5 | True | `90607298e8109681` |
| 2028 | node4 | `gdrive_corpus_extractions/65ed1315d8_openalex_W3010407797.pdf.md` | 63744 | 9241 | 5/5 | True | `93f488096bd29804` |
| 2029 | node4 | `gdrive_corpus_extractions/672f878577_2609.19388v1.pdf.md` | 50573 | 6803 | 5/5 | True | `aa102f874a2e362a` |
| 2030 | node4 | `gdrive_corpus_extractions/69f1bec6e4_Positional_Value_in_Soccer_Expected_League_Points_Added_above_Replacement.pdf.md` | 65493 | 9527 | 5/5 | True | `1cf4d5f5efd14163` |
| 2031 | node4 | `gdrive_corpus_extractions/6b52ce1089_openalex_W4412004334.pdf.md` | 35668 | 4845 | 5/5 | True | `3b2ea820df8c2215` |
| 2032 | node4 | `gdrive_corpus_extractions/6c561d6e53_openalex_W7169865664.pdf.md` | 63404 | 9107 | 5/5 | True | `5cfe1b9800978a4b` |
| 2033 | node4 | `gdrive_corpus_extractions/6cca77113e_2013_To_Crash_or_Not_To_Crash_A_quantitative_look_at_the_relationship_between_of.md` | 57110 | 8386 | 5/5 | True | `7f6b2965a98d93a7` |
| 2034 | node4 | `gdrive_corpus_extractions/6d49d44117_2026_-_A_Fairness_Audit_of_the_Duckworth-Lewis-Stern_Method_Format-Specific_and_.md` | 39056 | 5624 | 5/5 | True | `cd3bfa5ab91ce3eb` |
| 2035 | node4 | `gdrive_corpus_extractions/6ebdba02bf_2511.01340v1.pdf.md` | 43895 | 6342 | 5/5 | True | `eeacb11356aa141d` |
| 2036 | node4 | `gdrive_corpus_extractions/70b30bade8_arxiv_2401.16235v2.pdf.md` | 57113 | 8106 | 5/5 | True | `007688bd750122a0` |
| 2037 | node4 | `gdrive_corpus_extractions/713ce745b0_Knight-1921-RiskUncertaintyAndProfit.txt.md` | 29377 | 4147 | 5/5 | True | `4a92656030c99a53` |
| 2038 | node4 | `gdrive_corpus_extractions/71b67794c3_2026_-_Association_between_Weekend_Warrior_Physical_Activity_Pattern_and_Osteoar.md` | 47158 | 7170 | 5/5 | True | `29b6db4dbf0499c5` |
| 2039 | node4 | `gdrive_corpus_extractions/7279c6afa9_2015_-_A_method_to_assess_the_influence_of_individual_player_performance_distrib.md` | 48182 | 6781 | 5/5 | True | `5f8108c151cb9637` |
| 2040 | node4 | `gdrive_corpus_extractions/733c902083_arxiv_2506.03335v1.pdf.md` | 54013 | 7877 | 5/5 | True | `d546a7eef0d1efb3` |
| 2041 | node4 | `gdrive_corpus_extractions/73be3cd1f3_arxiv_2305.10262v3.pdf.md` | 63591 | 9241 | 5/5 | True | `2fc301a18a1d1c48` |
| 2042 | node4 | `gdrive_corpus_extractions/73e3726086_2025_-_Manager_Over_and_Underachievement_MOU_Index_Ranking_Soccer_Managers_-_Geo.md` | 30587 | 4333 | 5/5 | True | `5f0b1469439fc339` |
| 2043 | node4 | `gdrive_corpus_extractions/7650ce174a_2009_-_Evaluating_New_Pitching_Metrics_using_a_Point-Mass_Mixture_Random_Effects.md` | 52437 | 7542 | 5/5 | True | `f9719f717970ac31` |
| 2044 | node4 | `gdrive_corpus_extractions/765aaafba3_2026_-_The_life_and_death_of_football_team_runs_survival_of_collective_modes_sha.md` | 37788 | 5426 | 5/5 | True | `9d872a8e0f68ca3e` |
| 2045 | node4 | `gdrive_corpus_extractions/771c459569_openalex_W7215913570.pdf.md` | 44845 | 6454 | 5/5 | True | `6b0127006418e03a` |
| 2046 | node4 | `gdrive_corpus_extractions/78c49209a5_Sinkhorn_rate.pdf.md` | 51701 | 7089 | 5/5 | True | `e0202a7b8ffe8eeb` |
| 2047 | node4 | `gdrive_corpus_extractions/792bc570a5_ONeilEtAl-2013-VA-ESP-ComplicationsOfMildTBI.pdf.md` | 51450 | 7366 | 5/5 | True | `d15ec57fcdf797ee` |
| 2048 | node4 | `gdrive_corpus_extractions/79552eef04_1302.4735.pdf.md` | 23587 | 3199 | 5/5 | True | `8483517cf2df1e41` |
| 2049 | node4 | `gdrive_corpus_extractions/7aaff04c46_openalex_W4285037190.pdf.md` | 34942 | 4804 | 5/5 | True | `ee51f0fe12c9b8b7` |
| 2050 | node4 | `gdrive_corpus_extractions/7b0214dd27_arxiv_2212.04820v1.pdf.md` | 27022 | 3753 | 5/5 | True | `3c42a1ac75645041` |
| 2051 | node4 | `gdrive_corpus_extractions/7b561f8c8e_2016_Statistical_methods_in_sports_with_a_focus_on_win_probability_and.pdf.md` | 34439 | 4784 | 5/5 | True | `5bdee40024ab2ffb` |
| 2052 | node4 | `gdrive_corpus_extractions/7ba3ae7a48_2303.00285v1.pdf.md` | 59182 | 8267 | 5/5 | True | `14b0279086b6b8d1` |
| 2053 | node4 | `gdrive_corpus_extractions/7c3ec2bee5_openalex_W2567728646.pdf.md` | 42458 | 6428 | 5/5 | True | `00c5fb7bad788180` |
| 2054 | node4 | `gdrive_corpus_extractions/7de5564995_2019_Using_Deep_Learning_to_Understand_Patterns_of_Player_Movement_in_the_NBA.pd.md` | 47037 | 6627 | 5/5 | True | `41c441f7b942b415` |
| 2055 | node4 | `gdrive_corpus_extractions/7ebb6241bd_arxiv_2406.19655v1.pdf.md` | 40840 | 5888 | 5/5 | True | `0f768ea3fbe765b7` |
| 2056 | node4 | `gdrive_corpus_extractions/7ef4da39c4_openalex_W4406802218.pdf.md` | 43030 | 6071 | 5/5 | True | `7ebdfdbca3e85069` |
| 2057 | node4 | `gdrive_corpus_extractions/7f7f05f5a6_2020_Forecasting_college_football_game_outcomes_using_modern_modeling_techniques.md` | 46260 | 6541 | 5/5 | True | `7a311b015bd5ccf6` |
| 2058 | node4 | `gdrive_corpus_extractions/82b33c702f_The_Application_of_Machine_Learning_Tech.pdf.md` | 32784 | 4519 | 5/5 | True | `42a953d6134aa576` |
| 2059 | node4 | `gdrive_corpus_extractions/82c7594017_openalex_W7165728814.pdf.md` | 65681 | 9376 | 5/5 | True | `1c1c512b7fb73c7a` |
| 2060 | node4 | `gdrive_corpus_extractions/833046c10f_openalex_W3088873262.pdf.md` | 49446 | 6629 | 5/5 | True | `31d053f5761d99f8` |
| 2061 | node4 | `gdrive_corpus_extractions/8348efb46a_Congelio-2023-Introduction-to-NFL-Analytics-with-R.pdf.md` | 55405 | 7781 | 5/5 | True | `e6d47ff283662049` |
| 2062 | node4 | `gdrive_corpus_extractions/83a58f02b6_openalex_W4408385307.pdf.md` | 56298 | 7430 | 5/5 | True | `c1114fc8f8d35b0e` |
| 2063 | node4 | `gdrive_corpus_extractions/84c0c1adc0_openalex_W7202381665.pdf.md` | 45337 | 5888 | 5/5 | True | `9be8017cc0876243` |
| 2064 | node4 | `gdrive_corpus_extractions/85b4d90d05_undated_-_I_Think_We_ll_Go_to_Boston_-_Marathon_Performance_Prediction_-_Pemmara.md` | 39361 | 5494 | 5/5 | True | `a502c3ba5dfff5e9` |
| 2065 | node4 | `gdrive_corpus_extractions/85e39f880c_openalex_W2937357377.pdf.md` | 56331 | 8153 | 5/5 | True | `0c1cc7176972efe0` |
| 2066 | node4 | `gdrive_corpus_extractions/8685fcb60a_Robert_Kissell_2017.pdf.md` | 35565 | 5535 | 5/5 | True | `51da15ed1f88f73f` |
| 2067 | node4 | `gdrive_corpus_extractions/8745373975_2011_Using_Cumulative_Win_Probabilities_to_Predict_NCAA_Performance_-_Bashuk.pdf.md` | 33166 | 4804 | 5/5 | True | `90c5ea1211a26676` |
| 2068 | node4 | `gdrive_corpus_extractions/882325ae59_openalex_W4413129540.pdf.md` | 43559 | 6176 | 5/5 | True | `e6aad85023cc8f92` |
| 2069 | node4 | `gdrive_corpus_extractions/883fc8c9de_2014_Pointwise_Predicting_Points_and_Valuing_Decisions.pdf.md` | 58539 | 8301 | 5/5 | True | `66e7994bd9ff4198` |
| 2070 | node4 | `gdrive_corpus_extractions/88a38310ce_Application_of_Machine_Learning_Algorith.pdf.md` | 59073 | 8959 | 5/5 | True | `aa5ac7486ba0dab9` |
| 2071 | node4 | `gdrive_corpus_extractions/893f141b20_2509.03682v1.pdf.md` | 66894 | 9409 | 5/5 | True | `604e451cd78f8600` |
| 2072 | node4 | `gdrive_corpus_extractions/8943af1b1a_Estimation_of_NBA_players_offense_defens.pdf.md` | 51483 | 7353 | 5/5 | True | `9e829b7c099c661b` |
| 2073 | node4 | `gdrive_corpus_extractions/89929a3141_2601.00421v2_1_.pdf.md` | 53841 | 7326 | 5/5 | True | `59989fdf1b860443` |
| 2074 | node4 | `gdrive_corpus_extractions/8a5a70a24a_2024_-_Measuring_Individual_Competitiveness_and_its_Impact_on_Sporting_Success_-.md` | 67560 | 9796 | 5/5 | True | `1bc9c48861096903` |
| 2075 | node4 | `gdrive_corpus_extractions/8bd3a9c81b_openalex_W4417401475.pdf.md` | 27354 | 3892 | 5/5 | True | `d0a156a22602ae63` |
| 2076 | node4 | `gdrive_corpus_extractions/8c21e9d493_2017_-_Modeling_NCAA_tournament_bracket_pool_multiple_entry_strategy_-_Unknown_A.md` | 46992 | 6593 | 5/5 | True | `9a3fd12ff269a5f1` |
| 2077 | node4 | `gdrive_corpus_extractions/8c3d1c51ac_openalex_W4321222980.pdf.md` | 42900 | 5808 | 5/5 | True | `b5ed10f7c8028ac0` |
| 2078 | node4 | `gdrive_corpus_extractions/8cab178caf_2026_-_Muscle_Synergy_Reorganization_and_Force_Time_Differences_Across_Upper-Lim.md` | 59937 | 9005 | 5/5 | True | `9c42629ce652226e` |
| 2079 | node4 | `gdrive_corpus_extractions/8e2c45a930_DLP-KDD_2021_paper_15.pdf.md` | 64961 | 9494 | 5/5 | True | `0cf6322482fae85a` |
| 2080 | node4 | `gdrive_corpus_extractions/8ecd18696b_openalex_W7216824651.pdf.md` | 37313 | 5524 | 5/5 | True | `9ac8cb20eaf03ef8` |
| 2081 | node4 | `gdrive_corpus_extractions/8f2a47e906_2512.16961.pdf.md` | 29449 | 4459 | 5/5 | True | `ad39090bd0c87204` |
| 2082 | node4 | `gdrive_corpus_extractions/90c4479af4_2022_Using_Hex_Maps_to_Classify_Cluster_Dribble_Hand-off_Variants_in_the_NBA_2.p.md` | 61805 | 9022 | 5/5 | True | `0d8acef0a32ccbd7` |
| 2083 | node4 | `gdrive_corpus_extractions/917e605e52_Space_time_coordination_dynamics_in_bask.pdf.md` | 45567 | 6563 | 5/5 | True | `46b2d17ec2325982` |
| 2084 | node4 | `gdrive_corpus_extractions/927b733682_arxiv_2601.01925v1.pdf.md` | 43854 | 6291 | 5/5 | True | `f86c6965a8e7315a` |
| 2085 | node4 | `gdrive_corpus_extractions/937dad2569_1603.07593v2.pdf.md` | 36347 | 5220 | 5/5 | True | `9a704e4a41506bc6` |
| 2086 | node4 | `gdrive_corpus_extractions/938ea0b945_2014_Elivelton_FerreiraBueno.pdf.md` | 37698 | 5650 | 5/5 | True | `23bb39a67d625b2b` |
| 2087 | node4 | `gdrive_corpus_extractions/9451a1c925_2026_-_Effects_of_Various_Exercise_Interventions_on_Sprint_Performance_and_Jump_.md` | 52438 | 7514 | 5/5 | True | `f2651921472b7d2f` |
| 2088 | node4 | `gdrive_corpus_extractions/9578891d15_openalex_W3199485651.pdf.md` | 63894 | 9619 | 5/5 | True | `eb3d4fbc19f13f5a` |
| 2089 | node4 | `gdrive_corpus_extractions/9600c16b18_openalex_W4220857797.pdf.md` | 49851 | 7328 | 5/5 | True | `7236d3cdca7adc05` |
| 2090 | node4 | `gdrive_corpus_extractions/966ed0c052_openalex_W4408154475.pdf.md` | 54482 | 7448 | 5/5 | True | `198e2cd5cb1891cc` |
| 2091 | node4 | `gdrive_corpus_extractions/969d1a6a52_2609.20567v2.pdf.md` | 33882 | 4505 | 5/5 | True | `855a51476c00ce47` |
| 2092 | node4 | `gdrive_corpus_extractions/97b32bae3e_2301.13052.pdf.md` | 55875 | 7801 | 5/5 | True | `0f5caf183a12d38a` |
| 2093 | node4 | `gdrive_corpus_extractions/98eb7bae06_2024_-_Home_advantage_for_tournament_victory_empirical_evidence_from_FIFA_World_.md` | 28002 | 3926 | 5/5 | True | `d41faae833b7f24f` |
| 2094 | node4 | `gdrive_corpus_extractions/9915f9393d_2026_-_Event_Detection_in_Table_Tennis_Videos_using_2D_Keypoints_-_Lienhart_et_a.md` | 56026 | 8271 | 5/5 | True | `7590690227c4588c` |
| 2095 | node4 | `gdrive_corpus_extractions/999c926247_2207.13747.pdf.md` | 33359 | 4915 | 5/5 | True | `7f181cc01970025e` |
| 2096 | node4 | `gdrive_corpus_extractions/99c9bff66b_English_Slovak_basketball_dictionary.pdf.md` | 38056 | 5382 | 5/5 | True | `e03dd3fe6aa14952` |
| 2097 | node4 | `gdrive_corpus_extractions/9a9e87cdba_2021_-_Baseball_Predictions_and_Strategies_Using_Explainable_AI_-_Unknown_Author.md` | 53933 | 8048 | 5/5 | True | `2acc83226f42655e` |
| 2098 | node4 | `gdrive_corpus_extractions/9aa15a31d2_openalex_W2143036568.pdf.md` | 68331 | 9692 | 5/5 | True | `69c0e67c4a8f3f28` |
| 2099 | node4 | `gdrive_corpus_extractions/9bc68b21a3_arxiv_2106.01972v1.pdf.md` | 29703 | 4165 | 5/5 | True | `ffd53e8818d7bde0` |
| 2100 | node4 | `gdrive_corpus_extractions/9cc3861a8d_2026_-_AI_Soccer_Analyst_Stage-Aware_and_Verifiable_Human-AI_Collaboration_for_S.md` | 29615 | 4003 | 5/5 | True | `311c5264b8f9f809` |
| 2101 | node4 | `gdrive_corpus_extractions/9edf5d203f_2025_-_Revolutionizing_Formula_1_Broadcasting_Unveiling_the_Impact_of_Personaliz.md` | 66764 | 9560 | 5/5 | True | `96aea399a9bf8f92` |
| 2102 | node4 | `gdrive_corpus_extractions/9f8b38efd7_openalex_W3039199222.pdf.md` | 28302 | 4072 | 5/5 | True | `2743217f86a9a6f0` |
| 2103 | node4 | `gdrive_corpus_extractions/a0c20198d0_openalex_W3216785337.pdf.md` | 34209 | 4633 | 5/5 | True | `095f87df6de47545` |
| 2104 | node4 | `gdrive_corpus_extractions/a1c2e8a798_openalex_W7216164280.pdf.md` | 47207 | 6692 | 5/5 | True | `bde3855a89ebebec` |
| 2105 | node4 | `gdrive_corpus_extractions/a1ebf8551a_2503.04638v3.pdf.md` | 31669 | 4333 | 5/5 | True | `6976941f764db643` |
| 2106 | node4 | `gdrive_corpus_extractions/a2c4304370_2017_Data_Driven_Ghosting.pdf.md` | 49837 | 6962 | 5/5 | True | `a298ace1a2680ceb` |
| 2107 | node4 | `gdrive_corpus_extractions/a49b4c03f3_2007_-_Racial_discrimination_among_NBA_referees_-_Unknown_Authors.pdf.md` | 53121 | 7798 | 5/5 | True | `1379737a6c767a76` |
| 2108 | node4 | `gdrive_corpus_extractions/a5db9dd8df_openalex_W2576143345.pdf.md` | 60470 | 8541 | 5/5 | True | `c11f9e6fdf773877` |
| 2109 | node4 | `gdrive_corpus_extractions/a6c56af0a6_2022_-_Winning_duels_in_VALORANT_a_visualization_of_optimal_positioning_-_DeRove.md` | 47349 | 6954 | 5/5 | True | `398242dd70090364` |
| 2110 | node4 | `gdrive_corpus_extractions/a6fe6398c5_openalex_W7221437885.pdf.md` | 41879 | 5761 | 5/5 | True | `72da52f21dc372d0` |
| 2111 | node4 | `gdrive_corpus_extractions/a7771b675a_1205.3212.pdf.md` | 62158 | 9080 | 5/5 | True | `71912e82f8b8a8ab` |
| 2112 | node4 | `gdrive_corpus_extractions/a830d8ed86_OpenStax-2013-AnatomyAndPhysiology.pdf.md` | 51345 | 7597 | 5/5 | True | `418496525c2b7b6d` |
| 2113 | node4 | `gdrive_corpus_extractions/ad99290fb3_arxiv_2610.38308v1.pdf.md` | 37323 | 5610 | 5/5 | True | `d1ec89775b15a4f1` |
| 2114 | node4 | `gdrive_corpus_extractions/ae43240d89_arxiv_2406.17947v2.pdf.md` | 54561 | 7883 | 5/5 | True | `9eb14d6613db3d92` |
| 2115 | node4 | `gdrive_corpus_extractions/ae886488bc_2021_-_Extended_Model_for_Expected_Threat_in_Soccer_-_Unknown_Authors.pdf.md` | 48257 | 6917 | 5/5 | True | `6ae85e962a3b71f9` |
| 2116 | node4 | `gdrive_corpus_extractions/b1463b7b9b_openalex_W4200591272.pdf.md` | 43458 | 6186 | 5/5 | True | `23b4baea2c6717a9` |
| 2117 | node4 | `gdrive_corpus_extractions/b22867f92f_2512.14121v2.pdf.md` | 52500 | 7333 | 5/5 | True | `99f28f1c9af03bc8` |
| 2118 | node4 | `gdrive_corpus_extractions/b403ab3743_openalex_W2953312073.pdf.md` | 29966 | 4278 | 5/5 | True | `433ccec3ad8d4ab6` |
| 2119 | node4 | `gdrive_corpus_extractions/b424a99847_2506.11399.pdf.md` | 28246 | 3957 | 5/5 | True | `13c9cbda145839f6` |
| 2120 | node4 | `gdrive_corpus_extractions/b48f46cd9b_Neural_Network_Modelling_and_Dynamical_S.pdf.md` | 64665 | 9213 | 5/5 | True | `1dbd34fe5387c8c2` |
| 2121 | node4 | `gdrive_corpus_extractions/b4c555c2cb_2011_-_A_framework_for_tactical_analysis_and_individual_off_ensive_production_as.md` | 46571 | 6753 | 5/5 | True | `870281fcc0a0ab6e` |
| 2122 | node4 | `gdrive_corpus_extractions/b57558d380_openalex_W2795704304.pdf.md` | 34466 | 4578 | 5/5 | True | `8e0215fe016aab60` |
| 2123 | node4 | `gdrive_corpus_extractions/b74030e115_openalex_W7131117964.pdf.md` | 28170 | 4005 | 5/5 | True | `75f343d4be2435d4` |
| 2124 | node4 | `gdrive_corpus_extractions/b876a379d0_NFL-Win-Probability.pdf.md` | 33511 | 4822 | 5/5 | True | `1aee4a767ebcd512` |
| 2125 | node4 | `gdrive_corpus_extractions/b8b5281d1b_2026_-_Effects_of_10_Versus_30_Velocity_Loss_Thresholds_on_Strength_and_Explosiv.md` | 36734 | 5215 | 5/5 | True | `d0e335b0876ad7c3` |
| 2126 | node4 | `gdrive_corpus_extractions/ba66a8f6f2_Eisenstein-2019-IntroductionToNaturalLanguageProcessing-Draft.pdf.md` | 53123 | 7297 | 5/5 | True | `b463116ca57e29ec` |
| 2127 | node4 | `gdrive_corpus_extractions/ba730ff8a0_James-1890-PrinciplesOfPsychology-Vol2.txt.md` | 55546 | 7943 | 5/5 | True | `749dab1c1f777aab` |
| 2128 | node4 | `gdrive_corpus_extractions/bc1a32cee1_openalex_W2979803256.pdf.md` | 27834 | 4027 | 5/5 | True | `49747349649f9580` |
| 2129 | node4 | `gdrive_corpus_extractions/bc5695ddd7_arxiv_2403.11328v1.pdf.md` | 34381 | 5030 | 5/5 | True | `62729e01d2bea46c` |
| 2130 | node4 | `gdrive_corpus_extractions/bd7ce0cdf2_openalex_W3183523428.pdf.md` | 67843 | 9736 | 5/5 | True | `5e7ad6c687cbaf27` |
| 2131 | node4 | `gdrive_corpus_extractions/be82b17eef_2018_-_Wide_Open_Spaces_A_statistical_technique_for_measuring_space_creation_in_.md` | 32607 | 4870 | 5/5 | True | `f683122b737d452f` |
| 2132 | node4 | `gdrive_corpus_extractions/bfeb846c32_2015_-_A_logistic_regression_approach_to_predicting_who_will_make_the_NBA_playof.md` | 48575 | 6878 | 5/5 | True | `8eae5211d583d677` |
| 2133 | node4 | `gdrive_corpus_extractions/c1d31529f1_2023_-_A_Research_Study_on_Formula_One_Determining_the_Effectiveness_of_Drivers_.md` | 38333 | 5593 | 5/5 | True | `d734ff108331d841` |
| 2134 | node4 | `gdrive_corpus_extractions/c3277ae404_arxiv_2206.11335v1.pdf.md` | 66195 | 9576 | 5/5 | True | `0eff128ebf94e3f8` |
| 2135 | node4 | `gdrive_corpus_extractions/c40832ba34_openalex_W2306672949.pdf.md` | 50187 | 7406 | 5/5 | True | `aadcfd66202e8b48` |
| 2136 | node4 | `gdrive_corpus_extractions/c4bbeea8dd_2026_-_A_3D_Pose-Based_Ensemble_Framework_for_Cricket_Shot_Classification_and_Au.md` | 35629 | 5214 | 5/5 | True | `7c8c774f5345f9da` |
| 2137 | node4 | `gdrive_corpus_extractions/c5668e0bb2_arxiv_2310.13719v1.pdf.md` | 33274 | 4994 | 5/5 | True | `27a5e5a6f33abaed` |
| 2138 | node4 | `gdrive_corpus_extractions/c5aa1ac065_2007_-_In_search_of_the_advantage_to_batting_last_in_baseball_-_Unknown_Authors..md` | 63638 | 9831 | 5/5 | True | `a0fa2176f383a77f` |
| 2139 | node4 | `gdrive_corpus_extractions/c5ffe96401_2607.01152v2.pdf.md` | 30996 | 4125 | 5/5 | True | `2d639ecfb0c9b7c8` |
| 2140 | node4 | `gdrive_corpus_extractions/c65e17e957_AreasEtAlEds-2026-NeurorehabilitativeRegenerativeMethodsBrainSpinalInjuriesVolII.md` | 48825 | 7177 | 5/5 | True | `01f19fdbfaa05428` |
| 2141 | node4 | `gdrive_corpus_extractions/c83f85a70d_2026_-_The_Traveling_Tournament_Problem_An_Overview_-_Bulck_et_al.pdf.md` | 57599 | 9242 | 5/5 | True | `86bda23977988b53` |
| 2142 | node4 | `gdrive_corpus_extractions/c8b97b1347_2206.13246.pdf.md` | 39369 | 5541 | 5/5 | True | `ed90c57bad374a3a` |
| 2143 | node4 | `gdrive_corpus_extractions/c8cbfd4b44__15590410_-_Journal_of_Quantitative_Analysis_in_Sports_Modified_Kelly_criteria.p.md` | 52730 | 7408 | 5/5 | True | `7e60b5604e6420d0` |
| 2144 | node4 | `gdrive_corpus_extractions/c9a82d64dd_openalex_W7205015727.pdf.md` | 47508 | 6619 | 5/5 | True | `3762ebb87cc9fd38` |
| 2145 | node4 | `gdrive_corpus_extractions/cac214dae1_openalex_W4375870138.pdf.md` | 37182 | 5482 | 5/5 | True | `cac55731f75cb261` |
| 2146 | node4 | `gdrive_corpus_extractions/cad5e3c078_arxiv_2006.14930v1.pdf.md` | 65492 | 8952 | 5/5 | True | `d36c34f19ea01274` |
| 2147 | node4 | `gdrive_corpus_extractions/cc1124883b_openalex_W2064142958.pdf.md` | 28958 | 4149 | 5/5 | True | `e820dc9805f1e700` |
| 2148 | node4 | `gdrive_corpus_extractions/cc971e39d5_arxiv_2406.12081v1.pdf.md` | 54678 | 8355 | 5/5 | True | `df155dda809e6058` |
| 2149 | node4 | `gdrive_corpus_extractions/cd12ea0996_2021_-_Sharpstack_Cholesky_Correlations_for_Building_Better_Lineups_-_Unknown_Au.md` | 10337 | 1441 | 5/5 | True | `731b3f9d48e42250` |
| 2150 | node4 | `gdrive_corpus_extractions/ce918d2db7_2023_-_Kelly_criterion_and_fractional_Kelly_strategy_for_non-mutually_exclusive_.md` | 42050 | 5806 | 5/5 | True | `da7713149c839cc1` |
| 2151 | node4 | `gdrive_corpus_extractions/cef9b89c17_openalex_W4390754447.pdf.md` | 63099 | 9403 | 5/5 | True | `f9f06c760a7a82bf` |
| 2152 | node4 | `gdrive_corpus_extractions/cfbd8ae01d_2023_-_Competitive_Balance_in_Professional_Sports_A_Multidimensional_Perspective.md` | 41376 | 5841 | 5/5 | True | `aa74afe6982dc4eb` |
| 2153 | node4 | `gdrive_corpus_extractions/d00990afe7_2020_-_Enhancing_Public_Data_Availability_and_Analysis_of_Olympic_Sports_The_Cas.md` | 50806 | 7450 | 5/5 | True | `0a9bd4d99a22be5d` |
| 2154 | node4 | `gdrive_corpus_extractions/d00c1574a2_2102.07545v2.pdf.md` | 56371 | 7683 | 5/5 | True | `e6bd00b0eaf916e1` |
| 2155 | node4 | `gdrive_corpus_extractions/d02ba85c56_openalex_W3122172916.pdf.md` | 30564 | 4366 | 5/5 | True | `2cfde903f75752dd` |
| 2156 | node4 | `gdrive_corpus_extractions/d0a37adfba_2023_-_An_Investigation_of_Sports_Betting_Selection_and_Sizing_-_Beggy_et_al.pdf.md` | 45310 | 6821 | 5/5 | True | `5237f2ae9732bc02` |
| 2157 | node4 | `gdrive_corpus_extractions/d153a9dbac_openalex_W2753608692.pdf.md` | 52823 | 7715 | 5/5 | True | `50fd14693ba69ac2` |
| 2158 | node4 | `gdrive_corpus_extractions/d1fb24d496_arxiv_2608.03416v1.pdf.md` | 64326 | 8992 | 5/5 | True | `ced7640888b1d58d` |
| 2159 | node4 | `gdrive_corpus_extractions/d2101f8659_2026_-_Comparative_Effectiveness_of_Aerobic_Exercise_versus_Resistance_Training_.md` | 38073 | 5803 | 5/5 | True | `af5ade9ca6b77e25` |
| 2160 | node4 | `gdrive_corpus_extractions/d461b78beb_2023_-_Evaluation_of_Team_Defense_Positioning_by_Computing_Counterfactuals_Using.md` | 35071 | 5091 | 5/5 | True | `541716be58c06957` |
| 2161 | node4 | `gdrive_corpus_extractions/d4ba58e1b9_Variations_on_multimedia_data_mining.md.md` | 59301 | 8916 | 5/5 | True | `f81fd0dba8f8f835` |
| 2162 | node4 | `gdrive_corpus_extractions/d5dbd4628e_footballreport.pdf.md` | 58432 | 8229 | 5/5 | True | `ec429874eda43707` |
| 2163 | node4 | `gdrive_corpus_extractions/d5eb1d21cd_openalex_W3168261381.pdf.md` | 37410 | 5710 | 5/5 | True | `033c0163e77b429a` |
| 2164 | node4 | `gdrive_corpus_extractions/d6e47c3a00_2017_LinNet_-_Probabilistic_Lineup_Evaluation_Through_Network_Embedding.pdf.md` | 28179 | 4232 | 5/5 | True | `f680e384a691f7bb` |
| 2165 | node4 | `gdrive_corpus_extractions/d723d42d4e_2017_-_From_Sports_to_Science_Using_Basketball_Analytics_to_Broaden_the_Appeal_o.md` | 37586 | 5169 | 5/5 | True | `7f289599ba418d4e` |
| 2166 | node4 | `gdrive_corpus_extractions/db0aa41f77_2608.16642.pdf.md` | 29566 | 4220 | 5/5 | True | `705458ef357d8931` |
| 2167 | node4 | `gdrive_corpus_extractions/db0ae6b7ee_Fighting_as_a_Profit_Maximizing_Strategy.pdf.md` | 53725 | 8067 | 5/5 | True | `8e7ad193441e6b4f` |
| 2168 | node4 | `gdrive_corpus_extractions/db8c87bac5_2021_-_Increasing_the_shot_at_a_quality_draft-decision_A_Bayesian_approach_to_im.md` | 33398 | 4637 | 5/5 | True | `abf6cee6de40034c` |
| 2169 | node4 | `gdrive_corpus_extractions/dba2e330ca_arxiv_2607.11548v1.pdf.md` | 62669 | 8930 | 5/5 | True | `c8ca86bbe24f3399` |
| 2170 | node4 | `gdrive_corpus_extractions/dc2a1a070c_2014_SSAC_The-Three-Dimensions-Of-Rebounding.pdf.md` | 43100 | 5991 | 5/5 | True | `841c3cc9fbb51d29` |
| 2171 | node4 | `gdrive_corpus_extractions/dc96c55b17_2014_From_5_to_13_Positions_in_Basketball_Slides.pdf.md` | 42815 | 5945 | 5/5 | True | `61672ce83be8b5b3` |
| 2172 | node4 | `gdrive_corpus_extractions/de265acf83_arxiv_1602.03779v14.pdf.md` | 26974 | 3880 | 5/5 | True | `9ea4f096320d35b5` |
| 2173 | node4 | `gdrive_corpus_extractions/deb02aed55_openalex_W4318426810.pdf.md` | 35905 | 4954 | 5/5 | True | `5b131ed82c7b740e` |
| 2174 | node4 | `gdrive_corpus_extractions/df39c3244c_2609.15254v1.pdf.md` | 56307 | 7935 | 5/5 | True | `8062278edc9fd075` |
| 2175 | node4 | `gdrive_corpus_extractions/e060a1ec75_2609.06739.pdf.md` | 58685 | 8165 | 5/5 | True | `5f07853ac3cd3fc5` |
| 2176 | node4 | `gdrive_corpus_extractions/e2185b4145_openalex_W4394593159.pdf.md` | 67148 | 9472 | 5/5 | True | `6edc19c44b159179` |
| 2177 | node4 | `gdrive_corpus_extractions/e3df3f1aeb_arxiv_1611.09158v2.pdf.md` | 53132 | 7516 | 5/5 | True | `1f99ada8c5163ed6` |
| 2178 | node4 | `gdrive_corpus_extractions/e3e14f467d_openalex_W7160494380.pdf.md` | 45844 | 6174 | 5/5 | True | `83b371456de1f70b` |
| 2179 | node4 | `gdrive_corpus_extractions/e45ed2ad5c_2013_-_The_Hot_Hand_A_New_Approach_to_an_Old_Fallacy_-_Unknown_Authors.pdf.md` | 26659 | 3742 | 5/5 | True | `f6bee7008cc2dd00` |
| 2180 | node4 | `gdrive_corpus_extractions/e50a3acc75_2023_-_More_Than_The_Sum_of_Their_Parts_Evaluating_Defensive_Line_Construction_a.md` | 44251 | 6310 | 5/5 | True | `6fc907d2605687af` |
| 2181 | node4 | `gdrive_corpus_extractions/e60b5f6500_fcomp-8-1883327.pdf.md` | 66843 | 9461 | 5/5 | True | `c4738727920e710a` |
| 2182 | node4 | `gdrive_corpus_extractions/e7306b2f84_2019_-_Choke_or_Shine_Quantifying_Soccer_Players_Abilities_to_Perform_Under_Ment.md` | 61540 | 8564 | 5/5 | True | `7987760241fe4028` |
| 2183 | node4 | `gdrive_corpus_extractions/e73b75cb00_arxiv_2106.13742v1.pdf.md` | 34690 | 4886 | 5/5 | True | `54b88cffb4ea997f` |
| 2184 | node4 | `gdrive_corpus_extractions/e7bf5d4f9e_a-machine-learning-model-for-analysis-and-prediction-of-football-match-outcomes-.md` | 35667 | 5046 | 5/5 | True | `093438113eb57c36` |
| 2185 | node4 | `gdrive_corpus_extractions/e826594e2d_openalex_W2806469095.pdf.md` | 26721 | 3806 | 5/5 | True | `d777655921ed2171` |
| 2186 | node4 | `gdrive_corpus_extractions/e849732ef8_2019_-_From_Markov_models_to_Poisson_point_processes_Modeling_movement_in_the_NB.md` | 32272 | 4319 | 5/5 | True | `af73bb4c32551628` |
| 2187 | node4 | `gdrive_corpus_extractions/e84fc717d0_2026_-_Morphological_and_Functional_Adaptations_of_the_Triceps_Surae_Complex_to_.md` | 52773 | 7791 | 5/5 | True | `2a55e94e34179ccf` |
| 2188 | node4 | `gdrive_corpus_extractions/e8e98c5217_openalex_W2100789667.pdf.md` | 52465 | 7669 | 5/5 | True | `c803135896ef7c8d` |
| 2189 | node4 | `gdrive_corpus_extractions/e9e32e1a11_openalex_W3110274078.pdf.md` | 65585 | 9502 | 5/5 | True | `768c50ff94321d05` |
| 2190 | node4 | `gdrive_corpus_extractions/ebdee38ee7_openalex_W3131562439.pdf.md` | 58997 | 8888 | 5/5 | True | `96612565149e0289` |
| 2191 | node4 | `gdrive_corpus_extractions/ed770e5fe5_openalex_W4403045831.pdf.md` | 34441 | 4902 | 5/5 | True | `e1749eb5ed1f335a` |
| 2192 | node4 | `gdrive_corpus_extractions/ee53402b8a_2025_-_Transformer-Based_Baseball_Modeling_for_Pitch_Outcome_Prediction_and_Stra.md` | 69145 | 9629 | 5/5 | True | `b455b9073fc1d8d6` |
| 2193 | node4 | `gdrive_corpus_extractions/f0ccf9f033_2026_-_Acute_Impact_of_Cold_Compression_Therapy_Across_Diverse_Age_Groups_and_Ph.md` | 33868 | 4690 | 5/5 | True | `dfc25d1b7318b880` |
| 2194 | node4 | `gdrive_corpus_extractions/f143237002_2604.02447v1.pdf.md` | 31270 | 4412 | 5/5 | True | `dd4da66178d21bc4` |
| 2195 | node4 | `gdrive_corpus_extractions/f152296a0b_Tropp-2015-IntroductionToMatrixConcentrationInequalities.pdf.md` | 23234 | 3440 | 5/5 | True | `baa0caef80e9f474` |
| 2196 | node4 | `gdrive_corpus_extractions/f28654b5d5_2024_-_Match_Phases_in_Practice_-_Unknown_Authors.pdf.md` | 60874 | 8861 | 5/5 | True | `14f02fe94e0e5b9a` |
| 2197 | node4 | `gdrive_corpus_extractions/f2a7414566_openalex_W2306779804.pdf.md` | 55842 | 7877 | 5/5 | True | `b62e59973533e4b2` |
| 2198 | node4 | `gdrive_corpus_extractions/f3147555ed_LinKrishnamurthyEds-2026-NeurologicalNeuropsychiatricDisordersMilitaryVolII-Fron.md` | 62068 | 9068 | 5/5 | True | `de80885be7e35d86` |
| 2199 | node4 | `gdrive_corpus_extractions/f365d3ebda_2023_-_Clustering_Football_Game_Situations_via_Deep_Representation_Learning_-_Un.md` | 50240 | 7316 | 5/5 | True | `7d4e36e159f37286` |
| 2200 | node4 | `gdrive_corpus_extractions/f396904118_openalex_W2750820926.pdf.md` | 52709 | 7212 | 5/5 | True | `9b35ed781f68d3b5` |
| 2201 | node4 | `gdrive_corpus_extractions/f4984f61c8_openalex_W7112521964.pdf.md` | 30466 | 4176 | 5/5 | True | `e58c669402aef170` |
| 2202 | node4 | `gdrive_corpus_extractions/f524c0a509_openalex_W2888406078.pdf.md` | 64040 | 9061 | 5/5 | True | `774e12d11671dc93` |
| 2203 | node4 | `gdrive_corpus_extractions/f5d2ea2a95_openalex_W4317611240.pdf.md` | 30293 | 4383 | 5/5 | True | `0afacac7b1095317` |
| 2204 | node4 | `gdrive_corpus_extractions/f6e632901e_2022_-_The_Racial_Imbalance_in_College_Football_Coaching_-_Unknown_Authors.pdf.md` | 48239 | 6811 | 5/5 | True | `0c68a748bfa0853f` |
| 2205 | node4 | `gdrive_corpus_extractions/f7d21949fb_2026_-_Adaptive_Responses_of_Cardiorespiratory_Fitness_and_Cardiometabolic_Risk_.md` | 32675 | 4681 | 5/5 | True | `beda93c0deae1a44` |
| 2206 | node4 | `gdrive_corpus_extractions/f7fb5e1fc1_openalex_W2300793714.pdf.md` | 50762 | 7265 | 5/5 | True | `8903c17a472bcfb4` |
| 2207 | node4 | `gdrive_corpus_extractions/f91daa2e90_arxiv_2109.08051v1.pdf.md` | 26591 | 3889 | 5/5 | True | `0eaa0695bb9123bb` |
| 2208 | node4 | `gdrive_corpus_extractions/fa15e93006_2605.22073v2.pdf.md` | 37875 | 5397 | 5/5 | True | `0f39b57b357fee5e` |
| 2209 | node4 | `gdrive_corpus_extractions/fa940c248b_2018_Interactive_Play_Sketching_with_Synthesized_NBA_Defenses.pdf.md` | 62367 | 8683 | 5/5 | True | `62e2ec625c48d462` |
| 2210 | node4 | `gdrive_corpus_extractions/fb0514eadf_arxiv_2505.00534v1.pdf.md` | 26718 | 3834 | 5/5 | True | `850c2270d6a644bc` |
| 2211 | node4 | `gdrive_corpus_extractions/fd8e58dc27_s144448rr.pdf.md` | 54019 | 7799 | 5/5 | True | `f8d8b201519a9da7` |
| 2212 | node4 | `gdrive_corpus_extractions/gdoc_18k8h_GSE_Coach_Simulation_Audits_1_.md` | 34154 | 4598 | 5/5 | True | `29504950992b5169` |
| 2213 | node4 | `gdrive_corpus_extractions/gdoc_1CbTP_Master_Execution_Report__The_Belichick_2_-_Copy.md` | 39910 | 5372 | 5/5 | True | `d526a79ea517cb27` |
| 2214 | node4 | `gdrive_corpus_extractions/gdoc_1qyOj_Master_Execution_Report__The_Belichick.md` | 40047 | 5106 | 5/5 | True | `91806a9d15e00b7e` |
| 2215 | node4 | `gdrive_corpus_extractions/gdoc_1vK_6_GSE_Continuous_Learning_Architecture_Plan_1_-_Copy.md` | 57215 | 8318 | 5/5 | True | `0df85ac57ae8f283` |

## Stage 1D — GitHub Repositories, 30TB Vault Film Room (`*.mp4`) & 2026-11-13 Google Drive / Worktree Parity
### All `28` Beexly GitHub Repositories
| # | Repo | Default Branch | Private | Pushed At | URL |
|---|---|---|---|---|---|
| 1 | `agent-bus` | `main` | False | `2026-11-14T00:58:30Z` | https://github.com/Beexly/agent-bus |
| 2 | `Sports` | `main` | False | `2026-11-14T00:42:04Z` | https://github.com/Beexly/Sports |
| 3 | `chick-immersive` | `main` | True | `2026-11-12T20:22:43Z` | https://github.com/Beexly/chick-immersive |
| 4 | `chick-shopify-theme` | `draft/the-table` | True | `2026-11-12T20:22:37Z` | https://github.com/Beexly/chick-shopify-theme |
| 5 | `autonomous-revenue-engine` | `main` | False | `2026-11-12T19:22:26Z` | https://github.com/Beexly/autonomous-revenue-engine |
| 6 | `gse-competitive-intel` | `main` | False | `2026-11-11T06:23:19Z` | https://github.com/Beexly/gse-competitive-intel |
| 7 | `Project-Tree` | `main` | False | `2026-11-11T06:19:35Z` | https://github.com/Beexly/Project-Tree |
| 8 | `nfl-farm` | `master` | True | `2026-10-24T21:38:15Z` | https://github.com/Beexly/nfl-farm |
| 9 | `nfl-context-re` | `master` | True | `2026-10-22T06:31:19Z` | https://github.com/Beexly/nfl-context-re |
| 10 | `roku-iptv` | `main` | False | `2026-10-22T00:27:38Z` | https://github.com/Beexly/roku-iptv |
| 11 | `dropship-catalog` | `master` | True | `2026-10-20T21:19:19Z` | https://github.com/Beexly/dropship-catalog |
| 12 | `AIGoat` | `main` | False | `2026-10-18T20:49:39Z` | https://github.com/Beexly/AIGoat |
| 13 | `OmniRoute` | `release/v3.8.51` | False | `2026-10-14T03:20:40Z` | https://github.com/Beexly/OmniRoute |
| 14 | `Doug.As-Builders` | `main` | False | `2026-10-06T16:38:33Z` | https://github.com/Beexly/Doug.As-Builders |
| 15 | `Sports-local-backup-20260924` | `main` | True | `2026-09-25T05:15:46Z` | https://github.com/Beexly/Sports-local-backup-20260924 |
| 16 | `chick-goodies-kit` | `main` | False | `2026-09-16T01:07:52Z` | https://github.com/Beexly/chick-goodies-kit |
| 17 | `XXX` | `main` | True | `2026-09-15T02:48:30Z` | https://github.com/Beexly/XXX |
| 18 | `gradio-GSN` | `main` | False | `2026-09-09T01:51:59Z` | https://github.com/Beexly/gradio-GSN |
| 19 | `espn-groupme-bot` | `master` | False | `2026-09-01T00:25:38Z` | https://github.com/Beexly/espn-groupme-bot |
| 20 | `GSN.Cards` | `main` | False | `2026-08-31T00:34:09Z` | https://github.com/Beexly/GSN.Cards |
| 21 | `Fablechain` | `main` | False | `2026-08-12T22:29:12Z` | https://github.com/Beexly/Fablechain |
| 22 | `gse-grok-build-sandbox` | `main` | True | `2026-08-06T06:19:46Z` | https://github.com/Beexly/gse-grok-build-sandbox |
| 23 | `DirectorOS` | `main` | True | `2026-08-01T20:46:07Z` | https://github.com/Beexly/DirectorOS |
| 24 | `UltimaScraper` | `main` | False | `2026-07-29T05:35:39Z` | https://github.com/Beexly/UltimaScraper |
| 25 | `Clouds-bruh` | `deploy/medusa-cloud` | False | `2026-07-01T02:57:12Z` | https://github.com/Beexly/Clouds-bruh |
| 26 | `claude-code-best-practice` | `main` | False | `2026-04-09T19:33:18Z` | https://github.com/Beexly/claude-code-best-practice |
| 27 | `awesome-ai-agents-2026` | `main` | False | `2026-04-02T23:17:57Z` | https://github.com/Beexly/awesome-ai-agents-2026 |
| 28 | `SupaAgent` | `main` | False | `2026-03-15T03:37:28Z` | https://github.com/Beexly/SupaAgent |

- Worktree `C:\Users\Garrett\Sports_prepack_audit_wt` on `audit/friday-week10-readiness-2026-11-13` (`c7b897c75d2b`) isolated from live `C:\Users\Garrett\Sports` (`2816f3488924`).

### All `12` Film Room Video Assets (`G:\My Drive\GSE-Ultra-30TB-Vault\nfl-film-room-2026`)
| # | Filename | Bytes | Size MB | MP4 `ftyp` Header | MTime (UTC) | Head/Tail 64KB SHA-256[:24] |
|---|---|---|---|---|---|---|
| 1 | `bal_vs_dal_week3_fullgame.mp4` | 762577845 | 727.25 | True | `2026-10-30T06:06:17.090000+00:00` | `5564b92ee696f973d758abe5` |
| 2 | `bal_vs_ind_week1_fullgame.mp4` | 568739714 | 542.39 | True | `2026-10-30T06:06:46.451000+00:00` | `2745eb1a5898514bfef01fdc` |
| 3 | `buf_vs_lar_week5_fullgame.mp4` | 820280312 | 782.28 | True | `2026-10-30T05:56:10.846000+00:00` | `435e07dd944d16d0f93b888c` |
| 4 | `car_gb_week8_highlights.mp4` | 75284120 | 71.8 | True | `2026-10-30T05:08:41.727000+00:00` | `6ab9cc3d95dc62e0442f84de` |
| 5 | `chi_vs_car_week1_fullgame.mp4` | 798746366 | 761.74 | True | `2026-10-30T06:05:36.463000+00:00` | `c9c23f984ba4e54ec3e8fc55` |
| 6 | `dal_vs_nyg_week1_fullgame.mp4` | 563454390 | 537.35 | True | `2026-10-30T05:56:47.778000+00:00` | `6fff4265e7f295dc41716e69` |
| 7 | `hou_vs_jax_week6_fullgame.mp4` | 548513757 | 523.1 | True | `2026-10-30T05:54:23.709000+00:00` | `e6601ce0fc3672dc79701107` |
| 8 | `ind_vs_kc_week2_fullgame.mp4` | 776937064 | 740.94 | True | `2026-10-30T06:06:18.045000+00:00` | `ce39cc8e6df509add9a78f6f` |
| 9 | `nfl_pro_blocking_scheme.mp4` | 34386927 | 32.79 | True | `2026-10-30T05:46:32.144000+00:00` | `8923d9e9b4a399ba54a2d6ad` |
| 10 | `nyg_vs_hou_week7_fullgame.mp4` | 692132056 | 660.07 | True | `2026-10-30T05:53:54.774000+00:00` | `ce1e332c9b53df0e03c07817` |
| 11 | `pit_vs_cle_week4_fullgame.mp4` | 786075430 | 749.66 | True | `2026-10-30T06:06:15.156000+00:00` | `95deaabbe9790adec298bd3b` |
| 12 | `sf_vs_sea_week5_fullgame.mp4` | 685041841 | 653.31 | True | `2026-10-30T06:06:02.694000+00:00` | `1d29db74da6ca718102444f5` |

### Google Drive 2026-11-13 Docs & Sheets (`G:\My Drive\*2026-11-13*`)
| # | Name | Extension | Bytes | MTime (UTC) |
|---|---|---|---|---|
| 1 | `GSE + GSI One-Mind Autonomous Business & Fleet Operating System — 2026-11-13.gdoc` | `.gdoc` | 179 | `2026-11-13T18:30:47.699000+00:00` |
| 2 | `GSE Master 18 Equations, Homography & Key-Number Code Codex — 2026-11-13.gdoc` | `.gdoc` | 179 | `2026-11-13T18:30:47.699000+00:00` |
| 3 | `GSE Morning QA & Week 10 Slate Verification — 2026-11-13.gdoc` | `.gdoc` | 179 | `2026-11-13T06:55:09.692000+00:00` |
| 4 | `GSE Omni-Cognitive World Model, Belichick Game-Theory & SiriusXM Audio Engine — 2026-11-13.gdoc` | `.gdoc` | 179 | `2026-11-13T18:30:47.699000+00:00` |
| 5 | `GSE Ready-to-Submit Grants & Credit Follow-Ups — 2026-11-13.gdoc` | `.gdoc` | 179 | `2026-11-13T07:04:57.756000+00:00` |
| 6 | `GSE Situational Metrics, Glicko-2 Bye-RD & Coach-Mind Week 10 Engine — 2026-11-13.gdoc` | `.gdoc` | 179 | `2026-11-13T18:30:47.699000+00:00` |
| 7 | `GSE Week 10 DraftKings DFS Optimizer, SEO WCAG 2.2 & PostHog 516325 HogQL Pack — 2026-11-13.gdoc` | `.gdoc` | 179 | `2026-11-13T07:37:20.310000+00:00` |
| 8 | `GSE Week 10 Line-Free Coach-Mind Play-by-Play Simulation Report — 2026-11-13.gdoc` | `.gdoc` | 179 | `2026-11-13T18:30:47.699000+00:00` |
| 9 | `Wave_01_Core_Corpus_2026-11-13.gsheet` | `.gsheet` | 179 | `2026-11-13T18:30:47.700000+00:00` |
| 10 | `Wave_01_GSE_Core_TierA_2026-11-13.gsheet` | `.gsheet` | 179 | `2026-11-13T18:30:47.699000+00:00` |
| 11 | `Wave_01_Sports_Analytics_2026-11-13.gsheet` | `.gsheet` | 179 | `2026-11-13T18:30:47.700000+00:00` |
| 12 | `Wave_01A_Sports_Analytics_2026-11-13 (1).gsheet` | `.gsheet` | 179 | `2026-11-13T18:30:47.700000+00:00` |
| 13 | `Wave_01A_Sports_Analytics_2026-11-13.gsheet` | `.gsheet` | 179 | `2026-11-13T18:30:47.699000+00:00` |
| 14 | `Wave_01A_Sports_TierA_2026-11-13.gsheet` | `.gsheet` | 179 | `2026-11-13T18:30:47.700000+00:00` |

### Google Drive vs Local Worktree SHA-256 Parity (`52` Folder Files + `8` Top-Level Engine Files)
| # | Folder | Rel Path | Bytes | Drive SHA[:16] | Local SHA[:16] | Exact Match |
|---|---|---|---|---|---|---|
| 1 | `GSE-30TB-Vault-FilmRoom-Bitemporal-and-Revenue-Engine-2026-11-13` | `desktop.ini` | 352 | `7dc1c0c0335e5368` | `MISSING` | False |
| 2 | `GSE-30TB-Vault-FilmRoom-Bitemporal-and-Revenue-Engine-2026-11-13` | `GSE 30TB Film-Room Pipeline, Bitemporal Simulation & 5-Stream Autonomous Revenue Engine — 2026-11-13.gdoc` | 179 | `GDRIVE_VIRTUAL_D` | `MISSING` | False |
| 3 | `GSE-30TB-Vault-FilmRoom-Bitemporal-and-Revenue-Engine-2026-11-13` | `gse_30tb_film_room_and_bitemporal_pipeline.py` | 82869 | `441ad737df999b0b` | `dbb7b007ce1acf7e` | False |
| 4 | `GSE-30TB-Vault-FilmRoom-Bitemporal-and-Revenue-Engine-2026-11-13` | `gse_autonomous_revenue_and_b2b_api_blueprint.ts` | 35664 | `7c37c016e0b6e6ac` | `7c37c016e0b6e6ac` | True |
| 5 | `GSE-30TB-Vault-FilmRoom-Bitemporal-and-Revenue-Engine-2026-11-13` | `test_gse_30tb_bitemporal.py` | 21041 | `30826fa26d1103f1` | `30826fa26d1103f1` | True |
| 6 | `GSE-Belichick-Omni-Causal-World-Model-2026-11-13` | `desktop.ini` | 352 | `7dc1c0c0335e5368` | `MISSING` | False |
| 7 | `GSE-Belichick-Omni-Causal-World-Model-2026-11-13` | `gse_belichick_omni_causal_world_model.py` | 96773 | `d695815bc236d375` | `d695815bc236d375` | True |
| 8 | `GSE-Belichick-Omni-Causal-World-Model-2026-11-13` | `gse_belichick_omni_causal_world_model.ts` | 58394 | `28072be10cf1fc36` | `28072be10cf1fc36` | True |
| 9 | `GSE-Belichick-Omni-Causal-World-Model-2026-11-13` | `test_gse_belichick_omni_causal_world_model.py` | 50455 | `2b071213bf5b6b4b` | `2b071213bf5b6b4b` | True |
| 10 | `GSE-Belichick-Omni-Causal-World-Model-2026-11-13` | `test_gse_belichick_omni_causal_world_model.test.mjs` | 12073 | `b1578ca7a4f450ed` | `b1578ca7a4f450ed` | True |
| 11 | `GSE-Drive-Book-and-Research-Signal-Codex-2026-11-13` | `desktop.ini` | 352 | `7dc1c0c0335e5368` | `MISSING` | False |
| 12 | `GSE-Drive-Book-and-Research-Signal-Codex-2026-11-13` | `GSE + GSI Complete Drive Book, Physics & Situational Signal Encyclopedia — 2026-11-13.gdoc` | 179 | `GDRIVE_VIRTUAL_D` | `MISSING` | False |
| 13 | `GSE-Drive-Book-and-Research-Signal-Codex-2026-11-13` | `gse_sports_universe_physics_and_situations.py` | 63212 | `7963929c7939dc35` | `7963929c7939dc35` | True |
| 14 | `GSE-Drive-Book-and-Research-Signal-Codex-2026-11-13` | `intelligence_signals_master_registry.json` | 91118 | `79dfce165dc6489a` | `79dfce165dc6489a` | True |
| 15 | `GSE-Drive-Book-and-Research-Signal-Codex-2026-11-13` | `test_gse_sports_universe_physics.py` | 27590 | `793b6c89e3222faa` | `793b6c89e3222faa` | True |
| 16 | `GSE-GSI-Dual-Use-TBI-and-Phase-Transition-Engine-2026-11-13` | `desktop.ini` | 352 | `7dc1c0c0335e5368` | `MISSING` | False |
| 17 | `GSE-GSI-Dual-Use-TBI-and-Phase-Transition-Engine-2026-11-13` | `GSE + GSI Unified Phase-Transition, TBI Biomechanics & $7M+ Dual-Use Grant Execution Blueprint — 2026-11-13.gdoc` | 179 | `GDRIVE_VIRTUAL_D` | `MISSING` | False |
| 18 | `GSE-GSI-Dual-Use-TBI-and-Phase-Transition-Engine-2026-11-13` | `gsi_gse_dual_use_phase_transition_and_tbi_kernel.py` | 60546 | `b32a408847a01e28` | `b32a408847a01e28` | True |
| 19 | `GSE-GSI-Dual-Use-TBI-and-Phase-Transition-Engine-2026-11-13` | `test_gsi_gse_dual_use_kernel.py` | 24416 | `64a7e2366d742342` | `64a7e2366d742342` | True |
| 20 | `GSE-Mind-Thermodynamics-and-T1-T8-Mutation-Harness-2026-11-13` | `desktop.ini` | 352 | `7dc1c0c0335e5368` | `MISSING` | False |
| 21 | `GSE-Mind-Thermodynamics-and-T1-T8-Mutation-Harness-2026-11-13` | `GSE Mind Architecture & T1-T8 Adversarial Mutation Verification — 2026-11-13.gdoc` | 179 | `GDRIVE_VIRTUAL_D` | `MISSING` | False |
| 22 | `GSE-Mind-Thermodynamics-and-T1-T8-Mutation-Harness-2026-11-13` | `gse_mind_thermodynamics_and_t1_t8_mutations.py` | 91806 | `a8d48ed7fe2ab5a7` | `a8d48ed7fe2ab5a7` | True |
| 23 | `GSE-Mind-Thermodynamics-and-T1-T8-Mutation-Harness-2026-11-13` | `test_gse_mind_and_t1_t8_mutations.py` | 25743 | `16fa7fcc868df1a8` | `16fa7fcc868df1a8` | True |
| 24 | `GSE-One-Mind-Autonomous-Business-OS-2026-11-13` | `desktop.ini` | 352 | `7dc1c0c0335e5368` | `MISSING` | False |
| 25 | `GSE-One-Mind-Autonomous-Business-OS-2026-11-13` | `gse_one_mind_autonomous_os.py` | 104046 | `d125c48f10938124` | `d125c48f10938124` | True |
| 26 | `GSE-One-Mind-Autonomous-Business-OS-2026-11-13` | `held-out-discipline.md` | 5120 | `4503213a9fe25348` | `4503213a9fe25348` | True |
| 27 | `GSE-One-Mind-Autonomous-Business-OS-2026-11-13` | `held-out-discipline.md.gdoc` | 179 | `GDRIVE_VIRTUAL_D` | `MISSING` | False |
| 28 | `GSE-One-Mind-Autonomous-Business-OS-2026-11-13` | `honest-refusal.md` | 5377 | `4e6fee47e5402d23` | `4e6fee47e5402d23` | True |
| 29 | `GSE-One-Mind-Autonomous-Business-OS-2026-11-13` | `honest-refusal.md.gdoc` | 179 | `GDRIVE_VIRTUAL_D` | `MISSING` | False |
| 30 | `GSE-One-Mind-Autonomous-Business-OS-2026-11-13` | `manifest-provenance.md` | 5826 | `d27a6bf67e48c3c8` | `d27a6bf67e48c3c8` | True |
| 31 | `GSE-One-Mind-Autonomous-Business-OS-2026-11-13` | `manifest-provenance.md.gdoc` | 179 | `GDRIVE_VIRTUAL_D` | `MISSING` | False |
| 32 | `GSE-One-Mind-Autonomous-Business-OS-2026-11-13` | `one_mind_agent_bus_daemon.ts` | 39500 | `5acab19ef4e70fb8` | `5acab19ef4e70fb8` | True |
| 33 | `GSE-One-Mind-Autonomous-Business-OS-2026-11-13` | `paired-audit.md` | 5531 | `e2a8e59cceacb32b` | `e2a8e59cceacb32b` | True |
| 34 | `GSE-One-Mind-Autonomous-Business-OS-2026-11-13` | `paired-audit.md.gdoc` | 179 | `GDRIVE_VIRTUAL_D` | `MISSING` | False |
| 35 | `GSE-One-Mind-Autonomous-Business-OS-2026-11-13` | `test_gse_one_mind_os.py` | 44865 | `f8fbad4a30c9c734` | `965a26806740ab51` | False |
| 36 | `GSE-Week10-Line-Free-Coach-Mind-Simulator-2026-11-13` | `desktop.ini` | 352 | `7dc1c0c0335e5368` | `MISSING` | False |
| 37 | `GSE-Week10-Line-Free-Coach-Mind-Simulator-2026-11-13` | `gse_line_free_coach_mind_week10_simulator.py` | 168852 | `4dc3560edf9a62ff` | `63b05a3fa0280445` | False |
| 38 | `GSE-Week10-Line-Free-Coach-Mind-Simulator-2026-11-13` | `test_gse_line_free_coach_mind.py` | 18103 | `0e16e418514c59bf` | `0e16e418514c59bf` | True |
| 39 | `GSE-Week10-Line-Free-Coach-Mind-Simulator-2026-11-13` | `week10_pure_coach_mind_13_games.json` | 127231 | `3037a9b4ad164055` | `511b646ff0d5ecc5` | False |
| 40 | `GSE-Week10-Parlay-MRI-and-Two-Door-Storefront-Pack-2026-11-13` | `desktop.ini` | 352 | `7dc1c0c0335e5368` | `MISSING` | False |
| 41 | `GSE-Week10-Parlay-MRI-and-Two-Door-Storefront-Pack-2026-11-13` | `INTEGRATION_GUIDE_WEEK10_PARLAY_MRI_STOREFRONT.md.gdoc` | 179 | `GDRIVE_VIRTUAL_D` | `MISSING` | False |
| 42 | `GSE-Week10-Parlay-MRI-and-Two-Door-Storefront-Pack-2026-11-13` | `parlay_mri_and_store_credit.test.ts` | 25667 | `eea845e6d9427749` | `eea845e6d9427749` | True |
| 43 | `GSE-Week10-Parlay-MRI-and-Two-Door-Storefront-Pack-2026-11-13` | `parlay_mri_and_store_credit.ts` | 44312 | `f58a0bd386cc0e84` | `f58a0bd386cc0e84` | True |
| 44 | `GSE-Week10-Parlay-MRI-and-Two-Door-Storefront-Pack-2026-11-13` | `parlay_mri_preview.html` | 103668 | `c2d8c6398cc752e9` | `c2d8c6398cc752e9` | True |
| 45 | `GSE-Week10-Parlay-MRI-and-Two-Door-Storefront-Pack-2026-11-13` | `store-credit-ledger.ts` | 33300 | `7088c40bbde03f5d` | `7088c40bbde03f5d` | True |
| 46 | `GSE-Week10-Verified-Engine-Gate-Pack-2026-11-13` | `board_quarantine_and_hnsw_fix.sql` | 12274 | `fa0abb7b5af461e3` | `fa0abb7b5af461e3` | True |
| 47 | `GSE-Week10-Verified-Engine-Gate-Pack-2026-11-13` | `desktop.ini` | 352 | `7dc1c0c0335e5368` | `MISSING` | False |
| 48 | `GSE-Week10-Verified-Engine-Gate-Pack-2026-11-13` | `multimodal_decisions_router.py` | 21424 | `17955b7185ca4e8b` | `17955b7185ca4e8b` | True |
| 49 | `GSE-Week10-Verified-Engine-Gate-Pack-2026-11-13` | `oof_logit_temp_calibration.py` | 27693 | `ac80163c45493fdf` | `ac80163c45493fdf` | True |
| 50 | `GSE-Week10-Verified-Engine-Gate-Pack-2026-11-13` | `pytest_verification_output.gdoc` | 179 | `GDRIVE_VIRTUAL_D` | `MISSING` | False |
| 51 | `GSE-Week10-Verified-Engine-Gate-Pack-2026-11-13` | `README-DROP-IN-PATHS.md.gdoc` | 179 | `GDRIVE_VIRTUAL_D` | `MISSING` | False |
| 52 | `GSE-Week10-Verified-Engine-Gate-Pack-2026-11-13` | `test_master_plan_gates.py` | 35703 | `b295dcfbd590d939` | `b295dcfbd590d939` | True |

| # | Local Top-Level File (`intelligence/week10_engines_2026_11_13`) | Bytes | SHA-256 |
|---|---|---|---|
| 1 | `gse_18_master_equations_and_homography.py` | 87943 | `80bfab7850d616d87adbb49961d7962d0fbcd5fb242cb88b12bf12c72addb659` |
| 2 | `gse_dk_dfs_mip_optimizer.py` | 53803 | `5cd790e79689d48c3fdb289cab1c11cd8ee01ae5a882c1cea0fd2a7ecb1357bf` |
| 3 | `gse_seo_wcag22_and_posthog_516325_pack.ts` | 37108 | `fb13ad988a57150a74ea2439b386c383398242b8c22fddd58dd982ef3950400e` |
| 4 | `gse_situational_coach_and_injury_engine.py` | 121319 | `8f1ddf6adf6115051562188ad86032bc16ee39cca3257b689def91606d663181` |
| 5 | `test_gse_18_master_equations.py` | 28642 | `62e9038a56840053d84cffe114556866a8485c5fd1bf886228ebcb1937d67bf6` |
| 6 | `test_gse_dk_dfs_mip_optimizer.py` | 23718 | `cb17deb8937f75e6afe7ea8e5d53576bb873d0761bffe662fd7cb7a6e86c3220` |
| 7 | `test_gse_situational_coach_engine.py` | 22948 | `e62edd6dead447cf9b904be3d2a3e16266eae376e19c12339c2693837c8d6d1d` |
| 8 | `unified_quantitative_nfl_architecture_fixed.ts` | 37189 | `69773a84ee419eb010031a71c4ec89caa58e660776c5c146b58d51937bcb46dc` |

## Stage 1E — 100% Uncompressed Scan of All `64` Motif Week 10 Sweep CSVs
- Player-team rows scanned: `382` | Stale `sfdata-*` rows reproduced: `16` | `Greg Dortch` bridge=`BUF` (CSV hits=0) | `Kendrick Bourne` bridge=`ARI` (CSV hits=0)

### All 64 Motif CSV Files Individually Verified
| # | CSV File | Bytes | Rows | Cols | Player-Team Pairs | Stale Tags | SHA-256[:16] |
|---|---|---|---|---|---|---|---|
| 1 | `barrett-mahomes-herbert-twins-2026.csv` | 292 | 12 | 4 | 0 | 0 | `fdaaf56296881f8b` |
| 2 | `bills-jets-matchup-out-2026.csv` | 252 | 5 | 5 | 0 | 0 | `6041942d3f223ede` |
| 3 | `bills-ol-pressure-rate-allowed-2026.csv` | 282 | 7 | 7 | 0 | 0 | `02e2c342fda08a89` |
| 4 | `cmain-cpt-position-top1-2026.csv` | 108 | 6 | 3 | 0 | 0 | `2b38544b2f0cc741` |
| 5 | `cmain-projection-band-top1-2026.csv` | 74 | 4 | 2 | 0 | 0 | `59bea6040cd2f7c0` |
| 6 | `cmain-roster-construction-top1-2026.csv` | 106 | 5 | 3 | 0 | 0 | `860713445f8a1f18` |
| 7 | `gridiron-adot-leaders-2026.csv` | 265 | 10 | 4 | 0 | 0 | `81c7551f8cd927f5` |
| 8 | `gridiron-dropback-outcome-by-qb-2026.csv` | 1216 | 32 | 7 | 0 | 0 | `637a6aa410c024fb` |
| 9 | `gridiron-epa-per-play-leaders-2026.csv` | 323 | 10 | 5 | 0 | 0 | `dce2f1485762d020` |
| 10 | `gridiron-kalshi-odds-2026-11-13.csv` | 977 | 25 | 4 | 0 | 0 | `e506150127f746e7` |
| 11 | `gridiron-penalty-yards-2026.csv` | 393 | 32 | 3 | 0 | 0 | `f7bf1101278db62c` |
| 12 | `gridiron-qb-turnover-leaders-2026.csv` | 265 | 10 | 5 | 0 | 0 | `751ec4c8166c83e2` |
| 13 | `gridiron-receiving-yards-by-team-2026.csv` | 803 | 32 | 3 | 32 | 0 | `60d829829a72dcc6` |
| 14 | `gridiron-receiving-yards-wr-leaders-2026.csv` | 798 | 32 | 3 | 32 | 0 | `00ddf18a290242b2` |
| 15 | `gridiron-rushing-yards-by-team-2026.csv` | 769 | 32 | 3 | 32 | 0 | `7ec0f6a2ec5fc793` |
| 16 | `gridiron-rushing-yards-rb-leaders-2026.csv` | 778 | 32 | 3 | 32 | 0 | `5556d2d121074fb2` |
| 17 | `gridiron-time-to-throw-2026.csv` | 535 | 32 | 3 | 0 | 0 | `12ce06f767a15902` |
| 18 | `gridiron-touchdowns-by-team-2026.csv` | 716 | 32 | 3 | 32 | 0 | `434e9b1666e8ae2e` |
| 19 | `gridiron-was-nyg-boxscore-nyg-2026.csv` | 436 | 7 | 3 | 0 | 0 | `ec347b2fd6d7f668` |
| 20 | `gridiron-was-nyg-boxscore-was-2026.csv` | 466 | 8 | 3 | 0 | 0 | `57e7a8ed406f50cb` |
| 21 | `gridiron-wr-40plus-receptions-2026.csv` | 279 | 10 | 4 | 0 | 0 | `87313850ec7315c1` |
| 22 | `gwttkb-aggressiveness-top10-2026.csv` | 331 | 10 | 4 | 0 | 0 | `6a195aac1e2d0daa` |
| 23 | `hawk-biggest-gap-since1999-2026.csv` | 217 | 8 | 3 | 0 | 0 | `7b93b1ec164036b1` |
| 24 | `hawk-dark-side-defense-2026.csv` | 218 | 9 | 5 | 0 | 0 | `6dca67bbf9ade2a1` |
| 25 | `magic-arby-weekly-2026.csv` | 87 | 6 | 2 | 0 | 0 | `6332ca8153cf8003` |
| 26 | `magic-jameson-williams-laporta-splits-2026.csv` | 236 | 4 | 6 | 0 | 0 | `914c7ff4236b3e96` |
| 27 | `magic-pass-funnel-week9-2026.csv` | 724 | 15 | 9 | 0 | 0 | `33425d0fedf826a4` |
| 28 | `magic-run-funnel-week9-2026.csv` | 715 | 15 | 9 | 0 | 0 | `d798fb6c02d2e7dd` |
| 29 | `patton-inline-te-pct-2026.csv` | 235 | 10 | 3 | 0 | 0 | `fb3998331518c3da` |
| 30 | `patton-passes-defended-2026.csv` | 125 | 5 | 3 | 0 | 0 | `58d532ee681a5348` |
| 31 | `pff-burden-top-wr-grade-out-2026.csv` | 237 | 10 | 3 | 0 | 0 | `a5b5a70fdde37b1d` |
| 32 | `pff-defensive-stops-2026.csv` | 162 | 6 | 4 | 0 | 0 | `40af9742fd9e4235` |
| 33 | `pff-pressures-since-2020-2026.csv` | 250 | 10 | 4 | 10 | 0 | `acb4f838bd0a1208` |
| 34 | `pff-red-zone-efficiency-2026.csv` | 148 | 5 | 5 | 0 | 0 | `2f2fb338a0bfd2b1` |
| 35 | `pff-rookie-yac-per-rec-2026.csv` | 132 | 5 | 3 | 0 | 0 | `82853325147d0475` |
| 36 | `pff-te-passer-rating-when-targeted-2026.csv` | 136 | 5 | 3 | 0 | 0 | `c5dcad5d789aafe1` |
| 37 | `pff-top-graded-rookies-partial-2026.csv` | 228 | 8 | 4 | 0 | 0 | `1db1c247cf5c3c70` |
| 38 | `sfdata-composite-qb-rankings-2026.csv` | 1713 | 31 | 9 | 0 | 0 | `8b788652e80448ca` |
| 39 | `sfdata-expected-completion-pct-2026.csv` | 709 | 31 | 4 | 31 | 3 | `829a82cf228fb68d` |
| 40 | `sfdata-lowest-yprr-2026.csv` | 852 | 30 | 4 | 30 | 0 | `cf9c0cbb62809c4b` |
| 41 | `sfdata-missed-tackles-through-week9-2026.csv` | 726 | 32 | 4 | 0 | 0 | `1bcceba99f6f8664` |
| 42 | `sfdata-nov10-ass-leaders-2026.csv` | 595 | 30 | 3 | 0 | 0 | `b7205f7bf0ad0a53` |
| 43 | `sfdata-nov10-dvoa-2026.csv` | 538 | 32 | 5 | 0 | 0 | `bda3e7966d364abc` |
| 44 | `sfdata-nov10-playcalling-week9-2026.csv` | 1088 | 30 | 7 | 0 | 0 | `0e7979ccf2b31ddf` |
| 45 | `sfdata-nov10-qb-epa-per-quarter-2026.csv` | 1307 | 33 | 7 | 0 | 0 | `a250b25bef7c6a7f` |
| 46 | `sfdata-nov10-qb-performances-week9-top10-2026.csv` | 401 | 10 | 7 | 0 | 0 | `8ec0ac9a483474ba` |
| 47 | `sfdata-nov10-qb-turnover-rates-2026.csv` | 595 | 32 | 3 | 0 | 0 | `9d9d0cb72725f01b` |
| 48 | `sfdata-nov10-rookie-usage-2026.csv` | 603 | 32 | 3 | 0 | 0 | `b9bf1ef1dd2261ed` |
| 49 | `sfdata-nov10-sacks-taken-2026.csv` | 552 | 32 | 3 | 0 | 0 | `ea592f871febdc53` |
| 50 | `sfdata-nov10-st-epa-2026.csv` | 419 | 32 | 3 | 0 | 0 | `1c79e504d91f14ce` |
| 51 | `sfdata-nov10-team-pressure-rates-2026.csv` | 623 | 32 | 3 | 0 | 0 | `7fdc72d0533775f0` |
| 52 | `sfdata-nov10-team-sacks-2026.csv` | 547 | 32 | 3 | 0 | 0 | `a6a4c13697c6f692` |
| 53 | `sfdata-nov10-yprr-2026.csv` | 689 | 30 | 3 | 0 | 0 | `9db4bc58743d2031` |
| 54 | `sfdata-offensive-holding-penalties-2026.csv` | 540 | 32 | 3 | 0 | 0 | `6c15b0f0eea2d953` |
| 55 | `sfdata-qb-ryoe-2026.csv` | 905 | 39 | 4 | 39 | 4 | `88787ca413849641` |
| 56 | `sfdata-quick-pressure-rate-2026.csv` | 707 | 31 | 4 | 31 | 3 | `660c8be4489c4ac7` |
| 57 | `sfdata-receiving-leaderboard-week9-2026.csv` | 1466 | 30 | 10 | 0 | 0 | `3cfce67754dd6c6b` |
| 58 | `sfdata-run-stuff-rate-2026.csv` | 648 | 32 | 3 | 0 | 0 | `cbcbb09909bf4dda` |
| 59 | `sfdata-rushing-touchdowns-2026.csv` | 524 | 32 | 3 | 0 | 0 | `c351132411a40fc9` |
| 60 | `sfdata-throwaway-rate-2026.csv` | 683 | 31 | 4 | 31 | 3 | `84e7aac4b966d4e7` |
| 61 | `sfdata-time-to-scramble-2026.csv` | 700 | 31 | 4 | 31 | 3 | `23c683b562600205` |
| 62 | `statyx-data-lab-wr-rows32-50-2026.csv` | 1623 | 19 | 15 | 19 | 0 | `0e91ffb6b6459d87` |
| 63 | `statyx-rush-iq-bijan-2026.csv` | 160 | 4 | 3 | 0 | 0 | `6497641a150e67b0` |
| 64 | `statyx-tnf-projections-was-nyg-2026.csv` | 195 | 2 | 8 | 0 | 0 | `8541c01a6da78114` |

### All `16` Stale Season-Stat Rows Reproduced (CSV Source Kept Untouched; Remapped Non-Destructively)
| # | File | Line | Player | CSV Earned Team | Week 10 Truth | Bridge Remap Output | Raw Row |
|---|---|---|---|---|---|---|---|
| 1 | `sfdata-expected-completion-pct-2026.csv` | 15 | K.Murray | ARI | MIN | ARI | `14,K.Murray,ARI,64.0` |
| 2 | `sfdata-expected-completion-pct-2026.csv` | 28 | K.Cousins | LV | MIN | LV | `27,K.Cousins,LV,60.1` |
| 3 | `sfdata-expected-completion-pct-2026.csv` | 31 | J.Brissett | ARI | BAL | ARI | `30,J.Brissett,ARI,58.7` |
| 4 | `sfdata-qb-ryoe-2026.csv` | 5 | K.Murray | ARI | MIN | ARI | `4,K.Murray,ARI,33.7` |
| 5 | `sfdata-qb-ryoe-2026.csv` | 13 | J.McCarthy | MIN | NYG | MIN | `12,J.McCarthy,MIN,4.2` |
| 6 | `sfdata-qb-ryoe-2026.csv` | 31 | J.Brissett | ARI | BAL | ARI | `30,J.Brissett,ARI,-23.6` |
| 7 | `sfdata-qb-ryoe-2026.csv` | 34 | K.Cousins | LV | MIN | LV | `33,K.Cousins,LV,-31.0` |
| 8 | `sfdata-quick-pressure-rate-2026.csv` | 3 | K.Cousins | LV | MIN | LV | `2,K.Cousins,LV,9.1` |
| 9 | `sfdata-quick-pressure-rate-2026.csv` | 5 | K.Murray | ARI | MIN | ARI | `4,K.Murray,ARI,11.9` |
| 10 | `sfdata-quick-pressure-rate-2026.csv` | 12 | J.Brissett | ARI | BAL | ARI | `11,J.Brissett,ARI,14.1` |
| 11 | `sfdata-throwaway-rate-2026.csv` | 9 | K.Murray | ARI | MIN | ARI | `8,K.Murray,ARI,6.5` |
| 12 | `sfdata-throwaway-rate-2026.csv` | 18 | J.Brissett | ARI | BAL | ARI | `17,J.Brissett,ARI,4.6` |
| 13 | `sfdata-throwaway-rate-2026.csv` | 23 | K.Cousins | LV | MIN | LV | `22,K.Cousins,LV,3.8` |
| 14 | `sfdata-time-to-scramble-2026.csv` | 7 | K.Cousins | LV | MIN | LV | `6,K.Cousins,LV,4.4` |
| 15 | `sfdata-time-to-scramble-2026.csv` | 16 | J.Brissett | ARI | BAL | ARI | `15,J.Brissett,ARI,4.9` |
| 16 | `sfdata-time-to-scramble-2026.csv` | 26 | K.Murray | ARI | MIN | ARI | `25,K.Murray,ARI,5.37` |

### Cross-File Conventions, Structural Non-Claims & Anomalies Verified
| Kind | File | Line | Details |
|---|---|---|---|
| Cross-File Check | `gridiron-receiving-yards-by-team-2026.csv` | 13 | `IND,Josh Downs,354` |
| Cross-File Check | `gridiron-receiving-yards-wr-leaders-2026.csv` | 13 | `IND,Josh Downs,354` |
| Cross-File Check | `gridiron-rushing-yards-by-team-2026.csv` | 14 | `KC,Kenneth Walker III,872` |
| Cross-File Check | `gridiron-rushing-yards-by-team-2026.csv` | 33 | `ARI,Tyler Allgeier,369` |
| Cross-File Check | `gridiron-rushing-yards-rb-leaders-2026.csv` | 14 | `KC,Kenneth Walker III,872` |
| Cross-File Check | `gridiron-rushing-yards-rb-leaders-2026.csv` | 33 | `ARI,Tyler Allgeier,369` |
| Cross-File Check | `gridiron-touchdowns-by-team-2026.csv` | 14 | `KC,Kenneth Walker III,11` |
| Cross-File Check | `statyx-data-lab-wr-rows32-50-2026.csv` | 15 | `45,Josh Downs,KC,9,57,33,354,20%,0.266,58%,6.21,15.19,49%,35%,40% (4/10)` |
| STRUCTURAL_OUT_VOCABULARY | `bills-jets-matchup-out-2026.csv` | 2 | `Points per drive,2.88,1st,2.31,24th` |
| HISTORICAL_SPLIT_NON_CLAIM | `magic-jameson-williams-laporta-splits-2026.csv` | 4 | `LaPorta OUT,8,308,0.19,19.3,21.8` |
| STRUCTURAL_OUT_VOCABULARY | `pff-burden-top-wr-grade-out-2026.csv` | 2 | `1,Jaxon Smith-Njigba,92.8` |
| BLANK_TEAM_CELL_MULTI_SEASON | `pff-pressures-since-2020-2026.csv` | 3 | `2,Myles Garrett,,471` |
| BLANK_TEAM_CELL_MULTI_SEASON | `pff-pressures-since-2020-2026.csv` | 6 | `5,Micah Parsons,,409` |
| BLANK_TEAM_CELL_MULTI_SEASON | `pff-pressures-since-2020-2026.csv` | 9 | `8,Danielle Hunter,,367` |
| J. Daniels TB duplicate anomaly | `sfdata-qb-ryoe-2026.csv` | 2 | `1,J.Daniels,WAS,56.0` |
| J. Daniels TB duplicate anomaly | `sfdata-qb-ryoe-2026.csv` | 21 | `20,J.Daniels (second entry as printed),TB,-7.3` |

### Ready-to-Append `AGENTS.md` Errata Block
```markdown
### Week 10 Motif Sweep CSV Errata & Non-Destructive Remap Contract (Added 2026-11-13)
- **Source Scope:** All 64 CSVs in `docs/research/2026-11-13/full-tables/*.csv` remain untouched faithful source transcriptions.
- **16 Stale Season-Stat Rows (`sfdata-*` 5 files):** Season-earned team tags differ from active Week 10 teams; downstream code MUST route through `intelligence.foundry_bridge.remap_motif_csv_season_stats()`:
  1. `Kyler Murray` (`K.Murray`) tagged `ARI` (5 rows: `sfdata-qb-ryoe-2026.csv`, `sfdata-throwaway-rate-2026.csv`, `sfdata-time-to-scramble-2026.csv`, `sfdata-expected-completion-pct-2026.csv`, `sfdata-quick-pressure-rate-2026.csv`) -> **Week 10 Truth: `MIN`**
  2. `Kirk Cousins` (`K.Cousins`) tagged `LV` (5 rows: `sfdata-qb-ryoe-2026.csv`, `sfdata-throwaway-rate-2026.csv`, `sfdata-time-to-scramble-2026.csv`, `sfdata-expected-completion-pct-2026.csv`, `sfdata-quick-pressure-rate-2026.csv`) -> **Week 10 Truth: `MIN`**
  3. `Jacoby Brissett` (`J.Brissett`) tagged `ARI` (5 rows: `sfdata-qb-ryoe-2026.csv`, `sfdata-throwaway-rate-2026.csv`, `sfdata-time-to-scramble-2026.csv`, `sfdata-expected-completion-pct-2026.csv`, `sfdata-quick-pressure-rate-2026.csv`) -> **Week 10 Truth: `BAL`** (Garrett standing ruling)
  4. `J.J. McCarthy` (`J.McCarthy`) tagged `MIN` (1 row: `sfdata-qb-ryoe-2026.csv`) -> **Week 10 Truth: `NYG`**
- **Standing Direct Roster Rulings (Verified across Stage-0 Config & Bridge):**
  - `Greg Dortch`: **`BUF`** (never ARI)
  - `Kendrick Bourne`: **`ARI`**
- **Adjudicated Cross-File Conventions & Non-Claims:**
  - `Josh Downs`: `statyx`=`KC`, gridiron=`IND` (33 rec / 354 yds pre-Nov 10 trade) -> both earned-stat accurate; **Week 10 active = `KC`**.
  - `Kenneth Walker III` = `KC`; `Tyler Allgeier` = `ARI`; `Keenan Allen` = `SF`.
  - `sfdata-qb-ryoe-2026.csv` row `#20 J. Daniels, TB` carried as source-table anomaly (`WAS` #1 = Jayden Daniels).
  - `"OUT"` in `bills-jets-matchup-out-2026.csv` / `pff-burden-top-wr-grade-out-2026.csv`, `LaPorta OUT` historical split in `magic-jameson-williams-laporta-splits-2026.csv`, and blank cells in `pff-pressures-since-2020-2026.csv` are cleared structural non-claims (0 injury contradictions).
```
