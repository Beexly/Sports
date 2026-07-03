# AWS Amplify Investigation

Official AWS docs checked:
- https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html
- https://docs.aws.amazon.com/amplify/latest/userguide/server-side-rendering-amplify.html
- https://docs.aws.amazon.com/amplify/latest/userguide/getting-started-next.html
- https://docs.aws.amazon.com/amplify/latest/userguide/troubleshooting-SSR.html

Fit:
- The app is Next.js, so Amplify Hosting is plausible for preview hosting.
- Amplify supports SSR hosting for Next.js per official docs.

Repo blockers:
- The repo already has deployment assumptions elsewhere; switching host would need a release-control decision.
- Any SSR feature use must be tested against Amplify-supported Next.js behavior.
- AWS docs note that Edge API routes are not supported by Amplify SSR hosting.

Decision:
- Add only a zero-cost local skeleton under `infrastructure/aws/amplify`.
- Do not connect a Git provider, app, branch, domain, or service role.
