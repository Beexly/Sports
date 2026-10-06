# Thworry/reposcope — 283 stars

## 1. Vision
README-first, evidence-backed analysis for understanding a public GitHub repo *before adopting it*. A deterministic mode (runs in a Web Worker on the visitor's device) explains the README, project fit, architecture, setup path, risks, maintenance, alternatives, and supporting evidence. An optional "expert mode" adds a GitHub Copilot briefing with explicit OAuth authorization. Explicitly an evidence inspector, not a verdict — it refuses to certify safety, test coverage, or security.

## 2. The Ask
Needs only a public repo URL for deterministic mode — runs client-side, no account. Expert mode needs the operator to configure a GitHub OAuth App and the user to authorize it. Bilingual (English/简体中文).

## 3. Constraints
- License: MIT.
- Scale: one repo at a time, README-first by design — it will not catch what isn't documented or visible in repo signals. The companion DAYU project (pre-beta) does the adversarial signal-checking.
- Maintenance: ALIVE — pushed 2026-09-11, live site at thworry.github.io/reposcope, active development.

## 4. GSE lens
This is the mirror GSE's repo-intel program needs. Garrett's standing posture is "verify, don't trust" — yet the fleet's external-repo adoption decisions currently rest on ad-hoc dossier work like this very task. Reposcope's deterministic rubric (maintenance signals, license, evidence dossier, alternatives, decision summary) is the checklist the fleet should run on *every* candidate before ADOPT/REBUILD/IGNORE — including the repos in this batch (it would have flagged adrenaline's dead status and yfpy's GPL-3.0 instantly). The "evidence, not verdict" framing also matches the honest-refusal culture GSE is building in its reasoning layer.

## 5. Verdict
REBUILD — internalize the deterministic README-first dossier rubric as a standard gate in GSE's repo-intel workflow (a checklist every intel worker runs, scored and filed). The live site is useful for one-off checks today, but the rubric is the durable asset.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/Thworry/reposcope
- GitDiagram: https://gitdiagram.com/Thworry/reposcope
- Star history: https://star-history.com/#Thworry/reposcope (283 stars)
- github.dev: https://github.dev/Thworry/reposcope
