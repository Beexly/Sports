# IG-DdqpiDaGdUF — RelateAnything: relation graphs over detected regions

- Source: https://www.instagram.com/p/DdqpiDaGdUF/ (@simplifyinai, posted 2026-09-24; 1,930 likes, 348 comments at read time)
- Fetched: 2026-09-27 ~9:31 PM CDT via instagram-cli; raw JSON in parent-agent workspace (`ig-post-DdqpiDaGdUF.json`).

## What it is

RelateAnything is a free, open-source model that takes an image or video **plus a set of regions** (boxes or masks produced by any detector) and outputs how every object relates to each other — a scene/relation graph, not just detections. It ships a zero-install browser demo (maelic.github.io/RelateAnythingProject/demo): upload a photo/video or use a webcam; inference runs client-side.

## How it works (method summary)

1. Region proposal comes from the user's own detector (boxes or masks) — the relation model is detector-agnostic.
2. The model scores pairwise (subject, relation, object) triples over the regions in a frame/sequence.
3. Output is a directed relation graph: nodes = tracked entities, edges = typed relations (e.g. "A is blocking B", "A is near B").
4. The demo suggests temporal extension to video — relations evolve across frames, which is where the sports value lives.

## Exact GSE fit (verified repo paths)

- **Primary consumer: movement/trajectory lane.** `gse-ml-service/app/models/movement.py` (on branch `origin/hermes/wip-e1-movement-2026-09-26`, "feat(e1-movement): player-movement trajectory model + /predict/movement endpoint") predicts per-player displacement from causal NGS-frame history. Relation graphs are a natural upstream feature: rusher–tackle pairs, WR–CB matchup edges, pocket-structure graphs are currently implicit in x/y coordinates; explicit relation edges are a richer input to the trajectory head.
- **Feature-store path:** `packages/feature-store` exists on origin/main as a bucket for exactly this kind of derived feature — relation edges per play segment would slot in as a registered feature set with lineage.
- **Total-signal doctrine:** the standing rule is TRIGGER → AFFECTED → DIRECTION → MAGNITUDE → LOG with every rule backtested. Pass-rush relation triples (e.g. edge rusher unblocked vs double-teamed) are directly the "pass rush" and "OL injuries" adjustment triggers in the total-signal spec (`docs/research/2026-09-27/total-signal-wiring-spec.md`).
- **Does NOT fit:** the DFS optimizer stack (`apps/web/lib/fantasy/dfs-exact.ts`, `dfs-correlation.ts`, etc.) consumes numeric projections/ownership, not video relations — no direct line there.

## Concrete application sketch for GSE

Per play, run detection (YOLO-class) on license-clean footage → RelateAnything relation pass → extract per-snap relation triples such as `(DE_7, is_blocked_by, RT_12)` or `(WR_2, is_pressed_by, CB_21)` → write edge features into the feature store with snap/play lineage → consume as structured context features in `movement.py`'s trajectory head and in the pass-rush component of the total-signal adjustment layer. Calibration gate applies: no relation feature ships into consensus until its predictive lift is backtested (per the standing rule, magnitudes are calibration tasks).

## Gaps / limits

- Browser demo ≠ production pipeline: no calibration, no throughput guarantees, unknown accuracy on NFL broadcast angles.
- Relations are only as good as the detector feeding it; identity switches in tracking are the classic failure mode.
- **Licensing hard boundary:** E3 commercial training requires authorized/license-clean footage — running RelateAnything over NFL broadcast rips is research-grade at best; training on it is forbidden by the standing re-implementation/license rules.
- The IG post is promo-grade ("Comment AI to get the link"); the model card, license, and benchmarks must be pulled from the actual repo before any build decision.
