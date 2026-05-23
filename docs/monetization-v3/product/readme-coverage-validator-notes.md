# README Coverage Validator Notes

**Status:** Validation hardening.
**Related decision:** DEC-NEXT-059

## DEC-NEXT-059 - Enforce monetization README navigation coverage

**Decision:** Extend the monetization-v3 validator so every Markdown and CSV file in the pack, excluding validator tooling and the README itself, must be listed in [README.md](../README.md).

**Why now:** The operating pack is large enough that missing navigation is a real failure mode. A file can be correct and still be operationally lost if Garrett, Codex, or Claude cannot find it quickly during launch pressure.

## Implemented

- [validate-monetization-v3.ps1](../tools/validate-monetization-v3.ps1) now checks README navigation coverage after brand scanning.
- Validation output now reports how many navigable files were checked.

## Guardrail

This rule checks discoverability only. It does not judge content quality, ownership, launch readiness, or whether a file should exist.
