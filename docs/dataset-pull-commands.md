# Dataset pull commands (K4)

Datasets are NEVER downloaded into the repo. Pull them to a directory
OUTSIDE version control (e.g. `~/data/cv/`), then point the ingest
functions at the local COCO exports.

License sidecar: `DATASET_LICENSES.json` (repo root of the package).
The ingest functions refuse to run if a dataset's recorded license is
missing or mismatched — verify before pulling.

## 1. Roboflow NFL helmet competition set (Public Domain)

- 9,947 images · 193,736 helmet boxes · classes: Helmet,
  Helmet-Blurred, Helmet-Difficult, Helmet-Partial, Helmet-Sideline
- Page-verified license: **Public Domain** (do NOT file as CC BY 4.0)

```bash
mkdir -p ~/data/cv/roboflow-helmet && cd ~/data/cv/roboflow-helmet
# Option A — Roboflow Universe page (COCO export):
#   https://universe.roboflow.com → NFL helmet competition dataset
#   → Download → COCO format → unzip here.
# Option B — HF mirror (uploader claim, prefer the Roboflow original):
#   keremberke/nfl-object-detection (License: Public Domain per uploader)
```

BibTeX (from the dataset page, author "home", 2022) — record in the
training-run notes, not in code.

## 2. the-playmakers / wr-finder (CC BY 4.0 — attribution required)

- 443 images · 8 position classes · mAP@50 90.2%
- License: **CC BY 4.0** — every training run and any derived artifact
  must carry: "WR Finder dataset by ruidazeng (Roboflow Universe,
  cs-1430/wr-finder), CC BY 4.0"
- The GitHub REPO (ruidazeng/the-playmakers) is RESEARCH-ONLY
  (dead MIT badge — no LICENSE file ever existed). Do not copy its code.

```bash
mkdir -p ~/data/cv/wr-finder && cd ~/data/cv/wr-finder
# https://universe.roboflow.com/cs-1430/wr-finder → Download → COCO → unzip here.
```

## 3. GSE hand-labeled 57-frame eval (internal)

Internal only — never leaves the private corpus. License key
`gse-hand-labeled-57: internal` in the sidecar.

## Ingest entry points

```ts
import { ingestRoboflowHelmet } from "./cv-dataset-ingest.js";
// annotations/categories parsed from the local COCO export:
const { positives, excludedSideline, hardCount } = ingestRoboflowHelmet(
  cocoAnnotations, cocoCategories, licenses,
);
// positives → v2 training mix; excludedSideline must stay empty of players.
```
