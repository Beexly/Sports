> **UPDATE 2026-06-30:** Superseded — the PR was opened and MERGED into `main` as PR #57 (commit `6084550c`); no re-push is pending. The prod DB is LIVE and `/api/performance` returns real data (397 settled picks). The "ready to open / re-push before a complete PR / agent did not push" framing below is historical.

# GSE — PR Open Prep (ready-to-use package)

Everything needed to open the PR in one action — **without** this agent pushing,
deploying, or merging. Owner performs the gated actions.

## Branches
- **Head:** `claude/gse-no-claim-waitlist`
- **Base:** `main` (default)
- Local HEAD: **13 commits ahead of `origin/main`**, tree clean, fully GREEN
  (typecheck 0, lint 0, waitlist 49/49, guardrails 6/6).

## ⚠️ Prerequisite: re-push before a COMPLETE PR
The remote branch is **behind local by 9 commits**. `origin/claude/gse-no-claim-waitlist`
currently holds only the **4 pushed** PR2 commits (`3ba747bb`, `97c6a18f`, `34521573`,
`c6dd911f`). The **9 hardening / PR3 / content commits are LOCAL-ONLY** (not pushed):
`8662cad3, d4b8bcf7, 54067f1e, fc6a191e, cf923006, 1ccdc0fd, 3529a4a5, 664f71ef, cee17219`.

So:
- **Opening the PR now** = a PR of the 4-commit waitlist core only (still valid; its
  Vercel preview already reached READY).
- **For the full feature in the PR**, the owner first re-pushes (gated):
  `git push origin claude/gse-no-claim-waitlist` (fast-forward; adds the 9 commits).
  Then the PR auto-updates.

This agent did **not** push (per instruction). The push is an owner-approved Level-2A step.

## Open the PR (owner action — pick one)
- **gh (needs auth):**
  ```
  gh pr create --base main --head claude/gse-no-claim-waitlist \
    --title "feat(gse): local no-claim founding waitlist (no-op analytics, local-file storage)" \
    --body-file docs/gse/pr-open-prep.md
  ```
- **Web (one click):** https://github.com/Beexly/Sports/pull/new/claude/gse-no-claim-waitlist

## PR title
`feat(gse): local no-claim founding waitlist (no-op analytics, local-file storage)`

## PR body (paste-ready)
> Local, no-claim founding-waitlist path plus full hardening. **Preview/CI only — do
> NOT merge to production without owner sign-off** (merge to `main` triggers a prod
> deploy).
>
> **What's in it**
> - `/waitlist` page (server, `noindex`, unlinked) → client form → local `POST
>   /api/waitlist` → local-file fallback store (gitignored `.gse-local/`, per-file write
>   lock).
> - No-op analytics registry (inert until a provider is wired).
> - **No-claim by construction**, CI-enforced: the compliance scanner runs over the copy,
>   50 content drafts, the assembled rendered page, the email drafts, and the research
>   briefs (0 block flags). Backtest truth surfaced unspun: "beats naive = **false**",
>   with a code↔doc drift guard.
> - a11y: aria-invalid/describedby/required, an error-summary (role=alert) with
>   focus-on-error, aria-busy.
> - Anti-bot: off-screen honeypot + submit-timing guard (with edge-case tests).
> - **PR3 durable-store LOGIC** (`waitlist-store-db.ts`) against an injected
>   Prisma-compatible delegate (dedup, P2002 race, file↔DB parity) — **no `schema.prisma`
>   change and no migration applied** (that's owner-gated on this migrate-in-build repo).
> - Docs: architecture, PR3 plan + migration runbook, release-gate, owner-decision,
>   content plan, local-completion-status.
>
> **What it does NOT do**: no Stripe/pricing/sportsbook/affiliate, no published picks, no
> email send, no external analytics vendor, no performance claims, no schema migration.
>
> **Validation**: typecheck 0, lint 0, 49/49 waitlist tests, 6/6 guardrails. The Vercel
> preview built READY (preview, not production).

## Pre-merge checklist
- [x] Automated gates GREEN (typecheck/lint/tests/guardrails/no-claim scan/backtest scan) — see `release-gate-plan.md` §1.
- [x] Vercel preview built READY (preview target, `noindex`, SSO-protected).
- [ ] **Owner: re-push** to include the 9 local commits (gated).
- [ ] **Owner: review** the no-claim copy + the diff.
- [ ] **Owner: decide** whether to keep `/waitlist` `noindex` on merge (recommended yes until launch).
- [ ] **Owner: do NOT merge** unless a production deploy of this code is intended (merge → prod).

## Do-NOT warnings
- Do not **merge to `main`** without owner sign-off — that is a **production deploy**
  (Level 3, not approved). Opening the PR / preview is fine (Level 2A).
- Do not flip `noindex`, enable Stripe/pricing, or apply the PR3 schema/migration as part
  of this PR — each is a separate owner gate.

## Commit summary (13, oldest→newest of the ahead set)
PR2 core (pushed): `3ba747bb` waitlist · `97c6a18f` plans · `34521573` hardening seam ·
`c6dd911f` content scan. Local-only: `8662cad3` page no-claim render · `d4b8bcf7` write
lock · `54067f1e` a11y/email/backtest/docs · `fc6a191e` +10 posts · `cf923006` PR3 store
logic · `1ccdc0fd` timing+a11y+posts · `3529a4a5` research brief · `664f71ef`
a11y-focus/edge-tests/50-posts/arch · `cee17219` docs sync.
