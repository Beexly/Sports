# Galaxy Sports Edge (GSE) Coding Standards

Authoritative reviewer baseline for `/code-review` (Standards axis), vertical-slice `/tdd` builds, and CI quality gates across the GSE monorepo and Python engine. Documented repo rules override generic style smells; mechanical checks run via linters/guardrails while judgement standards belong here.

---

## 1. Python (`src/gse_engine/`, `scripts/`, `gse-ml-service/`) - Google Python Style Guide (`pyguide.md`)

- **Typing & Imports:** Python `3.11+`/`3.12+` with `from __future__ import annotations`, full parameter/return type hints (`mypy --strict` clean on `src/gse_engine`), immutable `@dataclass(frozen=True, slots=True)` or Pydantic v2 models at module boundaries.
- **Docstrings & Formatting:** Google-style docstrings (`Args:`, `Returns:`, `Raises:`), max line length `100`, enforced mechanically by `ruff` (`pydocstyle.convention = "google"`).
- **Zero Emojis / Clean Logs:** Zero Unicode emojis in Python source, docstrings, CLI stdout, or structured logs.
- **Domain Invariants (Deterministic):**
  - Vacated targets/carries must conserve across active Stage-0 named players (`>= 0.94` attribution, `<= 0.05` residual cap, zero `OTHER_TEAM_*` sinks).
  - Quarterback rushing models per-QB empirical scramble rates plus `-1`-yard Q4 victory kneeldowns; zero synthetic Gamma floor clamps.
  - Prop tickets require two-sided odds (`over_american` and `under_american` both finite) and clear anti-cannibalization (`<= 1` directional volume/attempt prop per QB unless jointly priced as an SGP).
- **CLI Entry:** Expose operational commands through typed `google/python-fire` handlers in `gse_engine.cli` rather than ad-hoc `__main__` script duplication.

## 2. TypeScript & JavaScript (`apps/`, `packages/`, `scripts/`) - Google `tsguide.md`, `jsguide.md` & `jsoncguide.md`

- **Type Safety:** Strict TypeScript (`tsc --noEmit`), no `any` casts at trust boundaries without explicit narrowing, prefer `readonly` interfaces and pure functions without wall-clock `Date.now()` / `Math.random()` inside deterministic engine modules.
- **Cross-Platform Tooling (`google/zx` Idioms):** Operational and verification scripts under `scripts/ops/` MUST be written in cross-platform Node `.mjs` (using `node:child_process`, `node:fs`, or `zx` helpers) rather than POSIX bash commands (`$(...)`, env prefixes like `FOO=1 cmd`) so Windows PowerShell/`cmd.exe` and Linux CI execute identically.
- **Fail-Closed Auth & Payments:** Never fall back to hardcoded test secrets, unverified prefix checks, or `"week8-*"` catalog defaults in production paths. Every unlock cookie must be HMAC-SHA256 scoped to `(slug, sessionId, exp)`.

## 3. Statistical R (`Rguide.md`) & Native iOS Swift (`google.github.io/swift/`)

- **R (`nflfastR` / Calibration Scripts):** `snake_case` functions, explicit `<-` assignment, 2-space indent, explicit `library()` loading without hidden workspace state.
- **Swift (Future iOS Native Modules):** Clarity at the point of use, `UpperCamelCase` types, `lowerCamelCase` values, value types (`struct`) preferred over classes unless reference semantics are required.

## 4. GSE Architecture & Public Copy Judgement Calls (`/codebase-design`)

- **Deep Modules:** Prefer a small, clear interface hiding complex state behind a single clean seam over fragmented pass-through helpers. Test behavior across the public interface rather than mocking private collaborators.
- **Public Confidence Format:** Confidence scores are strictly integer `XX/100` (never formatted with `%`). Normal football rate percentages (e.g., `33.4% man coverage`) remain normal English percentages.
- **Customer-Facing Copy Discipline:**
  - Zero internal math/pipeline jargon (`JEV`, `Romano CQR`, `Sinkhorn`, `Cholesky`, `10,000 worlds`, `STAGE5_SPREAD_GATE`, `tau_hat`) on public or paywalled prose.
  - Zero em-dashes in customer-facing copy where `em-dash-scan.mjs` applies (`-` or colons instead).
  - Never leak paid picks, sides, totals, props, or SGP legs on free preview surfaces or social drafts.
  - Never reference retracted legacy records (`62-23-1`, `47-19-1`, `31-11`, `14-6`, `16-5`); source verified counts strictly from `@/lib/ledger/public-record`.
