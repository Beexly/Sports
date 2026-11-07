# RECOMPUTE-QUEUE Row 1 — CLOSED (ESTATE-SINKHORN-2.66e-7)

Motif, 2026-11-07 ~03:00 CT. Closes queue row ESTATE-SINKHORN-2.66e-7
("locate the 2.66e-7 literal anywhere in the full Beexly/Sports estate").

## Method
GitHub code search over the full Beexly/Sports repo (default branch), then
line-level reads of each hit. The ds-repo hand-assembled extract was NOT
used for absence claims (it is partial by construction).

## Result — 4 files carry the literal
1. `apps/web/components/cockpit/cockpit-office-3d-bot-hq.tsx` — **6 display-string
   occurrences** (lines 149, 152, 171, 436, 438, 532 at main HEAD): task text,
   subtitles, and a score label, e.g. "Marginal Coupler (L1=2.66e-7)" and
   "Sinkhorn-Knopp L1=2.66e-7 verified." This is a LIVE customer-facing cockpit
   surface presenting the refuted residual as verified.
2. `apps/web/app/benchmarks/page.tsx` — the public /benchmarks page (already
   tracked as morning audit item #1; its Sinkhorn line contradicts /status,
   which prints the live 1.39e-16).
3. `apps/web/__tests__/cockpit-office-3d-bot-hq.test.ts` — test expectations
   mirroring the component strings.
4. `docs/ops/WALKTHROUGH-2026-11-06-FORENSIC-REMEDIATION.md` — documentation
   RECORDING the literal's removal from the brain/adapter code. Historical
   record, not a live claim.

## The adapter literal itself is GONE from main
The round-2 audit placed the hardcoded 2.66e-7 at
`apps/web/lib/jarvis/autonomous-bot-sdk-adapter.ts:197` (HEAD 7b8784e2c).
At current main the adapter carries no 2.66e-7 — consistent with the
walkthrough doc: the code literals ("86.12/100", 12304, 2.66e-7) were replaced
with live computation. What remains is worse in one way: the value survives
as *display copy* in the cockpit component and the public benchmarks page,
detached from any computation at all.

## Verdict
Row CLOSED. Provenance: the shipped-parameter recompute stands (residual at
(40, ε=0.15) is ~1e-16 on every float64 path; 2.66e-7 requires ε≈0.07923 —
RECOMPUTE-RESULTS.md). Remaining action is not recompute but REMOVAL of the
display strings, which belongs to morning audit item #1 (AGY's fix; the
customer-facing pages are Garrett-facing surfaces and production simulations/
content wait for his morning OK).
