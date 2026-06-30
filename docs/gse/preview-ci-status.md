# GSE Finish-Line — Preview / CI Status

**As of:** 2026-06-29 · Vercel project `sports-web`
(`prj_ZAFYsTbVviP2iiSZdzQcloZVHkBL`, team `team_VvPIx69THeXYfjeG71taqnPo`).

## Push → CI result
The push of `56a069e5` triggered a Vercel deployment for branch
`claude/gse-no-claim-waitlist`:
- **Deployment `dpl_AXZMAtozLUxiaKS8oNhLFuqEv6Rq`** · commit `56a069e5` · **state =
  CANCELED** · **target = null (preview, NOT production)**.
- **Cancellation reason (build log):** *"The Deployment has been canceled as a result of
  running the command defined in the 'Ignored Build Step' setting."* — i.e. the project's
  own skip-build rule decided not to rebuild. The recent tip commits were **docs-only**, so
  this is a **benign, intentional skip**, not a build failure.

## Last READY preview (caveat)
- **Deployment `dpl_6MnfjEU2sbtLuTPxoJmp27V9nwYC`** · commit `c6dd911f` · **state = READY**
  · target = null (preview) · alias
  `sports-web-git-claude-gse-no-claim-50b0e4-pick-pilot-s-projects.vercel.app`.
- ⚠️ **Caveat:** `c6dd911f` is the **PR2-core** commit; it **predates the 13 hardening
  commits** (write-lock, a11y focus/error-summary/aria-busy, honeypot+timing, +35 content
  drafts, PR3 store logic). So this READY preview does **not** reflect the latest hardening.
  No fresh READY preview of the complete branch currently exists (the ignore-build-step
  skipped it).

## Production — untouched
- `dpl_DTeU1agCcdk4icZoFzXAsaVUcG6S` · commit `9e739b38` · ref `main` · **target =
  production** · READY. This is unchanged by anything in this run. **No production deploy
  occurred.**

## Smoke test
- The preview is **Vercel-SSO-protected + `x-robots-tag: noindex`** (a prior fetch of
  `/waitlist` returned `302 → vercel.com/sso-api`). This is the **safe** posture
  (not publicly reachable). **Auth was NOT bypassed.** No public URL was shared/marketed.

## To get a fresh preview of the complete hardened branch (owner, one click — optional)
- In the Vercel dashboard, open the deployment for commit **`664f71ef`** (the last code
  commit) and click **Redeploy** (preview), **or** temporarily relax the project's
  *Ignored Build Step* and push a no-op. Either is a **preview** action — still not
  production. This agent did not trigger a redeploy (kept within "allow auto CI/preview").

## Verdict
- CI/preview **status captured**. Push succeeded; auto-preview **skipped (CANCELED)** by
  the project's ignore-build-step; last READY preview is the PR2-core state; production
  untouched; preview SSO-protected/noindex. **Safe.**
