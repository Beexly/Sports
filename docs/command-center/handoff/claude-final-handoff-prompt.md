# Claude Final Handoff Prompt

Use only after owner confirms the P0 patch subset and provides a production-like DB/ingestion environment. Do not deploy from a dirty mixed tree.

## Mission

Finish GSE P0 launch readiness after Codex's fail-closed route repair.

## Current State

- Repo: `C:\Users\Garrett\Sports`
- Branch: `safety/sports-wip-2026-06-04`
- Build: passing.
- Full tests: passing.
- Public crash routes: repaired.
- Prod probe: fails only because `/api/ready` and ingestion freshness are 503.
- Dirty tree: high-risk mixed changes.

## Required Work

1. Confirm with the owner that this clone/branch is the deploy source.
2. Review `docs/command-center/evidence/dirty-tree-safety-check.md`.
3. Stage only reviewed P0 files.
4. Verify production-like DB and ingestion env without printing secrets.
5. Run `APP_URL=<target> node scripts/prod-probe.mjs`.
6. Require `/api/ready` and `/api/ready?check=ingestion-freshness` to return 200.
7. Confirm Player Lab/current roster public claims are either removed from launch scope or wired to verified current roster sources.

## Voice OS / Audio Intelligence - post-P0 opportunity lane

Codex completed an ElevenLabs Voice OS discovery lane at:

`docs/command-center/discovery/elevenlabs-voice-os/`

Use it only after P0 readiness is green, or as docs/prototype-only work that cannot affect launch. The safe first lane is transcript-first audio UX, script safety linting, Daily Brief voice scripts, and audio disclosure components. Do not add ElevenLabs API keys, do not call paid APIs, do not generate public audio, do not clone or imitate real voices, and do not create promotional sportsbook/casino audio without legal and founder approval.

## Do Not Do

- Do not deploy until `/api/ready` is green.
- Do not stage unrelated `docs/research/**` artifacts.
- Do not touch secrets.
- Do not launch promotions or affiliate links.
- Do not expose founder-only methodology.
