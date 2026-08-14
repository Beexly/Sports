# LAGUNA OVERNIGHT AUDIT — 2026-08-14

**Read this first. This is the overnight brief.**
**Repo:** https://github.com/Beexly/Sports (`main` @ `9a36e11` as of 2026-08-10)
**Local clone (if present):** `C:\Users\Garrett\Documents\Claude\Projects\AI Sports`
**Human is asleep. Unemployed. Zero extra spend. Default model stays free.**

You are Laguna (`nous/poolside/laguna-s-2.1:free`). You are not Claude. You are not allowed to burn Claude Max or SuperGrok unless a probe proves a free path is broken AND the task is blocked.

---

## 0. Mission (one sentence)

Stand up the **shared intelligence spine** (Hermes routing + honest repo audit artifacts) so personal work and Sports OS ride the same cheap stack tomorrow — without flipping live picks, inventing PROVEN, or installing the handbook’s 98-agent toy list.

**Done means:** files on disk, probes logged, default still Laguna, morning briefing written, no secrets in git.

---

## 1. What this repo actually is

Not a blank Sports Intelligence OS handbook. It is a real monorepo:

| Fact | Evidence |
|---|---|
| Public GitHub | `Beexly/Sports`, 1,412+ commits, **491 branches** (do not create another) |
| Product | Galaxy Sports Edge — picks platform, calibration-first |
| Live site intent | `https://www.galaxysportsedge.com` (www, never apex) |
| Current mode | **Internal calibration only.** No auto-publish. No auto-send. No automated betting |
| Latest main | Shadow prediction engine, persistent, **shadow-only** + ops schedule (`9a36e11`) |
| Layout | `apps/web` Next App Router, `packages/db` Prisma, `packages/prediction-engine`, `packages/data-ingestion`, `workers` BullMQ, `docs/`, `docker/` |
| Auth | NextAuth v5, Google OAuth |
| Pay | Stripe, founding rates live, grandfathering required |
| Data | The Odds API + nflverse etc. **No fake data** |
| AI in product | Claude API is **content generation only — not source of truth** |
| Maps | **OFF.** Do not invent PROVEN while RED |
| Trust language | Risk footer is allowlisted on purpose. Do not reword “guarantee” out of the denial sentence |

**Non-negotiables (from `CLAUDE.md`):**
1. No fake data
2. No fabricated stats
3. No frontend-only paywalls
4. No secrets in code
5. No stale data
6. Tests required
7. TypeScript strict — no new `any`

Scraping is **rights-gated**, not banned. `checkClearance()` before any extract. No CAPTCHA/paywall/proxy evasion. `scores24.live` = permission_required. `siriusxm-activator` = excluded.

---

## 2. What the DeepSeek file actually is

`C:\Users\Garrett\Downloads\deepseek_text_20260811_f084be.txt`
Title: **SPORTS INTELLIGENCE OS – ULTIMATE HANDBOOK (Complete Session Synthesis)**
895 lines / ~49KB.

It is a **reference architecture**, not a build order. Sports + personal optimization share one spine. Map layers. Do not install named toys.

Sibling dumps (same treatment): other `deepseek_text_*.txt` / `deepseek_rego_*.txt` in Downloads.

Full layer map: Hermes skill `grounded-agent-work` → `references/sports-os-hermes-spine.md`.

| Handbook role | Fake/unusable name | Run on this machine |
|---|---|---|
| PRIMARY | Muse Glimmer 30B | `nous/poolside/laguna-s-2.1:free` **DEFAULT** |
| FAST | Qwen2.5-Coder-7B | Groq `llama-3.3-70b-versatile` if key present, else `stepfun/step-3.7-flash:free` |
| LONG | “DeepSeek V4 Pro” | `deepseek/deepseek-chat` if key present |
| REASON | GLM-5.2 (not free) | `deepseek/deepseek-reasoner` else `tencent/hy3:free` |
| AGENTIC | Ornith 397B | Laguna |
| NUCLEAR | Claude Pro Max | Official `claude` CLI only. Hermes `--provider anthropic` **bills extra** |
| LOCAL | — | `ollama/qwen3-coder:30b` (32GB RAM, no GPU) |

Groq + Cerebras = **custom providers**. They will **not** appear in `hermes auth list`. Expected.

Fallback if primary errors: Laguna → hy3/step free → groq → cerebras → deepseek → xai-oauth grok. **Stop. No Gemini. No Anthropic.**

