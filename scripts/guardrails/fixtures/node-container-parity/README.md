# node-container-parity fixtures

Inputs for `scripts/guardrails/node-container-parity.test.mjs`. The files under
`violations/` declare Node majors that disagree with the pin **on purpose** —
they are what proves the guard still fires.

The guard exempts this directory in repo mode (`FIXTURE_PREFIX` in
`scripts/guardrails/node-container-parity.mjs`) and scans it with no exemption
in `--scan-root` fixture mode.

Every fixture is scanned against a pin of `20`, passed explicitly as `--pin 20`
so these files do not have to change when the repo pin changes.
