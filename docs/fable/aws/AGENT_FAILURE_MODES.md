# Agent Failure Modes

Failure: agent uses a blocked source.
Control: source registry adapter and tests.

Failure: agent starts paid AWS work.
Control: AWS gates default off.

Failure: agent invents cloud status.
Control: final reports separate local skeletons from live resources.

Failure: agent leaks secrets.
Control: no secret files and `npm run guard:secrets`.

Failure: agent overstates model proof.
Control: claim scanner and calibration evidence rules.
