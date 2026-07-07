# AWS Amplify Investigation

Official AWS docs checked:
- https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html
- https://docs.aws.amazon.com/amplify/latest/userguide/server-side-rendering-amplify.html
- https://docs.aws.amazon.com/amplify/latest/userguide/getting-started-next.html
- https://docs.aws.amazon.com/amplify/latest/userguide/troubleshooting-SSR.html

Fit:
- The app is Next.js, so Amplify Hosting is plausible for preview hosting.
- Amplify supports SSR hosting for Next.js per official docs.

Decision matrix:

| Dimension | Finding | Risk | Decision impact |
| --- | --- | --- | --- |
| Current hosting reality | Existing deployment assumptions live outside Amplify | medium | do not migrate by default |
| Current cost pain | No verified AWS/Vercel cost pressure in this pass | low | migration is not justified |
| Branch preview value | Could help partner/demo review if GitHub auth and owner approval exist | medium | preview-only spike later |
| Next.js support fit | Plausible but must be tested against this app's SSR/route behavior | medium | local build review first |
| Auth/storage fit | Current auth/storage assumptions are not Amplify-native | high | no backend migration |
| Cockpit/demo fit | Demo surfaces may be useful as previews | medium | isolate to non-production branch |
| Partner-demo fit | Useful only after partner/demo scope exists | medium | no live app until partner need |
| Rollback path | Keep current host as source of truth | low | preview app must be disposable |
| DNS risk | Any domain move is high risk | high | no DNS action |
| Env var risk | Env values would need manual safe copy | high | no secret reads or prints |
| Monorepo risk | Workspace build may need custom app root/build command | medium | document only until tested |
| Migration risk | Full host migration would mix infra and product risk | high | reject migration now |
| Vercel/Neon alternative | Existing path likely remains lower-friction | medium | compare before AWS spend |

Repo blockers:
- The repo already has deployment assumptions elsewhere; switching host would need a release-control decision.
- Any SSR feature use must be tested against Amplify-supported Next.js behavior.
- AWS docs note that Edge API routes are not supported by Amplify SSR hosting.

Decision:
- Current decision: preview-only spike later.
- Current implementation: zero-cost local skeleton under `infrastructure/aws/amplify`.
- Rejection for now: full migration, backend migration, DNS move, service role creation, and env copy.
- Adoption trigger: owner requests an AWS-hosted partner/demo preview, GitHub auth is available, cost ceiling is approved, and rollback keeps current hosting untouched.
- Rollback: delete the preview app if one is ever created; do not alter current production host or DNS.

## Personal AWS Learning Feed

Amplify learning improves the quality of the preview-only spike:
- clearer distinction between branch preview and production hosting.
- better Next.js SSR compatibility questions.
- better environment-variable handling without printing secrets.
- stronger rollback language for deleting a preview app.
- better explanation of why DNS and backend migration remain blocked.

No-cost learning artifact:
- `docs/personal/aws/AWS_LEARNING_TO_REPO_ACTIONS.md` tracks the Amplify preview mock.

Still blocked:
- live Amplify app creation.
- GitHub connection.
- service role creation.
- env copy.
- DNS changes.
