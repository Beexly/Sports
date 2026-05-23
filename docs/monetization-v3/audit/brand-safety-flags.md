# Brand-Safety Flags

Date: 2026-05-23
Auditor: Codex

## Scope

Scanned monetization-v3 Markdown and CSV files touched in the last 24 hours for the configured banned phrase set. The exact phrases are intentionally described here without reproducing every banned string verbatim, so this audit file does not self-trigger the same scan.

- black-box prediction phrasing that uses the banned automation-positioning modifier
- tout-certainty phrasing
- outcome-promise phrasing
- non-public-information phrasing using the banned access-positioning word

## Mechanical Substitutions Applied

- automation-positioning prediction marketing -> `black-box prediction marketing`
- tout-certainty phrase -> `tout-certainty`
- outcome-promise winner phrase -> `outcome promises`
- access-positioning information phrase -> `non-public information`
- automation-positioning modifier in email-signature standards -> `AI framing`

## Load-Bearing Flags

None.

No phrase required escalation because every match was either banned vocabulary in a replaceable context or a prohibition that could be expressed without changing the argument.
