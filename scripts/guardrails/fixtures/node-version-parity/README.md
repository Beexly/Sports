# node-version-parity fixtures

Deliberate offenders for `scripts/guardrails/node-version-parity.test.mjs`.
They are excluded from the live repo scan by `isExemptFromLiveScan()` so they can
sit here as real violations without failing the guard against the real tree.

Every `violations/` file must be flagged under its exact API/flag id; every
`allowed/` file must stay clean. Do not "fix" these files.
