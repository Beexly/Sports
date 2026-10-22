# Implementation Guardrails

As of: 2026-06-09

## Permitted Next Code Work

Source adapter interfaces, TypeScript types, read-only validation scripts, fixtures, normalization maps, local snapshot format, founder-only reports, and tests.

## Not Permitted Without Approval

Production database mutation, deploys, secrets, live cron jobs, high-volume scraping, paid APIs, public source scoring details, data pipeline replacement, or deleting existing data.

## Safe First Implementation

Create type contracts and fixture-backed tests first. Then add read-only audit scripts. Only after source/TOS approval should adapters fetch current public sources at low volume.

