# Domain Docs

How the engineering skills consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root (pure domain vocabulary — free of file paths or historical record numbers).
- **`docs/adr/`**: read ADRs (`docs/adr/README.md`, `0001` through `0012+`) that touch the area you are about to work in.
- **`CODING_STANDARDS.md`** at the repo root before reviewing or authoring TypeScript, Python, R, or Swift modules.
- **On-demand Google Cloud catalog (`google/skills`)**: fetch specific Google Cloud skills via `finding-google-skills` only when a task requires cloud-specific depth, keeping default session context light.

## File structure

Single-context repo root layout:

```
/
├── GLOSSARY.md
├── CODING_STANDARDS.md
├── docs/
│   ├── adr/
│   │   ├── README.md
│   │   └── 0001..0012-*.md
│   └── agents/
│       ├── issue-tracker.md
│       ├── triage-labels.md
│       └── domain.md
└── src/gse_engine/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, refactor proposal, hypothesis, or test name), use the canonical term defined in `GLOSSARY.md`. Never drift to `_Avoid_` synonyms or retired legacy metrics.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0008 (vacated-volume conservation), but worth reopening because..._