Never default Gemini. Never `gemini-3.6-flash` (freezes sessions). Leave commented Google keys commented.

---

## 3. Hard environment facts (do not “fix”)

- Live Hermes home: `C:\Users\Garrett\AppData\Local\hermes\`
- Live config: `C:\Users\Garrett\AppData\Local\hermes\config.yaml`
- **Never** write `~/.hermes/config.yml`
- `state.db` journal_mode=DELETE is **intentional** (bundled SQLite WAL bug)
- Typing into the Windows Terminal tab that hosts the live Hermes chat **injects into the conversation**. Second PowerShell tab only.
- Photon SMS outbound is **blocked** on the shared/free line until that number texts the assigned line or the account upgrades. Cron `deliver=local` only.
- Nous OAuth expires ~weekly.
- Claude Max ≠ Hermes Anthropic.

---

## 4. Repo audit — what is already strong

Do **not** rebuild these. Read them. Use them.

| Area | Where | Status |
|---|---|---|
| Operator law | `CLAUDE.md`, `docs/ops/OPERATOR.md` | Human-only actions listed |
| Calibration honesty | `docs/ops/CALIBRATION_PIPELINE.md`, live-calibration-p | SPREAD/TOTAL confidence ≠ fair p |
| Shadow vs live | `.github/workflows` weekly comparison | Always write the report — no cherry-pick |
| Trust gate | `scripts/guardrails/trust-gate.mjs` | Required risk footer is allowlisted |
| API v1 | `docs/api/API_V1_*` | Shadow/proposal only. Boundary guard blocks live routes |
| FABLE/NFL | `docs/fable/`, `apps/web/lib/fable/` | Evidence layer |
| Intelligence core (Jun) | `docs/INTELLIGENCE_CORE_AUDIT.md` | Code-ready, **not live-ready** |
| Pricing ladder | `apps/web/lib/pricing/pricing-phases.ts` | FOUNDING → PROVEN → ESTABLISHED → AUTHORITY |
| Public flags | README | `PUBLIC_PICKS_ENABLED` etc. default **false** |
| Orbit | `docs/ops/ORBIT_UNLOCK.md`, `ORBIT_MAP.md` | Founder clicks, not agent clicks |

**Security note (Aug 12 local audit, re-verify before acting):**
- Clone path: `C:\Users\Garrett\Documents\Claude\Projects\AI Sports`
- After `npm audit fix --force`: 0 critical, **3 high remaining** in ESLint/Next toolchain — do **not** `--force` again
- Stale CI transcripts lie. Re-run `npm audit --omit=dev --package-lock-only` on the **current** lockfile
- Clean `apps/web/tsconfig.tsbuildinfo` and `_overnight_quarantine` before blaming parse errors

---

## 5. Repo audit — real risks (do not ignore)

1. **491 branches.** Do not add a 492nd unless you must. Prefer a single overnight branch `docs/laguna-overnight-2026-08-14` if you commit at all.
2. **README CI badge still points at `baxley-garrett/sports-intelligence-os`.** This repo is `Beexly/Sports`. Do not “fix” the badge unless you verify the workflow exists here.
3. **Shadow engine is the newest work.** Do not promote it to live. Do not invent PROVEN.
4. **`ANTHROPIC_API_KEY` in product env** is for content drafts. Setting it can also make `claude -p` bill API. Do not put dummy keys in the shell that launches Claude Code.
5. **GitHub Actions minutes were already exhausted once.** Do not add a new per-push workflow. Weekly is the existing pattern.
6. **Docs sprawl** (`EXECUTION_LEDGER.md` is 160KB). Do not append novels. Write this audit + a short morning note.
7. **Unrelated unstaged files** may exist in the working tree. Do not commit them.

---

## 6. Overnight work — ordered. Stop if default chat breaks.

Work from a **second PowerShell tab**.

### A. Hermes spine (personal + sports)

Plan already drafted:
`C:\Users\Garrett\AppData\Local\hermes\skills\software-development\plan\references\2026-08-14_043000-shared-intelligence-spine.md`

Execute that plan’s Tasks 1–15 and 18–21 (backup config, inventory key **names** only, lock Laguna default, aliases, Groq/Cerebras/DeepSeek if PRESENT, fallback, compression, probes, OPERATING-MANUAL, morning briefing).

Skip installing LiteLLM / ruflo / n8n / Chatwoot / CyberStrike.

### B. Write / update this audit’s morning addendum

Create (do not overwrite this file’s mission):
`docs/ops/LAGUNA_MORNING_2026-08-15.md` in the Sports clone

Must include:
- `hermes config get model` (expect nous / laguna-s-2.1:free)
- fallback list (no anthropic, no gemini)
- probe table PASS/FAIL (redact errors)
- key NAMES present/commented/missing
- one paragraph: what Sports work can use `/model long` vs `/model reason` tomorrow

### C. Repo honesty checks (read-only unless a 1-line doc fix is obviously true)

From the clone:

```powershell
cd "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"
git status -sb
git rev-parse --abbrev-ref HEAD
git log -1 --oneline
npm audit --omit=dev --package-lock-only
```

If clone missing: `gh repo clone Beexly/Sports` into a **temp** dir under `%LOCALAPPDATA%\hermes\cache\sports-clone` — do not rearrange Documents.

Do **not** run full `npm test` / `npm run build` unless you have >1 hour left and node_modules already installed. Prefer `node scripts/guardrails/trust-gate.mjs` if the tree is already installed.

### D. Optional commit (only this audit + morning addendum)

```powershell
git checkout -b docs/laguna-overnight-2026-08-14
git add docs/ops/LAGUNA_OVERNIGHT_AUDIT_2026-08-14.md docs/ops/LAGUNA_MORNING_2026-08-15.md
git status
git commit -m "docs(ops): Laguna overnight audit + morning addendum (2026-08-14)"
```

Do not push unless `git status` is clean of unrelated files and the human’s remote auth already works. If push fails, leave the branch local. Report the path.

### E. Do not

- Flip `PUBLIC_PICKS_ENABLED`, `PERFORMANCE_STATS_ENABLED`, `canPublishProjections`, `priced: true`
- Invent PROVEN / ESTABLISHED
- Turn maps on
- Merge 491 branches
- Call Stripe live
- Scrape permission_required sources
- Put API keys in markdown
- Type into the live Hermes TUI tab

---

## 7. How sports work uses the spine tomorrow

| Sports task | Alias |
|---|---|
| Read this audit, write docs, small code | default / `free` |
| Quick lineup / injury headline | `fast` |
| Prediction-engine TypeScript | `code` |
| Calibration math, Brier/ECE, +EV | `reason` |
| Handbook + ledger + long PR diffs | `long` |
| Live X / last paid escalation | `grok` |
| Irreversible billing/legal/trust-copy | `claude` CLI |
| Offline | `local` |

Personal tasks use the **same** aliases (job search = `reason`/`long`, email = `fast`, life-or-money = `claude` CLI).

---

## 8. Files Laguna may create

| Path | Why |
|---|---|
| `docs/ops/LAGUNA_OVERNIGHT_AUDIT_2026-08-14.md` | this file, in the Sports repo |
| `docs/ops/LAGUNA_MORNING_2026-08-15.md` | results |
| `%LOCALAPPDATA%\hermes\plans\2026-08-15_morning-briefing.md` | Hermes-side results |
| `%LOCALAPPDATA%\hermes\plans\OPERATING-MANUAL.md` | human one-pager |
| `%LOCALAPPDATA%\hermes\plans\config.yaml.bak-2026-08-14` | rollback |

---

## 9. Pointers (read before coding)

- This file
- `CLAUDE.md`
- `docs/ops/OPERATOR.md`
- `docs/INTELLIGENCE_CORE_AUDIT.md` (old; do not treat as current live state)
- Hermes plan: `...\plan\references\2026-08-14_043000-shared-intelligence-spine.md`
- Hermes spine map: skill `grounded-agent-work` / `references/sports-os-hermes-spine.md`
- Handbook: `C:\Users\Garrett\Downloads\deepseek_text_20260811_f084be.txt`

---

## 10. Definition of done

- [ ] Default Hermes model still Laguna free
- [ ] Key inventory logged as NAMES only
- [ ] PRESENT providers probed; FAIL logged honestly
- [ ] OPERATING-MANUAL.md exists
- [ ] This audit exists in the Sports tree **or** the mismatch is reported
- [ ] Morning addendum exists
- [ ] No secrets committed
- [ ] No live flags flipped
- [ ] Human can start tomorrow with `/model fast|reason|long` and `claude -p` for nuclear

If a claimed file is absent, do the real safe work on disk and report the gap. Do not invent a green audit.
