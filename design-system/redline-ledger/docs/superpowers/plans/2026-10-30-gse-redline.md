# GSE REDLINE LEDGER Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a separate GSE website concept, design system, active cards, Higgsfield asset library, and social pack, then add the finished package to the approved sports repository.

**Architecture:** A standalone Vite/React/TypeScript site uses local token CSS and source-locked Week 8 data. Browser-rendered templates provide deterministic PNG exports; Higgsfield supplies documentary imagery only, while all typography and numbers remain code-rendered. The completed package is copied into a new design-system directory without touching production code.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, Vitest, Testing Library, Playwright, Higgsfield Soul 2.0 / Minimax motion, FFmpeg.

**Spec:** `C:\Users\Garrett\GSE-Overnight\docs\gse-redline-design.md`

## Global Constraints

- GSE only; no non-sports brands or fabricated product data.
- Preserve every existing modified file; no git commits, pushes, package changes, production-route edits, or canonical-token edits in source repos.
- Big Shoulders display + IBM Plex Sans data; tabular lining numerals and right-aligned comparable values everywhere.
- No purple/indigo, gradients, glass, glow, generic three-card sections, or AI-looking imagery.
- All meaningful text/numbers are browser-typeset, never entrusted to image generation.

## Review Focus

- Stale source roster tags: assert Mike Evans always maps to SF and Geno Smith to NYJ in Task 1 data tests.
- Salary arithmetic and changing numeric widths: assert exact $50,000 total and stable 4.5ch card figures in Tasks 1 and 3.
- CFB hold honesty: assert 47 evaluated / 0 published and reason text in Task 3.
- Generated-asset failure or moderation: retain a designed solid/texture fallback and log the failure in Task 2; never claim an asset exists until inspected.
- Narrow social crops and reduced motion: screenshot every export and both motion preferences in Tasks 4 and 6.

---

### Task 1: Tokens, source data, and standalone scaffold

**Files:**
- Create: `GSE-Overnight/site/package.json`, `vite.config.ts`, `tailwind.config.ts`, `src/styles/tokens.css`, `src/data/week8.ts`, `src/data/week8.test.ts`

**Interfaces:**
- Produces: `PICKS`, `LINEUP`, `CFB_HOLD`, `ROSTER_IDENTITIES`, `salaryTotal(rows: LineupRow[]): number`, and GSE CSS tokens consumed by all later tasks.

- [ ] Write failing data tests for exact source rows, $50,000 salary arithmetic, CFB 47/0, and SF/NYJ identity corrections.
- [ ] Run `npm test -- week8` and confirm failure because the data module is absent.
- [ ] Add the standalone scaffold, token CSS, and source-locked data module with no invented values.
- [ ] Run the data tests and confirm all pass.

### Task 2: Higgsfield generation and visual asset review

**Files:**
- Create: `GSE-Overnight/scripts/generate_assets.ps1`, `scripts/tone_assets.py`, `assets/higgsfield/ASSET_LOG.md`, `assets/higgsfield/manifest.json`

**Interfaces:**
- Consumes: palette and art direction from the spec.
- Produces: reviewed `assets/higgsfield/*.webp`, optional `sideline-motion.mp4`, and an asset manifest used by the site/export tasks.

- [ ] Write a manifest validation script that fails because no reviewed assets exist.
- [ ] Generate eight Soul stills and at most one six-second clip within the available credit balance; record exact prompts and job results.
- [ ] Inspect every image; reject synthetic/text/logo/off-palette results, tone accepted assets, and keep solid fallbacks for failures.
- [ ] Run manifest validation and read the toned images to confirm they meet the art direction.

### Task 3: React website and active cards

**Files:**
- Create: `GSE-Overnight/site/src/App.tsx`, `src/components/{PickProof,DfsCard,LineupTable,HeldNotice,FilterTabs,AssetDownload}.tsx`, `src/components/cards.test.tsx`, `src/styles/project.css`

**Interfaces:**
- Consumes: Task 1 data/tokens and Task 2 reviewed asset manifest.
- Produces: responsive website, accessible filters, exact DFS table, valid download links, and reduced-motion-aware interactions.

- [ ] Write failing component tests for filter behavior, pick values, salary table, held reason, roster tags, and download attributes.
- [ ] Run the component tests and confirm the expected missing-component failures.
- [ ] Implement the asymmetric page and components with the mandatory numeric CSS and no banned visual patterns.
- [ ] Run component tests and the full unit suite; confirm all pass.

### Task 4: OG, social, and motion exports

**Files:**
- Create: `GSE-Overnight/site/social.html`, `site/src/social.tsx`, `scripts/export-social.mjs`, `assets/{og,social,cards}/*`

**Interfaces:**
- Consumes: reviewed imagery, source data, and the same tokens/components as the website.
- Produces: 1200×630 OG, 1600×900 X, 1080×1350 portrait, 1080×1080 square, and 1080×1920 MP4 assets with captions.

- [ ] Add failing export-manifest checks for dimensions and missing files.
- [ ] Implement deterministic browser templates and export all static sizes.
- [ ] Render the short motion overlay, combine with accepted motion or a static fallback, and encode H.264 MP4.
- [ ] Validate dimensions with image probes/ffprobe and inspect full-size plus thumbnail contact sheets.

### Task 5: Anti-slop and sports accuracy audit

**Files:**
- Create: `GSE-Overnight/scripts/audit.mjs`, `GSE-Overnight/reviews/AUDIT.md`

**Interfaces:**
- Consumes: all source, data, manifests, and generated assets.

- [ ] Write the audit to fail on forbidden colors/fonts/effects, stale roster tags, missing provenance, salary mismatch, or non-tabular numeric styles.
- [ ] Run the audit and correct every violation at its source.
- [ ] Re-run until clean and record the result plus any source-data caveats in `reviews/AUDIT.md`.

### Task 6: Responsive, accessibility, performance, and build verification

**Files:**
- Create: `GSE-Overnight/scripts/visual-audit.mjs`, `GSE-Overnight/reviews/{desktop,mobile,reduced}.png`, `reviews/VERIFICATION.md`

**Interfaces:**
- Consumes: the completed site and exports.

- [ ] Run the production build and TypeScript checks; fix all errors.
- [ ] Run browser checks at 320/390/768/1024/1440px for overflow, broken images, tap targets, and console errors.
- [ ] Run axe, keyboard, numeric scan, normal-motion and reduced-motion visual checks; fix failures.
- [ ] Record exact commands, results, and any unmeasured items in `reviews/VERIFICATION.md`.

### Task 7: Repository package and final review

**Files:**
- Create: `C:\Users\Garrett\gse-hero-r3f\design-system\redline-ledger\DESIGN.md`, `README.md`, `tokens.css`, `components/`, `assets/`
- Create: `GSE-Overnight/reviews/FINAL_REVIEW.md`

**Interfaces:**
- Consumes: verified standalone deliverables only.

- [ ] Copy only the completed design package into the approved sports repository without touching existing files.
- [ ] Verify source-repo status shows only the new design package plus pre-existing unrelated changes.
- [ ] Dispatch a fresh whole-deliverable reviewer; correct critical/important findings through failing-test-first fixes.
- [ ] Re-run the complete verification suite and write the final asset/code location guide.
