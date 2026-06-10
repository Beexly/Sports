# GSE R&D Repo Scan — Critic Audit (2026-06-10)

**Auditor task:** Read `00-rnd-report.md` + `00-rnd-findings.jsonl`; spot-check claims via live WebFetch/WebSearch; audit for (1) hallucination, (2) safety mis-rating on the implement-now list, (3) relevance inflation, (4) what's missing. Verdict + corrected implement-now shortlist below.

**Spot-checks performed (live, this session):** `alibaba/open-code-review`, `colbymchenry/codegraph` (twice), `santifer/career-ops`, `addyosmani/agent-skills`, `obra/superpowers` (+author search), `Leonxlnx/taste-skill`, `lfnovo/open-notebook`, `VoltAgent/awesome-design-md`, `FoundZiGu/GuJumpgate`, `ultraworkers/claw-code`. Every fetched fact below is grounded in those fetches.

---

## VERDICT: GO-WITH-FIXES

The report is **substantially accurate, well-grounded, and honest.** Every claim I spot-checked held up against the live repo — license, author, mechanism, and the safety red flags (GuJumpgate's ToS-circumvention, claw-code's "no human maintainer" self-declaration, the inflated-star cluster) are all real, not fabricated. The report's core thesis (the value is *patterns to port*, not *dependencies to install*; everything additive + founder-gated; SKIP cluster is genuinely sketchy) is sound and should be acted on.

It does **not** pass clean, for two reasons that require fixing before the "IMPLEMENT NOW" label is trusted:

1. **One real safety/consistency gap:** `codegraph` — the only "tool to install with filesystem + MCP access" on the implement-now list — is a **single-maintainer v0.9.x repo carrying a ~46.2k-star anomaly** that the report flags as a red flag *for other repos* but silently waives here. It belongs at **pilot/study-only-until-proven**, not "implement now."
2. **The "IMPLEMENT NOW" header overpromises.** Of the 8 items under it, **6 are explicitly "read-and-port, no install"** (the report says so itself). Calling them "implement now" muddies the one genuinely safe install-now candidate. The shortlist below separates these cleanly.

No hallucinations found. No relevance inflation severe enough to change a verdict. Fix the two items above and this is a GO.

---

## 1. HALLUCINATION CHECK — PASS (no fabrication found)

Every spot-checked claim is grounded in the actual repo:

| Repo | Report claim | Live verification | Result |
|---|---|---|---|
| alibaba/open-code-review | Apache-2.0, Alibaba, ~5.9k★, Go/TS, line-level review, GH Actions, Anthropic-compatible, DNS-rebinding guard | All confirmed verbatim (Apache-2.0 ©2026 Alibaba, ~5.9k★, Go 72.5%, Host-header allowlist vs DNS-rebinding) | ✅ accurate |
| santifer/career-ops | MIT, named author, `claude -p` batch workers, "never auto-submits" human gate, Playwright | All confirmed ("never submits — you always have the final call") | ✅ accurate |
| addyosmani/agent-skills | MIT, Addy Osmani, 23 skills, Rationalizations-rebuttal + Verification-evidence per SKILL.md | All confirmed ("'Seems right' is never sufficient") | ✅ accurate |
| obra/superpowers | MIT, Jesse Vincent, design→plan→implement→test→review + TDD + skills-that-write-skills | All confirmed; author is a known accountable OSS figure (RT, Perl 5 pumpking, Keyboardio) | ✅ accurate |
| Leonxlnx/taste-skill | MIT, named author, VARIANCE/MOTION/DENSITY dials, GSAP skeletons, anti-scam/no-token disclaimer | All confirmed verbatim incl. the no-token disclaimer | ✅ accurate |
| lfnovo/open-notebook | MIT, self-hosted NotebookLM alt, local data, REST API, podcast, single-maintainer caveat | All confirmed (28.7k★, single maintainer, multi-speaker podcasts) | ✅ accurate |
| VoltAgent/awesome-design-md | MIT, 9-section DESIGN.md schema, reverse-engineered brand sites, ~89k★ "implausible/inflated" | Confirmed (88.9k★, exact 9-section schema, MIT) | ✅ accurate |
| FoundZiGu/GuJumpgate | AVOID: disposable-email + PayPal Plus activation + SMS-bypass for OpenAI accounts | Confirmed verbatim (temp email, PayPal pool, SMS bypass, proxy rotation) | ✅ accurate |
| ultraworkers/claw-code | self-declares "no human maintainer / museum exhibit," disclaims Anthropic, ~194k★ on obscure 2026 repo | Confirmed verbatim ("agent-managed exhibit… no human intervention"; not affiliated with Anthropic) | ✅ accurate |

The report is also commendably honest where it corrected upstream marketing (MemPalace 96.6%→84.2%; ai-engineering-from-scratch "30k looked inflated, ~7.5k actual"). That is the opposite of hallucination.

