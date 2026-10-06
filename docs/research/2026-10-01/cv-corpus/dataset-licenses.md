# CV Corpus 2026-10-01 — Dataset License Sidecar

Authoritative license record for every external dataset referenced by the detector-v2 work.
Rule: the eval harness MUST fail if a training dataset lacks an entry here (see
`detector-v2-harness.test.ts` license-gate test, spec in deep-dive-the-playmakers.md).

| Dataset | Source | License | Verdict | Evidence |
|---|---|---|---|---|
| cs-1430/wr-finder (v3) | https://universe.roboflow.com/cs-1430/wr-finder | CC BY 4.0 | USABLE (attribution required) | Page text: "Task: Object Detection License: CC BY 4.0"; 443 images, 8 classes |
| home-mxzv1/nfl-competition | https://universe.roboflow.com/home-mxzv1/nfl-competition | Public Domain | USABLE | Page text: "Task: Object Detection License: Public Domain"; 9,947 images, 5 helmet classes |
| NFL 1st and Future – Impact Detection (videos + impact labels + tracking) | https://www.kaggle.com/competitions/nfl-impact-detection | UNVERIFIED (Rules page login-gated) | RESEARCH-ONLY until verified | Rules/Data subpages JS-gated; terms text not obtained 2026-10-01 |
| GSE 57-frame hand-labeled set | internal | internal | USABLE | owned |
| ruidazeng/the-playmakers repo code/notebooks/PDFs | https://github.com/ruidazeng/the-playmakers | NONE (badge links to missing LICENSE; API: null) | RESEARCH-ONLY (method intel) | Commit history: no LICENSE ever added; README badge is a dead link |

**Attribution strings (copy verbatim into experiment docs):**
- wr-finder: BibTeX from the Roboflow page (`@misc` wr-finder, CS 1430, CC BY 4.0).
- nfl-competition: `@misc{ nfl-competition_dataset, title = { NFL-competition Dataset }, type = { Open Source Dataset }, author = { home }, howpublished = { \url{ https://universe.roboflow.com/home-mxzv1/nfl-competition } }, journal = { Roboflow Universe }, publisher = { Roboflow }, year = { 2022 }, month = { sep }, note = { visited on 2026-10-01 }, }`
