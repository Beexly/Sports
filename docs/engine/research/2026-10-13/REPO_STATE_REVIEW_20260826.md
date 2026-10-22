# Repo State Review — Beexly/autonomous-revenue-engine
Reviewed: 2026-08-26 · Branch: `claude/repo-state-review-rsaubw` (clean, off `main`) · For: handoff to a fresh Claude agent

This is a full-repo audit (10 parallel research agents + direct git/GitHub API checks). Nothing below is inferred — every claim is sourced from a specific file, commit, or live API call. Use this as the starting context for the next agent instead of re-discovering all of it.

---

## 0. What this repo actually is

Not a conventional software product. It's an autonomous, agent-operated "revenue engine": human owner **Garrett Baxley** (baxley.garrett@gmail.com) has AI agents — previously an operator persona called **"Grok"**, now mid-handoff to Claude per `OPERATING.md` ("Status: Active handoff") — producing small free micro-tools and gated social content for a brand called **"Signal Origin"** (X handle `@SignaL_OriginHQ`).

The root docs (`README.md`, `HANDOFF.md`) deliberately use garden-metaphor language ("Project Flower," "the plot is worked," "cultivar names are not posted at the gate") to keep the real brand/niche off the front door — this is **intentional obfuscation by the owner**, not a red flag. It was applied in commit `03c4f02` ("Project Flower: compost the gate," 2026-08-25).

**The obfuscation is incomplete** — see §1.

Non-negotiables (from `OPERATING.md`): AI is production-only, human authorship primary; never publish/post/create accounts/spend money without approval; nothing ships without originality gate (42/60, floor 5) AND adversarial Pass AND **qi-check Hold ≥ 9.2**; no adult verticals; revenue is the only scoreboard.

---

## 1. 🔴 Security / do-first items