---

## 2. SAFETY AUDIT OF THE IMPLEMENT-NOW LIST — ONE FIX REQUIRED

**Principle applied (strict):** an item is "implement-now-safe" only if it is *either* (a) a reputable-org/named-accountable-author tool you'd actually install, *or* (b) markdown/patterns you only **read**, where install-time supply-chain risk is moot. Inflated stars matter most exactly when you'd run/install the thing.

### ✅ Genuinely implement-now-safe (install-grade): 1 of 2 "tools to pilot"
- **alibaba/open-code-review** — **KEEP as implement-now (pilot).** Apache-2.0, real Alibaba org, modest/plausible ~5.9k★, ships its own DNS-rebinding guard, advisory-only in CI. This is the profile of a safe-to-pilot tool. The report's gates (non-deploy clone first, secured-env keys, approved endpoint, never auto-merge) are correct. **Note the one real residual:** it ships proprietary engine diffs to an LLM endpoint — the report flags this; keep it pointed only at an approved Anthropic-compatible endpoint and confirm the outbound path before any pilot on engine code.

### ⚠️ Mis-rated — DEMOTE: `colbymchenry/codegraph`
- The report lists it under "IMPLEMENT NOW → tools to pilot" and itself notes "young v0.x single-maintainer with FS/MCP access." Live check: **MIT, named author (Colby McHenry), npm-published, docs site, 3rd-party guides — legitimate, NOT a fraud pattern. But: v0.9.9, single maintainer, AND ~46.2k★/2.8k forks on a 2026 repo** — the same star-anomaly profile the report flags as disqualifying elsewhere. A tool that takes **filesystem + MCP access on a box holding live GSE/Vercel/DB creds** does not meet "implement-now" when it's single-maintainer v0.x.
- **Fix:** move to **PILOT / study-only-until-proven** (FUTURE-BACKLOG, top of queue). The report's own mitigations are right and should be the gate: index a *throwaway/local* checkout only, pin the exact version, diff each release before upgrade, confirm 100% offline, **prove the token/tool-call savings on one real session before promoting.** Do not point it at the canonical or deploy clone until proven. This is a demotion of *label/urgency*, not a "this is dangerous" call — it's legitimate, just not implement-now-grade.

### ✅ Read-and-port pattern libraries (items 3–8): SAFE — but RELABEL
- `santifer/career-ops`, `addyosmani/agent-skills`, `obra/superpowers`, `mattpocock/skills`, `phuryn/pm-skills`, `Leonxlnx/taste-skill` — all **named, accountable authors; all consumed as markdown you read and selectively port, with NO installer run in the live repo** (the report states this explicitly in the note under §2). On that basis they are safe regardless of star count.
- **Important correction to a potential misread:** `obra/superpowers` shows ~223k★ and `addyosmani/agent-skills` ~50k★ and `taste-skill` ~39.8k★ — these are NOT the inflated-fraud pattern. superpowers is the **#1 Claude Code plugin, Anthropic-marketplace-listed, by a highly accountable author (Jesse Vincent)**; its growth is organic and corroborated by independent coverage. High stars + named accountable author + ecosystem endorsement ≠ the anonymous-weeks-old-"no maintainer" cluster on the SKIP list. The report correctly did **not** slap an inflated-star flag on these. Good call; keep it.
- **The only fix here is the header:** these are "mine now (read+port)," not "implement now." If anyone ever flips one from *read* to *installed plugin/hook*, it must first move through the same pilot gate as codegraph (pin a reviewed commit, vendor it, scratch env) — the report says this; make it unmissable.

### Conclusion of safety audit
**No sketchy/unverified repo is being recommended for live install.** The single substantive fix is demoting codegraph from "implement-now" to "pilot-first." The rest is a labeling correction so "implement now" doesn't imply "install these eight things now."

---

## 3. RELEVANCE-INFLATION CHECK — MINOR, NO VERDICT CHANGE

Mostly disciplined. The report already self-penalizes off-domain items (career-ops "off-target domain," pm-skills "generic GTM," openmed "wrong domain"). Two soft notes:

- **codegraph / graphify / Understand-Anything all rated `high` relevance** for the same job (code-graph over the monorepo). Only ONE will ever be used. Three "high" for one slot slightly overstates aggregate value — but the report *does* say "pick ONE," so this is cosmetic. No change.
- **`diffusionstudio/lottie` and `turbovec`** are rated `medium` but are squarely "only if a future need is confirmed" — closer to low-relevance-conditional. Harmless; they're already in backlog with explicit triggers.

No item rated high-relevance is actually irrelevant. No fix required.

---

## 4. WHAT'S MISSING

