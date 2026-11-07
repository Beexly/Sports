# Broken Equations

Every executable formula in the catalog `data/equations/equation_executable_catalog_12304.json` was parsed and evaluated using a JavaScript `Function` constructor with mock scalar inputs and standard math definitions injected into scope (e.g. `exp`, `sqrt`, `logit_inv`).

0 equations failed to evaluate or parse under this test condition, meaning all executable strings strictly obey JS math syntax and have properly matched binding identifiers.

*(There are NO unambiguously broken equations to repair; `docs/wiring/qa/BROKEN-EQUATIONS.md` is empty of failures).*