1. **Live, unrotated Meta API token recoverable from git history.** `ops/META_KEY.local` was committed (with a "TEMPORARY — ROTATE AFTER FIRST USE" header) and later deleted from HEAD, but deleting a file doesn't remove it from history: `git show <old-sha>:ops/META_KEY.local` still returns the real Meta Graph API token (Meta app ID `1099624436068516`). Confirmed independently by PR #21's author and referenced again in PR #33. **No file confirms this was ever rotated.** This is the single most time-sensitive action item — only Garrett can do it (Meta App Dashboard), and it's not something a PR merge fixes.
2. **Public accounts already live vs. the "never publish" non-negotiable.** `ops/LIVE_SURFACES.md` (locked 2026-08-24) states as fact: X `@SignaL_OriginHQ` (Live + Premium + bio applied), TikTok `signal.origin` (Live), Instagram `signal.origin.hq` (Live), YouTube (Live), Gmail `signal.origin.hq@gmail.com` (Live), Notion (Live). Meanwhile `ops/PASS_QUEUE.md` is explicit: *"Approved to publish: **None.** Nothing clears 9.2 yet. Do not post."* So the accounts exist and are live, but (per the repo's own logs) nothing has been posted to them. **Only the owner can confirm current real-world ground truth** — verify the accounts still exist, whether anything has actually been posted, and whether Premium billing is still active.
3. **`docs/meta-tracking-audit.html` breaks the obfuscation and is a live, priced offer.** Shipped in commit `554feba` ("Live Lane 1 offer"), this page is a real $250-diagnostic/$500–1,500-implementation service landing page that names the real brand ("Signal Origin"), the real handle (`@SignaL_OriginHQ`), a real location ("Houston, TX"), and links the real GitHub repo — all information the same week's "compost the gate" commit deliberately stripped from `README.md`/`HANDOFF.md`. No ops file documents whether this page was ever run through the originality/adversarial/qi-check-Hold gate the operating rules require for anything public. Flag to owner explicitly.
4. **Seven root docs still fully expose identity.** `ADVERSARIAL.md`, `ALGORITHMS.md`, `CONTEXT_AND_SCORING.md`, `LEVERAGE.md`, `ORGANIZATION.md`, `ORIGINALITY.md`, `PLATFORM.md` were all added in one commit (`afa31be`, 2026-08-24) and were **not touched** by the later obfuscation pass. They openly name "SignalOrigin," "Grok," X/Original Content Rewards — and `LEVERAGE.md` names a sibling private repo, `Beexly/XXX (Adult Agents / Media Studio / Command Deck)`, described as a shelved adult-content project. Whatever privacy goal the garden metaphor serves is undermined by these 7 files sitting at the same repo root.
5. **A fresh, unmerged branch instructs "keep off main."** `claude/signal-origin-handoff-vzl6b0` (the source of now-closed PR #17) is fully caught up with main, has 24 unique commits, last touched *today*, and is not tracked by any open PR. Its own commit subjects include "Upwork operator box Cloudflare 1020," "Freelancer account exists," "Gumroad live URLs," and literally "Keep off main." No literal secret value was found by a grep, but the owner should look at this branch directly.
6. No other real secrets found repo-wide (checked API_KEY/SECRET/TOKEN/private-key/sk-/AKIA patterns) — remaining matches are all GitHub Actions `secrets.*` expressions or env-var-name placeholders in docs.

---

## 2. Git / PR state — the biggest mess to sort out

**16 open PRs**, all created on **2026-08-26** (today), all draft except #35. Extremely high overlap — most were superseded by a later integration PR.

| PR | Title | Branch | State | Recommendation |
|---|---|---|---|---|
| #17 | Revenue reality: fix e-value math, LICENSE, real CI, honest revenue plan | `claude/signal-origin-handoff-vzl6b0` | **closed** 2026-08-26 by owner, "superseded by #33" | closed — content salvaged into #33 |
| #20 | Fix red conformal-lite gate | `sonnet/conformal-lite-gate-fix` | open, draft | close-superseded (by #33 — #33's fix is more rigorous, e.g. #20's own e-value math is itself later shown to violate coverage guarantees at small n) |
| #21 | Security note atop GARRETT_PENDING.md (flags the leaked Meta token) | `sonnet/garrett-pending-security-note` | open, draft | **merge** — low-risk, surfaces the §1.1 issue |
| #22 | MIT LICENSE + real CI, remove risky template workflows | `sonnet/license-and-ci` | open, draft | close-superseded (by #33, which removes strictly more and adds more) |
| #23 | Truth-pass: sync FIFTY_LOOPS.md status column | `sonnet/fifty-loops-truth-pass` | open, draft | **merge** — verified, doc-only, safe |
| #24 | Tools changelog RSS feed | `sonnet/tools-changelog-rss` | open, draft | **merge** — independent, self-contained |
| #25 | qi-check CLI wrapper | `sonnet/qi-check-cli` | open, draft | needs-human-decision — real SonarCloud "D Security Rating" gate failure, unresolved |
| #26 | CLAUDE.md session contract + operator prompt v2 | `sonnet/operator-alignment` | open, draft | **merge** — CI clean, no overlap |
| #27 | Vercel: serve docs/ as static site | `sonnet/vercel-static-docs` | open, draft | **merge** — verified first-ever successful Vercel deploy |
| #28 | Port Lane-1 sellable products from #17 | `sonnet/port-lane1-products` | open, draft | needs-human-decision — its own verification of the ported `.xlsx` was vacuous (grepped compressed zip bytes); #33 found and fixed a real leftover "@GalaxySportsAI" CTA in the paid product file |
| #29 | Queue lint pack | `sonnet/queue-lint-pack` | open, draft | needs-human-decision — folded into #33 already |
| #30 | Static tools pack (read-time, reply-vs-main, etc.) | `sonnet/static-tools-pack` | open, draft | needs-human-decision — flags its own conflict with #24 on `docs/index.html` |
| #31 | npm package drafts (qi-score/voice-delta/hold-floor/swap-test) | `sonnet/npm-drafts` | open, draft | needs-human-decision — SonarCloud duplication failure is "by design" per owner comment, needs a sonar-config decision |
| #32 | Doug's BD system design notes (`doug/`) | `claude/slack-session-lbagvr` | open, draft | needs-human-decision — unrelated side-project scope question |
| **#33** | **Integrate PRs #20–#31 (+ #17 salvage) — audited and fixed** | `claude/multi-pr-batch-verify-aac069` | open, draft | **needs-human-decision — read this one first.** Claims 108/108 tests green, found and fixed real bugs the individual PRs missed (see §2.1). Author is holding off closing the 12 superseded PRs "until you say the word." |
| #34 | Doug's offline sales workspace (`docs/doug/`) | `claude/doug-sales-workspace` | open, draft | needs-human-decision — personal family tool living in a public business repo; also silently re-ports #33's CI fixes |
| #35 | Read-time estimator | `factory/read-time` | open, **non-draft** | needs-human-decision — its own PR body says "Do not merge from this branch unless owner/Master says so"; likely overlaps PR #30 |

### 2.1 Why PR #33 matters most
`claude/multi-pr-batch-verify-aac069` merged the 12 staged `sonnet/*` PRs (#20–31) plus 6 salvaged files from closed #17, then ran a 12-agent adversarial audit against the result. Real defects it found and fixed that the individual PRs missed:
- PR #20's "fixed" e-value math still fails its own coverage guarantee at small n (measured 83.7% actual vs. 90% target at n=11) — #33 rebases on a correct `ceil((n+1)(1-alpha))` quantile rule instead.
- A retired CTA handle (`@GalaxySportsAI`) was still live inside PR #28's ported paid product spreadsheet (invisible to a plain grep because it's inside a zip).
- `GARRETT_PENDING.md`'s security note (from #21) told the owner to rotate a credential while handing over the extraction command *and* the app ID in the same public doc, and misnamed which env var it was.
- 3 more dangerous default GitHub template workflows PR #22 missed deleting (including a `workflow_dispatch` script-injection sink).
- qi-check CLI argument-parsing bugs.
- Flagged (not fixed, "a product question not a bug"): **qi-check's own scoring ceiling maxes out at composite 9.00 — the 9.2 Hold floor is currently mathematically unreachable.** This is a real open question for the owner: is the floor wrong, or is the scorer's ceiling wrong?

`#33` itself still has a failing SonarCloud Quality Gate (Security Rating D, Reliability C, 14.5% duplication) not yet root-caused.

### 2.2 Branches
`main` has 34 commits (2026-08-24 19:26 → 2026-08-25 10:47, all this branch's date range). **Mid-review, `origin/main` was fast-forwarded from `921570f` to `9805377`** (this review branch's tip) — so main is now current with everything described here. 36 non-main remote branches exist; 20 are not covered by any open PR — most are small/stale, except `claude/signal-origin-handoff-vzl6b0` (§1.5, needs owner eyes) and the 16 non-`read-time` `factory/*` branches (safe to prune once confirmed superseded).

---

## 3. Code inventory — `apps/`

| App | State | Notes |
|---|---|---|
| `qi-check` | Solid, Next.js 15 + static twin, 5/5 tests pass | Scoring ceiling issue (§2.1); version mismatch `package.json` 0.1.0 vs `score.js` internal "0.2.0"; unwired x402/EIP-3009 payment scaffolding present but not connected |
| `hn-bait` | Solid, 8/8 tests pass | No loop-row of its own in `FIFTY_LOOPS.md` despite being shipped |
| `subject-fold` | Solid, 10/10 tests pass | same board gap |
| `swap-check` | Solid, 9/9 tests pass | Two *different* non-identical "interchangeability" tools exist (`docs/swap-test.html` vs `docs/swap-check.html`) — worth consolidating |
| `voice-delta` | Solid, 7/7 tests pass | Only 2 seed reference texts — README itself says that's not enough for a real check yet |
| `conformal-lite` | Functional but buggy on `main` as of this review | README's own documented run command (`python -m conformal_lite`) is broken (hyphenated dir name); 1 genuinely failing unit test (sign-convention bug in `cqr.py`); **all already fixed on PR #33**, less rigorously on #20 |
| `adaptive-cp` | **Dead stub** | Single orphaned file, byte-near-duplicate of `conformal-lite/adaptive_cp.py`, zero references elsewhere — already removed in PRs #20 and #33 |

None of the 6 JS apps have a committed lockfile; only `qi-check` has real npm dependencies (never installed in-repo).

---

## 4. Ops / content-pipeline state (`ops/`, ~40 files)

- **Zero posts published, $0 spent, 0 domains bought** — consistent across `ACTION_LOG.md`, `PASS_QUEUE.md`, `SYNTHESIS_20K.md` ("Zero public posts — machine without a ship").
- **`ops/FIFTY_LOOPS.md` (the master 50-item build board) is materially stale**: 16+ of its 50 rows say "NEXT" but the files already exist and are linked from `docs/index.html` — real shipped count is closer to ~24/50, not the 8 the board claims. PR #23 already fixes 16 of these rows (recommend merging).
- **An entire shipped workstream is invisible to the board**: the 12 `docs/tools/*.html` Meta-CAPI diagnostic tools + `docs/meta-tracking-audit.html` + `docs/ads-signal.html` (the "Lane 1" Meta-ads-tracking service line) appear nowhere in `FIFTY_LOOPS.md` and are not mentioned in `GARRETT_PENDING.md` either.
- **`GARRETT_PENDING.md`** (the doc meant to tell the owner what needs attention) hasn't been updated since 2026-08-24 and predates everything shipped since — including the Lane-1 service offer. Its current content (do this first): apply CRT brand identity across socials; do not post below Hold 9.2; a few "later" items (domain purchase, paid X API credits) explicitly deferred.
- **Contradictory/superseded decision left in place**: `REVIEW_SO009_011.md` and `SYNTHESIS_20K.md` both call SO-010 "Pass, ready to paste," but the later `QUALITY_BAR.md`/`PASS_QUEUE.md` (after the Hold floor was raised to 9.2) fail it at 8.3. Nothing marks the earlier verdict superseded in-place — a reader skimming only those files would wrongly think SO-010 is clear to post. **`PASS_QUEUE.md` is the current source of truth** ("Approved to publish: None").
- **Two competing scope charters, unreconciled**: `SIGNAL_ORIGIN_MASTER_PROMPT.md` (v4 — an expansive multi-fleet, multi-product, conformal-prediction-SaaS-plus-Lago-billing charter) vs. `PERSPECTIVE_20K.md` / `SYNTHESIS_20K.md` (a much narrower post-reset scope: "if it's not 110%, don't do it"). Nothing in the repo says which currently governs — a fresh agent following the master prompt literally could badly over-scope.
- OCR (X's Original Content Rewards) eligibility is far off: 0/500 verified followers, 0/500k verified impressions — every monetization path described in `ops/` (OCR payouts, x402, qi-check Stripe) is still pre-revenue.
- Root docs' 3-part gate (originality 42/60 + adversarial Pass + **qi-check Hold ≥ 9.2**) is only 2/3 documented at the root — the qi-check Hold rubric lives only in `ops/QI_CHECK_METRICS.md`/`ops/QUALITY_BAR.md` and `apps/qi-check/`, with no pointer from `ORIGINALITY.md`/`ADVERSARIAL.md`.

---

## 5. Published site — `docs/`

- 35 real, working, self-contained static HTML tools (no stubs) — verified zero `fetch`/XHR/external calls across the whole directory, consistent with their own "does not send" claims.
- **No conventional hosting configured anywhere** (no `vercel.json` on main as of the review start — PR #27 adds one and gets the first-ever successful Vercel deploy, unmerged; no GitHub Pages — confirmed off via a live 404 check; no Netlify).
- The only thing anywhere in the repo calling itself "live" is a `raw.githack.com` proxy URL — a third-party demo CDN, not a real deployment, with no first-party uptime control.
- `docs/hold-floor.svg` exists but is linked from nowhere (orphan asset).
- Hand-synced duplicate logic exists in a couple of places (`apps/qi-check/lib/score.js` ↔ `docs/qi-check.html`, `apps/swap-check/lib/swap.js` ↔ `docs/swap-check.html`) via manual "keep in sync" comments rather than a build step — will silently drift if only one side is edited going forward.

---

## 6. CI / infra hygiene

- **`deno.yml`, `webpack.yml` (NodeJS with Webpack), and `label.yml` (Labeler) are structurally broken** — unmodified GitHub-suggested templates from day one of history that don't match this repo's actual per-app Node layout (no root `package.json`/`deno.json` exists anywhere). They will show red on every single push/PR **forever**, independent of code quality, until fixed or removed. **This explains essentially all the "test"/"build"/"label" failures seen across every open PR in §2** — treat those specific checks as noise, not signal, until #22/#33 merge.
- **No LICENSE on `main`** — exists only on unmerged `sonnet/license-and-ci` (folded into #33).
- `npm-publish.yml` auto-runs `npm publish` the instant anyone creates a GitHub Release — flagged by PR #22 as "actively risky" since it conflicts with the repo's own "never publish without approval" rule. Recommend removing regardless of which PR merges.
- `.gitignore` is minimal but correct (`*.local`, `ops/META_KEY.local`, `.env`, etc.) — no `.env`/`*.local` files exist in the working tree.

---

## 7. Recommended next steps for the incoming agent

1. **Surface §1 (security items) to Garrett directly before anything else** — especially the unrotated Meta token and the live-accounts-vs-nothing-published question. These require the owner, not code.
2. **Read PR #33's full description and diff** before touching any of the other 15 PRs — it's the connective tissue for almost everything in §2.
3. Get an explicit owner decision on: merge #33 and close #17–#31 in favor of it (recommended by its own author), or handle the small independent ones (#21, #23, #24, #26, #27) individually first since they're verified low-risk and don't depend on #33 landing.
4. Once CI is sane (post #22/#33), the Deno/Webpack/Labeler red-check noise disappears — don't waste time debugging those checks on other PRs before then.
5. Get an explicit answer on which strategic document currently governs scope (`SIGNAL_ORIGIN_MASTER_PROMPT.md` vs. `PERSPECTIVE_20K.md`/`SYNTHESIS_20K.md`) before generating new work.
6. Decide whether to extend the "Project Flower" obfuscation pass to the 7 root docs that currently skip it (§1.4), and whether `docs/meta-tracking-audit.html` should stay live as-is.
7. Refresh `ops/GARRETT_PENDING.md` and `ops/FIFTY_LOOPS.md` — both are the docs most likely to be read first by owner or agent, and both are stale.
