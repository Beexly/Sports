# ADR-0002: Amplify Preview-Only Option

Decision: preview-only spike later.

Value:
- branch previews
- isolated demos
- no production DNS change

Blocked until:
- owner approval
- cost cap
- env var review
- SSR compatibility test
- source rights review for displayed data
- GitHub auth or manual branch connection approval
- rollback path preserving current host

Rollback:
- delete preview app after export of logs.

Hard limits:
- no domain
- no production traffic
- no service role creation by Codex
- no secret value copy by Codex
