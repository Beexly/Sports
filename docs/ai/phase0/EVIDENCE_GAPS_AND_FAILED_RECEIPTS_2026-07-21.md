# Evidence Gaps and Failed Receipts — 2026-07-21

## NOVA live-source validation

Per the governing directive: `NOVA_CURRENT_AI_ECOSYSTEM_SNAPSHOT.md` states no live source receipt was available. `NOVA_LIVE_SOURCE_VALIDATION_REPORT.md` states the validation command produced no receipt.

**These are preserved here as `FAILED_CLOSED` evidence, not re-run or re-verified in this Phase 0 pass** (out of scope — Phase 0 is repository-truth and convergence work, not a NOVA-source-validation re-run, and the network-restricted environment this session ran in would not reliably reproduce NOVA's live-fetch behavior anyway — the `NOVA_BRANCH_CI_STATUS.md` document pasted earlier in this conversation shows exactly this failure mode: `<urlopen error [Errno -3] Temporary failure in name resolution>` for every GitHub API lookup attempted from a similarly-restricted context).

**Do not treat NOVA's source registry as validated until a run produces:**
- exact command invoked;
- start/end timestamp;
- code SHA at run time;
- source-registry version;
- per-source outcome (success/failure/skip) ledger;
- raw stdout/stderr artifact;
- an immutable receipt hash tying the above together;
- explicit classification if any source failed (not silently omitted).

## This session's own evidence gaps (found during Phase 0 audit)

1. **Integration-guide credit claims** (`AWS-BEDROCK-CLAUDE.md`, `GOOGLE-VERTEX-AI.md`) — originally stated program maximums as available runway. Corrected in-session against an external audit provided by the user, NOT caught by any repository-enforced gate. No automated claim-verification exists (see ADR 3.7).

2. **`credit-pool.ts`'s payer-attribution claim** — its own docstring asserts model-ID shape proves which credit pool "paid for" a call. This has never been reconciled against an actual AWS/Google billing statement or credit-balance API. Treat every `creditPoolForModel()` output in the current codebase as an **unverified hint**, not a confirmed financial fact, until Phase 3 (credit reconciliation) exists.

3. **This session's own CI-status reporting** — earlier in this session, PR statuses were reported as "green" based on GitHub Actions `check_runs` API results, which is a real, verifiable receipt (job IDs, timestamps, conclusions all captured in this conversation's tool-call history). This is the correct pattern — contrast with #1 and #2 above, which were prose claims with no equivalent receipt until manually corrected.

## Standing rule going forward

Every claim of the form "X credits are available," "X dollars saved," "X provider is confirmed active," or "X source was validated" must cite one of:
- a GitHub Actions run ID + job conclusion (verifiable via the API, as done for PR CI status in this session);
- an actual billing/credit-balance API response with a timestamp;
- a reproducible command + captured stdout/stderr;
- an explicit owner attestation, labeled as such (not presented as machine-verified).

Anything else is a draft claim, not evidence, and must be labeled `UNVERIFIED` in any document that states it.
