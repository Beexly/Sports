> **UPDATE 2026-06-30:** Superseded — this PR was opened and MERGED as PR #57 into `main` (commit `6084550c`); the prod DB is LIVE and `/api/performance` returns real data (397 settled picks). The "ready to open / do NOT merge / production untouched" framing below is historical.

# GSE — One-Click PR Packet (branch fully pushed; ready to open)

`gh` is not authenticated, so the PR can't be opened programmatically. Everything to
open it in one click is here. **The branch is fully pushed and in sync with origin**, so
the PR will reflect the complete validated feature (no re-push needed).

## Open it (one click)
- **URL:** https://github.com/Beexly/Sports/pull/new/claude/gse-no-claim-waitlist
- **Base:** `main` · **Head:** `claude/gse-no-claim-waitlist` @ `9e7aa3f6` (18 ahead of `main`)
- Open as **Draft** (recommended). **Do NOT merge** (merge to `main` = production deploy).
- (Or authenticate `gh auth login`, then: `gh pr create --draft --base main --head
  claude/gse-no-claim-waitlist --title "feat(gse): local no-claim founding waitlist"
  --body-file docs/gse/pr2-owner-review-packet.md`.)

## PR title
`feat(gse): local no-claim founding waitlist (no-op analytics, local-file storage)`

## PR body (paste-ready)
> Local, no-claim founding-waitlist path + full hardening. **Preview/CI only — do NOT
> merge to production without owner sign-off** (merge to `main` triggers a prod deploy).
>
> **In it:** `/waitlist` (server, `noindex`, unlinked) → client form → local
> `POST /api/waitlist` → local-file fallback store (gitignored `.gse-local/`, per-file
> write lock). No-op analytics. **No-claim CI-enforced** over copy, 50 content drafts, the
> assembled page, email drafts, and research briefs. Backtest truth surfaced unspun
> ("beats naive = **false**") with a code↔doc drift guard. a11y
> (aria-invalid/describedby/required, error-summary with focus + aria-busy). Anti-bot
> (honeypot + submit-timing, with edge tests). **PR3 durable-store LOGIC** against an
> injected delegate (dedup, P2002 race, file↔DB parity) — **no schema change, no migration**.
>
> **Not in it:** no Stripe/pricing/sportsbook/affiliate, no published picks, no email send,
> no external analytics vendor, no performance claims, no schema migration.
>
> **Validation:** typecheck 0, lint 0, 49/49 waitlist tests, 6/6 guardrails. Protected
> Vercel previews only (production untouched).

## Validation proof
- typecheck `0`, lint `0`, `npx vitest run …/gse-waitlist.test.ts …/guardrails.test.ts`
  = **55 passed (49 waitlist + 6 guardrails)** — run this session on the pushed code.

## No-claim proof
- `docs/gse/finish-line-no-claim-scan.md`: CLEAN. CI scanner enforces it every run.

## Backtest truth
- `BACKTEST_TRUTH.beatsNaive === false`; "10,301 samples" / "does not beat naive" on the
  page; drift-guard test. **Preserved.**

## Changed files (high level, vs `main`)
- `apps/web/app/waitlist/*`, `apps/web/app/api/waitlist/*`,
  `apps/web/components/gsn/waitlist-form.tsx`, `apps/web/lib/gse/*` (copy, validation,
  store, store-db, content-drafts), `apps/web/lib/analytics/events.ts`,
  `apps/web/__tests__/gse-waitlist.test.ts`, `scripts/gse-waitlist-list.mjs`, `.gitignore`,
  and `docs/gse/*`. No `schema.prisma` change.

## Owner gates (remain closed)
- Merge to `main` (production), production deploy, Stripe/pricing, sportsbook/affiliate,
  email send, analytics provider, schema migration apply, public marketing.

## Do-NOT-merge warning
- Merging to `main` is a **production deploy** of this code (Level 3) and is **not
  approved**. Opening the draft PR + protected preview is fine. Keep `/waitlist` `noindex`.