- **License-compatibility is per-repo but never summarized.** AGPL/Noncommercial repos are scattered (guizang-ppt AGPL, tolaria AGPL, docuseal AGPLv3, odysseus AGPL, openmed/noop Noncommercial/PolyForm). For a proprietary reveal-less codebase this is the single highest-frequency real constraint. **Add a one-line "do-not-copy-code (copyleft/NC)" roster** so no campaign accidentally ports AGPL HTML/JS into the engine. The report has the data; it just isn't consolidated.
- **No "verify the canonical repo" checklist for the install/pilot candidates.** MemPalace's own impostor/malware-clone warning shows lookalike-repo risk is live in this set. For codegraph and open-code-review specifically, pin the exact org/owner + commit/release hash before any pilot. (The report mentions this for obscura/last30days; generalize it to every pilot.)
- **Outbound-data-path is the real engine risk, under-emphasized as a cross-cutting rule.** open-code-review (diffs→LLM), any code-graph tool with an LLM-semantic step, and headroom (proxy in the data path) all touch proprietary engine code. The report flags each individually; it deserves a single standing rule: *no proprietary engine code leaves to any endpoint except an approved Anthropic-compatible one, confirmed before pilot.*
- **No "decline to recommend / inconclusive" bucket.** Everything got a slot. A short "researched, nothing actionable" line for the pure-SKIP off-domain items (apple/container, ChinaTextbook, noop) would make the signal-to-noise explicit. Minor.

---

## CORRECTED IMPLEMENT-NOW SHORTLIST (the truly safe + relevant subset)

Split by what "implement" actually means, so the label is honest:

### TIER 1 — Install/pilot now (install-grade safe): **1 repo**
1. **alibaba/open-code-review** *(Apache-2.0, Alibaba, ~5.9k★)* — advisory line-level CI reviewer alongside existing gates. Pilot on the **non-deploy canonical clone**, secured-env keys, **approved Anthropic-compatible endpoint only**, never an auto-merger, confirm the outbound path is acceptable for proprietary engine diffs first.

### TIER 2 — Mine now (read + port markdown; **zero install in the live repo**): **6 repos**
2. **santifer/career-ops** *(MIT)* — modes/_shared skill layout, orchestrator↔stateless-worker batch design, recommend-never-execute gate, single-source-of-truth tracker, A–F rubric model.
3. **addyosmani/agent-skills** *(MIT, Addy Osmani)* — Rationalizations-rebuttal + Verification-evidence SKILL.md structure; spec/security/review skills.
4. **obra/superpowers** *(MIT, Jesse Vincent — accountable, Anthropic-marketplace #1 plugin)* — planning/systematic-debugging/code-review skill definitions; keep destructive/auto-commit OFF.
5. **mattpocock/skills** *(MIT, Matt Pocock)* — `diagnose`, `grill-with-docs`, `git-guardrails`, `handoff`.
6. **phuryn/pm-skills** *(MIT)* — pricing-strategy / north-star / cohort / A-B / intended-vs-implemented; adapt content only.
7. **Leonxlnx/taste-skill** *(MIT)* — VARIANCE/MOTION/DENSITY dial concept + GSAP skeletons into the frontend-design tokens; GSE brand guardrails stay authoritative.

> Tier-2 rule (unmissable): **read the SKILL.md, port the pattern — do not run any installer/hook in canonical or deploy clones.** If a Tier-2 item is ever promoted to an *installed* plugin, it first goes through the Tier-3 pilot gate.

### TIER 3 — Demoted from implement-now → pilot-first (top of backlog): **1 repo**
8. **colbymchenry/codegraph** *(MIT, named author, local-first, no API key)* — legitimate and high-value, but **single-maintainer v0.9.x with FS+MCP access and an anomalous star count**. Pilot on a **throwaway/local index only**, pin the exact version, diff each release, confirm fully offline, and **prove the savings on one real session before promoting** to the standard toolchain. Do not point at canonical/deploy clones until proven. (Pick codegraph **OR** graphify **OR** Understand-Anything — never all three.)

**Everything else stays in FUTURE-BACKLOG or SKIP/CAUTION exactly as the report has it** — those placements are sound. The SKIP cluster (GuJumpgate AVOID; claw-code / caveman / odysseus / ECC / MemPalace; Agent-Reach / CodexPlusPlus / EvoLink relay; off-domain MoneyPrinter / ppt-master / ChinaTextbook / tolaria / apple-container / noop) is correctly reasoned and verified — **do not promote any of them.**

---

*Audit method: read both deliverables in full; live-fetched 10 repos (key facts above grounded in those fetches); applied a strict "anonymous + no-license/tests + install-grade = not implement-now" bar. Verdict: **GO-WITH-FIXES** — apply the two fixes (demote codegraph to pilot-first; relabel the 6 read-and-port libraries as "mine now" not "implement now") and the report is GO.*
