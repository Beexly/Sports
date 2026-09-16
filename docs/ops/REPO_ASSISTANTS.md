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
record and a safe invocation outline for an operator. The Ponytail policy is
available as typed data so future cockpit or agent surfaces can reuse one
version of its rules instead of copying prompt text.

## Ponytail policy adopted here

After understanding the affected flow, stop at the first rung that works:

1. Does this need to exist?
2. Reuse code already in Sports.
3. Prefer the standard library.
4. Prefer a native platform feature.
5. Reuse an installed dependency.
6. Use one line when that is genuinely clear.
7. Only then add the minimum new code.

This is not permission to golf safety. Validation, error handling, security,
accessibility, rights checks, tests, and owner approval gates remain mandatory.
`/ponytail-review` asks for a delete-list, `/ponytail-audit` checks the wider
repository, and `/ponytail-debt` harvests intentional `ponytail:` deferrals so
they do not disappear.

The default operator mode is `full`; use `lite` for low-risk edits and `ultra`
for an explicit over-engineering review. `off` is appropriate when the task
requires a deliberately larger design and the reason is recorded in the run
record.

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
