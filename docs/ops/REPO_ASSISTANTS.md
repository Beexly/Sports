# Repository assistants in Sports

RepoMaster and Ponytail complement Sports, but neither belongs in the live
prediction or customer request path.

## Fit

- **RepoMaster** is an isolated repository investigation tool. Use it for
  dependency tracing, incident research, source discovery, and draft patch
  proposals against a disposable checkout.
- **Ponytail** is a coding-agent prompt/plugin. Use its implementation ladder
  to prefer existing code, native platform features, and installed
  dependencies before adding abstractions.

The planner lives in `apps/web/lib/agents/repo-assistants.ts`. It does not
install, invoke, or execute either project. It produces a draft-only run
record and a safe invocation outline for an operator.

## Safety boundary

Run RepoMaster with production credentials, databases, Redis, Stripe, odds
providers, and publishing integrations absent. Review any lifecycle hooks and
any generated patch before applying it. Keep Sports' existing typecheck,
lint, tests, rights checks, claim checks, and owner approval gates intact.

Neither tool may change model weights, publish picks, settle records, send
content, or open a public gate. Their output is evidence for the existing
Tal/Jarvis review workflow, not a replacement for deterministic scoring or
operator controls.

References:

- https://github.com/QuantaAlpha/RepoMaster
- https://github.com/DietrichGebert/ponytail
