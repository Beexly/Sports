# Paired audit

Two readers, same brief, reconcile before a "done." One reader misses the class of bug this repo keeps shipping: a green test on a fixture, a number from a fit that included the years it was scored on, a producer that exists only as a comment.

Required before any claim that a signal is wired, a gate is validated, or a suite is green:

1. Reader A states the claim and the file:line that would make it true.
2. Reader B checks that file:line and the test that would still pass if the claim were false.
3. A disagreement is a finding. It is not averaged away.
4. The reconciled note names what both saw, and what only one saw.

The 13.5-point Hamming figure that included the eval years, discarded in favor of the held-out +6.7703, is the reference case. One reader would have reported 13.5. The second measurement killed it.

---

<!-- Appended Formal Specification (2026-11-13 Drive Bundle) -->

# Doctrine 01: Paired Adversarial Audit (`paired-audit`)

**Status:** Controlling Fleet & Engine Doctrine (`CODEOWNERS` Enforced)  
**Repositories:** [Beexly/Sports](https://github.com/Beexly/Sports) · [Beexly/agent-bus](https://github.com/Beexly/agent-bus)  
**Governing Blueprints:** [Comprehensive Architecture Audit: Multi-Agent Fleet Orchestration, Verification Doctrine, and Quantitative Reasoning Systems](https://docs.google.com/document/d/1g5Jml0FyTS-zaJrLuVHWBQ-KvgAJod5YXqTi04w0lS8/edit?usp=drivesdk&ouid=117370885799080207136) · [Motif Systems Inventory — Fleet Integration Brief](https://docs.google.com/document/d/1ePqdWo-Jek46r1TBtrUqu6H8SvgTwMzAV5ROlGwM4Ug/edit?usp=drivesdk&ouid=117370885799080207136) · `formal/INDUCTION_DOCTRINE.md`

## 1. Core Mandate

First-pass outputs from any single model, coding agent, or statistical script are untrusted drafts (`UNVERIFIED`). Under the **Paired Adversarial Audit Doctrine**, no candidate pick, call-sheet ticket, Pull Request, or `brain/mind.jsonl` self-edit epoch may transition to `VERIFIED` unless **two independent verifiers from distinct agent identities and distinct model families** independently audit the artifact and pass a deterministic **Reconciliation Gate**.

Formally, under the inductive state invariant `I(s_0) & Gate(s, a) => I(delta(s, a))`, let $v_1 = \text{Audit}(M_1, x)$ and $v_2 = \text{Audit}(M_2, x)$ be structured audit verdicts over candidate artifact $x$:

$$\text{Gate}_{\text{paired}}(x) \iff (M_1.\text{id} \neq M_2.\text{id}) \land (M_1.\text{family} \neq M_2.\text{family}) \land v_1.\text{pass} \land v_2.\text{pass} \land \text{Reconcile}(v_1, v_2, x)$$

Any self-audit ($M_1.\text{id} = M_2.\text{id}$), same-family echo chamber ($M_1.\text{family} = M_2.\text{family}$), or un-reconciled numerical/hash discrepancy fails closed and blocks promotion.

## 2. Structural Requirements

| Audit Dimension | Primary Verifier ($M_1$) | Adversarial Counter-Verifier ($M_2$) | Deterministic Reconciliation Rule |
| :--- | :--- | :--- | :--- |
| **Model & Agent Independence** | Orchestrator / Judge tier (e.g., `motif-qc` on Claude Opus 5.5 per [Motif Systems Inventory](https://docs.google.com/document/d/1ePqdWo-Jek46r1TBtrUqu6H8SvgTwMzAV5ROlGwM4Ug/edit?usp=drivesdk&ouid=117370885799080207136)) | Cross-family adversarial auditor (e.g., `antigravity-verifier` on Gemini 4 Argon or `mimo-numbers-cop` deterministic kernel per [Autonomous Architecture Blueprint](https://docs.google.com/document/d/1sHvDyLn7DkVF4Vcxu8mlYtHEkRZ0kTZQ8-Lct_6vOAA/edit?usp=drivesdk&ouid=117370885799080207136)) | Rejects `PairedAuditIndependenceError` if `agent_id` or `model_family` collides, or if DeepSeek MOVE-37 theorist claims are submitted without lab execution. |
| **Quality Bar & Lexical Hygiene** | Evaluates code/pick deliverable against the `>= 9.2` quality bar (runs clean, real data, zero placeholders) | Scans AST and public copy for `FORBIDDEN_JARGON_REGEX`, tout certainty language ([SPORTS_OS Master Plan](https://docs.google.com/document/d/1LOLbE4mksn5cKV4g1xBaQvmmQkOvDRVjrAPpoPVkhI8/edit?usp=drivesdk&ouid=117370885799080207136)), and Windows CP1252 `?` corruption | Both scores must satisfy `quality_score >= 9.20` and `lexical_violations == 0`. |
| **Quantitative & Seal Parity** | Recomputes `coachMindsetHash` (`85b5cd3303c540492b23019d913aabd9179945a72c490579124e6e57dcad68b8`), `tau = 0.42`, and directional `P(outcome)` | Independently recomputes de-vigged edge, Sinkhorn $\ell_1$ marginal residual (`< 1e-9`), and 5-Stage Inductive Safety bounds | Asserts `hash_1 == hash_2 == sealed_hash` and `|p_1 - p_2| <= 0.015`. |
| **Process Supervision (Bellman PRM)** | Verifies step-level causal chain $Q^*(s_t, a_t) = \mathbb{E}[\prod_{i=t}^T \mathbb{I}(c_i = 1)]$ ([Comprehensive Architecture Audit](https://docs.google.com/document/d/1g5Jml0FyTS-zaJrLuVHWBQ-KvgAJod5YXqTi04w0lS8/edit?usp=drivesdk&ouid=117370885799080207136)) | Applies backward verifier noise correction $R_{\text{backward}} = (\tilde{R} - \rho_0)/(1 - \rho_0 - \rho_1)$ | Halts immediately if any intermediate reasoning step $c_i = 0$ or if channel informativeness $1 - \rho_0 - \rho_1 \le 0$. |
| **Git & PR Merge Sheriff** | Inspects actual `git diff` changeset, unit test exit code `0`, and remote commit SHA | Verifies zero string-rename hiding (`Merge Sheriff` rule) and full 6-link Claim-Matrix Provenance | Writes dual-signed receipt to `outbox/receipts-*` before `MindGuardian` appends to `brain/mind.jsonl`. |

## 3. Enforcement in `one_mind_agent_bus_daemon.ts` and `gse_one_mind_autonomous_os.py`

1. **Zero Fake-Merge Tolerance:** Following the PR #1025 incident documented in the [Motif Systems Inventory](https://docs.google.com/document/d/1ePqdWo-Jek46r1TBtrUqu6H8SvgTwMzAV5ROlGwM4Ug/edit?usp=drivesdk&ouid=117370885799080207136), completion claims without a verified diff digest, test execution log, and remote SHA are automatically rejected.
2. **Conflict Escalation Hierarchy:** When Auditor A and Auditor B disagree on an empirical adjustment, deterministic mathematical derivations take precedence over heuristic prose; competing empirical parameterizations are adjudicated strictly on chronological purged out-of-fold (OOF) proper scoring rules; unresolved architectural ambiguities escalate to the morning `09:08 CT` operator brief.
3. **Immutable Receipt Binding:** Every `VERIFIED` artifact emits a content-addressed SHA-256 `PairedAuditReceipt` linking both audit signatures, the reconciliation diff, and the active `coachMindsetHash`.
