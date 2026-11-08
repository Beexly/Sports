# 02: Compiled Safe AST Equation Executor, Unit Normalization & `min_sample_size` Gate

**What to build:** End-to-end mathematical execution of all `21,419` registry equations via zero-`eval` compiled AST closures over normalized physical/market features, positive-definite `copula_tail` evaluation, and deterministic `min_sample_size` holding (`effective_weight = 0.0`).

**Blocked by:** `01: Clean-Checkout PBP Fallback & 9/9 Armed Workflow Gate`

**Status:** DONE (`ready-for-agent`)

- [x] `compile_formula_spec_ast` compiles and caches all `21,419` `formula_spec` expressions with batch execution latency `< 0.35s`.
- [x] Unit normalizers scale physical inputs so `EQ_00003` evaluates to `-0.088894` and `EQ_06896` evaluates to `-0.197351`, and all `1,372` registry `copula_tail` rows return real finite floats across negative quadrants.
- [x] All `1,400` equations with `sample_size_n < min_sample_size` return `effective_weight == 0.0`, `post_gate_delta == 0.0`, and `gate_status == "HELD_BELOW_MIN_SAMPLE_SIZE"`.
